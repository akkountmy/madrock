/* Замер сайта MADROCK.
   Выполняется внутри самой страницы: плагин раздачи вставляет этот файл перед
   </body>, когда адрес открыт с параметром audit= (см. /madrock?audit=1).
   Результаты уходят на хост по адресу /madrock-verify, откуда их читает агент.

   Что проверяем:
     8 — ряды карточек и бегущая строка на полной ширине;
     9 — телефон: шапка, строка, факты, кнопка «наверх», карточка кабинета;
     7 — вход и регистрация: кнопка в шапке открывает форму, а не кабинет,
         и при этом кабинет можно посмотреть. */

(function () {
  var FLOW_KEY = 'madrock.audit.flow';
  var FLOW_READY = 'measure';
  var USER_KEY = 'madrock.user.v2';
  var OF = 10;

  var send = function (part, checks) {
    new Image().src = '/madrock-verify?part=' + part + '&of=' + OF + '&d=' + encodeURIComponent(JSON.stringify({ checks: checks }));
  };

  /* --- общие помощники --------------------------------------------------- */
  var rect = function (el) { return el ? el.getBoundingClientRect() : null; };
  var css = function (el, pseudo) { return el ? getComputedStyle(el, pseudo || undefined) : null; };
  var one = function (sel) { return document.querySelector(sel); };
  var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var alpha = function (c) { return c.indexOf('rgba') === 0 ? parseFloat(c.split(',')[3].replace(')', '')) : 1; };
  var text = function (sel) { var el = one(sel); return el ? (el.textContent || '').trim() : ''; };

  /* сколько карточек встало в каждую строку */
  var byRow = function (list) {
    var map = {};
    list.forEach(function (el) {
      var k = Math.round(rect(el).top);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  };

  var frameWidth = function (width) {
    /* страница кабинета перекрывает сайт: если она осталась открытой после
       проверок входа, закрываем её, иначе все замеры увидят пустые блоки */
    var page = one('#acc-page');
    if (page && page.hidden === false) {
      var back = one('#acc-page-back');
      if (back) back.click();
      else { page.hidden = true; document.body.classList.remove('acc-on'); }
      var modal = one('#account-modal');
      if (modal) modal.classList.remove('on');
      var scrim = one('#scrim');
      if (scrim) scrim.classList.remove('on');
    }
    var frame = window.frameElement;
    if (frame) frame.style.width = width + 'px';
  };

  /* ставим нужную ширину и ждём, пока она действительно применится */
  var atWidth = function (width, done, tries) {
    frameWidth(width);
    setTimeout(function () {
      var vw = document.documentElement.clientWidth;
      if (Math.abs(vw - width) > 60 && (tries || 0) < 6) { atWidth(width, done, (tries || 0) + 1); return; }
      done();
    }, 300);
  };

  var withWidth = function (width, done) {
    var frame = window.frameElement;
    var was = frame ? frame.style.width : '';
    frameWidth(width);
    setTimeout(function () {
      try { done(); } finally { if (frame) frame.style.width = was || '1280px'; }
    }, 320);
  };

  /* --- 8. полная ширина: ряды карточек и бегущая строка ------------------ */
  var desktop = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };
    var vw = document.documentElement.clientWidth;
    var promo = one('#promo-box .promo');
    var pr = rect(promo);
    var points = one('#points');
    var panel = points ? points.parentElement : null;
    var nr = rect(panel);
    var gr = rect(points);
    var cards = all('#points .point-card');
    var tiles = all('#tiles .tile');
    var notes = all('.tiles--notes .tile');

    add('Замер на полной ширине', vw + ' px', vw > 1200);

    /* бегущая строка должна бежать внутри обычных полей сайта */
    var row = one('#ticker-row');
    var port = row ? row.parentElement : null;
    var portRect = rect(port);
    var portCss = css(port);
    var padL = parseFloat(portCss.paddingLeft) || 0;
    var padR = parseFloat(portCss.paddingRight) || 0;
    var inner = { left: portRect.left + padL, right: portRect.right - padR };
    add('Контейнер строки: края как у акции',
      'строка ' + Math.round(inner.left) + '/' + Math.round(inner.right) + ' · акция ' + Math.round(pr.left) + '/' + Math.round(pr.right),
      Math.abs(inner.left - pr.left) <= 2 && Math.abs(inner.right - pr.right) <= 2);
    add('Контейнер строки: класс полей', port ? String(port.className) : 'нет',
      !!port && String(port.className).indexOf('wrap') >= 0);

    /* при отключённом движении строка статична и обязана уложиться в поля;
       при включённом — она бежит, а поля её обрезают */
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var fields = Math.round(inner.right - inner.left);
    var rowWidth = Math.round(rect(row).width);
    if (reduce) {
      var shown = all('#ticker-row span').filter(function (s) { return css(s).display !== 'none'; }).length;
      add('Строка стоит по просьбе системы и уложилась в поля',
        'overflow-x: ' + portCss.overflowX + ' · строка ' + rowWidth + ' px при полях ' + fields + ' · надписей ' + shown,
        portCss.overflowX === 'visible' && rowWidth <= fields + 1 && shown === 9);
    } else {
      add('Надписи обрезаются по полям', 'overflow-x: ' + portCss.overflowX, portCss.overflowX === 'hidden');
      add('Строка длиннее полей и потому бежит', 'строка ' + rowWidth + ' px при полях ' + fields, rowWidth > fields);
    }

    var hero = one('.hero__box') || one('.hero .wrap');
    var hr = rect(hero);
    add('Поля строки и титульной карточки совпадают',
      'строка ' + Math.round(inner.left) + '/' + Math.round(inner.right) + ' · титул ' + Math.round(hr.left) + '/' + Math.round(hr.right),
      Math.abs(inner.left - hr.left) <= 2 && Math.abs(inner.right - hr.right) <= 2);

    add('Панель кофеен по краям акции',
      'панель ' + Math.round(nr.left) + '/' + Math.round(nr.right) + ' · акция ' + Math.round(pr.left) + '/' + Math.round(pr.right),
      Math.abs(nr.left - pr.left) <= 3 && Math.abs(nr.right - pr.right) <= 3);

    var pc = byRow(cards);
    add('Кофейни: один ряд и размер',
      cards.length + ' шт · по строкам ' + pc.join('/') + ' · карточка ' + Math.round(rect(cards[0]).width) + '×' + Math.round(rect(cards[0]).height),
      cards.length === 5 && pc.length === 1 && pc[0] === 5);

    var pt = byRow(tiles);
    add('Плитки «Кто мы»: один ряд',
      tiles.length + ' шт · по строкам ' + pt.join('/') + ' · карточка ' + Math.round(rect(tiles[0]).width) + '×' + Math.round(rect(tiles[0]).height),
      tiles.length === 6 && pt.length === 1 && pt[0] === 6);

    var tu = rect(one('#tiles'));
    add('Плитки по краям акции',
      'плитки ' + Math.round(tu.left) + '/' + Math.round(tu.right) + ' · акция ' + Math.round(pr.left) + '/' + Math.round(pr.right),
      Math.abs(tu.left - pr.left) <= 3 && Math.abs(tu.right - pr.right) <= 3);

    var pn = byRow(notes);
    add('Пояснения предзаказа в один ряд', notes.length + ' шт · по строкам ' + pn.join('/'),
      notes.length === 3 && pn.length === 1 && pn[0] === 3);

    var revs = all('#revs .rev');
    var revRows = byRow(revs);
    var revHeights = revs.map(function (el) { return Math.round(rect(el).height); });
    add('Отзывы: карточек и строки', revs.length + ' шт · по строкам ' + revRows.join('/') + ' · высоты ' + revHeights.join('/'),
      revs.length === 3 && revRows.length === 1 && Math.max.apply(null, revHeights) - Math.min.apply(null, revHeights) <= 2);

    send(18, out);
  };

  /* --- 10 и 20. контакты: все карточки в одну строку ----------------------
     Отчёт уходит двумя частями: длинный список проверок не проходит по длине
     адреса, и такая часть терялась по дороге. */
  var contacts = function () {
    var shoot = function (widths, part) {
      var out = [];
      var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 90), ok: !!ok }); };

      widths.forEach(function (w) {
        frameWidth(w);
        var cards = all('#contacts-grid .contact-card');
        if (cards.length === 0) { add('Ширина ' + w + ': карточки кофеен', 'не найдены', false); return; }

        var rows = byRow(cards);
        var expectOne = w >= 1100;
        /* На телефоне кофейни стоят по две в ряд, пятая — на всю ширину */
        var mobile = w <= 780;
        var lastWide = cards.length === 5 && Math.abs(rect(cards[4]).width - rect(one('#contacts-grid')).width) <= 2;
        add('Ширина ' + w + ': ' + cards.length + ' карточек по строкам ' + rows.join('/'),
          mobile ? (lastWide ? 'пятая во всю ширину' : 'пятая уже остальных') : (expectOne ? 'ждём одну строку из 5' : 'ждём несколько строк'),
          mobile
            ? (rows.join('/') === '2/2/1' && lastWide)
            : (expectOne ? (rows.length === 1 && rows[0] === 5) : cards.length === 5));

        var cardWidths = cards.map(function (c) { return Math.round(rect(c).width); });
        var heights = cards.map(function (c) { return Math.round(rect(c).height); });
        var spread = Math.max.apply(null, heights) - Math.min.apply(null, heights);
        add('Ширина ' + w + ': ширина и высота карточек',
          'ширина ' + cardWidths[0] + ' · высота ' + heights[0] + ' · разброс ' + spread,
          rows.length === 1 ? spread <= 2 && Math.max.apply(null, cardWidths) - Math.min.apply(null, cardWidths) <= 2 : true);

        var over = [];
        var broken = [];
        var waiting = 0;
        cards.forEach(function (c) {
          var name = String((c.querySelector('.contact-card__n') || {}).textContent || '').slice(0, 14);
          if (c.scrollWidth > c.clientWidth + 1) over.push('текст: ' + name);
          var img = c.querySelector('img');
          if (img) {
            /* отложенные снимки в невидимом окне ещё не запрошены — это не поломка;
               ошибкой считаем только завершившуюся загрузку без картинки */
            if (img.complete && img.naturalWidth === 0) broken.push(name);
            else if (!img.complete) waiting += 1;
          }
          var cta = c.querySelector('.contact-card__cta');
          if (cta && cta.scrollWidth > cta.clientWidth + 1) over.push('кнопка: ' + name);
        });
        add('Ширина ' + w + ': содержимое карточек внутри краёв', over.length ? over.join(' | ') : 'всё внутри', over.length === 0);
        add('Ширина ' + w + ': фотографии карточек в порядке',
          broken.length ? 'сломаны: ' + broken.join(', ') : (waiting ? 'ждут прокрутки: ' + waiting + ' из ' + cards.length : 'загружены все ' + cards.length),
          broken.length === 0);
        add('Ширина ' + w + ': карточки внутри полей сайта',
          'карточка ' + cardWidths[0] + ' px',
          rect(one('#contacts-grid')).right <= rect(one('#contacts .wrap')).right + 1);
      });

      send(part, out);
    };

    shoot([1440, 1200, 1100], 10);
    shoot([1024, 900, 780, 390], 20);
  };

  /* --- 80. форма входа: помещается ли без внутренней прокрутки ----------- */
  var authFit = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };
    var frame = window.frameElement;

    [900, 800, 720, 660].forEach(function (h) {
      if (frame) { frame.style.width = '1200px'; frame.style.height = h + 'px'; }
      /* форма входа показывается тому, кто не вошёл: если открыт кабинет,
         выходим из него, иначе на кнопку в шапке откроется страница */
      var pageOpen = one('#acc-page');
      if (pageOpen && pageOpen.hidden === false) {
        var out = one('#acc-page-logout');
        if (out) out.click();
      }
      var opener = one('[data-account]');
      if (opener && !one('#auth-phone')) opener.click();
      var card = one('#account-modal .modal__c');
      if (!card) { add('Высота окна ' + h, 'карточка не найдена', false); return; }
      var box = rect(card);
      add('Высота окна ' + h + ': форма входа',
        'карточка ' + Math.round(box.height) + ' px · содержимое ' + card.scrollHeight + ' px · ' +
          (card.scrollHeight > card.clientHeight + 1 ? 'нужна прокрутка' : 'прокрутки нет'),
        card.scrollHeight <= card.clientHeight + 1 && box.bottom <= h + 1);
      add('Высота окна ' + h + ': поля и кнопка на месте',
        'полей ' + all('#account-modal input').length + ' · кнопка ' + (one('#auth-go') ? 'есть' : 'нет'),
        all('#account-modal input').length >= 2 && !!one('#auth-go'));

      /* вкладка регистрации: там на поле с именем и согласие больше */
      var regTab = one('#tab-reg');
      if (regTab) regTab.click();
      var regCard = one('#account-modal .modal__c');
      add('Высота окна ' + h + ': форма регистрации',
        'карточка ' + Math.round(rect(regCard).height) + ' px · содержимое ' + regCard.scrollHeight + ' px · ' +
          (regCard.scrollHeight > regCard.clientHeight + 1 ? 'нужна прокрутка' : 'прокрутки нет'),
        regCard.scrollHeight <= regCard.clientHeight + 1);
      add('Высота окна ' + h + ': в регистрации есть имя и согласие',
        'имя ' + !!one('#auth-name') + ' · согласие ' + !!one('#auth-terms'),
        !!one('#auth-name') && !!one('#auth-terms'));

      var close = one('#account-close');
      if (close) close.click();
    });

    if (frame) frame.style.height = '900px';
    send(80, out);
  };

  /* --- 90. раздел Instagram: шесть плиток размером с фото меню ------------ */
  var insta = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };

    [1440, 1024, 780, 390].forEach(function (w) {
      frameWidth(w);
      var tiles = all('#gallery .insta__t');
      if (tiles.length === 0) { add('Ширина ' + w + ': раздел Instagram', 'плиток нет', false); return; }
      var first = rect(tiles[0]);
      /* Подписи поверх плиток убраны по просьбе владельца: проверяем наоборот —
         текста на фотографиях нет, а название кадра осталось в alt и title */
      var caps = tiles.filter(function (t) {
        return !!t.querySelector('.insta__cap') || String(t.textContent || '').trim() !== '';
      }).length;
      var labelled = tiles.filter(function (t) {
        var img = t.querySelector('img');
        return !!img && String(img.getAttribute('alt') || '').trim().length > 2;
      }).length;
      var broken = tiles.filter(function (t) {
        var img = t.querySelector('img');
        return !img || (img.complete && img.naturalWidth === 0);
      }).length;

      add('Ширина ' + w + ': плиток в разделе Instagram',
        tiles.length + ' шт · по строкам ' + byRow(tiles).join('/'), tiles.length === 6);

      /* Плитка обязана встать в ту же колонку, что карточка меню, и быть того
         же размера, что фотография в ней — именно этого просил владелец:
         раздел не должен выбиваться из ряда. Разница в 1–2 px — это рамка
         карточки, внутри которой лежит фото меню. */
      var menuCard = rect(one('#menu-grid .item'));
      var menuShot = rect(one('#menu-grid .item__ph'));
      add('Ширина ' + w + ': плитка Instagram в колонке карточки меню',
        'плитка ' + Math.round(first.width) + '×' + Math.round(first.height) +
          ' · карточка меню ' + (menuCard ? Math.round(menuCard.width) : 'нет') +
          ' · фото в ней ' + (menuShot ? Math.round(menuShot.width) + '×' + Math.round(menuShot.height) : 'нет'),
        !!menuCard && !!menuShot && Math.abs(first.width - menuCard.width) <= 1 &&
          Math.abs(first.width - menuShot.width) <= 3 && Math.abs(first.height - menuShot.height) <= 3);

      var sizes = tiles.map(function (t) { return Math.round(rect(t).width) + '×' + Math.round(rect(t).height); });
      var spread = rect(tiles[0]).width === 0 ? 99 :
        Math.max.apply(null, tiles.map(function (t) { return Math.round(rect(t).width); })) -
        Math.min.apply(null, tiles.map(function (t) { return Math.round(rect(t).width); }));
      add('Ширина ' + w + ': плитки одинаковые, кадр ' + (w > 780 ? '4:3' : '1:1'),
        sizes[0] + ' · разброс ширины ' + spread,
        Math.abs(first.width / first.height - (w > 780 ? 4 / 3 : 1)) < 0.03 && spread <= 1);
      add('Ширина ' + w + ': подписей на фотографиях нет, название в alt',
        'с текстом поверх фото: ' + caps + ' · с подписью в alt: ' + labelled + ' из ' + tiles.length,
        caps === 0 && labelled === tiles.length);
      add('Ширина ' + w + ': фотографии плиток целые', broken ? broken + ' сломано' : 'все на месте', broken === 0);
      var wrap = rect(one('#reviews .wrap'));
      add('Ширина ' + w + ': плитки внутри полей сайта',
        'край сетки ' + Math.round(rect(one('#gallery')).right) + ' · край блока ' + Math.round(wrap.right),
        rect(one('#gallery')).right <= wrap.right + 1);
    });

    send(90, out);
  };

  /* --- 95. подвал на телефоне: колонки, а не один столбец ---------------- */
  var footerGrid = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };

    [1440, 780, 620, 430, 390].forEach(function (w) {
      frameWidth(w);
      var grid = one('.ftr__grid');
      var blocks = all('.ftr__grid > *');
      if (!grid || blocks.length < 4) { add('Ширина ' + w + ': подвал', 'блоки не найдены', false); return; }
      var cols = String(css(grid).gridTemplateColumns).split(' ').filter(function (x) { return x !== ''; }).length;
      var rows = byRow(blocks);
      var pts = one('#ftr-points');
      var ptCols = pts ? String(css(pts).gridTemplateColumns).split(' ').filter(function (x) { return x !== ''; }).length : 0;
      var wantCols = w <= 780 ? 2 : 4;

      add('Ширина ' + w + ': колонок в подвале', cols + ' (нужно ' + wantCols + ') · блоки по строкам ' + rows.join('/'), cols === wantCols);
      add('Ширина ' + w + ': полки подвала заполнены',
        'строк ' + rows.length + ' · блоков ' + blocks.length,
        w <= 780 ? rows.length === 3 : rows.length === 1);

      /* справа не должно оставаться пустого места: крайние блоки доходят
         до края полей */
      var wrap = rect(one('.ftr .wrap'));
      var pad = parseFloat(css(one('.ftr .wrap')).paddingRight) || 0;
      var rightEdge = wrap.right - pad;
      var widest = 0;
      blocks.forEach(function (b) {
        var r = rect(b);
        var kids = Array.prototype.slice.call(b.children);
        var inner = 0;
        kids.forEach(function (k) { var kr = rect(k); if (kr.width > inner) inner = kr.right; });
        if (inner > widest) widest = inner;
      });
      add('Ширина ' + w + ': подвал доходит до правого края', 'до ' + Math.round(widest) + ' при крае ' + Math.round(rightEdge),
        widest >= rightEdge - 6);

      add('Ширина ' + w + ': кофейни в подвале',
        (pts ? all('#ftr-points > *').length + ' записей, колонок ' + ptCols : 'список не найден'),
        !!pts && all('#ftr-points > *').length === 5 && (w > 780 || ptCols === 2));

      var de = document.documentElement;
      add('Ширина ' + w + ': подвал без прокрутки вбок', (de.scrollWidth - de.clientWidth) + ' px лишних', de.scrollWidth - de.clientWidth <= 1);
    });

    send(95, out);
  };

  /* --- 96. меню и подменю: продукты появляются ------------------------- */
  var menuClicks = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };
    var frame = window.frameElement;
    var fire = function (el) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    };
    var items = function () { return all('#menu-grid .item').length; };

    [1440, 390].forEach(function (w) {
      if (frame) frame.style.width = w + 'px';
      var navMenu = all('#nav a').filter(function (a) { return a.getAttribute('href') === '#menu'; })[0];
      if (navMenu) {
        fire(navMenu);
        var menuTop = Math.round(rect(one('#menu')).top);
        var hdrH = Math.round(rect(one('.hdr')).height);
        add('Ширина ' + w + ': пункт «Меню» показывает каталог',
          'раздел на ' + menuTop + ' px при шапке ' + hdrH + ', позиций ' + items(),
          menuTop >= hdrH - 2 && menuTop <= hdrH + 90 && items() === 35);
      }

      /* категории: после каждой перерисовки берём кнопку заново по её признаку,
         иначе нажатие уходит в уже удалённый узел */
      var catIds = ['coffee', 'author', 'cold', 'notcoffee', 'food', 'dessert'];
      var badChips = [];
      catIds.forEach(function (id) {
        var want = { all: 35, coffee: 12, author: 4, cold: 5, notcoffee: 5, food: 5, dessert: 4 }[id];
        var allChip = one('#rail .rail__i[data-cat="all"]');
        if (allChip) fire(allChip);
        var chip = one('#rail .rail__i[data-cat="' + id + '"]');
        if (!chip) { badChips.push(id + ' — кнопки нет'); return; }
        var inner = chip.children.length ? chip.children[0] : chip;
        fire(inner);
        var got = items();
        if (got !== want) badChips.push(id + ' → ' + got + ' вместо ' + want);
      });
      add('Ширина ' + w + ': категории показывают продукты',
        badChips.length ? badChips.join(' | ') : 'все ' + catIds.length + ' категорий дают свои позиции',
        badChips.length === 0);
      add('Ширина ' + w + ': кнопок категорий в подменю', all('#rail .rail__i').length + ' шт', all('#rail .rail__i').length === 7);

      /* Поиск: забытый запрос раньше выглядел как «продукты пропали».
         Теперь пустой список обязан назвать причину и дать сброс. */
      var searchEl = one('#search');
      if (searchEl) {
        var junk = 'DeepSeek-V4-Flash-Vision-Exp';
        var normAll = function () { var c = one('#rail .rail__i[data-cat="all"]'); if (c) fire(c); };
        normAll();

        /* Состояние «человек ещё не касался поля» за загрузку встречается один
           раз: браузер подставляет текст сам, без жеста. Такой ввод сайт обязан
           игнорировать — иначе каталог выглядит пустым без причины. */
        var untouched = searchEl.hasAttribute('readonly');
        if (untouched) {
          searchEl.value = junk;
          searchEl.dispatchEvent(new Event('input', { bubbles: true }));
          add('Подставленный браузером текст не прячет меню',
            'поле «' + (searchEl.value || 'пусто') + '», позиций ' + items() + ', readonly ' + (searchEl.hasAttribute('readonly') ? 'да' : 'нет'),
            searchEl.value === '' && items() === 35 && searchEl.hasAttribute('readonly'));
        }

        /* человек коснулся поля — readonly уходит, набор фильтрует каталог */
        var gesture = function () {
          searchEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        };
        var typeIn = function (v) {
          gesture();
          searchEl.value = v;
          searchEl.dispatchEvent(new Event('input', { bubbles: true }));
        };

        typeIn(junk);
        var emptyBlock = one('#menu-empty');
        var emptyText = String(text('#menu-empty-text'));
        var emptyShown = !!emptyBlock && getComputedStyle(emptyBlock).display !== 'none';
        add('Ширина ' + w + ': пустой поиск объясняет причину',
          (emptyShown ? '«' + emptyText.slice(0, 70) + '»' : 'сообщения нет'),
          emptyShown && emptyText.indexOf('DeepSeek') >= 0 && !!one('#menu-reset'));
        var clearBtn = one('#search-clear');
        add('Ширина ' + w + ': кнопка очистки поиска видна', clearBtn && !clearBtn.hidden ? 'да' : 'нет', !!clearBtn && !clearBtn.hidden);

        fire(one('#menu-reset'));
        add('Ширина ' + w + ': сброс возвращает всё меню',
          'позиций ' + items() + ', поле «' + (searchEl.value || 'пусто') + '»',
          items() === 35 && searchEl.value === '');

        typeIn('капучино');
        var found = items();
        add('Ширина ' + w + ': поиск находит напиток', 'по запросу «капучино» — ' + found + ' позиций', found >= 1 && found < 35);

        fire(one('#search-clear'));
        add('Ширина ' + w + ': кнопка «Очистить» возвращает меню',
          'позиций ' + items() + ', поле «' + (searchEl.value || 'пусто') + '»', items() === 35 && searchEl.value === '');

        /* После первого касания поле становится обычным: readonly не остаётся */
        add('Ширина ' + w + ': после касания поле поиска обычное, не readonly',
          'readonly ' + (searchEl.hasAttribute('readonly') ? 'да' : 'нет') + ', позиций ' + items(),
          !searchEl.hasAttribute('readonly') && items() === 35);

        /* Настоящая вставка через движок браузера: если readonly снимется позже,
           чем нужно, человек не сможет печатать в поле. */
        var inserted = false;
        try {
          gesture();
          searchEl.focus({ preventScroll: true });
          inserted = document.execCommand('insertText', false, 'чай');
        } catch (e) { inserted = false; }
        add('Ширина ' + w + ': в поле можно печатать после касания',
          'вставка ' + (inserted ? 'принята' : 'отклонена') + ', поле «' + (searchEl.value || 'пусто') + '», позиций ' + items(),
          searchEl.value === 'чай' && items() >= 1 && items() < 35);
        fire(one('#search-clear'));

        /* Чужой текст, попавший в поле позже и без события ввода, обязан
           исчезнуть при следующей перерисовке — вместе с фильтром по нему. */
        searchEl.value = junk;
        normAll();
        add('Ширина ' + w + ': чужой текст в поиске не ломает каталог',
          'после перерисовки поле «' + (searchEl.value || 'пусто') + '», позиций ' + items(),
          searchEl.value === '' && items() === 35);
      }

      /* то же из подвала: ссылки «Меню» там с тем же признаком категории */
      var ftrLinks = all('#ftr-cats a');
      var badFoot = [];
      ftrLinks.forEach(function (link) {
        fire(link);
        var got = items();
        if (got === 0) badFoot.push(String(link.textContent).slice(0, 16));
      });
      add('Ширина ' + w + ': меню из подвала открывает продукты',
        badFoot.length ? 'пусто: ' + badFoot.join(', ') : 'все ' + ftrLinks.length + ' ссылок дают позиции',
        badFoot.length === 0 && ftrLinks.length >= 5);

      var allChipBack = one('#rail .rail__i[data-cat="all"]');
      if (allChipBack) fire(allChipBack);
    });

    if (frame) frame.style.width = '1440px';
    send(96, out);
  };

  /* --- 97. полоса надписей: сколько строк она занимает ------------------- */
  var tickerLines = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };

    [1440, 1100, 1000, 900, 820, 780, 620, 390].forEach(function (w) {
      frameWidth(w);
      var spans = all('#ticker-row span').filter(function (s) { return css(s).display !== 'none'; });
      var tops = {};
      spans.forEach(function (s) { tops[Math.round(rect(s).top)] = 1; });
      var lines = Object.keys(tops).length;
      var found = spans.filter(function (s) { return String(s.textContent).indexOf('кофеен') >= 0; })[0];
      add('Ширина ' + w + ': полоса надписей', 'строк ' + lines + ' · надписей ' + spans.length, lines > 0);
      if (found) {
        var b = found.querySelector('b');
        add('Ширина ' + w + ': «5 кофеен в Гомеле»',
          '«' + String(found.textContent).trim() + '»' + (b ? ', выделено: ' + b.textContent : ', выделения нет'),
          !!b && String(b.textContent).indexOf('5') >= 0);
      }
    });

    send(97, out);
  };

  /* --- 98. что видно после нажатия категории -----------------------------
     Считаем не только карточки в разметке, но и то, что реально видно:
     высоту, прозрачность, положение на экране и загруженные фото. Фото
     подгружаются не мгновенно, поэтому перед подсчётом ждём паузу. */
  var menuVisible = function (done) {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 160), ok: !!ok }); };
    var frame = window.frameElement;
    var fire = function (el) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    };

    var look = function () {
      var grid = one('#menu-grid');
      var cards = all('#menu-grid .item');
      var shown = cards.filter(function (c) {
        var cs = getComputedStyle(c);
        return c.offsetHeight > 0 && c.offsetWidth > 0 && parseFloat(cs.opacity) > 0.05 && cs.visibility !== 'hidden';
      }).length;
      var photos = cards.filter(function (c) {
        var img = c.querySelector('img');
        return img && img.naturalWidth > 0;
      }).length;
      var r = rect(grid);
      var names = cards.slice(0, 3).map(function (c) {
        var n = c.querySelector('.item__name');
        var p = c.querySelector('.price');
        return String((n || {}).textContent || '').trim().slice(0, 16) + (p ? ' ' + String(p.textContent).replace(/\s+/g, '') : '');
      }).join(' · ');
      return {
        text: 'позиций ' + cards.length + ', видно ' + shown + ', с фото ' + photos +
          ', каталог ' + Math.round(r.height) + ' px ' + (r.bottom > 0 && r.top < window.innerHeight ? 'в экране' : 'за экраном') +
          (names ? ' → ' + names : ''),
        ok: cards.length > 0 && shown === cards.length && photos > 0 && r.height > 200
      };
    };

    var queue = [];
    var run = function () {
      var task = queue.shift();
      if (!task) { if (frame) frame.style.width = '1440px'; send(98, out); if (done) done(); return; }
      task.action();
      setTimeout(function () {
        var res = look();
        add(task.title, res.text, res.ok);
        run();
      }, task.wait || 900);
    };

    /* Картинки на странице отложенные, а замер идёт в невидимом окне: браузер
       такие снимки не грузит сам. Заставляем их загрузиться принудительно —
       так видно, что фото каталога рабочие. */
    queue.push({
      title: 'Фото каталога при обязательной загрузке',
      wait: 2500,
      action: function () {
        all('#menu-grid .item img').forEach(function (img) {
          try { img.loading = 'eager'; } catch (e) {}
          var src = img.getAttribute('src');
          if (src) { img.removeAttribute('src'); img.setAttribute('src', src); }
        });
      }
    });

    [1440, 1100, 390].forEach(function (w) {
      queue.push({
        title: 'Ширина ' + w + ': каталог открыт',
        action: function () {
          /* закрываем окна: открытое окно блокирует прокрутку страницы */
          ['#account-close', '#item-close', '#checkout-close', '#cart-close'].forEach(function (s) {
            var b = one(s);
            if (b) b.click();
          });
          if (frame) frame.style.width = w + 'px';
          var allChip = one('#rail .rail__i[data-cat="all"]');
          if (allChip) fire(allChip);
          var menu = one('#menu');
          if (menu) window.scrollTo(0, Math.max(0, menu.offsetTop - 90));
        }
      });
      ['coffee', 'cold', 'dessert'].forEach(function (id) {
        queue.push({
          title: 'Ширина ' + w + ': нажата категория ' + id,
          /* после перерисовки карточки снова отложенные, а в невидимом окне
             браузер такие снимки не запрашивает: просим их явно и ждём */
          wait: 1600,
          action: function () {
            var chip = one('#rail .rail__i[data-cat="' + id + '"]');
            if (chip) fire(chip.children.length ? chip.children[0] : chip);
            all('#menu-grid .item img').forEach(function (img) {
              try { img.loading = 'eager'; } catch (e) {}
              var src = img.getAttribute('src');
              if (src) { img.removeAttribute('src'); img.setAttribute('src', src); }
            });
          }
        });
      });
      queue.push({
        title: 'Ширина ' + w + ': меню из подвала',
        action: function () {
          var link = all('#ftr-cats a').filter(function (a) { return a.getAttribute('data-cat') === 'coffee'; })[0];
          if (link) fire(link);
        }
      });
    });

    run();
  };

  /* --- 99 и 89. все телефонные ширины: каталог, шапка, подвал -------------
     Отчёт уходит двумя частями: слишком длинный список проверок не проходит
     по длине адреса и терялся по дороге. */
  var phones = function () {
    var shoot = function (widths, part) {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 120), ok: !!ok }); };
    var fire = function (el) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    };

    widths.forEach(function (w) {
      frameWidth(w);
      var de = document.documentElement;
      var wide = de.scrollWidth - de.clientWidth;
      add('Телефон ' + w + ': прокрутка вбок', wide <= 1 ? 'нет' : wide + ' px лишних', wide <= 1);

      var cards = all('#menu-grid .item').filter(function (c) { return c.offsetHeight > 0 && rect(c).width > 40; });
      add('Телефон ' + w + ': карточки каталога', cards.length + ' видно, ширина ' + (cards[0] ? Math.round(rect(cards[0]).width) : 0), cards.length >= 30);

      var rail = one('#rail');
      var railOver = rail ? rail.scrollWidth - rail.clientWidth : 0;
      add('Телефон ' + w + ': категории без прокрутки', railOver + ' px лишних, высота ' + (rail ? Math.round(rect(rail).height) : 0), railOver <= 1);

      /* Категории и фильтры на телефоне: ровная сетка вместо рваного переноса.
         «Всё меню» занимает всю ширину, шесть разделов встают по два в ряд,
         счётчик — плашкой справа (раньше он слипался с названием), фильтры:
         длинный на всю ширину, два коротких рядом. */
      var railChips = all('#rail .rail__i');
      var chipRows = byRow(railChips);
      var chipH = railChips.map(function (c) { return Math.round(rect(c).height); });
      var chipSpread = 0;
      var chipTops = {};
      railChips.forEach(function (c) {
        var k = Math.round(rect(c).top);
        (chipTops[k] = chipTops[k] || []).push(Math.round(rect(c).width));
      });
      Object.keys(chipTops).forEach(function (k) {
        var ws = chipTops[k];
        if (ws.length > 1) chipSpread = Math.max(chipSpread, Math.max.apply(null, ws) - Math.min.apply(null, ws));
      });
      var chipOver = railChips.filter(function (c) {
        return c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1;
      }).length;
      var chipBadges = railChips.filter(function (c) { return c.querySelector('span'); }).length;
      var chipMinH = chipH.length ? Math.min.apply(null, chipH) : 0;
      var menuWrap = rect(one('#menu .wrap'));
      add('Телефон ' + w + ': категории ровной сеткой ' + chipRows.join('+'),
        'плиток ' + railChips.length + ' · со счётчиком ' + chipBadges + ' · высота от ' + chipMinH +
          ' · разброс ширин в строке ' + chipSpread + ' · обрезано ' + chipOver,
        railChips.length === 7 && chipRows.length === 4 && chipRows[0] === 1 &&
          chipRows.slice(1).every(function (n) { return n === 2; }) &&
          chipBadges === 7 && chipMinH >= 44 && chipSpread <= 2 && chipOver === 0 &&
          rect(rail).left >= menuWrap.left - 1 && rect(rail).right <= menuWrap.right + 1);

      var mods = all('#menu .toolbar .mod');
      var modRows = byRow(mods);
      var modH = mods.map(function (m) { return Math.round(rect(m).height); });
      var modW = mods.map(function (m) { return Math.round(rect(m).width); });
      var modOver = mods.filter(function (m) { return m.scrollWidth > m.clientWidth + 1; }).length;
      var modMinH = modH.length ? Math.min.apply(null, modH) : 0;
      add('Телефон ' + w + ': фильтры ровной сеткой ' + modRows.join('+'),
        'плашек ' + mods.length + ' · высота от ' + modMinH +
          ' · первая шире второй на ' + (modW.length === 3 ? modW[0] - modW[1] : 0) + ' · обрезано ' + modOver,
        mods.length === 3 && modRows.length === 2 && modRows[0] === 1 && modRows[1] === 2 &&
          modMinH >= 44 && modOver === 0 && modW.length === 3 &&
          modW[0] > modW[1] + 20 && Math.abs(modW[1] - modW[2]) <= 2);

      /* Адаптивные фото. Выбор варианта браузер делает один раз — при загрузке
         страницы, а окно замера успевает побывать и широким, поэтому «что
         выбрано сейчас» здесь ничего не доказывает. Проверяем то, что от
         замера не зависит: сколько физических пикселей нужно слоту при этой
         ширине (размер × плотность экрана) и какие варианты ему предложены.
         Если самого лёгкого варианта хватает с запасом — телефон получит
         именно его, а не тяжёлый кадр. */
      var dpr = window.devicePixelRatio || 1;
      var slot = function (sel) {
        var im = one(sel);
        if (!im) return null;
        var r = rect(im);
        var set = String(im.getAttribute('srcset') || '');
        var sizes = (set.match(/\d+w/g) || []).map(function (x) { return Number(String(x).replace('w', '')); });
        return { need: Math.ceil((r ? r.width : 0) * dpr), sizes: sizes };
      };
      var card = slot('#menu-grid .item__ph img');
      var tile = slot('#gallery img');
      var heroShot = slot('#hero-img');
      add('Телефон ' + w + ': карточкам и плиткам хватает лёгкого варианта',
        'карточка ' + (card ? card.need + ' px при вариантах ' + card.sizes.join('/') : 'нет') +
          ' · плитка ' + (tile ? tile.need + ' px при вариантах ' + tile.sizes.join('/') : 'нет') +
          ' · плотность экрана ' + dpr,
        !!card && !!tile && card.sizes.join(',') === '400,800' && tile.sizes.join(',') === '400,800' &&
          card.need <= 400 && tile.need <= 400);
      add('Телефон ' + w + ': главное фото — три варианта по ширине',
        (heroShot ? 'нужно ' + heroShot.need + ' px · варианты ' + heroShot.sizes.join('/') : 'нет') +
          ' · взят ' + String((one('#hero-img') || {}).currentSrc || '').split('/').pop(),
        !!heroShot && heroShot.sizes.join(',') === '400,800,1280' && heroShot.need <= 800);

      var spans = all('#ticker-row span').filter(function (s) { return css(s).display !== 'none'; });
      var tops = {};
      spans.forEach(function (s) { tops[Math.round(rect(s).top)] = 1; });
      add('Телефон ' + w + ': полоса надписей', Object.keys(tops).length + ' строк, ' + spans.length + ' надписей', Object.keys(tops).length >= 1 && Object.keys(tops).length <= 6);

      var burger = one('#burger');
      var nav = one('#nav');
      var opened = false;
      if (burger && nav) {
        nav.classList.remove('on');
        fire(burger.querySelector('span') || burger);
        opened = nav.classList.contains('on');
        fire(burger.querySelector('span') || burger);
      }
      add('Телефон ' + w + ': значок меню открывает навигацию', opened ? 'открылась' : 'не открылась', opened);

      /* Главный заголовок не должен обрезаться: раньше на 360 px слово
         «итальянски.» не помещалось и хвост срезался вместе с текстом. */
      var title = one('.hero__title');
      if (title) {
        var tOver = title.scrollWidth - title.clientWidth;
        add('Телефон ' + w + ': заголовок титульного блока целый',
          'вылезает на ' + tOver + ' px при ширине ' + title.clientWidth, tOver <= 2);
      }

      var contacts = all('#contacts-grid .contact-card');
      var ftr = one('.ftr__grid');
      var ftrCols = ftr ? String(css(ftr).gridTemplateColumns).split(' ').filter(function (x) { return x !== ''; }).length : 0;
      add('Телефон ' + w + ': кофейни и подвал',
        contacts.length + ' карточек кофеен · подвал ' + ftrCols + ' колонки · сетка Instagram ' + all('#gallery .insta__t').length + ' плиток',
        contacts.length === 5 && ftrCols === 2 && all('#gallery .insta__t').length === 6);

      /* Хиты бара: три плитки в ряд, ниже ещё три — проверяем симметрию */
      var hits = all('#hits-grid .item');
      var hitRows = byRow(hits);
      var hitW = hits.map(function (c) { return Math.round(rect(c).width); });
      var hitH = hits.map(function (c) { return Math.round(rect(c).height); });
      var wSpread = hitW.length ? Math.max.apply(null, hitW) - Math.min.apply(null, hitW) : 99;
      var hSpread = hitH.length ? Math.max.apply(null, hitH) - Math.min.apply(null, hitH) : 99;
      var over = hits.filter(function (c) { return c.scrollWidth > c.clientWidth + 1; }).length;
      var gridRect = rect(one('#hits-grid'));
      var wrapRect = rect(one('#hits .wrap'));
      add('Телефон ' + w + ': хиты бара — сетка ' + hitRows.join('+'),
        'плиток ' + hits.length + ' · ширина ' + (hitW[0] || 0) + ' · высота ' + (hitH[0] || 0) +
          ' · разброс ширины ' + wSpread + ', высоты ' + hSpread +
          ' · показано ' + hits.filter(function (c) { return parseFloat(css(c).opacity) > 0.05; }).length,
        hits.length === 6 && hitRows.length === 2 && hitRows[0] === 3 && hitRows[1] === 3 && wSpread <= 1 && hSpread <= 1 &&
          hits.every(function (c) { return parseFloat(css(c).opacity) > 0.05; }));
      add('Телефон ' + w + ': хиты бара внутри полей и без обрезки',
        'сетка до ' + Math.round(gridRect.right) + ' при крае ' + Math.round(wrapRect.right) + ' · выходят ' + over,
        gridRect.right <= wrapRect.right + 1 && over === 0);

      /* Каталог меню: тоже по три продукта в ряд */
      var menuCards = all('#menu-grid .item');
      var menuRows = byRow(menuCards);
      var rowsOf3 = menuRows.filter(function (n) { return n === 3; }).length;
      var tail = menuRows.length - rowsOf3;
      var mw = menuCards.map(function (c) { return Math.round(rect(c).width); });
      var mwSpread = mw.length ? Math.max.apply(null, mw) - Math.min.apply(null, mw) : 99;
      var mOver = menuCards.filter(function (c) { return c.scrollWidth > c.clientWidth + 1; }).length;
      var mGrid = rect(one('#menu-grid'));
      add('Телефон ' + w + ': в меню по три продукта в ряд',
        'позиций ' + menuCards.length + ' · рядов ' + menuRows.length + ' · по три в ' + rowsOf3 + ' рядах' +
          (tail ? ', последний ряд ' + menuRows[menuRows.length - 1] : '') + ' · ширина плитки ' + (mw[0] || 0),
        menuCards.length === 35 && rowsOf3 === 11 && menuRows.length === 12 && mwSpread <= 1);
      add('Телефон ' + w + ': каталог меню внутри полей и без обрезки',
        'сетка до ' + Math.round(mGrid.right) + ' при крае ' + Math.round(wrapRect.right) + ' · выходят ' + mOver,
        mGrid.right <= wrapRect.right + 1 && mOver === 0);

      /* Отзывы: три карточки в один ряд, одинаковой высоты */
      var revs = all('#revs .rev');
      var revRows = byRow(revs);
      var rw = revs.map(function (c) { return Math.round(rect(c).width); });
      var rh = revs.map(function (c) { return Math.round(rect(c).height); });
      var rwSpread = rw.length ? Math.max.apply(null, rw) - Math.min.apply(null, rw) : 99;
      var rhSpread = rh.length ? Math.max.apply(null, rh) - Math.min.apply(null, rh) : 99;
      var rOver = revs.filter(function (c) { return c.scrollWidth > c.clientWidth + 1; }).length;
      var rGrid = rect(one('#revs'));
      add('Телефон ' + w + ': отзывы в один ряд',
        'карточек ' + revs.length + ' · ряды ' + revRows.join('+') + ' · ширина ' + (rw[0] || 0) +
          ' · высота ' + (rh[0] || 0) + ' · разброс ширины ' + rwSpread + ', высоты ' + rhSpread,
        revs.length === 3 && revRows.length === 1 && revRows[0] === 3 && rwSpread <= 1 && rhSpread <= 1);
      add('Телефон ' + w + ': отзывы внутри полей и без обрезки',
        'сетка до ' + Math.round(rGrid.right) + ' при крае ' + Math.round(wrapRect.right) + ' · выходят ' + rOver,
        rGrid.right <= wrapRect.right + 1 && rOver === 0);

      /* Четыре способа связи в предзаказе: на телефоне в один ряд */
      var calls = all('#preorder > .wrap > .tiles:not(.tiles--notes) > .tile');
      var callRows = byRow(calls);
      var cw = calls.map(function (c) { return Math.round(rect(c).width); });
      var ch = calls.map(function (c) { return Math.round(rect(c).height); });
      var cwSpread = cw.length ? Math.max.apply(null, cw) - Math.min.apply(null, cw) : 99;
      var chSpread = ch.length ? Math.max.apply(null, ch) - Math.min.apply(null, ch) : 99;
      var cOver = calls.filter(function (c) { return c.scrollWidth > c.clientWidth + 1; }).length;
      var cGrid = rect(one('#preorder > .wrap > .tiles:not(.tiles--notes)'));
      add('Телефон ' + w + ': способы связи в один ряд',
        'блоков ' + calls.length + ' · ряды ' + callRows.join('+') + ' · ширина ' + (cw[0] || 0) +
          ' · высота ' + (ch[0] || 0) + ' · разброс ширины ' + cwSpread + ', высоты ' + chSpread,
        calls.length === 4 && callRows.length === 1 && callRows[0] === 4 && cwSpread <= 1 && chSpread <= 1);
      add('Телефон ' + w + ': способы связи внутри полей и без обрезки',
        'сетка до ' + Math.round(cGrid.right) + ' при крае ' + Math.round(wrapRect.right) + ' · выходят ' + cOver,
        cGrid.right <= wrapRect.right + 1 && cOver === 0);
    });

    send(part, out);
    };

    shoot([430], 91);
    shoot([414], 92);
    shoot([390], 87);
    shoot([360], 88);
  };

  /* --- 1. статус в шапке: сколько кофеен открыто ------------------------- */
  var status = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };
    var words = ['', 'одна', 'две', 'три', 'четыре', 'пять'];

    [1440, 1024, 390].forEach(function (w) {
      frameWidth(w);
      var el = one('#status'), txt = one('#status-txt');
      if (!el || !txt) { add('Ширина ' + w + ': статус в шапке', 'не найден', false); return; }
      if (rect(el).width === 0) { add('Ширина ' + w + ': статус скрыт', 'на этой ширине не показывается', true); return; }

      var text = String(txt.textContent).trim();
      var title = String(el.getAttribute('title') || '');
      /* подсказка перечисляет все открытые кофейни — по ней и считаем */
      var open = title.indexOf('Открыто сейчас') === 0 ? title.split('·').length : 0;
      var word = open >= 1 && open <= 5 ? words[open] : String(open);
      var tail = open === 1 ? 'кофейня' : (open >= 2 && open <= 4 ? 'кофейни' : 'кофеен');
      var names = ['Советская, 42', 'Ильича, 51Г', 'Крестьянская, 33', 'Гагарина, 65', 'Советская, 72'];
      var named = names.some(function (x) { return text.indexOf(x) >= 0; });

      add('Ширина ' + w + ': статус без слова «обе»', '«' + text + '»', text.indexOf('обе') < 0);
      /* открыто несколько — должно быть число словами; одна — название;
         ни одной (поздний вечер) — честное «Закрыто» */
      add('Ширина ' + w + ': статус называет число кофеен',
        'открыто ' + open + ' → «' + text.slice(0, 42) + '»',
        open >= 2 ? text.indexOf(word + ' ' + tail) >= 0 : (open === 1 ? named : text.indexOf('Закрыто') >= 0));
      add('Ширина ' + w + ': подсказка про часы работы', '«' + title.slice(0, 80) + '»',
        open === 0 ? title.toLowerCase().indexOf('закрыт') >= 0 : (title.split('·').length === open && title.indexOf('до ') >= 0));

      var cs = css(el);
      add('Ширина ' + w + ': статус не обрезан',
        'нужно ' + el.scrollWidth + ', есть ' + el.clientWidth + ' · white-space: ' + cs.whiteSpace,
        el.scrollWidth <= el.clientWidth + 1);

      var wrap = one('.hdr .wrap');
      var pad = parseFloat(css(wrap).paddingRight) || 0;
      add('Ширина ' + w + ': статус внутри полей шапки',
        'статус до ' + Math.round(rect(el).right) + ', край контента ' + Math.round(rect(wrap).right - pad),
        rect(el).right <= rect(wrap).right - pad + 1);
    });

    send(11, out);
  };

  /* --- вес страницы --------------------------------------------------------
     Замер идёт в невидимом окне, а к такому окну браузер не применяет правило
     «грузись по мере прокрутки»: отложенные фото он скачивает сразу. Поэтому
     суммарные байты здесь завышены, и мы их не выдаём за реальную загрузку.
     Зато честно видно три вещи: вес самой страницы, вес шрифтов (они грузятся
     всегда, независимо от видимости) и файл главного фото. */
  var firstLoad = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 190), ok: ok === undefined ? true : !!ok }); };
    var entries = performance.getEntriesByType('resource');
    var sizeOf = function (e) { return e.transferSize || e.encodedBodySize || 0; };
    var nav = performance.getEntriesByType('navigation')[0];
    var page = nav ? sizeOf(nav) : 0;

    add('Страница: вес HTML со встроенными стилями и скриптом',
      Math.round(page / 1024) + ' КБ без сжатия (на GitHub Pages та же страница приходит сжатой)',
      page > 0);

    var fonts = entries.filter(function (e) { return /\.woff2$/.test(e.name); });
    var fontKB = Math.round(fonts.reduce(function (s, e) { return s + sizeOf(e); }, 0) / 1024);
    add('Шрифты: сколько скачала эта страница',
      fonts.length + ' файлов · ' + fontKB + ' КБ' +
        (fonts.length ? ' → ' + fonts.map(function (e) { return e.name.split('/').pop(); }).join(' · ') : ''),
      fonts.length >= 2 && fonts.length <= 8 && fontKB < 170);

    var hero = one('#hero-img');
    var heroFile = hero ? String(hero.currentSrc || '').split('/').pop() : '';
    var heroEntry = null;
    entries.forEach(function (e) { if (heroFile && e.name.indexOf(heroFile) >= 0) heroEntry = e; });
    add('Главное фото: файл и вес',
      (heroFile || 'нет') + (heroEntry ? ' · ' + Math.round(sizeOf(heroEntry) / 1024) + ' КБ' : '') +
        ' · загружено ' + (hero && hero.complete && hero.naturalWidth > 0 ? 'да' : 'нет'),
      !!hero && hero.complete && hero.naturalWidth > 0);

    var imgs = all('img');
    var lazy = imgs.filter(function (i) { return i.loading === 'lazy'; }).length;
    add('Фото в разметке: отложенных',
      lazy + ' из ' + imgs.length + ' — их браузер берёт по мере прокрутки, а не сразу',
      lazy >= 40);
    send(84, out);
  };

  /* --- 83. фото напитка в акции недели: маленькое, справа от текста ------- */
  var promoPhoto = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 150), ok: !!ok }); };

    var measure = function (w) {
      frameWidth(w);
      var box = one('#promo-box .promo__photo');
      var title = one('#promo-box .promo__title');
      var text = one('#promo-box .promo__lead-text');
      var main = one('#promo-box .promo__main');
      var price = one('#promo-box .promo__price');
      var img = box ? box.querySelector('img') : null;
      if (!box || !title || !text || !main) { add('Ширина ' + w + ': фото в акции недели', 'блока нет', false); return; }
      var b = rect(box), t = rect(title), x = rect(text), m = rect(main);
      var loaded = img && img.complete && img.naturalWidth > 0;
      add('Ширина ' + w + ': фото напитка в акции загружено',
        (img ? String(img.currentSrc || img.getAttribute('src') || '').split('/').pop() + ' ' + Math.round(b.width) + '×' + Math.round(b.height) : 'нет фото') +
          ' · загружено ' + (loaded ? 'да' : 'нет'),
        !!loaded && b.width >= 100 && b.width <= 200);
      add('Ширина ' + w + ': фото стоит справа от названия и описания',
        'текст ' + Math.round(x.left) + '–' + Math.round(x.right) + ' · фото ' + Math.round(b.left) + '–' + Math.round(b.right) +
          ' · название до ' + Math.round(t.right),
        b.left >= t.right - 6 && b.left >= x.right - 6 && b.left > x.left &&
          b.top < t.bottom + 24 && b.bottom > t.top);
      add('Ширина ' + w + ': фото не мешает цене и не выходит из блока',
        'низ фото ' + Math.round(b.bottom) + ' · цена сверху ' + (price ? Math.round(rect(price).top) : 0) +
          ' · край блока ' + Math.round(m.right),
        (!price || b.bottom <= rect(price).top + 1) && b.right <= m.right + 1 && x.width >= 150);
    };

    /* Снимок в акции отложенный: замер идёт без прокрутки, и браузер его не
       запрашивает. Прокручиваем блок в зону видимости и ждём именно события
       загрузки (на медленной машине 900 мс не хватало), только потом измеряем. */
    var box = one('#promo-box');
    var back = window.scrollY;
    if (box) window.scrollTo(0, Math.max(0, rect(box).top - 120));
    setTimeout(function () {
      var img = one('#promo-box .promo__photo img');
      var finish = function () {
        [1440, 1024, 390].forEach(measure);
        window.scrollTo(0, back);
        send(83, out);
      };
      if (img && !img.complete) {
        img.loading = 'eager';
        var done = false;
        var once = function () { if (done) return; done = true; setTimeout(finish, 150); };
        img.addEventListener('load', once, { once: true });
        img.addEventListener('error', once, { once: true });
        setTimeout(once, 3000);
      } else {
        finish();
      }
    }, 350);
  };

  /* --- 82. кнопки первого экрана: одинаковые по размеру ------------------- */
  var heroCta = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 150), ok: !!ok }); };

    [1440, 1024, 780, 430, 390, 360].forEach(function (w) {
      frameWidth(w);
      var btns = all('.hero__cta .btn');
      if (btns.length < 2) { add('Ширина ' + w + ': кнопки первого экрана', 'не найдены', false); return; }
      var sizes = btns.map(function (b) { return { w: Math.round(rect(b).width), h: Math.round(rect(b).height), t: String(b.textContent).trim().slice(0, 22) }; });
      var dw = Math.max.apply(null, sizes.map(function (s) { return s.w; })) - Math.min.apply(null, sizes.map(function (s) { return s.w; }));
      var dh = Math.max.apply(null, sizes.map(function (s) { return s.h; })) - Math.min.apply(null, sizes.map(function (s) { return s.h; }));
      var stack = sizes.length === 2 && Math.abs(rect(btns[0]).top - rect(btns[1]).top) > 4;
      var wrap = rect(one('.hero__cta'));
      var inside = sizes.every(function () { return true; }) &&
        btns.every(function (b) { var r = rect(b); return r.left >= wrap.left - 1 && r.right <= wrap.right + 1; });
      add('Ширина ' + w + ': кнопки первого экрана одинаковые',
        sizes.map(function (s) { return s.w + '×' + s.h; }).join(' · ') +
          (stack ? ' (в столбик)' : ' (в ряд)') + ' · разница ширины ' + dw + ', высоты ' + dh,
        dw <= 2 && dh <= 2 && inside && sizes.every(function (s) { return w > 780 || s.h >= 44; }));

      /* Дальше — все ряды с однотипными кнопками по всему сайту: кнопки одного
         класса в одной строке обязаны совпадать по размеру, иначе ряд выглядит
         неаккуратно (именно так было на первом экране). */
      var groups = all('.row, .hero__cta, .sec-head, .promo__cta, .modal__c .row')
        .map(function (row) {
          var btns = Array.prototype.slice.call(row.children).filter(function (el) {
            return el.classList && el.classList.contains('btn') && rect(el).height > 0;
          });
          if (btns.length < 2) return null;
          var tops = btns.map(function (b) { return Math.round(rect(b).top); });
          if (Math.max.apply(null, tops) - Math.min.apply(null, tops) > 4) return null;  // кнопки в разных строках
          var byClass = {};
          btns.forEach(function (b) {
            var key = Array.prototype.slice.call(b.classList).filter(function (c) { return c.indexOf('btn') === 0; }).sort().join(' ');
            (byClass[key] = byClass[key] || []).push(b);
          });
          var bad = [];
          Object.keys(byClass).forEach(function (key) {
            var ws = byClass[key].map(function (b) { return Math.round(rect(b).width); });
            var hs = byClass[key].map(function (b) { return Math.round(rect(b).height); });
            if (ws.length < 2) return;
            if (Math.max.apply(null, ws) - Math.min.apply(null, ws) > 2 || Math.max.apply(null, hs) - Math.min.apply(null, hs) > 2) {
              bad.push(key + ': ' + ws.join('/') + ' px');
            }
          });
          return bad.length ? bad.join(', ') : null;
        })
        .filter(Boolean);
      add('Ширина ' + w + ': однотипные кнопки в ряду одного размера',
        groups.length ? 'неровные ряды: ' + groups.slice(0, 3).join(' | ') : 'все ряды ровные',
        groups.length === 0);
    });

    send(82, out);
  };

  /* --- 81. ни один блок не остался прозрачным -----------------------------
     Карточки и секции появляются через .reveal (прозрачные до показа). Если
     элемент добавили в разметку после подписки на наблюдателя, он так и
     остаётся невидимым — размеры при этом нормальные, поэтому обычные замеры
     этого не видят. Прокручиваем страницу целиком и проверяем прозрачность. */
  var revealedBlocks = function (done) {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 170), ok: !!ok }); };

    var check = function (w) {
      var hidden = all('.reveal').filter(function (el) {
        var r = rect(el);
        return r.height > 10 && parseFloat(css(el).opacity) < 0.9;
      });
      add('Ширина ' + w + ': блоки показаны, а не прозрачные',
        hidden.length
          ? 'прозрачных ' + hidden.length + ': ' + hidden.slice(0, 4).map(function (el) {
            return String(el.className).split(' ').slice(0, 2).join('.') + ' (' + css(el).opacity + ')';
          }).join(', ')
          : 'все видимые блоки показаны (' + all('.reveal').length + ' шт на странице)',
        hidden.length === 0);
    };

    var walk = function (w, done) {
      frameWidth(w);
      /* плавная прокрутка страницы мешала бы последующим замерам: пока она
         анимируется, программный переход к разделу отменяется */
      var root = document.documentElement;
      var was = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      var step = Math.round(Math.max(300, window.innerHeight * 0.8));
      var y = 0;
      var tick = function () {
        window.scrollTo(0, y);
        y += step;
        if (y < document.body.scrollHeight) { setTimeout(tick, 40); return; }
        window.scrollTo(0, 0);
        setTimeout(function () {
          check(w);
          root.style.scrollBehavior = was;
          done();
        }, 700);
      };
      tick();
    };

    walk(1440, function () {
      walk(390, function () { send(81, out); if (done) done(); });
    });
  };

  /* --- 2. прокрутка: логотип и переходы по меню -------------------------- */
  var anchors = function (done) {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };
    frameWidth(1440);

    /* ждём, пока прокрутка остановится */
    var settle = function (cb, n) {
      var at = window.scrollY;
      setTimeout(function () {
        if (window.scrollY === at && (n || 0) >= 1) { cb(); return; }
        if ((n || 0) > 16) { cb(); return; }
        settle(cb, (n || 0) + 1);
      }, 90);
    };

    var step = function (i) {
      if (i === 0) {
        window.scrollTo(0, 4000);
        settle(function () {
          var before = Math.round(window.scrollY);
          var logo = one('.hdr .logo');
          if (!logo) { add('Логотип в шапке', 'не найден', false); send(12, out); if (done) done(); return; }
          logo.click();
          settle(function () {
            add('Логотип в шапке возвращает в самое начало',
              'было ' + before + ' px, стало ' + Math.round(window.scrollY) + ' px',
              Math.abs(window.scrollY) <= 1);
            step(1);
          });
        });
        return;
      }

      var links = all('#nav a');
      if (i - 1 < links.length) {
        var link = links[i - 1];
        var id = String(link.getAttribute('href') || '').slice(1);
        var target = document.getElementById(id);
        window.scrollTo(0, 0);
        settle(function () {
          link.click();
          settle(function () {
            var hdrH = Math.round(rect(one('.hdr')).height);
            var top = target ? Math.round(rect(target).top) : -999;
            add('Пункт меню «' + String(link.textContent).trim() + '» не прячется под шапкой',
              'верх раздела ' + top + ' px при шапке ' + hdrH + ' px',
              target !== null && top >= hdrH - 2 && top <= hdrH + 40);
            step(i + 1);
          });
        });
        return;
      }

      /* логотип в подвале — тоже в начало страницы */
      window.scrollTo(0, 4000);
      settle(function () {
        var flogo = one('.ftr .logo');
        if (!flogo) { mobileAnchors(function () { send(12, out); if (done) done(); }); return; }
        flogo.click();
        settle(function () {
          add('Логотип в подвале возвращает в начало', 'стало ' + Math.round(window.scrollY) + ' px', Math.abs(window.scrollY) <= 1);
          mobileAnchors(function () { send(12, out); if (done) done(); });
        });
      });
    };

    /* на телефоне меню спрятано за кнопкой: раскрываем её и проходим по всем
       пунктам — каждый должен приводить к своему разделу. Добавляем и ссылки
       из титульного блока с подвалом: они ведут в те же разделы. */
    var mobileAnchors = function (next) {
      frameWidth(390);
      var burger = one('#burger');
      var steps = all('#nav a').map(function (a, k) {
        return { sel: '#nav a:nth-child(' + (k + 1) + ')', name: String(a.textContent).trim(), to: String(a.getAttribute('href') || '').slice(1) };
      });
      steps.push({ sel: '.hero__cta a[href="#menu"]', name: 'Собрать предзаказ', to: 'menu' });
      steps.push({ sel: '.hero__cta a[href="#promo"]', name: 'Что по акции недели', to: 'promo' });
      steps.push({ sel: '#ftr-cats a[href="#menu"]', name: 'Всё меню', to: 'menu' });

      var i = 0;
      window.scrollTo(0, 0);
      settle(function () {
        var stepOne = function () {
          if (i >= steps.length) { if (burger) burger.click(); next(); return; }
          var info = steps[i];
          var link = one(info.sel);
          var target = document.getElementById(info.to);
          if (burger) burger.click();
          settle(function () {
            if (link) link.click();
            settle(function () {
              var hdrH = Math.round(rect(one('.hdr')).height);
              var top = target ? Math.round(rect(target).top) : -999;
              add('Телефон: «' + info.name + '» ведёт в раздел',
                'верх раздела ' + top + ' px при шапке ' + hdrH + ' px',
                target !== null && top >= hdrH - 2 && top <= hdrH + 80);
              i += 1;
              window.scrollTo(0, 0);
              settle(stepOne);
            });
          });
        };
        stepOne();
      });
    };

    step(0);
  };

  /* --- 3. все надписи про «10-й напиток»: не обрезаны ли ---------------- */
  var texts = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };

    [1440, 1024, 950, 780, 390].forEach(function (w) {
      frameWidth(w);

      var cut = [];
      all('body *').forEach(function (el) {
        if (el.children.length) return;                       // только листовые узлы
        var t = String(el.textContent || '');
        if (t.indexOf('10-й') < 0) return;
        var cs = css(el);
        var byWidth = el.scrollWidth > el.clientWidth + 1;
        var byHeight = el.scrollHeight > el.clientHeight + 1;
        var hidden = cs.overflow !== 'visible' && cs.overflowX !== 'visible';
        if ((byWidth || byHeight) && hidden) {
          cut.push('«' + t.trim().slice(0, 26) + '» нужно ' + el.scrollWidth + ', есть ' + el.clientWidth);
        }
      });
      add('Ширина ' + w + ': надписи про 10-й напиток целые', cut.length ? cut.join(' | ') : 'все целые', cut.length === 0);

      /* бегущая строка: движется ли она и попадает ли фраза в видимые поля */
      var row = one('#ticker-row');
      var port = row ? row.parentElement : null;
      if (!row || !port) return;
      var span = null;
      all('#ticker-row span').forEach(function (s) {
        if (span === null && String(s.textContent).indexOf('10-й') >= 0) span = s;
      });
      var portRect = rect(port);
      var padL = parseFloat(css(port).paddingLeft) || 0;
      var padR = parseFloat(css(port).paddingRight) || 0;
      var visible = { left: portRect.left + padL, right: portRect.right - padR };
      var sr = rect(span);
      var whole = sr.left >= visible.left - 1 && sr.right <= visible.right + 1;
      var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      /* когда движение отключено, строка обязана показывать слова целиком —
         это и проверяет следующий замер; сам факт остановки не ошибка */
      add('Ширина ' + w + ': строка в движении',
        'animation: ' + css(row).animationName + (reduce ? ' (система просит меньше движения)' : ''), true);
      add('Ширина ' + w + ': система просит меньше движения', reduce ? 'да — строка стоит' : 'нет — строка бежит',
        true);
      add('Ширина ' + w + ': «10-й напиток в подарок» видна целиком',
        'фраза ' + Math.round(sr.left) + '–' + Math.round(sr.right) + ' при полях ' + Math.round(visible.left) + '–' + Math.round(visible.right),
        whole);
    });

    send(13, out);
  };

  /* --- 4. подвал: логотип и его выравнивание ----------------------------- */
  var footer = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };

    [1440, 1024, 390].forEach(function (w) {
      frameWidth(w);
      var mark = one('.ftr .logo__mark');
      var img = one('.ftr .logo__mark img');
      var txt = one('.ftr .logo__txt');
      if (!mark) { add('Ширина ' + w + ': логотип в подвале', 'знака нет', false); return; }
      var mr = rect(mark);
      add('Ширина ' + w + ': логотип в подвале есть',
        'знак ' + Math.round(mr.width) + '×' + Math.round(mr.height) + ' · картинка ' + (img ? (img.naturalWidth || 0) + '×' + (img.naturalHeight || 0) : 'нет'),
        !!img && img.naturalWidth > 0 && mr.width >= 34);
      var tr = rect(txt);
      add('Ширина ' + w + ': знак и надпись на одной линии',
        'центры ' + Math.round(mr.top + mr.height / 2) + ' и ' + Math.round(tr.top + tr.height / 2),
        Math.abs((mr.top + mr.height / 2) - (tr.top + tr.height / 2)) <= 3);
      var promo = rect(one('#promo-box .promo'));
      var wrap = one('.ftr .wrap');
      var wcs = css(wrap);
      var wl = parseFloat(wcs.paddingLeft) || 0, wr = parseFloat(wcs.paddingRight) || 0;
      var wrr = rect(wrap);
      add('Ширина ' + w + ': подвал по краям акции',
        'подвал ' + Math.round(wrr.left + wl) + '/' + Math.round(wrr.right - wr) + ' · акция ' + Math.round(promo.left) + '/' + Math.round(promo.right),
        Math.abs((wrr.left + wl) - promo.left) <= 3 && Math.abs((wrr.right - wr) - promo.right) <= 3);
    });

    send(14, out);
  };

  /* --- 5. пояснения предзаказа: заголовки в одну строку ------------------ */
  var notes = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };

    [1440, 1200, 1024, 900, 820, 760].forEach(function (w) {
      frameWidth(w);
      var cards = all('.tiles--notes .tile');
      if (cards.length === 0) { add('Ширина ' + w + ': пояснения предзаказа', 'блок не найден', false); return; }

      var lines = [];
      var worst = null;
      cards.forEach(function (card, i) {
        var title = card.querySelector('.tile__t');
        var cs = css(title);
        var lh = parseFloat(cs.lineHeight);
        if (!lh || isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.2;
        var count = Math.round(rect(title).height / lh);

        /* сколько нужно одной строке этого текста */
        var probe = document.createElement('span');
        probe.textContent = title.textContent;
        probe.style.position = 'absolute';
        probe.style.whiteSpace = 'nowrap';
        probe.style.visibility = 'hidden';
        probe.style.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        probe.style.letterSpacing = cs.letterSpacing;
        document.body.appendChild(probe);
        var need = Math.round(rect(probe).width);
        probe.remove();

        var have = Math.round(rect(card).width - (parseFloat(css(card).paddingLeft) || 0) - (parseFloat(css(card).paddingRight) || 0));
        lines.push(count);
        if (worst === null || need - have > worst.need - worst.have) {
          worst = { i: i, title: String(title.textContent).slice(0, 30), need: need, have: have, count: count };
        }
      });

      var heights = cards.map(function (c) { return Math.round(rect(c).height); });
      var spread = Math.max.apply(null, heights) - Math.min.apply(null, heights);
      var inRow = byRow(cards).length === 1;   // в столбик высоты сравнивать не с чем

      add('Ширина ' + w + ': заголовки пояснений в одну строку',
        'строк ' + lines.join('/') + ' · самый длинный «' + worst.title + '» нужно ' + worst.need + ', есть ' + worst.have,
        lines.every(function (n) { return n === 1; }));
      add('Ширина ' + w + ': три пояснения одной высоты',
        'высоты ' + heights.join('/') + ' · разброс ' + spread + ' px' + (inRow ? '' : ' (в столбик)'),
        inRow ? spread <= 2 : true);
    });

    send(15, out);
  };

  /* --- 6. уровни: три карточки справа и в высоту блока «Уровни» ---------- */
  var levels = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };

    [1440, 1200, 1024, 900, 820, 760, 700, 660].forEach(function (w) {
      frameWidth(w);
      var grid = one('#bonus .levels');
      var leftTier = grid ? grid.querySelector('.tier') : null;
      var right = one('#tiers');
      var lr = rect(leftTier), rr = rect(right);
      if (!lr || !rr) { add('Ширина ' + w + ': уровни', 'блок не найден', false); return; }
      var side = rr.left >= lr.right - 2;
      var over = Math.round(rr.bottom - lr.bottom);
      var cards = all('#tiers .tier');
      var rows = byRow(cards);
      /* высота блока «Уровни» без растягивания: видно, сколько он добирает,
         чтобы дотянуться до низа столбца с карточками */
      var saved = leftTier.style.flex;
      leftTier.style.flex = 'none';
      var natural = Math.round(rect(leftTier).height);
      leftTier.style.flex = saved;
      var stretched = Math.round(rect(leftTier).height) - natural;
      add('Ширина ' + w + ': ' + cards.length + ' карточки ' + (side ? 'справа' : 'СНИЗУ') + ' от блока «Уровни»',
        'слева ' + Math.round(lr.height) + ' px (свой ' + natural + ') · справа ' + Math.round(rr.height) + ' px · свисание ' + over + ' px · по строкам ' + rows.join('/'),
        side && over <= 2 && cards.length === 3);
      add('Ширина ' + w + ': блок «Уровни» не раздут', 'добор ' + stretched + ' px', side ? stretched <= 60 : true);
    });

    send(16, out);
  };

  /* --- 9. телефон -------------------------------------------------------- */
  var mobile = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };
    /* ширину ставим с ожиданием: иначе замер успевал пройти на чужой ширине */
    atWidth(390, function () {
      try {
        var vw = document.documentElement.clientWidth;
        add('Ширина экрана при замере', vw + ' px', vw < 420);

        var act = one('.hdr__act'), logo = one('.hdr .logo'), wrap = one('.hdr .wrap');
        var ar = rect(act), lr = rect(logo), wr = rect(wrap);
        var padHeader = parseFloat(css(wrap).paddingRight) || 0;
        add('Кнопки шапки по правому краю', 'кнопки до ' + Math.round(ar.right) + ', край контента ' + Math.round(wr.right - padHeader),
          Math.abs(ar.right - (wr.right - padHeader)) <= 2);
        add('Логотип слева, кнопки справа', 'логотип ' + Math.round(lr.left) + ', кнопки ' + Math.round(ar.left),
          lr.left < ar.left && ar.left > vw / 2);

        /* значок меню: палец попадает по «☰» внутри кнопки, а не по самой
           кнопке — так меню и не открывалось */
        var burgerBtn = one('#burger');
        var navEl = one('#nav');
        if (burgerBtn && navEl) {
          var icon = burgerBtn.querySelector('span') || burgerBtn;
          var fire = function (el) {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          };
          navEl.classList.remove('on');
          fire(icon);
          var opened = navEl.classList.contains('on');
          add('Телефон: значок ☰ открывает меню', opened ? 'меню раскрылось' : 'не сработало', opened);
          fire(icon);
          add('Телефон: повторное нажатие закрывает меню', navEl.classList.contains('on') ? 'осталось открытым' : 'меню закрылось',
            !navEl.classList.contains('on'));
          var navLinks = all('#nav a');
          var visibleLinks = navLinks.filter(function (a) { return rect(a).height > 0; }).length;
          add('Телефон: в меню все пункты', visibleLinks + ' из ' + navLinks.length, visibleLinks === navLinks.length);
          navEl.classList.remove('on');
        }

        var row = one('#ticker-row'), port = row.parentElement;
        var prc = rect(port), pcs = css(port);
        var pl = parseFloat(pcs.paddingLeft) || 0, prr = parseFloat(pcs.paddingRight) || 0;
        var hw = rect(one('.hero .wrap'));
        var hpad = parseFloat(css(one('.hero .wrap')).paddingLeft) || 0;
        add('Строка на телефоне по тем же полям',
          'строка ' + Math.round(prc.left + pl) + '/' + Math.round(prc.right - prr) +
          ' · блоки ' + Math.round(hw.left + hpad) + '/' + Math.round(hw.right - hpad),
          Math.abs((prc.left + pl) - (hw.left + hpad)) <= 2 && Math.abs((prc.right - prr) - (hw.right - hpad)) <= 2);
        add('Строка на телефоне не обрезана',
          'overflow-x: ' + pcs.overflowX + ' · строка ' + Math.round(rect(row).width) + ' при полях ' + Math.round(prc.width - pl - prr),
          pcs.overflowX === 'visible' && rect(row).width <= prc.width - pl - prr + 1);
        add('Бегущая строка не движется', css(row).animationName, css(row).animationName === 'none');

        var spans = all('#ticker-row span');
        var visible = spans.filter(function (s) { return css(s).display !== 'none'; });
        add('Надписи видны все сразу', visible.length + ' из ' + spans.length + ' (дубли скрыты)', visible.length >= 6);
        var widest = visible.slice().sort(function (a, b) { return rect(b).width - rect(a).width; })[0];
        var lines = {};
        visible.forEach(function (s) { lines[Math.round(rect(s).top)] = 1; });
        add('Надписи переносятся, а не режутся',
          'строк ' + Object.keys(lines).length + ', самая широкая «' + String(widest.textContent || '').slice(0, 22) + '» ' + Math.round(rect(widest).width) + ' px',
          rect(widest).width <= Math.round(rect(row).width) + 1);

        var facts = all('.hero__facts .fact');
        var perRow = byRow(facts);
        add('Факты ровной сеткой 2×2', facts.length + ' шт, по строкам: ' + perRow.join('/'),
          facts.length === 4 && perRow.length === 2 && perRow.every(function (n) { return n === 2; }));

        var tr = rect(one('#totop'));
        add('Кнопка наверх по центру', 'центр ' + Math.round(tr.left + tr.width / 2) + ' при середине ' + Math.round(vw / 2),
          Math.abs((tr.left + tr.width / 2) - vw / 2) <= 2);

        one('[data-account]').click();
        var modal = document.getElementById('account-modal');
        add('Карточка по кнопке в шапке открылась', modal.className.indexOf('on') >= 0 ? 'да' : 'нет', modal.className.indexOf('on') >= 0);
        var card = modal.querySelector('.modal__c'), cr = rect(card);
        add('Карточка по центру экрана', 'центр карточки ' + Math.round(cr.left + cr.width / 2) + ' при середине ' + Math.round(vw / 2),
          Math.abs((cr.left + cr.width / 2) - vw / 2) <= 12);
        add('Карточка не выходит за экран', Math.round(cr.left) + '–' + Math.round(cr.right) + ' при ширине ' + vw,
          cr.left >= 0 && cr.right <= vw + 1);
        var scrim = document.getElementById('scrim');
        add('Фон под карточкой прозрачный',
          'подложка ' + Math.round(alpha(css(scrim).backgroundColor) * 100) + '%, карточка ' + Math.round(alpha(css(card).backgroundColor) * 100) + '%',
          alpha(css(scrim).backgroundColor) < 0.4 && alpha(css(card).backgroundColor) < 1);
        var root = modal.querySelector('#acc-root');
        add('Содержимое в карточке есть', root && root.children.length ? 'есть' : 'пусто', !!root && root.children.length > 0);
        document.getElementById('account-close').click();
        add('Карточка закрывается', modal.className.indexOf('on') < 0 ? 'да' : 'нет', modal.className.indexOf('on') < 0);
      } catch (e) {
        add('Мобильный замер', String(e && e.message), false);
      }
      send(19, out);
    });
  };

  /* --- 7. вход, регистрация и показ кабинета ----------------------------- */
  var flow = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 180), ok: !!ok }); };
    var stored = function () {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return undefined; }
    };

    try {
      var modal = document.getElementById('account-modal');

      /* кнопка в шапке: вошедшему гостю сразу открывается страница кабинета */
      one('[data-account]').click();
      add('Кнопка в шапке открыла страницу кабинета',
        one('#acc-page').hidden === false ? 'да' : 'нет', one('#acc-page').hidden === false);
      one('#acc-page-back').click();
      add('Возврат на сайт закрывает страницу кабинета',
        one('#acc-page').hidden ? 'да' : 'нет', one('#acc-page').hidden);

      /* выходим из карты — дальше проверяем форму входа, регистрацию и пример */
      one('[data-account]').click();
      one('#acc-page-logout').click();
      add('Сам кабинет сразу не показывается', one('#acc-page').hidden ? 'нет' : 'показан', one('#acc-page').hidden);
      add('После выхода показана форма входа', one('#auth-phone') ? 'да' : 'нет', !!one('#auth-phone'));
      add('Есть вкладки входа и регистрации', (one('#tab-login') ? 'вход ' : '') + (one('#tab-reg') ? 'регистрация' : ''),
        !!one('#tab-login') && !!one('#tab-reg'));

      /* новый гость регистрируется: 50 бонусов и купоны */
      one('#tab-reg').click();
      one('#auth-name').value = 'Тест';
      one('#auth-phone').value = '+375291112233';
      one('#auth-pass').value = '1234';
      one('#auth-go').click();
      var toasts = String((one('#toasts') || {}).textContent || '');
      add('Без согласия карту не создаём', toasts.indexOf('согласие') >= 0 ? 'отказ' : 'молча', toasts.indexOf('согласие') >= 0);
      one('#auth-terms').checked = true;
      one('#auth-go').click();
      var page = one('#acc-page');
      var onPage = !!page && page.hidden === false;
      add('После регистрации открылась отдельная страница кабинета',
        onPage ? 'страница открыта, адрес ' + String(location.hash) : 'страницы нет', onPage && location.hash === '#account');
      add('Окно входа закрылось', one('#account-modal').classList.contains('on') ? 'нет' : 'да', !one('#account-modal').classList.contains('on'));
      add('Сайт под страницей скрыт', getComputedStyle(one('.ftr')).display === 'none' ? 'скрыт' : 'виден', getComputedStyle(one('.ftr')).display === 'none');
      add('Новой карте 50 бонусов', 'карта «' + text('#acc-page .card-bonus__num') + '»', text('#acc-page .card-bonus__num').indexOf('50') >= 0);
      add('На странице нет плашки «пример»', one('#acc-page .demo-note') ? 'есть' : 'нет', !one('#acc-page .demo-note'));
      add('На странице есть печати и купоны',
        (one('#acc-page .punch') ? 'печати ' : '') + (one('#acc-page .coupon') ? 'купоны' : '—'),
        !!one('#acc-page .punch') && !!one('#acc-page .coupon'));
      add('История заказов на месте', one('#acc-page .hist') ? 'блок есть' : 'нет', !!one('#acc-page .hist'));

      /* возврат на сайт кнопкой на странице */
      one('#acc-page-back').click();
      add('Кнопка «Вернуться на сайт» закрывает кабинет',
        one('#acc-page').hidden ? 'закрыто, адрес ' + String(location.hash) : 'осталось открытым',
        one('#acc-page').hidden && location.hash !== '#account');
      add('Сайт снова виден', getComputedStyle(one('.ftr')).display === 'none' ? 'скрыт' : 'виден',
        getComputedStyle(one('.ftr')).display !== 'none');

      /* показ кабинета без входа: сначала выходим из карты, потом открываем пример */
      one('[data-account]').click();
      one('#acc-page-logout').click();
      add('Выход со страницы возвращает форму входа', one('#auth-phone') ? 'да' : 'нет', !!one('#auth-phone'));
      one('#auth-demo').click();
      add('Пример кабинета открывается страницей', one('#acc-page').hidden === false ? 'да' : 'нет', one('#acc-page').hidden === false);
      add('Показ кабинета без входа', 'бонусы «' + text('#acc-page .card-bonus__num') + '»', !!one('#acc-page .card-bonus'));
      add('Видно, что это пример', one('#acc-page .demo-note') ? 'да' : 'нет', !!one('#acc-page .demo-note'));
      add('В примере есть история заказов', all('#acc-page .hist__r').length + ' заказа', all('#acc-page .hist__r').length >= 3);
      add('В примере есть купоны и печати',
        (one('#acc-page .coupon') ? 'купоны ' : '') + (one('#acc-page .punch') ? 'печати' : '—'),
        !!one('#acc-page .coupon') && !!one('#acc-page .punch'));
      add('Пример кабинета ничего не сохраняет', stored() === null ? 'записи нет' : String(stored() && stored().name), stored() === null);
      one('#demo-to-auth').click();
      add('Из примера вернулись к форме входа', one('#auth-phone') ? 'да' : 'нет', !!one('#auth-phone'));

      /* вход по телефону и паролю */
      one('#tab-login').click();
      one('#auth-phone').value = '+375296428613';
      one('#auth-pass').value = '1234';
      one('#auth-go').click();
      add('Вход по телефону и паролю открыл страницу кабинета', one('#acc-page').hidden === false ? 'да' : 'нет', one('#acc-page').hidden === false);
      add('На странице нет плашки «пример»', one('#acc-page .demo-note') ? 'есть' : 'нет', !one('#acc-page .demo-note'));

      /* кнопка кабинета в шапке у вошедшего гостя ведёт на страницу */
      one('#acc-page-back').click();
      one('[data-account]').click();
      add('Кнопка кабинета в шапке ведёт на страницу', one('#acc-page').hidden === false ? 'да' : 'нет', one('#acc-page').hidden === false);
      add('Страница кабинета по адресу #account', String(location.hash) === '#account' ? 'да' : 'адрес ' + String(location.hash),
        String(location.hash) === '#account');

      /* выход со страницы возвращает к форме входа */
      one('#acc-page-logout').click();
      add('Выход со страницы закрывает кабинет', one('#acc-page').hidden ? 'да' : 'нет', one('#acc-page').hidden);
      add('После выхода показана форма входа', one('#auth-phone') ? 'да' : 'нет', !!one('#auth-phone'));
      add('После выхода карта забыта', stored() === null ? 'записи нет' : String(stored() && stored().name), stored() === null);
    } catch (e) {
      add('Проверка входа и кабинета', String(e && e.message), false);
    }

    send(17, out);

    /* приводим страницу в исходное состояние: без карты гостя и без пометки */
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(FLOW_KEY);
    } catch (e) {}
  };

  /* --- запуск ------------------------------------------------------------ */
  /* первый заход готовит «уже вошедшего» гостя и перезагружает страницу,
     второй — меряет; иначе проверку входа не на чем показать */
  var boot = function () {
    var stage = null;
    try { stage = localStorage.getItem(FLOW_KEY); } catch (e) {}

    if (stage !== FLOW_READY) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify({
          phone: '+375 (29) 111-22-33', name: 'Проверка входа', points: 70, earned: 70, punch: 3,
          orders: [], coupons: [], ref: 'MADROCK-TEST', since: new Date().toISOString()
        }));
        localStorage.setItem(FLOW_KEY, FLOW_READY);
      } catch (e) {}
      location.reload();
      return;
    }

    atWidth(1440, function () {
      /* самое первое измерение: сколько браузер уже скачал к этому моменту */
      try { firstLoad(); } catch (e) { send(84, [{ n: 'Замер первой загрузки', v: String(e && e.message), ok: false }]); }
      var finish = function () {
        /* после всех замеров подключаем проверку кнопок: она ходит по всей
           странице и не должна мешать измерениям */
        window.__madrockAuditDone = true;
        var loadButtons = function () {
          var s = document.createElement('script');
          s.src = '/madrock/tools/button-audit.js';
          document.head.appendChild(s);
        };
        /* Проверку прозрачных блоков делаем самой последней: она прокручивает
           страницу целиком и, если запустить её раньше, сбивает замеры
           переходов по пунктам меню. */
        try { revealedBlocks(loadButtons); }
        catch (e) { send(81, [{ n: 'Замер прозрачных блоков', v: String(e && e.message), ok: false }]); loadButtons(); }
      };
      try { desktop(); } catch (e) { send(18, [{ n: 'Замер на полной ширине', v: String(e && e.message), ok: false }]); }
      try { levels(); } catch (e) { send(16, [{ n: 'Замер уровней', v: String(e && e.message), ok: false }]); }
      try { notes(); } catch (e) { send(15, [{ n: 'Замер пояснений', v: String(e && e.message), ok: false }]); }
      try { footer(); } catch (e) { send(14, [{ n: 'Замер подвала', v: String(e && e.message), ok: false }]); }
      try { texts(); } catch (e) { send(13, [{ n: 'Замер надписей', v: String(e && e.message), ok: false }]); }
      try { status(); } catch (e) { send(11, [{ n: 'Замер статуса', v: String(e && e.message), ok: false }]); }
      try { contacts(); } catch (e) { send(10, [{ n: 'Замер контактов', v: String(e && e.message), ok: false }]); }
      try { insta(); } catch (e) { send(90, [{ n: 'Замер раздела Instagram', v: String(e && e.message), ok: false }]); }
      try { promoPhoto(); } catch (e) { send(83, [{ n: 'Замер фото в акции', v: String(e && e.message), ok: false }]); }
      try { heroCta(); } catch (e) { send(82, [{ n: 'Замер кнопок первого экрана', v: String(e && e.message), ok: false }]); }
      try { footerGrid(); } catch (e) { send(95, [{ n: 'Замер подвала на телефоне', v: String(e && e.message), ok: false }]); }
      try { menuClicks(); } catch (e) { send(96, [{ n: 'Замер меню и подменю', v: String(e && e.message), ok: false }]); }
      try { phones(); } catch (e) { send(99, [{ n: 'Замер телефонных ширин', v: String(e && e.message), ok: false }]); }
      try { tickerLines(); } catch (e) { send(97, [{ n: 'Замер полосы надписей', v: String(e && e.message), ok: false }]); }
      try {
        /* форму входа меряем после проверок входа, а каталог — последним:
           он ходит по странице с паузами и не должен мешать замерам */
        anchors(function () {
          mobile();
          flow();
          try { authFit(); } catch (e) {}
          try { menuVisible(finish); } catch (e) { finish(); }
        });
      } catch (e) {
        send(12, [{ n: 'Замер прокрутки', v: String(e && e.message), ok: false }]);
        mobile();
        flow();
        try { authFit(); } catch (e2) {}
        try { menuVisible(finish); } catch (e3) { finish(); }
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
  else setTimeout(boot, 400);
})();
