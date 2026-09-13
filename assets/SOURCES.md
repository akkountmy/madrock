# Источники фотографий

Все 46 кадров в этой папке — со Wikimedia Commons. Это выбрано осознанно:
имя файла там прямо описывает содержимое снимка, поэтому соответствие фото и позиции
меню можно проверить программно (tools/audit-photos.mjs), не открывая картинку.

Автор и лицензия в таблицах ниже взяты из метаданных страниц Commons (`Artist`,
`LicenseShortName`, `UsageTerms`) и сверяются скриптом tools/verify-sources.mjs.
Сверено 13.09.2026: расхождений таблицы с метаданными нет.

Проверка Unsplash оказалась невозможной: их API закрыт для анонимных запросов (401),
поэтому снимки оттуда не используются — по ним нельзя подтвердить, что на фото именно
то, что заявлено в названии позиции.

Файлы приведены к единому кадру 4:3; исходники — в assets/_original.

Для скорости загрузки каждый кадр публикуется в четырёх файлах: `<имя>-400.webp`,
`<имя>-800.webp`, `<имя>-400.jpg`, `<имя>-800.jpg` (у главного фото ещё `-1280`).
Браузер выбирает нужный вариант сам по ширине экрана; в таблице ниже кадр указан
по базовому имени. Собирает варианты `tools/make-responsive.mjs`.
Отдельно: кадр главного фото (`hero`) обрезан широко — он используется как фон во всю ширину.

| Файл | Файл-источник (что на снимке) | Автор | Лицензия |
|---|---|---|---|
| americano.jpg | [Cinnamon bun and black americano - Waitrose café, Worthing 2026-05-17.jpg](https://commons.wikimedia.org/wiki/File%3ACinnamon%20bun%20and%20black%20americano%20-%20Waitrose%20caf%C3%A9%2C%20Worthing%202026-05-17.jpg) | Andy Li | CC0 |
| barista.jpg | [Barista, Portland, Oregon 2.jpg](https://commons.wikimedia.org/wiki/File%3ABarista%2C%20Portland%2C%20Oregon%202.jpg) | Another Believer | CC BY-SA 4.0 |
| beans.jpg | [Coffee beans roasted.jpg](https://commons.wikimedia.org/wiki/File%3ACoffee%20beans%20roasted.jpg) | Sridhar Rao | CC BY-SA 4.0 |
| big_black.jpg | [Latte in glass in cincinnati (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3ALatte%20in%20glass%20in%20cincinnati%20(Unsplash).jpg) | Matt Hoffman __matthoffman__ | CC0 |
| burger.jpg | [Cheeseburger.jpg](https://commons.wikimedia.org/wiki/File%3ACheeseburger.jpg) | Renee Comet (photographer) | Public domain |
| cappuccino.jpg | [Cappuccino-cup 20230110 104144.jpg](https://commons.wikimedia.org/wiki/File%3ACappuccino-cup%2020230110%20104144.jpg) | Ioacc1234red | CC BY-SA 4.0 |
| cheesecake.jpg | [Mondays at Il Forno - Cheesecake with strawberry sauce.jpg](https://commons.wikimedia.org/wiki/File%3AMondays%20at%20Il%20Forno%20-%20Cheesecake%20with%20strawberry%20sauce.jpg) | Alex Dugger | CC BY 2.0 |
| cocoa.jpg | [Hot chocolate.jpg](https://commons.wikimedia.org/wiki/File%3AHot%20chocolate.jpg) | не указан | GFDL 1.2 |
| croissant.jpg | [2018 01 Croissant IMG 0685.JPG](https://commons.wikimedia.org/wiki/File%3A2018%2001%20Croissant%20IMG%200685.JPG) | Daniela Kloth | GFDL 1.2 |
| doppio.jpg | [Close-up of espresso machine with two brown coffee cups.jpg](https://commons.wikimedia.org/wiki/File%3AClose-up%20of%20espresso%20machine%20with%20two%20brown%20coffee%20cups.jpg) | Chevanon Photography | CC0 |
| eclair.jpg | [Un éclair vanille en février 2022.JPG](https://commons.wikimedia.org/wiki/File%3AUn%20%C3%A9clair%20vanille%20en%20f%C3%A9vrier%202022.JPG) | Benoît Prieur | CC0 |
| espresso.jpg | [Espresso cup.jpg](https://commons.wikimedia.org/wiki/File%3AEspresso%20cup.jpg) | Balise42 | CC BY-SA 4.0 |
| flatwhite.jpg | [Flat white coffee The Cock Inn Henham Essex England 01.jpg](https://commons.wikimedia.org/wiki/File%3AFlat%20white%20coffee%20The%20Cock%20Inn%20Henham%20Essex%20England%2001.jpg) | Acabashi | CC BY-SA 4.0 |
| frappe.jpg | [Frappe (4547117210).jpg](https://commons.wikimedia.org/wiki/File%3AFrappe%20(4547117210).jpg) | Klearchos Kapoutsis from Santorini, Greece | CC BY 2.0 |
| glace.jpg | [Affogato with Amarretti Biscotti - Tavola Di Famiglia 2026-02-27.jpg](https://commons.wikimedia.org/wiki/File%3AAffogato%20with%20Amarretti%20Biscotti%20-%20Tavola%20Di%20Famiglia%202026-02-27.jpg) | Andy Li | CC0 |
| hero.jpg | [Interior Johnie's Coffee Shop 2021 2.jpg](https://commons.wikimedia.org/wiki/File%3AInterior%20Johnie's%20Coffee%20Shop%202021%202.jpg) | Downtowngal | CC BY-SA 4.0 |
| hot_choc.jpg | [CanandaiguaFireIceWinterFestival2019CocoaCrawlDoubleMarshmallow.jpg](https://commons.wikimedia.org/wiki/File%3ACanandaiguaFireIceWinterFestival2019CocoaCrawlDoubleMarshmallow.jpg) | DanielPenfield | CC BY-SA 4.0 |
| hotdog.jpg | [Hotdog - Evan Swigart.jpg](https://commons.wikimedia.org/wiki/File%3AHotdog%20-%20Evan%20Swigart.jpg) | Evan Swigart from Chicago, USA | CC BY 2.0 |
| ice_latte.jpg | [Iced Coffee in Glass - Sunshine Coffee - Laramie Cafe (53838344552).jpg](https://commons.wikimedia.org/wiki/File%3AIced%20Coffee%20in%20Glass%20-%20Sunshine%20Coffee%20-%20Laramie%20Cafe%20(53838344552).jpg) | Tony Webster | CC BY 2.0 |
| icecream.jpg | [Ice cream with whipped cream, chocolate syrup, and a wafer.jpg](https://commons.wikimedia.org/wiki/File%3AIce%20cream%20with%20whipped%20cream%2C%20chocolate%20syrup%2C%20and%20a%20wafer.jpg) | Nicolas Ettlin | CC BY-SA 4.0 |
| icetea.jpg | [Iced tea with ice cubes.jpg](https://commons.wikimedia.org/wiki/File%3AIced%20tea%20with%20ice%20cubes.jpg) | Editor at Large | CC BY-SA 2.5 |
| interior.jpg | [Coffee House in Kolkata (Pano) - Interior 03.jpg](https://commons.wikimedia.org/wiki/File%3ACoffee%20House%20in%20Kolkata%20(Pano)%20-%20Interior%2003.jpg) | Indrajit Das | CC BY-SA 4.0 |
| interior2.jpg | [A table in The Round Table Cafe at Winchester Great Hall 2026-07-12.jpg](https://commons.wikimedia.org/wiki/File%3AA%20table%20in%20The%20Round%20Table%20Cafe%20at%20Winchester%20Great%20Hall%202026-07-12.jpg) | Andy Li | CC0 |
| latte.jpg | [Caffe latte (4751472016).jpg](https://commons.wikimedia.org/wiki/File%3ACaffe%20latte%20(4751472016).jpg) | cyclonebill from Copenhagen, Denmark | CC BY-SA 2.0 |
| latte_coco.jpg | [Coconut Milk.JPG](https://commons.wikimedia.org/wiki/File%3ACoconut%20Milk.JPG) | Miansari66 | CC0 |
| lavraf.jpg | [George and Onnie's ube latte.jpg](https://commons.wikimedia.org/wiki/File%3AGeorge%20and%20Onnie's%20ube%20latte.jpg) | Josh Lim (Sky Harbor) | CC BY-SA 4.0 |
| lemonade.jpg | [Homemade Mint Lemonade,Bangladesh.jpg](https://commons.wikimedia.org/wiki/File%3AHomemade%20Mint%20Lemonade%2CBangladesh.jpg) | Evening42 | CC BY-SA 4.0 |
| milkshake.jpg | [San Vicente, Milkshake, Palawan, Philippines.jpg](https://commons.wikimedia.org/wiki/File%3ASan%20Vicente%2C%20Milkshake%2C%20Palawan%2C%20Philippines.jpg) | Vyacheslav Argenberg | CC BY 4.0 |
| mocha.jpg | [Mocha - The Flying Saucer 2025-09-01.jpg](https://commons.wikimedia.org/wiki/File%3AMocha%20-%20The%20Flying%20Saucer%202025-09-01.jpg) | Andy Li | CC0 |
| mulled.jpg | [Glühwein (hot mulled wine) in a glass with an orange slice 10.jpg](https://commons.wikimedia.org/wiki/File%3AGl%C3%BChwein%20(hot%20mulled%20wine)%20in%20a%20glass%20with%20an%20orange%20slice%2010.jpg) | Wheeler Cowperthwaite | CC BY 2.0 |
| nutmocha.jpg | [Gigi Coffee Hazelnut Praline Latte.jpg](https://commons.wikimedia.org/wiki/File%3AGigi%20Coffee%20Hazelnut%20Praline%20Latte.jpg) | Vincent60030 | CC BY-SA 4.0 |
| orangeesp.jpg | [Lloret de Mar - the balcony with coffee and orange (30903803892).jpg](https://commons.wikimedia.org/wiki/File%3ALloret%20de%20Mar%20-%20the%20balcony%20with%20coffee%20and%20orange%20(30903803892).jpg) | muffinn from Worcester, UK | CC BY 2.0 |
| panini.jpg | [Grilled ham and cheese sandwich.jpg](https://commons.wikimedia.org/wiki/File%3AGrilled%20ham%20and%20cheese%20sandwich.jpg) | 24 WA GN 24 | CC BY-SA 3.0 |
| raf.jpg | [Coffee with cream and sugar (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3ACoffee%20with%20cream%20and%20sugar%20(Unsplash).jpg) | karl chor karlchor | CC0 |
| sandwich.jpg | [Chicken sandwich and french fries.jpg](https://commons.wikimedia.org/wiki/File%3AChicken%20sandwich%20and%20french%20fries.jpg) | Horacio Cambeiro | CC BY-SA 3.0 |
| shawarma.jpg | [Döner Kebab Wrap - What The Pitta.jpg](https://commons.wikimedia.org/wiki/File%3AD%C3%B6ner%20Kebab%20Wrap%20-%20What%20The%20Pitta.jpg) | Andy Li | CC0 |
| signature.jpg | [Caramel latte art 20260703 - 01.jpg](https://commons.wikimedia.org/wiki/File%3ACaramel%20latte%20art%2020260703%20-%2001.jpg) | Wiki Asmah | CC BY 4.0 |
| smoothie.jpg | [Berry smoothie and coffee at Antell Martintalo.jpg](https://commons.wikimedia.org/wiki/File%3ABerry%20smoothie%20and%20coffee%20at%20Antell%20Martintalo.jpg) | JIP | CC BY-SA 4.0 |
| syrup.jpg | [Syrup for drinks flavored mint.JPG](https://commons.wikimedia.org/wiki/File%3ASyrup%20for%20drinks%20flavored%20mint.JPG) | Nicholas Gemini | CC BY-SA 4.0 |
| tea.jpg | [A glass of hibiscus tea 02.jpg](https://commons.wikimedia.org/wiki/File%3AA%20glass%20of%20hibiscus%20tea%2002.jpg) | claralieu | CC BY 2.0 |
| teaginger.jpg | [Ginger Tea .jpg](https://commons.wikimedia.org/wiki/File%3AGinger%20Tea%20.jpg) | Trupti.gauns | CC BY-SA 4.0 |

Проверенные соответствия: hero и interior — интерьеры кофеен, barista — бариста, beans —
жареное зерно, espresso/doppio — эспрессо, americano — чёрный американо, cappuccino и
big_black — капучино и латте в стакане, latte и latte_coco — латте и кокосовое молоко,
flatwhite — флэт уайт, raf — кофе со сливками, lavraf — сиренево-молочный кофе с латте-артом
(убе-латте, читается как лавандовый), mocha и nutmocha — мокко и
ореховый латте, glace — аффогато, ice_latte — айс-кофе, signature — карамельный латте,
orangeesp — кофе с апельсином, milkshake/frappe/smoothie/lemonade/icetea — коктейль,
фраппе, ягодный смузи, лимонад и холодный чай, cocoa и hot_choc — какао и горячий шоколад,
tea и teaginger — каркаде и имбирный чай, mulled — глинтвейн, syrup — сиропы,
croissant/sandwich/panini/hotdog/shawarma/burger — выпечка и кухня,
cheesecake/eclair — десерты, icecream — мороженое шариками с сиропом и сливками.

## Выбрано вручную по заголовку файла

| Файл | Файл-источник | Автор | Лицензия |
|---|---|---|---|
| interior3.jpg | [Milk and Honey Coffeehouse - May 2026 - Sarah Stierch 02.jpg](https://commons.wikimedia.org/wiki/File%3AMilk%20and%20Honey%20Coffeehouse%20-%20May%202026%20-%20Sarah%20Stierch%2002.jpg) | Missvain | CC0 |
| interior4.jpg | [Cafe Treme interior Feb 2012.jpg](https://commons.wikimedia.org/wiki/File%3ACafe%20Treme%20interior%20Feb%202012.jpg) | acedout | CC BY-SA 2.0 |

## Замена фото с мелких исходников

| Файл | Файл-источник | Автор | Лицензия |
|---|---|---|---|
| frappe.jpg | [Frappe (4547117210).jpg](https://commons.wikimedia.org/wiki/File%3AFrappe%20(4547117210).jpg) | Klearchos Kapoutsis from Santorini, Greece | CC BY 2.0 |
| shawarma.jpg | [Döner Kebab Wrap - What The Pitta.jpg](https://commons.wikimedia.org/wiki/File%3AD%C3%B6ner%20Kebab%20Wrap%20-%20What%20The%20Pitta.jpg) | Andy Li | CC0 |

## Замена трёх фото: «Лавандовый раф», «Мороженое» и «Эклер»

Кадры заменены на более «журнальные»: 4:3, 1200×900, главный объект по центру и
занимает около 60–75 % высоты кадра (проверялось по готовому кадру).

| Файл | Файл-источник | Автор | Лицензия |
|---|---|---|---|
| lavraf.jpg | [George and Onnie's ube latte.jpg](https://commons.wikimedia.org/wiki/File%3AGeorge%20and%20Onnie's%20ube%20latte.jpg) | Josh Lim (Sky Harbor) | CC BY-SA 4.0 |
| icecream.jpg | [Ice cream with whipped cream, chocolate syrup, and a wafer.jpg](https://commons.wikimedia.org/wiki/File%3AIce%20cream%20with%20whipped%20cream%2C%20chocolate%20syrup%2C%20and%20a%20wafer.jpg) | Nicolas Ettlin | CC BY-SA 4.0 |
| eclair.jpg | [Un éclair vanille en février 2022.JPG](https://commons.wikimedia.org/wiki/File%3AUn%20%C3%A9clair%20vanille%20en%20f%C3%A9vrier%202022.JPG) | Benoît Prieur | CC0 |

Почему именно эти снимки: свободного фото собственно лавандового рафа на Викискладе нет —
поиск по «lavender latte», «lavender coffee», «lavender syrup», «lavender drink» даёт
поля лаванды, чай с цветами и ярмарочные прилавки. Для lavraf выбран ближайший по виду
напиток: убе-латте (фиолетовый батат) в керамической чашке — сиренево-молочная кайма и
белый латте-арт читаются как лавандовый латте. Для icecream взято мороженое в стеклянной
креманке: шарики, взбитые сливки, шоколадный сироп и вафля — то есть сама позиция
«шарики с сиропом», а не витрина или упаковка. Для eclair — классический вытянутый эклер
с кракленом, кремом и глазурью; прежний кадр был общим планом ярмарки с вывеской
«Chocolate Eclair», самого десерта в нём почти не было видно.
Прежние кадры: «A cup of coffee milk.jpg», «Ice Cream Scoop.jpg» и
«JF100425 DSB Chocolate Eclairs & Cream Puffs.jpg».

## Плитки раздела Instagram

Восемь квадратных плиток (1080×1080) для раздела Instagram тоже взяты со Wikimedia Commons.
Кадры отбирались по внешнему виду: превью кандидатов оценивала модель со зрением, слабые
кадры (случайные ракурсы, пересвет, мусор в кадре, обрезанное главное) отбрасывались.
Затем снимок обрезался в квадрат и получал лёгкую тёплую обработку — тёплый тон, чуть
контраста и насыщенности, мягкая виньетка (скрипт tools/make-ig-photo.ps1).

| Файл | Файл-источник | Автор | Лицензия |
|---|---|---|---|
| ig1.jpg | [Coffee shop in Iran, Mashhad City 02.jpg](https://commons.wikimedia.org/wiki/File%3ACoffee%20shop%20in%20Iran%2C%20Mashhad%20City%2002.jpg) | Mostafameraji | CC BY 3.0 |
| ig2.jpg | [Neapolitan Cheesecake - Caffè Nero 2025-06-09.jpg](https://commons.wikimedia.org/wiki/File%3ANeapolitan%20Cheesecake%20-%20Caff%C3%A8%20Nero%202025-06-09.jpg) | Andy Li | CC0 |
| ig3.jpg | [A cup of cappuccino at Indooroopilly Shopping Centre.JPG](https://commons.wikimedia.org/wiki/File%3AA%20cup%20of%20cappuccino%20at%20Indooroopilly%20Shopping%20Centre.JPG) | Kgbo | CC BY-SA 4.0 |
| ig4.jpg | [A young man holding a glass of iced coffee at home at sundown. Happy hour non-al](https://commons.wikimedia.org/wiki/File%3AA%20young%20man%20holding%20a%20glass%20of%20iced%20coffee%20at%20home%20at%20sundown.%20Happy%20hour%20non-alcoholic%20beverage.jpg) | Ivan Radic | CC BY 2.0 |
| ig5.jpg | [Espresso cup.jpg](https://commons.wikimedia.org/wiki/File%3AEspresso%20cup.jpg) | Balise42 | CC BY-SA 4.0 |
| ig6.jpg | [Passion fruit & raspberry cheesecake - Jacob's Bakery + Cafe 2025-10-08.jpg](https://commons.wikimedia.org/wiki/File%3APassion%20fruit%20%26%20raspberry%20cheesecake%20-%20Jacob's%20Bakery%20%2B%20Cafe%202025-10-08.jpg) | Andy Li | CC0 |
| ig7.jpg | [Boathouse Ōhori Park The interior of the café Ōhorikōen Chūō-ku Fukuoka 20260609](https://commons.wikimedia.org/wiki/File%3ABoathouse%20%C5%8Chori%20Park%20The%20interior%20of%20the%20caf%C3%A9%20%C5%8Chorik%C5%8Den%20Ch%C5%AB%C5%8D-ku%20Fukuoka%2020260609%20173802.jpg) | Hirho | CC BY 4.0 |
| ig8.jpg | [Cup of coffee with latte art 2016.jpg](https://commons.wikimedia.org/wiki/File%3ACup%20of%20coffee%20with%20latte%20art%202016.jpg) | Abdulrohmatt | CC BY-SA 4.0 |

## Лицензии, требующие полного текста

У двух кадров лицензия требует передавать вместе с работой полный текст лицензии —
это видно в метаданных Commons (`UsageTerms`). Кадры при этом не менялись и не удалялись.

| Файл | Файл-источник | Лицензия | Что требуется |
|---|---|---|---|
| cocoa.jpg | Hot chocolate.jpg | GFDL 1.2 | полный текст GNU Free Documentation License 1.2 |
| croissant.jpg | 2018 01 Croissant IMG 0685.JPG | GFDL 1.2 | полный текст GNU Free Documentation License 1.2 |

У кадра cocoa.jpg поле автора в метаданных Commons пустое — единственный такой кадр
в таблице; автора для него нужно смотреть на странице файла.

Если эти кадры остаются на сайте, рядом с ними (или в разделе об авторских правах)
нужен полный текст GFDL 1.2. Остальные лицензии в таблицах — CC0, CC BY и CC BY-SA:
для них достаточно автора, названия лицензии и ссылки на страницу файла.

## Строки без кадров в папке

Часть строк описывает снимки, которых в `assets/` уже нет: три кадра убраны из набора
(`barista.jpg`, `beans.jpg`, `syrup.jpg` — см. комментарий в index.html), ещё две плитки
Instagram в публикацию не вошли (`ig2.jpg`, `ig8.jpg`). Атрибуция для них указана по тем же
метаданным Commons, чтобы её не пришлось собирать заново, если кадры вернут.
