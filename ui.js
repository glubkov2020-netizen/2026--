/* ============================================================
   UI — компоненты, тосты, модалки, tooltip, esc
   ============================================================ */
(function(global){
  'use strict';

  var _toastSeq = 0;

  /* ---------- ЭКРАНИРОВАНИЕ ---------- */
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  /* ---------- ТОСТ ---------- */
  function toast(text, kind){
    kind = kind || 'ok';
    var t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.setAttribute('role', 'status');
    var icon = kind === 'err' ? '❌' : kind === 'warn' ? '⚠️' : '✅';
    t.innerHTML = '<span>' + icon + '</span><span>' + esc(text) + '</span>' +
      '<button class="toast-close" aria-label="Закрыть">✕</button>';
    t.querySelector('.toast-close').addEventListener('click', function(){ remove(); });
    document.getElementById('toasts').appendChild(t);
    requestAnimationFrame(function(){ t.classList.add('show'); });
    var timer = setTimeout(remove, 3500);
    function remove(){
      clearTimeout(timer);
      t.classList.remove('show');
      setTimeout(function(){ t.remove(); }, 300);
    }
    return { close: remove };
  }

  /* ---------- TOOLTIP ---------- */
  var _tipTarget = null;
  function setupTooltips(){
    var tip = document.getElementById('tooltip');
    if(!tip) return;

    document.body.addEventListener('mouseover', function(e){
      var el = e.target.closest && e.target.closest('[data-tip]');
      if(!el || _tipTarget === el) return;
      _tipTarget = el;
      tip.textContent = el.getAttribute('data-tip');
      tip.hidden = false;
      position(e);
    });
    document.body.addEventListener('mousemove', function(e){
      if(_tipTarget) position(e);
    });
    document.body.addEventListener('mouseout', function(e){
      var el = e.target.closest && e.target.closest('[data-tip]');
      if(el && el === _tipTarget){
        _tipTarget = null;
        tip.hidden = true;
      }
    });
    function position(e){
      var x = e.clientX || 20, y = e.clientY || 20, w = window.innerWidth;
      tip.style.left = Math.min(x + 12, w - 290) + 'px';
      tip.style.top = (y + 16) + 'px';
    }
  }

  /* ---------- МОДАЛКА ---------- */
  function openModal(opts){
    opts = opts || {};
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      '<h2 id="modalTitle" style="margin:0 0 12px;font-size:18px">' + esc(opts.title || 'Диалог') + '</h2>' +
      '<div class="modal-body">' + (opts.html || esc(opts.text || '')) + '</div>' +
      '<div class="row" style="margin-top:16px;justify-content:flex-end">' +
        (opts.cancelText ? '<button class="btn btn-ghost" data-act="cancel" type="button">' + esc(opts.cancelText) + '</button>' : '') +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok" type="button">' + esc(opts.okText || 'OK') + '</button>' +
      '</div></div>';

    var lastFocus = document.activeElement;
    document.body.appendChild(backdrop);
    var modal = backdrop.querySelector('.modal');
    var firstBtn = modal.querySelector('[data-act="ok"]');
    if(firstBtn) firstBtn.focus();

    function close(){ backdrop.remove(); if(lastFocus) lastFocus.focus(); }
    backdrop.addEventListener('click', function(e){
      if(e.target === backdrop){ if(opts.cancelText) opts.onCancel && opts.onCancel(); close(); }
    });
    modal.querySelector('[data-act="cancel"]').addEventListener('click', function(){
      opts.onCancel && opts.onCancel(); close();
    });
    modal.querySelector('[data-act="ok"]').addEventListener('click', function(){
      opts.onOk && opts.onOk(modal); close();
    });
    document.addEventListener('keydown', function onKey(e){
      if(e.key === 'Escape'){ close(); document.removeEventListener('keydown', onKey); }
    });

    return { close: close, modal: modal };
  }

  /* ---------- БАННЕР ---------- */
  function showBanner(text){
    var b = document.getElementById('banner');
    if(!b) return;
    b.innerHTML = text;
    b.hidden = false;
  }
  function hideBanner(){
    var b = document.getElementById('banner');
    if(b) b.hidden = true;
  }

  /* ---------- ФОРМАТ ЧИСЛА ---------- */
  function fmtNum(x, d){
    if(x === null || x === undefined || isNaN(x) || !isFinite(x)) return '—';
    var prec = (typeof d === 'number') ? d : 2;
    var sep = (window.State.data.optSep === 'en') ? 'en-US' : 'ru-RU';
    return Number(x).toLocaleString(sep, { minimumFractionDigits: prec, maximumFractionDigits: prec });
  }

  global.UI = {
    esc: esc,
    toast: toast,
    setupTooltips: setupTooltips,
    openModal: openModal,
    showBanner: showBanner,
    hideBanner: hideBanner,
    fmtNum: fmtNum
  };
})(window);