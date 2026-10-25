/* ============================================================
   PALETTE — Ctrl+K
   ============================================================ */
(function(global){
  'use strict';

  var S = window.State;

  var ITEMS = [
    { cat: 'Данные', name: 'Загрузить базу (data.js)', action: function(){ window.App && window.App.loadSeed(); } },
    { cat: 'Данные', name: 'Демо-данные', action: function(){ window.App && window.App.loadDemo(); } },
    { cat: 'Данные', name: 'Очистить всё', action: function(){ S.setData([]); S.setSelected({}); } },
    { cat: 'Тема', name: 'Светлая', action: function(){ S.setTheme('light'); } },
    { cat: 'Тема', name: 'Тёмная', action: function(){ S.setTheme('dark'); } },
    { cat: 'Экспорт', name: 'PDF', action: function(){ window.Exporter && window.Exporter.exportData('pdf'); } },
    { cat: 'Экспорт', name: 'DOCX', action: function(){ window.Exporter && window.Exporter.exportData('docx'); } },
    { cat: 'Экспорт', name: 'XLSX', action: function(){ window.Exporter && window.Exporter.exportData('xlsx'); } },
    { cat: 'Экспорт', name: 'ZIP по регионам', action: function(){ window.Exporter && window.Exporter.exportData('zip'); } },
    { cat: 'Терминал', name: 'Открыть терминал', action: function(){ window.Terminal && window.Terminal.toggle(); } },
    { cat: 'Справка', name: 'Документация (docs.html)', action: function(){ window.open('docs.html', '_blank', 'noopener'); } },
    { cat: 'Справка', name: 'Источники (docs.html#sources)', action: function(){ window.open('docs.html#sources', '_blank', 'noopener'); } },
    { cat: 'Справка', name: 'Методика (docs.html#methodology)', action: function(){ window.open('docs.html#methodology', '_blank', 'noopener'); } },
    { cat: 'Справка', name: 'Changelog (docs.html#changelog)', action: function(){ window.open('docs.html#changelog', '_blank', 'noopener'); } },
    { cat: 'Справка', name: 'Лицензия (docs.html#license)', action: function(){ window.open('docs.html#license', '_blank', 'noopener'); } },
    { cat: 'Справка', name: 'Политика (docs.html#privacy)', action: function(){ window.open('docs.html#privacy', '_blank', 'noopener'); } },
    { cat: 'Навигация', name: 'Графики', action: function(){ window.Router.go('view'); } },
    { cat: 'Навигация', name: 'Продвинутая', action: function(){ window.Router.go('advanced'); } },
    { cat: 'Навигация', name: 'Сценарии', action: function(){ window.Router.go('scenario'); } },
    { cat: 'Навигация', name: 'Расчёты', action: function(){ window.Router.go('stats'); } }
  ];

  function escHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function open(){
    document.getElementById('paletteBackdrop').hidden = false;
    document.getElementById('palette').hidden = false;
    var inp = document.getElementById('paletteInput');
    inp.value = '';
    inp.focus();
    render('');
  }
  function close(){
    document.getElementById('paletteBackdrop').hidden = true;
    document.getElementById('palette').hidden = true;
  }
  function render(q){
    q = q.toLowerCase();
    var items = ITEMS.filter(function(it){
      return !q || it.name.toLowerCase().indexOf(q) >= 0 || it.cat.toLowerCase().indexOf(q) >= 0;
    });
    var results = document.getElementById('paletteResults');
    results.innerHTML = items.map(function(it, i){
      return '<div class="item' + (i === 0 ? ' selected' : '') + '" data-idx="' + i + '"><span>' + escHtml(it.name) + '</span><span class="cat">' + escHtml(it.cat) + '</span></div>';
    }).join('') || '<div class="item">Ничего не найдено</div>';
    results.querySelectorAll('.item').forEach(function(el){
      el.addEventListener('click', function(){
        var idx = +el.getAttribute('data-idx');
        if(items[idx]){ try{ items[idx].action(); }catch(e){ console.error(e); } }
        close();
      });
    });
  }

  function setup(){
    document.getElementById('paletteBackdrop').addEventListener('click', close);
    document.getElementById('paletteInput').addEventListener('input', function(e){ render(e.target.value); });
    document.getElementById('paletteInput').addEventListener('keydown', function(e){
      if(e.key === 'Escape') close();
      if(e.key === 'Enter'){
        var sel = document.querySelector('#paletteResults .item.selected');
        if(sel) sel.click();
      }
    });
  }

  global.Palette = { open: open, close: close, setup: setup };
})(window);