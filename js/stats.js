/* ============================================================
   STATS — вся математика
   Исправленные версии (R² = null при константе, центрирование t,
   k-means++, MAD-scale, Mann-Kendall с ties).
   ============================================================ */
(function(global){
  'use strict';

  function mean(a){ if(!a.length) return null; var s = 0; for(var i=0;i<a.length;i++) s += a[i]; return s / a.length; }
  function median(a){
    if(!a.length) return null;
    var s = a.slice().sort(function(x,y){ return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
  }
  function std(a){
    if(a.length < 2) return null;
    var m = mean(a), s = 0;
    for(var i=0;i<a.length;i++) s += (a[i] - m) * (a[i] - m);
    return Math.sqrt(s / (a.length - 1));
  }
  function sum(a){ var s = 0; for(var i=0;i<a.length;i++) s += a[i]; return s; }
  function minOf(a){ var m = null; for(var i=0;i<a.length;i++) if(m === null || a[i] < m) m = a[i]; return m; }
  function maxOf(a){ var m = null; for(var i=0;i<a.length;i++) if(m === null || a[i] > m) m = a[i]; return m; }

  /* Линейная регрессия; если ssTot = 0, R² = null */
  function linreg(y){
    var n = y.length; if(n < 2) return null;
    var tm = (n - 1) / 2, ym = mean(y), num = 0, den = 0;
    for(var i=0;i<n;i++){ num += (i - tm) * (y[i] - ym); den += (i - tm) * (i - tm); }
    var b = den === 0 ? 0 : num / den;
    var a = ym - b * tm;
    var ssTot = 0, ssRes = 0;
    for(var i2=0;i2<n;i2++){
      ssTot += (y[i2] - ym) * (y[i2] - ym);
      var pred = a + b * i2;
      ssRes += (y[i2] - pred) * (y[i2] - pred);
    }
    var r2 = ssTot === 0 ? null : 1 - ssRes / ssTot;
    return { a: a, b: b, r2: r2 };
  }

  /* Полином 2-й степени с центрированием t — для устойчивости */
  function polyreg(y, degree){
    degree = degree || 2;
    var n = y.length; if(n < degree + 1) return null;
    var tm = (n - 1) / 2;
    var X = [], Y = [];
    for(var i=0;i<n;i++){
      var row = [];
      for(var d=0; d<=degree; d++) row.push(Math.pow(i - tm, d));
      X.push(row); Y.push(y[i]);
    }
    var dim = degree + 1, A = [], B = [];
    for(var r=0;r<dim;r++){
      A.push([]);
      for(var c=0;c<dim;c++){
        var s = 0;
        for(var k=0;k<n;k++) s += X[k][r] * X[k][c];
        A[r].push(s);
      }
      var s2 = 0;
      for(var k2=0;k2<n;k2++) s2 += X[k2][r] * Y[k2];
      B.push(s2);
    }
    var M = A.map(function(row, i){ return row.concat([B[i]]); });
    for(var i2=0;i2<dim;i2++){
      var piv = i2;
      for(var r2=i2+1;r2<dim;r2++) if(Math.abs(M[r2][i2]) > Math.abs(M[piv][i2])) piv = r2;
      if(Math.abs(M[piv][i2]) < 1e-12) return null;
      var tmp = M[i2]; M[i2] = M[piv]; M[piv] = tmp;
      for(var r3=i2+1;r3<dim;r3++){
        var f = M[r3][i2] / M[i2][i2];
        for(var c3=i2;c3<=dim;c3++) M[r3][c3] -= f * M[i2][c3];
      }
    }
    var coef = new Array(dim).fill(0);
    for(var i3=dim-1;i3>=0;i3--){
      var s3 = M[i3][dim];
      for(var j3=i3+1;j3<dim;j3++) s3 -= M[i3][j3] * coef[j3];
      coef[i3] = s3 / M[i3][i3];
    }
    var ym = mean(y), ssTot = 0, ssRes = 0;
    for(var i4=0;i4<n;i4++){
      ssTot += (y[i4] - ym) * (y[i4] - ym);
      var pred = 0;
      for(var d2=0;d2<=degree;d2++) pred += coef[d2] * Math.pow(i4 - tm, d2);
      ssRes += (y[i4] - pred) * (y[i4] - pred);
    }
    var r2 = ssTot === 0 ? null : 1 - ssRes / ssTot;
    return {
      coef: coef, r2: r2, _tm: tm,
      predict: function(t){
        var v = 0;
        for(var d3=0;d3<=degree;d3++) v += coef[d3] * Math.pow(t - tm, d3);
        return v;
      }
    };
  }

  function expreg(y){
    if(y.length < 2) return null;
    var ys = y.map(function(v){ return v > 0 ? Math.log(v) : null; });
    if(ys.some(function(v){ return v === null; })) return null;
    var lr = linreg(ys);
    if(!lr) return null;
    var ym = mean(y), ssTot = 0, ssRes = 0;
    for(var i=0;i<y.length;i++){
      ssTot += (y[i] - ym) * (y[i] - ym);
      var pred = Math.exp(lr.a + lr.b * i);
      ssRes += (y[i] - pred) * (y[i] - pred);
    }
    var r2 = ssTot === 0 ? null : 1 - ssRes / ssTot;
    return {
      a: Math.exp(lr.a), b: lr.b, r2: r2,
      predict: function(t){ return Math.exp(lr.a + lr.b * t); }
    };
  }

  function mape(y, fit){
    var n = Math.min(y.length, fit.length), s = 0, c = 0, zeros = 0;
    for(var i=0;i<n;i++){
      if(y[i] === 0){ zeros++; continue; }
      s += Math.abs((y[i] - fit[i]) / y[i]); c++;
    }
    if(c === 0) return null;
    if(zeros / n > 0.3) return null; // слишком много нулей — MAPE бессмысленна
    return s / c * 100;
  }

  function cagrFromSeries(years, values){
    if(values.length < 2) return null;
    var i0 = 0, i1 = 0;
    for(var i=1;i<years.length;i++){
      if(years[i] < years[i0]) i0 = i;
      if(years[i] > years[i1]) i1 = i;
    }
    var n = years[i1] - years[i0];
    var v0 = values[i0], v1 = values[i1];
    if(n <= 0 || v0 <= 0 || v1 <= 0) return null;
    return (Math.pow(v1 / v0, 1 / n) - 1) * 100;
  }

  function pearson(x, y){
    var n = x.length;
    if(n < 2 || y.length !== n) return null;
    var mx = mean(x), my = mean(y), num = 0, dx = 0, dy = 0;
    for(var i=0;i<n;i++){
      num += (x[i] - mx) * (y[i] - my);
      dx += (x[i] - mx) * (x[i] - mx);
      dy += (y[i] - my) * (y[i] - my);
    }
    if(dx === 0 || dy === 0) return null;
    return num / Math.sqrt(dx * dy);
  }

  function movingAvg(values, win){
    win = win || 3;
    var out = [];
    for(var i=0;i<values.length;i++){
      var from = Math.max(0, i - win + 1);
      var slice = values.slice(from, i + 1);
      out.push(sum(slice) / slice.length);
    }
    return out;
  }

  function iqrMethod(values){
    if(values.length < 4) return { lo: null, hi: null };
    var s = values.slice().sort(function(a,b){ return a - b; });
    function q(p){
      var idx = (s.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
      if(lo === hi) return s[lo];
      return s[lo] + (s[hi] - s[lo]) * (idx - lo);
    }
    var q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
    return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
  }

  function madMethod(values){
    if(!values.length) return { m: null, mad: null };
    var m = median(values);
    var dev = values.map(function(v){ return Math.abs(v - m); });
    var mad = median(dev);
    if(mad === 0) mad = 1e-9; // fallback при вырожденном случае
    return { m: m, mad: mad, scaledMad: mad * 1.4826 };
  }

  function mannKendall(values){
    var n = values.length;
    if(n < 3) return { S: 0, Z: null, p: null };
    var S = 0, ties = 0;
    for(var i=0;i<n-1;i++){
      for(var j=i+1;j<n;j++){
        var d = values[j] - values[i];
        if(d > 0) S++;
        else if(d < 0) S--;
        else ties++;
      }
    }
    var varS = (n * (n - 1) * (2 * n + 5)) / 18;
    // Поправка на ties
    if(ties > 0){
      var tieSum = 0;
      var counts = {};
      values.forEach(function(v){ counts[v] = (counts[v] || 0) + 1; });
      Object.keys(counts).forEach(function(k){
        var t = counts[k];
        if(t > 1) tieSum += t * (t - 1) * (2 * t + 5);
      });
      varS -= tieSum / 18;
    }
    var Z = 0;
    if(S > 0) Z = (S - 1) / Math.sqrt(varS);
    else if(S < 0) Z = (S + 1) / Math.sqrt(varS);
    var p = 2 * (1 - normCdf(Math.abs(Z)));
    return { S: S, Z: Z, p: p };
  }

  function normCdf(x){
    var t = 1 / (1 + 0.2316419 * Math.abs(x));
    var d = 0.3989423 * Math.exp(-x * x / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  function entropy(values){
    var s = sum(values);
    if(s <= 0) return null;
    var h = 0;
    for(var i=0;i<values.length;i++){
      if(values[i] > 0){ var p = values[i] / s; h -= p * Math.log(p); }
    }
    return h;
  }

  function gini(values){
    var s = values.slice().sort(function(a,b){ return a - b; });
    var n = s.length;
    if(n < 2 || sum(s) <= 0) return null;
    var num = 0;
    for(var i=0;i<n;i++) num += (2 * (i + 1) - n - 1) * s[i];
    return num / (n * sum(s));
  }

  function crK(values, k){
    var s = values.slice().sort(function(a,b){ return b - a; });
    var total = sum(values);
    if(total <= 0) return null;
    return sum(s.slice(0, k)) / total * 100;
  }

  /* k-means++ с 10 запусками, лучший по inertia */
  function kmeans(points, k, iters){
    iters = iters || 50;
    var n = points.length;
    if(n < k) return { assign: points.map(function(_, i){ return i; }), inertia: Infinity };

    function runOnce(){
      var centers = [points[Math.floor(Math.random() * n)].slice()];
      while(centers.length < k){
        var dists = points.map(function(p){
          var dmin = Infinity;
          for(var c=0;c<centers.length;c++){
            var d = 0;
            for(var dim=0;dim<p.length;dim++) d += (p[dim] - centers[c][dim]) * (p[dim] - centers[c][dim]);
            if(d < dmin) dmin = d;
          }
          return dmin;
        });
        var total = sum(dists), r = Math.random() * total, acc = 0, idx = 0;
        for(var i=0;i<n;i++){ acc += dists[i]; if(acc >= r){ idx = i; break; } }
        centers.push(points[idx].slice());
      }

      var assign = new Array(n).fill(0);
      for(var it=0; it<iters; it++){
        var changed = false;
        for(var i2=0;i2<n;i2++){
          var best = 0, bestD = Infinity;
          for(var c2=0;c2<k;c2++){
            var d2 = 0;
            for(var dim2=0;dim2<points[i2].length;dim2++)
              d2 += (points[i2][dim2] - centers[c2][dim2]) * (points[i2][dim2] - centers[c2][dim2]);
            if(d2 < bestD){ bestD = d2; best = c2; }
          }
          if(assign[i2] !== best){ assign[i2] = best; changed = true; }
        }
        if(!changed) break;
        for(var c3=0;c3<k;c3++){
          var cnt = 0, sumDim = new Array(points[0].length).fill(0);
          for(var i3=0;i3<n;i3++) if(assign[i3] === c3){
            cnt++;
            for(var dim3=0;dim3<sumDim.length;dim3++) sumDim[dim3] += points[i3][dim3];
          }
          if(cnt > 0) centers[c3] = sumDim.map(function(v){ return v / cnt; });
        }
      }
      var inertia = 0;
      for(var i4=0;i4<n;i4++){
        var d4 = 0;
        for(var dim4=0;dim4<points[i4].length;dim4++)
          d4 += (points[i4][dim4] - centers[assign[i4]][dim4]) * (points[i4][dim4] - centers[assign[i4]][dim4]);
        inertia += d4;
      }
      return { assign: assign, centers: centers, inertia: inertia };
    }

    var best = null;
    for(var r=0;r<10;r++){
      var res = runOnce();
      if(!best || res.inertia < best.inertia) best = res;
    }
    return best;
  }

  function pca2d(points){
    var n = points.length, d = points[0].length;
    var means = new Array(d).fill(0);
    for(var i=0;i<n;i++) for(var j=0;j<d;j++) means[j] += points[i][j];
    for(var j2=0;j2<d;j2++) means[j2] /= n;
    var centered = points.map(function(p){ return p.map(function(v, j){ return v - means[j]; }); });
    var C = [];
    for(var a=0;a<d;a++){
      C.push([]);
      for(var b=0;b<d;b++){
        var s = 0;
        for(var k=0;k<n;k++) s += centered[k][a] * centered[k][b];
        C[a].push(s / (n - 1));
      }
    }
    function powerIter(mat, exclude){
      var v = new Array(d).fill(0).map(function(){ return Math.random() - 0.5; });
      for(var it=0; it<1000; it++){
        var w = new Array(d).fill(0);
        for(var i2=0;i2<d;i2++) for(var j3=0;j3<d;j3++) w[i2] += mat[i2][j3] * v[j3];
        if(exclude) for(var e=0;e<exclude.length;e++){
          var dot = 0;
          for(var q=0;q<d;q++) dot += w[q] * exclude[e][q];
          for(var q2=0;q2<d;q2++) w[q2] -= dot * exclude[e][q2];
        }
        var len = Math.sqrt(sum(w.map(function(x){ return x * x; })));
        if(len < 1e-12) return v;
        var next = w.map(function(x){ return x / len; });
        var diff = Math.sqrt(sum(next.map(function(x, i){ return (x - v[i]) * (x - v[i]); })));
        v = next;
        if(diff < 1e-10) break;
      }
      return v;
    }
    var v1 = powerIter(C, null);
    var v2 = powerIter(C, [v1]);
    return {
      pc1: centered.map(function(p){ return sum(p.map(function(x, i){ return x * v1[i]; })); }),
      pc2: centered.map(function(p){ return sum(p.map(function(x, i){ return x * v2[i]; })); })
    };
  }

  global.Stats = {
    mean: mean, median: median, std: std, sum: sum, minOf: minOf, maxOf: maxOf,
    linreg: linreg, polyreg: polyreg, expreg: expreg, mape: mape,
    cagrFromSeries: cagrFromSeries, pearson: pearson, movingAvg: movingAvg,
    iqrMethod: iqrMethod, madMethod: madMethod, mannKendall: mannKendall,
    normCdf: normCdf, entropy: entropy, gini: gini, crK: crK,
    kmeans: kmeans, pca2d: pca2d
  };
})(window);