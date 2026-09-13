/* ==========================================================================
   MADROCK COFFEE · клиентская логика
   Один файл без зависимостей: рендер витрин, предзаказ, бонусный кабинет,
   акция недели с таймером. Состояние живёт в localStorage.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' BYN'; };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var byId = function (id) { for (var i = 0; i < MENU.length; i++) if (MENU[i].id === id) return MENU[i]; return null; };
  var catById = function (id) { for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i]; return null; };
  /* Название категории для показа. Если позицию завели с категорией, которой
     нет в CATEGORIES (опечатка или новая категория), карточка и поиск не
     должны падать — показываем сам идентификатор. */
  var catName = function (id) { var c = catById(id); return c ? c.name : String(id); };

  /* --- фото-слот: относительные пути, адаптивные варианты, фолбэк -----------
     Фото лежат локально в assets/. Пути относительные: страница работает и на
     локальном сервере, и на GitHub Pages в подпапке репозитория, и при
     открытии с диска. Если файл почему-то не найдётся, вместо пустого места
     показывается фирменная графика: вёрстка не выглядит сломанной.

     Каждый кадр лежит в четырёх файлах: 400 и 800 px по ширине в WebP и JPEG
     (у главного фото ещё 1280). Браузер сам берёт подходящий: телефон тянет
     вариант 400 вместо прежних 1200×900 — страница открывается в разы быстрее,
     а на большом экране картинка остаётся резкой. sizes описывает, какую часть
     экрана занимает слот: по нему браузер и выбирает файл. */
  var ASSETS = 'assets/';
  var FALLBACK = "if(this.dataset.rel&&!this.dataset.tried){this.dataset.tried='1';this.removeAttribute('srcset');this.src=this.dataset.rel;}" +
    "else{var b=this.closest('.ph');if(b)b.classList.add('broken');this.remove();}";

  var ph = function (file, mark, cls, alt, sizes) {
    var base = String(file).replace(/\.jpe?g$/i, '');
    var hero = base === 'hero';
    var square = base.indexOf('ig') === 0;
    var w = hero ? 1280 : 800;
    var h = hero ? 960 : (square ? 800 : 600);
    /* Варианты обязаны идти подряд: если пропустить средний, браузер на экране
       с удвоенной плотностью возьмёт следующий за ним и скачает лишние байты. */
    var widths = hero ? [400, 800, 1280] : [400, 800];
    var set = function (ext) {
      return widths.map(function (px) {
        return esc(ASSETS + base + '-' + px + '.' + ext) + ' ' + px + 'w';
      }).join(', ');
    };
    var box = sizes || '280px';
    var fallback = esc(ASSETS + base + '-800.jpg');
    return '<div class="ph ' + (cls || '') + '" data-mark="' + esc(mark || 'MADROCK') + '">' +
      '<picture>' +
        '<source type="image/webp" srcset="' + set('webp') + '" sizes="' + box + '">' +
        '<img src="' + fallback + '" srcset="' + set('jpg') + '" sizes="' + box + '"' +
          ' width="' + w + '" height="' + h + '" alt="' + esc(alt || mark || '') + '"' +
          ' loading="lazy" decoding="async" data-rel="' + fallback + '" onerror="' + FALLBACK + '">' +
      '</picture>' +
      '</div>';
  };

  /** «QR» клубной карты: рисунок детерминированно зависит от телефона гостя. */
  var qrHTML = function (seed) {
    var src = String(seed || 'MADROCK'), h = 7, cells = '';
    for (var i = 0; i < src.length; i += 1) h = (h * 31 + src.charCodeAt(i)) % 1000003;
    for (var n = 0; n < 121; n += 1) {
      h = (h * 1103515245 + 12345) % 2147483648;
      cells += '<i class="' + (h % 100 < 46 ? 'on' : '') + '"></i>';
    }
    /* Картинку из пустых ячеек скринридеру читать нечего: сама графика скрыта,
       а смысл передан словами */
    return '<div class="qr" aria-hidden="true">' + cells + '</div>' +
      '<span class="sr-only">Код клубной карты: покажите его на баре, печати и бонусы начислят без напоминаний</span>';
  };

  /* --- хранилище --------------------------------------------------------- */
  /* v2: карта гостя появляется только после входа или регистрации, поэтому
     запись с прежним ключом (её создавало оформление заказа) больше не читаем */
  var KEY = { cart: 'madrock.cart.v1', user: 'madrock.user.v2', fav: 'madrock.fav.v1' };
  try { localStorage.removeItem('madrock.user.v1'); } catch (e) {}
  var read = function (k, dflt) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; }
  };
  var write = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  var cart = read(KEY.cart, []);          // [{id, size, milk, extra:[], qty, note}]
  /* Всё, что приходит из хранилища, проверяем: там может оказаться запись
     старого формата, мусор от другого скрипта на том же адресе или правка
     руками. Без проверки одна плохая запись ломала отрисовку — и вместе с ней
     всю страницу: меню пустое, кнопки не работают, кабинета нет. */
  var num = function (v, dflt) { v = Number(v); return isFinite(v) ? v : dflt; };
  var arr = function (v) { return Array.isArray(v) ? v : []; };
  if (!Array.isArray(cart)) cart = [];
  cart = cart.filter(function (l) { return l && typeof l.id === 'string' && num(l.qty, 0) > 0 && byId(l.id) !== null; })
    .map(function (l) {
      l.qty = Math.max(1, Math.round(num(l.qty, 1)));
      l.extra = arr(l.extra).filter(function (x) { return typeof x === 'string'; });
      return l;
    });
  var fav = read(KEY.fav, []);
  fav = arr(fav).filter(function (x) { return typeof x === 'string'; });
  var user = read(KEY.user, null);        // {phone, name, points, earned, punch, orders:[], coupons:[], ref, since}
  if (user && typeof user !== 'object') user = null;
  if (user) {
    /* недостающие поля заполняем значениями по умолчанию: иначе в расчёте
       появлялись «undefined б.» и «NaN», а кабинет мог не открыться вовсе */
    user = {
      phone: typeof user.phone === 'string' ? user.phone : '',
      name: typeof user.name === 'string' && user.name ? user.name : 'Гость',
      points: Math.max(0, Math.round(num(user.points, 0))),
      earned: Math.max(0, Math.round(num(user.earned, 0))),
      punch: Math.max(0, Math.round(num(user.punch, 0))) % 10,
      orders: arr(user.orders).filter(function (o) { return o && typeof o === 'object'; }),
      coupons: arr(user.coupons).filter(function (c) { return c && typeof c === 'object'; }),
      ref: typeof user.ref === 'string' && user.ref ? user.ref : 'MADROCK-GUEST',
      since: typeof user.since === 'string' ? user.since : new Date().toISOString(),
    };
  }
  var filter = { cat: 'all', q: '', veg: false, hit: false, cheap: false };
  /* Поле поиска: браузер умеет сам подставить в него сохранённый текст — без
     жеста человека. Такой текст мгновенно фильтрует каталог, и кажется, что
     продукты пропали. Пока человек не коснулся поля, чужой текст стираем. */
  var searchArmed = false, searchGuard = null;

  /* --- уровни и бонусы --------------------------------------------------- */
  var tierOf = function (earned) {
    var t = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) if (earned >= TIERS[i].from) t = TIERS[i];
    return t;
  };
  var nextTier = function (earned) {
    for (var i = 0; i < TIERS.length; i++) if (earned < TIERS[i].from) return TIERS[i];
    return null;
  };
  var cashback = function () { return user ? tierOf(user.earned).cashback : 5; };

  /* --- акция недели ------------------------------------------------------ */
  var isoWeek = function (d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dn = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - dn + 3);
    var ft = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fdn = (ft.getUTCDay() + 6) % 7;
    ft.setUTCDate(ft.getUTCDate() - fdn + 3);
    return 1 + Math.round((t - ft) / 604800000);
  };
  var weekEnd = function (now) {
    var day = (now.getDay() + 6) % 7;           // 0 = понедельник
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59);
  };
  var currentPromo = function () {
    var n = new Date();
    return { promo: PROMOS[isoWeek(n) % PROMOS.length], week: isoWeek(n) };
  };
  /* какая неделя сейчас показана в блоке акции: по ней таймер понимает,
     что наступил понедельник и блок пора перерисовать */
  var shownWeek = null;

  /* --- корзина ----------------------------------------------------------- */
  /** Какие группы модификаторов показывать для категории. */
  var MOD_GROUPS = {
    coffee: ['size', 'milk', 'syrup', 'extra'],
    author: ['size', 'milk', 'syrup', 'extra'],
    cold: ['size', 'milk', 'syrup', 'extra'],
    notcoffee: ['size', 'milk', 'extra'],
    food: [],
    dessert: [],
  };

  var modLabel = function (line) {
    var out = [];
    if (line.size && line.size !== 's') {
      MODS.size.opts.forEach(function (o) { if (o.id === line.size) out.push(o.name + ' · ' + o.note); });
    }
    if (line.milk && line.milk !== 'regular') {
      MODS.milk.opts.forEach(function (o) { if (o.id === line.milk) out.push('молоко: ' + o.name.toLowerCase()); });
    }
    if (line.syrup) {
      MODS.syrup.opts.forEach(function (o) { if (o.id === line.syrup) out.push('сироп: ' + o.name.toLowerCase()); });
    }
    (line.extra || []).forEach(function (id) {
      MODS.extra.opts.forEach(function (o) { if (o.id === id) out.push(o.name); });
    });
    if (line.note) out.push('«' + line.note + '»');
    return out.join(' · ');
  };
  var lineUnit = function (line) {
    var it = byId(line.id);
    if (!it) return 0;
    var p = it.price;
    /* Привилегии уровней, обещанные в блоке «Уровни», считаются здесь: на
       Hard Rock сироп к напитку без наценки, на Mad Rock — ещё и молоко.
       Иначе текст обещал одно, а корзина прибавляла наценку всем. */
    var tier = user ? tierOf(user.earned) : TIERS[0];
    var freeSyrup = tier.id === 'hard' || tier.id === 'mad';
    var freeMilk = tier.id === 'mad';
    MODS.size.opts.forEach(function (o) { if (o.id === line.size) p += o.delta; });
    MODS.milk.opts.forEach(function (o) { if (o.id === line.milk && !freeMilk) p += o.delta; });
    MODS.syrup.opts.forEach(function (o) { if (o.id === line.syrup && !freeSyrup) p += o.delta; });
    (line.extra || []).forEach(function (id) {
      MODS.extra.opts.forEach(function (o) { if (o.id === id) p += o.delta; });
    });
    return p;
  };
  /** Ключ строки заказа: одинаковые настройки складываются в одну позицию. */
  var lineKey = function (l) {
    return JSON.stringify([l.id, l.size, l.milk, l.syrup || '', (l.extra || []).slice().sort(), l.note]);
  };
  var cartCount = function () { return cart.reduce(function (s, l) { return s + l.qty; }, 0); };
  var cartSubtotal = function () { return cart.reduce(function (s, l) { return s + lineUnit(l) * l.qty; }, 0); };

  /* скидка акции недели: одна порция напитка недели по акционной цене */
  var promoDiscount = function () {
    var p = currentPromo().promo;
    var d = 0;
    /* у акции может быть условие по количеству: «второй капучино за 1 рубль»
       срабатывает только когда в корзине две порции, а не одна */
    var need = p.minQty || 1;
    cart.forEach(function (l) {
      if (l.id === p.item && d === 0 && l.qty >= need) {
        var it = byId(l.id);
        var full = lineUnit(l);
        if (it && p.promoPrice < full) d = (full - p.promoPrice) * Math.min(1, l.qty);
      }
    });
    return Math.round(d * 100) / 100;
  };
  var orderTotal = function () { return Math.max(0, Math.round((cartSubtotal() - promoDiscount()) * 100) / 100); };
  var maxBonusSpend = function () {
    var cap = Math.floor(orderTotal() * 0.5);
    return user ? Math.min(cap, user.points) : 0;
  };

  /* --- уведомления ------------------------------------------------------- */
  var toast = function (msg, kind) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = '<span class="toast__ico">' + (kind === 'ok' ? '✓' : '☕') + '</span><span>' + esc(msg) + '</span>';
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, 2900);
  };

  /* --- часы работы ------------------------------------------------------- */
  var statusNow = function () {
    var n = new Date(), h = n.getHours() + n.getMinutes() / 60;
    var open = SHOP.points.filter(function (p) { return h >= p.open && h < p.close; });
    return { open: open, any: open.length > 0, h: h };
  };
  /* «одна кофейня · две кофейни · пять кофеен»: в шапке не должно появляться
     «обе», когда открыто больше двух кофеен */
  var COFFEE_WORDS = ['', 'одна', 'две', 'три', 'четыре', 'пять'];
  var coffeeCount = function (n) {
    var word = n >= 1 && n <= 5 ? COFFEE_WORDS[n] : String(n);
    var tail = n === 1 ? 'кофейня' : (n >= 2 && n <= 4 ? 'кофейни' : 'кофеен');
    return word + ' ' + tail;
  };
  var hhmm = function (v) {
    var h = Math.floor(v), m = Math.round((v - h) * 60);
    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
  };

  var renderStatus = function () {
    var s = statusNow();
    var el = $('#status'), txt = $('#status-txt');
    if (!s.any) {
      el.className = 'status closed';
      txt.textContent = 'Закрыто · откроемся в 07:30';
      el.title = 'Все кофейни закрыты';
      return;
    }
    /* «до …» — по самой поздней из открытых кофеен; точные часы каждой
       кофейни показывает подсказка при наведении */
    var last = s.open[0];
    s.open.forEach(function (p) { if (p.close > last.close) last = p; });
    el.className = 'status';
    txt.textContent = 'Открыто · ' + (s.open.length > 1 ? coffeeCount(s.open.length) : s.open[0].name) + ' до ' + hhmm(last.close);
    el.title = 'Открыто сейчас: ' + s.open.map(function (p) { return p.name + ' до ' + hhmm(p.close); }).join(' · ');
  };

  /* --- статические разделы ----------------------------------------------- */
  var renderShell = function () {
    /* Главное фото и его варианты прописаны прямо в разметке: браузер находит
       их прелоадер-сканером сразу, не дожидаясь этого скрипта. Здесь только
       страховка на случай, если файл не найдётся. */
    var hero = $('#hero-img');
    if (hero) {
      hero.onerror = function () {
        var box = this.closest('.ph');
        if (box) box.classList.add('broken');
        this.remove();
      };
    }

    var f = $('#hero-facts');
    f.innerHTML = FACTS.map(function (x) {
      return '<div class="fact"><div class="fact__n">' + esc(x.n) + '</div><div class="fact__l">' + esc(x.l) + '</div></div>';
    }).join('');

    $('#year').textContent = new Date().getFullYear();
    $('#tel-link').href = 'tel:' + SHOP.phone.replace(/[^+\d]/g, '');
    $('#contacts-lead').textContent = SHOP.points.length + ' кофеен в Гомеле, работаем каждый день, самая ранняя открывается в 7:30. ' +
      'Телефон ' + SHOP.phone + ' (второй: ' + SHOP.phone2 + '), Instagram @' + SHOP.instagram + ', VK. ' +
      'Предзаказ — самый быстрый способ: стакан будет готов к вашему времени.';

    $('#ftr-cats').innerHTML = CATEGORIES.map(function (c) {
      return '<a href="#menu" data-cat="' + c.id + '">' + esc(c.name) + '</a>';
    }).join('');
    $('#ftr-points').innerHTML = SHOP.points.map(function (p) {
      return '<span>' + esc(p.name) + '<br><span class="xs muted">' + esc(p.address) + ' · ' + esc(p.hours) + '</span></span>';
    }).join('');

    /* «Десерты от городских кондитеров» из строки убрано по просьбе владельца */
    var tick = ['Итальянский кофе', 'Молочные коктейли <b>на мороженом</b>', 'Бонусы до <b>10%</b>', '10-й напиток <b>в подарок</b>',
      'Открываемся в <b>7:30</b>', '<b>30+</b> сиропов', '<b>5</b> кофеен в Гомеле', 'Предзаказ без очереди'];
    $('#ticker-row').innerHTML = tick.concat(tick).map(function (t) { return '<span>' + t + '</span>'; }).join('');

    $('#tiles').innerHTML = [
      { i: '☕', t: 'Итальянский кофе', d: 'Эспрессо-машина, плотный шот и молочная пена. Капучино — от 3,30 BYN.' },
      { i: '🥤', t: 'Густые коктейли', d: 'Молочные коктейли на мороженом — то, за чем к нам приходят семьями. И фраппе для тех, кто любит похолоднее.' },
      { i: '🍬', t: '30+ сиропов', d: 'Солёная карамель, лаванда, лесной орех, апельсин. Спросите у бариста — соберём вкус под вас.' },
      { i: '⏱️', t: 'Предзаказ без очереди', d: 'Собираете заказ в телефоне, выбираете кофейню и время — к приходу стакан уже на стойке.' },
      { i: '🎁', t: 'Бонусы за всё', d: '5–10% бонусами с заказа, 10-й напиток в подарок и одна печать сразу при регистрации.' },
      { i: '📍', t: 'Пять кофеен', d: 'Советская 42 и 72, Ильича 51Г, Крестьянская 33, Гагарина 65. Самая ранняя открывается в 7:30.' }
    ].map(function (x) {
      return '<div class="tile reveal"><div class="tile__ico">' + x.i + '</div><div class="tile__t">' + esc(x.t) + '</div><div class="tile__d">' + esc(x.d) + '</div></div>';
    }).join('');

    $('#bonus-steps').innerHTML = [
      { n: '01', t: 'Показываете QR', d: 'Карта живёт в кабинете: покажите код на баре — и не нужно напоминать бариста про бонусы.' },
      { n: '02', t: 'Копите с каждого заказа', d: 'Базовый уровень — 5% от чека бонусами. На «Hard Rock» уже 7%, на «Mad Rock» — 10%.' },
      { n: '03', t: 'Платите бонусами', d: 'Списывайте до 50% чека в предзаказе и в зале. Остальное — картой или наличными.' },
      { n: '04', t: 'Забираете подарки', d: 'Каждый 10-й напиток бесплатно, а первая печать в карте уже стоит — за регистрацию.' }
    ].map(function (x) {
      return '<div class="tile"><div class="fact__n" style="font-size:1.3rem;color:var(--amber)">' + x.n + '</div>' +
        '<div class="tile__t">' + esc(x.t) + '</div><div class="tile__d">' + esc(x.d) + '</div></div>';
    }).join('');

    $('#tiers').innerHTML = TIERS.map(function (t, i) {
      var cls = ['rock', 'hard', 'mad'][i];
      return '<div class="tier tier--compact reveal">' +
        '<div class="tier__top">' +
          '<span class="tier__badge tier__badge--' + cls + '">' + esc(t.name) + '</span>' +
          '<b class="tier__cash">' + t.cashback + '% бонусами</b>' +
          '<span class="tier__from">' + (t.from === 0 ? 'с первого заказа' : 'от ' + t.from + ' бонусов') + '</span>' +
        '</div>' +
        '<ul class="tier__list">' + t.perks.map(function (p) { return '<li><span>' + esc(p) + '</span></li>'; }).join('') + '</ul></div>';
    }).join('');

    $('#punch-demo').innerHTML = punchHTML(7, true);

    $('#points').innerHTML = SHOP.points.map(function (p) {
      return '<article class="point-card" data-point="' + p.id + '" title="' + esc(p.features.join(' · ')) + ' — выбрать для предзаказа">' +
        '<div class="point-card__head"><b>' + esc(p.name) + '</b><span>' + esc(p.hours) + '</span></div>' +
        '<div class="point-card__addr">' + esc(p.address) + '</div>' +
        '<div class="point-card__note">' + esc(p.note) + '</div>' +
        '<span class="point-card__hint">Выбрать для предзаказа</span>' +
        '</article>';
    }).join('');

    /* Пять кофеен и карточка-приглашение: шесть карточек дают ровную сетку
       без одинокой карточки в последнем ряду. */
    var contactPhoto = [PHOTO.interior, PHOTO.interior2, PHOTO.interior3, PHOTO.interior4, PHOTO.hero];
    var tel = 'tel:' + SHOP.phone.replace(/[^+\d]/g, '');
    var cardHTML = function (opts) {
      return '<article class="contact-card">' +
        '<div class="contact-card__map">' + ph(opts.photo, opts.mark, 'ph--zoom', opts.alt, '(max-width: 780px) 92vw, 360px') +
        '<span class="contact-card__pin">' + esc(opts.pin) + '</span></div>' +
        '<div class="contact-card__b">' +
        '<div class="contact-card__n">' + esc(opts.title) + '</div>' +
        '<div class="cinfo">' + opts.rows.map(function (row) {
          return '<div class="cinfo__r"><span class="cinfo__i">' + row[0] + '</span><span>' + row[1] + '</span></div>';
        }).join('') + '</div>' +
        opts.cta +
        '</div></article>';
    };

    /* Пять кофеен — пять карточек: карточки-приглашения «Не знаете, какую
       выбрать?» в разделе больше нет, все карточки про кофейни. */
    $('#contacts-grid').innerHTML = SHOP.points.map(function (p, i) {
      return cardHTML({
        photo: contactPhoto[i] || PHOTO.interior,
        mark: p.name,
        alt: 'Кофейня MADROCK на ' + p.address,
        pin: '📍 ' + p.address,
        title: 'MADROCK · ' + p.name,
        rows: [
          ['🕗', '<b>' + esc(p.hours) + '</b> · ежедневно'],
          ['📞', '<a href="' + tel + '">' + esc(SHOP.phone) + '</a>'],
          ['💺', p.seats + ' мест'],
          ['🎒', esc(p.features.slice(0, 3).join(' · '))],
        ],
        cta: '<button class="btn btn--outline contact-card__cta" data-point="' + p.id + '" type="button" title="' +
          esc(p.features.join(' · ')) + '">Выбрать для предзаказа</button>',
      });
    }).join('');

    /* Оценка кофейни — в шапке блока отзывов: звёзды, цифра и площадки, по
       которым она сложилась. Цифры из открытых источников, объём оценок
       указан рядом — читателю видно, откуда взято число. */
    var stars = '';
    for (var s5 = 0; s5 < 5; s5++) stars += s5 < RATING.stars ? '★' : '☆';
    var revHead = $('#revs-head');
    if (revHead) {
      revHead.innerHTML =
        '<div class="rate">' +
          '<span class="rate__stars" aria-hidden="true">' + stars + '</span>' +
          '<b class="rate__num">' + esc(RATING.value) + '</b>' +
          '<span class="rate__src">' + esc(RATING.platform) + ' · ' + RATING.votes + ' оценки · ' + esc(RATING.date) + '</span>' +
        '</div>' +
        '<span class="sr-only">Средняя оценка ' + esc(RATING.value) + ' из 5 по данным ' + esc(RATING.platform) +
          ', ' + RATING.votes + ' оценки, ' + esc(RATING.date) + '</span>';
    }

    $('#revs').innerHTML = REVIEWS.map(function (r) {
      var stars = ''; for (var i = 0; i < 5; i++) stars += i < r.r ? '★' : '☆';
      /* На телефоне карточка узкая, и текст обрезается по строкам: полный
         отзыв показываем подсказкой, иначе прочитать его негде */
      return '<article class="rev"><div class="rev__stars" aria-label="Оценка ' + r.r + ' из 5">' + stars + '</div>' +
        '<p class="rev__txt" title="' + esc(r.t) + '">«' + esc(r.t) + '»</p>' +
        '<div class="rev__who"><span class="rev__av" aria-hidden="true">' + esc(r.n.charAt(0)) + '</span><span><span class="rev__name">' + esc(r.n) + '</span><br>' +
        '<span class="rev__src">' + esc(r.s) + '</span></span></div></article>';
    }).join('');

    /* Плитки ведут в профиль. Подписи поверх фотографий убраны по просьбе
       владельца — название кадра остаётся в alt (его читают скринридер и
       поисковик), а на самой картинке текста нет. */
    $('#gallery').innerHTML = GALLERY.map(function (g) {
      return '<a class="insta__t" href="https://instagram.com/' + esc(SHOP.instagram) + '" target="_blank" rel="noopener" title="' + esc(g.cap) + '">' +
        ph(g.img, 'IG', 'ph--zoom', g.cap, '(max-width: 780px) 31vw, 280px') + '</a>';
    }).join('');
  };

  var punchHTML = function (done, demo) {
    var out = '';
    for (var i = 1; i <= 10; i++) {
      out += '<div class="punch__c ' + (i <= done ? 'on' : '') + '" aria-hidden="true">' + (i <= done ? '☕' : i) + '</div>';
    }
    out += '<div class="punch__c gift" aria-hidden="true">' + (done >= 10 ? '🎁 11-й напиток ждёт вас!' : '🎁 Каждый 10-й напиток — в подарок' + (demo ? '' : ' · осталось ' + (10 - done))) + '</div>';
    out += '<span class="sr-only">Печатей в карте: ' + Math.min(10, done) + ' из 10. Каждый десятый напиток — в подарок.</span>';
    return out;
  };

  /* --- акция недели ------------------------------------------------------ */
  var renderPromo = function () {
    var cur = currentPromo();
    var p = cur.promo;
    shownWeek = cur.week;
    var it = byId(p.item);
    /* У акции может быть собственный кадр (p.photo): тогда в блоке акции стоит
       не то же фото, что в карточке каталога, — иначе одна и та же картинка
       повторяется на странице дважды. Нет своего — берём фото самой позиции. */
    var shot = p.photo || (it ? it.img : null);
    var shotAlt = it ? it.name : p.title;
    var off = Math.round((1 - p.promoPrice / p.price) * 100);
    $('#promo-box').innerHTML =
      '<div class="promo">' +
        '<div class="promo__main">' +
          '<span class="promo__flag"><i></i> Акция недели №' + cur.week + '</span>' +
          '<div class="promo__lead">' +
            '<div class="promo__lead-text">' +
              '<h3 class="promo__title">' + esc(p.title) + ' <span>' + esc(p.highlight) + '</span></h3>' +
              '<p class="promo__desc">' + esc(p.desc) + '</p>' +
            '</div>' +
            /* Фото напитка справа от текста: сразу видно, что именно предлагают
               на этой неделе. У акции может быть свой кадр, тогда он не
               повторяет карточку каталога; в понедельник кадр меняется вместе
               с предложением. */
            (shot ? '<div class="promo__photo">' +
              ph(shot, shotAlt, 'ph--zoom', shotAlt, '(max-width: 520px) 88px, 176px') +
              '</div>' : '') +
          '</div>' +
          '<div class="promo__price"><span class="promo__new">' + money(p.promoPrice).replace(' BYN', '') + '<small>BYN</small></span>' +
          '<span class="promo__old">' + money(p.price) + '</span>' +
          '<span class="badge badge--hot">−' + off + '%</span></div>' +
          '<div class="promo__cta">' +
            '<button class="btn btn--primary btn--lg" data-promo-add="' + esc(p.item) + '">Забрать по акции</button>' +
            (it ? '<button class="btn btn--ghost" data-open-item="' + esc(p.item) + '">Настроить напиток</button>' : '') +
            '<span class="small muted">' + esc(p.off) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="promo__side">' +
          '<div>' +
            '<div class="promo__week">До конца акции</div>' +
            /* Цифры таймера обновляются каждую секунду: для скринридера это шум,
               поэтому саму сетку скрываем, а словами об остатке говорит
               отдельная строка ниже — она обновляется раз в минуту. */
            '<div class="timer" id="timer" aria-hidden="true">' +
              '<div class="timer__cell"><div class="timer__n" id="t-d">00</div><div class="timer__l">дней</div></div>' +
              '<div class="timer__cell"><div class="timer__n" id="t-h">00</div><div class="timer__l">часов</div></div>' +
              '<div class="timer__cell"><div class="timer__n" id="t-m">00</div><div class="timer__l">минут</div></div>' +
              '<div class="timer__cell"><div class="timer__n" id="t-s">00</div><div class="timer__l">секунд</div></div>' +
            '</div>' +
            '<p class="sr-only" id="t-left">До конца акции</p>' +
            '<p class="xs muted" style="margin-top:.7rem">В понедельник 00:00 включится новое предложение из ' + PROMOS.length + ' в ротации.</p>' +
          '</div>' +
          '<ul class="promo__steps">' + p.conditions.map(function (c, i) {
            return '<li><span class="step-n">' + (i + 1) + '</span><span>' + esc(c) + '</span></li>';
          }).join('') + '</ul>' +
          '<div class="row"><span class="badge badge--hot">Скидка применяется в предзаказе автоматически</span></div>' +
        '</div>' +
      '</div>';

    renderTimer();
  };

  var renderTimer = function () {
    /* на границе недели предложение меняется: если гость оставил вкладку
       открытой, блок акции обязан перерисоваться вместе с таймером, иначе
       заголовок и условия описывают прошлую неделю, а скидка в корзине уже
       считается по новой */
    var cur = currentPromo();
    if (shownWeek !== cur.week) {
      shownWeek = cur.week;
      if ($('#promo-box').innerHTML) { renderPromo(); renderMenu(); }
    }
    var end = weekEnd(new Date()).getTime();
    var left = Math.max(0, end - Date.now());
    var s = Math.floor(left / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var dd = $('#t-d'), hh = $('#t-h'), mm = $('#t-m'), ss = $('#t-s');
    if (!dd) return;
    dd.textContent = pad(d); hh.textContent = pad(h); mm.textContent = pad(m); ss.textContent = pad(s);
    /* словами — раз в минуту: секунды озвучивать бессмысленно */
    var word = $('#t-left');
    if (word && word.dataset.min !== String(m)) {
      word.dataset.min = String(m);
      var parts = [];
      if (d) parts.push(d + ' ' + (d === 1 ? 'день' : (d < 5 ? 'дня' : 'дней')));
      if (h) parts.push(h + ' ' + (h === 1 ? 'час' : (h < 5 ? 'часа' : 'часов')));
      parts.push(m + ' ' + (m % 10 === 1 && m !== 11 ? 'минута' : 'минут'));
      word.textContent = 'До конца акции ' + parts.join(' ') + '. В понедельник 00:00 включится новое предложение.';
    }
  };

  /* --- витрины ----------------------------------------------------------- */
  var tagMap = {
    hit: ['tag--hit', 'Хит'],
    new: ['tag--new', 'Новинка'],
    veg: ['tag--veg', 'Veg'],
    fest: ['tag--fest', 'С фестиваля'],
    sale: ['tag--sale', 'Акция недели'],
  };

  var itemCard = function (it) {
    var cur = currentPromo().promo;
    var isPromo = cur.item === it.id;
    var tags = (it.tags || []).slice();
    if (isPromo) tags.unshift('sale');
    var price = isPromo
      ? '<span class="price">' + money(cur.promoPrice).replace(' BYN', '') + '<small>BYN</small></span> <span class="price--old">' + money(it.price).replace(' BYN', '') + '</span>'
      : '<span class="price">' + money(it.price).replace(' BYN', '') + '<small>BYN</small></span>';
    /* Карточка целиком открывает товар: раньше нажималась только кнопка ⚙,
       и казалось, что каталог не реагирует на нажатие. Роль кнопки карточке
       не даём: внутри неё есть свои кнопки («В избранное», «В предзаказ»,
       настройка), а вложенные в role="button" элементы скринридер перестаёт
       видеть — гость не смог бы добавить товар. С клавиатуры карточка
       открывается кнопкой ⚙, для мыши клик по всей карточке работает. */
    return '<article class="item reveal" data-open-item="' + esc(it.id) + '" title="Открыть и настроить">' +
      '<div class="item__ph">' + ph(it.img, it.name, 'ph--zoom', it.name, '(max-width: 780px) 31vw, 280px') + '</div>' +
      '<div class="item__tags">' + tags.map(function (t) {
        var m = tagMap[t] || ['tag--new', t];
        return '<span class="tag ' + m[0] + '">' + esc(m[1]) + '</span>';
      }).join('') + '</div>' +
      '<button class="item__fav ' + (fav.indexOf(it.id) >= 0 ? 'on' : '') + '" data-fav="' + esc(it.id) + '" type="button" aria-pressed="' + (fav.indexOf(it.id) >= 0 ? 'true' : 'false') + '" title="В избранное" aria-label="В избранное">' + (fav.indexOf(it.id) >= 0 ? '♥' : '♡') + '</button>' +
      '<div class="item__body">' +
        '<div class="item__top"><h3 class="item__name">' + esc(it.name) + '</h3><span class="item__vol">' + esc(it.vol) + '</span></div>' +
        ((it.taste || []).length ? '<div class="taste">' + it.taste.map(function (x) { return '<span class="taste__i">' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
        '<p class="item__desc">' + esc(it.desc) + '</p>' +
        '<div class="item__foot">' + price +
          '<span class="row" style="gap:.35rem">' +
            '<button class="add" data-open-item="' + esc(it.id) + '" type="button" title="Настроить" aria-label="Настроить: ' + esc(it.name) + '"><span aria-hidden="true">⚙</span></button>' +
            '<button class="add" data-add="' + esc(it.id) + '" type="button">В предзаказ</button>' +
          '</span>' +
        '</div>' +
      '</div></article>';
  };

  var visibleMenu = function () {
    var list = MENU.filter(function (it) {
      if (filter.cat !== 'all' && it.cat !== filter.cat) return false;
      if (filter.veg && (it.tags || []).indexOf('veg') < 0) return false;
      if (filter.hit && (it.tags || []).indexOf('hit') < 0) return false;
      if (filter.q) {
        var hay = (it.name + ' ' + it.en + ' ' + it.desc + ' ' + catName(it.cat)).toLowerCase();
        if (hay.indexOf(filter.q.toLowerCase()) < 0) return false;
      }
      return true;
    });
    if (filter.cheap) list = list.slice().sort(function (a, b) { return a.price - b.price; });
    return list;
  };

  var renderRail = function () {
    var counts = {};
    MENU.forEach(function (i) { counts[i.cat] = (counts[i.cat] || 0) + 1; });
    $('#rail').innerHTML = '<button class="rail__i ' + (filter.cat === 'all' ? 'on' : '') + '" data-cat="all">Всё меню<span>' + MENU.length + '</span></button>' +
      CATEGORIES.map(function (c) {
        return '<button class="rail__i ' + (filter.cat === c.id ? 'on' : '') + '" data-cat="' + c.id + '" title="' + esc(c.note) + '">' +
          c.ico + ' ' + esc(c.short || c.name) + '<span>' + (counts[c.id] || 0) + '</span></button>';
      }).join('');
  };

  var renderMenu = function () {
    /* Поле поиска сверяем с состоянием фильтра: браузер умеет сам подставлять
       в него прошлый текст (автозаполнение), и тогда каталог выглядел пустым
       без всякой причины. Источник правды — наш фильтр, а не поле. */
    var searchField = $('#search');
    if (searchField && searchField.value !== filter.q) searchField.value = filter.q;

    var list = visibleMenu();
    $('#menu-grid').innerHTML = list.map(itemCard).join('');
    $('#menu-count').textContent = list.length + ' позиций · ' + (filter.cat === 'all' ? 'всё меню' : catName(filter.cat));

    /* Пустой список обязан объяснять причину: чаще всего это забытый запрос в
       поиске — из-за него каталог выглядит пустым, и непонятно почему. */
    var empty = $('#menu-empty');
    empty.style.display = list.length ? 'none' : 'block';
    if (!list.length) {
      var parts = [];
      if (filter.q) parts.push('по запросу «' + esc(filter.q) + '»');
      if (filter.veg) parts.push('с растительным молоком');
      if (filter.hit) parts.push('среди хитов');
      if (filter.cat !== 'all') parts.push('в разделе «' + esc(catName(filter.cat)) + '»');
      $('#menu-empty-text').innerHTML = parts.length
        ? 'Ничего не нашлось ' + parts.join(' и ') + '. Сбросьте поиск и фильтры — вернётся всё меню.'
        : 'Ничего не нашли. Попробуйте другой запрос — или спросите бариста, соберём что-то вне меню.';
    }
    var clearBtn = $('#search-clear');
    if (clearBtn) clearBtn.hidden = !filter.q;

    /* Хиты бара рисуем ДО наблюдения за появлением блоков: карточки создаются
       с классом .reveal (прозрачные до первого показа), и если добавить их
       после bindReveal(), наблюдение их уже не увидит — блок оставался
       невидимым, хотя место на странице занимал. Ровно это и происходило
       после любой перерисовки каталога. */
    var cur = currentPromo().promo;
    $('#hits-grid').innerHTML = HITS.map(function (id) { return byId(id); }).filter(Boolean).map(itemCard).join('');
    bindReveal();
  };

  /* Сброс поиска и фильтров: возвращает всё меню одним нажатием */
  var resetMenuFilters = function () {
    filter.q = '';
    filter.veg = false;
    filter.hit = false;
    filter.cheap = false;
    var s = $('#search');
    if (s) s.value = '';
    ['#veg-toggle', '#hit-toggle', '#sort-toggle'].forEach(function (sel) {
      var t = $(sel);
      if (t) { t.classList.remove('on'); t.setAttribute('aria-pressed', 'false'); }
    });
    renderRail();
    renderMenu();
  };

  /* --- поиск: защита от автозаполнения -----------------------------------
     Забытый или подставленный браузером текст в поле поиска выглядел как
     «продукты пропали». Источник правды — filter.q; поле до первого касания
     держим пустым, а ввод без жеста человека (автозаполнение) игнорируем. */
  var keepSearchEmpty = function () {
    if (searchArmed) return;
    var s = $('#search');
    if (!s || !s.value) return;
    s.value = '';
    var c = $('#search-clear');
    if (c) c.hidden = true;
    if (filter.q) { filter.q = ''; renderRail(); renderMenu(); }
  };

  var armSearch = function () {
    if (searchArmed) return;
    searchArmed = true;
    var s = $('#search');
    if (s) s.removeAttribute('readonly');
    if (searchGuard) { clearInterval(searchGuard); searchGuard = null; }
  };

  /* Первый жест по полю: сначала стираем всё, что подставил браузер, потом
     разрешаем ввод — иначе подставленный текст попал бы в фильтр. */
  var startSearch = function () {
    if (searchArmed) return;
    var s = $('#search');
    if (s && s.value) s.value = '';
    var c = $('#search-clear');
    if (c) c.hidden = true;
    filter.q = '';
    armSearch();
  };

  var bindSearch = function () {
    var s = $('#search');
    if (!s) return;
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (ev) {
      s.addEventListener(ev, startSearch, { passive: true });
    });
    ['keydown', 'focus', 'paste', 'beforeinput'].forEach(function (ev) {
      s.addEventListener(ev, armSearch, { passive: true });
    });
    s.addEventListener('input', function () {
      /* ввод без жеста человека — это автозаполнение, а не запрос */
      if (!searchArmed) { this.value = ''; return; }
      filter.q = this.value.trim();
      renderMenu();
    });
    /* сторож: если браузер подставит текст позже или вообще без события */
    searchGuard = setInterval(keepSearchEmpty, 500);
    window.addEventListener('pageshow', keepSearchEmpty);
    document.addEventListener('visibilitychange', keepSearchEmpty);
  };

  /* --- модификаторы товара ---------------------------------------------- */
  var modState = { id: null, size: 's', milk: 'regular', syrup: '', extra: [] };

  /* --- окна: управление фокусом -------------------------------------------
     У окон заявлено aria-modal, значит фокус обязан уходить внутрь окна и
     возвращаться на прежнее место: иначе Tab уводит в страницу за подложкой,
     а после закрытия непонятно, где ты находишься. */
  var lastFocus = null;
  var focusIn = function (sel) {
    lastFocus = document.activeElement;
    var box = $(sel);
    if (!box) return;
    var slot = box.querySelector('.modal__c, .drawer__h');
    if (!slot) return;
    if (!slot.hasAttribute('tabindex')) slot.setAttribute('tabindex', '-1');
    /* preventScroll: окно открывается поверх страницы, и подпрыгивать к нему
       прокруткой не нужно — иначе фон «уезжает» под модалкой */
    try { slot.focus({ preventScroll: true }); } catch (e) { try { slot.focus(); } catch (e2) {} }
  };
  var focusBack = function () {
    var el = lastFocus;
    lastFocus = null;
    if (el && el.focus && document.contains(el)) { try { el.focus(); } catch (e) {} }
  };
  /* Простая ловушка Tab: внутри открытого окна табуляция ходит по кругу */
  var trapTab = function (e) {
    if (e.key !== 'Tab') return;
    var root = $('#account-modal').classList.contains('on') ? $('#account-modal')
      : $('#checkout-modal').classList.contains('on') ? $('#checkout-modal')
        : $('#item-modal').classList.contains('on') ? $('#item-modal')
          : $('#cart').classList.contains('on') ? $('#cart') : null;
    if (!root) return;
    var items = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter(function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  var openItem = function (id) {
    var it = byId(id);
    if (!it) return;
    modState = { id: id, size: 's', milk: 'regular', syrup: '', extra: [] };
    renderItem();
    $('#item-modal').classList.add('on');
    document.body.classList.add('no-scroll');
    focusIn('#item-modal');
  };

  var renderItem = function () {
    var it = byId(modState.id);
    var cur = currentPromo().promo;
    var isPromo = cur.item === it.id;
    var line = { id: it.id, size: modState.size, milk: modState.milk, syrup: modState.syrup, extra: modState.extra };
    var price = lineUnit(line);
    var shown = isPromo ? cur.promoPrice : price;
    var groups = MOD_GROUPS[it.cat] || [];

    $('#item-body').innerHTML =
      '<div class="grid-2 item-hero">' +
        '<div style="border-radius:var(--r-md);overflow:hidden;aspect-ratio:1">' + ph(it.img, it.name, '', it.name, '(max-width: 780px) 92vw, 260px') + '</div>' +
        '<div class="stack stack--sm">' +
          (isPromo ? '<span class="badge badge--hot">🔥 Акция недели — ' + money(cur.promoPrice).replace(' BYN', '') + ' BYN</span>' : '') +
          '<h3 class="h3">' + esc(it.name) + '</h3>' +
          '<p class="small muted">' + esc(it.desc) + '</p>' +
          ((it.taste || []).length ? '<div class="taste">' + it.taste.map(function (x) { return '<span class="taste__i">' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
          '<div class="row"><span class="xs mono muted">' + esc(it.vol) + '</span>' +
          '<span class="xs mono muted">· ' + esc(catName(it.cat)) + '</span></div>' +
        '</div>' +
      '</div>' +
      (groups.length ? '<div class="mods" style="margin-top:1.4rem">' +
        groups.map(function (g) {
          var grp = MODS[g];
          return '<div class="mod-group"><div class="mod-group__t"><span>' + esc(grp.title) + '</span><small>' + esc(grp.hint || '') + '</small></div>' +
            '<div class="mods-row" data-group="' + g + '">' +
            grp.opts.map(function (o) {
              var on = g === 'size' ? modState.size === o.id
                : g === 'milk' ? modState.milk === o.id
                  : g === 'syrup' ? modState.syrup === o.id
                    : modState.extra.indexOf(o.id) >= 0;
              return '<button type="button" class="mod ' + (on ? 'on' : '') + '" data-mod="' + g + ':' + o.id + '">' + esc(o.name) +
                (o.note ? ' <small>' + esc(o.note) + '</small>' : '') +
                (o.delta ? ' <small>+' + o.delta.toFixed(2).replace('.', ',') + '</small>' : '') + '</button>';
            }).join('') + '</div></div>';
        }).join('') + '</div>' : '') +
      '<div class="field" style="margin-top:1.2rem"><label for="item-note">Пожелание бариста</label>' +
      '<input class="input" id="item-note" placeholder="Например: без сахара, погорячее, с собой"></div>' +
      '<div class="between" style="margin-top:1.5rem;padding-top:1.2rem;border-top:1px solid var(--line)">' +
        '<div><div class="price" id="item-price">' + money(shown).replace(' BYN', '') + '<small>BYN</small></div>' +
        (price !== shown ? '<div class="xs muted">базовая цена ' + money(price) + ' по акции недели</div>' : '<div class="xs muted">итоговая цена с модификаторами</div>') + '</div>' +
        '<div class="row"><button class="btn btn--ghost" id="item-one" type="button">Отмена</button>' +
        '<button class="btn btn--primary" id="item-add" type="button">Добавить в предзаказ</button></div>' +
      '</div>';
  };

  var bindItemModal = function () {
    $('#item-modal').addEventListener('click', function (e) {
      if (e.target.id === 'item-modal') closeItem();
      var t = e.target.closest('[data-mod]');
      if (t) {
        var parts = t.getAttribute('data-mod').split(':');
        var g = parts[0], id = parts[1];
        if (g === 'extra') {
          var i = modState.extra.indexOf(id);
          if (i >= 0) modState.extra.splice(i, 1); else modState.extra.push(id);
        } else if (g === 'size') modState.size = id;
        else if (g === 'milk') modState.milk = id;
        else if (g === 'syrup') modState.syrup = modState.syrup === id ? '' : id;
        var note = $('#item-note') ? $('#item-note').value : '';
        renderItem();
        if ($('#item-note')) $('#item-note').value = note;
      }
    });
    $('#item-close').addEventListener('click', closeItem);
    $('#item-body').addEventListener('click', function (e) {
      if (e.target.id === 'item-one') closeItem();
      if (e.target.id === 'item-add') {
        addToCart({ id: modState.id, size: modState.size, milk: modState.milk, syrup: modState.syrup, extra: modState.extra.slice(), note: ($('#item-note') || {}).value || '', qty: 1 });
        closeItem();
      }
    });
  };
  var closeItem = function () { $('#item-modal').classList.remove('on'); if (!$('#checkout-modal').classList.contains('on')) document.body.classList.remove('no-scroll'); focusBack(); };

  /* --- корзина с предзаказом -------------------------------------------- */
  var addToCart = function (line) {
    /* позиция могла исчезнуть из данных (переименовали id, поправили акцию):
       без проверки в корзине оставался «призрак» — бейдж считал его, а строки
       в списке не было, и убрать его через интерфейс было нельзя */
    var it = byId(line.id);
    if (!it) { toast('Этой позиции больше нет в меню — выберите другую'); return; }
    var fresh = { id: line.id, size: line.size, milk: line.milk, syrup: line.syrup || '', extra: line.extra || [], note: line.note || '', qty: 1 };
    var key = lineKey(fresh);
    var found = null;
    cart.forEach(function (l) { if (lineKey(l) === key) found = l; });
    if (found) found.qty = Math.round(num(found.qty, 1)) + 1;
    else cart.push(fresh);
    saveCart();
    toast(it.name + ' — в предзаказе', 'ok');
    openCart();
  };
  var saveCart = function () { write(KEY.cart, cart); renderCart(); };

  var renderCart = function () {
    var n = cartCount();
    var badge = $('#cart-badge');
    badge.textContent = n;
    badge.classList.toggle('show', n > 0);
    /* цифра на значке скрыта от скринридера, поэтому количество объявляем
       отдельным текстом: иначе «0» в кружке ничего не сообщает */
    var badgeText = $('#cart-badge-text');
    if (badgeText) badgeText.textContent = n ? 'позиций в предзаказе: ' + n : 'предзаказ пуст';
    $('#cart-btn-count').textContent = n ? '· ' + n : '';
    $('#cart-sub').textContent = cart.length ? n + ' поз. · ' + money(orderTotal()) : 'Соберите заказ — заберёте без очереди';

    if (!cart.length) {
      $('#cart-body').innerHTML = '<div class="empty"><div class="empty__ico">☕</div>' +
        '<p>Пока пусто. Добавьте напиток из меню — и выберите время, когда вам удобно забрать.</p></div>' +
        '<a class="btn btn--soft btn--block" href="#menu" id="cart-to-menu">Перейти в меню</a>';
      $('#cart-foot').innerHTML = '';
      return;
    }

    $('#cart-body').innerHTML = cart.map(function (l, i) {
      var it = byId(l.id);
      if (!it) return '';                 // позиции больше нет в меню — строку пропускаем
      return '<div class="cart-line">' +
        '<div class="cart-line__ph">' + ph(it.img, '', '', it.name, '80px') + '</div>' +
        '<div><div class="cart-line__n">' + esc(it.name) + '</div>' +
        '<div class="cart-line__m">' + esc(modLabel(l) || it.vol) + '</div>' +
        '<div class="qty"><button data-qty="' + i + ':-1" aria-label="Меньше">−</button><span>' + l.qty + '</span><button data-qty="' + i + ':1" aria-label="Больше">+</button></div></div>' +
        '<div class="cart-line__right"><span class="price">' + money(lineUnit(l) * l.qty).replace(' BYN', '') + '<small>BYN</small></span>' +
        '<button class="cart-line__rm" data-rm="' + i + '">убрать</button></div></div>';
    }).join('');

    var disc = promoDiscount();
    $('#cart-foot').innerHTML =
      '<div class="sum">' +
        '<div class="sum__r"><span>Позиции</span><span>' + money(cartSubtotal()) + '</span></div>' +
        (disc ? '<div class="sum__r sum__r--bonus"><span>🔥 Акция недели</span><span>−' + money(disc) + '</span></div>' : '') +
        '<div class="sum__r"><span>Кэшбэк ' + cashback() + '%</span><span>+' + Math.round(orderTotal() * cashback() / 100) + ' бонусов</span></div>' +
        '<div class="sum__r sum__r--total"><span>Итого</span><span>' + money(orderTotal()) + '</span></div>' +
      '</div>' +
      '<button class="btn btn--primary btn--block btn--lg" id="to-checkout">Оформить предзаказ →</button>' +
      '<div class="row" style="margin-top:.7rem;justify-content:center"><span class="xs muted">Оплата в кофейне или онлайн · отмена в один клик</span></div>';
  };

  var openCart = function () {
    renderCart();
    $('#cart').classList.add('on');
    $('#scrim').classList.add('on');
    document.body.classList.add('no-scroll');
    focusIn('#cart');
  };
  var closeCart = function () {
    var on = $('#cart').classList.contains('on');
    $('#cart').classList.remove('on');
    $('#scrim').classList.remove('on');
    if (!$('#checkout-modal').classList.contains('on')) document.body.classList.remove('no-scroll');
    if (on) focusBack();
  };

  /* --- оформление -------------------------------------------------------- */
  var checkout = { step: 1, point: SHOP.points[0].id, time: 'asap', name: '', phone: '', pay: 'card', bonus: 0, comment: '' };

  var slots = function (pointId) {
    var p = null;
    SHOP.points.forEach(function (x) { if (x.id === pointId) p = x; });
    if (!p) p = SHOP.points[0];
    var out = [], n = new Date();
    /* Слоты считаем от текущего момента и сравниваем с часами работы как
       времени суток: иначе ночью предлагались слоты до открытия, а поздно
       вечером — время следующего дня, которое выглядело как сегодняшнее. */
    var start = new Date(n.getTime() + 30 * 60000);
    var mins = start.getMinutes();
    start.setMinutes(mins + (15 - mins % 15) % 15, 0, 0);
    for (var i = 0; i < 14; i++) {
      var t = new Date(start.getTime() + i * 15 * 60000);
      if (t.getDate() !== n.getDate()) break;                 // заказ только на сегодня
      var h = t.getHours() + t.getMinutes() / 60;
      if (h < p.open || h > p.close - 0.25) continue;          // кофейня должна быть открыта
      out.push(('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2));
    }
    return out;
  };

  var openCheckout = function () {
    if (!cart.length) { toast('Сначала добавьте напиток в предзаказ'); return; }
    checkout.step = 1;
    checkout.bonus = 0;
    /* время не переносим из прошлого заказа: старый слот мог остаться с утра */
    checkout.time = 'asap';
    if (user) { checkout.name = user.name || ''; checkout.phone = user.phone || ''; }
    closeCart();
    renderCheckout();
    $('#checkout-modal').classList.add('on');
    $('#scrim').classList.add('on');
    document.body.classList.add('no-scroll');
  };
  var closeCheckout = function () {
    $('#checkout-modal').classList.remove('on');
    $('#scrim').classList.remove('on');
    document.body.classList.remove('no-scroll');
  };

  var stepsHTML = function () {
    var names = ['Заказ', 'Кофейня и время', 'Контакты', 'Оплата'];
    return '<div class="steps">' + names.map(function (n, i) {
      var k = i + 1;
      return '<span class="steps__i ' + (checkout.step === k ? 'on' : checkout.step > k ? 'done' : '') + '"><b>' + (checkout.step > k ? '✓' : k) + '</b> ' + n + '</span>';
    }).join('') + '</div>';
  };

  var renderCheckout = function () {
    var s = '', total = orderTotal();
    if (checkout.step === 1) {
      s = stepsHTML() +
        '<h3 class="h3" style="margin-bottom:1rem">Проверьте заказ</h3>' +
        '<div class="stack stack--sm">' + cart.map(function (l, i) {
          var it = byId(l.id);
          return '<div class="between" style="padding:.6rem 0;border-bottom:1px solid var(--line)">' +
            '<div><b>' + esc(it.name) + '</b> <span class="small muted">×' + l.qty + '</span><br>' +
            '<span class="xs muted">' + esc(modLabel(l) || it.vol) + '</span></div>' +
            '<span class="price">' + money(lineUnit(l) * l.qty).replace(' BYN', '') + '<small>BYN</small></span></div>';
        }).join('') + '</div>' +
        '<div class="row" style="margin-top:1.2rem;justify-content:flex-end">' +
        '<button class="btn btn--soft" id="co-back-cart" type="button">Изменить</button>' +
        '<button class="btn btn--primary" data-step="2" type="button">Дальше: кофейня и время →</button></div>';
    }
    if (checkout.step === 2) {
      s = stepsHTML() +
        '<h3 class="h3" style="margin-bottom:1rem">Где и когда заберёте</h3>' +
        '<div class="grid-2" style="gap:.6rem;margin-bottom:1.2rem">' +
        SHOP.points.map(function (p) {
          return '<button type="button" class="pay__o ' + (checkout.point === p.id ? 'on' : '') + '" data-point-pick="' + p.id + '" style="text-align:left">' +
            '<span style="font-size:1.4rem">📍</span><span><b>' + esc(p.name) + '</b><small>' + esc(p.address) + ' · ' + esc(p.hours) + '</small></span></button>';
        }).join('') + '</div>' +
        '<div class="field" style="margin-bottom:.6rem"><label>Время готовности</label>' +
        '<div class="slots" id="slots"></div></div>' +
        '<p class="hint" style="margin-bottom:1.1rem">Так будет выглядеть заказ. В жизни бариста запускает напиток за 10 минут до слота — если заказ принят кофейней, а не собран в демонстрации.</p>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn btn--soft" data-step="1" type="button">← Назад</button>' +
        '<button class="btn btn--primary" data-step="3" type="button">Дальше: контакты →</button></div>';
    }
    if (checkout.step === 3) {
      s = stepsHTML() +
        '<h3 class="h3" style="margin-bottom:1rem">Как вас зовут</h3>' +
        '<div class="grid-2" style="gap:1rem;margin-bottom:1rem">' +
        '<div class="field"><label for="co-name">Имя</label><input class="input" id="co-name" value="' + esc(checkout.name) + '" placeholder="Как позвать на выдаче" autocomplete="name"></div>' +
        '<div class="field"><label for="co-phone">Телефон</label><input class="input" id="co-phone" type="tel" value="' + esc(checkout.phone) + '" placeholder="+375 (29) 000-00-00" inputmode="tel" autocomplete="tel"></div>' +
        '</div>' +
        '<div class="field" style="margin-bottom:1rem"><label for="co-comment">Комментарий</label><input class="input" id="co-comment" value="' + esc(checkout.comment) + '" placeholder="Например: позвонить, когда будет готово"></div>' +
        '<div class="panel panel--flat"><div class="between"><b>Номер телефона — это ваша клубная карта</b></div>' +
        '<p class="small muted" style="margin-top:.5rem">С этого заказа начислим ' + Math.round(total * cashback() / 100) + ' бонусов' + (user ? '' : ' и 50 приветственных бонусов за карту') + '. Напитки идут в карту «10-й в подарок».</p></div>' +
        '<div class="row" style="margin-top:1.2rem;justify-content:flex-end"><button class="btn btn--soft" data-step="2" type="button">← Назад</button>' +
        '<button class="btn btn--primary" data-step="4" type="button">Дальше: оплата →</button></div>';
    }
    if (checkout.step === 4) {
      var maxB = maxBonusSpend();
      var disc = promoDiscount();
      var pay = Math.max(0, total - checkout.bonus);
      s = stepsHTML() +
        '<h3 class="h3" style="margin-bottom:1rem">Оплата</h3>' +
        '<div class="pay" style="margin-bottom:1.2rem">' +
          '<label class="pay__o ' + (checkout.pay === 'card' ? 'on' : '') + '"><input type="radio" name="pay" value="card" ' + (checkout.pay === 'card' ? 'checked' : '') + '><span><b>Картой в кофейне</b><small>Оплатите при получении — наличными или картой</small></span></label>' +
          '<label class="pay__o ' + (checkout.pay === 'online' ? 'on' : '') + '"><input type="radio" name="pay" value="online" ' + (checkout.pay === 'online' ? 'checked' : '') + '><span><b>Онлайн-оплата</b><small>В демонстрации недоступна: у кофейни её нет, рассчитываются на баре</small></span></label>' +
        '</div>' +
        '<div class="field" style="margin-bottom:1rem"><label>Списать бонусы — доступно ' + (user ? user.points : 0) + ' б. (максимум ' + maxB + ')</label>' +
        '<input type="range" id="bonus-range" min="0" max="' + maxB + '" step="10" value="' + Math.min(checkout.bonus, maxB) + '" style="width:100%;accent-color:var(--amber)">' +
        '<div class="between small"><span class="muted">Списано: <b class="accent" id="bonus-val">' + Math.min(checkout.bonus, maxB) + '</b> б.</span><span class="muted">К списанию доступно до 50% чека</span></div></div>' +
        '<div class="panel panel--flat" style="margin-bottom:1.2rem"><div class="sum">' +
          '<div class="sum__r"><span>Позиции</span><span>' + money(cartSubtotal()) + '</span></div>' +
          (disc ? '<div class="sum__r sum__r--bonus"><span>🔥 Акция недели</span><span>−' + money(disc) + '</span></div>' : '') +
          '<div class="sum__r sum__r--bonus"><span>Бонусами</span><span>−' + money(checkout.bonus) + '</span></div>' +
          '<div class="sum__r sum__r--total"><span>К оплате</span><span id="pay-final">' + money(pay) + '</span></div>' +
          '<div class="sum__r sum__r--bonus"><span>Вернём бонусами ' + cashback() + '%</span><span>+' + Math.round(total * cashback() / 100) + ' б.</span></div>' +
        '</div></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn btn--soft" data-step="3" type="button">← Назад</button>' +
        '<button class="btn btn--primary btn--lg" id="confirm-order" type="button">Подтвердить предзаказ</button></div>';
    }
    $('#checkout-body').innerHTML = s;

    if (checkout.step === 2) {
      var box = $('#slots');
      var list = slots(checkout.point);
      box.innerHTML = '<button type="button" class="slot ' + (checkout.time === 'asap' ? 'on' : '') + '" data-slot="asap" style="grid-column:span 2">Как можно скорее</button>' +
        list.map(function (t) {
          return '<button type="button" class="slot ' + (checkout.time === t ? 'on' : '') + '" data-slot="' + t + '">' + t + '</button>';
        }).join('');
    }
    if (checkout.step === 4) {
      var r = $('#bonus-range');
      if (r) r.addEventListener('input', function () {
        checkout.bonus = parseInt(r.value, 10) || 0;
        $('#bonus-val').textContent = checkout.bonus;
        $('#pay-final').textContent = money(Math.max(0, orderTotal() - checkout.bonus));
      });
    }
  };

  var confirmOrder = function () {
    var total = orderTotal();
    var earned = Math.round(total * cashback() / 100);
    var isNew = !user;
    if (!user) {
      user = {
        phone: checkout.phone || '+375 (29) 000-00-00', name: checkout.name || 'Гость', points: 0, earned: 0,
        punch: 1, orders: [], coupons: SEED_COUPONS.map(function (c) { return Object.assign({}, c); }),
        ref: 'MADROCK-' + Math.random().toString(36).slice(2, 6).toUpperCase(), since: new Date().toISOString()
      };
    }
    var order = {
      id: 'MR-' + Math.floor(1000 + Math.random() * 9000),
      ts: new Date().toISOString(),
      point: checkout.point,
      time: checkout.time,
      items: cart.map(function (l) { return { id: l.id, qty: l.qty, label: modLabel(l) }; }),
      total: total,
      paid: Math.max(0, total - checkout.bonus),
      bonusSpent: checkout.bonus,
      bonusEarned: earned + (isNew ? 50 : 0),
      status: checkout.pay === 'online' ? 'Пример (оплата онлайн)' : 'Пример',
      pay: checkout.pay
    };
    user.points = Math.max(0, user.points - checkout.bonus) + order.bonusEarned;
    user.earned += order.bonusEarned;
    var drinks = cart.reduce(function (s, l) { var it = byId(l.id); return s + (!it || it.cat === 'food' ? 0 : l.qty); }, 0);
    var stamps = user.punch + drinks;
    var freeDrinks = Math.floor(stamps / 10);
    user.punch = stamps % 10;
    for (var f = 0; f < freeDrinks; f += 1) {
      user.coupons.push({
        code: 'FREE10-' + order.id + (f ? '-' + (f + 1) : ''),
        title: 'Напиток в подарок', value: '🎁',
        desc: 'Каждый 10-й напиток — от нас', used: false
      });
    }
    user.orders.unshift(order);
    if (user.orders.length > 24) user.orders.length = 24;
    write(KEY.user, user);

    var pt = null; SHOP.points.forEach(function (x) { if (x.id === order.point) pt = x; });

    $('#checkout-body').innerHTML =
      '<div class="center stack" style="gap:.8rem">' +
        '<div style="font-size:3rem">✅</div>' +
        '<h3 class="h2">Так будет выглядеть заказ ' + order.id + '</h3>' +
        '<p class="lead" style="margin:0 auto">Демонстрация: заказ не отправлен в кофейню, оплата не проводилась, бонусы условные.' +
        (checkout.time === 'asap' ? ' В жизни он был бы готов как можно скорее' : ' В жизни он был бы готов к ' + esc(checkout.time)) +
        ' — ' + esc(pt.name) + ', ' + esc(pt.address) + '. Заказать по-настоящему можно звонком: ' + esc(SHOP.phone) + '.</p>' +
        '<div class="panel panel--flat" style="text-align:left;max-width:420px;margin:0 auto">' +
          '<div class="between"><span class="muted">К оплате (пример)</span><b>' + money(order.paid) + '</b></div>' +
          '<div class="between"><span class="muted">Списано бонусами</span><b>' + checkout.bonus + ' б.</b></div>' +
          '<div class="between"><span class="muted">Начислено бонусов</span><b class="accent">+' + order.bonusEarned + ' б.</b></div>' +
          '<div class="between"><span class="muted">Ваш баланс</span><b>' + user.points + ' б.</b></div>' +
          '<div class="between"><span class="muted">Карта «10-й в подарок»</span><b>' + user.punch + '/10</b></div>' +
        '</div>' +
        '<div class="row" style="justify-content:center"><button class="btn btn--primary" id="co-done" type="button">Готово</button>' +
        '<button class="btn btn--ghost" type="button" data-account-view>В личный кабинет</button></div>' +
        '<p class="xs muted">Заказ сохранён только в вашем браузере: в кофейню он не ушёл, SMS не будет. Заказ по телефону — ' + esc(SHOP.phone) + '.</p>' +
      '</div>';

    cart = [];
    saveCart();
    renderAccount();
    toast('Пример заказа ' + order.id + ' сохранён · +' + order.bonusEarned + ' бонусов (условно)', 'ok');
  };

  /* --- вход, регистрация и личный кабинет --------------------------------
     Кнопка в шапке открывает форму входа и регистрации. Сам кабинет
     показывается после входа — или в демо-режиме просмотра, без регистрации. */
  var accView = 'auth';   // 'auth' — форма входа, 'account' — сам кабинет
  var authTab = 'login';  // 'login' — вход, 'reg' — регистрация

  var authHTML = function () {
    var reg = authTab === 'reg';
    /* Форма входа держится компактной: карточка должна помещаться в окно
       целиком, без внутренней прокрутки. Поэтому подсказки короткие, плиток
       два, а справа одна карточка с QR вместо двух. */
    var html =
        '<div class="grid-2 grid-2--wide auth-grid">' +
        '<div class="auth panel">' +
          '<div class="auth__switch"><button class="' + (reg ? '' : 'on') + '" id="tab-login" type="button">Вход</button><button class="' + (reg ? 'on' : '') + '" id="tab-reg" type="button">Регистрация</button></div>' +
          '<div class="stack stack--sm">' +
            '<div><h3 class="h3" id="auth-title">' + (reg ? 'Регистрация в MADROCK Club' : 'Вход в MADROCK Club') + '</h3>' +
            '<p class="small muted auth__note" id="auth-note">' + (reg
              ? 'Карта заводится по номеру телефона: 50 бонусов сразу.'
              : 'Номер телефона — ваша клубная карта: бонусы, купоны и печати.') + '</p></div>' +
            (reg
              ? '<div class="auth__pair">' +
                  '<div class="field"><label for="auth-name">Имя</label><input class="input" id="auth-name" placeholder="Имя" autocomplete="name"></div>' +
                  '<div class="field"><label for="auth-phone">Телефон</label><input class="input" id="auth-phone" placeholder="+375 (29) 000-00-00" inputmode="tel" autocomplete="tel"></div>' +
                '</div>'
              : '<div class="field"><label for="auth-phone">Телефон</label><input class="input" id="auth-phone" placeholder="+375 (29) 000-00-00" inputmode="tel" autocomplete="tel"></div>') +
            '<div class="field"><label for="auth-pass">Пароль</label><input class="input" id="auth-pass" type="password" placeholder="Минимум 4 символа" autocomplete="' + (reg ? 'new-password' : 'current-password') + '"></div>' +
            (reg ? '<label class="check" for="auth-terms"><input type="checkbox" id="auth-terms"><span>Согласен с правилами клуба и обработкой данных</span></label>' : '') +
            '<button class="btn btn--primary btn--block" id="auth-go" type="button">' + (reg ? 'Создать карту и получить 50 бонусов' : 'Войти в личный кабинет') + '</button>' +
            '<div class="auth__row">' +
              '<button class="auth-demo" id="auth-demo" type="button">Посмотреть личный кабинет без входа</button>' +
              '<span class="hint">любой номер и пароль от 4 символов</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="auth__side">' +
          '<div class="tier tier--compact">' +
            '<div class="tier__top"><span class="kicker" style="margin:0">Что даёт карта</span></div>' +
            '<ul class="tier__list">' +
              '<li><span>5–10% бонусами с каждого заказа</span></li>' +
              '<li><span>Каждый 10-й напиток в подарок</span></li>' +
              '<li><span>Оплата бонусами до 50% чека</span></li>' +
            '</ul>' +
          '</div>' +
          '<div class="tier tier--compact">' +
            '<div class="tier__top"><b class="tier__cash">Ваша карта</b><span class="tier__from">показывается на баре</span></div>' +
            '<div class="row auth__qr">' + qrHTML('madrock-demo') +
            '<p class="small muted" style="flex:1;min-width:12rem;margin:0">После входа здесь появится ваш код: печати и бонусы начислят без напоминаний.</p></div>' +
          '</div>' +
        '</div>' +
        '</div>';

    /* если гость уже вошёл, над формой показываем, кто это, и быстрый переход
       в сам кабинет — форма при этом остаётся на месте */
    return (user ? hereHTML() : '') + html;
  };

  /* Карточка показывает только вход и регистрацию: сам кабинет — отдельная
     страница (#account), куда переходим после входа. */
  var renderAccount = function () {
    var root = $('#acc-root');
    root.innerHTML = authHTML();
  };

  /* --- страница личного кабинета -----------------------------------------
     Отдельная страница на весь экран со своим адресом: сюда попадаем после
     входа или регистрации, отсюда же можно вернуться на сайт. */
  var accountPageOpen = function () {
    var page = $('#acc-page');
    return !!page && page.hidden === false;
  };

  var renderAccountPage = function (demo) {
    var body = $('#acc-page-body');
    var page = $('#acc-page');
    if (!body || !page) return;
    body.innerHTML = (demo ? demoNoteHTML() : '') + paintAccount(demo ? demoUser : user);
    page.hidden = false;
    page.scrollTop = 0;
    document.body.classList.add('acc-on');
  };

  var openAccountPage = function (demo) {
    accView = 'account';
    closeAccount();
    renderAccountPage(!!demo);
    try {
      if (location.hash !== '#account') history.replaceState(null, '', location.pathname + location.search + '#account');
    } catch (e) {}
  };

  var closeAccountPage = function () {
    var page = $('#acc-page');
    if (page) page.hidden = true;
    document.body.classList.remove('acc-on');
    try {
      if (location.hash === '#account') history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}
  };

  var paintAccount = function (src) {
    var user = src;
    var t = tierOf(user.earned), nt = nextTier(user.earned);
    var toNext = nt ? nt.from - user.earned : 0;
    var prog = nt ? Math.min(100, Math.round((user.earned - t.from) / (nt.from - t.from) * 100)) : 100;
    var activeCoupons = user.coupons.filter(function (c) { return !c.used; });

    return '' +
      '<div class="acc-hero">' +
        '<div class="card-bonus">' +
          '<div class="card-bonus__label"><span class="card-bonus__brand">MADROCK Club</span>' +
          '<span class="tier__badge tier__badge--' + (t.id === 'rock' ? 'rock' : t.id === 'hard' ? 'hard' : 'mad') + '">' + esc(t.name) + '</span></div>' +
        '<div class="card-bonus__main">' +
          '<div>' +
            '<div class="card-bonus__num">' + user.points + '<small>бонусов</small></div>' +
            '<div class="card-bonus__note">1 бонус = 1 рубль. Списывайте до 50% чека — в зале и в предзаказе.</div>' +
          '</div>' +
          '<div class="card-bonus__qr">' + qrHTML(user.phone) + '<span>Покажите на баре</span></div>' +
        '</div>' +
          '<div class="card-bonus__foot">' +
            '<div class="card-bonus__holder">' + esc(user.name || 'Гость') + ' · ' + esc(user.phone) + '</div>' +
            '<div class="card-bonus__holder">кэшбэк ' + t.cashback + '%</div>' +
          '</div>' +
          '<div style="margin-top:1.1rem">' +
            '<div class="between small" style="color:rgba(255,240,220,.75);margin-bottom:.4rem">' +
              '<span>' + (nt ? 'До уровня ' + nt.name + ' — ' + toNext + ' бонусов' : 'Максимальный уровень достигнут') + '</span>' +
              '<span>' + user.earned + ' б. всего</span></div>' +
            '<div class="progress"><div class="progress__i" style="width:' + prog + '%"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="stack">' +
          '<div class="tier">' +
            '<div class="between"><h3 class="h3">Карта «10-й в подарок»</h3><span class="small muted">' + user.punch + '/10</span></div>' +
            '<div class="punch">' + punchHTML(user.punch, false).replace('<div class="punch__c gift">', '<div class="punch__c gift">') + '</div>' +
            '<p class="small muted">Штамп за каждый напиток в предзаказе. Дошли до 10 — следующий напиток бесплатно, купон появится ниже.</p>' +
          '</div>' +
          '<div class="tier">' +
            '<div class="between"><h3 class="h3">Ваши купоны</h3><span class="badge badge--hot">' + activeCoupons.length + ' активных</span></div>' +
            '<div class="stack stack--sm">' + (user.coupons.length ? user.coupons.map(function (c) {
              return '<div class="coupon ' + (c.used ? 'used' : '') + '"><div class="coupon__v">' + esc(c.value) + '</div>' +
                '<div><div class="coupon__t">' + esc(c.title) + '</div><div class="coupon__d">' + esc(c.desc) + '</div></div>' +
                '<div style="text-align:right"><div class="coupon__code">' + esc(c.code) + '</div>' +
                '<button class="btn btn--outline" data-coupon="' + esc(c.code) + '" ' + (c.used ? 'disabled' : '') + ' type="button">' + (c.used ? 'Использован' : 'Применить') + '</button></div></div>';
            }).join('') : '<p class="small muted">Пока пусто — купоны появятся за заказы и подарки.</p>') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="grid-2" style="margin-top:var(--gap);align-items:start">' +
        '<div class="panel">' +
          '<div class="between" style="margin-bottom:1rem"><h3 class="h3">История заказов</h3>' +
          '<button class="btn btn--outline" id="acc-logout" type="button">Выйти</button></div>' +
          '<div class="hist">' + (user.orders.length ? user.orders.map(function (o) {
            var pt = null; SHOP.points.forEach(function (x) { if (x.id === o.point) pt = x; });
            var d = new Date(o.ts);
            return '<div class="hist__r">' +
              '<span class="hist__date">' + ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + '</span>' +
              '<span><b>' + esc(o.id) + '</b> <span class="small muted">· ' + esc(pt ? pt.name : '') + ' · ' + o.items.reduce(function (s, i) { return s + i.qty; }, 0) + ' поз.' +
              (o.time !== 'asap' ? ' · к ' + esc(o.time) : '') + '</span></span>' +
              '<span class="hist__pts">+' + o.bonusEarned + ' б.</span>' +
              '<span class="status-pill ' + (o.status === 'Пример' || o.status === 'Пример (оплата онлайн)' ? 'warn' : '') + '">' + esc(o.status) + '</span></div>';
          }).join('') : '<p class="small muted">Заказов пока нет. Оформите первый предзаказ — он появится здесь вместе с бонусами.</p>') + '</div>' +
        '</div>' +
        '<div class="stack">' +
          '<div class="panel">' +
            '<h3 class="h3" style="margin-bottom:.4rem">Приглашайте друзей</h3>' +
            '<p class="small muted" style="margin-bottom:1rem">Механика клуба: друг получает 200 бонусов на первый заказ, вы — 200 бонусов после его покупки. В демонстрации это только схема: бонусы условные, ссылку никуда отправлять не нужно.</p>' +
            '<div class="ref-box"><input class="input ref-box__field" id="ref-input" readonly value="' + esc('Код приглашения: ' + user.ref) + '">' +
            '<button class="btn btn--brand" id="ref-copy" type="button">Копировать</button></div>' +
            '<p class="hint" style="margin-top:.6rem">Ваш код: <b>' + esc(user.ref) + '</b></p>' +
          '</div>' +
          '<div class="panel">' +
            '<h3 class="h3" style="margin-bottom:1rem">Что дальше</h3>' +
            '<ul class="tier__list">' +
              '<li><span>' + (nt ? 'До уровня ' + nt.name + ' осталось ' + toNext + ' бонусов — это около ' + Math.max(1, Math.ceil(toNext / 1.2)) + ' заказов' : 'Вы на максимуме: 10% с каждого заказа') + '</span></li>' +
              '<li><span>Бонусы не сгорают 12 месяцев с последнего заказа</span></li>' +
              '<li><span>На день рождения начисляем двойной кэшбэк</span></li>' +
              '<li><span>Дегустации новинок — анонсы в Instagram @' + esc(SHOP.instagram) + ' и во ВКонтакте</span></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</div>';
  };

  /* --- демо-режим просмотра кабинета -------------------------------------
     Показывается по кнопке «Посмотреть личный кабинет»: ничего не сохраняет
     и не выдаёт себя за вход — просто показывает, как кабинет выглядит. */
  var demoOrder = function (id, daysAgo, point, time, picks, status) {
    var total = picks.reduce(function (sum, p) { var it = byId(p[0]); return sum + (it ? it.price * p[1] : 0); }, 0);
    return {
      id: id, ts: new Date(Date.now() - daysAgo * 86400000).toISOString(), point: point, time: time,
      items: picks.map(function (p) {
        var it = byId(p[0]);
        return { id: p[0], qty: p[1], label: it ? it.name : p[0] };
      }),
      total: Math.round(total * 100) / 100, paid: Math.round(total * 100) / 100, bonusSpent: 0,
      bonusEarned: Math.round(total * 0.07), status: status, pay: 'online'
    };
  };

  var demoUser = {
    phone: '+375 (29) 000-00-00', name: 'Гость', points: 120, earned: 340, punch: 7,
    ref: 'MADROCK-7X4K', since: new Date(Date.now() - 120 * 86400000).toISOString(),
    coupons: SEED_COUPONS.map(function (c) { return Object.assign({}, c); }),
    orders: [
      demoOrder('MR-4821', 2, 'sovetskaya42', '18:30', [['milkshake', 2], ['cheesecake', 1]], 'Оплачен'),
      demoOrder('MR-4790', 5, 'sovetskaya42', 'asap', [['cappuccino', 2]], 'Ждём вас'),
      demoOrder('MR-4633', 11, 'ilicha51', '09:15', [['latte', 1], ['croissant', 2]], 'Оплачен')
    ]
  };

  /* полоска «вы уже вошли» над формой */
  var hereHTML = function () {
    return '<div class="auth-here">' +
      '<span class="auth-here__who">Вы вошли как <b>' + esc(user.name || 'Гость') + '</b> · ' + esc(user.phone) + '</span>' +
      '<span class="row" style="gap:.5rem">' +
        '<button class="btn btn--brand" type="button" data-account-view>Открыть личный кабинет</button>' +
        '<button class="btn btn--outline" id="acc-logout" type="button">Выйти</button>' +
      '</span></div>';
  };

  /* плашка «это пример» на странице демонстрационного кабинета */
  var demoNoteHTML = function () {
    return '<div class="demo-note">' +
      '<span><b>Демо-режим.</b> Так выглядит личный кабинет: бонусы, купоны, печати и история заказов — образец. ' +
      'Чтобы завести свою карту, вернитесь к форме входа.</span>' +
      '<span class="row" style="gap:.5rem">' +
        '<button class="btn btn--brand" id="demo-to-auth" type="button">Войти или зарегистрироваться</button>' +
        '<button class="btn btn--outline" id="demo-exit" type="button">Вернуться на сайт</button>' +
      '</span></div>';
  };

  var login = function () {
    var reg = authTab === 'reg';
    var nameEl = $('#auth-name'), phoneEl = $('#auth-phone'), passEl = $('#auth-pass'), termsEl = $('#auth-terms');
    var name = nameEl ? nameEl.value : '';
    var phone = phoneEl ? phoneEl.value : '';
    var pass = passEl ? passEl.value : '';
    if (!phone || phone.replace(/\D/g, '').length < 6) {
      toast('Укажите номер телефона');
      if (phoneEl) phoneEl.focus();
      return;
    }
    if (pass.length < 4) {
      toast('Пароль — минимум 4 символа');
      if (passEl) passEl.focus();
      return;
    }
    if (reg && termsEl && !termsEl.checked) { toast('Отметьте согласие с правилами клуба'); return; }
    /* карта могла появиться раньше — например, при оформлении заказа: тогда
       регистрация не обнуляет бонусы, а просто открывает ту же карту */
    var known = !!user;
    if (user) {
      user.name = name || user.name || 'Гость';
      user.phone = phone;
    } else {
      user = {
        phone: phone, name: name || 'Гость', points: 50, earned: 50, punch: 1, orders: [],
        coupons: SEED_COUPONS.map(function (c) { return Object.assign({}, c); }),
        ref: 'MADROCK-' + Math.random().toString(36).slice(2, 6).toUpperCase(), since: new Date().toISOString()
      };
    }
    write(KEY.user, user);
    accView = 'account';
    /* после входа и регистрации уходим на отдельную страницу кабинета */
    openAccountPage(false);
    toast(reg
      ? (known ? 'Карта на этот номер уже есть — бонусы сохранили' : 'Карта создана: +50 бонусов на счёт')
      : 'С возвращением! Карта под рукой', 'ok');
  };

  /* --- возврат в начало страницы ------------------------------------------ */
  var goTop = function () {
    var soft = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: soft ? 'smooth' : 'auto' });
    var nav = $('#nav');
    if (nav) nav.classList.remove('on');
  };

  /* --- карточка личного кабинета -----------------------------------------
     Кнопка в шапке всегда открывает форму входа; сам кабинет — по кнопке
     «Открыть личный кабинет» (после входа) или «Посмотреть…» (демо-режим). */
  var openAccount = function (view) {
    accView = view === 'account' ? 'account' : 'auth';
    if (accView === 'auth') authTab = 'login';
    renderAccount();
    $('#account-modal').classList.add('on');
    $('#scrim').classList.add('on', 'scrim--clear');
    document.body.classList.add('no-scroll');
    focusIn('#account-modal');
  };
  var closeAccount = function () {
    var on = $('#account-modal').classList.contains('on');
    $('#account-modal').classList.remove('on');
    $('#scrim').classList.remove('on', 'scrim--clear');
    if (!$('#checkout-modal').classList.contains('on') && !$('#cart').classList.contains('on')) document.body.classList.remove('no-scroll');
    if (on) focusBack();
  };

  /* --- события ----------------------------------------------------------- */
  var bindEvents = function () {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-add],[data-open-item],[data-promo-add],[data-cat],[data-point],[data-point-pick],[data-slot],[data-step],[data-fav],[data-qty],[data-rm]');
      if (!t) return;

      var v;
      if ((v = t.getAttribute('data-add'))) { addToCart({ id: v, size: 's', milk: 'regular', extra: [], qty: 1 }); return; }
      if ((v = t.getAttribute('data-promo-add'))) { addToCart({ id: v, size: 's', milk: 'regular', extra: [], qty: 1 }); return; }
      if ((v = t.getAttribute('data-open-item'))) { openItem(v); return; }
      if ((v = t.getAttribute('data-fav'))) {
        var i = fav.indexOf(v);
        if (i >= 0) fav.splice(i, 1); else fav.push(v);
        write(KEY.fav, fav);
        t.classList.toggle('on', fav.indexOf(v) >= 0);
        t.textContent = fav.indexOf(v) >= 0 ? '♥' : '♡';
        toast(fav.indexOf(v) >= 0 ? byId(v).name + ' — в избранном' : 'Убрали из избранного', 'ok');
        return;
      }
      if ((v = t.getAttribute('data-cat'))) {
        filter.cat = v; renderRail(); renderMenu();
        var menu = $('#menu');
        if (menu && window.scrollY > menu.offsetTop + 200) menu.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if ((v = t.getAttribute('data-point'))) { checkout.point = v; closeCart(); openCheckout(); if (checkout.step === 1) checkout.step = 2; renderCheckout(); return; }
      if ((v = t.getAttribute('data-point-pick'))) { checkout.point = v; renderCheckout(); return; }
      if ((v = t.getAttribute('data-slot'))) { checkout.time = v; renderCheckout(); return; }
      if ((v = t.getAttribute('data-step'))) {
        var n = parseInt(v, 10);
        if (checkout.step === 3 && n === 4) {
          checkout.name = ($('#co-name') || {}).value || checkout.name;
          checkout.phone = ($('#co-phone') || {}).value || checkout.phone;
          checkout.comment = ($('#co-comment') || {}).value || '';
          if (!checkout.phone || checkout.phone.replace(/\D/g, '').length < 6) { toast('Укажите телефон — на него придёт подтверждение'); return; }
        }
        checkout.step = n; renderCheckout(); return;
      }
      if ((v = t.getAttribute('data-qty'))) {
        var q = v.split(':'), idx = parseInt(q[0], 10), d = parseInt(q[1], 10);
        var pos = cart[idx];
        /* строка могла исчезнуть после перерисовки — тогда нажатие игнорируем,
           иначе снималась соседняя позиция */
        if (!pos) return;
        pos.qty = Math.max(0, Math.round(num(pos.qty, 1)) + (isFinite(d) ? d : 0));
        if (pos.qty <= 0) cart.splice(idx, 1);
        saveCart(); return;
      }
      if ((v = t.getAttribute('data-rm'))) {
        var at = parseInt(v, 10);
        if (!cart[at]) return;
        cart.splice(at, 1); saveCart(); return;
      }
    });

    document.addEventListener('click', function (e) {
      if (e.target.id === 'cart-btn' || e.target.closest('#cart-btn')) openCart();
      if (e.target.id === 'cart-close' || e.target.id === 'scrim') closeCart();
      if (e.target.id === 'search-clear') resetMenuFilters();
      if (e.target.id === 'menu-reset') {
        filter.cat = 'all';
        resetMenuFilters();
        toast('Показали всё меню', 'ok');
      }
      if (e.target.id === 'open-cart-2' || e.target.closest('#open-cart-2')) openCart();
      if (e.target.id === 'to-checkout') openCheckout();
      if (e.target.id === 'cart-to-menu') closeCart();
      if (e.target.id === 'co-back-cart') { closeCheckout(); openCart(); }
      if (e.target.id === 'checkout-close') closeCheckout();
      if (e.target.id === 'confirm-order') confirmOrder();
      if (e.target.id === 'co-done') closeCheckout();
      /* кнопка в шапке: вошедшему гостю — его страница, остальным — вход */
      if (e.target.closest('[data-account-view]')) { e.preventDefault(); openAccountPage(false); }
      else if (e.target.closest('[data-account]')) { e.preventDefault(); if (user) openAccountPage(false); else openAccount('auth'); }
      if (e.target.id === 'account-close' || e.target.id === 'account-modal') closeAccount();
      if (e.target.id === 'acc-page-back') closeAccountPage();
      if (e.target.id === 'acc-page-logout') {
        user = null;
        write(KEY.user, null);
        closeAccountPage();
        openAccount('auth');
        toast('Вы вышли из кабинета');
      }
      if (e.target.id === 'auth-go') login();
      if (e.target.id === 'auth-demo') {
        openAccountPage(true);
        toast('Показываем пример кабинета — данные демонстрационные');
      }
      if (e.target.id === 'demo-to-auth') { closeAccountPage(); openAccount('auth'); }
      if (e.target.id === 'demo-exit') closeAccountPage();
      if (e.target.id === 'tab-login' || e.target.id === 'tab-reg') {
        authTab = e.target.id === 'tab-reg' ? 'reg' : 'login';
        renderAccount();
      }
      if (e.target.id === 'acc-logout') {
        user = null;
        write(KEY.user, null);
        accView = 'auth';
        authTab = 'login';
        closeAccountPage();
        renderAccount();
        toast('Вы вышли из кабинета');
      }
      if (e.target.id === 'ref-copy') {
        var inp = $('#ref-input');
        var button = $('#ref-copy');
        var report = function () {
          toast('Ссылка скопирована', 'ok');
          if (!button) return;
          var label = button.textContent;
          button.textContent = 'Скопировано';
          button.classList.add('done');
          setTimeout(function () { button.textContent = label; button.classList.remove('done'); }, 2200);
        };
        if (!inp) return;
        inp.select();
        var copied = false;
        try { copied = document.execCommand('copy'); } catch (err) { copied = false; }
        if (copied) { report(); return; }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(inp.value).then(report).catch(function () { toast('Скопируйте вручную: ' + inp.value); });
        } else {
          toast('Скопируйте вручную: ' + inp.value);
        }
      }
      /* логотип в шапке и в подвале возвращает в самое начало страницы: якорь
         #home останавливал прокрутку так, что верх титульного блока уходил
         под закреплённую шапку */
      if (e.target.closest('.logo')) { e.preventDefault(); goTop(); }
      if (e.target.closest('#totop')) goTop();
      /* значок меню на телефоне: палец попадает по «☰» внутри кнопки, поэтому
         сверяемся с кнопкой-родителем, а не с самим значком */
      if (e.target.id === 'burger' || e.target.closest('#burger')) {
        var nav = $('#nav');
        var open = nav.classList.toggle('on');
        var b = $('#burger');
        if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
        return;
      }
      /* клик вне открытого меню закрывает его */
      if ($('#nav').classList.contains('on') && !e.target.closest('#nav')) {
        $('#nav').classList.remove('on');
        var bb = $('#burger');
        if (bb) bb.setAttribute('aria-expanded', 'false');
      }
      var navLink = e.target.closest('#nav a');
      if (navLink) {
        $('#nav').classList.remove('on');
        $$('#nav a').forEach(function (a) { a.classList.toggle('on', a === navLink); });
      }
      var cp = e.target.closest('[data-coupon]');
      if (cp) {
        if (!user) { toast('В демо-режиме купоны не активируются — войдите в кабинет'); return; }
        var code = cp.getAttribute('data-coupon');
        user.coupons.forEach(function (c) { if (c.code === code) c.used = true; });
        write(KEY.user, user);
        if (accountPageOpen()) renderAccountPage(false); else renderAccount();
        toast('Купон ' + code + ' активирован — покажите на баре', 'ok');
      }
      if (e.target.id === 'item-modal') closeItem();
      if (e.target.id === 'checkout-modal') closeCheckout();
    });

    $('#item-modal').addEventListener('click', function (e) { if (e.target === this) closeItem(); });
    $('#checkout-modal').addEventListener('click', function (e) { if (e.target === this) closeCheckout(); });

    document.addEventListener('change', function (e) {
      if (e.target.name === 'pay') { checkout.pay = e.target.value; renderCheckout(); }
    });

    document.addEventListener('keydown', function (e) {
      /* карточка товара открывается и с клавиатуры: она теперь нажимается как кнопка */
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      var card = e.target.closest ? e.target.closest('.item[data-open-item]') : null;
      if (!card || e.target !== card) return;
      e.preventDefault();
      openItem(card.getAttribute('data-open-item'));
    });

    document.addEventListener('keydown', function (e) {
      trapTab(e);
      if (e.key !== 'Escape') return;
      if ($('#account-modal').classList.contains('on')) closeAccount();
      else if ($('#checkout-modal').classList.contains('on')) closeCheckout();
      else if ($('#item-modal').classList.contains('on')) closeItem();
      else if ($('#cart').classList.contains('on')) closeCart();
      else if ($('#nav').classList.contains('on')) {
        $('#nav').classList.remove('on');
        var bb = $('#burger');
        if (bb) { bb.setAttribute('aria-expanded', 'false'); bb.focus(); }
      }
    });

    bindSearch();
    var toggles = { '#veg-toggle': 'veg', '#hit-toggle': 'hit', '#sort-toggle': 'cheap' };
    Object.keys(toggles).forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.addEventListener('click', function () {
        var key = toggles[sel];
        filter[key] = !filter[key];
        this.classList.toggle('on', filter[key]);
        this.setAttribute('aria-pressed', filter[key] ? 'true' : 'false');
        renderMenu();
      });
    });

    /* Подсветка активного пункта. Разделы берём в порядке разметки и считаем
       их позиции один раз (при загрузке и после изменения размера окна):
       чтение offsetTop на каждом событии прокрутки заставляло браузер заново
       пересчитывать вёрстку и делало прокрутку дёрганой. */
    var navSections = function () {
      return $$('#nav a').map(function (a) {
        var id = (a.getAttribute('href') || '').replace('#', '');
        return { id: id, a: a, el: id ? document.getElementById(id) : null };
      }).filter(function (s) { return s.el !== null; })
        .sort(function (x, y) { return x.el.offsetTop - y.el.offsetTop; });
    };
    var sections = [];
    var measure = function () {
      sections = navSections();
      sections.forEach(function (s) { s.top = s.el.offsetTop; });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    var ticking = false;
    var paint = function () {
      ticking = false;
      var y = window.scrollY;
      $('#hdr').classList.toggle('scrolled', y > 20);
      var totop = $('#totop');
      if (totop) totop.classList.toggle('on', y > 700);
      var line = y + 150, cur = '';
      for (var i = 0; i < sections.length; i++) if (sections[i].top <= line) cur = sections[i].id;
      sections.forEach(function (s) { s.a.classList.toggle('on', s.id === cur); });
    };
    var onScroll = function () {
      /* классы и позиции читаем не чаще одного раза на кадр */
      if (ticking) return;
      ticking = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(paint);
      else setTimeout(paint, 16);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    paint();
  };

  var revealOb = null;
  var bindReveal = function () {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); return; }
    if (revealOb) revealOb.disconnect();   // без этого наблюдатель копил удалённые узлы при каждой перерисовке
    if (!revealOb) {
      revealOb = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); revealOb.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -60px 0px', threshold: .08 });
    }
    $$('.reveal:not(.in)').forEach(function (el) {
      /* Что уже видно на экране — показываем сразу, не ожидая наблюдателя:
         блок не должен оставаться прозрачным ни из-за задержки, ни из-за
         того, что элемент добавили в разметку после подписки. Анимация
         остаётся для того, что ниже экрана. */
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 200 && r.bottom > -200) el.classList.add('in');
      else revealOb.observe(el);
    });
  };

  /* --- адрес страницы кабинета -------------------------------------------
     #account открывает личный кабинет отдельной страницей; вошедшему — его
     карта, остальным — карточка входа. */
  var bindAccountRoute = function () {
    var apply = function () {
      if (location.hash !== '#account') {
        if (accountPageOpen()) closeAccountPage();
        return;
      }
      if (user) openAccountPage(false);
      else openAccount('auth');
    };
    window.addEventListener('hashchange', apply);
    if (location.hash === '#account') setTimeout(apply, 60);
  };

  /* --- бегущая строка ------------------------------------------------------
     Строку двигаем сами, кадр за кадром: CSS-анимация внутри маскированного
     блока замирала в Safari, а медиазапрос «меньше движения» выключал её у
     тех, кто просто не менял настройку телефона. Здесь движение включено
     всегда, а остановить его можно кнопкой в правом краю полосы (WCAG 2.2.2). */
  var initTicker = function () {
    var ticker = $('#ticker'), row = $('#ticker-row'), btn = $('#ticker-pause');
    if (!ticker || !row || !row.firstChild) return;

    var half = 0, shift = 0, last = 0, raf = 0, paused = false;
    var speed = function () { return window.innerWidth <= 780 ? 34 : 52; };   // px в секунду

    var frame = function (t) {
      raf = 0;
      if (!last) last = t;
      /* потолок шага: после сворачивания вкладки не должно быть рывка */
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!paused && half > 0) {
        shift = (shift + speed() * dt) % half;
        row.style.transform = 'translate3d(' + (-shift).toFixed(2) + 'px,0,0)';
      }
      raf = requestAnimationFrame(frame);
    };
    var play = function () { if (!raf && half > 0) { last = 0; raf = requestAnimationFrame(frame); } };
    var stop = function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    /* Полоса бежит, только если надписи длиннее её полей: иначе строка просто
       лежит по центру (класс ticker--run снимается, кнопка прячется).
       Период считаем, заранее включив режим движения: в свёрнутом состоянии
       надписи стоят в две строки, и по их позициям длину линии не измерить —
       из-за этого строка раньше оставалась неподвижной. */
    var measure = function () {
      var fields = row.parentElement.clientWidth;
      ticker.classList.add('ticker--run');
      var kids = row.children;
      var mid = kids[Math.floor(kids.length / 2)];
      half = (kids.length > 2 && mid) ? (mid.offsetLeft - kids[0].offsetLeft) : row.scrollWidth / 2;
      var runs = half > fields + 8;
      if (!runs) {
        ticker.classList.remove('ticker--run');
        row.style.transform = 'none';
        stop();
      } else if (!paused) play();
    };

    btn.addEventListener('click', function () {
      paused = !paused;
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.setAttribute('aria-label', paused ? 'Запустить бегущую строку' : 'Остановить бегущую строку');
      if (paused) stop(); else { last = 0; play(); }
    });

    window.addEventListener('resize', measure);
    /* Шрифт грузится после первого замера и меняет ширину надписей — период
       нужно пересчитать, иначе на стыке копий будет заметный рывок. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(function () {});
    measure();
  };

  /* --- запуск ------------------------------------------------------------ */
  var init = function () {
    renderShell();
    initTicker();
    renderStatus();
    renderPromo();
    renderRail();
    renderMenu();
    renderCart();
    renderAccount();
    bindItemModal();
    bindEvents();
    bindReveal();
    bindAccountRoute();

    /* Поле поиска открывается пустым и остаётся таким, пока человек его не
       тронул: браузерное автозаполнение стирает сторож из bindSearch(). Это
       и есть причина «пропавших» продуктов при выборе раздела меню. */
    filter.q = '';
    renderRail();
    renderMenu();

    /* Раньше здесь прогревался кэш всех 35 фото каталога: телефон скачивал
       ~5 МБ сразу после загрузки и конкурировал с главным фото. Теперь файлы
       в разы легче, а отложенная загрузка берёт только то, что видно. */

    setInterval(renderTimer, 1000);
    setInterval(renderStatus, 60000);

    // демо-подсказка о бонусах для тех, кто ещё не в клубе
    setTimeout(function () {
      /* sessionStorage тоже может быть недоступен (приватный режим, вставка на
         чужую страницу) — раньше это роняло таймер исключением */
      var seen = false;
      try { seen = !!sessionStorage.getItem('madrock.hint'); } catch (e) { seen = true; }
      if (!user && !seen) {
        try { sessionStorage.setItem('madrock.hint', '1'); } catch (e) {}
        toast('Загляните в личный кабинет: 50 приветственных бонусов', 'ok');
      }
    }, 6000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
