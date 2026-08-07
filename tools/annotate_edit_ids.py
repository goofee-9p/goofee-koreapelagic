#!/usr/bin/env python3
"""index.html 의 텍스트 요소에 data-edit 식별자를 붙인다.

편집 모드가 "이 화면의 이 문장"을 "파일의 이 위치"로 되돌려 찾으려면 안정된 이름표가 필요하다.
이미 붙어 있는 요소는 건드리지 않으므로 몇 번을 돌려도 결과가 같다.

    python tools/annotate_edit_ids.py
"""
import pathlib
import re
import sys
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGETS = ROOT / "index.html", ROOT / "이력서" / "이력서_구병기_코리아펠라직.html"

# 내용을 통째로 바꿔도 되는 '잎' 요소들
TAGS = {"h1", "h2", "h3", "h4", "p", "li", "figcaption", "blockquote"}
# span·div 는 클래스로 잡는다. 이력서는 본문이 대부분 div 안에 있다
CLASS_TARGETS = {
    "tag", "chip", "vspec", "label", "eyebrow",          # 포트폴리오 칩
    "intro", "role", "job-sub", "past-d", "meta", "term",  # 이력서 본문
    "d", "v", "k", "t", "n", "no", "cat", "x", "q", "ds",
}
VOID = {"br", "img", "input", "meta", "link", "hr", "source", "track", "area", "base", "col", "embed", "param", "wbr"}


class Scanner(HTMLParser):
    """여는 태그의 파일 오프셋과 중첩 관계를 모은다."""

    def __init__(self, src: str):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.lines = [0]
        for line in src.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))
        self.stack: list[dict] = []
        self.found: list[dict] = []

    def _pos(self) -> int:
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        a = dict(attrs)
        classes = set((a.get("class") or "").split())
        is_target = tag in TAGS or (tag in ("span", "div") and classes & CLASS_TARGETS)
        node = {
            "tag": tag,
            "start": self._pos(),
            "has_id": "data-edit" in a,
            "is_target": is_target,
            "child_target": False,
            "has_text": False,
        }
        self.stack.append(node)

    def handle_data(self, data):
        if data.strip():
            for node in self.stack:
                node["has_text"] = True

    def handle_endtag(self, tag):
        while self.stack:
            node = self.stack.pop()
            if node["tag"] != tag:
                continue  # 닫히지 않은 태그는 흘려보낸다
            if node["is_target"]:
                for parent in self.stack:
                    if parent["is_target"]:
                        parent["child_target"] = True
                self.found.append(node)
            break

    def handle_startendtag(self, tag, attrs):
        pass


def annotate(path: pathlib.Path, prefix: str) -> int:
    src = path.read_text(encoding="utf-8")
    used = set(re.findall(r'data-edit="([^"]+)"', src))

    scanner = Scanner(src)
    scanner.feed(src)

    # 다른 잎을 품고 있거나 글자가 없는 요소는 제외 — 안쪽의 '글이 든 잎'만 편집 대상
    leaves = [
        n for n in scanner.found
        if n["is_target"] and n["has_text"] and not n["child_target"] and not n["has_id"]
    ]
    if not leaves:
        print(f"{path.name}: 이미 모두 부여됨 ({len(used)}개)")
        return 0

    seq = len(used)
    edits = []
    for node in sorted(leaves, key=lambda n: n["start"]):
        seq += 1
        name = f"{prefix}{seq:03d}"
        while name in used:
            seq += 1
            name = f"{prefix}{seq:03d}"
        used.add(name)
        insert_at = src.index(">", node["start"])
        # <p ...> 의 '>' 바로 앞에 끼워 넣는다. 자기닫힘 태그는 대상이 아니다
        edits.append((insert_at, f' data-edit="{name}"'))

    for pos, text in sorted(edits, reverse=True):
        src = src[:pos] + text + src[pos:]

    path.write_text(src, encoding="utf-8")
    print(f"{path.name}: {len(edits)}개 부여 (누적 {len(used)}개)")
    return len(edits)


if __name__ == "__main__":
    total = 0
    for target in TARGETS:
        if not target.exists():
            print(f"건너뜀 — 파일 없음: {target}", file=sys.stderr)
            continue
        total += annotate(target, prefix="e")
    print(f"완료 · 신규 {total}개")
