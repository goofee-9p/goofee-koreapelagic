# 포트폴리오 — 구병기 · 퍼포먼스 마케터

(주)코리아펠라직 / 가시제거연구소 지원용 포트폴리오 웹사이트.

## 🔗 배포 주소

| | |
|---|---|
| **포트폴리오** | **<https://goofee-9p.github.io/goofee-koreapelagic/>** |
| 이력서 | <https://goofee-9p.github.io/goofee-koreapelagic/이력서/이력서_구병기_코리아펠라직.html> |

`main` 에 푸시하면 몇 분 안에 위 주소에 반영됩니다.
`robots.txt` 가 noindex 라 검색에는 안 걸리지만, 주소를 아는 사람은 볼 수 있습니다.

> 이엠넷 클라이언트 제안서·운영안 **원본은 이 저장소에 없습니다.**
> 대외비이며, 필요한 부분만 발췌·마스킹해 반영했습니다.

---

## 산출물

| 파일 | 설명 |
|---|---|
| [`index.html`](index.html) | **포트폴리오 웹사이트** — 원본이자 배포본 |
| [`포트폴리오_구병기_코리아펠라직.pdf`](포트폴리오_구병기_코리아펠라직.pdf) | 웹에서 파생한 PDF · 28장 · 1440×1020 |
| [`이력서/이력서_구병기_코리아펠라직.html`](이력서/이력서_구병기_코리아펠라직.html) | 이력서 원본 |
| [`이력서/이력서_구병기_코리아펠라직.pdf`](이력서/이력서_구병기_코리아펠라직.pdf) | 이력서 · A4 2페이지 |
| [`docs/design.md`](docs/design.md) | **디자인 시스템** — 색·타이포·컴포넌트·차트·카피 기준 |

---

## 구조

```
index.html              사이트 그 자체. 여기서 수정한다
assets/
  css/site.css          토큰 · 컴포넌트 · 모션 · 인쇄
  js/site.js            스크롤 모션 (화면 전용)
  video/ poster/        광고 영상 3 · 요리 영상 3 + 포스터 프레임
  img/ creatives/       이미지 소재 · 도구 화면 · 로고
이력서/
docs/design.md
tools/
  edit_server.py        로컬 편집 서버 (배포본에는 관여하지 않는다)
  edit.js               편집 UI — ?edit 요청에만 주입된다
  annotate_edit_ids.py  편집 대상에 data-edit 이름표를 붙인다
_원본/                   .gitignore — 대외비 원본 (커밋되지 않음)
```

---

## 로컬에서 보기

```bash
python -m http.server 5173
```

`http://localhost:5173` 로 접속합니다. `file://` 로 열면 영상이 재생되지 않습니다.

`?shot` 을 붙이면 히어로의 `100svh` 가 풀리고 모션이 꺼집니다 — 전체 페이지를 한 장으로 캡처할 때 씁니다.

---

## 글자 고치기 — 편집 모드

코드를 열지 않고 **화면에서 바로 문장을 고치고 저장**할 수 있습니다.

```bash
python tools/edit_server.py
```

- 포트폴리오 — `http://localhost:5173/?edit`
- 이력서 — `http://localhost:5173/이력서/이력서_구병기_코리아펠라직.html?edit`

고칠 문장을 누르면 커서가 들어갑니다. 고친 곳은 주황색으로 표시되고,
아래 **저장**(또는 `Ctrl+S`)을 누르면 원본 HTML 에 그대로 반영됩니다.
**PDF 다시 만들기** 버튼으로 PDF 까지 그 자리에서 새로 뽑을 수 있습니다.

| 알아 둘 것 | 내용 |
|---|---|
| 배포본에는 없음 | 편집 스크립트는 파일에 심지 않고 **이 서버가 응답할 때만** 끼워 넣습니다. 깃허브에 올라간 사이트에서는 `?edit` 를 붙여도 아무 일도 일어나지 않습니다 |
| 파일이 안 망가짐 | 저장은 파일을 다시 렌더링하지 않고 **해당 문장 구간만** 잘라 끼웁니다. 들여쓰기와 주석이 그대로 남습니다 |
| 되돌릴 곳 | 저장 직전 원본을 `index.html.bak` 으로 남깁니다 (`.gitignore` 대상) |
| 서식 | 굵게는 `<b>`, 강조는 `<em>` 만 남고 나머지 태그·인라인 스타일은 저장할 때 걸러집니다 |
| 줄바꿈 | `Enter` 는 `<br>` 로 들어갑니다 |

새 문단이나 섹션을 **추가**하는 건 편집 모드로 안 됩니다. 있는 문장을 고치는 용도입니다.
HTML 을 직접 손봐서 요소를 새로 넣었다면 아래를 한 번 돌려 이름표를 붙여 주세요.

```bash
python tools/annotate_edit_ids.py
```

### 다른 컴퓨터에서 고치기

필요한 건 **Python 3** 하나입니다. PDF 를 새로 뽑을 거라면 Chrome 도 있어야 합니다.

```bash
git clone https://github.com/goofee-9p/goofee-koreapelagic.git
cd goofee-koreapelagic
python tools/edit_server.py
```

고친 뒤 올리기 — 올리면 몇 분 안에 배포 사이트에도 반영됩니다.

```bash
git add -A && git commit -m "카피 수정" && git push
```

돌아와서 이어 작업할 때는 **먼저 받아 옵니다.** 양쪽에서 같은 문장을 고치면 충돌합니다.

```bash
git pull
```

> `_원본/` 폴더(대외비 PPT·미압축 영상)는 저장소에 없습니다. 글자를 고치는 데는 필요 없습니다.
> PDF 는 바이너리라 양쪽에서 각각 새로 뽑아 올리면 충돌합니다. **한쪽에서만** 만들어 올리세요.

---

## PDF 다시 만들기

로컬 서버를 띄운 상태에서 실행합니다. **Chrome** 이 필요합니다.

```powershell
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$pdf = "포트폴리오_구병기_코리아펠라직.pdf"
Start-Process $chrome -NoNewWindow -Wait -ArgumentList '--headless','--disable-gpu','--no-pdf-header-footer','--virtual-time-budget=20000',"--print-to-pdf=`"$pdf`"",'"http://localhost:5173/"'
```

이력서는 URL 만 `http://localhost:5173/이력서/이력서_구병기_코리아펠라직.html` 로 바꿉니다.

> `Start-Process -Wait` 를 쓰는 이유 — Chrome 을 `&` 로 직접 호출하면 프로세스가 분리돼
> 출력이 끝나기 전에 프롬프트가 돌아옵니다.

---

## 웹은 움직이고, PDF는 멈춘다

같은 문서에서 두 결과물이 나옵니다. 인쇄본이 정지 상태로 나가는 건 **3중으로** 보장돼 있습니다.

1. 모션 CSS 는 전부 `@media screen` 안에만 있습니다
2. `@media print` 에서 `animation` · `transition` · `transform` · `opacity` 를 전부 무력화합니다
3. 초기 상태를 JS 가 `.motion` 클래스로 **덧씌우는 방식**입니다 —
   스크립트가 안 돌면 모든 요소가 처음부터 최종 상태입니다

`prefers-reduced-motion: reduce` 를 켠 사용자에게도 모션이 나가지 않습니다.

---

## 원칙

- 본인 재직·운영 기간 밖 데이터는 쓰지 않습니다
- 원자료에 없는 수치는 만들지 않습니다
- **대외비 금지** — 매체 마크업률, 솔루션 단가, 견적 금액, 광고주 실지출·실매출
- 기여 범위를 부풀리지 않습니다 — 광고 영상은 "기획 참여 · 디자인팀 협업 제작"
- 저장소는 public 입니다. `robots.txt` 는 noindex 지만 URL 을 아는 사람은 볼 수 있습니다
