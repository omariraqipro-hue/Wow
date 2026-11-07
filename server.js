'use strict';
// AI VIDEO STUDIO: local production server. No npm dependency (Node >= 18 + FFmpeg).
// Serves the app, proxies Claude, and renders real MP4 files (images, voice, burned subtitles, camera motion or AI video).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const env = process.env;
const PORT = +env.PORT || 3000;
const OUT = path.join(__dirname, 'output');
const FORMATS = { '9:16': [720, 1280], '16:9': [1280, 720], '1:1': [960, 960], '4:3': [960, 720] };
const STYLE_HINT = {
  cartoon3d: '3D cartoon animation style, vivid colors',
  realiste: 'photorealistic, natural lighting',
  anime: 'anime style, detailed illustration',
  cinematique: 'cinematic film still, dramatic lighting',
  storytelling: 'storybook illustration, warm narrative mood'
};
const EDGE_VOICE = { 'fr-FR': 'fr-FR-DeniseNeural', 'en-US': 'en-US-JennyNeural', 'es-ES': 'es-ES-ElviraNeural', 'ar-SA': 'ar-SA-ZariyahNeural' };
const ESPEAK_VOICE = { 'fr-FR': 'fr', 'en-US': 'en-us', 'es-ES': 'es', 'ar-SA': 'ar' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- process helpers ---------- */
function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err = (err + d).slice(-1500); });
    p.on('error', e => reject(new Error(e.code === 'ENOENT' ? `${cmd} introuvable : installez-le` : e.message)));
    p.on('close', c => (c === 0 ? resolve(out) : reject(new Error(`${cmd} a échoué : ${err.trim().split('\n').slice(-3).join(' ')}`))));
  });
}
const tools = { ffmpeg: false, edge: false, espeak: false };
async function detectTools() {
  const t = async (c, a) => { try { await run(c, a); return true; } catch { return false; } };
  tools.ffmpeg = (await t('ffmpeg', ['-version'])) && (await t('ffprobe', ['-version']));
  tools.edge = await t('edge-tts', ['--version']);
  tools.espeak = await t('espeak-ng', ['--version']);
}
async function probeDuration(file) {
  return parseFloat(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));
}

/* ---------- engines ---------- */
async function download(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`téléchargement refusé (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}
async function genPollinations(prompt, w, h, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
  const r = await fetch(url);
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !type.startsWith('image/')) throw new Error(`Pollinations a répondu ${r.status} (quota atteint ou service modifié)`);
  return { buf: Buffer.from(await r.arrayBuffer()), ext: type.includes('png') ? 'png' : 'jpg' };
}
async function genOpenAIImage(prompt, w, h) {
  const size = w === h ? '1024x1024' : h > w ? '1024x1536' : '1536x1024';
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.OPENAI_IMAGE_MODEL || 'gpt-image-1', prompt, size, n: 1 })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.data || !j.data[0]) throw new Error(`OpenAI images ${r.status} : ${(j.error && j.error.message) || 'réponse invalide'}`);
  const d = j.data[0];
  return { buf: d.b64_json ? Buffer.from(d.b64_json, 'base64') : await download(d.url), ext: 'png' };
}
async function ttsEdge(text, lang, base) {
  const file = base + '.mp3';
  await run('edge-tts', ['--voice', EDGE_VOICE[lang] || EDGE_VOICE['en-US'], `--text=${text}`, '--write-media', file]);
  return file;
}
async function ttsEspeak(text, lang, base) {
  const file = base + '.wav';
  await run('espeak-ng', ['-v', ESPEAK_VOICE[lang] || 'en-us', '-s', '150', '-w', file, '--', text]);
  return file;
}
async function ttsOpenAI(text, lang, base) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: env.OPENAI_TTS_VOICE || 'alloy', input: text, response_format: 'mp3' })
  });
  if (!r.ok) throw new Error(`OpenAI voix ${r.status}`);
  const file = base + '.mp3';
  await fs.promises.writeFile(file, Buffer.from(await r.arrayBuffer()));
  return file;
}
// fal.ai image-to-video through its queue API. Needs FAL_KEY and FAL_VIDEO_MODEL (a model id you choose on fal.ai).
// Not tested against the live service from this repository.
async function genFalVideo(imgFile, prompt, outFile) {
  const hdr = { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' };
  const mime = imgFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const image_url = `data:${mime};base64,` + (await fs.promises.readFile(imgFile)).toString('base64');
  const r = await fetch(`https://queue.fal.run/${env.FAL_VIDEO_MODEL}`, { method: 'POST', headers: hdr, body: JSON.stringify({ prompt, image_url }) });
  if (!r.ok) throw new Error(`fal.ai a répondu ${r.status}`);
  const q = await r.json();
  for (let i = 0; ; i++) {
    if (i >= 120) throw new Error('fal.ai : délai dépassé');
    await sleep(5000);
    const s = await (await fetch(q.status_url, { headers: hdr })).json();
    if (s.status === 'COMPLETED') break;
    if (s.status === 'FAILED') throw new Error('fal.ai : la génération a échoué');
  }
  const res = await (await fetch(q.response_url, { headers: hdr })).json();
  if (!res.video || !res.video.url) throw new Error('fal.ai : aucune vidéo dans la réponse');
  await fs.promises.writeFile(outFile, await download(res.video.url));
}

const ENGINES = {
  image: {
    pollinations: { label: 'Pollinations (gratuit, sans clé, service tiers à quota)', free: true, ok: () => true, gen: genPollinations },
    openai: { label: 'OpenAI gpt-image-1 (payant, clé OPENAI_API_KEY)', free: false, ok: () => !!env.OPENAI_API_KEY, gen: genOpenAIImage }
  },
  video: {
    kenburns: { label: 'Mouvement de caméra FFmpeg (gratuit, pas de vidéo générative)', free: true, ok: () => tools.ffmpeg },
    fal: { label: 'fal.ai image vers vidéo IA (payant, clé FAL_KEY + FAL_VIDEO_MODEL)', free: false, ok: () => !!env.FAL_KEY && !!env.FAL_VIDEO_MODEL, gen: genFalVideo }
  },
  voice: {
    edge: { label: 'Microsoft Edge TTS via edge-tts (gratuit, non officiel)', free: true, ok: () => tools.edge, gen: ttsEdge },
    espeak: { label: 'eSpeak NG (gratuit, hors ligne, voix robotique)', free: true, ok: () => tools.espeak, gen: ttsEspeak },
    openai: { label: 'OpenAI synthèse vocale (payant, clé OPENAI_API_KEY)', free: false, ok: () => !!env.OPENAI_API_KEY, gen: ttsOpenAI }
  }
};
const musicOk = () => !!env.MUSIC_FILE && fs.existsSync(env.MUSIC_FILE);

/* ---------- subtitles (ASS, word-by-word highlight) ---------- */
const assTime = s => {
  const cs = Math.round(s * 100), h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, sec = Math.floor(cs / 100) % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};
// Scene timing comes from the real audio length; word timing inside a scene is proportional to word length.
function buildAss(narration, dur, W, H) {
  const words = narration.replace(/[{}\\]/g, '').split(/\s+/).filter(Boolean);
  const total = words.reduce((a, w) => a + w.length + 1, 0) || 1;
  let t = 0;
  const timed = words.map(w => { const d = dur * (w.length + 1) / total; const o = { w, s: t, d }; t += d; return o; });
  const chunks = [];
  let cur = [];
  for (const o of timed) {
    cur.push(o);
    if (cur.length >= 4 || /[.!?;:,،]$/.test(o.w)) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  const fs_ = Math.round(Math.min(W, H) * 0.062), mv = Math.round(H * 0.12), mh = Math.round(W * 0.06);
  const lines = chunks.map(c => {
    const start = c[0].s, end = c[c.length - 1].s + c[c.length - 1].d;
    return `Dialogue: 0,${assTime(start)},${assTime(end)},Default,,,${c.map(o => `{\\k${Math.max(1, Math.round(o.d * 100))}}${o.w}`).join(' ')}`;
  });
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,Sans,${fs_},&H00FA8BA7,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,${mh},${mh},${mv},1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,Effect,Text\n${lines.join('\n')}\n`;
}

/* ---------- FFmpeg assembly ---------- */
async function buildClip(dir, i, { W, H, dur, image, aiVideo, audio }) {
  const N = Math.round(dur * 30);
  const zoom = i % 2 ? `1.15-0.15*on/${N}` : `1+0.15*on/${N}`;
  const subs = `subtitles=s${i}.ass`;
  const vIn = aiVideo ? ['-i', aiVideo] : ['-i', image];
  const vf = aiVideo
    ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,tpad=stop_mode=clone:stop_duration=${Math.ceil(dur)},setsar=1,${subs}`
    : `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${N}:s=${W}x${H}:fps=30,setsar=1,${subs}`;
  const aIn = audio ? ['-i', audio] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo'];
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...vIn, ...aIn, '-map', '0:v:0', '-map', '1:a:0', '-vf', vf, '-af', 'apad',
    '-t', String(dur), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', `clip${i}.mp4`], dir);
}
async function concatClips(dir, n, music) {
  await fs.promises.writeFile(path.join(dir, 'list.txt'), Array.from({ length: n }, (_, i) => `file 'clip${i}.mp4'`).join('\n'));
  const target = music ? 'joined.mp4' : 'video.mp4';
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', '-movflags', '+faststart', target], dir);
  if (music) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'joined.mp4', '-stream_loop', '-1', '-i', music,
      '-filter_complex', '[1:a]volume=0.15[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]',
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'video.mp4'], dir);
  }
}

/* ---------- production job ---------- */
const jobs = new Map();
function newJob(project, opt) {
  const id = crypto.randomBytes(6).toString('hex');
  const steps = ['image', 'voice', 'subs', 'video', 'music', 'render'].map(k => ({ k, st: 'todo', detail: '' }));
  const job = { id, dir: path.join(OUT, id), project, opt, steps, scenes: project.scenes.map(() => ({})), status: 'running', error: '', mp4: '',
    set(k, st, detail) { const s = steps.find(x => x.k === k); s.st = st; if (detail !== undefined) s.detail = detail; } };
  jobs.set(id, job);
  return job;
}

// impl = { image(prompt,w,h,seed), tts(text,lang,base) -> file, video(imgFile,prompt,outFile) | null, music: path | null, labels }
async function produce(job, impl) {
  const { project: p } = job, [W, H] = FORMATS[p.format], dir = job.dir, n = p.scenes.length;
  let running = 'image';
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    const durs = p.scenes.map(s => s.seconds), audio = [], images = [];
    job.set('image', 'run', `0/${n}`);
    for (let i = 0; i < n; i++) {
      const { buf, ext } = await impl.image(`${p.scenes[i].visual}, ${STYLE_HINT[p.style] || ''}, no text, no watermark`, W, H, i);
      images[i] = `img-${i}.${ext}`;
      await fs.promises.writeFile(path.join(dir, images[i]), buf);
      job.scenes[i].image = `/files/${job.id}/${images[i]}`;
      job.set('image', 'run', `${i + 1}/${n}`);
    }
    job.set('image', 'ok', `${n} images`);

    running = 'voice';
    if (impl.tts) {
      job.set('voice', 'run', `0/${n}`);
      for (let i = 0; i < n; i++) {
        audio[i] = await impl.tts(p.scenes[i].narration, p.lang, path.join(dir, `voice-${i}`));
        durs[i] = Math.max(2, (await probeDuration(audio[i])) + 0.5);
        job.set('voice', 'run', `${i + 1}/${n}`);
      }
      job.set('voice', 'ok', 'durées réelles de l\'audio');
    } else job.set('voice', 'skip', 'Voix off désactivée');

    running = 'subs';
    job.set('subs', 'run');
    for (let i = 0; i < n; i++) await fs.promises.writeFile(path.join(dir, `s${i}.ass`), buildAss(p.scenes[i].narration, durs[i], W, H));
    job.set('subs', 'ok', 'incrustés mot à mot');

    running = 'video';
    job.set('video', 'run', `0/${n}`);
    for (let i = 0; i < n; i++) {
      let aiVideo = null;
      if (impl.video) { aiVideo = path.join(dir, `ai-${i}.mp4`); await impl.video(path.join(dir, images[i]), p.scenes[i].visual, aiVideo); }
      await buildClip(dir, i, { W, H, dur: durs[i], image: path.join(dir, images[i]), aiVideo, audio: audio[i] || null });
      job.set('video', 'run', `${i + 1}/${n}`);
    }
    job.set('video', 'ok', impl.video ? 'animées par IA' : 'mouvement de caméra');

    running = 'music';
    if (job.opt.music && !impl.music) job.set('music', 'no', 'MUSIC_FILE non défini côté serveur');
    else if (impl.music) job.set('music', 'run'); else job.set('music', 'skip', 'Désactivée');

    running = 'render';
    job.set('render', 'run');
    await concatClips(dir, n, impl.music);
    if (impl.music) job.set('music', 'ok', 'mixée à bas volume');
    job.set('render', 'ok', 'MP4 H.264 + AAC');
    job.mp4 = `/files/${job.id}/video.mp4`;
    job.status = 'done';
  } catch (e) {
    const msg = e.message === 'fetch failed' ? `réseau indisponible ou hôte bloqué (${(e.cause && e.cause.code) || 'fetch'})` : e.message;
    job.set(running, 'err', msg);
    job.error = msg;
    job.status = 'error';
  }
}

/* ---------- HTTP ---------- */
function validate(body) {
  const p = body && body.project, o = (body && body.opt) || {};
  if (!p || !FORMATS[p.format] || !Array.isArray(p.scenes) || !p.scenes.length || p.scenes.length > 40) return 'Projet invalide';
  const scenes = [];
  for (const s of p.scenes) {
    if (typeof s.narration !== 'string' || typeof s.visual !== 'string' || !s.visual.trim() || s.narration.length > 1500 || s.visual.length > 1500) return 'Scène invalide';
    scenes.push({ narration: s.narration.trim(), visual: s.visual.trim(), seconds: Math.min(30, Math.max(2, Math.round(+s.seconds) || 5)) });
  }
  const eng = (kind, id) => (ENGINES[kind][id] && ENGINES[kind][id].ok() ? ENGINES[kind][id] : null);
  const image = eng('image', o.image), video = eng('video', o.video), voice = eng('voice', o.voice);
  if (!tools.ffmpeg) return 'FFmpeg est introuvable sur le serveur';
  if (!image) return 'Moteur d\'images indisponible';
  if (!video) return 'Moteur d\'animation indisponible';
  if (o.voiceOn && !voice) return 'Moteur vocal indisponible : installez edge-tts ou espeak-ng, définissez OPENAI_API_KEY, ou désactivez la voix off';
  return { project: { style: String(p.style), format: p.format, lang: EDGE_VOICE[p.lang] ? p.lang : 'fr-FR', scenes }, opt: { music: !!o.music, voiceOn: !!o.voiceOn }, image, video, voice };
}
function readBody(req, limit = 300000) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > limit) { reject(new Error('Requête trop grande')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { reject(new Error('JSON invalide')); } });
  });
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
function serveFile(req, res, file, type) {
  fs.stat(file, (err, st) => {
    if (err) return send(res, 404, { error: 'Introuvable' });
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    let s = 0, e = st.size - 1, code = 200;
    if (m) { if (m[1]) s = +m[1]; if (m[2]) e = +m[2]; if (!m[1] && m[2]) { s = st.size - +m[2]; e = st.size - 1; } code = 206; }
    if (s > e || e >= st.size) { res.writeHead(416); return res.end(); }
    const h = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 };
    if (code === 206) h['Content-Range'] = `bytes ${s}-${e}/${st.size}`;
    res.writeHead(code, h);
    fs.createReadStream(file, { start: s, end: e }).pipe(res);
  });
}
const publicJob = j => ({ status: j.status, error: j.error, mp4: j.mp4, steps: j.steps, scenes: j.scenes });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return serveFile(req, res, path.join(__dirname, 'ai-video-studio.html'), 'text/html; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const list = kind => Object.entries(ENGINES[kind]).map(([id, e]) => ({ id, label: e.label, free: e.free, available: !!e.ok() }));
      return send(res, 200, { server: true, ffmpeg: tools.ffmpeg, claude: !!env.ANTHROPIC_API_KEY, music: musicOk(), engines: { image: list('image'), video: list('video'), voice: list('voice') } });
    }
    if (req.method === 'POST' && url.pathname === '/api/claude') {
      if (!env.ANTHROPIC_API_KEY) return send(res, 400, { error: 'ANTHROPIC_API_KEY non défini sur le serveur' });
      const { prompt } = await readBody(req);
      if (typeof prompt !== 'string' || !prompt || prompt.length > 8000) return send(res, 400, { error: 'Prompt invalide' });
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return send(res, 502, { error: `Claude ${r.status} : ${(j.error && j.error.message) || 'erreur'}` });
      return send(res, 200, { text: (j.content || []).map(c => c.text || '').join('') });
    }
    if (req.method === 'POST' && url.pathname === '/api/render') {
      if ([...jobs.values()].some(j => j.status === 'running')) return send(res, 409, { error: 'Une production est déjà en cours' });
      const v = validate(await readBody(req));
      if (typeof v === 'string') return send(res, 400, { error: v });
      const job = newJob(v.project, v.opt);
      const impl = {
        image: (prompt, w, h, seed) => v.image.gen(prompt, w, h, seed),
        tts: v.opt.voiceOn ? (text, lang, base) => v.voice.gen(text, lang, base) : null,
        video: v.video.gen || null,
        music: v.opt.music && musicOk() ? env.MUSIC_FILE : null
      };
      produce(job, impl);
      return send(res, 202, { jobId: job.id });
    }
    let m = /^\/api\/jobs\/([a-f0-9]{12})$/.exec(url.pathname);
    if (req.method === 'GET' && m) return jobs.has(m[1]) ? send(res, 200, publicJob(jobs.get(m[1]))) : send(res, 404, { error: 'Production inconnue' });
    m = /^\/files\/([a-f0-9]{12})\/(img-\d+\.(?:png|jpg)|video\.mp4)$/.exec(url.pathname);
    if (req.method === 'GET' && m) return serveFile(req, res, path.join(OUT, m[1], m[2]), m[2].endsWith('mp4') ? 'video/mp4' : m[2].endsWith('png') ? 'image/png' : 'image/jpeg');
    send(res, 404, { error: 'Introuvable' });
  } catch (e) { send(res, 500, { error: e.message }); }
});

module.exports = { buildAss, buildClip, concatClips, produce, newJob, probeDuration, FORMATS };
if (require.main === module) {
  detectTools().then(() => server.listen(PORT, '0.0.0.0', () => {
    console.log(`AI VIDEO STUDIO : http://localhost:${PORT}  (sur la tablette : http://<IP de ce PC>:${PORT})`);
    console.log(`FFmpeg ${tools.ffmpeg ? 'OK' : 'ABSENT'} · edge-tts ${tools.edge ? 'OK' : 'absent'} · espeak-ng ${tools.espeak ? 'OK' : 'absent'}`);
  }));
}
