/* ============================================================
   DATA — парсинг, валидация, merge, работа с рядами
   ============================================================ */
(function(global){
  'use strict';

  var S = window.State;
  var T = window.Stats;

  function yearsAll(){
    var m = {}, res = [];
    for(var i=0;i<S.data.data.length;i++) m[S.data.data[i].year] = 1;
    for(var k in m) res.push(Number(k));
    res.sort(function(a,b){ return a - b; });
    return res;
  }
  function regionsWithData(){
    var m = {}, res = [];
    for(var i=0;i<S.data.data.length;i++){
      var r = S.data.data[i].region;
      if(!m[r]){ m[r] = 1; res.push(r); }
    }
    return res;
  }
  function seriesFor(region){
    var rows = [];
    for(var i=0;i<S.data.data.length;i++) if(S.data.data[i].region === region) rows.push(S.data.data[i]);
    rows.sort(function(a,b){ return a.year - b.year; });
    var ys = [], vs = [], rs = [];
    for(var j=0;j<rows.length;j++){ ys.push(rows[j].year); vs.push(rows[j].value); rs.push(rows[j]); }
    return { years: ys, values: vs, rows: rs };
  }
  function valueAt(region, year){
    for(var i=0;i<S.data.data.length;i++)
      if(S.data.data[i].region === region && S.data.data[i].year === year) return S.data.data[i].value;
    return null;
  }
  function totalsByYearSelected(){
    var map = {};
    for(var i=0;i<S.data.data.length;i++){
      var d = S.data.data[i];
      if(S.data.selected[d.region]) map[d.year] = (map[d.year] || 0) + d.value;
    }
    return map;
  }
  function totalsByYearAll(){
    var map = {};
    for(var i=0;i<S.data.data.length;i++){
      var d = S.data.data[i];
      map[d.year] = (map[d.year] || 0) + d.value;
    }
    return map;
  }
  function normRegion(s){
    var raw = String(s == null ? '' : s).trim();
    if(S.REGIONS.indexOf(raw) >= 0) return raw;
    var k = raw.toLowerCase().replace(/\s+/g, ' ');
    var alias = {
      'кемерово': 'Кемеровская обл.', 'кемеровская область': 'Кемеровская обл.',
      'москва': 'Москва', 'мск': 'Москва',
      'новосибирск': 'Новосибирская обл.', 'новосибирская область': 'Новосибирская обл.',
      'красноярск': 'Красноярский край', 'красноярский край': 'Красноярский край',
      'санкт-петербург': 'Санкт-Петербург', 'спб': 'Санкт-Петербург', 'петербург': 'Санкт-Петербург',
      'свердловская область': 'Свердловская обл.', 'екатеринбург': 'Свердловская обл.',
      'тюмень': 'Тюменская обл.', 'тюменская область': 'Тюменская обл.',
      'иркутск': 'Иркутская обл.', 'иркутская область': 'Иркутская обл.',
      'ханты-мансийский ао': 'Ханты-Мансийский АО — Югра',
      'хмао': 'Ханты-Мансийский АО — Югра', 'югра': 'Ханты-Мансийский АО — Югра',
      'ямало-ненецкий ао': 'Ямало-Ненецкий АО', 'янао': 'Ямало-Ненецкий АО'
    };
    return alias[k] || (raw ? raw : null);
  }
  function ensureRegionInList(region){
    if(S.REGIONS.indexOf(region) < 0) S.REGIONS.push(region);
  }

  function parseFlexible(text){
    text = String(text == null ? '' : text).trim();
    if(!text) throw new Error('Пустая вставка.');
    if(text.charAt(0) === '[' || text.charAt(0) === '{'){
      var j = JSON.parse(text);
      if(!Array.isArray(j)){
        if(Array.isArray(j.data)) j = j.data;
        else throw new Error('Ожидался массив.');
      }
      return j.map(function(o){
        return {
          region: o.region || o['Регион'] || '',
          year: Number(o.year || o['Год']),
          value: Number(o.value || o['Значение']),
          status: o.status || o['Статус'] || 'факт',
          note: o.note || o['Примечание'] || ''
        };
      });
    }
    var lines = text.split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
    if(!lines.length) throw new Error('Нет строк.');
    var first = lines[0];
    var sep = ';';
    if(first.indexOf('\t') >= 0) sep = '\t';
    else if(first.indexOf(';') >= 0) sep = ';';
    else if(first.indexOf(',') >= 0) sep = ',';
    var start = 0;
    if(/регион|region|год|year/i.test(first)) start = 1;
    var out = [];
    for(var i=start;i<lines.length;i++){
      var cells = lines[i].split(sep).map(function(c){ return c.trim().replace(/^"|"$/g, ''); });
      if(cells.length < 3) continue;
      out.push({
        region: cells[0],
        year: Number(cells[1]),
        value: Number(String(cells[2]).replace(',', '.')),
        status: cells[3] || 'факт',
        note: cells[4] || ''
      });
    }
    return out;
  }

  function validateRows(rows){
    var errors = [], warnings = [], clean = [];
    var seen = {};
    var nowYear = new Date().getFullYear();
    for(var i=0;i<rows.length;i++){
      var r = rows[i], line = i + 1;
      if(!r || (!r.region && (r.year == null || isNaN(r.year)) && (r.value == null || isNaN(r.value)))) continue;
      var reg = normRegion(r.region);
      if(!reg){ errors.push('Строка ' + line + ': нет региона'); continue; }
      if(!isFinite(r.year) || r.year < 1990 || r.year > 2100){
        errors.push('Строка ' + line + ': год вне 1990…2100'); continue;
      }
      if(r.year > nowYear + 5 && (!r.status || r.status === 'факт'))
        warnings.push('Строка ' + line + ': будущий год, «факт»');
      if(!isFinite(r.value) || r.value < 0){ errors.push('Строка ' + line + ': значение ≥ 0'); continue; }
      if(r.value > 100000){ errors.push('Строка ' + line + ': значение > 100 000'); continue; }
      var key = reg + '|' + Math.round(r.year);
      if(seen[key]) warnings.push('Строка ' + line + ': дубликат ' + reg + ' / ' + r.year);
      seen[key] = true;
      var status = String(r.status || 'факт').toLowerCase();
      if(S.STATUSES.indexOf(status) < 0) status = 'факт';
      ensureRegionInList(reg);
      clean.push({
        region: reg, year: Math.round(r.year), value: Number(r.value),
        status: status, note: String(r.note || '').trim()
      });
    }
    return { clean: clean, errors: errors, warnings: warnings };
  }

  function mergeData(old, add){
    var map = {};
    old.forEach(function(r){ map[r.region + '|' + r.year] = r; });
    add.forEach(function(r){ map[r.region + '|' + r.year] = r; });
    var res = [];
    for(var k in map) res.push(map[k]);
    res.sort(function(a,b){
      var c = a.region.localeCompare(b.region, 'ru');
      return c !== 0 ? c : a.year - b.year;
    });
    return res;
  }

  function buildStats(){
    var rows = [];
    S.REGIONS.forEach(function(reg){
      if(!S.data.selected[reg]) return;
      var s = seriesFor(reg);
      if(!s.values.length) return;
      var totalAll = totalsByYearAll();
      var ownTotal = 0, allTotal = 0;
      for(var i=0;i<s.years.length;i++){
        var ta = totalAll[s.years[i]];
        if(ta){ ownTotal += s.values[i]; allTotal += ta; }
      }
      var m = T.mean(s.values), sd = T.std(s.values), lr = T.linreg(s.values);
      var ups = 0, totPairs = 0;
      for(var j=1;j<s.values.length;j++){
        if(s.values[j-1] > 0){ totPairs++; if(s.values[j] > s.values[j-1]) ups++; }
      }
      rows.push({
        region: reg, n: s.values.length, sum: T.sum(s.values),
        mean: m, median: T.median(s.values), std: sd,
        cv: (sd != null && m > 0) ? sd / m * 100 : null,
        min: T.minOf(s.values), max: T.maxOf(s.values),
        cagr: T.cagrFromSeries(s.years, s.values),
        slope: lr ? lr.b : null, r2: lr ? lr.r2 : null,
        share: allTotal > 0 ? ownTotal / allTotal * 100 : null,
        upShare: totPairs > 0 ? ups / totPairs * 100 : null
      });
    });
    return rows;
  }

  global.Data = {
    yearsAll: yearsAll,
    regionsWithData: regionsWithData,
    seriesFor: seriesFor,
    valueAt: valueAt,
    totalsByYearSelected: totalsByYearSelected,
    totalsByYearAll: totalsByYearAll,
    normRegion: normRegion,
    ensureRegionInList: ensureRegionInList,
    parseFlexible: parseFlexible,
    validateRows: validateRows,
    mergeData: mergeData,
    buildStats: buildStats
  };
})(window);