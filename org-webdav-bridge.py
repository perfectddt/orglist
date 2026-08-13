from __future__ import annotations

import http.client
import hashlib
import json
import os
import re
import secrets
import socket
import subprocess
import sys
import threading
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, Optional, Tuple


FIRST_PORT = 8765
HTML_NAME = "Orglist.html"
BASE_DIR = Path(__file__).resolve().parent
HTML_PATH = BASE_DIR / HTML_NAME
MAX_BODY = 25 * 1024 * 1024
EXTERNAL_EDITOR_DIR = Path(tempfile.gettempdir()) / "OrglistExternalEditor"
EXTERNAL_EDITOR_SESSIONS: Dict[str, Path] = {}
EXTERNAL_EDITOR_LOCK = threading.Lock()
REMINDER_CONFIG_PATH = BASE_DIR / "orglist-reminder-config.json"
REMINDER_STATE_PATH = BASE_DIR / "orglist-reminder-state.json"
REMINDER_SCRIPT_PATH = BASE_DIR / "orglist-reminder.py"
REMINDER_DEFAULTS = {
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
    # Kept true for helpers that were started before the redundant global switch was removed.
    "alarmEnabled": True,
    "alarmRepeat": 3,
    "alarmIntervalSeconds": 2,
    "alarmSoundPath": "",
    "scheduledAlarmProperty": "SCHEDULED_ALARM",
    "deadlineAlarmProperty": "DEADLINE_ALARM",
    "legacyAlarmProperty": "ALARM",
    "doneStatuses": ["DONE", "CNCL"],
}


def external_editor_revision(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_external_editor_name(value: object) -> str:
    name = Path(str(value or "Orglist.org")).name
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip(" .") or "Orglist.org"
    if not name.lower().endswith(".org"):
        name += ".org"
    return name[:180]


def launch_external_editor(path: Path) -> None:
    if os.name != "nt" or not hasattr(os, "startfile"):
        raise OSError("此功能仅支持 Windows 本地桥接。")
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        subprocess.Popen(
            ["rundll32.exe", "shell32.dll,OpenAs_RunDLL", str(path)],
            creationflags=flags,
        )
    except OSError:
        os.startfile(str(path))


def open_external_editor(name: object, text: object) -> dict:
    data = str(text or "").encode("utf-8")
    if len(data) > MAX_BODY:
        raise ValueError("外部编辑内容超过 25 MB。")
    EXTERNAL_EDITOR_DIR.mkdir(parents=True, exist_ok=True)
    session = secrets.token_urlsafe(24)
    session_dir = EXTERNAL_EDITOR_DIR / session
    session_dir.mkdir()
    path = session_dir / safe_external_editor_name(name)
    path.write_bytes(data)
    with EXTERNAL_EDITOR_LOCK:
        EXTERNAL_EDITOR_SESSIONS[session] = path
    try:
        launch_external_editor(path)
    except Exception:
        with EXTERNAL_EDITOR_LOCK:
            EXTERNAL_EDITOR_SESSIONS.pop(session, None)
        try:
            path.unlink()
            session_dir.rmdir()
        except OSError:
            pass
        raise
    return {"ok": True, "session": session, "revision": external_editor_revision(data), "name": path.name}


def read_external_editor(session: str) -> dict:
    with EXTERNAL_EDITOR_LOCK:
        path = EXTERNAL_EDITOR_SESSIONS.get(session)
    if not path:
        raise FileNotFoundError("外部编辑会话不存在或已经结束。")
    data = path.read_bytes()
    if len(data) > MAX_BODY:
        raise ValueError("外部编辑文件超过 25 MB。")
    return {
        "ok": True,
        "text": data.decode("utf-8-sig", errors="replace"),
        "revision": external_editor_revision(data),
        "name": path.name,
    }


def cleanup_external_editor_files(max_age_seconds: int = 7 * 24 * 60 * 60) -> None:
    try:
        if not EXTERNAL_EDITOR_DIR.exists():
            return
        cutoff = time.time() - max_age_seconds
        for path in EXTERNAL_EDITOR_DIR.rglob("*.org"):
            try:
                if path.stat().st_mtime < cutoff:
                    path.unlink()
                    try:
                        path.parent.rmdir()
                    except OSError:
                        pass
            except OSError:
                pass
    except OSError:
        pass


def read_json_file(path: Path, fallback: object) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return fallback


def validate_reminder_config(value: object) -> dict:
    if not isinstance(value, dict):
        raise ValueError("提醒配置格式无效。")
    source_type = "webdav" if value.get("sourceType") == "webdav" else "folder"
    folder = str(value.get("folder", REMINDER_DEFAULTS["folder"])).strip()
    if source_type == "folder" and (not folder or len(folder) > 1000):
        raise ValueError("请选择有效的 Org 文件夹。")
    webdav_url = str(value.get("webdavUrl", "")).strip()
    if source_type == "webdav" and not webdav_url.lower().startswith(("http://", "https://")):
        raise ValueError("请选择 WebDAV 时必须填写有效的服务器地址。")
    try:
        interval = max(1, min(1440, int(value.get("intervalMinutes", 10))))
        advance = max(0, min(10080, int(value.get("deadlineAdvanceMinutes", 15))))
        scheduled_advance = max(0, min(10080, int(value.get("scheduledAdvanceMinutes", 0))))
        repeat = max(1, min(20, int(value.get("alarmRepeat", 3))))
        interval_seconds = max(0, min(60, int(value.get("alarmIntervalSeconds", 2))))
    except (TypeError, ValueError) as error:
        raise ValueError("检查间隔或提前提醒时间无效。") from error
    raw_times = value.get("dailySummaryTimes", [value.get("dailySummaryTime", "09:00")])
    if not isinstance(raw_times, list):
        raw_times = str(raw_times).replace("，", ",").split(",")
    summary_times = []
    for raw_time in raw_times:
        summary_time = str(raw_time).strip()
        try:
            hour, minute = [int(part) for part in summary_time.split(":")]
            if len(summary_time) != 5 or not 0 <= hour <= 23 or not 0 <= minute <= 59:
                raise ValueError
        except (ValueError, TypeError) as error:
            raise ValueError("每日提醒时间无效，请使用 09:00, 14:30 这样的格式。") from error
        if summary_time not in summary_times:
            summary_times.append(summary_time)
    summary_times = sorted(summary_times)[:12]
    if not summary_times:
        raise ValueError("请至少设置一个每日提醒时间。")
    done_statuses = value.get("doneStatuses", ["DONE", "CNCL"])
    if not isinstance(done_statuses, list):
        done_statuses = ["DONE", "CNCL"]
    property_names = []
    for field, fallback in (
        ("scheduledAlarmProperty", "SCHEDULED_ALARM"),
        ("deadlineAlarmProperty", "DEADLINE_ALARM"),
        ("legacyAlarmProperty", "ALARM"),
    ):
        name = str(value.get(field, fallback)).strip().upper()
        if not re.fullmatch(r"[A-Z0-9_-]+", name):
            raise ValueError("闹钟属性名只能包含字母、数字、下划线或连字符。")
        property_names.append(name)
    if len(set(property_names)) != 3:
        raise ValueError("三个闹钟属性名不能重复。")
    return {
        "enabled": bool(value.get("enabled", False)),
        "sourceType": source_type,
        "folder": folder,
        "webdavUrl": webdav_url,
        "webdavUsername": str(value.get("webdavUsername", "")).strip(),
        "webdavPassword": str(value.get("webdavPassword", "")),
        "webdavFolder": str(value.get("webdavFolder", "")).strip(),
        "webdavRecursive": bool(value.get("webdavRecursive", True)),
        "intervalMinutes": interval,
        "dailySummaryTime": summary_times[0],
        "dailySummaryTimes": summary_times,
        "missedSummaryPolicy": "skip" if value.get("missedSummaryPolicy") == "skip" else "latest",
        "groupNotifications": bool(value.get("groupNotifications", True)),
        "scheduledAdvanceMinutes": scheduled_advance,
        "deadlineAdvanceMinutes": advance,
        "alarmEnabled": True,
        "alarmRepeat": repeat,
        "alarmIntervalSeconds": interval_seconds,
        "alarmSoundPath": str(value.get("alarmSoundPath", "")).strip(),
        "scheduledAlarmProperty": property_names[0],
        "deadlineAlarmProperty": property_names[1],
        "legacyAlarmProperty": property_names[2],
        "doneStatuses": [str(item).upper() for item in done_statuses if str(item).strip()],
    }


def save_reminder_config(value: dict) -> None:
    temporary = REMINDER_CONFIG_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(REMINDER_CONFIG_PATH)


def save_json_file(path: Path, value: object) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def _parse_clear_bound(text: str, end_of_day: bool = False) -> Optional[datetime]:
    text = str(text or "").strip()
    if not text:
        return None
    match = re.fullmatch(
        r"(20\d{2}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?",
        text,
    )
    if not match:
        raise ValueError("时间格式无效，请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:MM。")
    date_text = match.group(1)
    hour_text, minute_text, second_text = match.group(2), match.group(3), match.group(4)
    try:
        parsed = datetime.strptime(date_text, "%Y-%m-%d")
    except ValueError as error:
        raise ValueError("日期无效。") from error
    if hour_text is None:
        if end_of_day:
            return parsed.replace(hour=23, minute=59, second=59)
        return parsed.replace(hour=0, minute=0, second=0)
    hour, minute, second = int(hour_text), int(minute_text), int(second_text or 0)
    if not 0 <= hour <= 23 or not 0 <= minute <= 59 or not 0 <= second <= 59:
        raise ValueError("时间无效。")
    if end_of_day:
        second = 59
    return parsed.replace(hour=hour, minute=minute, second=second)


def _record_datetime(key: object) -> Optional[datetime]:
    match = re.search(
        r"(20\d{2}-\d{2}-\d{2})[T :](\d{1,2}):(\d{2})",
        str(key),
    )
    if not match:
        return None
    try:
        parsed = datetime.strptime(match.group(1), "%Y-%m-%d")
        return parsed.replace(hour=int(match.group(2)), minute=int(match.group(3)), second=0)
    except ValueError:
        return None


def reminder_record_label(key: object) -> str:
    text = str(key)
    digest = re.fullmatch(r"digest:(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})", text)
    if digest:
        return f"每日汇总 {digest.group(1)} {digest.group(2)}"
    parts = text.split(":", 3)
    if len(parts) == 4 and parts[0] in {"scheduled", "deadline"}:
        time_text = parts[3].replace("T", " ")[:16]
        return f"{parts[0].upper()} · {parts[1]} · 行 {parts[2]} · {time_text}"
    return text


def reminded_clear_result(from_time: str = "", to_time: str = "") -> tuple[list[str], list[str]]:
    """返回 (全部已提醒记录键, 将按时间范围移除的记录键)，不修改状态文件。"""
    state = read_json_file(REMINDER_STATE_PATH, {})
    sent = state.get("sent") if isinstance(state, dict) and isinstance(state.get("sent"), dict) else {}
    from_dt = _parse_clear_bound(from_time, end_of_day=False)
    to_dt = _parse_clear_bound(to_time, end_of_day=True)
    if from_dt and to_dt and from_dt > to_dt:
        raise ValueError("结束时间不能早于开始时间。")

    def in_range(key: object) -> bool:
        record = _record_datetime(key)
        if record is None:
            return False
        if from_dt and record < from_dt:
            return False
        if to_dt and record > to_dt:
            return False
        return True

    removed_keys = [key for key in sent if in_range(key)] if (from_dt or to_dt) else list(sent.keys())
    return list(sent.keys()), removed_keys


def clear_reminded_records(from_time: str = "", to_time: str = "") -> int:
    """按计划提醒时间清除已提醒记录；不填时间则全部清除。"""
    all_keys, removed_keys = reminded_clear_result(from_time, to_time)
    if not removed_keys:
        return 0
    state = read_json_file(REMINDER_STATE_PATH, {})
    if isinstance(state, dict) and isinstance(state.get("sent"), dict):
        removed_set = set(removed_keys)
        state["sent"] = {key: value for key, value in state["sent"].items() if key not in removed_set}
        try:
            save_json_file(REMINDER_STATE_PATH, state)
        except OSError as error:
            raise OSError(f"无法写入提醒状态文件：{error}") from error
    return len(removed_keys)


class OrgWebDavHandler(BaseHTTPRequestHandler):
    server_version = "OrgWebDavBridge/1.0"

    def log_message(self, format_string: str, *args: object) -> None:
        # 不输出 Authorization，也不记录请求正文。
        print(f"[本地桥接] {self.command} {self.path.split('?', 1)[0]}")

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/external-editor":
            if not self._external_editor_allowed():
                return
            try:
                session = urllib.parse.parse_qs(parsed.query).get("session", [""])[0]
                self._send_json(200, read_external_editor(session))
            except (OSError, ValueError) as error:
                self._send_json(404 if isinstance(error, FileNotFoundError) else 400, {"ok": False, "error": str(error)})
            return
        if parsed.path == "/reminder-config":
            if self._authorized():
                value = read_json_file(REMINDER_CONFIG_PATH, dict(REMINDER_DEFAULTS))
                self._send_json(200, value)
            return
        if parsed.path == "/reminder-status":
            if self._authorized():
                state = read_json_file(REMINDER_STATE_PATH, {})
                self._send_json(200, {"state": state, "scriptAvailable": REMINDER_SCRIPT_PATH.exists()})
            return
        if parsed.path == "/reminder-state-file":
            if self._authorized():
                text = read_json_file(REMINDER_STATE_PATH, {})
                self._send_json(200, {"text": json.dumps(text, ensure_ascii=False, indent=2)})
            return
        if self.path.startswith("/webdav-proxy?"):
            self._proxy()
            return
        self._serve_html()

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/external-editor/open":
            if not self._external_editor_allowed():
                return
            try:
                body = self._read_json_body(MAX_BODY)
                if not isinstance(body, dict):
                    raise ValueError("外部编辑请求格式无效。")
                self._send_json(200, open_external_editor(body.get("name"), body.get("text")))
            except (OSError, ValueError) as error:
                self._send_json(400, {"ok": False, "error": str(error)})
            return
        if parsed.path not in {"/reminder-config", "/reminder-test", "/reminder-test-alarm", "/reminder-sync-now",
                               "/reminder-clear", "/reminder-state-file"}:
            self._send_text(404, "未知的本地桥接操作。")
            return
        if not self._authorized():
            return
        if parsed.path == "/reminder-state-file":
            try:
                body = self._read_json_body()
                text = str(body.get("text", "") or "")
                parsed_state = json.loads(text)
                if not isinstance(parsed_state, dict) or not isinstance(parsed_state.get("sent", {}), dict):
                    raise ValueError("已提醒记录必须是包含 sent 对象的 JSON。")
                save_json_file(REMINDER_STATE_PATH, parsed_state)
                self._send_json(200, {"ok": True})
            except (OSError, ValueError) as error:
                self._send_json(400, {"ok": False, "error": str(error)})
            return
        if parsed.path == "/reminder-clear":
            try:
                body = self._read_json_body()
                from_date = str(body.get("from", "") or "").strip()
                to_date = str(body.get("to", "") or "").strip()
                if body.get("preview"):
                    all_keys, removed_keys = reminded_clear_result(from_date, to_date)
                    removed_set = set(removed_keys)
                    self._send_json(200, {
                        "ok": True,
                        "preview": True,
                        "removed": len(removed_keys),
                        "beforeCount": len(all_keys),
                        "afterCount": len(all_keys) - len(removed_keys),
                        "beforeRecords": [
                            {"key": key, "label": reminder_record_label(key)} for key in all_keys
                        ],
                        "removedRecords": [
                            {"key": key, "label": reminder_record_label(key)} for key in removed_keys
                        ],
                    })
                else:
                    removed = clear_reminded_records(from_date, to_date)
                    self._send_json(200, {"ok": True, "removed": removed})
            except (OSError, ValueError) as error:
                self._send_json(400, {"ok": False, "error": str(error)})
            return
        if parsed.path == "/reminder-config":
            try:
                value = validate_reminder_config(self._read_json_body())
                save_reminder_config(value)
                self._send_json(200, {"ok": True, "config": value})
            except (OSError, ValueError) as error:
                self._send_json(400, {"ok": False, "error": str(error)})
            return
        if parsed.path == "/reminder-sync-now":
            if not REMINDER_SCRIPT_PATH.exists():
                self._send_json(404, {"ok": False, "error": "没有找到 Windows 提醒助手。"})
                return
            try:
                flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
                result = subprocess.run(
                    [sys.executable, str(REMINDER_SCRIPT_PATH), "--once"],
                    capture_output=True,
                    text=True,
                    timeout=120,
                    creationflags=flags,
                )
                if result.returncode:
                    raise RuntimeError((result.stderr or result.stdout or "提醒刷新失败").strip())
                self._send_json(200, {"ok": True, "state": read_json_file(REMINDER_STATE_PATH, {})})
            except Exception as error:
                self._send_json(500, {"ok": False, "error": str(error)})
            return
        if not REMINDER_SCRIPT_PATH.exists():
            self._send_json(404, {"ok": False, "error": "没有找到 Windows 提醒助手。"})
            return
        try:
            flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            arguments = ["--test-alarm"] if parsed.path == "/reminder-test-alarm" else ["--test-notification"]
            result = subprocess.run(
                [sys.executable, str(REMINDER_SCRIPT_PATH), *arguments],
                capture_output=True,
                text=True,
                timeout=40,
                creationflags=flags,
            )
            if result.returncode:
                raise RuntimeError((result.stderr or result.stdout or "通知发送失败").strip())
            self._send_json(200, {"ok": True})
        except Exception as error:
            self._send_json(500, {"ok": False, "error": str(error)})

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PROPFIND, PUT, MKCOL, MOVE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Depth, If-Match, Destination, Overwrite")
        self.end_headers()

    def do_PROPFIND(self) -> None:
        self._proxy()

    def do_PUT(self) -> None:
        self._proxy()

    def do_MKCOL(self) -> None:
        self._proxy()

    def do_MOVE(self) -> None:
        self._proxy()

    def _serve_html(self) -> None:
        if not self._authorized():
            return
        path = urllib.parse.unquote(urllib.parse.urlparse(self.path).path)
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if path.startswith("/plugins/"):
            plugin_path = (BASE_DIR / path.lstrip("/")).resolve()
            plugins_dir = (BASE_DIR / "plugins").resolve()
            if plugin_path.parent != plugins_dir or plugin_path.suffix.lower() != ".js":
                self._send_text(404, "插件文件不存在。")
                return
            try:
                body = plugin_path.read_bytes()
            except OSError:
                self._send_text(404, "插件文件不存在。")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)
            return
        if path not in {"/", f"/{HTML_NAME}"}:
            self._send_text(404, "本地桥接只提供 Org 清单页面。")
            return
        try:
            body = HTML_PATH.read_bytes()
        except OSError as error:
            self._send_text(500, f"无法读取 {HTML_NAME}：{error}")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self) -> None:
        if not self._authorized():
            return
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        target = query.get("url", [""])[0]
        target_url = urllib.parse.urlparse(target)
        if parsed.path != "/webdav-proxy" or target_url.scheme not in {"http", "https"}:
            self._send_text(400, "WebDAV 目标地址无效。")
            return

        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            self._send_text(400, "请求长度无效。")
            return
        if length > MAX_BODY:
            self._send_text(413, "请求内容超过 25 MB。")
            return
        body = self.rfile.read(length) if length else None

        forwarded_headers: Dict[str, str] = {}
        for name in (
            "Authorization",
            "Depth",
            "Content-Type",
            "If-Match",
            "If-None-Match",
            "Destination",
            "Overwrite",
        ):
            value = self.headers.get(name)
            if value:
                forwarded_headers[name] = value

        request = urllib.request.Request(
            target,
            data=body,
            headers=forwarded_headers,
            method=self.command,
        )
        try:
            if target_url.hostname in {"127.0.0.1", "localhost", "::1"}:
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                response_context = opener.open(request, timeout=35)
            else:
                response_context = urllib.request.urlopen(request, timeout=35)
            with response_context as response:
                response_body = response.read(MAX_BODY + 1)
                if len(response_body) > MAX_BODY:
                    self._send_text(502, "WebDAV 响应超过 25 MB。")
                    return
                self._relay_response(response.status, response.reason, response.headers, response_body)
        except urllib.error.HTTPError as error:
            response_body = error.read(MAX_BODY + 1)
            self._relay_response(error.code, error.reason, error.headers, response_body[:MAX_BODY])
        except urllib.error.URLError as error:
            self._send_text(502, f"本地桥接无法访问 WebDAV：{error.reason}")
        except TimeoutError:
            self._send_text(504, "WebDAV 连接超时。")
        except Exception as error:
            self._send_text(502, f"WebDAV 桥接错误：{error}")

    def _relay_response(
        self,
        status: int,
        reason: str,
        headers: object,
        body: bytes,
    ) -> None:
        self.send_response(status, reason or http.client.responses.get(status, ""))
        for name in ("Content-Type", "ETag", "Last-Modified", "DAV"):
            value = headers.get(name) if headers else None
            if value:
                self.send_header(name, value)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _send_text(self, status: int, text: str) -> None:
        body = text.encode("utf-8", errors="replace")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, status: int, value: object) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self, maximum: int = 128 * 1024) -> object:
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError as error:
            raise ValueError("请求长度无效。") from error
        if length <= 0 or length > maximum:
            raise ValueError("请求内容为空或过大。")
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, ValueError) as error:
            raise ValueError("请求内容不是有效 JSON。") from error

    def _external_editor_allowed(self) -> bool:
        if not self._authorized():
            return False
        if not getattr(self.server, "allow_external_editor", True):
            self._send_json(403, {"ok": False, "error": "局域网桥接禁止调用 Windows 外部应用。"})
            return False
        if self.client_address[0] not in {"127.0.0.1", "::1"}:
            self._send_json(403, {"ok": False, "error": "外部编辑只允许本机访问。"})
            return False
        origin = self.headers.get("Origin", "")
        if origin:
            parsed = urllib.parse.urlparse(origin)
            expected_port = self.server.server_address[1]
            if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"} or parsed.port != expected_port:
                self._send_json(403, {"ok": False, "error": "外部编辑请求来源无效。"})
                return False
        return True

    def _authorized(self) -> bool:
        expected = getattr(self.server, "access_token", "")
        if not expected:
            return True
        parsed = urllib.parse.urlparse(self.path)
        supplied = urllib.parse.parse_qs(parsed.query).get("token", [""])[0]
        if secrets.compare_digest(supplied, expected):
            return True
        self._send_text(403, "手机桥接访问令牌无效，请使用启动窗口中显示的完整地址。")
        return False


def create_server(host: str) -> Tuple[ThreadingHTTPServer, int]:
    last_error: Optional[OSError] = None
    for port in range(FIRST_PORT, FIRST_PORT + 10):
        try:
            return ThreadingHTTPServer((host, port), OrgWebDavHandler), port
        except OSError as error:
            last_error = error
    raise RuntimeError(f"无法在 {FIRST_PORT}-{FIRST_PORT + 9} 端口启动：{last_error}")


def find_lan_ip() -> str:
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("8.8.8.8", 80))
        address = probe.getsockname()[0]
        probe.close()
        return address
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return "127.0.0.1"


def main() -> None:
    if not HTML_PATH.exists():
        raise SystemExit(f"没有找到同目录文件：{HTML_NAME}")
    lan_mode = os.environ.get("ORG_WEBDAV_LAN") == "1"
    bind_host = "0.0.0.0" if lan_mode else "127.0.0.1"
    server, port = create_server(bind_host)
    access_token = secrets.token_urlsafe(18) if lan_mode else ""
    server.access_token = access_token
    # LAN mode still permits the Windows page opened on 127.0.0.1; remote phone clients
    # are rejected by _external_editor_allowed() because their client address is not loopback.
    server.allow_external_editor = True
    cleanup_external_editor_files()
    query = f"?bridge=1&token={urllib.parse.quote(access_token)}" if lan_mode else ""
    local_url = f"http://127.0.0.1:{port}/{query}"
    print("Org 清单 WebDAV 本地桥接已启动。")
    print(f"电脑页面地址：{local_url}")
    if lan_mode:
        phone_url = f"http://{find_lan_ip()}:{port}/{query}"
        print(f"手机页面地址：{phone_url}")
        print("手机和电脑需连接同一 Wi-Fi；Windows 防火墙提示时请允许专用网络访问。")
    print("请保留此窗口；关闭窗口或按 Ctrl+C 即可停止。")
    if os.environ.get("ORG_WEBDAV_NO_BROWSER") != "1":
        threading.Timer(0.5, lambda: webbrowser.open(local_url)).start()
    test_seconds = os.environ.get("ORG_WEBDAV_TEST_SECONDS", "")
    if test_seconds:
        threading.Timer(float(test_seconds), server.shutdown).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n正在停止本地桥接…")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
