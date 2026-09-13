/* ==========================================================================
   MADROCK COFFEE · данные проекта
   Всё, что меняется без правки вёрстки: кофейни, меню, акции, уровни, отзывы.

   ИСТОЧНИКИ ФАКТОВ (собраны командой исследования, см. research/01-madrock-facts.md):
   • адреса и часы — Яндекс.Карты, RestaurantGuru, 2pos.by, spisok.by (2026);
   • флагман: ул. Советская, 42, тел. +375 29 642-86-13, 08:00–23:00;
   • Instagram @madrock_coffee, VK vk.com/madrockcoffe_gomel;
   • позиционирование: «настоящий итальянский кофе», густые молочные коктейли,
     30+ сиропов, десерты городских кондитеров, интерьер с росписями;
   • подтверждённые позиции: «black капучино» 350 мл (фестиваль Gastrofest 2023),
     «Рок и карамель», молочный коктейль, сэндвичи, чай (имбирный, каркаде);
   • уровень цен: капучино 2,5–3,5 BYN.

   ЦЕНЫ НИЖЕ — ДЕМОНСТРАЦИОННЫЕ: публичного меню с ценами у кофейни нет нигде,
   цифры собраны по уровню подтверждённых позиций и рынка Гомеля.
   ========================================================================== */

/** Фото лежат локально в assets/: страница не зависит от внешней сети. */
const PHOTO = {
  hero:       'hero.jpg',
  /* плитки раздела Instagram: квадрат 1080×1080, подобраны по внешнему виду */
  ig1:        'ig1.jpg',
  ig3:        'ig3.jpg',
  ig4:        'ig4.jpg',
  ig5:        'ig5.jpg',
  ig6:        'ig6.jpg',
  ig7:        'ig7.jpg',
  interior:   'interior.jpg',
  interior2:  'interior2.jpg',
  /* Кадры barista, beans и syrup убраны из набора: они были объявлены, но ни
     одна часть сайта их не использовала, а в публикацию уезжало 12 файлов
     (~0,5 МБ). Исходные кадры остались в assets/_crops и assets/_original. */
  espresso:   'espresso.jpg',
  americano:  'americano.jpg',
  cappuccino: 'cappuccino.jpg',
  bigblack:   'big_black.jpg',
  latte:      'latte.jpg',
  lattcoco:   'latte_coco.jpg',
  flatwhite:  'flatwhite.jpg',
  raf:        'raf.jpg',
  mocha:      'mocha.jpg',
  glace:      'glace.jpg',
  icelatte:   'ice_latte.jpg',
  milkshake:  'milkshake.jpg',
  frappe:     'frappe.jpg',
  smoothie:   'smoothie.jpg',
  lemonade:   'lemonade.jpg',
  cocoa:      'cocoa.jpg',
  hotchoc:    'hot_choc.jpg',
  tea:        'tea.jpg',
  mulled:     'mulled.jpg',
  signature:  'signature.jpg',
  croissant:  'croissant.jpg',
  sandwich:   'sandwich.jpg',
  panini:     'panini.jpg',
  hotdog:     'hotdog.jpg',
  shawarma:   'shawarma.jpg',
  burger:     'burger.jpg',
  cheesecake: 'cheesecake.jpg',
  icecream:   'icecream.jpg',
  eclair:     'eclair.jpg',
  doppio:     'doppio.jpg',
  lavraf:     'lavraf.jpg',
  nutmocha:   'nutmocha.jpg',
  teaginger:  'teaginger.jpg',
  orangeesp:  'orangeesp.jpg',
  icetea:     'icetea.jpg',
  interior3:  'interior3.jpg',
  interior4:  'interior4.jpg',
};

/* --- кофейни --------------------------------------------------------------- */
const SHOP = {
  name: 'MADROCK COFFEE',
  city: 'Гомель',
  tagline: 'Итальянский кофе, густые коктейли и десерты',
  phone: '+375 29 642-86-13',
  phone2: '8 044 558-71-80',
  instagram: 'madrock_coffee',
  vk: 'madrockcoffe_gomel',
  legal: 'ООО «РИТЕЙЛ» · УНП уточняется',
  points: [
    {
      id: 'sovetskaya42', name: 'Советская, 42', address: 'ул. Советская, 42',
      note: 'Флагман: у цирка, угол с проспектом Победы', hours: '08:00 – 23:00', open: 8, close: 23, seats: 40,
      features: ['Густые милкшейки', '30+ сиропов', 'Десерты на витрине', 'Росписи на стенах'],
    },
    {
      id: 'ilicha51', name: 'Ильича, 51Г', address: 'ул. Ильича, 51Г',
      note: 'Новобелицкий район, у кинотеатра «Мир»', hours: '08:00 – 22:00', open: 8, close: 22, seats: 24,
      features: ['Завтраки с 8:00', 'С собой и в зале', 'Парковка у входа'],
    },
    {
      id: 'krestyanskaya33', name: 'Крестьянская, 33', address: 'ул. Крестьянская, 33',
      note: 'Рядом с рынком, самый ранний старт', hours: '07:30 – 22:00', open: 7.5, close: 22, seats: 20,
      features: ['Открываемся в 7:30', 'Кофе на бегу', 'Предзаказ к времени'],
    },
    {
      id: 'gagarina65', name: 'Гагарина, 65', address: 'ул. Гагарина, 65',
      note: 'Жилой район, окна во двор', hours: '07:30 – 21:00', open: 7.5, close: 21, seats: 18,
      features: ['Тихое место для работы', 'Розетки', 'Wi-Fi'],
    },
    {
      id: 'sovetskaya72', name: 'Советская, 72', address: 'ул. Советская, 72',
      note: 'Пешеходная часть улицы', hours: '08:00 – 21:45', open: 8, close: 21.75, seats: 16,
      features: ['Веранда летом', 'Кофе с собой', 'Витрина с выпечкой'],
    },
  ],
};

/* --- категории меню ------------------------------------------------------- */
const CATEGORIES = [
  { id: 'coffee',    name: 'Кофе по-итальянски', short: 'Кофе', ico: '☕', note: 'Эспрессо-машина, плотный шот, молочная пена' },
  { id: 'author',    name: 'Авторские и сиропы', short: 'Авторские', ico: '🔥', note: '30+ сиропов на баре' },
  { id: 'cold',      name: 'Холодные и коктейли', short: 'Холодные', ico: '🥤', note: 'Густые милкшейки, фраппе, лимонады' },
  { id: 'notcoffee', name: 'Не кофе', short: 'Не кофе', ico: '🍫', note: 'Какао, горячий шоколад, чай, глинтвейн' },
  { id: 'food',      name: 'Кухня', short: 'Кухня', ico: '🥪', note: 'Сэндвичи, панини, хот-доги, шаурма' },
  { id: 'dessert',   name: 'Десерты', short: 'Десерты', ico: '🍰', note: 'От городских кондитеров' },
];

/* --- модификаторы --------------------------------------------------------- */
const MODS = {
  size: {
    title: 'Объём', hint: 'базовый 200 мл',
    opts: [
      { id: 's', name: 'S', note: '200 мл', delta: 0 },
      { id: 'm', name: 'M', note: '300 мл', delta: 0.7 },
      { id: 'l', name: 'L', note: '400 мл', delta: 1.4 },
    ],
  },
  milk: {
    title: 'Молоко', hint: 'обычное бесплатно',
    opts: [
      { id: 'regular', name: 'Обычное', delta: 0 },
      { id: 'lactose', name: 'Безлактозное', delta: 0.5 },
      { id: 'coconut', name: 'Кокосовое', delta: 0.8 },
      { id: 'almond', name: 'Миндальное', delta: 0.8 },
    ],
  },
  syrup: {
    title: 'Сироп', hint: 'ещё 30+ — спросите на баре',
    opts: [
      { id: 'caramel', name: 'Солёная карамель', delta: 0.7 },
      { id: 'vanilla', name: 'Ваниль', delta: 0.7 },
      { id: 'hazelnut', name: 'Лесной орех', delta: 0.7 },
      { id: 'lavender', name: 'Лаванда', delta: 0.7 },
      { id: 'orange', name: 'Апельсин', delta: 0.7 },
      { id: 'choco', name: 'Шоколад', delta: 0.7 },
    ],
  },
  extra: {
    title: 'Дополнительно', hint: 'по желанию',
    opts: [
      { id: 'shot', name: '+1 эспрессо', delta: 1.2 },
      { id: 'cream', name: 'Взбитые сливки', delta: 0.8 },
      { id: 'marsh', name: 'Маршмеллоу', delta: 0.7 },
      { id: 'ice', name: 'Со льдом', delta: 0 },
      { id: 'decaf', name: 'Декаф', delta: 0.9 },
    ],
  },
};

/* --- меню ----------------------------------------------------------------- */
/* price — цена за базовую порцию; итог = price + модификаторы.
   taste — короткие чипсы вкуса: их видно до чтения описания. */
const MENU = [
  { id: 'espresso', cat: 'coffee', name: 'Эспрессо', en: 'Espresso', vol: '40 мл', price: 2.60,
    desc: 'Плотный итальянский шот: тёмный шоколад, орех, карамельный финиш.', taste: ['шоколад', 'орех', 'карамель'], img: PHOTO.espresso, tags: [] },
  { id: 'doppio', cat: 'coffee', name: 'Доппио', en: 'Doppio', vol: '80 мл', price: 3.20,
    desc: 'Двойной шот для тех, кому одного мало. Тот же характер, вдвое громче.', taste: ['крепко', 'шоколад'], img: PHOTO.doppio, tags: [] },
  { id: 'americano', cat: 'coffee', name: 'Американо', en: 'Americano', vol: '200/300 мл', price: 3.00,
    desc: 'Эспрессо и горячая вода. Чисто, бодро, без лишнего.', taste: ['чисто', 'бодро'], img: PHOTO.americano, tags: ['veg'] },
  { id: 'cappuccino', cat: 'coffee', name: 'Капучино', en: 'Cappuccino', vol: '200/300 мл', price: 3.30,
    desc: 'Классика с плотной молочной пенкой, какао и аккуратным рисунком.', taste: ['молочный', 'мягкий'], img: PHOTO.cappuccino, tags: ['hit'] },
  { id: 'bigblack', cat: 'coffee', name: 'Black капучино 350 мл', en: 'Black Cappuccino', vol: '350 мл', price: 4.20,
    desc: 'Наш фестивальный напиток: большой стакан, двойной эспрессо и плотная пена.', taste: ['большой', 'крепче'], img: PHOTO.bigblack, tags: ['hit', 'fest'] },
  { id: 'latte', cat: 'coffee', name: 'Латте', en: 'Latte', vol: '300/400 мл', price: 3.80,
    desc: 'Мягкое молоко, аккуратное латте-арт, комфортная сладость.', taste: ['мягкий', 'молочный'], img: PHOTO.latte, tags: [] },
  { id: 'lattecoco', cat: 'coffee', name: 'Латте на кокосовом', en: 'Coconut Latte', vol: '300 мл', price: 4.40,
    desc: 'Кокосовое молоко вместо обычного: лёгкая тропическая сладость.', taste: ['кокос', 'лёгкий'], img: PHOTO.lattcoco, tags: ['veg'] },
  { id: 'flatwhite', cat: 'coffee', name: 'Флэт уайт', en: 'Flat White', vol: '250 мл', price: 4.00,
    desc: 'Двойной ристретто и тонкий слой микропены. Для тех, кто любит покрепче.', taste: ['крепко', 'плотно'], img: PHOTO.flatwhite, tags: [] },
  { id: 'raf', cat: 'coffee', name: 'Раф классический', en: 'Raf', vol: '300 мл', price: 4.30,
    desc: 'Сливки, ваниль и эспрессо — десерт, который можно пить.', taste: ['сливки', 'ваниль'], img: PHOTO.raf, tags: ['hit'] },
  { id: 'mocha', cat: 'coffee', name: 'Мокко', en: 'Mocha', vol: '300 мл', price: 4.20,
    desc: 'Шоколад, эспрессо, молоко. Сверху — сливки, если разрешите.', taste: ['шоколад', 'сладко'], img: PHOTO.mocha, tags: [] },
  { id: 'glace', cat: 'coffee', name: 'Гляссе', en: 'Glacé', vol: '300 мл', price: 4.50,
    desc: 'Холодный кофе с шариком мороженого. Летняя классика.', taste: ['мороженое', 'прохладно'], img: PHOTO.glace, tags: [] },
  { id: 'icelatte', cat: 'coffee', name: 'Айс-латте', en: 'Iced Latte', vol: '400 мл', price: 4.30,
    desc: 'Эспрессо, молоко и лёд — когда на улице плюс тридцать.', taste: ['лёд', 'молочный'], img: PHOTO.icelatte, tags: [] },

  { id: 'rockcaramel', cat: 'author', name: 'Рок и карамель', en: 'Rock & Caramel', vol: '300 мл', price: 4.60,
    desc: 'Наш старый хит: эспрессо, солёная карамель и щепотка соли.', taste: ['карамель', 'соль'], img: PHOTO.signature, tags: ['hit'] },
  { id: 'lavenderraf', cat: 'author', name: 'Лавандовый раф', en: 'Lavender Raf', vol: '300 мл', price: 4.90,
    desc: 'Сливки, лавандовый сироп и эспрессо. Тёплый и немного парфюмерный.', taste: ['лаванда', 'сливки'], img: PHOTO.lavraf, tags: ['new'] },
  { id: 'orangeespresso', cat: 'author', name: 'Апельсиновый эспрессо', en: 'Orange Espresso', vol: '250 мл', price: 4.50,
    desc: 'Эспрессо, апельсиновый сироп и цедра. Горько-сладкий баланс.', taste: ['апельсин', 'цитрус'], img: PHOTO.orangeesp, tags: [] },
  { id: 'nutmocha', cat: 'author', name: 'Мокко-орех', en: 'Nuts Mocha', vol: '300 мл', price: 4.70,
    desc: 'Шоколад, лесной орех, эспрессо и молоко.', taste: ['орех', 'шоколад'], img: PHOTO.nutmocha, tags: [] },

  { id: 'milkshake', cat: 'cold', name: 'Молочный коктейль', en: 'Milkshake', vol: '400 мл', price: 4.80,
    desc: 'Густой коктейль на мороженом — то, за чем к нам приходят семьями.', taste: ['густой', 'десертный'], img: PHOTO.milkshake, tags: ['hit'] },
  { id: 'frappe', cat: 'cold', name: 'Фраппе', en: 'Frappé', vol: '400 мл', price: 4.60,
    desc: 'Взбитый кофе со льдом и сливками, сверху — сироп на выбор.', taste: ['лёд', 'сливки'], img: PHOTO.frappe, tags: [] },
  { id: 'smoothie', cat: 'cold', name: 'Смузи ягодный', en: 'Berry Smoothie', vol: '400 мл', price: 5.20,
    desc: 'Ягоды, банан и йогурт. Никаких сиропных концентратов.', taste: ['ягоды', 'свежо'], img: PHOTO.smoothie, tags: ['veg'] },
  { id: 'lemonade', cat: 'cold', name: 'Лимонад MADROCK', en: 'Lemonade', vol: '400 мл', price: 4.00,
    desc: 'Свежий лимон, мята, ягодный сироп и много льда.', taste: ['лимон', 'мята'], img: PHOTO.lemonade, tags: ['veg'] },
  { id: 'icetea', cat: 'cold', name: 'Айс-ти', en: 'Iced Tea', vol: '400 мл', price: 3.80,
    desc: 'Холодный чай с персиком и лимоном.', taste: ['персик', 'лёд'], img: PHOTO.icetea, tags: ['veg'] },

  { id: 'cocoa', cat: 'notcoffee', name: 'Какао', en: 'Cocoa', vol: '300 мл', price: 3.20,
    desc: 'Какао на молоке, без смесей быстрого растворения.', taste: ['шоколад', 'тёплый'], img: PHOTO.cocoa, tags: ['veg'] },
  { id: 'hotchoc', cat: 'notcoffee', name: 'Горячий шоколад', en: 'Hot Chocolate', vol: '300 мл', price: 3.60,
    desc: 'Густой, почти питьевой десерт. С маршмеллоу — по желанию.', taste: ['густой', 'десертный'], img: PHOTO.hotchoc, tags: ['veg'] },
  { id: 'teaginger', cat: 'notcoffee', name: 'Чай имбирный', en: 'Ginger Tea', vol: '400 мл', price: 3.00,
    desc: 'Имбирь, лимон и мёд. Спасает в ноябре.', taste: ['имбирь', 'мёд'], img: PHOTO.teaginger, tags: ['veg'] },
  { id: 'teakarkade', cat: 'notcoffee', name: 'Чай каркаде', en: 'Hibiscus Tea', vol: '400 мл', price: 3.00,
    desc: 'Кисло-сладкий красный чай, горячий или со льдом.', taste: ['кислинка', 'ягоды'], img: PHOTO.tea, tags: ['veg'] },
  { id: 'mulled', cat: 'notcoffee', name: 'Глинтвейн', en: 'Mulled Wine', vol: '250 мл', price: 5.00,
    desc: 'Специи, цитрус и тепло. Сезонная позиция с октября по март.', taste: ['специи', 'цитрус'], img: PHOTO.mulled, tags: ['new'] },

  { id: 'sandwich', cat: 'food', name: 'Сэндвич с курицей', en: 'Chicken Sandwich', vol: '230 г', price: 4.60,
    desc: 'Чиабатта, курица гриль, соус на йогурте, свежий огурец.', taste: ['сытно', 'свежо'], img: PHOTO.sandwich, tags: [] },
  { id: 'panini', cat: 'food', name: 'Панини с ветчиной и сыром', en: 'Panini', vol: '240 г', price: 5.20,
    desc: 'Горячий прессованный сэндвич с тянущимся сыром.', taste: ['горячее', 'сыр'], img: PHOTO.panini, tags: [] },
  { id: 'hotdog', cat: 'food', name: 'Хот-дог', en: 'Hot Dog', vol: '220 г', price: 4.00,
    desc: 'Классика: булочка, сосиска, горчица и кетчуп. Быстро и сытно.', taste: ['быстро', 'сытно'], img: PHOTO.hotdog, tags: [] },
  { id: 'shawarma', cat: 'food', name: 'Шаурма', en: 'Shawarma', vol: '350 г', price: 6.50,
    desc: 'Мясо с гриля, овощи и соус в тонком лаваше.', taste: ['остро', 'сытно'], img: PHOTO.shawarma, tags: [] },
  { id: 'burger', cat: 'food', name: 'Гамбургер', en: 'Burger', vol: '300 г', price: 6.20,
    desc: 'Котлета, сыр, соус и булочка с кунжутом.', taste: ['сытно', 'классика'], img: PHOTO.burger, tags: [] },

  { id: 'cheesecake', cat: 'dessert', name: 'Чизкейк', en: 'Cheesecake', vol: '140 г', price: 5.00,
    desc: 'Классический нью-йоркский от городского кондитера, с ягодным кули.', taste: ['нежный', 'ягоды'], img: PHOTO.cheesecake, tags: ['hit', 'veg'] },
  { id: 'eclair', cat: 'dessert', name: 'Эклер', en: 'Éclair', vol: '90 г', price: 3.40,
    desc: 'Заварное тесто и крем — к кофе подходит идеально.', taste: ['крем', 'сладко'], img: PHOTO.eclair, tags: ['veg'] },
  { id: 'croissant', cat: 'dessert', name: 'Круассан', en: 'Croissant', vol: '90 г', price: 3.20,
    desc: 'Слоёный и хрустящий, привозят каждое утро.', taste: ['слоёный', 'масло'], img: PHOTO.croissant, tags: ['veg'] },
  { id: 'icecream', cat: 'dessert', name: 'Мороженое', en: 'Ice Cream', vol: '120 г', price: 3.00,
    desc: 'Три шарика на выбор, со взбитыми сливками, сиропом и вафлей.', taste: ['холодно', 'сладко'], img: PHOTO.icecream, tags: ['veg'] },
];

const HITS = ['cappuccino', 'bigblack', 'milkshake', 'rockcaramel', 'raf', 'cheesecake'];

/* --- недельные акции ------------------------------------------------------ */
/* Акция недели выбирается по номеру ISO-недели: массив зациклен. Условия в этом
   блоке обязаны совпадать с тем, что делает корзина: проверяются только позиция,
   акционная цена и minQty (см. promoDiscount в src/app.js). Дни недели, часы и
   «одна порция на гостя» здесь — подсказка для бара, а не правило расчёта, и
   потому из условий убрано всё, что обещало другое поведение сайта. */
const PROMOS = [
  { id: 'p1', title: 'Второй капучино', highlight: 'за 1 рубль', off: 'по будням до 12:00',
    desc: 'Берёте два капучино — второй отдаём за 1 рубль. Работает во всех кофейнях и в предзаказе.',
    item: 'cappuccino', price: 3.30, promoPrice: 1.00, minQty: 2,
    conditions: ['Нужно два капучино в одном заказе', 'Любой объём', 'Кэшбэк считается от суммы после скидки'] },
  { id: 'p2', title: 'Black капучино 350 мл', highlight: '−25%', off: 'понедельник–среда',
    desc: 'Наш фестивальный напиток: большой стакан, двойной эспрессо и плотная пена — дешевле на четверть.',
    item: 'bigblack', price: 4.20, promoPrice: 3.15,
    conditions: ['Пн–ср в кофейне', 'Только 350 мл', 'Кэшбэк считается от суммы после скидки'] },
  { id: 'p3', title: 'Молочный коктейль', highlight: '−30%', off: 'четверг',
    desc: 'Густой коктейль на мороженом по цене обычного латте. Самый семейный день недели.',
    item: 'milkshake', price: 4.80, promoPrice: 3.36,
    conditions: ['Только четверг', 'Любой сироп на выбор', 'Идёт в карту «10-й в подарок» как напиток'] },
  { id: 'p4', title: '«Рок и карамель»', highlight: '−30%', off: 'пятница–суббота',
    desc: 'Наш старый хит с солёной карамелью: эспрессо, сливки и щепотка соли.',
    item: 'rockcaramel', price: 4.60, promoPrice: 3.22,
    conditions: ['Пт–сб в кофейне', 'Горячий или со льдом', 'Сиропы — по обычной цене'] },
  { id: 'p5', title: 'Десерт к кофе', highlight: '−20%', off: 'ежедневно до 12:00',
    desc: 'Чизкейк от городского кондитера дешевле на 20%, если берёте вместе с любым кофе.',
    item: 'cheesecake', price: 5.00, promoPrice: 4.00,
    conditions: ['Ежедневно в кофейне', 'Вместе с любым кофе', 'Десерты не идут в карту «10-й в подарок»'] },
  { id: 'p6', title: 'Лавандовый раф', highlight: '−25%', off: 'среда',
    desc: 'Середина недели — с лавандой: сливки, эспрессо и цветочный сироп.',
    item: 'lavenderraf', price: 4.90, promoPrice: 3.68,
    conditions: ['Только среда', 'Молоко на выбор', 'Кэшбэк считается от суммы после скидки'] },
  { id: 'p7', title: 'Глинтвейн', highlight: '−25%', off: 'октябрь–март',
    desc: 'Специи, цитрус и тепло — сезонная позиция, которая греет лучше любого шарфа.',
    item: 'mulled', price: 5.00, promoPrice: 3.75,
    conditions: ['Сезонная позиция: с октября по март', 'Подаём горячим', 'Кэшбэк считается от суммы после скидки'] },
  { id: 'p8', title: 'Панини с ветчиной', highlight: '−20%', off: 'выходные',
    desc: 'Горячий панини с тянущимся сыром по цене обычного сэндвича.',
    item: 'panini', price: 5.20, promoPrice: 4.16,
    conditions: ['Сб–вс в кофейне', 'Во всех кофейнях', 'Можно с собой'] },
];

/* --- уровни лояльности ---------------------------------------------------- */
/* Уровни и проценты — демонстрационные (реальная программа клуба работает
   иначе, об этом сказано на сайте). Привилегии сформулированы так, чтобы их
   можно было выполнить в демонстрации: бесплатное молоко и сироп действительно
   не начисляют наценку на этих уровнях (см. lineUnit в src/app.js). */
const TIERS = [
  { id: 'rock', name: 'Rock', from: 0, cashback: 5,
    perks: ['5% бонусами с каждого заказа', 'Одна печать уже стоит при регистрации', 'Бонус на день рождения ×2'] },
  { id: 'hard', name: 'Hard Rock', from: 500, cashback: 7,
    perks: ['7% бонусами с заказа', 'Сироп к любому напитку без наценки', 'Ранний доступ к акции недели', 'Предзаказ вне очереди'] },
  { id: 'mad', name: 'Mad Rock', from: 1500, cashback: 10,
    perks: ['10% бонусами с заказа', 'Каждый 10-й напиток — в подарок', 'Гостевой напиток раз в месяц', 'Дегустация новых десертов до витрины', 'Молоко на выбор без наценки'] },
];

/* --- предзаполненные купоны кабинета -------------------------------------- */
/* HELLO50 не показываем отдельной карточкой: это тот же приветственный бонус,
   который уже начислен на баланс (+50 б. при регистрации), и рядом с балансом
   он выглядел как второй подарок на те же 50. */
const SEED_COUPONS = [
  { code: 'MADROCK10', title: 'Купон-пример: −10% на первый предзаказ', value: '−10%', desc: 'Кнопка отмечает купон использованным, скидка в демо не считается', used: false },
];

/* --- отзывы (демонстрационные, по мотивам реальных оценок) ---------------- */
const REVIEWS = [
  { n: 'Алина К.', s: 'Яндекс Карты', r: 5, t: 'Капучино плотный, как в Италии, а молочные коктейли — причина заходить даже зимой. На Советской, 42 удобно: рядом цирк и всегда есть где сесть.' },
  { n: 'Дмитрий П.', s: 'Google', r: 5, t: 'Работаю неподалёку, беру кофе каждое утро. Открываются в восемь — это спасает. Отдельное спасибо за «Рок и карамель», беру уже года три.' },
  { n: 'Ольга В.', s: 'Instagram', r: 4, t: 'Десерты привозные, но свежие, чизкейк беру почти всегда. Интерьер с росписями молодёжный, летом на веранде Советской, 72 вообще отлично.' },
];

/* --- галерея -------------------------------------------------------------- */
/* Шесть плиток с разными сюжетами: бариста за работой, латте-арт, холодный
   напиток, кофе с десертом, десерт и зал. Два кадра из Instagram-выгрузки
   (малиновый чизкейк и второй латте-арт) не показываем — они повторяли уже
   выбранные сюжеты, а кадры остались в assets/_crops на будущее. */
const GALLERY = [
  { img: PHOTO.ig1, cap: 'Бариста рисует латте' },
  { img: PHOTO.ig3, cap: 'Латте-арт в жёлтой чашке' },
  { img: PHOTO.ig4, cap: 'Холодный латте на закате' },
  { img: PHOTO.ig5, cap: 'Кофе с шоколадом' },
  { img: PHOTO.ig6, cap: 'Манговый чизкейк' },
  { img: PHOTO.ig7, cap: 'Зал у панорамных окон' },
];

/* --- факты для hero ------------------------------------------------------- */
const FACTS = [
  { n: '5', l: 'кофеен в Гомеле' },
  { n: '07:30', l: 'первая чашка' },
  { n: '30+', l: 'сиропов на баре' },
  { n: '10%', l: 'бонусами на верхнем уровне' },
];
