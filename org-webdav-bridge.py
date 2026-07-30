from __future__ import annotations

import http.client
import os
import secrets
import socket
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, Optional, Tuple


FIRST_PORT = 8765
HTML_NAME = "Org清单-本地版.html"
BASE_DIR = Path(__file__).resolve().parent
HTML_PATH = BASE_DIR / HTML_NAME
MAX_BODY = 25 * 1024 * 1024


class OrgWebDavHandler(BaseHTTPRequestHandler):
    server_version = "OrgWebDavBridge/1.0"

    def log_message(self, format_string: str, *args: object) -> None:
        # 不输出 Authorization，也不记录请求正文。
        print(f"[本地桥接] {self.command} {self.path.split('?', 1)[0]}")

    def do_GET(self) -> None:
        if self.path.startswith("/webdav-proxy?"):
            self._proxy()
            return
        self._serve_html()

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
