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
from datetime import datetime, timedelta
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
    "deadlineAdvanceMinutes": 15,
    "doneStatuses": ["DONE", "CNCL"],
}
HEADING_RE = re.compile(r"^(\*+)\s+(.+?)\s*$")
PLANNING_RE = re.compile(
    r"\b(SCHEDULED|DEADLINE|CLOSED):\s*[<\[]"
    r"(\d{4}-\d{2}-\d{2})(?:\s+[A-Za-z]{3})?(?:\s+(\d{1,2}):(\d{2}))?[>\]]"
)


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
    value["dailySummaryTimes"] = normalize_summary_times(
        value.get("dailySummaryTimes", [value.get("dailySummaryTime", "09:00")])
    )
    value["dailySummaryTime"] = value["dailySummaryTimes"][0]
    value["missedSummaryPolicy"] = (
        "skip" if value.get("missedSummaryPolicy") == "skip" else "latest"
    )
    value["groupNotifications"] = bool(value.get("groupNotifications", True))
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


def save_state(state: Dict[str, Any], path: Path = STATE_PATH) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def parse_timestamp(date_text: str, hour: Optional[str], minute: Optional[str]) -> datetime:
    parsed = datetime.strptime(date_text, "%Y-%m-%d")
    if hour is not None and minute is not None:
        parsed = parsed.replace(hour=int(hour), minute=int(minute))
    return parsed


def parse_org_text(text: str, file_name: str, done_statuses: set[str]) -> List[Dict[str, Any]]:
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
        tasks.append(
            {
                "title": title or "未命名条目",
                "status": status,
                "completed": completed,
                "scheduled": dates.get("SCHEDULED"),
                "scheduledHasTime": has_time.get("SCHEDULED", False),
                "deadline": dates.get("DEADLINE"),
                "deadlineHasTime": has_time.get("DEADLINE", False),
                "file": file_name,
                "line": start + 1,
            }
        )
    return tasks


def parse_org_file(path: Path, done_statuses: set[str]) -> List[Dict[str, Any]]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    return parse_org_text(text, path.name, done_statuses)


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


def scan_webdav_tasks(config: Dict[str, Any], done_statuses: set[str]) -> List[Dict[str, Any]]:
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
        tasks.extend(parse_org_text(text, item["name"], done_statuses))
    return tasks


def scan_tasks(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    done_statuses = set(config.get("doneStatuses", ["DONE", "CNCL"]))
    if config.get("sourceType") == "webdav":
        return scan_webdav_tasks(config, done_statuses)
    folder = Path(os.path.expandvars(str(config.get("folder", "")))).expanduser()
    if not folder.is_dir():
        raise FileNotFoundError(f"提醒文件夹不存在：{folder}")
    tasks: List[Dict[str, Any]] = []
    for path in sorted(folder.rglob("*.org")):
        tasks.extend(parse_org_file(path, done_statuses))
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
        and any(value and value.date() == today for value in (task["scheduled"], task["deadline"]))
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
            })
        else:
            sent[digest_key] = now.isoformat(timespec="seconds")

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
                }
            )
    return notifications


def merge_notifications(notifications: List[Dict[str, str]], enabled: bool) -> List[Dict[str, Any]]:
    if not enabled or len(notifications) <= 1:
        return [{**item, "keys": [item["key"]]} for item in notifications]
    visible = notifications[:5]
    lines = [f"{item['title']}｜{item['body']}" for item in visible]
    if len(notifications) > len(visible):
        lines.append(f"另有 {len(notifications) - len(visible)} 项提醒")
    return [{
        "title": f"Orglist：同时有 {len(notifications)} 个提醒",
        "body": "\n".join(lines),
        "keys": [item["key"] for item in notifications],
    }]


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
            send_toast(item["title"], item["body"])
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
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    args = parser.parse_args()
    if args.test_notification:
        send_toast("Orglist 测试通知", "Windows 后台提醒助手工作正常。")
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
