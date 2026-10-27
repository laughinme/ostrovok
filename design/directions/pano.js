// «Ваше окно»: процедурная панорама для эскизов направлений.
// Геометрия демонстрационная (не расчёт): сектор 150°–330°, море 168°–296°, дома напротив.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1200, H = 320, HZ = 176;
  const AZ0 = 150, AZ1 = 330;
  const PX = W / (AZ1 - AZ0);          // пикселей на градус по горизонтали
  const VS = PX * 1.7;                 // вертикальное преувеличение
  const SEA = [168, 296];
  const SUN_AZ = 243;
  const BUILDINGS = [
    { a: 152, b: 166, h: 26, d: 95 },
    { a: 184, b: 203, h: 19, d: 55 },
    { a: 203, b: 219, h: 14, d: 72 },
    { a: 229, b: 238, h: 11, d: 48 },
    { a: 256, b: 279, h: 21, d: 64 },
    { a: 279, b: 293, h: 13, d: 41 },
  ];
  const x = (az) => (az - AZ0) * PX;
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const topY = (b, eye) => HZ - (Math.atan2(b.h - eye, b.d) * 180 / Math.PI) * VS;

  function hills(points) {
    return points.map(([az, alt], i) => `${i ? 'L' : 'M'}${x(az).toFixed(1)},${(HZ - alt * VS).toFixed(1)}`).join(' ');
  }

  function render(svg) {
    const css = getComputedStyle(svg);
    const v = (n) => css.getPropertyValue(n).trim();
    const id = 'p' + Math.random().toString(36).slice(2, 7);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    const sky = el('linearGradient', { id: id + 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': v('--pano-sky-top') }, sky);
    el('stop', { offset: '1', 'stop-color': v('--pano-sky-low') }, sky);
    const sea = el('linearGradient', { id: id + 'sea', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': v('--pano-sea-top') }, sea);
    el('stop', { offset: '1', 'stop-color': v('--pano-sea-low') }, sea);
    const glow = el('radialGradient', { id: id + 'glow' }, defs);
    el('stop', { offset: '0', 'stop-color': v('--pano-sun'), 'stop-opacity': '.55' }, glow);
    el('stop', { offset: '1', 'stop-color': v('--pano-sun'), 'stop-opacity': '0' }, glow);
    const win = el('pattern', { id: id + 'win', width: 14, height: 13, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { x: 4, y: 4, width: 6, height: 5, fill: v('--pano-build-edge'), opacity: '.55' }, win);

    el('rect', { x: 0, y: 0, width: W, height: HZ, fill: `url(#${id}sky)` }, svg);
    el('ellipse', { cx: x(SUN_AZ), cy: HZ - 6, rx: 190, ry: 70, fill: `url(#${id}glow)` }, svg);
    el('rect', { x: 0, y: HZ, width: W, height: H - HZ, fill: `url(#${id}sea)` }, svg);
    // солнечная дорожка
    el('path', { d: `M${x(SUN_AZ) - 6},${HZ + 2} L${x(SUN_AZ) + 6},${HZ + 2} L${x(SUN_AZ) + 40},${H} L${x(SUN_AZ) - 40},${H} Z`, fill: v('--pano-sun'), opacity: '.18' }, svg);
    // траектория солнца в даты
    const arc = [];
    for (let az = 205; az <= SUN_AZ; az += 2) {
      const alt = Math.max(0, (SUN_AZ - az) * 0.42);
      arc.push(`${arc.length ? 'L' : 'M'}${x(az).toFixed(1)},${(HZ - alt * VS * 0.55).toFixed(1)}`);
    }
    el('path', { d: arc.join(' '), fill: 'none', stroke: v('--pano-sun'), 'stroke-width': 1.5, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round', opacity: '.9' }, svg);
    el('circle', { cx: x(SUN_AZ), cy: HZ - 5, r: 9, fill: v('--pano-sun') }, svg);

    // берега
    el('path', { d: hills([[AZ0, 9], [156, 8.2], [161, 6], [165, 3.4], [168, 0], [168, 60], [AZ0, 60]]) + ' Z', fill: v('--pano-land') }, svg);
    el('path', { d: hills([[296, 0], [301, 2.1], [308, 3.6], [316, 5.2], [323, 7.4], [AZ1, 8.6], [AZ1, -60], [296, -60]]) + ' Z', fill: v('--pano-land') }, svg);
    el('path', { d: hills([[300, 1], [309, 1.6], [318, 2.4], [AZ1, 3.2], [AZ1, 0], [300, 0]]) + ' Z', fill: v('--pano-land-far'), opacity: '.9' }, svg);

    // дома напротив: высота зависит от этажа
    const g = el('g', { class: 'pano-buildings' }, svg);
    const rects = BUILDINGS.map((b) => {
      const r = el('rect', { x: x(b.a), width: x(b.b) - x(b.a), y: H, height: 0, fill: v('--pano-build'), stroke: v('--pano-build-edge'), 'stroke-width': 1 }, g);
      const w = el('rect', { x: x(b.a) + 3, width: x(b.b) - x(b.a) - 6, y: H, height: 0, fill: `url(#${id}win)` }, g);
      for (const n of [r, w]) n.style.transition = 'y 420ms cubic-bezier(0.22,1,0.36,1), height 420ms cubic-bezier(0.22,1,0.36,1)';
      return [r, w];
    });

    // азимутальная шкала
    const ticks = el('g', { class: 'pano-ticks' }, svg);
    for (let az = 150; az <= 330; az += 5) {
      const major = az % 45 === 0;
      el('line', { x1: x(az), x2: x(az), y1: H, y2: H - (major ? 14 : 6), stroke: v('--pano-tick'), 'stroke-width': 1 }, ticks);
    }
    const names = { 180: 'Ю', 225: 'ЮЗ', 270: 'З', 315: 'СЗ' };
    for (const az in names) {
      const t = el('text', { x: x(+az), y: H - 20, 'text-anchor': 'middle', class: 'pano-label', fill: v('--pano-tick') }, ticks);
      t.textContent = names[az];
    }
    const sunT = el('text', { x: x(SUN_AZ) - 18, y: HZ - 18, 'text-anchor': 'end', class: 'pano-label pano-sun-label', fill: v('--pano-label') }, svg);
    sunT.textContent = 'закат 11 ноября · 16:58';

    function setFloor(floor) {
      const eye = floor * 3 - 1.5;
      let blocked = 0, total = 0;
      BUILDINGS.forEach((b, i) => {
        const y = Math.min(H, topY(b, eye));
        rects[i][0].style.y = y + 'px';
        rects[i][0].style.height = (H - y) + 'px';
        rects[i][1].style.y = (y + 6) + 'px';
        rects[i][1].style.height = Math.max(0, H - y - 6) + 'px';
      });
      for (let az = SEA[0]; az <= SEA[1]; az++) {
        total++;
        if (BUILDINGS.some((b) => az >= b.a && az < b.b && topY(b, eye) < HZ)) blocked++;
      }
      const sunBlocked = BUILDINGS.some((b) => SUN_AZ >= b.a && SUN_AZ < b.b && topY(b, eye) < HZ - 5);
      return { seaShare: Math.round(100 * (1 - blocked / total)), sunVisible: !sunBlocked };
    }
    return { setFloor };
  }

  window.mountPano = function (root) {
    const svg = root.querySelector('svg.pano');
    const api = render(svg);
    const range = root.querySelector('input[type=range]');
    const out = root.querySelectorAll('[data-out]');
    const update = () => {
      const f = range ? +range.value : +(root.dataset.floor || 6);
      const r = api.setFloor(f);
      out.forEach((o) => {
        const k = o.dataset.out;
        if (k === 'floor') o.textContent = f;
        if (k === 'sea') o.textContent = r.seaShare + '%';
        if (k === 'sun') o.textContent = r.sunVisible ? 'видно' : 'закрыт домом';
      });
    };
    if (range) range.addEventListener('input', update);
    requestAnimationFrame(update);
    return api;
  };
})();
