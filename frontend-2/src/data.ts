export type Criterion = 'quiet' | 'sea' | 'sunset' | 'walk' | 'work' | 'nature' | 'kids' | 'pets'
export type FactStatus = 'confirmed' | 'calculated' | 'conflict' | 'pending'
export type Hotel = {
  id: string
  name: string
  district: string
  destination: string
  image: string
  gallery: string[]
  price: number
  rating: string
  reviews: number
  stars: number
  subtitle: string
  description: string
  highlight: string
  tradeoff: string
  scores: Record<Criterion, number>
  noise: number
  beach: number
  floor: number
  room: string
  position: { x: number; y: number }
  nearby: { name: string; time: number; type: 'beach' | 'cafe' | 'park' | 'transport' }[]
  facts: Fact[]
}
export type Fact = {
  id: string
  title: string
  value: string
  status: FactStatus
  confidence: number
  source: string
  method: string
  limitation: string
  checked: string
}
export const criteria: Record<Criterion, { label: string; short: string; pattern: RegExp }> = {
  quiet: { label: 'Тишина ночью', short: 'Тишина', pattern: /тих|тишин|высп|спокой|шум/iu },
  sea: { label: 'Вид на море', short: 'Море', pattern: /мор[еяю]|морск|океан/iu },
  sunset: { label: 'Закат из окна', short: 'Закат', pattern: /закат|заход солнц/iu },
  walk: { label: 'Пляж пешком', short: 'Пляж рядом', pattern: /пляж|пешком|без подъ[её]м|берег/iu },
  work: {
    label: 'Удобно работать',
    short: 'Для работы',
    pattern: /работ|wi.?fi|вай.?фай|ноутбук|интернет/iu,
  },
  nature: { label: 'Природа рядом', short: 'Природа', pattern: /гор[ыа]|горн|природ|лес|парк/iu },
  kids: { label: 'С детьми', short: 'Для семьи', pattern: /дет|реб[её]н|семь|семейн/iu },
  pets: {
    label: 'Можно с питомцем',
    short: 'С питомцем',
    pattern: /питом|собак|кошк|кот[ао]?\b/iu,
  },
}
const fact = (
  id: string,
  title: string,
  value: string,
  status: FactStatus,
  confidence: number,
  source: string,
  method: string,
  limitation: string,
): Fact => ({
  id,
  title,
  value,
  status,
  confidence,
  source,
  method,
  limitation,
  checked: '26 октября 2026',
})
export const hotels: Hotel[] = [
  {
    id: 'more-vnutri',
    name: 'Море внутри',
    district: 'Хоста · первая береговая',
    destination: 'Хоста',
    image: '/images/terrace.jpg',
    gallery: [
      '/images/terrace.jpg',
      '/images/bright-room.jpg',
      '/images/sea.jpg',
      '/images/interior.jpg',
    ],
    price: 8400,
    rating: '9,4',
    reviews: 218,
    stars: 4,
    subtitle: 'Просыпаться там, где начинается море',
    description:
      'Небольшой курортный отель в тихой части Хосты. Светлые номера, неспешные завтраки на террасе и набережная, которая начинается прямо за садом. Здесь легко поставить мир на паузу.',
    highlight: 'Закат из номера, а не с открытки',
    tradeoff:
      'Море и закат видны с юго-западной стороны, начиная с 4-го этажа. При выборе номера это важно.',
    scores: { quiet: 94, sea: 99, sunset: 98, walk: 96, work: 82, nature: 85, kids: 83, pets: 55 },
    noise: 34,
    beach: 4,
    floor: 4,
    room: 'Делюкс с видом на море',
    position: { x: 47, y: 46 },
    nearby: [
      { name: 'Пляж «Тихий берег»', time: 4, type: 'beach' },
      { name: 'Кофейня «Утро»', time: 3, type: 'cafe' },
      { name: 'Приморский сквер', time: 7, type: 'park' },
      { name: 'Остановка «Хоста»', time: 6, type: 'transport' },
    ],
    facts: [
      fact(
        'view',
        'Вид из окна',
        'Море с 4-го этажа · юго-запад',
        'calculated',
        92,
        'Геомодель · OpenStreetMap + DEM',
        'В демомодели проверена линия видимости от фасада с учётом высоты соседних зданий и рельефа.',
        'Модель не учитывает деревья и временные конструкции. Фотографии иллюстративные.',
      ),
      fact(
        'noise',
        'Тишина ночью',
        '34 дБ · окна в сторону сада',
        'calculated',
        86,
        'Геомодель · дороги и железная дорога',
        'Демонстрационная оценка по расстоянию до дорог, классу улиц и расположению фасада.',
        'Это модельная оценка, а не замер. События и шум соседей не учитываются.',
      ),
      fact(
        'sunset',
        'Закат в ваши даты',
        'Ноябрь · юго-западный фасад',
        'calculated',
        94,
        'Демомодель солнечной траектории',
        'Сезонная модель направления заката для Большого Сочи: осенью солнце садится к юго-западу.',
        'Облачность неизвестна. В другое время года направление меняется.',
      ),
      fact(
        'beach',
        'Дорога до пляжа',
        '4 минуты · без лестниц',
        'calculated',
        91,
        'Демомаршрут · пешеходный граф',
        'Подготовленный пример маршрута длиной 290 м, перепад высот 3 м.',
        'Временные ограждения и ремонт маршрута не проверялись.',
      ),
      fact(
        'rooms',
        'Категория номера',
        'Делюкс · этажи 4–6',
        'pending',
        68,
        'Ожидаем ответ отельера',
        'Геомодель определила подходящий фасад. Нужна привязка к категориям и номерам.',
        'Категорию и этаж необходимо подтвердить у отеля до поездки.',
      ),
      fact(
        'wifi',
        'Для удалённой работы',
        'Рабочий стол · Wi-Fi 80 Мбит/с',
        'confirmed',
        88,
        'Ответ демоотельера · 24 октября',
        'В примере отельер подтвердил стол в категории «Делюкс» и результаты теста сети.',
        'Скорость меняется в зависимости от нагрузки. Данные демонстрационные.',
      ),
    ],
  },
  {
    id: 'tihaya-gavan',
    name: 'Тихая гавань',
    district: 'Адлер · в окружении сада',
    destination: 'Адлер',
    image: '/images/day-resort.jpg',
    gallery: ['/images/day-resort.jpg', '/images/bright-room.jpg', '/images/sea.jpg'],
    price: 6900,
    rating: '9,2',
    reviews: 164,
    stars: 4,
    subtitle: 'Место для маленького побега',
    description:
      'Камерный отель в зелёном квартале Адлера. Большой сад отделяет его от городского ритма, а до моря можно прогуляться через парк.',
    highlight: 'Тишина, которой так не хватало',
    tradeoff:
      'До пляжа 12 минут пешком. Закат удобнее смотреть с общей террасы: из номеров его закрывает соседнее здание.',
    scores: { quiet: 99, sea: 78, sunset: 65, walk: 73, work: 90, nature: 90, kids: 93, pets: 98 },
    noise: 29,
    beach: 12,
    floor: 3,
    room: 'Комфорт с видом на сад',
    position: { x: 67, y: 68 },
    nearby: [
      { name: 'Пляж «Огонёк»', time: 12, type: 'beach' },
      { name: 'Пекарня «Хлеб»', time: 2, type: 'cafe' },
      { name: 'Парк у реки', time: 4, type: 'park' },
      { name: 'Остановка «Садовая»', time: 5, type: 'transport' },
    ],
    facts: [
      fact(
        'view',
        'Вид из окна',
        'Сад · частичный вид на море',
        'calculated',
        85,
        'Демогеомодель · OSM + DEM',
        'Между отелем и морем находятся два малоэтажных здания.',
        'Вид на море доступен только частично.',
      ),
      fact(
        'noise',
        'Тишина ночью',
        '29 дБ · садовая сторона',
        'calculated',
        88,
        'Демогеомодель · транспорт',
        'Здание в глубине квартала, в 240 м от автомобильной дороги.',
        'Не учитывает мероприятия на территории отеля.',
      ),
      fact(
        'pets',
        'С питомцем',
        'До 15 кг · 1 000 ₽ за проживание',
        'confirmed',
        96,
        'Ответ демоотельера',
        'Подготовленный ответ владельца: кошки и собаки до 15 кг, по предварительному запросу.',
        'Условия требуют подтверждения для конкретной поездки.',
      ),
    ],
  },
  {
    id: 'sad-u-morya',
    name: 'Сад у моря',
    district: 'Сочи · рядом с Дендрарием',
    destination: 'Сочи · центр',
    image: '/images/cabin.jpg',
    gallery: ['/images/cabin.jpg', '/images/interior.jpg', '/images/sea.jpg'],
    price: 7400,
    rating: '9,1',
    reviews: 96,
    stars: 3,
    subtitle: 'Город снаружи. Спокойствие внутри.',
    description:
      'Зелёный гостевой дом с уютным двором и просторными семейными номерами. Рядом Дендрарий, небольшие кафе и прогулочные маршруты.',
    highlight: 'Семейный отпуск в своём ритме',
    tradeoff:
      'К морю нужно спуститься по лестнице. С коляской есть обходной путь, который займёт ещё 8 минут.',
    scores: { quiet: 88, sea: 80, sunset: 86, walk: 74, work: 75, nature: 98, kids: 99, pets: 64 },
    noise: 38,
    beach: 9,
    floor: 3,
    room: 'Семейный с балконом',
    position: { x: 31, y: 31 },
    nearby: [
      { name: 'Городской пляж', time: 9, type: 'beach' },
      { name: 'Кафе «Сад»', time: 2, type: 'cafe' },
      { name: 'Дендрарий', time: 5, type: 'park' },
      { name: 'Автобус до центра', time: 3, type: 'transport' },
    ],
    facts: [
      fact(
        'view',
        'Вид из окна',
        'Море с 3-го этажа',
        'calculated',
        81,
        'Демогеомодель · рельеф',
        'На возвышении открывается частичный вид на побережье.',
        'Нижние этажи выходят в сад.',
      ),
      fact(
        'beach',
        'Дорога до пляжа',
        '9 минут · 42 ступени',
        'calculated',
        90,
        'Демомаршрут · пешком',
        'В подготовленном маршруте 650 м и лестничный спуск.',
        'Безбарьерный обход занимает 17 минут.',
      ),
      fact(
        'kids',
        'Для семьи',
        'Детская кроватка · игровая',
        'confirmed',
        93,
        'Ответ демоотельера',
        'Кроватку предоставляют по запросу. Игровая комната работает с 9 до 21.',
        'Няни и детского клуба нет.',
      ),
    ],
  },
  {
    id: 'vysota',
    name: 'Высота',
    district: 'Красная Поляна · горная долина',
    destination: 'Красная Поляна',
    image: '/images/mountains.jpg',
    gallery: ['/images/mountains.jpg', '/images/suite.jpg', '/images/interior.jpg'],
    price: 10800,
    rating: '9,6',
    reviews: 302,
    stars: 5,
    subtitle: 'Выше только ваши ожидания',
    description:
      'Горный отель с панорамными окнами и отдельной рабочей гостиной. Тропы начинаются у порога, а вечера пахнут хвоей и камином.',
    highlight: 'Вид на горы из каждого утра',
    tradeoff:
      'Это горный отель: поездка до моря займёт около часа. Морского вида и пляжа рядом нет.',
    scores: { quiet: 95, sea: 0, sunset: 79, walk: 0, work: 98, nature: 100, kids: 85, pets: 92 },
    noise: 30,
    beach: 60,
    floor: 2,
    room: 'Панорамный люкс',
    position: { x: 83, y: 21 },
    nearby: [
      { name: 'Экотропа', time: 2, type: 'park' },
      { name: 'Кофейня у канатной дороги', time: 5, type: 'cafe' },
      { name: 'Автобус до вокзала', time: 7, type: 'transport' },
    ],
    facts: [
      fact(
        'view',
        'Вид из окна',
        'Горный хребет · восток',
        'calculated',
        95,
        'Демогеомодель · DEM',
        'Панорамный фасад направлен на горную долину.',
        'Закат за горным хребтом раньше астрономического.',
      ),
      fact(
        'wifi',
        'Для удалённой работы',
        'Коворкинг · 150 Мбит/с',
        'confirmed',
        94,
        'Ответ демоотельера',
        'В демопримере есть отдельная рабочая зона и резервный канал.',
        'Тест скорости не является гарантией.',
      ),
    ],
  },
  {
    id: 'ritm',
    name: 'Ритм',
    district: 'Сочи · центр событий',
    destination: 'Сочи · центр',
    image: '/images/interior.jpg',
    gallery: ['/images/interior.jpg', '/images/room.jpg', '/images/coast.jpg'],
    price: 5200,
    rating: '8,8',
    reviews: 187,
    stars: 3,
    subtitle: 'Для тех, кто любит быть в центре',
    description:
      'Компактный городской отель рядом с кафе, музеями и морским портом. Хороший выбор для активной поездки и работы в городе.',
    highlight: 'Весь город за порогом',
    tradeoff:
      'Под окнами оживлённая улица. В отзывах шумно даже при закрытых окнах; отельер сообщает об улучшенной звукоизоляции.',
    scores: { quiet: 45, sea: 65, sunset: 52, walk: 87, work: 94, nature: 50, kids: 54, pets: 72 },
    noise: 58,
    beach: 7,
    floor: 5,
    room: 'Стандарт во двор',
    position: { x: 21, y: 18 },
    nearby: [
      { name: 'Пляж «Маяк»', time: 7, type: 'beach' },
      { name: 'Кофейня «Ритм»', time: 1, type: 'cafe' },
      { name: 'Морской порт', time: 5, type: 'park' },
      { name: 'Городской автобус', time: 2, type: 'transport' },
    ],
    facts: [
      fact(
        'noise',
        'Тишина ночью',
        'Источники расходятся',
        'conflict',
        48,
        'Демоотзывы ↔ ответ демоотельера',
        'В демонстрационном сценарии гости жалуются на уличный шум, отельер сообщает о новых стеклопакетах.',
        'Нужна повторная проверка. Не рекомендуем, если тишина обязательна.',
      ),
      fact(
        'wifi',
        'Для работы',
        'Рабочая зона · Wi-Fi',
        'confirmed',
        92,
        'Ответ демоотельера',
        'Подтверждено оснащение и отдельная зона для встреч.',
        'В часы пик возможна высокая нагрузка.',
      ),
    ],
  },
  {
    id: 'palma',
    name: 'Пальма',
    district: 'Адлер · морская сторона',
    destination: 'Адлер',
    image: '/images/suite.jpg',
    gallery: ['/images/suite.jpg', '/images/coast.jpg', '/images/sea.jpg'],
    price: 9100,
    rating: '9,3',
    reviews: 145,
    stars: 4,
    subtitle: 'Солнечная сторона вашего отпуска',
    description:
      'Современные апартаменты у набережной, большая терраса и кухня для неспешных завтраков. Пляж в нескольких минутах от двери.',
    highlight: 'Море близко. Всё остальное подождёт.',
    tradeoff:
      'Рядом прогулочная набережная с кафе: до 23:00 бывает слышна музыка. Лучше выбирать верхние этажи.',
    scores: { quiet: 77, sea: 96, sunset: 94, walk: 100, work: 86, nature: 72, kids: 90, pets: 40 },
    noise: 43,
    beach: 2,
    floor: 5,
    room: 'Апартаменты с террасой',
    position: { x: 73, y: 82 },
    nearby: [
      { name: 'Пляж у набережной', time: 2, type: 'beach' },
      { name: 'Кафе «Пальма»', time: 1, type: 'cafe' },
      { name: 'Приморская аллея', time: 4, type: 'park' },
      { name: 'Остановка «Южная»', time: 6, type: 'transport' },
    ],
    facts: [
      fact(
        'view',
        'Вид из окна',
        'Море · терраса на 5-м этаже',
        'confirmed',
        93,
        'Ответ демоотельера',
        'В примере владелец подтвердил ориентацию террасы на юго-запад.',
        'Фотографии в демоверсии иллюстративные.',
      ),
      fact(
        'noise',
        'Тишина ночью',
        '43 дБ · музыка до 23:00',
        'calculated',
        80,
        'Демогеомодель · POI',
        'На набережной отмечены вечерние заведения.',
        'Шум зависит от расписания мероприятий.',
      ),
    ],
  },
]
export const moods = [
  {
    title: 'Только вы и море',
    text: 'Слышать волны, а не соседей',
    image: '/images/sea.jpg',
    query: 'Хочу тихий отель с видом на море и закат, пляж пешком',
    icon: 'sea',
  },
  {
    title: 'Выдохнуть в горах',
    text: 'Чуть ближе к себе',
    image: '/images/mountains.jpg',
    query: 'Хочу тихий отель в горах, природа и красивые виды',
    icon: 'nature',
  },
  {
    title: 'Сменить офис на вид',
    text: 'Для работы и вдохновения',
    image: '/images/suite.jpg',
    query: 'Нужен тихий отель для работы, быстрый Wi-Fi и рабочий стол',
    icon: 'work',
  },
  {
    title: 'Вместе — ещё лучше',
    text: 'Маленькие семейные традиции',
    image: '/images/day-resort.jpg',
    query: 'Едем с детьми, нужен семейный отель рядом с пляжем и парком',
    icon: 'kids',
  },
]
export const destinations = ['Большой Сочи', 'Сочи · центр', 'Хоста', 'Адлер', 'Красная Поляна']
