/* 스크롤 모션 — 화면에서만. 인쇄와 reduced-motion 은 건드리지 않는다.
   .motion 클래스를 body 에 '덧씌우는' 방식이라, 이 스크립트가 안 돌면
   모든 요소가 처음부터 최종 상태로 보인다. (PDF 안전장치) */
(function () {
  'use strict';

  /* ?shot — 개발용 전체 페이지 캡처 모드. 히어로 100svh 를 풀고 모션을 끈다 */
  var shot = /(^|[?&])shot(=|&|$)/.test(location.search);
  if (shot) document.documentElement.setAttribute('data-shot', '');

  var reduced = shot || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var printing = window.matchMedia('print').matches;
  if (!reduced && !printing) document.body.classList.add('motion');

  /* ── 진행 레일 ── */
  var rail = document.getElementById('rail');
  var topbar = document.getElementById('topbar');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (rail) rail.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (topbar) topbar.classList.toggle('is-stuck', y > 40);
    ticking = false;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ── 진입 페이드업 · 막대 성장 · 카운트업 ── */
  /* 막대(.tl-bar) 가 아니라 트랙(.tl-track) 을 관찰한다.
     막대는 시작 상태가 '완전히 잘린' 상태라 면적이 0 이고, 면적 0 인 요소는
     threshold 0.12 를 영원히 넘지 못한다 — 관찰자가 발동하지 않아 막대가 계속 숨어 있었다.
     트랙은 실제 크기를 가지므로 안전하다 */
  var revealTargets = document.querySelectorAll('.rv, .tl-track, [data-count]');

  if (!('IntersectionObserver' in window) || reduced) {
    /* 모션을 안 쓰는 경로에서도 숫자는 최종값으로 채워야 한다 */
    revealTargets.forEach(function (el) {
      el.classList.add('in');
      if (el.hasAttribute('data-count')) countUp(el);
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('in');
        if (el.hasAttribute('data-count')) countUp(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealTargets.forEach(function (el) { io.observe(el); });

    /* 형제 .rv 들에 스태거 — 같은 부모 안에서 60ms 씩 밀린다 */
    document.querySelectorAll('.rv').forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (n) {
        return n.classList && n.classList.contains('rv');
      });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i, 5) * 60 + 'ms';
    });
  }

  /* 숫자 카운트업 — data-count="1234" data-suffix="%" data-decimals="1" */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced) { el.textContent = prefix + fmt(target, dec) + suffix; return; }

    var dur = 900, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmt(target * eased, dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function fmt(n, dec) {
    return n.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  /* ── 영상: 화면 안에서만 재생 ──
     muted + playsinline 이라 자동재생 정책에 걸리지 않는다.
     화면 밖으로 나가면 멈춰서 배터리와 대역폭을 아낀다 */
  var videos = document.querySelectorAll('video');
  var inView = new Set();

  function tryPlay(v) {
    if (document.visibilityState !== 'visible') return;
    var p = v.play();
    if (p) p.catch(function () {}); // 정책·저전력 모드로 거절되면 포스터가 남는다
  }

  if ('IntersectionObserver' in window && videos.length) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { inView.add(v); tryPlay(v); }
        else { inView.delete(v); v.pause(); }
      });
    }, { threshold: 0.25 });

    videos.forEach(function (v) {
      vio.observe(v);
      v.addEventListener('click', function () {
        if (v.paused) tryPlay(v); else v.pause();
      });
      v.style.cursor = 'pointer';
    });

    /* 탭을 떠났다 돌아오면 브라우저가 재생을 멈춰 둔 상태다.
       교차 이벤트는 새로 발생하지 않으므로 화면 안에 있는 영상을 직접 되살린다 */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      inView.forEach(tryPlay);
    });
  }

  /* ── 상단바 현재 섹션 표시 ── */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { sio.observe(s); });
  }

  /* ── 소재 아카이브 — 흐르는 벽 ──
     줄마다 원본 묶음을 화면 폭 이상이 되게 이어 붙이고, 그 절반을 한 번 더 붙여
     -50% 이동을 이음새 없이 반복한다. 라이브러리 없이 Web Animations 로 돌린다 —
     재생 속도를 부드럽게 바꿀 수 있어 '올리면 그 줄만 느려지는' 동작이 된다.
     모션을 끈 사람 · 인쇄 · 스크립트 미실행에서는 멈춘 줄로 남고 손으로 밀어 볼 수 있다 */
  var amRows = document.querySelectorAll('.am-row');
  if (amRows.length && !reduced && !printing && 'animate' in Element.prototype) {
    var amRuns = [];
    amRows.forEach(function (row) {
      var track = row.querySelector('.am-track');
      if (!track) return;
      var n = track.children.length;
      if (!n) return;

      /* 한 묶음 길이 = 트랙 폭. 소재는 정사각형(폭 = 줄 높이), 목차 카드는 폭이 고정이라
         이미지를 기다리지 않아도 정확하다. 오른쪽 패딩이 간격과 같아 묶음을 이어도 틈이 맞는다 */
      var h = row.clientHeight;
      var setW = track.scrollWidth;
      var need = Math.max(window.innerWidth, (window.screen && screen.width) || 0);
      var reps = Math.max(1, Math.ceil(need / setW));

      var unit = track.innerHTML, half = '';
      for (var r = 0; r < reps; r++) half += unit;
      track.innerHTML = half + half;
      /* 복제본은 읽기 도구에 두 번 읽히지 않게 숨긴다 */
      Array.prototype.forEach.call(track.children, function (el, k) {
        if (k < n) return;
        el.setAttribute('aria-hidden', 'true');
        /* 편집 모드 이름표가 두 벌이 되면 어느 쪽을 고쳤는지 헷갈린다 — 복제본에서는 뗀다 */
        el.removeAttribute('data-edit');
        el.querySelectorAll('[data-edit]').forEach(function (d) { d.removeAttribute('data-edit'); });
        el.querySelectorAll('img').forEach(function (img) { img.setAttribute('alt', ''); });
        if (el.tagName === 'IMG') el.setAttribute('alt', '');
      });

      /* 속도는 '초당 몇 장이 지나가나' 로 맞춘다 — 줄 높이가 달라도 같은 빠르기로 읽힌다 */
      var pxPerSec = 48 * (h / 200);
      var dir = parseFloat(row.getAttribute('data-dir')) || 1;
      var anim = track.animate(
        [{ transform: 'translateX(' + (dir > 0 ? 0 : -50) + '%)' },
         { transform: 'translateX(' + (dir > 0 ? -50 : 0) + '%)' }],
        { duration: (reps * setW) / pxPerSec * 1000, iterations: Infinity });
      anim.pause();
      row.classList.add('is-run');

      /* 호버 감속 — 재생 속도를 목표값 쪽으로 조금씩 당긴다 (현재 위치는 유지된다) */
      var rate = 1, target = 1, raf = 0;
      function ease() {
        rate += (target - rate) * 0.12;
        if (Math.abs(target - rate) < 0.01) rate = target;
        anim.playbackRate = rate;
        raf = rate !== target ? requestAnimationFrame(ease) : 0;
      }
      function setRate(v) { target = v; if (!raf) raf = requestAnimationFrame(ease); }
      row.addEventListener('mouseenter', function () { setRate(0.22); });
      row.addEventListener('mouseleave', function () { setRate(1); });

      amRuns.push({ row: row, anim: anim, loaded: false });
    });

    /* 화면 근처에서만 돈다. 가까워지면 그 줄의 소재를 한꺼번에 받아 둔다 —
       잘린 영역(overflow) 밖은 지연 로딩이 끝내 발동하지 않아, 흘러 들어오는 순간 빈 칸이 된다 */
    if ('IntersectionObserver' in window) {
      var amio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          amRuns.forEach(function (it) {
            if (it.row !== e.target) return;
            if (e.isIntersecting) {
              if (!it.loaded) {
                it.row.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });
                it.loaded = true;
              }
              it.anim.play();
            } else {
              it.anim.pause();
            }
          });
        });
      }, { rootMargin: '400px 0px' });
      amRuns.forEach(function (it) { amio.observe(it.row); });
    } else {
      amRuns.forEach(function (it) { it.anim.play(); });
    }
  }
})();
