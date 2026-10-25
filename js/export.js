/* ============================================================
   EXPORT — 12 форматов
   (Логика из v5.1, адаптирована под модули)
   ============================================================ */
(function(global){
  'use strict';

  var S = window.State;
  var D = window.Data;
  var UI = window.UI;

  function libsReady(){
    return {
      Plotly: typeof window.Plotly !== 'undefined',
      XLSX: typeof window.XLSX !== 'undefined',
      docx: typeof window.docx !== 'undefined',
      JSZip: typeof window.JSZip !== 'undefined',
      html2canvas: typeof window.html2canvas !== 'undefined'
    };
  }

  function downloadBlob(blob, filename){
    try{
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 200);
      UI.toast('Скачано: ' + filename, 'ok');
    }catch(e){
      UI.toast('Ошибка скачивания: ' + e.message, 'err');
      throw e;
    }
  }

  function fileBase(){
    var d = new Date();
    var p = function(n){ return String(n).padStart(2, '0'); };
    return 'Выработка_ЭЭ_' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function exportData(fmt){
    if(!S.data.data.length) throw new Error('Нет данных.');
    var cnt = 0;
    for(var r in S.data.selected) if(S.data.selected[r]) cnt++;
    if(!cnt) throw new Error('Выберите хотя бы один регион.');

    if(fmt === 'csv') return exportCsv();
    if(fmt === 'json') return exportJson();
    if(fmt === 'md') return exportMd();
    if(fmt === 'xlsx') return exportXlsx();
    if(fmt === 'zip') return exportZip();
    if(fmt === 'html') return exportHtml();
    if(fmt === 'pdf') return exportPdf();
    if(fmt === 'docx') return exportDocx();
    if(fmt === 'png' || fmt === 'jpeg' || fmt === 'webp') return exportRaster(fmt);
    if(fmt === 'svg') return exportSvg();
    throw new Error('Неизвестный формат: ' + fmt);
  }

  function exportCsv(){
    var rows = [['Регион', 'Год', 'Значение', 'Статус', 'Примечание']];
    S.data.data.slice().sort(function(a,b){
      var c = a.region.localeCompare(b.region, 'ru');
      return c !== 0 ? c : a.year - b.year;
    }).forEach(function(d){
      rows.push([d.region, d.year, String(d.value).replace('.', ','), d.status || 'факт', d.note || '']);
    });
    var csv = '\uFEFF' + rows.map(function(r){ return r.join(';'); }).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileBase() + '.csv');
  }

  function exportJson(){
    var payload = {
      data: S.data.data,
      selected: S.data.selected,
      stats: D.buildStats(),
      years: D.yearsAll()
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), fileBase() + '.json');
  }

  function exportMd(){
    var stats = D.buildStats();
    var md = '# Выработка\n\n## Сводная\n\n| Регион | N | Σ | Ср. | CV% | CAGR% |\n|---|---:|---:|---:|---:|---:|\n';
    stats.forEach(function(r){
      md += '| ' + r.region + ' | ' + r.n + ' | ' + UI.fmtNum(r.sum, 1) + ' | ' + UI.fmtNum(r.mean, 2) + ' | ' +
        (r.cv != null ? UI.fmtNum(r.cv, 2) : '—') + ' | ' + (r.cagr != null ? UI.fmtNum(r.cagr, 2) : '—') + ' |\n';
    });
    downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), fileBase() + '.md');
  }

  function exportXlsx(){
    if(typeof window.XLSX === 'undefined') throw new Error('SheetJS не загружен');
    var wb = window.XLSX.utils.book_new();
    var r1 = [['Регион', 'Год', 'Значение', 'Статус', 'Примечание']];
    S.data.data.forEach(function(d){ r1.push([d.region, d.year, d.value, d.status || 'факт', d.note || '']); });
    var ws1 = window.XLSX.utils.aoa_to_sheet(r1);
    ws1['!cols'] = [{ wch: 34 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 30 }];
    window.XLSX.utils.book_append_sheet(wb, ws1, 'Данные');

    var st = D.buildStats();
    var r2 = [['Регион', 'N', 'Σ', 'Ср.', 'Мед.', 'σ', 'CV%', 'Min', 'Max', 'CAGR%', 'Наклон', 'R²', 'Доля%']];
    st.forEach(function(r){ r2.push([r.region, r.n, r.sum, r.mean, r.median, r.std, r.cv, r.min, r.max, r.cagr, r.slope, r.r2, r.share]); });
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(r2), 'Сводная');
    window.XLSX.writeFile(wb, fileBase() + '.xlsx');
    UI.toast('XLSX скачан', 'ok');
  }

  function exportZip(){
    if(typeof window.JSZip === 'undefined') throw new Error('JSZip не загружен');
    var zip = new window.JSZip();
    var sel = S.REGIONS.filter(function(r){ return S.data.selected[r]; });
    sel.forEach(function(reg){
      var s = D.seriesFor(reg);
      if(!s.values.length) return;
      var lines = [['Год', 'Значение', 'Статус', 'Примечание']];
      s.rows.forEach(function(row){ lines.push([row.year, row.value, row.status || 'факт', row.note || '']); });
      var csv = '\uFEFF' + lines.map(function(r){ return r.join(';'); }).join('\n');
      var safe = reg.replace(/[\\/:*?"<>|]/g, '_');
      zip.file(safe + '.csv', csv);
    });
    return zip.generateAsync({ type: 'blob' }).then(function(blob){
      downloadBlob(blob, fileBase() + '_по_регионам.zip');
    });
  }

  function exportHtml(){
    var stats = D.buildStats();
    var years = D.yearsAll();
    var tot = D.totalsByYearSelected();
    var cap = (document.getElementById('figCaption') && document.getElementById('figCaption').value) || 'Выработка';
    var src = (document.getElementById('figSource') && document.getElementById('figSource').value) || '';
    var org = (document.getElementById('sigOrg') && document.getElementById('sigOrg').value) || '';
    var auth = (document.getElementById('sigAuthor') && document.getElementById('sigAuthor').value) || '';
    var date = (document.getElementById('sigDate') && document.getElementById('sigDate').value) || '';
    var note = (document.getElementById('sigNote') && document.getElementById('sigNote').value) || '';
    var city = (document.getElementById('sigCity') && document.getElementById('sigCity').value) || 'Москва';

    var statsRows = stats.map(function(r){
      return '<tr><td>' + UI.esc(r.region) + '</td><td class="num">' + r.n + '</td>' +
        '<td class="num">' + UI.fmtNum(r.sum, 1) + '</td>' +
        '<td class="num">' + UI.fmtNum(r.mean, 2) + '</td>' +
        '<td class="num">' + UI.fmtNum(r.median, 2) + '</td>' +
        '<td class="num">' + UI.fmtNum(r.std, 2) + '</td>' +
        '<td class="num">' + (r.cv != null ? UI.fmtNum(r.cv, 2) : '—') + '</td>' +
        '<td class="num">' + UI.fmtNum(r.min, 2) + '</td>' +
        '<td class="num">' + UI.fmtNum(r.max, 2) + '</td>' +
        '<td class="num">' + (r.cagr != null ? UI.fmtNum(r.cagr, 2) : '—') + '</td></tr>';
    }).join('');

    var dynRows = years.map(function(y){
      return '<tr><td>' + y + '</td><td class="num">' + (tot[y] != null ? UI.fmtNum(tot[y], 2) : '—') + '</td></tr>';
    }).join('');

    var dataRows = S.data.data.slice().sort(function(a,b){
      var c = a.region.localeCompare(b.region, 'ru');
      return c !== 0 ? c : a.year - b.year;
    }).map(function(d){
      return '<tr><td>' + UI.esc(d.region) + '</td><td class="num">' + d.year + '</td><td class="num">' +
        UI.fmtNum(d.value, 2) + '</td><td>' + UI.esc(d.status || 'факт') + '</td><td>' + UI.esc(d.note || '') + '</td></tr>';
    }).join('');

    var css = '@page{size:A4;margin:20mm 15mm 20mm 25mm}' +
      'body{font-family:"Times New Roman",serif;color:#111;background:#fff;font-size:13pt;line-height:1.5;margin:0}' +
      '.title{text-align:center;margin-top:80mm}' +
      '.title h1{font-size:20pt;margin:0 0 8mm}' +
      '.title .sub{font-size:14pt;color:#333;margin-bottom:60mm}' +
      '.page-break{page-break-after:always}' +
      'h2{font-size:15pt;margin:18px 0 10px;border-bottom:1px solid #999;padding-bottom:4px}' +
      '.tbl{border-collapse:collapse;width:100%;font-family:"Arial",sans-serif;font-size:10pt;margin:10px 0}' +
      '.tbl th,.tbl td{border:1px solid #888;padding:4px 6px;text-align:left}' +
      '.tbl th{background:#eef2f7}' +
      '.num{text-align:right}' +
      '.sig{display:flex;justify-content:space-between;margin-top:30px;font-size:12pt}' +
      '@media print{.noprint{display:none}}';

    var html = '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>' + UI.esc(cap) + '</title><style>' + css + '</style></head><body>' +
      '<div class="noprint" style="position:sticky;top:0;background:#1e40af;color:#fff;padding:10px 14px;text-align:center;font-family:Arial,sans-serif;font-size:13px;z-index:9">' +
        'Нажмите <b>Ctrl+P</b> → «Сохранить как PDF». <button onclick="window.print()" style="margin-left:12px;padding:6px 14px;background:#fff;color:#1e40af;border:none;border-radius:6px;cursor:pointer;font-weight:600">Печать</button>' +
      '</div>' +
      '<div class="title">' + (org ? '<div style="font-size:14pt;text-transform:uppercase;margin-bottom:60mm">' + UI.esc(org) + '</div>' : '') +
        '<h1>' + UI.esc(cap) + '</h1><div class="sub">Аналитический отчёт</div>' +
        '<div style="margin-top:40mm;font-size:13pt">Составил: ' + (auth || '____') + '</div>' +
        '<div style="font-size:13pt">Дата: ' + UI.esc(date) + '</div>' +
        '<div style="margin-top:30mm;font-size:13pt">' + UI.esc(city) + '</div></div>' +
      '<div class="page-break"></div>' +
      '<h2>1. Сводная таблица</h2><table class="tbl"><thead><tr>' +
        '<th>Регион</th><th>N</th><th>Σ</th><th>Ср.</th><th>Мед.</th><th>σ</th><th>CV%</th><th>Min</th><th>Max</th><th>CAGR%</th>' +
      '</tr></thead><tbody>' + statsRows + '</tbody></table>' +
      '<h2>2. Динамика по годам</h2><table class="tbl"><thead><tr><th>Год</th><th>Сумма</th></tr></thead><tbody>' + dynRows + '</tbody></table>' +
      '<h2>3. Приложение — исходные данные</h2><table class="tbl"><thead><tr><th>Регион</th><th>Год</th><th>Значение</th><th>Статус</th><th>Примечание</th></tr></thead><tbody>' + dataRows + '</tbody></table>' +
      (note ? '<p style="font-style:italic">' + UI.esc(note) + '</p>' : '') +
      '<div class="sig"><div>Составил: __________</div><div>Дата: ' + UI.esc(date) + '</div></div>' +
      '</body></html>';

    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), fileBase() + '.html');
  }

  function exportPdf(){
    var stats = D.buildStats();
    var years = D.yearsAll();
    var tot = D.totalsByYearSelected();
    var cap = (document.getElementById('figCaption') && document.getElementById('figCaption').value) || 'Выработка';
    var org = (document.getElementById('sigOrg') && document.getElementById('sigOrg').value) || '';
    var auth = (document.getElementById('sigAuthor') && document.getElementById('sigAuthor').value) || '';
    var date = (document.getElementById('sigDate') && document.getElementById('sigDate').value) || '';
    var city = (document.getElementById('sigCity') && document.getElementById('sigCity').value) || 'Москва';
    var note = (document.getElementById('sigNote') && document.getElementById('sigNote').value) || '';

    var css = '@page{size:A4;margin:20mm 15mm 20mm 25mm}' +
      'body{font-family:"Times New Roman",serif;color:#111;background:#fff;font-size:13pt;line-height:1.5;margin:0}' +
      '.title{text-align:center;margin-top:80mm}' +
      '.title h1{font-size:20pt;margin:0 0 8mm}' +
      '.page-break{page-break-after:always}' +
      'h2{font-size:15pt;margin:18px 0 10px;border-bottom:1px solid #999;padding-bottom:4px}' +
      '.tbl{border-collapse:collapse;width:100%;font-family:"Arial",sans-serif;font-size:10pt;margin:10px 0}' +
      '.tbl th,.tbl td{border:1px solid #888;padding:4px 6px;text-align:left}' +
      '.tbl th{background:#eef2f7}' +
      '.num{text-align:right}' +
      '@media print{.noprint{display:none}}';

    var statsRows = stats.map(function(r){
      return '<tr><td>' + UI.esc(r.region) + '</td><td class="num">' + r.n + '</td>' +
        '<td class="num">' + UI.fmtNum(r.sum, 1) + '</td><td class="num">' + UI.fmtNum(r.mean, 2) + '</td>' +
        '<td class="num">' + (r.cv != null ? UI.fmtNum(r.cv, 2) : '—') + '</td>' +
        '<td class="num">' + (r.cagr != null ? UI.fmtNum(r.cagr, 2) : '—') + '</td></tr>';
    }).join('');

    var dynRows = years.map(function(y){
      return '<tr><td>' + y + '</td><td class="num">' + (tot[y] != null ? UI.fmtNum(tot[y], 2) : '—') + '</td></tr>';
    }).join('');

    var html = '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>' + UI.esc(cap) + '</title><style>' + css + '</style></head><body>' +
      '<div class="noprint" style="position:sticky;top:0;background:#1e40af;color:#fff;padding:10px 14px;text-align:center;font-family:Arial,sans-serif;font-size:13px">' +
        'Нажмите <b>Ctrl+P</b> → «Сохранить как PDF».' +
      '</div>' +
      '<div class="title">' + (org ? '<div style="font-size:14pt;text-transform:uppercase;margin-bottom:60mm">' + UI.esc(org) + '</div>' : '') +
        '<h1>' + UI.esc(cap) + '</h1><div style="font-size:14pt;color:#333;margin-bottom:60mm">Аналитический отчёт</div>' +
        '<div style="margin-top:40mm;font-size:13pt">Составил: ' + (auth || '____') + '</div>' +
        '<div style="font-size:13pt">Дата: ' + UI.esc(date) + '</div>' +
        '<div style="margin-top:30mm;font-size:13pt">' + UI.esc(city) + '</div></div>' +
      '<div class="page-break"></div>' +
      '<h2>1. Сводная таблица</h2><table class="tbl"><thead><tr><th>Регион</th><th>N</th><th>Σ</th><th>Ср.</th><th>CV%</th><th>CAGR%</th></tr></thead><tbody>' + statsRows + '</tbody></table>' +
      '<h2>2. Динамика по годам</h2><table class="tbl"><thead><tr><th>Год</th><th>Сумма</th></tr></thead><tbody>' + dynRows + '</tbody></table>' +
      (note ? '<p style="font-style:italic">' + UI.esc(note) + '</p>' : '') +
      '</body></html>';

    var w = window.open('', '_blank');
    if(!w){ UI.toast('Разрешите popup', 'err'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = function(){ setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} }, 400); };
  }

  function exportDocx(){
    if(typeof window.docx === 'undefined') throw new Error('docx не загружен');
    var D_ = window.docx;
    var stats = D.buildStats();
    var cap = (document.getElementById('figCaption') && document.getElementById('figCaption').value) || 'Выработка';
    var date = (document.getElementById('sigDate') && document.getElementById('sigDate').value) || '';
    var children = [];
    var org = (document.getElementById('sigOrg') && document.getElementById('sigOrg').value) || '';
    if(org) children.push(new D_.Paragraph({ text: org.toUpperCase(), alignment: D_.AlignmentType.CENTER, spacing: { after: 2400 } }));
    children.push(new D_.Paragraph({ text: cap, heading: D_.HeadingLevel.HEADING_1, alignment: D_.AlignmentType.CENTER }));
    children.push(new D_.Paragraph({ text: 'Аналитический отчёт', alignment: D_.AlignmentType.CENTER, spacing: { after: 2400 } }));
    children.push(new D_.Paragraph({ text: 'Составил: ' + ((document.getElementById('sigAuthor') && document.getElementById('sigAuthor').value) || '____'), alignment: D_.AlignmentType.RIGHT }));
    children.push(new D_.Paragraph({ text: 'Дата: ' + date, alignment: D_.AlignmentType.RIGHT, spacing: { after: 2400 } }));
    children.push(new D_.Paragraph({ children: [new D_.PageBreak()] }));
    children.push(new D_.Paragraph({ text: 'Сводная таблица', heading: D_.HeadingLevel.HEADING_2 }));
    if(stats.length){
      var hdr = ['Регион', 'N', 'Σ', 'Ср.', 'CV%', 'CAGR%'];
      var hr = new D_.TableRow({
        tableHeader: true,
        children: hdr.map(function(t){
          return new D_.TableCell({ shading: { fill: 'EEF2F7' }, children: [new D_.Paragraph({ children: [new D_.TextRun({ text: t, bold: true, size: 16 })] })] });
        })
      });
      var dr = stats.map(function(r){
        var vals = [r.region, r.n, UI.fmtNum(r.sum, 1), UI.fmtNum(r.mean, 2), r.cv != null ? UI.fmtNum(r.cv, 2) : '—', r.cagr != null ? UI.fmtNum(r.cagr, 2) : '—'];
        return new D_.TableRow({ children: vals.map(function(v){
          return new D_.TableCell({ children: [new D_.Paragraph({ children: [new D_.TextRun({ text: String(v), size: 16 })] })] });
        })});
      });
      children.push(new D_.Table({ rows: [hr].concat(dr), width: { size: 100, type: D_.WidthType.PERCENTAGE } }));
    }
    var doc = new D_.Document({ sections: [{ children: children }] });
    return D_.Packer.toBlob(doc).then(function(blob){ downloadBlob(blob, fileBase() + '.docx'); });
  }

  function exportRaster(fmt){
    return new Promise(function(resolve, reject){
      var div = document.getElementById('chart');
      if(!div) return reject(new Error('График не найден'));
      if(typeof window.Plotly === 'undefined') return reject(new Error('Plotly не загружен'));
      var layout = window.Charts.baseLayout();
      layout.paper_bgcolor = '#fff';
      layout.plot_bgcolor = '#fff';
      layout.width = 1600;
      layout.height = 900;
      var newDiv = document.createElement('div');
      newDiv.style.cssText = 'position:fixed;left:-99999px;width:1600px;height:900px;background:#fff';
      document.body.appendChild(newDiv);
      var traces = div.data || [];
      window.Plotly.newPlot(newDiv, JSON.parse(JSON.stringify(traces)), layout, { displayModeBar: false, staticPlot: true }).then(function(){
        return window.Plotly.toImage(newDiv, { format: 'png', width: 1600, height: 900 });
      }).then(function(url){
        return fetch(url).then(function(r){ return r.blob(); });
      }).then(function(blob){
        downloadBlob(blob, fileBase() + '.' + fmt);
        newDiv.remove();
        resolve();
      }).catch(function(e){
        newDiv.remove();
        reject(e);
      });
    });
  }

  function exportSvg(){
    return exportRaster('svg').catch(function(e){
      UI.toast('SVG: ' + e.message, 'err');
    });
  }

  global.Exporter = {
    exportData: exportData,
    libsReady: libsReady
  };
})(window);