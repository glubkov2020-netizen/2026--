/* ============================================================
   ROUTER — hash-навигация
   URL: #/data, #/view, #/trend и т.д.
   Поддерживает popstate (кнопка «Назад»).
   ============================================================ */
(function(global){
  'use strict';

  var PAGES = {
    data: { title: 'Ввод данных', lead: 'Загрузите данные вручную, из CSV/JSON или файла.' },
    health: { title: 'Паспорт данных', lead: 'Проверка качества: пропуски, скачки, дубли.' },
    deepseek: { title: 'DeepSeek', lead: 'Извлечение данных из документов через чат.' },
    view: { title: 'Графики', lead: 'Динамика по годам: линии, столбцы, области.' },
    compare: { title: 'Сравнение', lead: 'Нормированные индексы (база = 100).' },
    stats: { title: 'Расчёты', lead: 'Сводная статистика, динамика, детально.' },
    trend: { title: 'Тренды и прогноз', lead: 'Линейный, полином, экспонента. Прогноз до 5 лет.' },
    advanced: { title: 'Продвинутая аналитика', lead: 'Джини, HHI, k-means, PCA, Манн-Кендалл.' },
    structure: { title: 'Структура', lead: 'HHI и доли регионов по годам.' },
    anomaly: { title: 'Аномалии', lead: 'z-score, IQR, MAD, корреляции.' },
    heatmap: { title: 'Тепловые карты', lead: 'Корреляции, матрица значений, гистограмма.' },
    region: { title: 'Паспорт региона', lead: 'Все метрики по одному региону.' },
    scenario: { title: 'Сценарии', lead: 'Прогноз «+X% в год».' },
    official: { title: 'Оформление', lead: 'Реквизиты отчёта: организация, автор, дата.' },
    export: { title: 'Экспорт', lead: '12 форматов, включая PDF.' },
    settings: { title: 'Настройки', lead: 'Единица, точность, тема, проект.' }
  };

  var current = 'data';
  var listeners = [];

  function parseHash(){
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return PAGES[h] ? h : 'data';
  }

  function apply(page){
    if(!PAGES[page]) page = 'data';
    current = page;

    // скрыть все страницы, показать текущую
    document.querySelectorAll('.page[data-page]').forEach(function(el){
      var isActive = el.getAttribute('data-page') === page;
      el.hidden = !isActive;
      el.classList.toggle('active', isActive);
    });

    // подсветить ссылки
    document.querySelectorAll('[data-route]').forEach(function(a){
      a.classList.toggle('active', a.getAttribute('data-route') === page);
    });

    // заголовок
    var meta = PAGES[page];
    var t = document.getElementById('pageTitle');
    var l = document.getElementById('pageLead');
    if(t) t.textContent = meta.title;
    if(l) l.textContent = meta.lead;

    document.title = meta.title + ' · Выработка ЭЭ по регионам РФ';

    // уведомить подписчиков
    listeners.forEach(function(fn){ try{ fn(page); }catch(e){ console.error('[router]', e); } });

    window.scrollTo(0, 0);
  }

  function go(page){
    if(!PAGES[page]) page = 'data';
    if(location.hash !== '#/' + page){
      location.hash = '#/' + page;
    } else {
      apply(page);
    }
  }

  function start(){
    apply(parseHash());
    window.addEventListener('hashchange', function(){ apply(parseHash()); });
  }

  function onRoute(fn){
    listeners.push(fn);
    return function(){ listeners = listeners.filter(function(f){ return f !== fn; }); };
  }

  global.Router = {
    go: go,
    start: start,
    onRoute: onRoute,
    current: function(){ return current; }
  };
})(window);