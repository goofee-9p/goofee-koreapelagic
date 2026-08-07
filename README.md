# 포트폴리오 — 구병기 · 퍼포먼스 마케터

(주)코리아펠라직 / 가시제거연구소 지원용 포트폴리오 웹사이트.

> 이엠넷 클라이언트 제안서·운영안 **원본은 이 저장소에 없습니다.**
> 대외비이며, 필요한 부분만 발췌·마스킹해 반영했습니다.

---

## 산출물

| 파일 | 설명 |
|---|---|
| [`index.html`](index.html) | **포트폴리오 웹사이트** — 원본이자 배포본 |
| [`포트폴리오_구병기_코리아펠라직.pdf`](포트폴리오_구병기_코리아펠라직.pdf) | 웹에서 파생한 PDF · 25장 · 1440×1020 |
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
