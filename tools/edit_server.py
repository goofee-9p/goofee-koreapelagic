#!/usr/bin/env python3
"""로컬 편집 서버.

    python tools/edit_server.py
    → http://localhost:5173/?edit   (포트폴리오)
    → http://localhost:5173/이력서/이력서_구병기_코리아펠라직.html?edit

`?edit` 로 열면 글자를 직접 고칠 수 있고, 저장을 누르면 원본 HTML 에 그대로 반영된다.

**편집 기능은 이 서버에서만 동작한다.** 편집 스크립트는 파일에 심지 않고 서버가
응답할 때만 끼워 넣으므로, 깃허브에 올라간 배포본에는 편집 기능이 존재하지 않는다.

저장은 파일을 다시 렌더링하지 않는다. `data-edit` 로 표시된 요소의 **여는 태그와 닫는 태그
사이 구간만** 잘라 끼운다. 손으로 짠 들여쓰기와 주석이 그대로 남는다.
"""
import http.server
import json
import os
import pathlib
import re
import shutil
import socketserver
import subprocess
import sys
import urllib.parse
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = int(os.environ.get("PORT", "5173"))
EDITABLE = {"index.html", "이력서_구병기_코리아펠라직.html"}
VOID = {"br", "img", "input", "meta", "link", "hr", "source", "track", "area",
        "base", "col", "embed", "param", "wbr"}


# ─────────────────────────────────────────────────────────────
# 원본 HTML 에서 data-edit 요소의 '내용 구간' 찾기
# ─────────────────────────────────────────────────────────────
class RangeFinder(HTMLParser):
    """data-edit 요소마다 (내용 시작, 내용 끝) 바이트 오프셋을 기록한다."""

    def __init__(self, src: str):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.line_start = [0]
        for line in src.splitlines(keepends=True):
            self.line_start.append(self.line_start[-1] + len(line))
        self.stack: list[dict] = []
        self.ranges: dict[str, tuple[int, int]] = {}

    def _pos(self) -> int:
        line, col = self.getpos()
        return self.line_start[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        eid = dict(attrs).get("data-edit")
        start = self._pos()
        content_start = self.src.index(">", start) + 1
        self.stack.append({"tag": tag, "eid": eid, "content_start": content_start})

    def handle_endtag(self, tag):
        while self.stack:
            node = self.stack.pop()
            if node["tag"] != tag:
                continue
            if node["eid"]:
                self.ranges[node["eid"]] = (node["content_start"], self._pos())
            break


def apply_edits(path: pathlib.Path, edits: dict[str, str]) -> dict:
    """edits = {data-edit 값: 새 innerHTML}. 뒤에서부터 끼워 넣어 오프셋을 지킨다."""
    src = path.read_text(encoding="utf-8")
    finder = RangeFinder(src)
    finder.feed(src)

    unknown = [k for k in edits if k not in finder.ranges]
    if unknown:
        return {"ok": False, "error": f"찾을 수 없는 식별자: {', '.join(unknown[:5])}"}

    ordered = sorted(edits.items(), key=lambda kv: finder.ranges[kv[0]][0], reverse=True)
    for eid, html in ordered:
        a, b = finder.ranges[eid]
        src = src[:a] + html + src[b:]

    # 저장 직전 원본을 한 벌 남긴다 — 되돌릴 곳이 있어야 마음 놓고 고친다
    backup = path.with_suffix(path.suffix + ".bak")
    shutil.copy2(path, backup)
    path.write_text(src, encoding="utf-8")
    return {"ok": True, "count": len(edits), "backup": backup.name}


# ─────────────────────────────────────────────────────────────
# PDF 재생성
# ─────────────────────────────────────────────────────────────
def find_chrome() -> str | None:
    candidates = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        shutil.which("google-chrome") or "",
        shutil.which("chromium") or "",
    ]
    return next((c for c in candidates if c and pathlib.Path(c).exists()), None)


def rebuild_pdf(which: str) -> dict:
    chrome = find_chrome()
    if not chrome:
        return {"ok": False, "error": "Chrome 을 찾지 못했습니다. PDF 는 README 의 명령으로 만들어 주세요."}
    if which == "resume":
        url = f"http://localhost:{PORT}/이력서/이력서_구병기_코리아펠라직.html"
        out = ROOT / "이력서" / "이력서_구병기_코리아펠라직.pdf"
    else:
        url = f"http://localhost:{PORT}/"
        out = ROOT / "포트폴리오_구병기_코리아펠라직.pdf"
    # --window-size 는 빼면 안 된다. 헤드리스 크롬은 창 크기(기본 800)로 미디어쿼리를
    # 따지기 때문에, 지면은 1440 인데 좁은 화면용 규칙이 켜져 단이 무너진 채로 인쇄된다
    cmd = [chrome, "--headless", "--disable-gpu", "--no-pdf-header-footer",
           "--window-size=1440,1020",
           "--virtual-time-budget=22000", f"--print-to-pdf={out}", url]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=180)
    except subprocess.CalledProcessError as e:
        return {"ok": False, "error": e.stderr.decode("utf-8", "ignore")[-300:]}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "PDF 생성이 시간 안에 끝나지 않았습니다."}
    return {"ok": True, "file": out.name, "mb": round(out.stat().st_size / 1048576, 2)}


# ─────────────────────────────────────────────────────────────
# 서버
# ─────────────────────────────────────────────────────────────
EDIT_JS = (pathlib.Path(__file__).resolve().parent / "edit.js")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        # 편집용 내부 경로(/__edit.js · /__save · /__pdf)는 로그에서 걸러 낸다.
        # 오류 로그는 첫 인자가 문자열이 아니라 상태 코드다 — 그때는 그냥 찍는다.
        first = args[0] if args else ""
        if not isinstance(first, str) or "__" not in first:
            super().log_message(fmt, *args)

    # ── 편집 스크립트는 파일에 심지 않고 응답에만 끼워 넣는다 ──
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/__edit.js":
            body = EDIT_JS.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        # parse_qs 는 값 없는 ?edit 를 버린다 — 빈 값도 살려서 본다
        wants_edit = "edit" in urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        target = self._resolve(parsed.path)
        if wants_edit and target and target.name in EDITABLE:
            html = target.read_text(encoding="utf-8")
            html = html.replace("</body>", '<script src="/__edit.js"></script>\n</body>', 1)
            body = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        super().do_GET()

    def _resolve(self, url_path: str) -> pathlib.Path | None:
        rel = urllib.parse.unquote(url_path.lstrip("/"))
        path = (ROOT / rel) if rel else (ROOT / "index.html")
        if path.is_dir():
            path = path / "index.html"
        try:
            path.resolve().relative_to(ROOT)   # 저장소 밖 접근 차단
        except ValueError:
            return None
        return path if path.exists() else None

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self._json({"ok": False, "error": "잘못된 요청"}, 400)

        if parsed.path == "/__save":
            target = self._resolve(payload.get("page", "/index.html"))
            if not target or target.name not in EDITABLE:
                return self._json({"ok": False, "error": "편집할 수 없는 파일입니다."}, 400)
            edits = payload.get("edits") or {}
            if not isinstance(edits, dict) or not edits:
                return self._json({"ok": False, "error": "바뀐 내용이 없습니다."}, 400)
            return self._json(apply_edits(target, edits))

        if parsed.path == "/__pdf":
            return self._json(rebuild_pdf(payload.get("which", "portfolio")))

        return self._json({"ok": False, "error": "알 수 없는 경로"}, 404)

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    if not EDIT_JS.exists():
        sys.exit(f"편집 스크립트가 없습니다: {EDIT_JS}")
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        print(f"편집 서버 · http://localhost:{PORT}/?edit")
        print(f"이력서    · http://localhost:{PORT}/이력서/이력서_구병기_코리아펠라직.html?edit")
        print("종료는 Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n종료")
