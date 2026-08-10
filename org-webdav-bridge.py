from __future__ import annotations

import http.client
import json
import os
import secrets
import socket
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, Optional, Tuple


FIRST_PORT = 8765
HTML_NAME = "Orglist.html"
BASE_DIR = Path(__file__).resolve().parent
HTML_PATH = BASE_DIR / HTML_NAME
MAX_BODY = 25 * 1024 * 1024
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
    "deadlineAdvanceMinutes": 15,
    "doneStatuses": ["DONE", "CNCL"],
}


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
        "deadlineAdvanceMinutes": advance,
        "doneStatuses": [str(item).upper() for item in done_statuses if str(item).strip()],
    }


def save_reminder_config(value: dict) -> None:
    temporary = REMINDER_CONFIG_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(REMINDER_CONFIG_PATH)


class OrgWebDavHandler(BaseHTTPRequestHandler):
    server_version = "OrgWebDavBridge/1.0"

    def log_message(self, format_string: str, *args: object) -> None:
        # 不输出 Authorization，也不记录请求正文。
        print(f"[本地桥接] {self.command} {self.path.split('?', 1)[0]}")

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
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
        if self.path.startswith("/webdav-proxy?"):
            self._proxy()
            return
        self._serve_html()

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path not in {"/reminder-config", "/reminder-test"}:
            self._send_text(404, "未知的本地桥接操作。")
            return
        if not self._authorized():
            return
        if parsed.path == "/reminder-config":
            try:
                value = validate_reminder_config(self._read_json_body())
                save_reminder_config(value)
                self._send_json(200, {"ok": True, "config": value})
            except (OSError, ValueError) as error:
                self._send_json(400, {"ok": False, "error": str(error)})
            return
        if not REMINDER_SCRIPT_PATH.exists():
            self._send_json(404, {"ok": False, "error": "没有找到 Windows 提醒助手。"})
            return
        try:
            flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            result = subprocess.run(
                [sys.executable, str(REMINDER_SCRIPT_PATH), "--test-notification"],
                capture_output=True,
                text=True,
                timeout=20,
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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PROPFIND, PUT")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Depth, If-Match")
        self.end_headers()

    def do_PROPFIND(self) -> None:
        self._proxy()

    def do_PUT(self) -> None:
        self._proxy()

    def _serve_html(self) -> None:
        if not self._authorized():
            return
        path = urllib.parse.unquote(urllib.parse.urlparse(self.path).path)
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
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

    def _read_json_body(self) -> object:
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError as error:
            raise ValueError("请求长度无效。") from error
        if length <= 0 or length > 128 * 1024:
            raise ValueError("提醒配置内容为空或过大。")
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, ValueError) as error:
            raise ValueError("提醒配置不是有效 JSON。") from error

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
