/* ============================================================
   APP — точка входа, биндинги, undo/redo, seed, demo, splash
   ============================================================ */
(function(global){
  'use strict';

  var S = window.State;
  var D = window.Data;
  var UI = window.UI;
  var T = window.Stats;
  var Charts = window.Charts;

  var undoStack = [], redoStack = [];

  /* ---------- SPLASH ---------- */
  function hideSplash(){
    var s = document.getElementById('splash');
    if(!s) return;
    s.classList.add('hide');
    setTimeout(function(){ if(s && s.parentNode) s.parentNode.removeChild(s); }, 700);
  }

  /* ---------- ТЕМА ---------- */
  function applyTheme(t){
    if(t === 'auto'){
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
    S.setTheme(t);
  }

  /* ---------- РЕГИОНЫ ---------- */
  function renderChips(container){
    if(!container) return;
    container.innerHTML = '';
    S.REGIONS.forEach(function(r){
      var label = document.createElement('label');
      label.className = 'chip' + (S.data.selected[r] ? ' active' : '');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!S.data.selected[r];
      cb.addEventListener('change', function(){
        S.data.selected[r] = cb.checked;
        label.classList.toggle('active', cb.checked);
        renderAllChips();
        refreshAll();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(r));
      container.appendChild(label);
    });
  }
  function renderAllChips(){
    renderChips(document.getElementById('regionChips'));
    renderChips(document.getElementById('regionChips2'));
  }
  function populateSelects(){
    ['detailRegion', 'histRegion', 'passRegion', 'lagA', 'lagB'].forEach(function(id){
      var s = document.getElementById(id);
      if(!s) return;
      var prev = s.value;
      var list = S.REGIONS.filter(function(r){ return S.data.selected[r]; });
      if(!list.length) list = D.regionsWithData();
      s.innerHTML = list.map(function(r){ return '<option>' + UI.esc(r) + '</option>'; }).join('');
      if(list.indexOf(prev) >= 0) s.value = prev;
    });
  }

  /* ---------- KPI ---------- */
  function renderKpis(){
    var box = document.getElementById('kpis');
    if(!box) return;
    var data = S.data.data;
    if(!data.length){
      box.innerHTML =
        '<div class="kpi"><div class="label">Строк</div><div class="val">0</div><div class="delta">добавьте данные</div></div>' +
        '<div class="kpi"><div class="label">Регионов</div><div class="val">0</div></div>' +
        '<div class="kpi"><div class="label">Годы</div><div class="val">—</div></div>' +
        '<div class="kpi"><div class="label">Сумма</div><div class="val">—</div></div>';
      return;
    }
    var years = D.yearsAll();
    var tot = D.totalsByYearSelected();
    var lastY = years[years.length - 1];
    var prevY = years[years.length - 2];
    var lastV = tot[lastY] != null ? tot[lastY] : null;
    var prevV = prevY !== undefined ? (tot[prevY] != null ? tot[prevY] : null) : null;
    var yoy = (lastV != null && prevV != null && prevV > 0) ? ((lastV - prevV) / prevV * 100) : null;
    var totalSum = 0;
    for(var k in tot) totalSum += tot[k];
    var totVals = years.map(function(y){ return tot[y] || 0; });
    var cagrTotal = T.cagrFromSeries(years, totVals);
    var hhi = null, shares = [];
    var sel = S.REGIONS.filter(function(r){ return S.data.selected[r]; });
    sel.forEach(function(r){
      var v = D.valueAt(r, lastY);
      if(v != null) shares.push(v);
    });
    if(shares.length){
      var tt = T.sum(shares);
      if(tt > 0){
        var h = 0;
        shares.forEach(function(v){ var s = v / tt * 100; h += s * s; });
        hhi = h;
      }
    }
    var hhiInterp = hhi == null ? '—' : (hhi < 1000 ? 'низкая' : hhi < 1800 ? 'умеренная' : hhi < 2500 ? 'высокая' : 'очень высокая');
    var top = null;
    sel.forEach(function(r){
      var v = D.valueAt(r, lastY);
      if(v != null && (!top || v > top.value)) top = { region: r, value: v };
    });
    var yoyCls = yoy == null ? '' : (yoy > 0 ? 'up' : (yoy < 0 ? 'down' : ''));

    box.innerHTML =
      '<div class="kpi"><div class="label">Строк</div><div class="val">' + data.length + '</div><div class="delta">' + D.regionsWithData().length + ' регионов</div></div>' +
      '<div class="kpi"><div class="label">Годы</div><div class="val">' + years[0] + '–' + lastY + '</div><div class="delta">' + years.length + ' лет</div></div>' +
      '<div class="kpi"><div class="label">Сумма</div><div class="val">' + UI.fmtNum(totalSum, 1) + '<small>млрд кВт·ч</small></div><div class="delta">' + sel.length + ' регионов</div></div>' +
      '<div class="kpi"><div class="label">' + lastY + '</div><div class="val">' + (lastV != null ? UI.fmtNum(lastV, 1) : '—') + '</div><div class="delta ' + yoyCls + '">' + (yoy != null ? UI.fmtNum(yoy, 2) + '%' : '—') + '</div></div>' +
      '<div class="kpi"><div class="label">CAGR</div><div class="val">' + (cagrTotal != null ? UI.fmtNum(cagrTotal, 2) : '—') + '<small>%</small></div><div class="delta">за период</div></div>' +
      '<div class="kpi"><div class="label">HHI</div><div class="val">' + (hhi != null ? UI.fmtNum(hhi, 0) : '—') + '</div><div class="delta">' + hhiInterp + '</div></div>' +
      '<div class="kpi"><div class="label">Лидер</div><div class="val" style="font-size:12px">' + (top ? UI.esc(top.region) : '—') + '</div><div class="delta">' + (top ? UI.fmtNum(top.value, 1) : '—') + '</div></div>';
  }

  /* ---------- ТАБЛИЦА ВВОДА ---------- */
  function renderDataTable(){
    var tbody = document.querySelector('#dataTable tbody');
    if(!tbody) return;
    if(!S.data.data.length){
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Нет данных.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    S.data.data.forEach(function(row, idx){
      var tr = document.createElement('tr');
      var optHtml = S.REGIONS.map(function(r){
        return '<option' + (r === row.region ? ' selected' : '') + '>' + UI.esc(r) + '</option>';
      }).join('');
      var statusOpt = S.STATUSES.map(function(s){
        return '<option' + (s === row.status ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      tr.innerHTML =
        '<td><select data-idx="' + idx + '" data-field="region">' + optHtml + '</select></td>' +
        '<td><input type="number" data-idx="' + idx + '" data-field="year" value="' + row.year + '" step="1" min="1990" max="2100"></td>' +
        '<td><input type="number" data-idx="' + idx + '" data-field="value" value="' + row.value + '" step="0.01" min="0"></td>' +
        '<td><select data-idx="' + idx + '" data-field="status">' + statusOpt + '</select></td>' +
        '<td><input type="text" data-idx="' + idx + '" data-field="note" value="' + UI.esc(row.note || '') + '" style="min-width:110px"></td>' +
        '<td><button type="button" class="icon-btn" data-del="' + idx + '">✕</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('input, select').forEach(function(el){
      el.addEventListener('change', function(ev){
        pushHistory(currentSnapshot());
        var i = +ev.target.getAttribute('data-idx');
        var f = ev.target.getAttribute('data-field');
        if(f === 'year') S.data.data[i].year = Number(ev.target.value);
        if(f === 'value') S.data.data[i].value = Number(ev.target.value);
        if(f === 'region') S.data.data[i].region = ev.target.value;
        if(f === 'status') S.data.data[i].status = ev.target.value;
        if(f === 'note') S.data.data[i].note = ev.target.value;
        refreshAll();
      });
    });
    tbody.querySelectorAll('[data-del]').forEach(function(b){
      b.addEventListener('click', function(){
        pushHistory(currentSnapshot());
        S.data.data.splice(+b.getAttribute('data-del'), 1);
        refreshAll();
      });
    });
  }

  /* ---------- ПРИЛОЖЕНИЕ ---------- */
  function renderAppendTable(){
    var tbody = document.querySelector('#appendTable tbody');
    if(!tbody) return;
    if(!S.data.data.length){
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Пусто</td></tr>';
      return;
    }
    var sorted = S.data.data.slice().sort(function(a,b){
      var c = a.region.localeCompare(b.region, 'ru');
      return c !== 0 ? c : a.year - b.year;
    });
    tbody.innerHTML = sorted.map(function(d){
      return '<tr><td>' + UI.esc(d.region) + '</td><td>' + d.year + '</td><td class="num">' +
        UI.fmtNum(d.value, 2) + '</td><td>' + UI.esc(d.status || 'факт') + '</td><td class="wrap">' + UI.esc(d.note || '') + '</td></tr>';
    }).join('');
  }

  /* ---------- UNDO / REDO ---------- */
  function currentSnapshot(){
    return { data: S.data.data, selected: S.data.selected, theme: S.data.theme };
  }
  function pushHistory(snapshot){
    undoStack.push(JSON.stringify(snapshot));
    if(undoStack.length > 50) undoStack.shift();
    redoStack = [];
    updateHistoryUI();
  }
  function undo(){
    if(!undoStack.length) return;
    redoStack.push(JSON.stringify(currentSnapshot()));
    var s = JSON.parse(undoStack.pop());
    S.setData(s.data);
    S.setSelected(s.selected);
    refreshAll();
    updateHistoryUI();
    UI.toast('Отменено');
  }
  function redo(){
    if(!redoStack.length) return;
    undoStack.push(JSON.stringify(currentSnapshot()));
    var s = JSON.parse(redoStack.pop());
    S.setData(s.data);
    S.setSelected(s.selected);
    refreshAll();
    updateHistoryUI();
    UI.toast('Повторено');
  }
  function updateHistoryUI(){
    var el = document.getElementById('historyInfo');
    if(el) el.textContent = undoStack.length + '/' + (undoStack.length + redoStack.length);
  }

  /* ---------- ДЕМО / SEED ---------- */
  function loadDemo(){
    var demo = [];
    var base = {
      'Кемеровская обл.': [28.1,28.5,29,29.8,30.5,31.2,29.8,30.7,31.5,32.1],
      'Москва': [60.1,62.3,63.5,64.7,66,67.2,65.4,68.1,69.5,70.2],
      'Новосибирская обл.': [17.5,17.8,18.2,18.5,18.9,19.4,18.1,19,19.6,20.1],
      'Красноярский край': [53.5,54,54.5,55.2,56,57.1,55.2,58.3,59.4,60.1],
      'Санкт-Петербург': [33,33.5,34,34.2,34.5,35.1,33.8,34.9,35.6,36.2],
      'Свердловская обл.': [48,48.5,49,49.5,50.2,51,49.6,51.5,52.4,53.1],
      'Тюменская обл.': [14.5,14.8,15,15,15.1,15.6,14.9,15.8,16.2,16.7],
      'Иркутская обл.': [60.5,61.2,62,63,64,65.2,63.1,66,67.1,68],
      'Ханты-Мансийский АО — Югра': [72,73.1,74,75,76,77.1,74.8,78,79.2,80.1],
      'Ямало-Ненецкий АО': [14.2,14.5,14.6,14.7,15,15.3,14.7,15.5,15.9,16.3]
    };
    var years = [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023];
    Object.keys(base).forEach(function(r){
      base[r].forEach(function(v, i){
        demo.push({ region: r, year: years[i], value: v, status: years[i] < 2023 ? 'факт' : 'оценка', note: '' });
      });
    });
    var sel = {};
    Object.keys(base).forEach(function(r){ sel[r] = true; });
    S.setData(demo);
    S.setSelected(sel);
    renderAllChips();
    refreshAll();
    UI.toast('Демо загружено', 'ok');
  }

  function loadSeed(){
    if(typeof window.SEED_DATA === 'undefined'){
      UI.toast('data.js не найден рядом с index.html', 'warn');
      return;
    }
    var seed = window.SEED_DATA;
    if(!Array.isArray(seed) || !seed.length){ UI.toast('data.js пуст', 'err'); return; }
    var res = D.validateRows(seed);
    if(!res.clean.length){ UI.toast('Нет валидных строк', 'err'); return; }
    pushHistory(currentSnapshot());
    S.setData(D.mergeData(S.data.data, res.clean));
    var sel = Object.assign({}, S.data.selected);
    res.clean.forEach(function(r){ sel[r.region] = true; });
    S.setSelected(sel);
    renderAllChips();
    refreshAll();
    UI.toast('Загружено из базы: ' + res.clean.length, 'ok');
  }

  /* ---------- ПРОЕКТ ---------- */
  function saveProject(){
    var p = {
      data: S.data.data, selected: S.data.selected,
      theme: S.data.theme, optUnit: S.data.optUnit,
      optPrec: S.data.optPrec, optSep: S.data.optSep
    };
    var blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project.json';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    UI.toast('Проект скачан', 'ok');
  }

  /* ---------- НАСТРОЙКИ ---------- */
  function applySettings(){
    S.setOption('optUnit', document.getElementById('optUnit').value);
    S.setOption('optPrec', Number(document.getElementById('optPrec').value));
    S.setOption('optSep', document.getElementById('optSep').value);
    var t = document.getElementById('optTheme').value;
    applyTheme(t);
    refreshAll();
    UI.toast('Настройки сохранены', 'ok');
  }
  function loadSettingsToUI(){
    if(document.getElementById('optUnit')) document.getElementById('optUnit').value = S.data.optUnit;
    if(document.getElementById('optPrec')) document.getElementById('optPrec').value = S.data.optPrec;
    if(document.getElementById('optSep')) document.getElementById('optSep').value = S.data.optSep;
    if(document.getElementById('optTheme')) document.getElementById('optTheme').value = S.data.theme;
  }

  /* ---------- CONSENT ---------- */
  function showConsent(){ document.getElementById('consent').hidden = false; }
  function hideConsent(){ document.getElementById('consent').hidden = true; }
  function setConsent(kind){
    S.setConsent(kind);
    try{ localStorage.setItem(S.COOKIE_CONSENT_KEY, kind); }catch(e){}
    hideConsent();
    if(kind === 'all'){
      UI.toast('Согласие принято', 'ok');
    } else {
      UI.toast('Только необходимые', 'ok');
    }
  }
  function loadConsent(){
    try{
      var c = localStorage.getItem(S.COOKIE_CONSENT_KEY);
      if(c === 'all' || c === 'necessary'){ S.setConsent(c); return true; }
    }catch(e){}
    return false;
  }

  /* ---------- AUTOSAVE ---------- */
  function autosave(){
    if(S.data.consent !== 'all') return;
    try{
      localStorage.setItem('energy_platform_state', JSON.stringify({
        data: S.data.data, selected: S.data.selected, theme: S.data.theme,
        optUnit: S.data.optUnit, optPrec: S.data.optPrec, optSep: S.data.optSep
      }));
    }catch(e){}
  }
  function autoload(){
    if(S.data.consent !== 'all') return false;
    try{
      var raw = localStorage.getItem('energy_platform_state');
      if(!raw) return false;
      var s = JSON.parse(raw);
      if(s.data) S.setData(s.data);
      if(s.selected) S.setSelected(s.selected);
      if(s.theme) applyTheme(s.theme);
      if(s.optUnit) S.setOption('optUnit', s.optUnit);
      if(s.optPrec) S.setOption('optPrec', s.optPrec);
      if(s.optSep) S.setOption('optSep', s.optSep);
      return true;
    }catch(e){ return false; }
  }

  /* ---------- DRAWER (моб.) ---------- */
  function openDrawer(){ document.getElementById('drawerBackdrop').hidden = false; }
  function closeDrawer(){ document.getElementById('drawerBackdrop').hidden = true; }

  /* ---------- ОБНОВЛЕНИЕ ВСЕГО ---------- */
  function refreshAll(){
    renderDataTable();
    renderAppendTable();
    renderKpis();
    populateSelects();
    var currentPage = window.Router.current();
    if(currentPage === 'view' && window.Charts.plotlyReady()) window.Charts.renderMainChart();
    updateStatus();
    autosave();
  }
  function updateStatus(){
    var el = document.getElementById('statusText');
    if(!el) return;
    if(!S.data.data.length){ el.textContent = 'Данных нет'; return; }
    var years = D.yearsAll();
    el.textContent = S.data.data.length + ' строк · ' + years[0] + '–' + years[years.length - 1] + ' · ' + D.regionsWithData().length + ' регионов';
  }

  /* ---------- BINDINGS ---------- */
  function bindAll(){
    var $ = function(id){ return document.getElementById(id); };

    /* Тема */
    $('btnThemeLight').addEventListener('click', function(){ applyTheme('light'); });
    $('btnThemeDark').addEventListener('click', function(){ applyTheme('dark'); });
    $('btnUndo').addEventListener('click', undo);
    $('btnRedo').addEventListener('click', redo);

    /* Сайдбар collapse */
    var sideToggle = $('sideToggle');
    if(sideToggle){
      sideToggle.addEventListener('click', function(){
        var app = document.querySelector('.app');
        app.classList.toggle('side-collapsed');
        S.setOption('sideCollapsed', app.classList.contains('side-collapsed'));
      });
    }

    /* Мобильный drawer */
    var moreBtn = $('mobileMoreBtn');
    if(moreBtn) moreBtn.addEventListener('click', openDrawer);
    if($('drawerClose')) $('drawerClose').addEventListener('click', closeDrawer);
    if($('drawerBackdrop')){
      $('drawerBackdrop').addEventListener('click', function(e){
        if(e.target.id === 'drawerBackdrop') closeDrawer();
      });
    }
    if($('drawerThemeLight')) $('drawerThemeLight').addEventListener('click', function(){ applyTheme('light'); });
    if($('drawerThemeDark')) $('drawerThemeDark').addEventListener('click', function(){ applyTheme('dark'); });
    if($('drawerUndo')) $('drawerUndo').addEventListener('click', undo);
    if($('drawerRedo')) $('drawerRedo').addEventListener('click', redo);

    /* Терминал / палитра / tour */
    if($('btnPalette')) $('btnPalette').addEventListener('click', function(){ window.Palette.open(); });
    if($('btnTour')) $('btnTour').addEventListener('click', function(){ UI.toast('Туториал — в следующей итерации', 'warn'); });

    /* Выбор регионов */
    $('btnSelectAll').addEventListener('click', function(){
      var sel = {};
      S.REGIONS.forEach(function(r){ sel[r] = true; });
      S.setSelected(sel);
      renderAllChips(); refreshAll();
    });
    $('btnClearSel').addEventListener('click', function(){
      S.setSelected({});
      renderAllChips(); refreshAll();
    });
    $('btnSelectWithData').addEventListener('click', function(){
      var sel = {};
      D.regionsWithData().forEach(function(r){ sel[r] = true; });
      S.setSelected(sel);
      renderAllChips(); refreshAll();
    });
    $('btnLoadSeed').addEventListener('click', loadSeed);
    $('btnLoadDemo').addEventListener('click', function(){
      pushHistory(currentSnapshot());
      loadDemo();
    });

    /* Ввод */
    $('btnAddRow').addEventListener('click', function(){
      pushHistory(currentSnapshot());
      S.data.data.push({ region: S.REGIONS[0], year: new Date().getFullYear(), value: 0, status: 'факт', note: '' });
      refreshAll();
    });
    $('btnClearData').addEventListener('click', function(){
      if(!confirm('Удалить все данные?')) return;
      pushHistory(currentSnapshot());
      S.setData([]);
      S.setSelected({});
      renderAllChips(); refreshAll();
    });
    $('btnPreviewPaste').addEventListener('click', function(){
      try{
        var parsed = D.parseFlexible($('pasteArea').value);
        var res = D.validateRows(parsed);
        if(!res.clean.length){ UI.toast('Нет валидных строк', 'err'); return; }
        pushHistory(currentSnapshot());
        S.setData(D.mergeData(S.data.data, res.clean));
        var sel = Object.assign({}, S.data.selected);
        res.clean.forEach(function(r){ sel[r.region] = true; });
        S.setSelected(sel);
        renderAllChips(); refreshAll();
        UI.toast('Добавлено: ' + res.clean.length, res.errors.length ? 'warn' : 'ok');
      }catch(e){ UI.toast('Ошибка: ' + e.message, 'err'); }
    });
    $('btnPickFile').addEventListener('click', function(){ $('fileInput').click(); });
    $('fileInput').addEventListener('change', function(e){
      var file = e.target.files[0];
      if(!file) return;
      var handle = function(parsed){
        var res = D.validateRows(parsed);
        if(!res.clean.length){ UI.toast('Нет валидных строк', 'err'); return; }
        pushHistory(currentSnapshot());
        S.setData(D.mergeData(S.data.data, res.clean));
        var sel = Object.assign({}, S.data.selected);
        res.clean.forEach(function(r){ sel[r.region] = true; });
        S.setSelected(sel);
        renderAllChips(); refreshAll();
        UI.toast('Из файла: ' + res.clean.length, 'ok');
      };
      if(/\.(xlsx|xls)$/i.test(file.name)){
        if(typeof window.XLSX === 'undefined'){ UI.toast('XLSX недоступен', 'err'); return; }
        var fr = new FileReader();
        fr.onload = function(ev){
          try{
            var wb = window.XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            var rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            var start = 0;
            if(rows.length && /регион|region/i.test(String(rows[0][0] || ''))) start = 1;
            handle(rows.slice(start).filter(function(r){ return r.length >= 3 && r[0] !== ''; }).map(function(r){
              return {
                region: String(r[0]).trim(),
                year: Number(r[1]),
                value: Number(String(r[2]).replace(',', '.')),
                status: String(r[3] || 'факт'),
                note: String(r[4] || '')
              };
            }));
          }catch(err){ UI.toast('Ошибка XLSX: ' + err.message, 'err'); }
        };
        fr.readAsArrayBuffer(file);
      } else {
        var fr2 = new FileReader();
        fr2.onload = function(ev){
          try{ handle(D.parseFlexible(ev.target.result)); }
          catch(err){ UI.toast('Ошибка: ' + err.message, 'err'); }
        };
        fr2.readAsText(file);
      }
      e.target.value = '';
    });
    $('btnTplCsv').addEventListener('click', function(){
      var rows = [['Регион', 'Год', 'Значение', 'Статус', 'Примечание']];
      S.REGIONS.slice(0, 3).forEach(function(r){ [2021, 2022, 2023].forEach(function(y){ rows.push([r, y, '', 'факт', '']); }); });
      var csv = '\uFEFF' + rows.map(function(r){ return r.join(';'); }).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'шаблон.csv';
      a.click();
    });
    $('btnTplXlsx').addEventListener('click', function(){
      if(typeof window.XLSX === 'undefined'){ UI.toast('SheetJS не загружен', 'err'); return; }
      var rows = [['Регион', 'Год', 'Значение', 'Статус', 'Примечание']];
      S.REGIONS.forEach(function(r){ [2021, 2022, 2023].forEach(function(y){ rows.push([r, y, '', 'факт', '']); }); });
      var ws = window.XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 34 }, { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 30 }];
      var wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Данные');
      window.XLSX.writeFile(wb, 'шаблон.xlsx');
    });

    /* Графики */
    $('btnApplyView').addEventListener('click', function(){
      Charts.renderMainChart();
    });
    $('chartType').addEventListener('change', Charts.renderMainChart);
    $('yScale').addEventListener('change', Charts.renderMainChart);

    /* Экспорт */
    document.querySelectorAll('[data-exp]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var fmt = btn.getAttribute('data-exp');
        btn.classList.add('is-loading');
        try{
          var res = window.Exporter.exportData(fmt);
          if(res && res.then){
            res.then(function(){ btn.classList.remove('is-loading'); })
               .catch(function(e){ UI.toast('Ошибка: ' + e.message, 'err'); btn.classList.remove('is-loading'); });
          } else {
            btn.classList.remove('is-loading');
          }
        }catch(e){
          UI.toast('Ошибка: ' + e.message, 'err');
          btn.classList.remove('is-loading');
        }
      });
    });

    /* Настройки */
    $('btnSaveSettings').addEventListener('click', applySettings);
    $('btnResetSettings').addEventListener('click', function(){
      S.setOption('optUnit', 'bln');
      S.setOption('optPrec', 2);
      S.setOption('optSep', 'ru');
      applyTheme('light');
      loadSettingsToUI();
      refreshAll();
    });
    $('btnOpenConsent').addEventListener('click', showConsent);
    $('consentAccept').addEventListener('click', function(){ setConsent('all'); });
    $('consentNecessary').addEventListener('click', function(){ setConsent('necessary'); });
    $('btnSaveProject').addEventListener('click', saveProject);
    $('btnLoadProject').addEventListener('click', function(){ $('projFile').click(); });
    $('projFile').addEventListener('change', function(e){
      var f = e.target.files[0];
      if(!f) return;
      var fr = new FileReader();
      fr.onload = function(ev){
        try{
          var p = JSON.parse(ev.target.result);
          pushHistory(currentSnapshot());
          if(p.data) S.setData(p.data);
          if(p.selected) S.setSelected(p.selected);
          if(p.theme) applyTheme(p.theme);
          if(p.optUnit) S.setOption('optUnit', p.optUnit);
          if(p.optPrec) S.setOption('optPrec', p.optPrec);
          if(p.optSep) S.setOption('optSep', p.optSep);
          loadSettingsToUI();
          renderAllChips();
          refreshAll();
          UI.toast('Проект загружен', 'ok');
        }catch(err){ UI.toast('Ошибка: ' + err.message, 'err'); }
      };
      fr.readAsText(f);
      e.target.value = '';
    });

    /* Онбординг */
    $('onbSkip').addEventListener('click', function(){
      document.getElementById('onb').hidden = true;
      document.getElementById('onbBackdrop').hidden = true;
    });
    $('onbStart').addEventListener('click', function(){
      document.getElementById('onb').hidden = true;
      document.getElementById('onbBackdrop').hidden = true;
      loadDemo();
    });

    /* Сплэш */
    $('spSkip').addEventListener('click', hideSplash);

    /* Клавиатура */
    document.addEventListener('keydown', function(e){
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); window.Palette.open(); return; }
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b'){
        e.preventDefault();
        var app = document.querySelector('.app');
        app.classList.toggle('side-collapsed');
        return;
      }
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey){
        if(document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
          e.preventDefault(); undo();
        }
      }
      if((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))){
        if(document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
          e.preventDefault(); redo();
        }
      }
      if(e.key === '`' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
        e.preventDefault(); window.Terminal.toggle();
      }
      if(e.key === 'Escape'){
        window.Palette.close();
        closeDrawer();
      }
    });

    /* Роутер — обновление при смене страницы */
    window.Router.onRoute(function(page){
      if(page === 'view' && window.Charts.plotlyReady()) window.Charts.renderMainChart();
    });
  }

  /* ---------- ЛИБЫ ---------- */
  function libsState(){
    return {
      Plotly: typeof window.Plotly !== 'undefined',
      SheetJS: typeof window.XLSX !== 'undefined',
      docx: typeof window.docx !== 'undefined',
      JSZip: typeof window.JSZip !== 'undefined',
      html2canvas: typeof window.html2canvas !== 'undefined'
    };
  }
  function checkLibs(){
    var state = libsState();
    var miss = Object.keys(state).filter(function(k){ return !state[k]; });
    if(miss.length){
      UI.showBanner('Не загружены: <code>' + miss.join('</code>, <code>') + '</code>. Расчёты и CSV/JSON/HTML работают.');
    } else {
      UI.hideBanner();
    }
  }

  /* ---------- START ---------- */
  function start(){
    // Сплэш
    setTimeout(hideSplash, 1200);

    // Тема
    var stored = null;
    try{ stored = JSON.parse(localStorage.getItem('energy_platform_state') || '{}'); }catch(e){}
    if(stored && stored.theme) applyTheme(stored.theme);
    else applyTheme('light');

    // Setup
    UI.setupTooltips();
    window.Terminal.setup();
    window.Palette.setup();
    window.Router.start();
    bindAll();
    loadSettingsToUI();
    renderAllChips();
    populateSelects();
    refreshAll();
    checkLibs();

    // Согласие
    var hasConsent = loadConsent();
    if(hasConsent){
      autoload();
      renderAllChips();
      refreshAll();
    } else {
      setTimeout(showConsent, 1400);
    }

    // Onboarding
    setTimeout(function(){
      if(!localStorage.getItem('energy_onb')){
        document.getElementById('onb').hidden = false;
        document.getElementById('onbBackdrop').hidden = false;
      }
    }, 2200);

    // Приветствие в терминале
    window.Terminal.info('Платформа запущена · v6.0');
    window.Terminal.info('Библиотеки: ' + Object.keys(libsState()).map(function(k){ return k + '=' + (libsState()[k] ? 'OK' : '—'); }).join(' '));
  }

  /* ---------- PUBLIC API ---------- */
  global.App = {
    loadDemo: loadDemo,
    loadSeed: loadSeed,
    undo: undo,
    redo: redo,
    saveProject: saveProject,
    libsState: libsState,
    refreshAll: refreshAll
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);