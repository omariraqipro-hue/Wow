// ARMUP AI — logique de l'application : état local, écrans, séance guidée.

// ---------- Utilitaires ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayIndex = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = lundi
const mondayOf = (d = new Date()) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - dayIndex(m)); return m; };
const fmtTime = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
const isStrength = (s) => s.workout === 'A' || s.workout === 'B';
const vibrate = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

// ---------- État persistant (localStorage) ----------
const STORE_KEY = 'armup_v1';
const defaultState = () => ({
  sessionsPerWeek: 3,
  sessions: [],
  levels: {},
  technique: {},
  best: {},
  goals: [
    { id: 'g1', exId: 'pompes-genoux', target: 12 },
    { id: 'g2', exId: 'planche', target: 40 },
    { id: 'g3', exId: 'pompes-mur', target: 20 }
  ],
  water: {},
  badges: {},
  xp: 0,
  listenCount: 0
});

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* stockage indisponible : on repart d'un état vide */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

// ---------- Règles du coach ----------
const levelOf = (id) => state.levels[id] ?? EXERCISES[id].base;
const techniqueOf = (id) => {
  const h = state.technique[id] || [];
  if (!h.length) return null;
  const last = h.slice(-3);
  return Math.round(last.reduce((a, b) => a + b, 0) / last.length);
};
const timesDone = (id) => state.sessions.filter((s) => s.results.some((r) => r.id === id)).length;
const isLearned = (id) => (state.technique[id] || []).length >= 3;
const isUnlocked = (id) => {
  const u = EXERCISES[id].unlock;
  if (!u) return true;
  return levelOf(u.exercise) >= u.reps && (techniqueOf(u.exercise) || 0) >= u.technique;
};
const unitOf = (ex) => (ex.type === 'time' ? 'secondes' : ex.unit || 'répétitions');
const RATED = (id) => id !== 'cercles-bras' && id !== 'etirements';

// Remplace les pompes sur les genoux par les classiques une fois débloquées.
function workoutItems(type) {
  return WORKOUTS[type].items.map((it) => (it.id === 'pompes-genoux' && isUnlocked('pompes-classiques') ? { ...it, id: 'pompes-classiques' } : it));
}

function estimateMinutes(type) {
  let s = 0;
  for (const it of workoutItems(type)) {
    const ex = EXERCISES[it.id];
    const per = ex.type === 'time' ? levelOf(it.id) : ex.unit === 'maintiens de 10 s' ? levelOf(it.id) * 20 : levelOf(it.id) * 3.5;
    s += it.sets * per + Math.max(0, it.sets - 1) * it.rest + 25;
  }
  return Math.max(5, Math.round(s / 60));
}

const lastStrength = () => [...state.sessions].reverse().find(isStrength);
// Nombre de jours calendaires entre deux dates (0 = même jour).
const daysBetween = (a, b) => { const d1 = new Date(a), d2 = new Date(b); d1.setHours(0, 0, 0, 0); d2.setHours(0, 0, 0, 0); return Math.round((d2 - d1) / 864e5); };
const hoursSince = (iso) => (Date.now() - new Date(iso).getTime()) / 36e5;
const strengthThisWeek = () => { const m = mondayOf().getTime(); return state.sessions.filter((s) => isStrength(s) && new Date(s.date).getTime() >= m).length; };

// Peut-on faire une séance de renforcement maintenant ? (anti-surentraînement)
function strengthStatus() {
  const last = lastStrength();
  if (last) {
    const days = daysBetween(last.date, new Date());
    if (days < REST_DAYS) return { ok: false, reason: 'recovery', when: days === 0 ? 'après-demain' : 'demain' };
  }
  if (strengthThisWeek() >= Math.min(state.sessionsPerWeek, MAX_STRENGTH_PER_WEEK)) return { ok: false, reason: 'week' };
  return { ok: true };
}

// Séance proposée aujourd'hui.
function todayPlan() {
  const planned = WEEK_PLANS[state.sessionsPerWeek][dayIndex()];
  const doneToday = state.sessions.find((s) => dayKey(new Date(s.date)) === dayKey());
  const status = strengthStatus();
  const last = lastStrength();
  const alternate = last && last.workout === 'A' ? 'B' : 'A';
  if (doneToday) return { kind: 'done', session: doneToday, planned };
  if (planned === 'A' || planned === 'B') {
    if (status.ok) return { kind: 'strength', type: planned, planned };
    return { kind: 'blocked', status, planned };
  }
  // Jour de repos : rattrapage possible si une séance de la semaine a été manquée.
  const plannedSoFar = WEEK_PLANS[state.sessionsPerWeek].slice(0, dayIndex()).filter((x) => x === 'A' || x === 'B').length;
  if (status.ok && strengthThisWeek() < plannedSoFar && dayIndex() < 6) return { kind: 'catchup', type: alternate, planned };
  return { kind: 'rest', planned };
}

function recoveryInfo() {
  const last = lastStrength();
  if (!last) return { pct: 100, label: 'Prêt', text: 'Aucune séance récente : tes muscles sont reposés.' };
  const h = hoursSince(last.date);
  const pct = Math.min(100, Math.round((h / 48) * 100));
  if (h >= 48) return { pct: 100, label: 'Prêt', text: 'Récupération complète. Tes muscles sont prêts !' };
  if (h >= 24) return { pct, label: `${Math.round(h)} h`, text: 'Presque complètement récupéré : tu peux t’entraîner.' };
  return { pct, label: `${Math.ceil(48 - h)} h`, text: `Tes muscles se reconstruisent. Encore environ ${Math.ceil(48 - h)} h pour une récupération complète.` };
}

function rankOf(xp) {
  let r = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) { r = RANKS[i]; next = RANKS[i + 1] || null; }
  return { ...r, next };
}

// Semaines consécutives (jusqu'à la semaine en cours ou la précédente) avec ≥ 2 séances.
function weekStreak() {
  const counts = {};
  for (const s of state.sessions.filter(isStrength)) { const k = dayKey(mondayOf(new Date(s.date))); counts[k] = (counts[k] || 0) + 1; }
  let streak = 0;
  const m = mondayOf();
  if ((counts[dayKey(m)] || 0) < 2) m.setDate(m.getDate() - 7);
  while ((counts[dayKey(m)] || 0) >= 2) { streak++; m.setDate(m.getDate() - 7); }
  return streak;
}

function checkBadges() {
  const n = state.sessions.length;
  const strength = state.sessions.filter(isStrength);
  let restPairs = 0;
  for (let i = 1; i < strength.length; i++) if (daysBetween(strength[i - 1].date, strength[i].date) >= REST_DAYS) restPairs++;
  const level1 = Object.keys(EXERCISES).filter((id) => EXERCISES[id].level === 1 && RATED(id));
  const learned = Object.keys(EXERCISES).filter(isLearned).length;
  const streak = weekStreak();
  const cond = {
    first: n >= 1, s5: n >= 5, s15: n >= 15, s30: n >= 30,
    week2: streak >= 2, week4: streak >= 4,
    learn5: learned >= 5, learnAll: level1.every(isLearned),
    tech: Object.keys(EXERCISES).some((id) => isLearned(id) && techniqueOf(id) >= 80),
    recovery: restPairs >= 5,
    water: Object.values(state.water).filter((v) => v >= 7).length >= 3,
    goal: state.goals.some((g) => (state.best[g.exId] || 0) >= g.target),
    listen: state.listenCount >= 1
  };
  const fresh = [];
  for (const b of BADGES) {
    if (cond[b.id] && !state.badges[b.id]) { state.badges[b.id] = dayKey(); state.xp += 100; fresh.push(b); }
  }
  save();
  return fresh;
}

// ---------- Interface générale ----------
let currentView = 'home';
function showView(name) {
  currentView = name;
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
  $$('.bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  RENDER[name]();
  renderRank();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function refresh() { RENDER[currentView](); renderRank(); }

function renderRank() {
  const r = rankOf(state.xp);
  $('#rankChip').textContent = `${r.name} · ${state.xp} XP`;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

function openSheet(html, onMount) {
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
  $('.sheet', $('#sheet')).scrollTop = 0;
  if (onMount) onMount($('#sheetBody'));
}
// Confirmation intégrée (les boîtes confirm() du navigateur peuvent être bloquées).
function askConfirm(title, text, yesLabel, onYes) {
  openSheet(`<h2>${esc(title)}</h2><p class="muted" style="margin-top:8px">${esc(text)}</p>
    <div class="btn-row"><button class="btn ghost" data-close>Annuler</button><button class="btn" id="confirmYes">${esc(yesLabel)}</button></div>`,
  (body) => $('#confirmYes', body).addEventListener('click', () => { closeSheet(); onYes(); }));
}
function closeSheet() { $('#sheet').hidden = true; $('#sheetBody').innerHTML = ''; }

const badgeHtml = (b) => `<div class="badge ${state.badges[b.id] ? 'on' : ''}" title="${esc(b.desc)}"><div class="medal">${b.code}</div>${esc(b.name)}</div>`;

// ---------- Accueil ----------
let homeFigure = null;
let calMonth = new Date(); calMonth.setDate(1);

function todayCardHtml() {
  const t = todayPlan();
  if (t.kind === 'strength' || t.kind === 'catchup') {
    const w = WORKOUTS[t.type];
    const chips = workoutItems(t.type).filter((it) => RATED(it.id)).map((it) => `<span class="pill grey">${esc(EXERCISES[it.id].name)}</span>`).join('');
    return `<span class="pill">${t.kind === 'catchup' ? 'Rattrapage possible' : 'Programme du jour'}</span>
      <h1>${esc(w.short)}</h1>
      <p>≈ ${estimateMinutes(t.type)} min · ${workoutItems(t.type).length} exercices · sans matériel</p>
      <button class="btn" data-start="${t.type}">▶ Commencer</button>`;
  }
  if (t.kind === 'done') {
    return `<span class="pill">Séance terminée</span><h1>Bravo !</h1>
      <p>Tu as fait « ${esc(WORKOUTS[t.session.workout].short)} » aujourd’hui. Place à la récupération : mange bien, bois de l’eau et dors 8–10 h.</p>`;
  }
  if (t.kind === 'blocked') {
    const txt = t.status.reason === 'recovery'
      ? `Tes muscles récupèrent : un jour de repos entre deux séances. Ta prochaine séance sera disponible ${t.status.when}.`
      : 'Tu as fait toutes tes séances de la semaine. Super régularité !';
    return `<span class="pill warn">Récupération</span><h1>Repos mérité</h1><p>${txt}</p>
      <button class="btn ghost small" data-start="M">Mobilité douce</button>`;
  }
  return `<span class="pill grey">Jour de repos</span><h1>Récupération</h1>
    <p>Les muscles se renforcent pendant le repos. Option : 5 min de mobilité douce.</p>
    <button class="btn ghost small" data-start="M">Mobilité douce</button>`;
}

function weekStripHtml() {
  const plan = WEEK_PLANS[state.sessionsPerWeek];
  const mon = mondayOf();
  return plan.map((p, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const done = state.sessions.some((s) => dayKey(new Date(s.date)) === dayKey(d));
    const today = dayKey(d) === dayKey();
    const icon = done ? '✓' : p === 'R' ? '·' : p === 'M' ? 'M' : p;
    return `<div class="day-dot ${done ? 'done' : ''} ${today ? 'today' : ''} ${p === 'R' ? 'rest' : ''}">${DAY_SHORT[i]}<i>${icon}</i></div>`;
  }).join('');
}

function monthHtml() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const lead = dayIndex(first);
  const byDay = {};
  for (const s of state.sessions) byDay[dayKey(new Date(s.date))] = s;
  const plan = WEEK_PLANS[state.sessionsPerWeek];
  let cells = DAY_SHORT.map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < lead; i++) cells += '<div class="d out"></div>';
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const k = dayKey(date);
    const s = byDay[k];
    const p = plan[dayIndex(date)];
    const cls = [s ? (isStrength(s) ? 'done' : 'light') : '', !s && (p === 'A' || p === 'B') && date >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'planned' : '', k === dayKey() ? 'today' : ''].join(' ');
    cells += `<div class="d ${cls}">${d}</div>`;
  }
  const label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `<div class="month-head"><button data-cal="-1" aria-label="Mois précédent">‹</button><h3 style="text-transform:capitalize">${label}</h3><button data-cal="1" aria-label="Mois suivant">›</button></div>
    <div class="month">${cells}</div>
    <div class="legend"><span><i style="background:var(--green)"></i>Séance faite</span><span><i style="background:var(--green-soft)"></i>Mobilité</span><span><i style="background:var(--muted);border-radius:50%"></i>Prévue</span></div>`;
}

function renderHome() {
  const el = $('#view-home');
  const rec = recoveryInfo();
  const total = state.sessions.length;
  const nbBadges = Object.keys(state.badges).length;
  const sorted = [...BADGES].sort((a, b) => (state.badges[b.id] ? 1 : 0) - (state.badges[a.id] ? 1 : 0));
  el.innerHTML = `
    <div class="card hero glow">
      <div class="hero-inner">
        <div class="hero-text">${todayCardHtml()}</div>
        <div class="hero-stage" id="homeStage" aria-label="Personnage 3D (fais glisser pour tourner)"></div>
      </div>
    </div>

    <div class="grid-3" style="margin-top:12px">
      <div class="card stat"><b>${total}</b><span>séances terminées</span></div>
      <div class="card stat"><b>${weekStreak()}</b><span>semaines régulières</span></div>
      <div class="card stat"><b>${nbBadges}</b><span>badges</span></div>
    </div>

    <div class="section-title"><h2>Mon temps de récupération</h2></div>
    <div class="card recovery">
      <div class="ring" style="--p:${rec.pct}"><div><b>${rec.label}</b><small>${rec.pct}%</small></div></div>
      <div><h3>${rec.pct >= 100 ? 'Muscles prêts ' : 'Récupération en cours'}</h3><p class="muted" style="font-size:13px;margin-top:4px">${rec.text}</p></div>
    </div>

    <div class="section-title"><h2>Ma semaine</h2><button data-go="plan">Programme ›</button></div>
    <div class="card"><div class="week-strip" style="margin-top:0">${weekStripHtml()}</div></div>

    <div class="section-title"><h2>Mes exercices</h2><button data-go="coach">Tout voir ›</button></div>
    <div class="hscroll">
      ${Object.entries(EXERCISES).filter(([id]) => isUnlocked(id)).map(([id, ex]) => `
        <button class="card tap ex-card" data-ex="${id}"><small class="tag">${esc(ex.muscles[0])}</small><b>${esc(ex.name)}</b><small>${esc(ex.muscles.slice(1, 3).join(' · '))}</small></button>`).join('')}
    </div>

    <div class="section-title"><h2>Mon calendrier</h2></div>
    <div class="card" id="calCard">${monthHtml()}</div>

    <div class="section-title"><h2>Mes badges de régularité</h2><button data-go="progress">Tous ›</button></div>
    <div class="card"><div class="badge-row">${sorted.map(badgeHtml).join('')}</div></div>
  `;
  homeFigure = new Figure($('#homeStage'), 'idle', { yaw: -30 });
}

// ---------- Coach ----------
function renderCoach() {
  const el = $('#view-coach');
  const t = todayPlan();
  let cta;
  if (t.kind === 'strength' || t.kind === 'catchup') cta = `<button class="btn block" data-checkin="${t.type}">▶ Commencer : ${esc(WORKOUTS[t.type].short)}</button>`;
  else if (t.kind === 'done') cta = `<p class="muted">Séance du jour terminée Une seule séance par jour suffit : reviens après ta récupération.</p>`;
  else cta = `<p class="muted" style="margin-bottom:10px">${t.kind === 'blocked' && t.status.reason === 'recovery' ? `Récupération en cours : prochaine séance ${t.status.when}.` : 'Aujourd’hui, c’est récupération.'} Tu peux faire de la mobilité douce.</p><button class="btn ghost block" data-start="M">Mobilité douce (5 min)</button>`;
  el.innerHTML = `
    <div class="card glow">
      <div class="card-row"><div><h2>Ton coach sportif</h2><p class="muted" style="font-size:13px">Il adapte la séance à ta forme du jour et augmente la difficulté doucement.</p></div></div>
      <div style="margin-top:14px">${cta}</div>
    </div>

    <div class="section-title"><h2>Bibliothèque d’exercices</h2></div>
    <div class="ex-grid">
      ${Object.entries(EXERCISES).map(([id, ex]) => {
        const locked = !isUnlocked(id);
        const tech = techniqueOf(id);
        return `<button class="card tap ex-tile ${locked ? 'locked' : ''}" data-ex="${id}">
          ${locked ? '<span class="lock"></span>' : isLearned(id) ? '<span class="learned" title="Appris">✓</span>' : ''}
          <small class="tag">${esc(ex.muscles[0])}</small><b>${esc(ex.name)}</b>
          <small>${locked ? 'Niveau 2' : `${levelOf(id)} ${ex.type === 'time' ? 's' : ex.unit ? ex.unit.split(' ')[0] : 'rép.'}${tech !== null ? ` · technique ${tech}%` : ''}`}</small>
        </button>`;
      }).join('')}
    </div>

    <div class="section-title"><h2>Les règles d’or du coach</h2></div>
    <div class="card">
      <ul class="rules">
        <li>La <b>technique</b> avant la quantité.</li>
        <li>Jamais de charges lourdes ni d’effort maximal.</li>
        <li>Une douleur = on arrête et on prévient un adulte.</li>
        <li>Au moins un jour de repos entre deux séances.</li>
        <li>De l’eau avant, pendant et après.</li>
        <li>On progresse petit à petit : +1 ou +2 répétitions à la fois.</li>
      </ul>
    </div>
  `;
}

function openExercise(id) {
  const ex = EXERCISES[id];
  const locked = !isUnlocked(id);
  const tech = techniqueOf(id);
  const u = ex.unlock;
  openSheet(`
    <h2>${esc(ex.name)}</h2>
    <div class="chips" style="margin:8px 0 12px">${ex.muscles.map((m) => `<span class="pill">${esc(m)}</span>`).join('')}</div>
    <div class="detail-stage" id="detailStage"></div>
    <div class="cue" id="detailCue"></div>
    <div class="drag-hint">↔ Fais glisser le personnage pour le faire tourner</div>
    ${locked ? `<div class="info">Débloqué quand tu réussis ${u.reps} ${esc(EXERCISES[u.exercise].name.toLowerCase())} avec au moins ${u.technique}% de technique. Actuellement : ${levelOf(u.exercise)} rép., technique ${techniqueOf(u.exercise) ?? 0}%.</div>` : ''}
    <p style="margin-top:12px">${esc(ex.summary)}</p>
    <div class="grid-3" style="margin-top:12px">
      <div class="card stat"><b>${levelOf(id)}</b><span>${esc(unitOf(ex))}</span></div>
      <div class="card stat"><b>${timesDone(id)}</b><span>séances</span></div>
      <div class="card stat"><b>${tech ?? '–'}${tech !== null ? '%' : ''}</b><span>technique</span></div>
    </div>
    <div class="section-title"><h2>Étape par étape</h2></div>
    <ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="section-title"><h2>Corriger ma posture</h2></div>
    <p class="muted" style="font-size:13px">Touche ce que tu ressens ou remarques :</p>
    <div class="fix-list">${ex.mistakes.map((m) => `<button class="fix-btn">${esc(m.label)}<div class="fix">${esc(m.fix)}</div></button>`).join('')}</div>
    <div class="safety">Arrête immédiatement en cas de douleur (articulation, poignet, épaule, dos) et parles-en à un adulte. Une fatigue musculaire légère est normale, une douleur ne l’est pas.</div>
  `, (body) => {
    const fig = new Figure($('#detailStage', body), ex.anim, { yaw: -32, onCue: (c) => { const el = $('#detailCue'); if (el) el.textContent = c; } });
    $$('.fix-btn', body).forEach((b) => b.addEventListener('click', () => b.classList.toggle('open')));
    return fig;
  });
}

// Bilan de forme avant la séance : la séance s'adapte au ressenti.
function openCheckin(type) {
  openSheet(`
    <h2>Comment te sens-tu aujourd’hui ?</h2>
    <p class="muted" style="margin-top:6px">Sois honnête : le coach adapte ta séance.</p>
    <div class="feel-grid">
      <button class="feel" data-feel="great"><div><b>En pleine forme</b><small>Séance normale</small></div></button>
      <button class="feel" data-feel="ok"><div><b>Un peu fatigué</b><small>Séance allégée (moins de séries)</small></div></button>
      <button class="feel" data-feel="sore"><div><b>Grosses courbatures</b><small>Mobilité douce à la place</small></div></button>
      <button class="feel" data-feel="tired"><div><b>Très fatigué / mal dormi</b><small>Repos ou mobilité douce</small></div></button>
      <button class="feel" data-feel="pain"><div><b>J’ai mal quelque part</b><small>Pas d’entraînement aujourd’hui</small></div></button>
    </div>
  `, (body) => {
    $$('[data-feel]', body).forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.feel;
      if (f === 'great') { closeSheet(); startSession(type, { feeling: f }); return; }
      if (f === 'ok') { closeSheet(); startSession(type, { feeling: f, light: true }); toast('Séance allégée : 1 série de moins et moins de répétitions.'); return; }
      state.listenCount++;
      const fresh = checkBadges();
      if (f === 'pain') {
        openSheet(`<div class="celebrate">Stop</div><h2 style="text-align:center">Pas d’entraînement aujourd’hui</h2>
          <ul class="tips" style="margin-top:14px">
            <li>Repose la zone douloureuse.</li>
            <li>Préviens un parent ou un adulte de confiance.</li>
            <li>Si la douleur dure plus de 2–3 jours, gonfle ou te gêne pour bouger : consulte un médecin.</li>
            <li>Tu reprendras avec une version plus facile quand tu n’auras plus mal.</li>
          </ul>
          <div class="info">Écouter son corps, c’est ce que font les vrais sportifs.</div>
          <button class="btn block" style="margin-top:14px" data-close>Compris</button>`);
      } else {
        openSheet(`<div class="celebrate">Repos</div><h2 style="text-align:center">Bonne décision !</h2>
          <p class="muted" style="text-align:center;margin-top:8px">Quand on est très fatigué ou plein de courbatures, le muscle a besoin de récupérer. Une mobilité douce de 5 minutes aide à te sentir mieux.</p>
          <div class="btn-row"><button class="btn ghost" data-close>Repos complet</button><button class="btn" data-start="M">Mobilité</button></div>`);
      }
      if (fresh.length) toast(`Nouveau badge : ${fresh.map((x) => x.name).join(', ')}`);
    }));
  });
}

// ---------- Séance guidée ----------
let session = null;
let playerFigure = null;
let timer = null;

function startSession(type, opts = {}) {
  if ((type === 'A' || type === 'B') && !strengthStatus().ok) { toast('Récupération en cours : séance indisponible pour l’instant.'); return; }
  const light = !!opts.light;
  const steps = [];
  const items = workoutItems(type);
  items.forEach((it, idx) => {
    const ex = EXERCISES[it.id];
    const sets = light ? Math.max(1, it.sets - 1) : it.sets;
    let target = levelOf(it.id);
    if (light) target = Math.max(ex.type === 'time' ? 10 : 2, Math.round(target * 0.75));
    for (let s = 1; s <= sets; s++) {
      steps.push({ kind: 'work', id: it.id, set: s, sets, target });
      if (s < sets) steps.push({ kind: 'rest', secs: it.rest, nextId: it.id });
    }
    if (RATED(it.id)) steps.push({ kind: 'rate', id: it.id });
    if (idx < items.length - 1) steps.push({ kind: 'rest', secs: 20, nextId: items[idx + 1].id, between: true });
  });
  session = { type, light, feeling: opts.feeling || 'great', steps, i: 0, start: Date.now(), results: {}, ratings: {} };
  $('#player').hidden = false;
  document.body.style.overflow = 'hidden';
  renderStep();
}

function stopTimer() { clearInterval(timer); timer = null; }

function closePlayer() {
  stopTimer();
  session = null;
  if (playerFigure) { playerFigure.destroy(); playerFigure = null; }
  $('#player').hidden = true;
  $('#player').innerHTML = '';
  document.body.style.overflow = '';
}

function nextStep() {
  stopTimer();
  session.i++;
  if (session.i >= session.steps.length) renderSummary();
  else renderStep();
}

function playerShell(inner) {
  const pct = Math.round((session.i / session.steps.length) * 100);
  return `<div class="player-inner">
    <div class="player-top"><button data-quit>✕ Quitter</button><span class="muted" style="font-size:13px">${esc(WORKOUTS[session.type].short)}${session.light ? ' · allégée' : ''}</span></div>
    <div class="progress-track"><i style="width:${pct}%"></i></div>
    ${inner}
  </div>`;
}

function mountFigure(anim) {
  if (playerFigure) playerFigure.destroy();
  const stage = $('#playerStage');
  playerFigure = stage ? new Figure(stage, anim, { yaw: -30, onCue: (c) => { const el = $('#playerCue'); if (el) el.textContent = c; } }) : null;
}

function renderStep() {
  const step = session.steps[session.i];
  const p = $('#player');
  if (step.kind === 'work') {
    const ex = EXERCISES[step.id];
    const isTime = ex.type === 'time';
    p.innerHTML = playerShell(`
      <div class="player-stage" id="playerStage"></div>
      <div class="cue" id="playerCue"></div>
      <h2>${esc(ex.name)}</h2>
      <div class="set-info">Série ${step.set} / ${step.sets}</div>
      ${isTime
        ? `<div class="big-timer" id="bigTimer" style="--p:0"><div><b id="timerNum">${fmtTime(step.target)}</b><small class="muted">objectif ${step.target} s</small></div></div>`
        : `<div class="counter"><button data-adj="-1" aria-label="Moins">−</button><div class="num"><span id="repNum">${step.target}</span><small>${esc(unitOf(ex))}</small></div><button data-adj="1" aria-label="Plus">+</button></div>
           <p class="muted" style="text-align:center;font-size:12px">Ajuste si tu en as fait moins ou plus. Qualité avant quantité !</p>`}
      <details style="margin-top:10px"><summary class="muted" style="cursor:pointer;text-align:center">Rappel des étapes</summary><ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>
      <div class="actions">
        ${isTime ? `<button class="btn block" id="timerBtn">▶ Démarrer</button><button class="btn ghost block" data-done>Série terminée ✓</button>` : `<button class="btn block" data-done>Série terminée ✓</button>`}
      </div>`);
    mountFigure(ex.anim);
    let value = step.target;
    if (isTime) {
      let left = step.target, running = false;
      const btn = $('#timerBtn');
      const update = () => {
        $('#timerNum').textContent = fmtTime(left);
        $('#bigTimer').style.setProperty('--p', Math.round(((step.target - left) / step.target) * 100));
      };
      btn.addEventListener('click', () => {
        running = !running;
        btn.textContent = running ? 'Pause' : '▶ Reprendre';
        if (running) {
          timer = setInterval(() => {
            left--;
            update();
            if (left <= 0) { stopTimer(); vibrate([200, 100, 200]); recordWork(step, step.target); nextStep(); }
          }, 1000);
        } else stopTimer();
      });
      $('[data-done]', p).addEventListener('click', () => { recordWork(step, step.target - left || step.target); nextStep(); });
    } else {
      $$('[data-adj]', p).forEach((b) => b.addEventListener('click', () => {
        value = Math.max(0, Math.min(ex.max + 10, value + Number(b.dataset.adj)));
        $('#repNum').textContent = value;
      }));
      $('[data-done]', p).addEventListener('click', () => { recordWork(step, value); nextStep(); });
    }
  } else if (step.kind === 'rest') {
    const nx = EXERCISES[step.nextId];
    let left = step.secs;
    p.innerHTML = playerShell(`
      <div style="text-align:center;margin-top:20px"><span class="pill">Récupération</span></div>
      <div class="big-timer" id="bigTimer"><div><b id="timerNum">${fmtTime(left)}</b><small class="muted">repos</small></div></div>
      <p style="text-align:center">Respire profondément et bois une gorgée d’eau </p>
      <div class="card" style="margin-top:16px"><div class="card-row"><div><small class="muted">${step.between ? 'Exercice suivant' : 'Série suivante'}</small><h3>${esc(nx.name)}</h3></div></div></div>
      <div class="actions"><button class="btn ghost block" data-skip>Passer le repos ›</button></div>`);
    if (playerFigure) { playerFigure.destroy(); playerFigure = null; }
    timer = setInterval(() => {
      left--;
      $('#timerNum').textContent = fmtTime(Math.max(0, left));
      $('#bigTimer').style.setProperty('--p', Math.round(((step.secs - left) / step.secs) * 100));
      if (left <= 0) { vibrate(150); nextStep(); }
    }, 1000);
    $('[data-skip]', p).addEventListener('click', nextStep);
  } else if (step.kind === 'rate') {
    const ex = EXERCISES[step.id];
    p.innerHTML = playerShell(`
      <div style="margin-top:30px"></div>
      <h2 style="margin-top:8px">${esc(ex.name)} : terminé !</h2>
      <p class="set-info">Comment était ta technique ? (ça aide le coach à suivre tes progrès)</p>
      <div class="rate-grid">
        <button data-rate="40"><span class="meter m1"><i></i><i></i><i></i></span>Difficile à bien faire</button>
        <button data-rate="70"><span class="meter m2"><i></i><i></i><i></i></span>Correcte</button>
        <button data-rate="95"><span class="meter m3"><i></i><i></i><i></i></span>Maîtrisée</button>
      </div>
      <div class="info" style="margin-top:18px">${esc(ex.mistakes[0].label)} ? ${esc(ex.mistakes[0].fix)}</div>`);
    if (playerFigure) { playerFigure.destroy(); playerFigure = null; }
    $$('[data-rate]', p).forEach((b) => b.addEventListener('click', () => { session.ratings[step.id] = Number(b.dataset.rate); nextStep(); }));
  }
}

function recordWork(step, value) {
  (session.results[step.id] = session.results[step.id] || { target: step.target, sets: [] }).sets.push(value);
}

function renderSummary() {
  if (playerFigure) { playerFigure.destroy(); playerFigure = null; }
  const mins = Math.max(1, Math.round((Date.now() - session.start) / 60000));
  const nbEx = Object.keys(session.results).length;
  const nbSets = Object.values(session.results).reduce((a, r) => a + r.sets.length, 0);
  const strength = session.type !== 'M';
  $('#player').innerHTML = playerShell(`
    <div class="celebrate" style="margin-top:20px">Terminé</div>
    <h2>Séance terminée, bravo !</h2>
    <div class="summary-stats">
      <div class="card stat"><b>${mins}</b><span>minutes</span></div>
      <div class="card stat"><b>${nbEx}</b><span>exercices</span></div>
      <div class="card stat"><b>${nbSets}</b><span>séries</span></div>
    </div>
    ${strength ? `<p class="set-info">Comment as-tu trouvé cette séance ?</p>
    <div class="rate-grid" id="diffGrid">
      <button data-diff="easy"><span class="meter m1"><i></i><i></i><i></i></span>Trop facile</button>
      <button data-diff="ok" class="active"><span class="meter m2"><i></i><i></i><i></i></span>Parfaite</button>
      <button data-diff="hard"><span class="meter m3"><i></i><i></i><i></i></span>Trop dure</button>
    </div>` : '<p class="set-info">La mobilité aide tes muscles à récupérer. </p>'}
    <div class="info">Après l’effort : bois de l’eau et prends un repas ou un goûter avec des protéines (ex. yaourt + banane).</div>
    <div class="actions"><button class="btn block" id="saveSession">Enregistrer ma séance ✓</button></div>`);
  let diff = 'ok';
  $$('[data-diff]').forEach((b) => b.addEventListener('click', () => {
    diff = b.dataset.diff;
    $$('[data-diff]').forEach((x) => x.classList.toggle('active', x === b));
  }));
  $('#saveSession').addEventListener('click', () => saveSession(strength ? diff : null, mins));
}

// Enregistre la séance et adapte doucement les objectifs (progression sécurisée).
function saveSession(diff, mins) {
  const s = session;
  const results = Object.entries(s.results).map(([id, r]) => ({ id, target: r.target, sets: r.sets }));
  const messages = [];
  for (const r of results) {
    const ex = EXERCISES[r.id];
    const best = Math.max(...r.sets);
    if (best > (state.best[r.id] || 0)) state.best[r.id] = best;
    if (!RATED(r.id) || s.type === 'M') continue;
    const allDone = r.sets.every((v) => v >= r.target);
    const step = ex.type === 'time' ? 5 : 1;
    let lvl = levelOf(r.id);
    if (diff === 'hard' || !allDone) lvl -= diff === 'hard' ? step : 0;
    else if (!s.light) lvl += diff === 'easy' ? step * 2 : step;
    const floor = Math.max(ex.type === 'time' ? 10 : 2, ex.base - (ex.type === 'time' ? 10 : 3));
    const clamped = Math.max(floor, Math.min(ex.max, lvl));
    if (lvl > ex.max && levelOf(r.id) === ex.max) messages.push(`${ex.name} : niveau max atteint, passe à une variante plus difficile !`);
    state.levels[r.id] = clamped;
  }
  for (const [id, score] of Object.entries(s.ratings)) (state.technique[id] = state.technique[id] || []).push(score);
  state.sessions.push({ date: new Date().toISOString(), workout: s.type, light: s.light, feeling: s.feeling, difficulty: diff, minutes: mins, results });
  state.xp += s.type === 'M' ? 25 : s.light ? 35 : 50;
  if (s.type === 'M' && (s.feeling !== 'great')) state.listenCount++;
  save();
  const fresh = checkBadges();
  closePlayer();
  showView('home');
  const msg = fresh.length ? `Nouveau badge : ${fresh.map((b) => b.name).join(', ')} !` : messages[0] || (diff === 'easy' ? 'Objectifs augmentés pour la prochaine fois !' : diff === 'hard' ? 'Objectifs ajustés : on y va à ton rythme.' : 'Séance enregistrée. Bonne récup !');
  toast(msg);
}

// ---------- Programme ----------
function renderPlan() {
  const el = $('#view-plan');
  const plan = WEEK_PLANS[state.sessionsPerWeek];
  const mon = mondayOf();
  el.innerHTML = `
    <div class="card glow">
      <h2>Ton programme de la semaine</h2>
      <p class="muted" style="font-size:13px;margin-top:4px">Séances courtes (15–20 min), adaptées à ton âge, avec des jours de récupération.</p>
      <p style="margin:14px 0 8px;font-weight:700">Combien de séances par semaine ?</p>
      <div class="seg" role="tablist">
        <button data-spw="2" class="${state.sessionsPerWeek === 2 ? 'active' : ''}">2 séances · idéal pour débuter</button>
        <button data-spw="3" class="${state.sessionsPerWeek === 3 ? 'active' : ''}">3 séances</button>
      </div>
    </div>
    <div style="margin-top:12px">
      ${plan.map((p, i) => {
        const d = new Date(mon); d.setDate(mon.getDate() + i);
        const done = state.sessions.find((s) => dayKey(new Date(s.date)) === dayKey(d));
        const today = dayKey(d) === dayKey();
        const w = WORKOUTS[p];
        const body = w
          ? `<h3>${esc(w.short)}</h3><small>≈ ${estimateMinutes(p)} min${w.light ? ' · facultatif' : ''}</small>
             <details><summary>Voir les exercices</summary>${workoutItems(p).map((it) => `<div>• ${esc(EXERCISES[it.id].name)} — ${it.sets} × ${levelOf(it.id)} ${EXERCISES[it.id].type === 'time' ? 's' : 'rép.'}</div>`).join('')}</details>`
          : `<h3>Repos</h3><small>Les muscles se reconstruisent. Bouge en douceur (marche, vélo, jeux).</small>`;
        return `<div class="card day-card ${today ? 'is-today' : ''}">
          <div class="day-badge">${DAY_NAMES[i].slice(0, 3)}<b>${d.getDate()}</b></div>
          <div class="grow">${body}</div>
          ${done ? '<span class="pill">✓ Fait</span>' : today && w ? `<button class="btn small" data-checkin-plan="${p}">▶</button>` : ''}
        </div>`;
      }).join('')}
    </div>

    <div class="section-title"><h2>Pourquoi la récupération est importante ?</h2></div>
    <div class="card why">
      <h3>Le muscle se renforce au repos</h3>
      <p>Pendant l’effort, les fibres musculaires subissent de toutes petites lésions. Pendant les 24 à 72 h qui suivent, ton corps les répare et les rend un peu plus solides : c’est la <b>surcompensation</b>. Sans repos, il n’a pas le temps de reconstruire.</p>
      <h3>Ton corps grandit</h3>
      <p>À 14 ans, une grande partie de ton énergie sert à ta croissance (os, muscles, organes). Trop d’entraînement peut voler cette énergie et augmenter le risque de blessure, notamment aux zones de croissance.</p>
      <h3>Le sommeil, ton meilleur coach</h3>
      <p>L’hormone de croissance est surtout libérée pendant le sommeil profond. 8 à 10 h par nuit = meilleure récupération et plus de progrès.</p>
      <h3>Les signes qu’il faut plus de repos</h3>
      <p>Fatigue qui ne passe pas, douleurs, sommeil perturbé, baisse de motivation ou de performance. Dans ce cas, le coach te propose une séance allégée ou du repos.</p>
    </div>
  `;
}

// ---------- Nutrition ----------
let foodTab = 'meals';
function renderFood() {
  const el = $('#view-food');
  const tabs = [['meals', 'Repas'], ['proteins', 'Protéines'], ['recipes', 'Recettes halal'], ['water', 'Eau'], ['sleep', 'Sommeil']];
  let content = '';
  if (foodTab === 'meals') {
    content = Object.entries(NUTRITION.meals).map(([k, list]) => `
      <div class="section-title"><h2>${esc(k)}</h2></div>
      ${list.map((m) => `<div class="card meal"><div><b>${esc(m.name)}</b><p class="muted" style="font-size:13px">${esc(m.items)}</p></div></div>`).join('')}`).join('') +
      `<div class="section-title"><h2>Les bases</h2></div><div class="card"><ul class="tips">${NUTRITION.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
  } else if (foodTab === 'proteins') {
    content = `<div class="info">Les protéines aident tes muscles à se réparer. Une portion à chaque repas suffit, sans compléments.</div>
      <div class="grid-2" style="margin-top:12px">${NUTRITION.proteins.map((p) => `<div class="card" style="margin:0"><b style="color:var(--white)">${esc(p.name)}</b><p class="muted" style="font-size:12px">${esc(p.note)}</p></div>`).join('')}</div>`;
  } else if (foodTab === 'recipes') {
    content = NUTRITION.recipes.map((r) => `
      <div class="card recipe" style="margin-top:12px">
        <h3><span>${esc(r.name)}</span><span class="pill">${esc(r.time)}</span></h3>
        <ul>${r.ingredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <details><summary>Voir la préparation</summary><ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>
      </div>`).join('') + '<div class="info">Toutes les recettes sont halal. Vérifie le label halal des viandes achetées.</div>';
  } else if (foodTab === 'water') {
    const n = state.water[dayKey()] || 0;
    content = `<div class="card" style="margin-top:12px;text-align:center">
        <h2>Mes verres d’eau aujourd’hui</h2>
        <div class="glasses">${Array.from({ length: 8 }, (_, i) => `<button class="glass ${i < n ? 'full' : ''}" data-glass="${i + 1}" aria-label="${i + 1} verre(s)"></button>`).join('')}</div>
        <p><b style="font-size:22px;color:var(--white)">${n}</b> / 7 verres ${n >= 7 ? 'Objectif atteint !' : ''}</p>
        <div class="btn-row"><button class="btn ghost small" data-water="-1">− 1 verre</button><button class="btn small" data-water="1">+ 1 verre</button></div>
      </div>
      <div class="card"><ul class="tips">${NUTRITION.hydration.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
  } else {
    content = `<div class="card glow" style="margin-top:12px;text-align:center"><h2>8 à 10 h par nuit</h2><p class="muted">C’est la recommandation pour les 13–18 ans.</p></div>
      <div class="card"><ul class="tips">${NUTRITION.sleep.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
      <div class="card why"><h3>Sommeil et récupération</h3><p>Les jours de repos et les nuits complètes sont aussi importants que les séances. Un muscle fatigué qui ne récupère pas progresse moins et se blesse plus facilement.</p></div>`;
  }
  el.innerHTML = `
    <div class="card glow"><h2>Bien manger, bien récupérer</h2><p class="muted" style="font-size:13px;margin-top:4px">Des idées simples et équilibrées pour grandir et devenir plus fort. Pas de régime, pas de compléments : une alimentation variée suffit.</p></div>
    <div class="seg" style="margin-top:12px">${tabs.map(([k, l]) => `<button data-food="${k}" class="${foodTab === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    ${content}`;
}

// ---------- Progression ----------
function weeklyCounts(n = 8) {
  const out = [];
  const m = mondayOf();
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(m); start.setDate(m.getDate() - i * 7);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    const count = state.sessions.filter((s) => { const d = new Date(s.date); return d >= start && d < end; }).length;
    out.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, count, current: i === 0 });
  }
  return out;
}

function barChartSvg(data) {
  const W = 320, H = 150, padL = 22, padB = 22, padT = 16;
  const max = Math.max(3, ...data.map((d) => d.count));
  const bw = (W - padL) / data.length;
  const y = (v) => H - padB - (v / max) * (H - padB - padT);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Séances par semaine sur les 8 dernières semaines">`;
  for (let v = 0; v <= max; v++) s += `<line class="gridline" x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${padL - 8}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  data.forEach((d, i) => {
    const x = padL + i * bw + bw * 0.22, w = bw * 0.56, top = y(d.count), h = H - padB - top;
    if (d.count > 0) s += `<path class="barmark ${d.current ? '' : 'past'}" d="M${x},${H - padB} V${top + 4} Q${x},${top} ${x + 4},${top} H${x + w - 4} Q${x + w},${top} ${x + w},${top + 4} V${H - padB} Z"/>`;
    if (d.current) s += `<text class="val" x="${x + w / 2}" y="${top - 5}" text-anchor="middle">${d.count}</text>`;
    s += `<text class="axis" x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${d.label}</text>`;
    s += `<rect class="hit" x="${padL + i * bw}" y="0" width="${bw}" height="${H - padB}" data-tip="Semaine du ${d.label} : ${d.count} séance${d.count > 1 ? 's' : ''}"/>`;
  });
  return s + '</svg>';
}

function renderProgress() {
  const el = $('#view-progress');
  const r = rankOf(state.xp);
  const toNext = r.next ? Math.round(((state.xp - r.xp) / (r.next.xp - r.xp)) * 100) : 100;
  const strength = state.sessions.filter(isStrength).length;
  const learnedIds = Object.keys(EXERCISES).filter(isLearned);
  const rated = Object.keys(EXERCISES).filter((id) => (state.technique[id] || []).length);
  const thisWeek = strengthThisWeek();
  el.innerHTML = `
    <div class="card glow">
      <div class="card-row"><div style="flex:1"><small class="muted">Ton rang</small><h2>${esc(r.name)}</h2>
      <div class="xp-bar"><i style="width:${toNext}%"></i></div>
      <small class="muted">${state.xp} XP${r.next ? ` · encore ${r.next.xp - state.xp} XP pour « ${esc(r.next.name)} »` : ' · rang maximum !'}</small></div></div>
      <p class="muted" style="font-size:12px;margin-top:10px">Les XP récompensent l’effort et la régularité : +50 par séance, +100 par badge. Aucun classement, aucune comparaison avec les autres.</p>
    </div>

    <div class="grid-2" style="margin-top:12px">
      <div class="card stat" style="margin:0"><b>${state.sessions.length}</b><span>séances réalisées (${strength} renfo)</span></div>
      <div class="card stat" style="margin:0"><b>${learnedIds.length}</b><span>exercices appris</span></div>
      <div class="card stat" style="margin:0"><b>${weekStreak()}</b><span>semaines régulières d’affilée</span></div>
      <div class="card stat" style="margin:0"><b>${thisWeek}/${state.sessionsPerWeek}</b><span>séances cette semaine</span></div>
    </div>

    <div class="section-title"><h2>Régularité</h2></div>
    <div class="card"><h3>Séances par semaine</h3>${barChartSvg(weeklyCounts())}<div class="chart-tip" id="chartTip">Touche une barre pour voir le détail.</div></div>

    <div class="section-title"><h2>Amélioration de la technique</h2></div>
    <div class="card">
      ${rated.length ? rated.map((id) => {
        const h = state.technique[id];
        const now = techniqueOf(id), first = h[0];
        const diff = now - first;
        return `<div class="tech-row"><div class="top"><b>${esc(EXERCISES[id].name)}</b><span>${now}% ${diff > 0 ? `<span style="color:var(--green)">▲ +${diff}</span>` : ''}</span></div><div class="bar"><i style="width:${now}%"></i></div></div>`;
      }).join('') : '<p class="muted">Termine une séance et évalue ta technique pour voir ta progression ici.</p>'}
      <p class="muted" style="font-size:12px;margin-top:12px">Un exercice est « appris » après 3 séances évaluées. ${learnedIds.length ? 'Appris : ' + learnedIds.map((id) => EXERCISES[id].name).join(', ') + '.' : ''}</p>
    </div>

    <div class="section-title"><h2>Mes objectifs de force</h2></div>
    <div class="card">
      ${state.goals.length ? state.goals.map((g) => {
        const ex = EXERCISES[g.exId];
        const best = state.best[g.exId] || 0;
        const pct = Math.min(100, Math.round((best / g.target) * 100));
        return `<div class="goal ${pct >= 100 ? 'done' : ''}"><div class="grow"><b>${g.target} ${ex.type === 'time' ? 's de' : ex.unit ? esc(ex.unit) + ' —' : ''} ${esc(ex.name.toLowerCase())}</b><div class="bar"><i style="width:${pct}%"></i></div><small class="muted">Record : ${best} ${ex.type === 'time' ? 's' : ''}</small></div><button class="del" data-delgoal="${g.id}" aria-label="Supprimer l’objectif">✕</button></div>`;
      }).join('') : '<p class="muted">Aucun objectif. Ajoutes-en un !</p>'}
      <div class="form-row">
        <select id="goalEx" aria-label="Exercice">${Object.entries(EXERCISES).filter(([id]) => RATED(id)).map(([id, ex]) => `<option value="${id}">${esc(ex.name)}</option>`).join('')}</select>
        <input id="goalTarget" type="number" min="1" max="60" value="10" aria-label="Objectif">
        <button class="btn small" id="addGoal">Ajouter</button>
      </div>
      <p class="muted" style="font-size:12px;margin-top:8px">Les objectifs restent raisonnables : ils sont plafonnés au niveau maximal sûr de chaque exercice.</p>
    </div>

    <div class="section-title"><h2>Badges & récompenses</h2></div>
    <div class="card"><div class="badge-grid">${BADGES.map((b) => `${badgeHtml(b).replace('</div>', '</div>')}`).join('')}</div>
      <p class="muted" style="font-size:12px;margin-top:12px">Touche un badge pour savoir comment le gagner.</p></div>

    <div class="section-title"><h2>Historique</h2></div>
    <div class="card">
      ${state.sessions.length ? `<ul class="history">${[...state.sessions].reverse().slice(0, 12).map((s) => `<li><span>${new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${esc(WORKOUTS[s.workout].short)}${s.light ? ' (allégée)' : ''}</span><span class="muted">${s.minutes} min</span></li>`).join('')}</ul>` : '<p class="muted">Aucune séance pour le moment. Ta première t’attend ! </p>'}
      <button class="btn ghost small" style="margin-top:14px" id="resetData">Réinitialiser mes données</button>
    </div>
  `;
}

const RENDER = { home: renderHome, coach: renderCoach, plan: renderPlan, food: renderFood, progress: renderProgress };

// ---------- Assistant ----------
function assistantContext() {
  const t = todayPlan();
  const today = {
    strength: `Aujourd’hui : **${WORKOUTS[t.type]?.short}** (≈ ${t.type ? estimateMinutes(t.type) : ''} min).`,
    catchup: `Aujourd’hui tu peux rattraper ta séance **${WORKOUTS[t.type]?.short}**.`,
    done: 'Ta séance du jour est déjà faite, bravo ! Place à la récupération.',
    blocked: 'Aujourd’hui : récupération, tes muscles se reconstruisent.',
    rest: 'Aujourd’hui : jour de repos (mobilité douce possible).'
  }[t.kind];
  const progress = state.sessions.length
    ? `Tu as fait ${state.sessions.length} séance(s), appris ${Object.keys(EXERCISES).filter(isLearned).length} exercice(s) et gagné ${Object.keys(state.badges).length} badge(s).`
    : 'Tu n’as pas encore fait de séance : la première est la plus importante !';
  return { today, progress };
}

function formatBot(text) {
  return text.split('\n').map((line) => {
    let h = esc(line).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    h = h.replace(/\[\[ex:([\w-]+)\|(.+?)\]\]/g, '<button class="btn small" data-ex="$1" style="margin-top:4px">▶ $2</button>');
    return `<p>${h}</p>`;
  }).join('');
}

function addMsg(html, who) {
  const log = $('#chatLog');
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerHTML = html;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}

function ask(question) {
  const q = question.trim();
  if (!q) return;
  addMsg(esc(q), 'me');
  const typing = addMsg('ARMUP AI écrit…', 'bot typing');
  setTimeout(() => {
    typing.remove();
    addMsg(formatBot(Assistant.reply(q, assistantContext())), 'bot');
  }, 450);
}

function openChat() {
  $('#chat').hidden = false;
  if (!$('#chatLog').children.length) {
    addMsg(formatBot('Salut ! Je suis ton coach **ARMUP AI**.\nPose-moi tes questions sur les exercices, l’alimentation, le sommeil ou la récupération. Je respecte toujours les règles de sécurité pour les ados.\nJe fonctionne directement sur ton téléphone : gratuit, sans compte, sans envoyer tes messages sur Internet.'), 'bot');
    $('#chatSuggest').innerHTML = Assistant.SUGGESTIONS.map((s) => `<button data-ask="${esc(s)}">${esc(s)}</button>`).join('');
  }
  setTimeout(() => $('#chatInput').focus(), 200);
}

// ---------- Événements (délégation) ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-tip]');
  if (!t) return;
  const d = t.dataset;
  if (d.view) showView(d.view);
  else if (d.go) showView(d.go);
  else if (d.ex) { if (!$('#chat').hidden) $('#chat').hidden = true; openExercise(d.ex); }
  else if (d.start) { closeSheet(); if (d.start === 'M') startSession('M', { feeling: 'great' }); else openCheckin(d.start); }
  else if (d.checkin) openCheckin(d.checkin);
  else if (d.checkinPlan) { const tp = todayPlan(); if (tp.kind === 'strength' || tp.kind === 'catchup') openCheckin(tp.type); else if (d.checkinPlan === 'M') startSession('M', { feeling: 'great' }); else toast('Récupération en cours : séance indisponible pour l’instant.'); }
  else if (d.cal) { calMonth.setMonth(calMonth.getMonth() + Number(d.cal)); $('#calCard').innerHTML = monthHtml(); }
  else if (d.spw) { state.sessionsPerWeek = Number(d.spw); save(); refresh(); toast(`Programme mis à jour : ${d.spw} séances par semaine.`); }
  else if (d.food) { foodTab = d.food; renderFood(); }
  else if (d.glass) { const k = dayKey(); const n = Number(d.glass); state.water[k] = state.water[k] === n ? n - 1 : n; save(); const f = checkBadges(); renderFood(); if (f.length) toast(`Nouveau badge : ${f[0].name}`); }
  else if (d.water) { const k = dayKey(); state.water[k] = Math.max(0, Math.min(12, (state.water[k] || 0) + Number(d.water))); save(); const f = checkBadges(); renderFood(); if (f.length) toast(`Nouveau badge : ${f[0].name}`); }
  else if (d.delgoal) { state.goals = state.goals.filter((g) => g.id !== d.delgoal); save(); renderProgress(); }
  else if (d.tip) $('#chartTip').textContent = d.tip;
  else if (d.ask) ask(d.ask);
  else if ('close' in d) closeSheet();
  else if ('quit' in d) askConfirm('Quitter la séance ?', 'Elle ne sera pas enregistrée.', 'Quitter', closePlayer);
  else if (t.id === 'addGoal') {
    const exId = $('#goalEx').value;
    const ex = EXERCISES[exId];
    let target = Math.round(Number($('#goalTarget').value) || 0);
    if (target < 1) { toast('Choisis un objectif d’au moins 1.'); return; }
    if (target > ex.max) { target = ex.max; toast(`Objectif plafonné à ${ex.max} pour rester en sécurité.`); }
    state.goals.push({ id: 'g' + Date.now(), exId, target });
    save(); checkBadges(); renderProgress();
  } else if (t.id === 'resetData') {
    askConfirm('Effacer toutes tes données ?', 'Tes séances, badges et objectifs seront supprimés définitivement.', 'Tout effacer', () => { state = defaultState(); save(); showView('home'); toast('Données réinitialisées.'); });
  }
});

// Les badges (non boutons) affichent leur condition.
document.addEventListener('click', (e) => {
  const b = e.target.closest('.badge');
  if (b && b.title) toast(b.title);
});

$('#sheetClose').addEventListener('click', closeSheet);
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
$('#aiFab').addEventListener('click', openChat);
$('#chatClose').addEventListener('click', () => { $('#chat').hidden = true; });
$('#chat').addEventListener('click', (e) => { if (e.target.id === 'chat') $('#chat').hidden = true; });
$('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#chatInput'); ask(i.value); i.value = ''; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSheet(); $('#chat').hidden = true; } });

// Rafraîchit l'accueil chaque minute (temps de récupération).
setInterval(() => { if (currentView === 'home' && $('#sheet').hidden && !session) renderRecoveryOnly(); }, 60000);
function renderRecoveryOnly() {
  const rec = recoveryInfo();
  const ring = $('#view-home .ring');
  if (ring) { ring.style.setProperty('--p', rec.pct); $('b', ring).textContent = rec.label; $('small', ring).textContent = rec.pct + '%'; }
}

showView('home');
