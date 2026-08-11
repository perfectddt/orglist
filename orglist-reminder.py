from __future__ import annotations

import argparse
import base64
import html
import json
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "orglist-reminder-config.json"
STATE_PATH = BASE_DIR / "orglist-reminder-state.json"
LOG_PATH = BASE_DIR / "orglist-reminder.log"
PID_PATH = BASE_DIR / "orglist-reminder.pid"
TOAST_APP_ID = "perfectddt.Orglist.Reminder"
DEFAULT_CONFIG: Dict[str, Any] = {
    "enabled": False,
    "sourceType": "folder",
    "folder": r"D:\gtd",
    "webdavUrl": "",
    "webdavUsername": "",
    "webdavPassword": "",
    "webdavFolder": "",
    "webdavRecursive": True,
    "intervalMinutes": 10,
    "dailySummaryTime": "09:00",
    "dailySummaryTimes": ["09:00"],
    "missedSummaryPolicy": "latest",
    "groupNotifications": True,
    "scheduledAdvanceMinutes": 0,
    "deadlineAdvanceMinutes": 15,
    # Kept true so an already-running pre-1.4.6 helper cannot suppress per-item alarms.
    "alarmEnabled": True,
    "alarmRepeat": 3,
    "alarmIntervalSeconds": 2,
    "alarmSoundPath": "",
    "scheduledAlarmProperty": "SCHEDULED_ALARM",
    "deadlineAlarmProperty": "DEADLINE_ALARM",
    "legacyAlarmProperty": "ALARM",
    "doneStatuses": ["DONE", "CNCL"],
}
HEADING_RE = re.compile(r"^(\*+)\s+(.+?)\s*$")
PLANNING_RE = re.compile(
    r"\b(SCHEDULED|DEADLINE|CLOSED):\s*[<\[]"
    r"(\d{4}-\d{2}-\d{2})(?:\s+[A-Za-z]{3})?(?:\s+(\d{1,2}):(\d{2}))?"
    r"(?:\s+(?:\.\+|\+\+|\+)\d+[dwmy](?:/\d+[dwmy])?)?[>\]]"
)
LUNAR_ANNIVERSARY_RE = re.compile(
    r"<%%\(diary-chinese-anniversary\s+(\d{1,2})\s+(\d{1,2})\s*\)>", re.IGNORECASE
)
LUNAR_YEAR_INFOS = (
    0x04BD8, 0x04AE0, 0x0A570, 0x054D5, 0x0D260, 0x0D950, 0x16554, 0x056A0, 0x09AD0, 0x055D2,
    0x04AE0, 0x0A5B6, 0x0A4D0, 0x0D250, 0x1D255, 0x0B540, 0x0D6A0, 0x0ADA2, 0x095B0, 0x14977,
    0x04970, 0x0A4B0, 0x0B4B5, 0x06A50, 0x06D40, 0x1AB54, 0x02B60, 0x09570, 0x052F2, 0x04970,
    0x06566, 0x0D4A0, 0x0EA50, 0x06E95, 0x05AD0, 0x02B60, 0x186E3, 0x092E0, 0x1C8D7, 0x0C950,
    0x0D4A0, 0x1D8A6, 0x0B550, 0x056A0, 0x1A5B4, 0x025D0, 0x092D0, 0x0D2B2, 0x0A950, 0x0B557,
    0x06CA0, 0x0B550, 0x15355, 0x04DA0, 0x0A5D0, 0x14573, 0x052B0, 0x0A9A8, 0x0E950, 0x06AA0,
    0x0AEA6, 0x0AB50, 0x04B60, 0x0AAE4, 0x0A570, 0x05260, 0x0F263, 0x0D950, 0x05B57, 0x056A0,
    0x096D0, 0x04DD5, 0x04AD0, 0x0A4D0, 0x0D4D4, 0x0D250, 0x0D558, 0x0B540, 0x0B5A0, 0x195A6,
    0x095B0, 0x049B0, 0x0A974, 0x0A4B0, 0x0B27A, 0x06A50, 0x06D40, 0x0AF46, 0x0AB60, 0x09570,
    0x04AF5, 0x04970, 0x064B0, 0x074A3, 0x0EA50, 0x06B58, 0x05AC0, 0x0AB60, 0x096D5, 0x092E0,
    0x0C960, 0x0D954, 0x0D4A0, 0x0DA50, 0x07552, 0x056A0, 0x0ABB7, 0x025D0, 0x092D0, 0x0CAB5,
    0x0A950, 0x0B4A0, 0x0BAA4, 0x0AD50, 0x055D9, 0x04BA0, 0x0A5B0, 0x15176, 0x052B0, 0x0A930,
    0x07954, 0x06AA0, 0x0AD50, 0x05B52, 0x04B60, 0x0A6E6, 0x0A4E0, 0x0D260, 0x0EA65, 0x0D530,
    0x05AA0, 0x076A3, 0x096D0, 0x04AFB, 0x04AD0, 0x0A4D0, 0x1D0B6, 0x0D250, 0x0D520, 0x0DD45,
    0x0B5A0, 0x056D0, 0x055B2, 0x049B0, 0x0A577, 0x0A4B0, 0x0AA50, 0x1B255, 0x06D20, 0x0ADA0,
    0x14B63, 0x09370, 0x049F8, 0x04970, 0x064B0, 0x168A6, 0x0EA50, 0x06AA0, 0x1A6C4, 0x0AAE0,
    0x092E0, 0x0D2E3, 0x0C960, 0x0D557, 0x0D4A0, 0x0DA50, 0x05D55, 0x056A0, 0x0A6D0, 0x055D4,
    0x052D0, 0x0A9B8, 0x0A950, 0x0B4A0, 0x0B6A6, 0x0AD50, 0x055A0, 0x0ABA4, 0x0A5B0, 0x052B0,
    0x0B273, 0x06930, 0x07337, 0x06AA0, 0x0AD50, 0x14B55, 0x04B60, 0x0A570, 0x054E4, 0x0D160,
    0x0E968, 0x0D520, 0x0DAA0, 0x16AA6, 0x056D0, 0x04AE0, 0x0A9D4, 0x0A2D0, 0x0D150, 0x0F252,
)


def _lunar_month_days(year_info: int, month: int) -> int:
    return 30 if year_info & (0x10000 >> month) else 29


def _lunar_year_days(year_info: int) -> int:
    days = sum(_lunar_month_days(year_info, month) for month in range(1, 13))
    if year_info & 0xF:
        days += 30 if year_info & 0x10000 else 29
    return days


def lunar_to_solar(year: int, month: int, day: int) -> date:
    if not (1900 <= year < 1900 + len(LUNAR_YEAR_INFOS) and 1 <= month <= 12 and 1 <= day <= 30):
        raise ValueError("农历日期超出支持范围")
    offset = sum(_lunar_year_days(info) for info in LUNAR_YEAR_INFOS[: year - 1900])
    info = LUNAR_YEAR_INFOS[year - 1900]
    leap_month = info & 0xF
    for current in range(1, month):
        offset += _lunar_month_days(info, current)
        if leap_month == current:
            offset += 30 if info & 0x10000 else 29
    month_days = _lunar_month_days(info, month)
    if day > month_days:
        raise ValueError("该农历月份没有这一天")
    return date(1900, 1, 31) + timedelta(days=offset + day - 1)


def next_lunar_occurrence(month: int, day: int, reference: Optional[date] = None) -> Optional[date]:
    current = reference or date.today()
    for lunar_year in range(current.year - 1, current.year + 3):
        try:
            candidate = lunar_to_solar(lunar_year, month, day)
        except ValueError:
            continue
        if candidate >= current:
            return candidate
    return None


def log(message: str) -> None:
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(f"[{stamp}] {message}\n")
    except OSError:
        pass


def load_json(path: Path, fallback: Dict[str, Any]) -> Dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else dict(fallback)
    except (OSError, ValueError):
        return dict(fallback)


def load_config(path: Path = CONFIG_PATH) -> Dict[str, Any]:
    value = {**DEFAULT_CONFIG, **load_json(path, DEFAULT_CONFIG)}
    value["sourceType"] = "webdav" if value.get("sourceType") == "webdav" else "folder"
    value["intervalMinutes"] = max(1, min(1440, int(value.get("intervalMinutes", 10))))
    value["deadlineAdvanceMinutes"] = max(
        0, min(10080, int(value.get("deadlineAdvanceMinutes", 15)))
    )
    value["scheduledAdvanceMinutes"] = max(
        0, min(10080, int(value.get("scheduledAdvanceMinutes", 0)))
    )
    value["dailySummaryTimes"] = normalize_summary_times(
        value.get("dailySummaryTimes", [value.get("dailySummaryTime", "09:00")])
    )
    value["dailySummaryTime"] = value["dailySummaryTimes"][0]
    value["missedSummaryPolicy"] = (
        "skip" if value.get("missedSummaryPolicy") == "skip" else "latest"
    )
    value["groupNotifications"] = bool(value.get("groupNotifications", True))
    value["alarmEnabled"] = True
    value["alarmRepeat"] = max(1, min(20, int(value.get("alarmRepeat", 3))))
    value["alarmIntervalSeconds"] = max(0, min(60, int(value.get("alarmIntervalSeconds", 2))))
    value["alarmSoundPath"] = str(value.get("alarmSoundPath", "")).strip()
    value["scheduledAlarmProperty"] = normalize_alarm_property(
        value.get("scheduledAlarmProperty"), "SCHEDULED_ALARM"
    )
    value["deadlineAlarmProperty"] = normalize_alarm_property(
        value.get("deadlineAlarmProperty"), "DEADLINE_ALARM"
    )
    value["legacyAlarmProperty"] = normalize_alarm_property(
        value.get("legacyAlarmProperty"), "ALARM"
    )
    done = value.get("doneStatuses", ["DONE", "CNCL"])
    value["doneStatuses"] = [str(item).upper() for item in done if str(item).strip()]
    return value


def normalize_summary_times(value: Any) -> List[str]:
    candidates = value if isinstance(value, list) else re.split(r"[,，;；\s]+", str(value))
    result: List[str] = []
    for candidate in candidates:
        text = str(candidate).strip()
        if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", text):
            continue
        if text not in result:
            result.append(text)
    return sorted(result)[:12] or ["09:00"]


def normalize_alarm_property(value: Any, fallback: str) -> str:
    name = str(value or "").strip().upper()
    return name if re.fullmatch(r"[A-Z0-9_-]+", name) else fallback


def save_state(state: Dict[str, Any], path: Path = STATE_PATH) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def parse_timestamp(date_text: str, hour: Optional[str], minute: Optional[str]) -> datetime:
    parsed = datetime.strptime(date_text, "%Y-%m-%d")
    if hour is not None and minute is not None:
        parsed = parsed.replace(hour=int(hour), minute=int(minute))
    return parsed


def parse_org_text(
    text: str, file_name: str, done_statuses: set[str],
    alarm_properties: Optional[Dict[str, str]] = None,
    reference_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    property_names = {
        "scheduled": "SCHEDULED_ALARM", "deadline": "DEADLINE_ALARM", "legacy": "ALARM",
        **(alarm_properties or {}),
    }
    lines = text.splitlines()
    headings = [index for index, line in enumerate(lines) if HEADING_RE.match(line)]
    tasks: List[Dict[str, Any]] = []
    for position, start in enumerate(headings):
        match = HEADING_RE.match(lines[start])
        if not match:
            continue
        raw_title = match.group(2).strip()
        first, _, remainder = raw_title.partition(" ")
        status = first.upper() if re.fullmatch(r"[A-Z][A-Z0-9_-]*", first) else ""
        title = remainder.strip() if status else raw_title
        title = re.sub(r"\s+:[\w@#%:.-]+:\s*$", "", title).strip()
        end = headings[position + 1] if position + 1 < len(headings) else len(lines)
        block = "\n".join(lines[start + 1 : end])
        dates: Dict[str, datetime] = {}
        has_time: Dict[str, bool] = {}
        for field, date_text, hour, minute in PLANNING_RE.findall(block):
            if field not in dates:
                dates[field] = parse_timestamp(date_text, hour or None, minute or None)
                has_time[field] = bool(hour and minute)
        completed = status in done_statuses or "CLOSED" in dates
        lunar_match = LUNAR_ANNIVERSARY_RE.search(block)
        lunar_date = None
        if lunar_match:
            lunar_date = next_lunar_occurrence(
                int(lunar_match.group(1)), int(lunar_match.group(2)), reference_date
            )
        def alarm_property(*names: str) -> Optional[bool]:
            for name in dict.fromkeys(normalize_alarm_property(item, "") for item in names):
                if not name:
                    continue
                match = re.search(rf"^\s*:{re.escape(name)}:\s*(.*)$", block, re.IGNORECASE | re.MULTILINE)
                if match:
                    value = match.group(1).strip().lower()
                    return True if value in {"true", "1", "yes", "on"} else False
            return None

        legacy_alarm = alarm_property(property_names["legacy"], "ALARM")
        scheduled_alarm = alarm_property(property_names["scheduled"], "SCHEDULED_ALARM")
        deadline_alarm = alarm_property(property_names["deadline"], "DEADLINE_ALARM")
        tasks.append(
            {
                "title": title or "未命名条目",
                "status": status,
                "completed": completed,
                "scheduled": dates.get("SCHEDULED"),
                "scheduledHasTime": has_time.get("SCHEDULED", False),
                "deadline": dates.get("DEADLINE"),
                "deadlineHasTime": has_time.get("DEADLINE", False),
                "lunar": datetime.combine(lunar_date, datetime.min.time()) if lunar_date else None,
                "file": file_name,
                "line": start + 1,
                "alarm": legacy_alarm,
                "scheduledAlarm": legacy_alarm if scheduled_alarm is None else scheduled_alarm,
                "deadlineAlarm": legacy_alarm if deadline_alarm is None else deadline_alarm,
            }
        )
    return tasks


def parse_org_file(
    path: Path, done_statuses: set[str], alarm_properties: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    return parse_org_text(text, path.name, done_statuses, alarm_properties)


def webdav_headers(config: Dict[str, Any]) -> Dict[str, str]:
    headers: Dict[str, str] = {}
    username = str(config.get("webdavUsername", ""))
    password = str(config.get("webdavPassword", ""))
    if username or password:
        token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
        headers["Authorization"] = f"Basic {token}"
    return headers


def webdav_directory(config: Dict[str, Any]) -> str:
    base = str(config.get("webdavUrl", "")).strip()
    if not base:
        raise ValueError("WebDAV 服务器地址未设置。")
    if not base.endswith("/"):
        base += "/"
    folder = str(config.get("webdavFolder", "")).strip().strip("/")
    if folder:
        encoded = "/".join(urllib.parse.quote(part) for part in folder.split("/") if part)
        return urllib.parse.urljoin(base, encoded + "/")
    return base


def webdav_request(
    url: str, config: Dict[str, Any], method: str = "GET", body: Optional[bytes] = None,
    extra_headers: Optional[Dict[str, str]] = None,
) -> bytes:
    headers = webdav_headers(config)
    headers.update(extra_headers or {})
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def webdav_list(directory: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
    body = b'''<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>'''
    payload = webdav_request(
        directory, config, "PROPFIND", body,
        {"Depth": "1", "Content-Type": "application/xml; charset=utf-8"},
    )
    root = ET.fromstring(payload)
    items: List[Dict[str, Any]] = []
    current = urllib.parse.urlsplit(directory).path.rstrip("/")
    for response in root.iter():
        if not response.tag.endswith("response"):
            continue
        href_node = next((node for node in response.iter() if node.tag.endswith("href")), None)
        if href_node is None or not href_node.text:
            continue
        absolute = urllib.parse.urljoin(directory, href_node.text)
        path = urllib.parse.urlsplit(absolute).path.rstrip("/")
        if path == current:
            continue
        is_directory = any(
            node.tag.endswith("collection") for node in response.iter()
        )
        name = urllib.parse.unquote(path.rsplit("/", 1)[-1])
        items.append({"url": absolute, "name": name, "directory": is_directory})
    return items


def scan_webdav_tasks(
    config: Dict[str, Any], done_statuses: set[str], alarm_properties: Dict[str, str],
) -> List[Dict[str, Any]]:
    root = webdav_directory(config)
    recursive = bool(config.get("webdavRecursive", True))
    queue = [(root, 0)]
    visited: set[str] = set()
    files: List[Dict[str, str]] = []
    while queue and len(visited) < 80 and len(files) < 500:
        directory, depth = queue.pop(0)
        key = directory.rstrip("/") + "/"
        if key in visited:
            continue
        visited.add(key)
        for item in webdav_list(directory, config):
            if item["directory"]:
                if recursive and depth < 4:
                    queue.append((item["url"].rstrip("/") + "/", depth + 1))
            elif item["name"].lower().endswith(".org"):
                files.append({"url": item["url"], "name": item["name"]})
                if len(files) >= 500:
                    break
    tasks: List[Dict[str, Any]] = []
    for item in files:
        raw = webdav_request(item["url"], config)
        text = raw.decode("utf-8", errors="replace")
        tasks.extend(parse_org_text(text, item["name"], done_statuses, alarm_properties))
    return tasks


def scan_tasks(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    done_statuses = set(config.get("doneStatuses", ["DONE", "CNCL"]))
    alarm_properties = {
        "scheduled": normalize_alarm_property(config.get("scheduledAlarmProperty"), "SCHEDULED_ALARM"),
        "deadline": normalize_alarm_property(config.get("deadlineAlarmProperty"), "DEADLINE_ALARM"),
        "legacy": normalize_alarm_property(config.get("legacyAlarmProperty"), "ALARM"),
    }
    if config.get("sourceType") == "webdav":
        return scan_webdav_tasks(config, done_statuses, alarm_properties)
    folder = Path(os.path.expandvars(str(config.get("folder", "")))).expanduser()
    if not folder.is_dir():
        raise FileNotFoundError(f"提醒文件夹不存在：{folder}")
    tasks: List[Dict[str, Any]] = []
    for path in sorted(folder.rglob("*.org")):
        tasks.extend(parse_org_file(path, done_statuses, alarm_properties))
    return tasks


def toast_script(title: str, body: str) -> str:
    safe_title = html.escape(title, quote=True)
    safe_body = html.escape(body, quote=True)
    return f"""
$ErrorActionPreference = 'Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType=WindowsRuntime] | Out-Null
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text>{safe_title}</text><text>{safe_body}</text></binding></visual></toast>')
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{TOAST_APP_ID}').Show($toast)
"""


def send_toast(title: str, body: str) -> None:
    encoded = base64.b64encode(toast_script(title, body).encode("utf-16le")).decode("ascii")
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        capture_output=True,
        text=True,
        timeout=15,
        creationflags=flags,
    )
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout or "Windows 通知发送失败").strip())


def alarm_script(
    config: Dict[str, Any], title: str = "Orglist 闹钟提醒",
    body: str = "有任务提醒需要处理。",
) -> str:
    repeat = max(1, min(20, int(config.get("alarmRepeat", 3))))
    interval = max(0, min(60, int(config.get("alarmIntervalSeconds", 2))))
    sound_path = str(config.get("alarmSoundPath", "")).strip().replace("'", "''")
    if sound_path:
        path_line = f"$path = '{sound_path}'"
    else:
        path_line = "$path = Join-Path $env:WINDIR 'Media\\Alarm01.wav'"
    play_line = (
        f"{path_line}; try {{ "
        "if (-not (Test-Path -LiteralPath $path)) { throw 'Alarm WAV not found' }; "
        "$player = New-Object System.Media.SoundPlayer $path; $player.Load(); $player.PlaySync() "
        "} catch { [System.Media.SystemSounds]::Exclamation.Play() }"
    )
    interval_ticks = max(1, interval)
    max_seconds = max(10, repeat * (interval_ticks + 1))
    title_base64 = base64.b64encode(str(title).encode("utf-8")).decode("ascii")
    body_base64 = base64.b64encode(str(body).encode("utf-8")).decode("ascii")
    return f"""
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Orglist 闹钟'
$form.Width = 520
$form.Height = 340
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(255, 249, 242)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Icon = [System.Drawing.SystemIcons]::Warning
$alarmTitle = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{title_base64}'))
$alarmBody = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{body_base64}'))
$eyebrow = New-Object System.Windows.Forms.Label
$eyebrow.Text = 'ORGLIST  ·  闹钟提醒'
$eyebrow.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9, [System.Drawing.FontStyle]::Bold)
$eyebrow.AutoSize = $true
$eyebrow.ForeColor = [System.Drawing.Color]::FromArgb(224, 92, 22)
$eyebrow.Location = New-Object System.Drawing.Point(31, 22)
$form.Controls.Add($eyebrow)
$label = New-Object System.Windows.Forms.Label
$label.Text = $alarmTitle
$label.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 16, [System.Drawing.FontStyle]::Bold)
$label.Size = New-Object System.Drawing.Size(450, 42)
$label.AutoEllipsis = $true
$label.ForeColor = [System.Drawing.Color]::FromArgb(58, 46, 38)
$label.Location = New-Object System.Drawing.Point(30, 52)
$form.Controls.Add($label)
$contentPanel = New-Object System.Windows.Forms.Panel
$contentPanel.Size = New-Object System.Drawing.Size(450, 92)
$contentPanel.Location = New-Object System.Drawing.Point(30, 101)
$contentPanel.BackColor = [System.Drawing.Color]::White
$contentPanel.BorderStyle = 'FixedSingle'
$form.Controls.Add($contentPanel)
$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = $alarmBody
$subtitle.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10)
$subtitle.Size = New-Object System.Drawing.Size(422, 66)
$subtitle.AutoEllipsis = $true
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(86, 76, 68)
$subtitle.Location = New-Object System.Drawing.Point(13, 12)
$contentPanel.Controls.Add($subtitle)
$hint = New-Object System.Windows.Forms.Label
$hint.Text = '点击下方按钮可立即停止声音'
$hint.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9)
$hint.AutoSize = $true
$hint.ForeColor = [System.Drawing.Color]::FromArgb(130, 120, 112)
$hint.Location = New-Object System.Drawing.Point(31, 207)
$form.Controls.Add($hint)
$button = New-Object System.Windows.Forms.Button
$button.Text = '停止闹钟'
$button.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 13, [System.Drawing.FontStyle]::Bold)
$button.Size = New-Object System.Drawing.Size(170, 46)
$button.Location = New-Object System.Drawing.Point(175, 239)
$button.BackColor = [System.Drawing.Color]::FromArgb(233, 108, 45)
$button.ForeColor = [System.Drawing.Color]::White
$button.FlatStyle = 'Flat'
$button.FlatAppearance.BorderSize = 0
$button.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($button)
$script:alarmStop = $false
$button.Add_Click({{ $script:alarmStop = $true; $form.Close() }})
$form.Add_Shown({{ $form.Activate() }})
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$script:alarmTicks = 0
$timer.Add_Tick({{
    $script:alarmTicks++
    if ($script:alarmStop -or $script:alarmTicks -ge {max_seconds}) {{
        $timer.Stop(); $form.Close(); return
    }}
    if ($script:alarmTicks % {interval_ticks} -eq 1) {{ {play_line} }}
}})
$timer.Start()
[void]$form.ShowDialog()
$timer.Stop()
"""


def play_alarm(config: Dict[str, Any], title: str = "Orglist 闹钟提醒", body: str = "有任务提醒需要处理。") -> None:
    """后台播放闹钟声音，不阻塞提醒主循环。"""
    encoded = base64.b64encode(alarm_script(config, title, body).encode("utf-16le")).decode("ascii")
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        subprocess.Popen(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=flags,
        )
    except OSError:
        pass


def send_alarm(title: str, body: str, config: Dict[str, Any], alarm: bool = False) -> None:
    if alarm:
        play_alarm(config, title, body)
    send_toast(title, body)


def process_running(pid: int) -> bool:
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        result = subprocess.run(
            ["tasklist.exe", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            capture_output=True,
            text=True,
            timeout=8,
            creationflags=flags,
        )
        return result.returncode == 0 and f'"{pid}"' in result.stdout
    except (OSError, subprocess.SubprocessError):
        return False


def collect_notifications(
    tasks: List[Dict[str, Any]], config: Dict[str, Any], state: Dict[str, Any], now: datetime
) -> List[Dict[str, str]]:
    notifications: List[Dict[str, str]] = []
    sent = state.setdefault("sent", {})
    today = now.date()
    summary_times = normalize_summary_times(
        config.get("dailySummaryTimes", [config.get("dailySummaryTime", "09:00")])
    )
    today_tasks = [
        task
        for task in tasks
        if not task["completed"]
        and (
            bool(task.get("scheduled"))
            and not task.get("scheduledHasTime")
            and task["scheduled"].date() == today
            or bool(task.get("deadline"))
            and not task.get("deadlineHasTime")
            and task["deadline"].date() == today
            or bool(task.get("lunar"))
            and task["lunar"].date() == today
        )
    ]
    pending: List[tuple[str, datetime]] = []
    for summary_text in summary_times:
        scheduled = datetime.combine(today, datetime.strptime(summary_text, "%H:%M").time())
        key = f"digest:{today.isoformat()}:{summary_text}"
        if scheduled <= now and key not in sent:
            pending.append((key, scheduled))
    policy = "skip" if config.get("missedSummaryPolicy") == "skip" else "latest"
    targets: List[tuple[str, datetime]] = []
    if pending and policy == "latest":
        targets = [pending[-1]]
        for key, _scheduled in pending[:-1]:
            sent[key] = now.isoformat(timespec="seconds")
    elif pending:
        grace = timedelta(minutes=max(1, int(config.get("intervalMinutes", 10))) + 1)
        targets = [(key, scheduled) for key, scheduled in pending if now <= scheduled + grace]
        target_keys = {key for key, _scheduled in targets}
        for key, _scheduled in pending:
            if key not in target_keys:
                sent[key] = now.isoformat(timespec="seconds")
    for digest_key, scheduled in targets:
        if today_tasks:
            preview = "、".join(task["title"] for task in today_tasks[:3])
            suffix = f" 等 {len(today_tasks)} 项" if len(today_tasks) > 3 else ""
            notifications.append({
                "key": digest_key,
                "title": f"今日任务 {scheduled.strftime('%H:%M')}：{len(today_tasks)} 项",
                "body": preview + suffix,
                "alarm": any(
                    (task.get("scheduledAlarm") is True and task.get("scheduled") and
                     not task.get("scheduledHasTime") and task["scheduled"].date() == today) or
                    (task.get("deadlineAlarm") is True and task.get("deadline") and
                     not task.get("deadlineHasTime") and task["deadline"].date() == today)
                    for task in today_tasks
                ),
            })
        else:
            sent[digest_key] = now.isoformat(timespec="seconds")

    scheduled_advance = timedelta(minutes=int(config.get("scheduledAdvanceMinutes", 0)))
    for task in tasks:
        scheduled = task.get("scheduled")
        if task["completed"] or not scheduled or not task.get("scheduledHasTime"):
            continue
        reminder_at = scheduled - scheduled_advance
        key = (f"scheduled:{task['file']}:{task['line']}:{scheduled.isoformat()}:"
               f"{int(scheduled_advance.total_seconds())}")
        if reminder_at <= now <= scheduled + timedelta(hours=1) and key not in sent:
            lead = (f"提前 {int(scheduled_advance.total_seconds() // 60)} 分钟"
                    if scheduled_advance.total_seconds() > 0 else "开始时间已到")
            notifications.append(
                {
                    "key": key,
                    "title": f"SCHEDULED {scheduled.strftime('%H:%M')}",
                    "body": f"{task['title']}（{lead}）",
                    "alarm": task.get("scheduledAlarm") is True,
                }
            )

    advance = timedelta(minutes=int(config.get("deadlineAdvanceMinutes", 15)))
    for task in tasks:
        deadline = task.get("deadline")
        if task["completed"] or not deadline or not task.get("deadlineHasTime"):
            continue
        reminder_at = deadline - advance
        key = f"deadline:{task['file']}:{task['line']}:{deadline.isoformat()}:{int(advance.total_seconds())}"
        if reminder_at <= now <= deadline + timedelta(hours=1) and key not in sent:
            if advance.total_seconds() > 0:
                lead = f"提前 {int(advance.total_seconds() // 60)} 分钟"
            else:
                lead = "现在到期"
            notifications.append(
                {
                    "key": key,
                    "title": f"DEADLINE {deadline.strftime('%H:%M')}",
                    "body": f"{task['title']}（{lead}）",
                    "alarm": task.get("deadlineAlarm") is True,
                }
            )
    return notifications


def merge_notifications(notifications: List[Dict[str, str]], enabled: bool) -> List[Dict[str, Any]]:
    if not enabled or len(notifications) <= 1:
        return [{**item, "keys": [item["key"]], "alarm": bool(item.get("alarm"))} for item in notifications]
    timed = [item for item in notifications if item["key"].startswith(("scheduled:", "deadline:"))]
    ordinary = [item for item in notifications if item not in timed]
    result = [{**item, "keys": [item["key"]], "alarm": bool(item.get("alarm"))} for item in timed]
    if not ordinary:
        return result
    if len(ordinary) == 1:
        return result + [{**ordinary[0], "keys": [ordinary[0]["key"]], "alarm": bool(ordinary[0].get("alarm"))}]
    visible = ordinary[:5]
    lines = [f"{item['title']}｜{item['body']}" for item in visible]
    if len(ordinary) > len(visible):
        lines.append(f"另有 {len(ordinary) - len(visible)} 项提醒")
    result.append({
        "title": f"Orglist：同时有 {len(ordinary)} 个普通提醒",
        "body": "\n".join(lines),
        "keys": [item["key"] for item in ordinary],
        "alarm": any(bool(item.get("alarm")) for item in ordinary),
    })
    return result


def run_once(config_path: Path = CONFIG_PATH, dry_run: bool = False) -> List[Dict[str, str]]:
    config = load_config(config_path)
    if not config.get("enabled"):
        return []
    tasks = scan_tasks(config)
    state = load_json(STATE_PATH, {"sent": {}})
    now = datetime.now()
    notifications = collect_notifications(tasks, config, state, now)
    deliveries = merge_notifications(notifications, bool(config.get("groupNotifications", True)))
    for item in deliveries:
        if not dry_run:
            send_alarm(item["title"], item["body"], config, bool(item.get("alarm")))
        for key in item["keys"]:
            state.setdefault("sent", {})[key] = now.isoformat(timespec="seconds")
    cutoff = now - timedelta(days=14)
    state["sent"] = {
        key: value
        for key, value in state.get("sent", {}).items()
        if _safe_datetime(value, now) >= cutoff
    }
    state["lastCheck"] = now.isoformat(timespec="seconds")
    state["lastTaskCount"] = len(tasks)
    state["lastSource"] = config.get("sourceType", "folder")
    state["lastError"] = ""
    if not dry_run:
        save_state(state)
    return deliveries


def _safe_datetime(value: Any, fallback: datetime) -> datetime:
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return fallback


def main() -> None:
    parser = argparse.ArgumentParser(description="Orglist Windows 后台提醒助手")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--test-notification", action="store_true")
    parser.add_argument("--test-alarm", action="store_true")
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    args = parser.parse_args()
    if args.test_notification:
        send_toast("Orglist 测试通知", "Windows 后台提醒助手工作正常。")
        return
    if args.test_alarm:
        config = load_config(args.config)
        play_alarm(config)
        send_toast("Orglist 闹钟测试", "闹钟声音已播放。")
        return
    if args.once or args.dry_run:
        print(json.dumps(run_once(args.config, args.dry_run), ensure_ascii=False, default=str))
        return
    try:
        if PID_PATH.exists():
            previous = int(PID_PATH.read_text(encoding="ascii").strip())
            if process_running(previous):
                log(f"提醒助手已经在运行，PID={previous}")
                return
        PID_PATH.write_text(str(os.getpid()), encoding="ascii")
    except (OSError, ValueError):
        pass
    log("提醒助手已启动")
    try:
        while True:
            config = load_config(args.config)
            wait_seconds = max(60, int(config.get("intervalMinutes", 10)) * 60)
            try:
                run_once(args.config)
            except Exception as error:
                log(str(error))
                state = load_json(STATE_PATH, {"sent": {}})
                state["lastCheck"] = datetime.now().isoformat(timespec="seconds")
                state["lastError"] = str(error)
                try:
                    save_state(state)
                except OSError:
                    pass
            time.sleep(wait_seconds)
    finally:
        try:
            if PID_PATH.read_text(encoding="ascii").strip() == str(os.getpid()):
                PID_PATH.unlink(missing_ok=True)
        except OSError:
            pass


if __name__ == "__main__":
    main()
