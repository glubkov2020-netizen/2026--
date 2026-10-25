/* ============================================================
   TERMINAL — REPL с 40+ командами
   ============================================================ */
(function(global){
  'use strict';

  var S = window.State;
  var D = window.Data;
  var T = window.Stats;
  var UI = window.UI;
  var Charts = window.Charts;

  var LOG = { info: [], err: [], warn: [] };

  function tlog(level, msg){
    var e = { t: new Date(), level: level, msg: msg };
    if(level === 'ERR') LOG.err.push(e);
    else if(level === 'WARN') LOG.warn.push(e);
    LOG.info.push(e);
    renderTerm();
  }
  function tErr(m){ tlog('ERR', m); console.error(m); }
  function tWarn(m){ tlog('WARN', m); console.warn(m); }
  function tInfo(m){ tlog('INFO', m); }

  function escHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function renderTerm(){
    var panelLog = document.getElementById('panelLog');
    if(!panelLog) return;
    var fmt = function(e){
      var hm = String(e.t.getHours()).padStart(2,'0') + ':' + String(e.t.getMinutes()).padStart(2,'0') + ':' + String(e.t.getSeconds()).padStart(2,'0');
      var cls = e.level === 'ERR' ? 't-err' : e.level === 'WARN' ? 't-warn' : 't-info';
      return '<div class="line"><span class="t-muted">[' + hm + ']</span> <span class="' + cls + '">' + e.level + '</span> ' + escHtml(e.msg) + '</div>';
    };
    panelLog.innerHTML = LOG.info.slice(-500).map(fmt).join('') || '<div class="t-muted">— пусто —</div>';
    document.getElementById('panelErr').innerHTML = LOG.err.slice(-200).map(fmt).join('') || '<div class="t-muted">— пусто —</div>';
    document.getElementById('panelWarn').innerHTML = LOG.warn.slice(-200).map(fmt).join('') || '<div class="t-muted">— пусто —</div>';
    renderDataPanel();
  }

  function renderDataPanel(){
    var p = document.getElementById('panelData');
    if(!p) return;
    var years = D.yearsAll();
    p.innerHTML =
      '<div class="t-muted">state.data: ' + S.data.data.length + ' строк</div>' +
      '<div class="t-muted">selected: ' + Object.keys(S.data.selected).filter(function(k){ return S.data.selected[k]; }).length + ' регионов</div>' +
      '<div class="t-muted">годы: ' + (years.length ? years[0] + '–' + years[years.length - 1] : '—') + '</div>' +
      '<div class="t-muted">theme: ' + S.data.theme + ' · unit: ' + S.data.optUnit + ' · prec: ' + S.data.optPrec + '</div>' +
      '<div class="t-muted">consent: ' + (S.data.consent || '—') + '</div>';
  }

  /* ---------- КОМАНДЫ ---------- */
  var COMMANDS = {
    help: { cat: 'Основные', desc: 'Список всех команд', usage: 'help', run: function(){
      return 'Всего команд: ' + Object.keys(COMMANDS).length + '. Открой вкладку «Команды».';
    }},
    clear: { cat: 'Данные', desc: 'Очистить все данные', usage: 'clear', run: function(){
      S.setData([]); S.setSelected({}); return 'Данные очищены';
    }},
    'load demo': { cat: 'Данные', desc: 'Демо-данные', usage: 'load demo', run: function(){
      if(global.App && global.App.loadDemo) global.App.loadDemo();
      return 'Демо загружено';
    }},
    schema: { cat: 'Данные', desc: 'Схема данных', usage: 'schema', run: function(){
      return 'Схема: [{region, year (1990–2100), value (≥0), status: факт|оценка|прогноз, note}]';
    }},
    count: { cat: 'Данные', desc: 'Число строк', usage: 'count', run: function(){
      return S.data.data.length + ' строк · ' + D.regionsWithData().length + ' регионов · ' + D.yearsAll().length + ' лет';
    }},
    regions: { cat: 'Данные', desc: 'Регионы', usage: 'regions', run: function(){
      return D.regionsWithData().join('\n') || 'Нет данных';
    }},
    years: { cat: 'Данные', desc: 'Годы', usage: 'years', run: function(){
      return D.yearsAll().join(', ') || 'Нет данных';
    }},
    head: { cat: 'Данные', desc: 'Первые N', usage: 'head [N]', run: function(a){
      var n = Number(a[0]) || 10;
      return S.data.data.slice(0, n).map(function(d){ return d.year + ' ' + d.region + ': ' + d.value; }).join('\n') || 'Пусто';
    }},
    tail: { cat: 'Данные', desc: 'Последние N', usage: 'tail [N]', run: function(a){
      var n = Number(a[0]) || 10;
      return S.data.data.slice(-n).map(function(d){ return d.year + ' ' + d.region + ': ' + d.value; }).join('\n') || 'Пусто';
    }},
    sample: { cat: 'Данные', desc: 'Случайные N', usage: 'sample [N]', run: function(a){
      var n = Number(a[0]) || 10;
      var c = S.data.data.slice();
      c.sort(function(){ return Math.random() - 0.5; });
      return c.slice(0, n).map(function(d){ return d.year + ' ' + d.region + ': ' + d.value; }).join('\n') || 'Пусто';
    }},
    cat: { cat: 'Данные', desc: 'Все данные', usage: 'cat', run: function(){
      return S.data.data.map(function(d){ return d.year + ' ' + d.region + ': ' + d.value; }).join('\n') || 'Пусто';
    }},
    missing: { cat: 'Данные', desc: 'Пропуски', usage: 'missing', run: function(){
      var years = D.yearsAll(), regions = D.regionsWithData();
      var out = [];
      regions.forEach(function(r){
        var s = D.seriesFor(r);
        var set = {};
        s.years.forEach(function(y){ set[y] = 1; });
        var gaps = years.filter(function(y){ return !set[y]; });
        if(gaps.length) out.push(r + ': ' + gaps.join(', '));
      });
      return out.length ? out.join('\n') : 'Пропусков нет';
    }},
    dup: { cat: 'Данные', desc: 'Дубликаты', usage: 'dup', run: function(){
      var m = {}, dups = [];
      S.data.data.forEach(function(d){
        var k = d.region + '|' + d.year;
        if(m[k]) dups.push(d.region + ' ' + d.year);
        m[k] = 1;
      });
      return dups.length ? dups.join('\n') : 'Дубликатов нет';
    }},
    outliers: { cat: 'Анализ', desc: 'Аномалии z > 2', usage: 'outliers', run: function(){
      var out = [];
      D.regionsWithData().forEach(function(reg){
        var s = D.seriesFor(reg);
        if(s.values.length < 2) return;
        var m = T.mean(s.values), sd = T.std(s.values);
        if(!sd) return;
        for(var i=0;i<s.values.length;i++){
          var z = (s.values[i] - m) / sd;
          if(Math.abs(z) > 2) out.push(reg + ' ' + s.years[i] + ': z=' + UI.fmtNum(z, 2));
        }
      });
      return out.length ? out.join('\n') : 'Аномалий нет';
    }},
    top: { cat: 'Анализ', desc: 'Топ-5', usage: 'top', run: function(){
      var yl = D.yearsAll();
      if(!yl.length) return 'Нет данных';
      var lastY = yl[yl.length - 1];
      var arr = D.regionsWithData().map(function(r){
        return { region: r, val: D.valueAt(r, lastY) || 0 };
      }).sort(function(a,b){ return b.val - a.val; }).slice(0, 5);
      return arr.map(function(r){ return r.region + ': ' + UI.fmtNum(r.val, 1); }).join('\n');
    }},
    bottom: { cat: 'Анализ', desc: 'Худшие 5', usage: 'bottom', run: function(){
      var yl = D.yearsAll();
      if(!yl.length) return 'Нет данных';
      var lastY = yl[yl.length - 1];
      var arr = D.regionsWithData().map(function(r){
        return { region: r, val: D.valueAt(r, lastY) || 0 };
      }).sort(function(a,b){ return a.val - b.val; }).slice(0, 5);
      return arr.map(function(r){ return r.region + ': ' + UI.fmtNum(r.val, 1); }).join('\n');
    }},
    stats: { cat: 'Анализ', desc: 'KPI по всем', usage: 'stats', run: function(){
      return D.buildStats().map(function(r){
        return r.region + ': Σ=' + UI.fmtNum(r.sum, 1) + ', ср=' + UI.fmtNum(r.mean, 2) + ', CAGR=' + (r.cagr != null ? UI.fmtNum(r.cagr, 2) + '%' : '—');
      }).join('\n') || 'Нет данных';
    }},
    validate: { cat: 'Анализ', desc: 'Валидация', usage: 'validate', run: function(){
      var r = D.validateRows(S.data.data);
      return 'OK: ' + r.clean.length + ' · ошибок: ' + r.errors.length + ' · предупреждений: ' + r.warnings.length;
    }},
    cagr: { cat: 'Анализ', desc: 'CAGR', usage: 'cagr <регион>', run: function(a){
      if(!a[0]) return 'Укажите регион';
      var s = D.seriesFor(a[0]);
      var c = T.cagrFromSeries(s.years, s.values);
      return c != null ? a[0] + ': ' + UI.fmtNum(c, 2) + '%/год' : 'Нет данных';
    }},
    forecast: { cat: 'Анализ', desc: 'Прогноз', usage: 'forecast <регион> [лет]', run: function(a){
      if(!a[0]) return 'Укажите регион';
      var s = D.seriesFor(a[0]);
      if(!s.values.length) return 'Нет данных';
      var h = Number(a[1]) || 3;
      var best = global.App && global.App.pickBestModel ? global.App.pickBestModel(s.values) : null;
      if(!best) return 'Мало данных';
      var out = 'Прогноз ' + a[0] + ' (' + best.name + '):\n';
      for(var k=1; k<=h; k++) out += 'Y+' + k + ': ' + UI.fmtNum(best.predict(s.values.length - 1 + k), 2) + '\n';
      return out;
    }},
    corr: { cat: 'Анализ', desc: 'Корреляция', usage: 'corr <r1> <r2>', run: function(a){
      if(!a[0] || !a[1]) return 'Укажите два региона';
      var years = D.yearsAll().filter(function(y){
        return D.valueAt(a[0], y) != null && D.valueAt(a[1], y) != null;
      });
      if(years.length < 2) return 'Мало общих лет';
      var r = T.pearson(
        years.map(function(y){ return D.valueAt(a[0], y); }),
        years.map(function(y){ return D.valueAt(a[1], y); })
      );
      return 'r(' + a[0] + ', ' + a[1] + ') = ' + (r != null ? UI.fmtNum(r, 3) : '—');
    }},
    gini: { cat: 'Анализ', desc: 'Джини', usage: 'gini', run: function(){
      var yl = D.yearsAll();
      if(!yl.length) return 'Нет данных';
      var lastY = yl[yl.length - 1];
      var vals = S.REGIONS.filter(function(r){ return S.data.selected[r]; })
        .map(function(r){ return D.valueAt(r, lastY); })
        .filter(function(v){ return v != null; });
      var g = T.gini(vals);
      return 'Джини (' + lastY + '): ' + (g != null ? UI.fmtNum(g, 3) : '—');
    }},
    hhi: { cat: 'Анализ', desc: 'HHI', usage: 'hhi [год]', run: function(a){
      var yl = D.yearsAll();
      if(!yl.length) return 'Нет данных';
      var y = Number(a[0]) || yl[yl.length - 1];
      var vals = S.REGIONS.filter(function(r){ return S.data.selected[r]; })
        .map(function(r){ return D.valueAt(r, y); })
        .filter(function(v){ return v != null; });
      var tt = T.sum(vals);
      if(!tt) return 'Нет данных';
      var h = 0;
      vals.forEach(function(v){ var s = v / tt * 100; h += s * s; });
      return 'HHI (' + y + '): ' + UI.fmtNum(h, 0);
    }},
    mk: { cat: 'Анализ', desc: 'Манн-Кендалл', usage: 'mk <регион>', run: function(a){
      if(!a[0]) return 'Укажите регион';
      var s = D.seriesFor(a[0]);
      var mk = T.mannKendall(s.values);
      if(mk.Z == null) return 'Мало данных';
      var trend = mk.Z > 1.96 ? 'рост' : (mk.Z < -1.96 ? 'падение' : 'нет');
      return 'S=' + mk.S + '; Z=' + UI.fmtNum(mk.Z, 2) + '; p=' + UI.fmtNum(mk.p, 4) + '; тренд: ' + trend;
    }},
    theme: { cat: 'Система', desc: 'Тема', usage: 'theme dark|light', run: function(a){
      var t = a[0] || 'dark';
      S.setTheme(t);
      return 'Тема: ' + t;
    }},
    select: { cat: 'Система', desc: 'Выбор регионов', usage: 'select all|clear|only-with-data', run: function(a){
      var m = a[0] || 'all';
      var sel = {};
      if(m === 'all') S.REGIONS.forEach(function(r){ sel[r] = true; });
      else if(m === 'clear') sel = {};
      else if(m === 'only-with-data'){
        var withData = D.regionsWithData();
        withData.forEach(function(r){ sel[r] = true; });
      }
      S.setSelected(sel);
      return 'Выбрано: ' + Object.keys(sel).length;
    }},
    open: { cat: 'Система', desc: 'Перейти на страницу', usage: 'open <page>', run: function(a){
      if(!a[0]) return 'Укажите страницу';
      window.Router.go(a[0]);
      return 'Открыто: ' + a[0];
    }},
    docs: { cat: 'Система', desc: 'Документация', usage: 'docs', run: function(){
      window.open('docs.html', '_blank', 'noopener');
      return 'Открыто: docs.html';
    }},
    sources: { cat: 'Система', desc: 'Источники', usage: 'sources', run: function(){
      window.open('docs.html#sources', '_blank', 'noopener');
      return 'Открыто: docs.html#sources';
    }},
    methodology: { cat: 'Система', desc: 'Методика', usage: 'methodology', run: function(){
      window.open('docs.html#methodology', '_blank', 'noopener');
      return 'Открыто: docs.html#methodology';
    }},
    about: { cat: 'Система', desc: 'О программе', usage: 'about', run: function(){
      return 'Выработка ЭЭ по регионам РФ · v6.0 · MIT License · 2026';
    }},
    export: { cat: 'Экспорт', desc: 'Экспорт', usage: 'export <fmt>', run: function(a){
      if(!a[0]) return 'Форматы: png, jpeg, svg, pdf, html, csv, xlsx, json, docx, md, zip';
      if(global.Exporter) global.Exporter.exportData(a[0]);
      return 'Экспорт ' + a[0].toUpperCase() + ' запущен';
    }},
    save: { cat: 'Экспорт', desc: 'Скачать проект', usage: 'save', run: function(){
      if(global.App && global.App.saveProject) global.App.saveProject();
      return 'Проект скачан';
    }},
    undo: { cat: 'Система', desc: 'Отменить', usage: 'undo', run: function(){
      if(global.App && global.App.undo) global.App.undo();
      return 'Отменено';
    }},
    redo: { cat: 'Система', desc: 'Повторить', usage: 'redo', run: function(){
      if(global.App && global.App.redo) global.App.redo();
      return 'Повторено';
    }},
    'check libs': { cat: 'Система', desc: 'Библиотеки', usage: 'check libs', run: function(){
      var libs = window.App && window.App.libsState ? window.App.libsState() : {};
      return Object.keys(libs).map(function(k){ return k + ': ' + (libs[k] ? '✓' : '✗'); }).join('; ');
    }},
    reload: { cat: 'Система', desc: 'Перезагрузить', usage: 'reload', run: function(){
      location.reload();
      return '';
    }}
  };

  function runCommand(line){
    var parts = line.trim().split(/\s+/);
    var cmd = parts[0];
    var args = parts.slice(1);
    if(!cmd) return;

    var multi = ['load demo', 'check libs'];
    for(var i=0; i<multi.length; i++){
      if(line.indexOf(multi[i]) === 0){
        tlog('CMD', '$ ' + line);
        try{
          var out = COMMANDS[multi[i]].run(args);
          if(out) tlog('OK', out);
        }catch(e){ tErr('Команда: ' + e.message); }
        return;
      }
    }

    if(COMMANDS[cmd]){
      tlog('CMD', '$ ' + line);
      try{
        var out2 = COMMANDS[cmd].run(args);
        if(out2) tlog('OK', out2);
      }catch(e){ tErr('Команда: ' + e.message); }
    } else {
      tlog('CMD', '$ ' + line);
      tErr('Неизвестная: ' + cmd + '. Вкладка «Команды» — список.');
    }
  }

  function renderCommandCatalog(){
    var panel = document.getElementById('panelCmd');
    if(!panel) return;
    var groups = {};
    Object.keys(COMMANDS).forEach(function(k){
      var c = COMMANDS[k];
      var cat = c.cat || 'Прочее';
      (groups[cat] = groups[cat] || []).push({ name: k, cmd: c });
    });
    var order = ['Данные', 'Анализ', 'Экспорт', 'Система', 'Основные', 'Прочее'];
    var html = '<div class="t-muted" style="margin-bottom:10px">Всего команд: <b>' + Object.keys(COMMANDS).length + '</b>. Клик — вставить.</div>';
    order.forEach(function(cat){
      if(!groups[cat]) return;
      html += '<div class="cmd-cat">' + escHtml(cat) + '</div><div class="cmd-grid">';
      groups[cat].forEach(function(item){
        html += '<div class="cmd-item" data-cmd="' + escHtml(item.name) + '">' +
          '<div class="cmd-name">' + escHtml(item.name) + '</div>' +
          '<div class="cmd-desc">' + escHtml(item.cmd.desc) + '</div>' +
          '<div class="cmd-usage">' + escHtml(item.cmd.usage || item.name) + '</div>' +
        '</div>';
      });
      html += '</div>';
    });
    panel.innerHTML = html;
    panel.querySelectorAll('.cmd-item').forEach(function(el){
      el.addEventListener('click', function(){
        var cmd = el.getAttribute('data-cmd');
        var input = document.getElementById('termInput');
        input.value = cmd;
        input.focus();
      });
    });
  }

  function renderHelpPanel(){
    var panel = document.getElementById('panelHelp');
    if(!panel) return;
    panel.innerHTML =
      '<div class="t-muted" style="margin-bottom:10px"><b>Шпаргалка</b></div>' +
      '<div class="line"><span class="t-ok">~</span> — терминал</div>' +
      '<div class="line"><span class="t-ok">Ctrl+K</span> — палитра</div>' +
      '<div class="line"><span class="t-ok">Ctrl+Z / Ctrl+Y</span> — undo / redo</div>' +
      '<div class="line"><span class="t-ok">↑ / ↓</span> — история</div>' +
      '<div class="line"><span class="t-ok">Tab</span> — автодополнение</div>' +
      '<div class="line"><span class="t-ok">Esc</span> — закрыть</div>' +
      '<div style="margin-top:12px" class="t-muted">Документация:</div>' +
      '<div class="line"><span class="t-cmd">docs</span> — docs.html</div>' +
      '<div class="line"><span class="t-cmd">sources</span> — docs.html#sources</div>' +
      '<div class="line"><span class="t-cmd">methodology</span> — docs.html#methodology</div>';
  }

  function toggle(){
    var term = document.getElementById('terminal');
    if(!term) return;
    if(term.hidden){ term.hidden = false; term.classList.add('open'); }
    else { term.hidden = true; term.classList.remove('open'); }
  }

  function setup(){
    var toggleBtn = document.getElementById('termToggle');
    var closeBtn = document.getElementById('termClose');
    if(toggleBtn) toggleBtn.addEventListener('click', toggle);
    if(closeBtn) closeBtn.addEventListener('click', toggle);

    document.querySelectorAll('.term-tabs button[data-tab]').forEach(function(b){
      b.addEventListener('click', function(){
        var tab = b.getAttribute('data-tab');
        document.querySelectorAll('.term-tabs button[data-tab]').forEach(function(x){ x.classList.toggle('active', x === b); });
        document.querySelectorAll('.term-tab-panel').forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-panel') === tab); });
        if(tab === 'cmd') renderCommandCatalog();
        if(tab === 'help') renderHelpPanel();
      });
    });

    document.querySelectorAll('.term-quick button').forEach(function(b){
      b.addEventListener('click', function(){ runCommand(b.getAttribute('data-cmd')); });
    });

    var input = document.getElementById('termInput');
    var hist = [], hIdx = -1;
    if(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          var v = input.value.trim();
          if(v){ hist.push(v); hIdx = hist.length; runCommand(v); }
          input.value = '';
        } else if(e.key === 'ArrowUp'){
          if(hIdx > 0){ hIdx--; input.value = hist[hIdx] || ''; }
          e.preventDefault();
        } else if(e.key === 'ArrowDown'){
          if(hIdx < hist.length - 1){ hIdx++; input.value = hist[hIdx] || ''; }
          else { hIdx = hist.length; input.value = ''; }
          e.preventDefault();
        } else if(e.key === 'Tab'){
          e.preventDefault();
          var v = input.value;
          if(!v) return;
          var prefix = v.split(/\s+/)[0];
          var keys = Object.keys(COMMANDS);
          var match = keys.filter(function(k){ return k.indexOf(prefix) === 0; })[0];
          if(match) input.value = match + v.slice(prefix.length);
        }
      });
    }

    renderCommandCatalog();
    renderHelpPanel();
  }

  global.Terminal = {
    setup: setup,
    runCommand: runCommand,
    info: tInfo,
    warn: tWarn,
    err: tErr,
    toggle: toggle
  };
})(window);