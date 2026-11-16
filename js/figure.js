// Personnage 3D en CSS (aucune librairie) : squelette articulé animé par
// interpolation de poses, avec cinématique inverse pour garder les mains posées.
//
// Convention des angles (en degrés, absolus) : 0 = vers le bas, 90 = vers l'avant
// (le personnage regarde à droite), 180 = vers le haut, -90 = vers l'arrière.

const SEG = {
  torso: { L: 54, w: 24 },
  neck: { L: 9, w: 10 },
  ua: { L: 31, w: 11 },
  fa: { L: 29, w: 10 },
  th: { L: 46, w: 15 },
  sh: { L: 44, w: 12 }
};
const HEAD_R = 15;
const FLOOR_Y = 215; // position du sol dans la scène (px)
const SCENE_W = 300;

const STAND = { torso: 180, head: 180, uaL: 4, faL: 12, uaR: -4, faR: 8, thL: 3, shL: 0, thR: -3, shR: 0 };
const pose = (over) => Object.assign({}, STAND, over);
const legs = (a, b = a) => ({ thL: a, shL: b, thR: a, shR: b });
const arms = (u, f = u) => ({ uaL: u, faL: f, uaR: u, faR: f });

// t = durée de transition vers la pose (ms), h = durée de maintien.
const ANIMS = {
  idle: {
    anchor: 'lowest',
    frames: [
      { t: 700, h: 900, cue: 'Prêt ?', p: pose({}) },
      { t: 600, h: 1200, cue: 'Force tranquille 💪', p: pose({ uaL: 98, faL: 178, uaR: 86, faR: 172, torso: 178 }) },
      { t: 600, h: 600, cue: 'Prêt ?', p: pose({ uaL: 10, faL: 20, uaR: -12, faR: -6 }) }
    ]
  },
  armCircles: {
    anchor: 'lowest',
    frames: [
      { t: 450, h: 0, cue: 'Grands cercles lents', p: pose(arms(0)) },
      { t: 450, h: 0, cue: 'Grands cercles lents', p: pose(arms(90)) },
      { t: 450, h: 0, cue: 'Épaules basses', p: pose(arms(180)) },
      { t: 450, h: 0, cue: 'Épaules basses', p: pose(arms(270)) }
    ]
  },
  wallPushup: {
    anchor: 'foot', at: [-58, 0], prop: { type: 'wall', x: 60 },
    frames: [
      { t: 1400, h: 250, cue: 'Pousse en expirant', p: { torso: 158, head: 160, ...legs(-22), handR: [57, -134], handL: [57, -134] } },
      { t: 1800, h: 250, cue: 'Descends en inspirant', p: { torso: 146, head: 150, ...legs(-34), handR: [57, -134], handL: [57, -134] } }
    ]
  },
  inclinePushup: {
    anchor: 'foot', at: [-80, 0], prop: { type: 'table', y: -50, x1: 18, x2: 95 },
    frames: [
      { t: 1400, h: 250, cue: 'Pousse en expirant', p: { torso: 132, head: 134, ...legs(-48), handR: [36, -50], handL: [36, -50] } },
      { t: 1900, h: 250, cue: 'Descends lentement', p: { torso: 118, head: 120, ...legs(-62), handR: [36, -50], handL: [36, -50] } }
    ]
  },
  kneePushup: {
    anchor: 'knee', at: [-48, -6],
    frames: [
      { t: 1300, h: 250, cue: 'Pousse le sol, expire', p: { torso: 124, head: 126, thL: -56, thR: -56, shL: -100, shR: -100, handR: [38, -3], handL: [38, -3] } },
      { t: 1900, h: 250, cue: 'Descends, coudes à 45°', p: { torso: 104, head: 106, thL: -76, thR: -76, shL: -100, shR: -100, handR: [38, -3], handL: [38, -3] } }
    ]
  },
  pushup: {
    anchor: 'foot', at: [-78, -2],
    frames: [
      { t: 1300, h: 250, cue: 'Corps gainé, pousse', p: { torso: 111, head: 113, ...legs(-69), handR: [58, -3], handL: [58, -3] } },
      { t: 1900, h: 250, cue: 'Descends lentement', p: { torso: 99, head: 101, ...legs(-81), handR: [58, -3], handL: [58, -3] } }
    ]
  },
  floorDips: {
    anchor: 'foot', at: [50, -2],
    frames: [
      { t: 1300, h: 250, cue: 'Tends les bras, expire', p: { torso: 226, head: 196, thL: 108, thR: 108, shL: 12, shR: 12, handR: [-50, -3], handL: [-50, -3] } },
      { t: 1800, h: 250, cue: 'Coudes vers l’arrière, inspire', p: { torso: 238, head: 205, thL: 122, thR: 122, shL: 6, shR: 6, handR: [-50, -3], handL: [-50, -3] } }
    ]
  },
  towelCurl: {
    anchor: 'hip', at: [-35, -10], prop: { type: 'towel' },
    frames: [
      { t: 900, h: 2600, cue: 'Tire et tiens… respire !', p: { torso: 186, head: 182, thL: 122, thR: 122, shL: 22, shR: 22, uaL: 8, faL: 100, uaR: 4, faR: 98 } },
      { t: 900, h: 1500, cue: 'Relâche', p: { torso: 182, head: 180, thL: 122, thR: 122, shL: 22, shR: 22, uaL: 20, faL: 80, uaR: 18, faR: 78 } }
    ]
  },
  shoulderTaps: {
    anchor: 'knee', at: [-48, -6],
    frames: [
      { t: 600, h: 300, cue: 'Hanches immobiles', p: { torso: 124, head: 126, thL: -56, thR: -56, shL: -100, shR: -100, handR: [38, -3], handL: [38, -3] } },
      { t: 700, h: 500, cue: 'Main droite → épaule gauche', p: { torso: 124, head: 126, thL: -56, thR: -56, shL: -100, shR: -100, handL: [38, -3], uaR: 40, faR: 205 } },
      { t: 600, h: 300, cue: 'Hanches immobiles', p: { torso: 124, head: 126, thL: -56, thR: -56, shL: -100, shR: -100, handR: [38, -3], handL: [38, -3] } },
      { t: 700, h: 500, cue: 'Main gauche → épaule droite', p: { torso: 124, head: 126, thL: -56, thR: -56, shL: -100, shR: -100, handR: [38, -3], uaL: 40, faL: 205 } }
    ]
  },
  superman: {
    anchor: 'lowest', x: -10,
    frames: [
      { t: 1200, h: 400, cue: 'Repos, nuque longue', p: { torso: 90, head: 88, ...legs(-90), ...arms(94) } },
      { t: 1200, h: 1600, cue: 'Décolle et tiens 2 s', p: { torso: 104, head: 106, ...legs(-87), ...arms(116) } }
    ]
  },
  plank: {
    anchor: 'lowest', x: 0,
    frames: [
      { t: 1600, h: 400, cue: 'Corps bien droit', p: { torso: 102, head: 104, ...legs(-78), uaL: 0, faL: 92, uaR: 0, faR: 92 } },
      { t: 1600, h: 400, cue: 'Respire calmement', p: { torso: 103, head: 106, ...legs(-77), uaL: 1, faL: 92, uaR: 1, faR: 92 } }
    ]
  },
  stretch: {
    anchor: 'lowest',
    frames: [
      { t: 1000, h: 2500, cue: 'Étire le triceps, en douceur', p: pose({ uaR: 172, faR: 345, uaL: 150, faL: 205 }) },
      { t: 1000, h: 2500, cue: 'Ouvre la poitrine', p: pose({ torso: 177, head: 182, ...arms(-32, -40) }) }
    ]
  }
};

// --- Outils géométriques -------------------------------------------------
const rad = (d) => (d * Math.PI) / 180;
const dirOf = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p, a, L) => { const d = dirOf(a); return [p[0] + d[0] * L, p[1] + d[1] * L]; };
const angleTo = (p, q) => (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180) / Math.PI;
const shortest = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

// Cinématique inverse à deux segments : renvoie [angleBras, angleAvantBras].
function solveArm(shoulder, target, bend) {
  const a = SEG.ua.L, b = SEG.fa.L;
  const dx = target[0] - shoulder[0], dy = target[1] - shoulder[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), 1), a + b - 0.01);
  const base = angleTo(shoulder, target);
  const alpha = (Math.acos((a * a + d * d - b * b) / (2 * a * d)) * 180) / Math.PI;
  const ua = base + bend * alpha;
  const elbow = add(shoulder, ua, a);
  return [ua, angleTo(elbow, target)];
}

// Positions des articulations (hanche à l'origine, y vers le bas).
function forward(p) {
  const hip = [0, 0];
  const shoulder = add(hip, p.torso, SEG.torso.L);
  const head = add(add(shoulder, p.head, SEG.neck.L), p.head, HEAD_R);
  const kneeR = add(hip, p.thR, SEG.th.L);
  const kneeL = add(hip, p.thL, SEG.th.L);
  const footR = add(kneeR, p.shR, SEG.sh.L);
  const footL = add(kneeL, p.shL, SEG.sh.L);
  const elbowR = add(shoulder, p.uaR, SEG.ua.L);
  const elbowL = add(shoulder, p.uaL, SEG.ua.L);
  const handR = add(elbowR, p.faR, SEG.fa.L);
  const handL = add(elbowL, p.faL, SEG.fa.L);
  return { hip, shoulder, head, kneeR, kneeL, footR, footL, elbowR, elbowL, handR, handL };
}

function lerpPose(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) {
    const va = a[key], vb = b[key] ?? va;
    if (Array.isArray(va)) out[key] = [va[0] + (vb[0] - va[0]) * k, va[1] + (vb[1] - va[1]) * k];
    else if (typeof va === 'number' && key !== 'bend') out[key] = va + shortest(va, vb) * k;
    else out[key] = va;
  }
  // Une main n'est maintenue par cinématique inverse que si elle l'est dans les deux poses.
  for (const h of ['handR', 'handL']) if (!(h in a) || !(h in b)) delete out[h];
  return out;
}

// Complète une pose (valeurs par défaut) et calcule le placement dans la scène.
function resolvePose(anim, raw) {
  const p = Object.assign({}, STAND, raw);
  const anchorWorld = anim.at || [anim.x || 0, 0];
  let pts = forward(p);
  const anchorName = { foot: 'footR', knee: 'kneeR', hip: 'hip' }[anim.anchor];
  let offset;
  if (anchorName) {
    const a = pts[anchorName];
    offset = [anchorWorld[0] - a[0], anchorWorld[1] - a[1]];
  } else {
    // 'lowest' : le point le plus bas touche le sol.
    const pad = 6;
    const lowest = Math.max(...Object.values(pts).map((q) => q[1]));
    offset = [anchorWorld[0], -lowest - pad];
  }
  // Cinématique inverse pour les mains posées (cibles en coordonnées monde).
  const bend = p.bend || -1; // -1 : coude vers l'arrière
  for (const side of ['R', 'L']) {
    const target = p['hand' + side];
    if (!target) continue;
    const local = [target[0] - offset[0], target[1] - offset[1]];
    const [ua, fa] = solveArm(pts.shoulder, local, bend);
    p['ua' + side] = ua;
    p['fa' + side] = fa;
  }
  pts = forward(p);
  return { p, pts, offset };
}

// --- Construction du personnage en DOM 3D --------------------------------
function makeJoint(parent, top, z, seg, cls) {
  const j = document.createElement('div');
  j.className = 'joint';
  j.style.top = top + 'px';
  j.dataset.z = z;
  if (seg) {
    for (const extra of ['', ' b2']) {
      const b = document.createElement('div');
      b.className = 'bone ' + cls + extra;
      b.style.cssText = `left:${-seg.w / 2}px;top:${-seg.w / 2}px;width:${seg.w}px;height:${seg.L + seg.w}px;border-radius:${seg.w / 2}px`;
      j.appendChild(b);
    }
  }
  parent.appendChild(j);
  return j;
}

class Figure {
  constructor(container, animName = 'idle', opts = {}) {
    this.container = container;
    this.opts = opts;
    this.yawBase = opts.yaw ?? -28;
    this.drag = 0;
    container.classList.add('stage');
    container.innerHTML = '<div class="scene"><div class="floor"></div><div class="shadow"></div><div class="props"></div><div class="figure-root"></div></div>';
    this.scene = container.querySelector('.scene');
    this.props = container.querySelector('.props');
    this.shadow = container.querySelector('.shadow');
    this.build(container.querySelector('.figure-root'));
    this.setAnim(animName);
    this.bindDrag();
    Figure.all.add(this);
    Figure.ensureLoop();
  }

  build(rootEl) {
    const root = makeJoint(rootEl, 0, 0, null);
    const torso = makeJoint(root, 0, 0, SEG.torso, 'torso');
    const neck = makeJoint(torso, SEG.torso.L, 0, SEG.neck, 'neck');
    const head = document.createElement('div');
    head.className = 'head-wrap';
    head.style.top = SEG.neck.L + 'px';
    head.innerHTML = '<div class="head"></div><div class="head b2"></div><div class="visor"></div><div class="band"></div>';
    neck.appendChild(head);
    const uaL = makeJoint(torso, SEG.torso.L - 4, -13, SEG.ua, 'limb far');
    const faL = makeJoint(uaL, SEG.ua.L, 0, SEG.fa, 'limb far');
    const uaR = makeJoint(torso, SEG.torso.L - 4, 13, SEG.ua, 'limb');
    const faR = makeJoint(uaR, SEG.ua.L, 0, SEG.fa, 'limb');
    const thL = makeJoint(root, 0, -7, SEG.th, 'leg far');
    const shL = makeJoint(thL, SEG.th.L, 0, SEG.sh, 'leg far');
    const thR = makeJoint(root, 0, 7, SEG.th, 'leg');
    const shR = makeJoint(thR, SEG.th.L, 0, SEG.sh, 'leg');
    for (const [fa, far] of [[faL, true], [faR, false]]) {
      const hand = document.createElement('div');
      hand.className = 'hand' + (far ? ' far' : '');
      hand.style.top = SEG.fa.L + 'px';
      fa.appendChild(hand);
    }
    for (const [sh, far] of [[shL, true], [shR, false]]) {
      const foot = document.createElement('div');
      foot.className = 'foot' + (far ? ' far' : '');
      foot.style.top = SEG.sh.L + 'px';
      sh.appendChild(foot);
    }
    this.j = { root, torso, neck, uaL, faL, uaR, faR, thL, shL, thR, shR };
  }

  setAnim(name) {
    this.anim = ANIMS[name] || ANIMS.idle;
    this.frameIndex = 0;
    this.frameStart = performance.now();
    this.resolved = this.anim.frames.map((fr) => resolvePose(this.anim, fr.p).p);
    this.lastCue = null;
    this.drawProps();
    // Boîte englobante de l'animation (coordonnées monde) pour cadrer la caméra.
    let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = 0;
    for (const fr of this.anim.frames) {
      const { pts, offset } = resolvePose(this.anim, fr.p);
      for (const q of Object.values(pts)) {
        x1 = Math.min(x1, q[0] + offset[0]); x2 = Math.max(x2, q[0] + offset[0]);
        y1 = Math.min(y1, q[1] + offset[1] - HEAD_R); y2 = Math.max(y2, q[1] + offset[1]);
      }
    }
    const prop = this.anim.prop;
    if (prop && prop.type === 'wall') { x2 = Math.max(x2, prop.x); y1 = Math.min(y1, -190); }
    if (prop && prop.type === 'table') { x1 = Math.min(x1, prop.x1); x2 = Math.max(x2, prop.x2); }
    this.box = { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1 };
    const ox = SCENE_W / 2 + this.box.cx, oy = FLOOR_Y + this.box.cy;
    this.scene.style.marginLeft = -ox + 'px';
    this.scene.style.marginTop = -oy + 'px';
    this.scene.style.transformOrigin = `${ox}px ${oy}px`;
  }

  drawProps() {
    const prop = this.anim.prop;
    this.props.innerHTML = '';
    if (!prop) return;
    const cx = SCENE_W / 2;
    if (prop.type === 'wall') {
      this.props.innerHTML = `<div class="prop-wall" style="left:${cx + prop.x}px;top:${FLOOR_Y - 190}px"></div>`;
    } else if (prop.type === 'table') {
      const w = prop.x2 - prop.x1, h = -prop.y;
      this.props.innerHTML = `<div class="prop-table-top" style="left:${cx + prop.x1}px;top:${FLOOR_Y - h}px;width:${w}px"></div>
        <div class="prop-table-side" style="left:${cx + prop.x1}px;top:${FLOOR_Y - h}px;width:${w}px;height:${h}px"></div>`;
    } else if (prop.type === 'towel') {
      this.towel = document.createElement('div');
      this.towel.className = 'prop-towel';
      this.props.appendChild(this.towel);
    }
  }

  bindDrag() {
    let startX = null, startDrag = 0;
    const el = this.container;
    el.addEventListener('pointerdown', (e) => { startX = e.clientX; startDrag = this.drag; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (startX !== null) this.drag = startDrag + (e.clientX - startX) * 0.6; });
    const end = () => { startX = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // Calcule la pose du moment et met à jour le DOM.
  tick(now) {
    const frames = this.anim.frames;
    let f = frames[this.frameIndex];
    let next = frames[(this.frameIndex + 1) % frames.length];
    let elapsed = now - this.frameStart;
    while (elapsed > f.h + next.t) {
      this.frameStart += f.h + next.t;
      elapsed -= f.h + next.t;
      this.frameIndex = (this.frameIndex + 1) % frames.length;
      f = frames[this.frameIndex];
      next = frames[(this.frameIndex + 1) % frames.length];
    }
    const k = elapsed < f.h ? 0 : ease((elapsed - f.h) / next.t);
    const nextIndex = (this.frameIndex + 1) % frames.length;
    const raw = lerpPose(this.resolved[this.frameIndex], this.resolved[nextIndex], k);
    const { p, pts, offset } = resolvePose(this.anim, raw);
    const cue = k > 0.5 ? next.cue : f.cue;
    if (cue !== this.lastCue) {
      this.lastCue = cue;
      if (this.opts.onCue) this.opts.onCue(cue);
    }
    this.apply(p, pts, offset, now);
  }

  apply(p, pts, offset, now) {
    const cx = SCENE_W / 2;
    const j = this.j;
    j.root.style.left = cx + offset[0] + 'px';
    j.root.style.top = FLOOR_Y + offset[1] + 'px';
    const rel = {
      torso: p.torso, neck: p.head - p.torso,
      uaL: p.uaL - p.torso, faL: p.faL - p.uaL, uaR: p.uaR - p.torso, faR: p.faR - p.uaR,
      thL: p.thL, shL: p.shL - p.thL, thR: p.thR, shR: p.shR - p.thR
    };
    for (const k of Object.keys(rel)) {
      const z = j[k].dataset.z;
      j[k].style.transform = `translateZ(${z}px) rotateZ(${-rel[k]}deg)`;
    }
    if (this.towel) {
      const a = [pts.handR[0] + offset[0], pts.handR[1] + offset[1]];
      const b = [pts.footR[0] + offset[0], pts.footR[1] + offset[1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      this.towel.style.cssText = `left:${cx + a[0]}px;top:${FLOOR_Y + a[1]}px;height:${len}px;transform:translateZ(10px) rotateZ(${-angleTo(a, b)}deg)`;
    }
    const xs = Object.values(pts).map((q) => q[0] + offset[0]);
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    const width = Math.max(...xs) - Math.min(...xs) + 40;
    this.shadow.style.cssText = `left:${cx + mid - width / 2}px;top:${FLOOR_Y - 14}px;width:${width}px`;
    const scale = Math.min(1.8, this.container.clientWidth / (this.box.w + 70), this.container.clientHeight / (this.box.h + 50));
    const yaw = this.yawBase + this.drag + (this.opts.still ? 0 : Math.sin(now / 2600) * 14);
    this.scene.style.transform = `scale(${scale}) rotateX(-10deg) rotateY(${yaw}deg)`;
  }

  destroy() {
    Figure.all.delete(this);
    this.container.innerHTML = '';
  }

  static ensureLoop() {
    if (Figure.running) return;
    Figure.running = true;
    const loop = (now) => {
      for (const fig of Figure.all) {
        if (!fig.container.isConnected) { Figure.all.delete(fig); continue; }
        if (fig.container.offsetParent !== null) fig.tick(now);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
Figure.all = new Set();
Figure.running = false;
