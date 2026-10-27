// «Ваше окно»: процедурная панорама для прототипа.
// Геометрия демонстрационная (не расчёт). У каждого фасада свой вид: море, горы, город.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1200, H = 320, HZ = 176;
  const SPAN = 180, PX = W / SPAN, VS = PX * 1.7;

  // a, b — градусы внутри сектора 0..180; h — высота дома, м; d — расстояние, м
  const FACADES = {
    SW: { from: 150, sea: [18, 146], sun: 93, sunVisible: true,
      left: [[0, 9], [6, 8.2], [11, 6], [15, 3.4], [18, 0]], right: [[146, 0], [151, 2.1], [158, 3.6], [166, 5.2], [173, 7.4], [180, 8.6]],
      buildings: [{ a: 2, b: 16, h: 26, d: 95 }, { a: 34, b: 53, h: 19, d: 55 }, { a: 53, b: 69, h: 14, d: 72 }, { a: 79, b: 88, h: 11, d: 48 }, { a: 106, b: 129, h: 21, d: 64 }, { a: 129, b: 143, h: 13, d: 41 }],
      labels: [] },
    SE: { from: 60, sea: [118, 180], sun: null,
      left: [[0, 14], [20, 16], [38, 12], [55, 9], [80, 6], [100, 3], [118, 0]], right: [],
      buildings: [{ a: 8, b: 30, h: 22, d: 50 }, { a: 64, b: 86, h: 16, d: 38 }, { a: 128, b: 150, h: 24, d: 70 }],
      labels: [[30, 16, 'гора Ахун']] },
    NE: { from: -30, sea: null, sun: null,
      left: [[0, 7], [15, 10], [32, 18], [44, 22], [58, 17], [74, 12], [92, 20], [104, 24], [120, 17], [140, 11], [160, 8], [180, 6]], right: [],
      buildings: [{ a: 40, b: 70, h: 9, d: 22 }, { a: 110, b: 150, h: 12, d: 30 }],
      labels: [[44, 22, 'гора Ахун'], [104, 24, 'хребет Ах-Цу']] },
    NW: { from: 240, sea: [0, 26], sun: 3, sunVisible: false,
      left: [[0, 0], [26, 0]], right: [[26, 0], [60, 3], [100, 5], [140, 6], [180, 4]],
      buildings: [{ a: 4, b: 22, h: 30, d: 60 }, { a: 30, b: 58, h: 18, d: 35 }, { a: 62, b: 96, h: 27, d: 45 }, { a: 100, b: 130, h: 15, d: 28 }, { a: 136, b: 176, h: 21, d: 40 }],
      labels: [] },
  };
  const NAMES = { 0: 'С', 45: 'СВ', 90: 'В', 135: 'ЮВ', 180: 'Ю', 225: 'ЮЗ', 270: 'З', 315: 'СЗ' };

  const x = (deg) => deg * PX;
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const topY = (b, eye) => HZ - (Math.atan2(b.h - eye, b.d) * 180 / Math.PI) * VS;
  const profile = (pts) => pts.map(([d, alt], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${(HZ - alt * VS).toFixed(1)}`).join(' ');

  function render(svg, key) {
    const F = FACADES[key] || FACADES.SW;
    const css = getComputedStyle(svg);
    const v = (n) => css.getPropertyValue(n).trim();
    const id = 'p' + Math.random().toString(36).slice(2, 7);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    const grad = (gid, a, b) => { const g = el('linearGradient', { id: id + gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs); el('stop', { offset: 0, 'stop-color': a }, g); el('stop', { offset: 1, 'stop-color': b }, g); };
    grad('sky', v('--pano-sky-top'), v('--pano-sky-low'));
    grad('sea', v('--pano-sea-top'), v('--pano-sea-low'));
    const glow = el('radialGradient', { id: id + 'glow' }, defs);
    el('stop', { offset: 0, 'stop-color': v('--pano-sun'), 'stop-opacity': '.55' }, glow);
    el('stop', { offset: 1, 'stop-color': v('--pano-sun'), 'stop-opacity': 0 }, glow);
    const win = el('pattern', { id: id + 'win', width: 14, height: 13, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { x: 4, y: 4, width: 6, height: 5, fill: v('--pano-build-edge'), opacity: '.55' }, win);

    el('rect', { x: 0, y: 0, width: W, height: HZ, fill: `url(#${id}sky)` }, svg);
    if (F.sun != null) el('ellipse', { cx: x(F.sun), cy: HZ - 6, rx: 190, ry: 70, fill: `url(#${id}glow)` }, svg);
    // земля под горизонтом, море — только в своём секторе
    el('rect', { x: 0, y: HZ, width: W, height: H - HZ, fill: v('--pano-land') }, svg);
    if (F.sea) {
      el('rect', { x: x(F.sea[0]), y: HZ, width: x(F.sea[1]) - x(F.sea[0]), height: H - HZ, fill: `url(#${id}sea)` }, svg);
      if (F.sun != null && F.sunVisible) el('path', { d: `M${x(F.sun) - 6},${HZ + 2} L${x(F.sun) + 6},${HZ + 2} L${x(F.sun) + 40},${H} L${x(F.sun) - 40},${H} Z`, fill: v('--pano-sun'), opacity: '.18' }, svg);
    }
    if (F.sun != null && F.sunVisible) {
      const arc = [];
      for (let d = F.sun - 38; d <= F.sun; d += 2) arc.push(`${arc.length ? 'L' : 'M'}${x(d).toFixed(1)},${(HZ - (F.sun - d) * 0.42 * VS * 0.55).toFixed(1)}`);
      el('path', { d: arc.join(' '), fill: 'none', stroke: v('--pano-sun'), 'stroke-width': 1.5, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: x(F.sun), cy: HZ - 5, r: 9, fill: v('--pano-sun') }, svg);
      const t = el('text', { x: x(F.sun) - 18, y: HZ - 18, 'text-anchor': 'end', class: 'pano-label pano-sun-label', fill: v('--pano-label') }, svg);
      t.textContent = 'закат 11 ноября · 16:58';
    }
    // рельеф
    if (F.left.length) el('path', { d: profile(F.left) + ` L${x(F.left[F.left.length - 1][0])},${HZ + 1} L${x(F.left[0][0])},${HZ + 1} Z`, fill: v('--pano-land') }, svg);
    if (F.right.length) el('path', { d: profile(F.right) + ` L${x(F.right[F.right.length - 1][0])},${HZ + 1} L${x(F.right[0][0])},${HZ + 1} Z`, fill: v('--pano-land') }, svg);
    for (const [d, alt, name] of F.labels) {
      el('line', { x1: x(d), x2: x(d), y1: HZ - alt * VS - 6, y2: HZ - alt * VS - 22, stroke: v('--pano-label'), 'stroke-width': 1 }, svg);
      const t = el('text', { x: x(d), y: HZ - alt * VS - 28, 'text-anchor': 'middle', class: 'pano-label', fill: v('--pano-label') }, svg);
      t.textContent = name;
    }
    // дома
    const g = el('g', {}, svg);
    const rects = F.buildings.map((b) => {
      const r = el('rect', { x: x(b.a), width: x(b.b) - x(b.a), y: H, height: 0, fill: v('--pano-build'), stroke: v('--pano-build-edge'), 'stroke-width': 1 }, g);
      const w = el('rect', { x: x(b.a) + 3, width: x(b.b) - x(b.a) - 6, y: H, height: 0, fill: `url(#${id}win)` }, g);
      for (const n of [r, w]) n.style.transition = 'y 420ms cubic-bezier(0.22,1,0.36,1), height 420ms cubic-bezier(0.22,1,0.36,1)';
      return [r, w];
    });
    // шкала сторон света
    for (let d = 0; d <= SPAN; d += 5) {
      const az = (F.from + d + 360) % 360, major = az % 45 === 0;
      el('line', { x1: x(d), x2: x(d), y1: H, y2: H - (major ? 14 : 6), stroke: v('--pano-tick'), 'stroke-width': 1 }, svg);
      if (major && d > 4 && d < SPAN - 4) {
        const t = el('text', { x: x(d), y: H - 20, 'text-anchor': 'middle', class: 'pano-label', fill: v('--pano-tick') }, svg);
        t.textContent = NAMES[az];
      }
    }
    return function setFloor(floor) {
      const eye = floor * 3 - 1.5;
      F.buildings.forEach((b, i) => {
        const y = Math.min(H, topY(b, eye));
        rects[i][0].style.y = y + 'px'; rects[i][0].style.height = (H - y) + 'px';
        rects[i][1].style.y = (y + 6) + 'px'; rects[i][1].style.height = Math.max(0, H - y - 6) + 'px';
      });
      let seaShare = 0;
      if (F.sea) {
        let blocked = 0, total = 0;
        for (let d = F.sea[0]; d <= F.sea[1]; d++) { total++; if (F.buildings.some((b) => d >= b.a && d < b.b && topY(b, eye) < HZ)) blocked++; }
        seaShare = Math.round(100 * (1 - blocked / total) * (F.sea[1] - F.sea[0]) / 128);
      }
      const sunVisible = F.sun != null && F.sunVisible && !F.buildings.some((b) => F.sun >= b.a && F.sun < b.b && topY(b, eye) < HZ - 5);
      return { seaShare: Math.min(100, seaShare), sunVisible, mountains: key === 'NE' || key === 'SE' };
    };
  }

  window.mountPano = function (root) {
    const svg = root.querySelector('svg.pano');
    const range = root.querySelector('input[type=range]');
    const out = root.querySelectorAll('[data-out]');
    let facade = root.dataset.facade || 'SW';
    let setFloor = render(svg, facade);
    const update = () => {
      const f = range ? +range.value : +(root.dataset.floor || 6);
      const r = setFloor(f);
      out.forEach((o) => {
        const k = o.dataset.out;
        if (k === 'floor') o.textContent = f;
        if (k === 'sea') o.textContent = r.seaShare ? r.seaShare + '%' : 'не видно';
        if (k === 'sun') o.textContent = r.sunVisible ? 'видно' : 'не видно';
      });
      root.dispatchEvent(new CustomEvent('pano', { detail: { floor: f, facade, ...r } }));
    };
    if (range) range.addEventListener('input', update);
    root.querySelectorAll('[data-facade]').forEach((b) => b.addEventListener('click', () => {
      facade = b.dataset.facade;
      root.querySelectorAll('[data-facade]').forEach((n) => n.classList.toggle('on', n === b));
      setFloor = render(svg, facade);
      requestAnimationFrame(update);
    }));
    requestAnimationFrame(update);
  };
})();
