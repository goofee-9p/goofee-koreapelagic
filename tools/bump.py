"""CSS·JS 주소 뒤의 ?v= 를 현재 시각으로 갱신한다.

왜 필요한가
    GitHub Pages 는 CSS·JS 를 `cache-control: max-age=600` 으로 내려준다.
    방문자 브라우저가 10분간 예전 파일을 붙들기 때문에, 푸시해도 화면이 안 바뀐다.
    주소 뒤 숫자가 바뀌면 브라우저는 '다른 파일' 로 보고 새로 받는다.

언제 쓰나
    디자인이나 스크립트를 고친 뒤, 푸시하기 전에 한 번.
    글자만 고쳤다면 안 돌려도 된다 (HTML 은 캐시가 짧다).

    python3 tools/bump.py
"""

import re
import sys
from datetime import datetime
from pathlib import Path

TARGETS = ["index.html"]
PATTERNS = [
    (re.compile(r'(href="assets/css/site\.css)(\?v=\d+)?(")'), "css"),
    (re.compile(r'(src="assets/js/site\.js)(\?v=\d+)?(")'), "js"),
]


def main() -> int:
    version = datetime.now().strftime("%Y%m%d%H%M")
    root = Path(__file__).resolve().parent.parent
    touched = 0

    for name in TARGETS:
        path = root / name
        if not path.exists():
            print(f"  건너뜀 — {name} 없음")
            continue

        text = path.read_text(encoding="utf-8")
        before = text
        for pattern, _label in PATTERNS:
            text = pattern.sub(rf"\g<1>?v={version}\g<3>", text)

        if text != before:
            path.write_text(text, encoding="utf-8")
            touched += 1
            print(f"  {name} → ?v={version}")
        else:
            print(f"  {name} — 바꿀 것 없음")

    if not touched:
        print("\n갱신된 파일이 없습니다. 주소 형식이 바뀌었는지 확인하세요.")
        return 1

    print(f"\n완료. 이제 커밋하고 푸시하면 방문자에게 새 파일이 갑니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
