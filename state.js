/* ============================================================
   STATE — единое состояние + pub/sub
   Всё, что меняется в приложении, проходит через setState() или
   через подписки на события. Компоненты подписываются на изменения.
   ============================================================ */
(function(global){
  'use strict';

  var REGIONS = [
    'Кемеровская обл.', 'Москва', 'Новосибирская обл.', 'Красноярский край',
    'Санкт-Петербург', 'Свердловская обл.', 'Тюменская обл.', 'Иркутская обл.',
    'Ханты-Мансийский АО — Югра', 'Ямало-Ненецкий АО'
  ];
  var STATUSES = ['факт', 'оценка', 'прогноз'];
  var PALETTE = ['#1e40af','#0891b2','#7c3aed','#d97706','#dc2626','#059669','#a16207','#0f766e','#9333ea','#b91c1c','#0891b2','#7c3aed'];
  var COOKIE_CONSENT_KEY = 'energy_cookie_consent_v6';

  var state = {
    data: [],
    selected: {},
    theme: 'light',
    expMode: 'short',
    optUnit: 'bln',
    optPrec: 2,
    optSep: 'ru',
    consent: null,
    sideCollapsed: false
  };

  /* pub/sub */
  var subscribers = {};
  function on(evt, fn){
    (subscribers[evt] = subscribers[evt] || []).push(fn);
    return function off(){ subscribers[evt] = subscribers[evt].filter(function(f){ return f !== fn; }); };
  }
  function emit(evt, payload){
    (subscribers[evt] || []).forEach(function(fn){ try{ fn(payload); }catch(e){ console.error('[state]', evt, e); } });
    (subscribers['*'] || []).forEach(function(fn){ try{ fn(evt, payload); }catch(e){ console.error('[state]*', e); } });
  }

  /* точечные мутации */
  function setData(arr){ state.data = arr || []; emit('data:change'); }
  function setSelected(obj){ state.selected = obj || {}; emit('selection:change'); }
  function setTheme(t){ state.theme = t; emit('theme:change', t); }
  function setOption(k, v){ state[k] = v; emit('option:change', { key: k, value: v }); }
  function setConsent(c){ state.consent = c; emit('consent:change', c); }

  /* Публичное API */
  global.State = {
    data: state,
    REGIONS: REGIONS,
    STATUSES: STATUSES,
    PALETTE: PALETTE,
    COOKIE_CONSENT_KEY: COOKIE_CONSENT_KEY,
    on: on,
    emit: emit,
    setData: setData,
    setSelected: setSelected,
    setTheme: setTheme,
    setOption: setOption,
    setConsent: setConsent
  };
})(window);