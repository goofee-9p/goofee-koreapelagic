/* 편집 모드 — edit_server.py 가 ?edit 요청에만 끼워 넣는다.
   배포본(깃허브 페이지)에는 이 파일이 존재하지 않는다. */
(function () {
  'use strict';

  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-edit]'));
  if (!targets.length) return;

  /* ── 편집을 방해하는 것들 끄기 ──
     진입 애니메이션이 켜져 있으면 아직 안 나타난 문장을 고칠 수 없고,
     숫자 카운트업은 방금 고친 값을 되돌려 놓는다 */
  document.body.classList.remove('motion');
  document.querySelectorAll('[data-count]').forEach(function (el) {
    el.removeAttribute('data-count');
  });
  document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });

  /* ── 허용 태그만 남기는 정리기 ──
     브라우저 contenteditable 은 style 이 잔뜩 붙은 span 을 만들어 낸다.
     그대로 저장하면 손으로 짠 HTML 이 금세 지저분해진다 */
  var ALLOWED = { BR: [], EM: [], B: [], STRONG: [], I: [], SPAN: ['class'], A: ['href'] };

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function clean(node) {
    var out = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {                       // 텍스트
        out += esc(n.nodeValue.replace(/\u00a0/g, ' '));  // 편집 중 생기는 &nbsp; 를 보통 공백으로
        return;
      }
      if (n.nodeType !== 1) return;                 // 주석 등은 버린다
      var tag = n.tagName;
      var keep = ALLOWED[tag];
      if (!keep) { out += clean(n); return; }       // 모르는 태그는 껍데기만 벗긴다
      if (tag === 'BR') { out += '<br>'; return; }
      var attrs = '';
      keep.forEach(function (name) {
        var v = n.getAttribute(name);
        if (v) attrs += ' ' + name + '="' + v.replace(/"/g, '&quot;') + '"';
      });
      var inner = clean(n);
      if (tag === 'SPAN' && !attrs) { out += inner; return; }  // 의미 없는 span 은 제거
      out += '<' + tag.toLowerCase() + attrs + '>' + inner + '</' + tag.toLowerCase() + '>';
    });
    return out;
  }

  /* ── 상태 ── */
  var original = Object.create(null);
  var dirty = Object.create(null);

  targets.forEach(function (el) {
    var id = el.getAttribute('data-edit');
    original[id] = el.innerHTML;
    /* plaintext-only 는 브라우저가 white-space:pre-wrap 을 걸어 버려
       소스의 줄바꿈과 들여쓰기가 화면에 그대로 드러난다. 평범한 true 를 쓰고
       붙여넣기·엔터는 아래에서 직접 가로챈다 */
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');

    el.addEventListener('input', function () { mark(el); });
    el.addEventListener('blur', function () { mark(el); });

    /* 서식 없이 붙여넣기 — 워드나 웹에서 복사한 스타일이 딸려 들어오지 않게 */
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text.replace(/\r?\n/g, ' '));
    });

    /* Enter 는 줄바꿈(<br>)으로. 새 문단을 만들면 구조가 깨진다 */
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
    });
  });

  function mark(el) {
    var id = el.getAttribute('data-edit');
    var now = clean(el);
    if (now === original[id]) { delete dirty[id]; el.classList.remove('is-dirty'); }
    else { dirty[id] = now; el.classList.add('is-dirty'); }
    render();
  }

  function count() { return Object.keys(dirty).length; }

  /* ── 툴바 ── */
  var css = document.createElement('style');
  css.textContent = [
    '[data-edit]{outline:1px dashed transparent;outline-offset:3px;border-radius:3px;',
    '  transition:outline-color 140ms,background 140ms}',
    '[data-edit]:hover{outline-color:rgba(255,143,28,.55)}',
    '[data-edit]:focus{outline:2px solid #FF8F1C;background:rgba(255,143,28,.07)}',
    '[data-edit].is-dirty{background:rgba(255,143,28,.13);outline-color:#FF8F1C}',
    '#edt{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;',
    '  display:flex;align-items:center;gap:10px;padding:10px 12px 10px 18px;border-radius:999px;',
    '  background:rgba(19,18,17,.95);backdrop-filter:blur(12px);color:#fff;',
    '  box-shadow:0 10px 40px rgba(0,0,0,.42);',
    "  font:600 13px/1 'Pretendard Variable',Pretendard,system-ui,sans-serif}",
    '#edt .st{opacity:.62;font-weight:500;white-space:nowrap}',
    '#edt .st b{color:#FF8F1C;font-weight:800}',
    '#edt button{border:0;border-radius:999px;padding:9px 15px;font:inherit;cursor:pointer;',
    '  background:rgba(255,255,255,.12);color:#fff;white-space:nowrap}',
    '#edt button:hover:not(:disabled){background:rgba(255,255,255,.22)}',
    '#edt button:disabled{opacity:.34;cursor:default}',
    '#edt button.pri{background:#FF8F1C;color:#191919;font-weight:800}',
    '#edt button.pri:hover:not(:disabled){background:#fff}',
    '@media print{#edt{display:none}[data-edit]{outline:none!important;background:none!important}}'
  ].join('');
  document.head.appendChild(css);

  var bar = document.createElement('div');
  bar.id = 'edt';
  bar.innerHTML =
    '<span class="st"></span>' +
    '<button id="edt-reset">되돌리기</button>' +
    '<button id="edt-pdf">PDF 다시 만들기</button>' +
    '<button id="edt-save" class="pri">저장</button>';
  document.body.appendChild(bar);

  var elStatus = bar.querySelector('.st');
  var btnSave = bar.querySelector('#edt-save');
  var btnReset = bar.querySelector('#edt-reset');
  var btnPdf = bar.querySelector('#edt-pdf');
  var busy = false;

  function render(msg) {
    var n = count();
    elStatus.innerHTML = msg || (n ? '고친 곳 <b>' + n + '</b>곳' : '글자를 눌러 바로 고치세요');
    btnSave.disabled = busy || !n;
    btnReset.disabled = busy || !n;
    btnPdf.disabled = busy;
  }
  render();

  /* ── 저장 ── */
  function save() {
    if (!count() || busy) return;
    busy = true; render('저장 중…');
    fetch('/__save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: location.pathname, edits: dirty })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        busy = false;
        if (!res.ok) { render('저장 실패 — ' + res.error); return; }
        Object.keys(dirty).forEach(function (id) { original[id] = dirty[id]; });
        dirty = Object.create(null);
        document.querySelectorAll('.is-dirty').forEach(function (el) { el.classList.remove('is-dirty'); });
        render('저장했습니다 · ' + res.count + '곳 (원본은 ' + res.backup + ' 에 남겨 뒀습니다)');
        setTimeout(function () { render(); }, 4200);
      })
      .catch(function (e) { busy = false; render('저장 실패 — ' + e.message); });
  }

  btnSave.addEventListener('click', save);

  btnReset.addEventListener('click', function () {
    if (!count()) return;
    if (!confirm('고친 내용을 모두 되돌립니다. 저장한 것은 그대로 남습니다.')) return;
    targets.forEach(function (el) {
      var id = el.getAttribute('data-edit');
      if (dirty[id] !== undefined) { el.innerHTML = original[id]; el.classList.remove('is-dirty'); }
    });
    dirty = Object.create(null);
    render();
  });

  btnPdf.addEventListener('click', function () {
    if (busy) return;
    if (count() && !confirm('저장하지 않은 수정이 있습니다. 저장 전 내용으로 PDF를 만들까요?')) return;
    busy = true; render('PDF 만드는 중… 20초쯤 걸립니다');
    var which = /이력서/.test(decodeURIComponent(location.pathname)) ? 'resume' : 'portfolio';
    fetch('/__pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ which: which })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        busy = false;
        render(res.ok ? 'PDF 완료 · ' + res.file + ' (' + res.mb + 'MB)' : 'PDF 실패 — ' + res.error);
        setTimeout(function () { render(); }, 5200);
      })
      .catch(function (e) { busy = false; render('PDF 실패 — ' + e.message); });
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });

  addEventListener('beforeunload', function (e) {
    if (count()) { e.preventDefault(); e.returnValue = ''; }
  });

  console.info('편집 모드 · 대상 ' + targets.length + '곳 · Ctrl+S 로 저장');
})();
