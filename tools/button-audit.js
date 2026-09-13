/* Проверка кнопок сайта MADROCK.
   Подключается из tools/site-audit.js, когда страница открыта с параметром
   audit=, после всех замеров. Проходит по всем кнопкам и ссылкам на полной
   ширине и на телефоне: каждое нажатие должно давать видимую реакцию и не
   вызывать ошибок. Отдельно прогоняются корзина, оформление заказа и карточка
   товара. Результаты уходят на /madrock-verify частями 30, 40, 50, 60.

   Важно: категории, режимы сортировки и количество в корзине перерисовывают
   список, поэтому такие кнопки берутся заново перед каждым нажатием — иначе
   нажатие уходит в уже удалённый узел. */

(function () {
  var errors = [];
  window.addEventListener('error', function (e) { errors.push(String(e.message || e).slice(0, 70)); });
  window.addEventListener('unhandledrejection', function (e) {
    errors.push('promise: ' + String((e.reason && e.reason.message) || e.reason).slice(0, 60));
  });

  var send = function (part, checks) {
    new Image().src = '/madrock-verify?part=' + part + '&of=10&d=' + encodeURIComponent(JSON.stringify({ checks: checks }));
  };
  var one = function (sel) { return document.querySelector(sel); };
  var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var rect = function (el) { return el ? el.getBoundingClientRect() : null; };
  var text = function (sel) { var el = one(sel); return el ? String(el.textContent || '').trim() : ''; };
  var num = function (t) { return parseFloat(String(t).replace(/[^0-9.]/g, '')) || 0; };

  var EXTERNAL = /^(https?:|tel:|viber:|mailto:)/i;
  var SCROLL_START = 1200;   // прокрутка вниз, чтобы кнопка «наверх» была видна
  var KNOWN = 'button, a[href], [data-add], [data-fav], [data-open-item], [data-promo-add], [data-point], [data-account], [data-account-view]';
  var LAZY = '[data-cat], #veg-toggle, #hit-toggle, #sort-toggle';   // перерисовывают меню

  var label = function (el) {
    var t = String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 22);
    var cls = el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : (cls ? '.' + cls : '')) + (t ? ' «' + t + '»' : '');
  };

  /* у SVG-элементов className не строка, а объект — приводим к читаемому виду */
  var innerName = function (el) {
    var cls = el.className;
    if (cls && typeof cls === 'object' && typeof cls.baseVal === 'string') cls = cls.baseVal;
    return String(cls || el.tagName).slice(0, 24);
  };

  /* всё, что может измениться от нажатия: окна, счётчик, подсказки, кабинет,
     избранное, выбранная категория, активный пункт меню */
  var fingerprint = function () {
    var out = [];
    ['#cart', '#item-modal', '#checkout-modal', '#account-modal', '#nav', '#scrim'].forEach(function (s) {
      var el = one(s);
      out.push(el ? String(el.className) : '-');
    });
    out.push(String(Math.round(window.scrollY)));
    out.push(String(location.hash));
    out.push(String(all('#menu-grid .item').length));
    /* порядок позиций тоже важен: сортировка по цене меняет только его */
    out.push(all('#menu-grid .item').slice(0, 3).map(function (el) { return String(el.textContent).trim().slice(0, 10); }).join('|'));
    out.push(String(all('#cart-body *').length));
    out.push(String((one('#cart-badge') || {}).textContent || ''));
    /* подсказки накапливаются, поэтому смотрим последнюю, а не начало списка */
    var toasts = all('#toasts > *');
    out.push(String(toasts.length) + ':' + String((toasts[toasts.length - 1] || {}).textContent || '').slice(0, 30));
    out.push(String((one('#acc-root') || {}).textContent || '').length);
    out.push(all('#nav a.on').map(function (a) { return a.textContent.trim(); }).join(','));
    out.push(String(all('[data-fav]').filter(function (el) { return el.textContent.trim() === '♥'; }).length));
    out.push(all('#rail .rail__i.on').map(function (el) { return el.textContent.trim().slice(0, 8); }).join(','));
    out.push(String((one('#menu-empty') || {}).style.display || ''));
    out.push(String((one('#checkout-body') || {}).textContent || '').slice(0, 30));
    return out.join('|');
  };

  /* фильтры и категорию возвращаем в исходное состояние перед каждым нажатием:
     иначе активный фильтр перерисовывает меню на лету и нажатия уходят в уже
     удалённые узлы, а повторное нажатие по активной кнопке ничего не меняет */
  var resetFilters = function () {
    var chipAll = one('#rail .rail__i[data-cat="all"]');
    if (chipAll && !chipAll.classList.contains('on')) chipAll.click();
    ['#veg-toggle', '#hit-toggle', '#sort-toggle'].forEach(function (s) {
      var t = one(s);
      if (t && t.classList.contains('on')) t.click();
    });
    var search = one('#search');
    if (search && search.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  var resetAll = function () {
    resetFilters();
    ['#item-close', '#cart-close', '#checkout-close', '#account-close'].forEach(function (s) {
      var b = one(s);
      if (b) b.click();
    });
    var nav = one('#nav');
    if (nav) nav.classList.remove('on');
    try {
      /* сначала снимаем якорь, потом убираем его из адреса: так следующее
         нажатие по ссылке снова считается переходом, а не повтором */
      if (location.hash) location.hash = '';
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}
    window.scrollTo(0, SCROLL_START);
  };

  var visible = function (el) {
    if (el.offsetParent !== null) return true;
    return getComputedStyle(el).position === 'fixed';
  };

  var clickCheck = function (el, box) {
    var dead = box.dead;
    var href = String((el.getAttribute && el.getAttribute('href')) || '');
    if (EXTERNAL.test(href)) return 'external';
    /* ссылки-якоря проверяются отдельным прогоном: он нажимает их с паузами и
       смотрит, куда встала страница. Здесь только сверяем, что раздел есть —
       мгновенный замер сразу после нажатия не успевает увидеть переход. */
    if (el.tagName === 'A' && href.charAt(0) === '#') {
      if (!document.getElementById(href.slice(1))) dead.push(label(el) + ' [нет раздела ' + href + ']');
      box.links += 1;
      return 'anchor';
    }
    var before = fingerprint();
    var p1 = Math.round(window.scrollY) + '/' + String(location.hash);
    var errs = errors.length;
    try {
      el.click();
    } catch (e) {
      dead.push(label(el) + ' — исключение');
      resetAll();
      return 'ok';
    }
    var p2 = Math.round(window.scrollY) + '/' + String(location.hash);
    if (fingerprint() === before && errors.length === errs) {
      /* повторный переход по уже открытому якорю браузер не выполняет —
         это не поломка кнопки, поэтому считаем отдельно */
      if (el.tagName === 'A' && href !== '' && href === String(location.hash)) {
        box.repeat.push(label(el));
      } else {
        dead.push(label(el) + ' [прокрутка и якорь ' + p1 + ' → ' + p2 + ']');
      }
    }
    resetAll();
    return 'ok';
  };

  /* --- 30 и 40. все кнопки: нажатие даёт реакцию -------------------------- */
  var sweep = function (w, part) {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };

    var frame = window.frameElement;
    if (frame) frame.style.width = w + 'px';
    resetAll();
    if (w <= 780) { var burger = one('#burger'); if (burger) burger.click(); }

    var box = { dead: [], repeat: [], links: 0 };
    var dead = box.dead;
    var stale = 0;
    var external = 0;
    var checked = 0;
    var errorsBefore = errors.length;

    /* узел мог быть удалён перерисовкой ещё до нажатия — тогда нажатие уходит
       в пустоту, и это уже не ошибка сайта, а промах проверки */
    var record = function (el, wasConnected, before) {
      if (dead.length > before && !wasConnected) {
        dead[dead.length - 1] += ' (узел был удалён до нажатия)';
        stale += 1;
      }
    };

    /* сначала кнопки, которые не перерисовывают список. Кнопки внутри окон
       (корзина, карточка товара, оформление, кабинет) проверяются отдельными
       прогонами — здесь они только мешали бы. */
    all(KNOWN).filter(function (el) {
      if (el.closest('#cart, #item-modal, #checkout-modal, #account-modal')) return false;
      if (el.matches(LAZY)) return false;
      return visible(el);
    }).forEach(function (el) {
      var before = dead.length;
      var connected = el.isConnected;
      var result = clickCheck(el, box);
      record(el, connected, before);
      if (result === 'external') { external += 1; return; }
      checked += 1;
    });

    /* затем категории и режимы — каждый раз берём кнопку заново */
    var catValues = all('#rail .rail__i').map(function (el) { return el.getAttribute('data-cat'); });
    catValues.forEach(function (id) {
      var chip = one('#rail .rail__i[data-cat="' + id + '"]');
      if (chip) { var b = dead.length; var okChip = chip.isConnected; clickCheck(chip, box); record(chip, okChip, b); checked += 1; }
    });
    all('#ftr-cats [data-cat]').forEach(function (link, i) {
      var again = all('#ftr-cats [data-cat]')[i];
      if (again) { var b2 = dead.length; var okLink = again.isConnected; clickCheck(again, box); record(again, okLink, b2); checked += 1; }
    });
    ['#veg-toggle', '#hit-toggle', '#sort-toggle'].forEach(function (id) {
      var el = one(id);
      if (el) { var b3 = dead.length; var okTog = el.isConnected; clickCheck(el, box); record(el, okTog, b3); checked += 1; }
    });

    add('Ширина ' + w + ': кнопок проверено',
      checked + ' нажатий · ссылок-якорей ' + box.links + ' (их проверяет отдельный прогон) · внешних не открываем: ' + external,
      checked > 20);
    add('Ширина ' + w + ': повторные переходы по тому же якорю',
      box.repeat.length ? box.repeat.length + ' шт' : 'нет', true);
    add('Ширина ' + w + ': каждое нажатие даёт реакцию',
      dead.length
        ? dead.length + ' шт: ' + dead.slice(0, 8).map(function (d) { return d.split(' [')[0]; }).join(' | ')
        : 'реагируют все ' + checked,
      dead.length === 0);
    /* подробности по первым четырём разбираем отдельными строками: в общую
       строку они не помещаются и обрезаются */
    var shown = Math.min(dead.length, 4);
    for (var k = 0; k < shown; k += 1) add('Ширина ' + w + ': разбор ' + (k + 1), dead[k], false);
    add('Ширина ' + w + ': из них удалённых узлов', stale + ' шт', stale === 0);
    add('Ширина ' + w + ': ошибок при нажатиях',
      errors.length > errorsBefore ? errors.slice(errorsBefore, errorsBefore + 2).join(' | ') : 'нет',
      errors.length === errorsBefore);

    send(part, out);
  };

  /* --- 50. корзина и оформление предзаказа шаг за шагом ------------------- */
  var checkout = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };
    var frame = window.frameElement;
    if (frame) frame.style.width = '1200px';
    resetAll();

    try {
      var badge = one('#cart-badge');
      var start = num(badge.textContent);
      one('#menu-grid .item [data-add]').click();
      add('Позиция добавлена в предзаказ', start + ' → ' + num(one('#cart-badge').textContent), num(one('#cart-badge').textContent) === start + 1);

      one('#cart-btn').click();
      add('Корзина открылась', one('#cart').classList.contains('on') ? 'да' : 'нет', one('#cart').classList.contains('on'));
      var cartClose = one('#cart-close');
      if (cartClose) cartClose.click();
      add('Кнопка закрытия корзины работает', one('#cart').classList.contains('on') ? 'нет' : 'да', !one('#cart').classList.contains('on'));
      one('#cart-btn').click();

      var rows = all('#cart-body [data-rm]');
      add('В корзине есть строки', rows.length + ' строк', rows.length >= 1);

      var qtyBefore = text('#cart-body .qty span');
      var plus = one('#cart-body [data-qty$=":1"]');
      if (plus) plus.click();
      var qtyAfter = text('#cart-body .qty span');
      add('Кнопка «больше» увеличивает количество', qtyBefore + ' → ' + qtyAfter, num(qtyAfter) === num(qtyBefore) + 1);

      var minus = one('#cart-body [data-qty$=":-1"]');
      if (minus) minus.click();
      add('Кнопка «меньше» уменьшает количество', num(text('#cart-body .qty span')) + ' шт', num(text('#cart-body .qty span')) === num(qtyBefore));

      var rm = one('#cart-body [data-rm]');
      var rowsBefore = all('#cart-body [data-rm]').length;
      if (rm) rm.click();
      add('Кнопка «убрать» удаляет строку', rowsBefore + ' → ' + all('#cart-body [data-rm]').length + ' строк',
        rowsBefore < 2 || all('#cart-body [data-rm]').length === rowsBefore - 1);

      /* снова кладём позицию и идём по шагам оформления */
      if (all('#cart-body [data-rm]').length === 0) {
        var more = one('#cart-to-menu');
        if (more) more.click();
        one('#menu-grid .item [data-add]').click();
        one('#cart-btn').click();
      }

      one('#to-checkout').click();
      add('Оформление открылось', one('#checkout-modal').classList.contains('on') ? 'да' : 'нет', one('#checkout-modal').classList.contains('on'));
      var chClose = one('#checkout-close');
      if (chClose) chClose.click();
      add('Кнопка закрытия оформления работает', one('#checkout-modal').classList.contains('on') ? 'нет' : 'да', !one('#checkout-modal').classList.contains('on'));
      one('#to-checkout').click();
      add('Шаг 1: выбор кофейни', String(text('#checkout-body')).slice(0, 30), text('#checkout-body').length > 10);

      one('#checkout-body [data-step="2"]').click();
      var points = all('#checkout-body [data-point-pick]');
      add('Шаг 2: кофейни для выбора', points.length + ' шт', points.length === 5);
      if (points.length) points[1].click();

      var slots = all('#slots .slot[data-slot]');
      add('Шаг 2: слоты времени', slots.length + ' шт', slots.length >= 1);
      var later = slots.filter(function (s) { return s.getAttribute('data-slot') !== 'asap'; });
      if (later.length) later[0].click();

      one('#checkout-body [data-step="3"]').click();
      var nameI = one('#co-name'), phoneI = one('#co-phone');
      add('Шаг 3: поля контактов', (nameI ? 'имя ' : '') + (phoneI ? 'телефон' : ''), !!nameI && !!phoneI);
      if (nameI) nameI.value = 'Проверка кнопок';
      if (phoneI) phoneI.value = '+375445556677';

      one('#checkout-body [data-step="4"]').click();
      var pay = one('#checkout-body input[name="pay"]');
      add('Шаг 4: способы оплаты', pay ? 'есть' : 'нет', !!pay);
      add('Итог заказа показан', /[0-9],[0-9]{2}/.test(text('#checkout-body')) ? 'да' : 'нет', /[0-9],[0-9]{2}/.test(text('#checkout-body')));

      one('#confirm-order').click();
      var done = text('#checkout-body');
      /* заголовок подтверждения честно говорит, что это демонстрация:
         «Так будет выглядеть заказ MR-1234» */
      add('Заказ оформлен', done.indexOf('Так будет выглядеть заказ') >= 0 ? 'да' : 'нет',
        done.indexOf('Так будет выглядеть заказ') >= 0);
      add('Номер заказа присвоен', (done.match(/MR-[0-9]+/) || ['нет номера'])[0], /MR-[0-9]+/.test(done));

      one('#co-done').click();
      add('Окно закрывается после заказа', one('#checkout-modal').classList.contains('on') ? 'нет' : 'да', !one('#checkout-modal').classList.contains('on'));
    } catch (e) {
      add('Корзина и оформление', String(e && e.message), false);
    }
    resetAll();
    send(50, out);
  };

  /* --- 60. карточка товара: настройки и добавление ------------------------ */
  var itemModal = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };
    var frame = window.frameElement;
    if (frame) frame.style.width = '1200px';
    resetAll();

    try {
      var before = num(one('#cart-badge').textContent);

      /* у десертов и кухни настроек нет — ищем позицию с настройками */
      var cards = all('#menu-grid .item [data-open-item]');
      var found = 0;
      for (var i = 0; i < cards.length && found === 0 && i < 8; i += 1) {
        cards[i].click();
        found = all('#item-body .mod').length;
        if (found === 0) { var c1 = one('#item-close'); if (c1) c1.click(); }
      }
      add('Карточка товара открылась', one('#item-modal').classList.contains('on') ? 'да' : 'нет', one('#item-modal').classList.contains('on'));
      add('Настройки напитка предложены', found + ' шт', found >= 3);

      var priceBefore = text('#item-price');
      var paid = all('#item-body .mod').filter(function (m) { return String(m.textContent).indexOf('+') >= 0; });
      if (paid.length) paid[0].click();
      var priceAfter = text('#item-price');
      var marked = all('#item-body .mod').filter(function (m) { return m.classList.contains('on'); }).length;
      add('Настройка отмечается и меняет цену', 'отмечено ' + marked + ' · цена ' + priceBefore + ' → ' + priceAfter,
        marked >= 1 && (paid.length === 0 || priceAfter !== priceBefore));

      var addToCart = one('#item-add');
      add('Кнопка добавления в карточке', addToCart ? 'есть' : 'нет', !!addToCart);
      if (addToCart) addToCart.click();
      add('Из карточки позиция попала в предзаказ', before + ' → ' + num(one('#cart-badge').textContent),
        num(one('#cart-badge').textContent) > before);
      add('Карточка закрылась после добавления', one('#item-modal').classList.contains('on') ? 'нет' : 'да', !one('#item-modal').classList.contains('on'));

      var openAgain = one('#menu-grid .item [data-open-item]');
      if (openAgain) openAgain.click();
      var cancel = one('#item-one');
      if (cancel) cancel.click();
      add('Кнопка «Отмена» закрывает карточку', one('#item-modal').classList.contains('on') ? 'нет' : 'да', !one('#item-modal').classList.contains('on'));

      /* вся карточка каталога должна открывать товар, а её кнопки — нет */
      var photo = one('#menu-grid .item .item__ph');
      if (photo) photo.click();
      add('Нажатие по карточке каталога открывает товар',
        one('#item-modal').classList.contains('on') ? 'да' : 'нет', one('#item-modal').classList.contains('on'));
      var closeAfter = one('#item-close');
      if (closeAfter) closeAfter.click();

      var inCardAdd = one('#menu-grid .item [data-add]');
      if (inCardAdd) inCardAdd.click();
      add('Кнопка «В предзаказ» в каталоге не открывает окно',
        one('#item-modal').classList.contains('on') ? 'открыла' : 'нет', !one('#item-modal').classList.contains('on'));
      var closeAfter2 = one('#item-close');
      if (closeAfter2) closeAfter2.click();

      var inCardFav = one('#menu-grid .item [data-fav]');
      if (inCardFav) inCardFav.click();
      add('Кнопка избранного в каталоге не открывает окно',
        one('#item-modal').classList.contains('on') ? 'открыла' : 'нет', !one('#item-modal').classList.contains('on'));
      var closeAfter3 = one('#item-close');
      if (closeAfter3) closeAfter3.click();

      var cardNode = one('#menu-grid .item[data-open-item]');
      if (cardNode) {
        cardNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        add('Клавиша Enter открывает карточку товара',
          one('#item-modal').classList.contains('on') ? 'да' : 'нет', one('#item-modal').classList.contains('on'));
        var closeAfter4 = one('#item-close');
        if (closeAfter4) closeAfter4.click();
      }
    } catch (e) {
      add('Карточка товара', String(e && e.message), false);
    }
    resetAll();
    send(60, out);
  };

  /* --- уборка после проверки ----------------------------------------------
     Проверка добавляет позиции в предзаказ и жмёт «в избранное», поэтому в
     конце возвращаем страницу в состояние нового гостя. */
  var cleanup = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };
    var left = -1;
    try {
      localStorage.removeItem('madrock.cart.v1');
      localStorage.removeItem('madrock.fav.v1');
      localStorage.removeItem('madrock.user.v2');
      left = JSON.parse(localStorage.getItem('madrock.cart.v1') || '[]').length;
    } catch (e) {}
    add('После проверки предзаказ чистый', left === 0 ? 'позиций нет' : 'осталось ' + left, left === 0);
    send(70, out);
  };

  /* --- 100. нажатие по вложенному элементу кнопки -------------------------
     Настоящий палец попадает по значку внутри кнопки, а не по самой кнопке.
     Если обработчик сверяется с e.target.id, такое нажатие не срабатывает —
     так ломался значок меню на телефоне. Здесь жмём именно по вложенному
     элементу каждой кнопки. */
  var innerClicks = function () {
    var out = [];
    var add = function (n, v, ok) { out.push({ n: n, v: String(v).slice(0, 140), ok: !!ok }); };
    var frame = window.frameElement;
    if (frame) frame.style.width = '390px';
    resetAll();
    var burger = one('#burger');
    if (burger) burger.click();

    var dead = [];
    var checked = 0;
    var blocked = 0;
    all('button').filter(function (el) {
      if (el.closest('#cart, #item-modal, #checkout-modal, #account-modal')) return false;
      return visible(el) && el.children.length > 0;
    }).forEach(function (el) {
      /* самый глубокий вложенный элемент — по нему и попадает палец. Если у
         значка отключены события (pointer-events: none), палец до него не
         доходит: нажатие всегда достаётся кнопке, проверять нечего. */
      var inner = el;
      while (inner.children.length > 0) inner = inner.children[0];
      if (inner === el) return;
      if (getComputedStyle(inner).pointerEvents === 'none') { blocked += 1; return; }

      /* сначала обычное нажатие по кнопке: если и оно ничего не меняет
         (кнопка уже в нужном состоянии), сравнивать не с чем */
      resetAll();
      var beforeOuter = fingerprint();
      try { el.click(); } catch (e) { resetAll(); return; }
      var outerWorks = fingerprint() !== beforeOuter;
      resetAll();
      if (!outerWorks) return;

      var before = fingerprint();
      try {
        inner.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      } catch (e) {
        dead.push(label(el) + ' — исключение');
        resetAll();
        return;
      }
      if (fingerprint() === before) dead.push(label(el) + ' ← значок «' + innerName(inner) + '»');
      checked += 1;
      resetAll();
    });

    var total = all('button').filter(function (el) { return visible(el) && el.children.length > 0; }).length;
    add('Кнопок с вложенными значками', checked + ' проверено из ' + total + ' (остальные значки не перехватывают нажатие)',
      total === 0 || checked > 0 || blocked > 0);
    add('Нажатие по значку внутри кнопки срабатывает',
      checked === 0
        ? 'значки не перехватывают нажатие: палец всегда попадает в кнопку'
        : (dead.length ? dead.length + ' шт: ' + dead.slice(0, 6).join(' | ') : 'срабатывает у всех ' + checked),
      dead.length === 0);

    send(100, out);
  };

  /* --- запуск после общих замеров ----------------------------------------- */
  var boot = function (tries) {
    if (window.__madrockAuditDone === true || (tries || 0) > 40) {
      try { sweep(1440, 30); } catch (e) { send(30, [{ n: 'Кнопки на полной ширине', v: String(e && e.message), ok: false }]); }
      try { sweep(390, 40); } catch (e) { send(40, [{ n: 'Кнопки на телефоне', v: String(e && e.message), ok: false }]); }
      try { checkout(); } catch (e) { send(50, [{ n: 'Корзина и оформление', v: String(e && e.message), ok: false }]); }
      try { itemModal(); } catch (e) { send(60, [{ n: 'Карточка товара', v: String(e && e.message), ok: false }]); }
      try { innerClicks(); } catch (e) { send(100, [{ n: 'Нажатие по вложенному элементу', v: String(e && e.message), ok: false }]); }
      var frame = window.frameElement;
      if (frame) frame.style.width = '1440px';
      resetAll();
      try { cleanup(); } catch (e) {}
      return;
    }
    setTimeout(function () { boot((tries || 0) + 1); }, 250);
  };

  setTimeout(function () { boot(0); }, 300);
})();
