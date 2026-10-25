/* ============================================================
   CHARTS — обёртки над Plotly с единой темой
   ============================================================ */
(function(global){
  'use strict';

  var S = window.State;
  var D = window.Data;

  function plotlyReady(){ return typeof window.Plotly !== 'undefined'; }
  function gridColor(){ return S.data.theme === 'dark' ? '#1a2637' : '#e1e7f2'; }
  function paperBg(){ return S.data.theme === 'dark' ? '#0d1726' : '#ffffff'; }
  function plotBg(){ return S.data.theme === 'dark' ? '#0d1726' : '#ffffff'; }
  function fontColor(){ return S.data.theme === 'dark' ? '#e8eef8' : '#0a1628'; }

  var PLOT_CFG = { responsive: true, displayModeBar: false };

  function baseLayout(extra){
    var base = {
      margin: { l: 56, r: 16, t: 20, b: 60 },
      paper_bgcolor: paperBg(),
      plot_bgcolor: plotBg(),
      font: { family: '"Inter", sans-serif', color: fontColor(), size: 11 },
      xaxis: { title: { text: 'Год' }, gridcolor: gridColor(), zeroline: false },
      yaxis: { title: { text: 'млрд кВт·ч' }, gridcolor: gridColor(), zeroline: false },
      legend: { orientation: 'h', y: -0.18, font: { size: 10 } },
      hovermode: 'x unified'
    };
    if(extra) for(var k in extra) base[k] = extra[k];
    return base;
  }

  function renderMainChart(){
    var div = document.getElementById('chart');
    if(!div || !plotlyReady()) return;
    var data = S.data.data;
    if(!data.length){
      Plotly.react(div, [], baseLayout({ title: { text: 'Нет данных' } }), PLOT_CFG);
      return;
    }
    var sel = S.REGIONS.filter(function(r){ return S.data.selected[r]; });
    if(!sel.length){
      Plotly.react(div, [], baseLayout({ title: { text: 'Выберите регионы' } }), PLOT_CFG);
      return;
    }
    var type = document.getElementById('chartType').value;
    var yScale = document.getElementById('yScale').value;
    var yMin = Number(document.getElementById('yearMin').value) || null;
    var yMax = Number(document.getElementById('yearMax').value) || null;
    var years = D.yearsAll().filter(function(y){
      return (yMin == null || y >= yMin) && (yMax == null || y <= yMax);
    });

    if(type === 'stack100'){
      var totals = {};
      years.forEach(function(y){
        var t = 0;
        sel.forEach(function(r){ var v = D.valueAt(r, y); if(v != null) t += v; });
        totals[y] = t;
      });
      var traces = sel.map(function(r, i){
        var ys = years.map(function(y){
          var v = D.valueAt(r, y), t = totals[y];
          return (v != null && t > 0) ? v / t * 100 : null;
        });
        return { name: r, x: years, y: ys, type: 'bar', marker: { color: S.PALETTE[i % S.PALETTE.length] } };
      });
      Plotly.react(div, traces, baseLayout({
        barmode: 'stack',
        yaxis: { title: { text: 'Доля, %' }, gridcolor: gridColor(), ticksuffix: '%', range: [0, 100] }
      }), PLOT_CFG);
      return;
    }

    var traces2 = sel.map(function(r, i){
      var ys = years.map(function(y){ return D.valueAt(r, y); });
      var color = S.PALETTE[i % S.PALETTE.length];
      if(type === 'lines') return { name: r, x: years, y: ys, type: 'scatter', mode: 'lines+markers', line: { width: 2.2, color: color }, marker: { size: 5, color: color } };
      if(type === 'area') return { name: r, x: years, y: ys, type: 'scatter', mode: 'lines+markers', fill: 'tozeroy', line: { width: 1.8, color: color }, marker: { size: 5, color: color } };
      return { name: r, x: years, y: ys, type: 'bar', marker: { color: color } };
    });

    Plotly.react(div, traces2, baseLayout({
      barmode: type === 'bar' ? 'group' : undefined,
      xaxis: { title: { text: 'Год' }, gridcolor: gridColor(), zeroline: false, tickmode: 'array', tickvals: years },
      yaxis: { title: { text: 'млрд кВт·ч' }, gridcolor: gridColor(), zeroline: false, type: yScale }
    }), PLOT_CFG);
  }

  global.Charts = {
    plotlyReady: plotlyReady,
    baseLayout: baseLayout,
    PLOT_CFG: PLOT_CFG,
    renderMainChart: renderMainChart
  };
})(window);