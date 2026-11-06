// Serveur Studio Vidéo Ciné : garde la clé API secrète, appelle l'API Gemini (Veo), stocke les MP4.
// Aucune dépendance : Node 18+ (fetch intégré).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "..", "public");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "..", "data"));
const VIDEO_DIR = path.join(DATA_DIR, "videos");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const API_KEY = process.env.GEMINI_API_KEY || "";
const BASE = (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const PORT = Number(process.env.PORT) || 3000;
const APP_TOKEN = process.env.APP_TOKEN || crypto.randomBytes(9).toString("base64url");
const TOKEN_IS_GENERATED = !process.env.APP_TOKEN;
const MAX_BODY = 12 * 1024 * 1024;
const POLL_MS = Number(process.env.POLL_MS) || 8000;

fs.mkdirSync(VIDEO_DIR, { recursive: true });

/* ---------- Capacités et tarifs des modèles Veo ----------
   ATTENTION : valeurs indicatives écrites sans accès à la documentation en ligne.
   Vérifiez-les sur la doc et la grille tarifaire Google. L'API reste juge : si un paramètre est refusé,
   son message d'erreur est renvoyé tel quel. Tarifs en dollars par seconde de vidéo, surchargeables via MODEL_PRICES. */
const CAPS = [
  { re: /veo-3\.1.*fast/, label: "Veo 3.1 Fast", price: 0.15, ratios: ["16:9", "9:16"], resolutions: ["720p", "1080p"], durations: [4, 6, 8], audio: true },
  { re: /veo-3\.1/,       label: "Veo 3.1",      price: 0.40, ratios: ["16:9", "9:16"], resolutions: ["720p", "1080p"], durations: [4, 6, 8], audio: true },
  { re: /veo-3.*fast/,    label: "Veo 3 Fast",   price: 0.15, ratios: ["16:9"],         resolutions: ["720p", "1080p"], durations: [8],       audio: true },
  { re: /veo-3/,          label: "Veo 3",        price: 0.40, ratios: ["16:9"],         resolutions: ["720p", "1080p"], durations: [8],       audio: true },
  { re: /veo-2/,          label: "Veo 2",        price: 0.35, ratios: ["16:9", "9:16"], resolutions: ["720p"],          durations: [5, 6, 8], audio: false }
];
const UNKNOWN_CAPS = { label: null, price: null, ratios: ["16:9"], resolutions: ["720p"], durations: [8], audio: false };
let priceOverrides = {};
try { priceOverrides = JSON.parse(process.env.MODEL_PRICES || "{}"); } catch { console.warn("MODEL_PRICES invalide (JSON attendu), ignoré."); }

function describeModel(id) {
  const c = CAPS.find(x => x.re.test(id)) || UNKNOWN_CAPS;
  const price = priceOverrides[id] ?? c.price;
  return { id, label: c.label || id, ratios: c.ratios, resolutions: c.resolutions, durations: c.durations, audio: c.audio, pricePerSecond: price };
}

/* ---------- Appels à l'API Gemini ---------- */
async function gemini(pathOrUrl, init = {}) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}/${pathOrUrl.replace(/^\//, "")}`;
  const res = await fetch(url, { ...init, headers: { "x-goog-api-key": API_KEY, ...(init.headers || {}) } });
  return res;
}
async function geminiJson(p, init) {
  const res = await gemini(p, init);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = null; }
  if (!res.ok) throw new Error(`API Gemini ${res.status} : ${body?.error?.message || text.slice(0, 300)}`);
  return body;
}

let modelsCache = { at: 0, models: [], error: null };
async function listVeoModels() {
  if (!API_KEY) return { models: [], error: "Aucune clé GEMINI_API_KEY n'est configurée sur le serveur." };
  if (Date.now() - modelsCache.at < 5 * 60 * 1000) return modelsCache;
  try {
    const data = await geminiJson("models?pageSize=200");
    const models = (data.models || [])
      .filter(m => /veo/i.test(m.name) && (m.supportedGenerationMethods || []).includes("predictLongRunning"))
      .map(m => describeModel(m.name.replace(/^models\//, "")));
    modelsCache = { at: Date.now(), models, error: models.length ? null : "Votre clé n'a accès à aucun modèle Veo (la génération vidéo est payante : vérifiez la facturation du projet Google)." };
  } catch (e) {
    modelsCache = { at: 0, models: [], error: e.message };
  }
  return modelsCache;
}

/* ---------- Jobs (bibliothèque) ---------- */
let jobs = [];
try { jobs = JSON.parse(fs.readFileSync(JOBS_FILE, "utf8")); } catch { jobs = []; }
const saveJobs = () => fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 1));
const publicJob = ({ operation, ...j }) => j;

function costOf(model, seconds) {
  return model.pricePerSecond == null ? null : Math.round(model.pricePerSecond * seconds * 100) / 100;
}

async function startJob(body) {
  const { models, error } = await listVeoModels();
  if (error) throw httpError(503, error);
  const model = models.find(m => m.id === body.modelId);
  if (!model) throw httpError(400, "Modèle inconnu ou indisponible pour votre clé.");
  const prompt = String(body.prompt || "").trim();
  if (!prompt) throw httpError(400, "La description est vide.");
  if (prompt.length > 4000) throw httpError(400, "Description trop longue (4000 caractères maximum).");
  if (!model.ratios.includes(body.aspectRatio)) throw httpError(400, `Ratio ${body.aspectRatio} non pris en charge par ${model.label}.`);
  if (!model.resolutions.includes(body.resolution)) throw httpError(400, `Résolution ${body.resolution} non prise en charge par ${model.label}.`);
  if (!model.durations.includes(body.durationSeconds)) throw httpError(400, `Durée ${body.durationSeconds}s non prise en charge par ${model.label}.`);
  const cost = costOf(model, body.durationSeconds);
  if (cost == null) throw httpError(400, `Tarif inconnu pour ${model.id} : définissez MODEL_PRICES pour pouvoir générer.`);
  if (Math.abs(Number(body.confirmedCostUsd) - cost) > 0.005) throw httpError(409, `Le coût a changé (${cost} $). Confirmez de nouveau.`);

  const instance = { prompt };
  if (body.image) {
    if (!/^image\/(png|jpeg|webp)$/.test(body.image.mimeType) || typeof body.image.data !== "string") throw httpError(400, "Image invalide (PNG, JPEG ou WebP).");
    instance.image = { bytesBase64Encoded: body.image.data, mimeType: body.image.mimeType };
  }
  const op = await geminiJson(`models/${model.id}:predictLongRunning`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instances: [instance], parameters: { aspectRatio: body.aspectRatio, resolution: body.resolution, durationSeconds: body.durationSeconds } })
  });
  if (!op?.name) throw httpError(502, "Réponse inattendue du moteur (pas d'identifiant d'opération).");
  const job = {
    id: crypto.randomUUID(), operation: op.name, status: "running", createdAt: Date.now(),
    prompt, kind: String(body.kind || "").slice(0, 60), modelId: model.id, modelLabel: model.label,
    aspectRatio: body.aspectRatio, requestedRatio: String(body.requestedRatio || body.aspectRatio).slice(0, 20),
    resolution: body.resolution, durationSeconds: body.durationSeconds, costUsd: cost, fromImage: Boolean(body.image)
  };
  jobs.unshift(job); saveJobs();
  return publicJob(job);
}

let polling = false;
async function pollJobs() {
  if (polling || !API_KEY) return;
  polling = true;
  try {
    for (const job of jobs.filter(j => j.status === "running")) {
      try {
        const op = await geminiJson(job.operation);
        if (!op.done) continue;
        if (op.error) { fail(job, op.error.message || "Erreur du moteur."); continue; }
        const resp = op.response?.generateVideoResponse || op.response || {};
        const uri = resp.generatedSamples?.[0]?.video?.uri;
        if (!uri) { fail(job, resp.raiMediaFilteredReasons?.join(" ") || "Le moteur n'a renvoyé aucune vidéo (contenu probablement filtré)."); continue; }
        const res = await gemini(uri);
        if (!res.ok) { fail(job, `Téléchargement de la vidéo impossible (${res.status}).`); continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1000) { fail(job, "Fichier vidéo vide reçu du moteur."); continue; }
        fs.writeFileSync(path.join(VIDEO_DIR, `${job.id}.mp4`), buf);
        job.status = "done"; job.bytes = buf.length; job.finishedAt = Date.now(); saveJobs();
      } catch (e) {
        // erreur réseau temporaire : on réessaie au prochain passage, sauf au-delà de 30 minutes
        if (Date.now() - job.createdAt > 30 * 60 * 1000) fail(job, `Abandon après 30 min : ${e.message}`);
      }
    }
  } finally { polling = false; }
}
function fail(job, message) { job.status = "failed"; job.error = message; job.finishedAt = Date.now(); saveJobs(); }
setInterval(pollJobs, POLL_MS);

/* ---------- HTTP ---------- */
function httpError(status, message) { return Object.assign(new Error(message), { status }); }
const send = (res, status, obj) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(obj)); };

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > MAX_BODY) { reject(httpError(413, "Requête trop volumineuse (12 Mo max).")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); } catch { reject(httpError(400, "JSON invalide.")); } });
    req.on("error", reject);
  });
}

function authorized(req, url) {
  const given = (req.headers.authorization || "").replace(/^Bearer /, "") || url.searchParams.get("token") || "";
  const a = Buffer.from(given), b = Buffer.from(APP_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
function serveStatic(res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end("Introuvable"); }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

function serveVideo(req, res, job) {
  const file = path.join(VIDEO_DIR, `${job.id}.mp4`);
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(file).size, range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  const headers = { "content-type": "video/mp4", "accept-ranges": "bytes", "content-disposition": `inline; filename="video-${job.id.slice(0, 8)}.mp4"` };
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start); end = Math.min(end, size - 1);
    if (start > end) { res.writeHead(416, { "content-range": `bytes */${size}` }); return res.end(); }
    res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, "content-length": size });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (!url.pathname.startsWith("/api/")) return serveStatic(res, decodeURIComponent(url.pathname));
    if (!authorized(req, url)) return send(res, 401, { error: "Code d'accès requis." });

    if (url.pathname === "/api/config" && req.method === "GET") {
      const { models, error } = await listVeoModels();
      return send(res, 200, { connected: models.length > 0, problem: error, models });
    }
    if (url.pathname === "/api/generate" && req.method === "POST") return send(res, 201, await startJob(await readJson(req)));
    if (url.pathname === "/api/jobs" && req.method === "GET") return send(res, 200, jobs.map(publicJob));

    const m = /^\/api\/(jobs|videos)\/([\w-]+?)(?:\.mp4)?$/.exec(url.pathname);
    if (m) {
      const job = jobs.find(j => j.id === m[2]);
      if (!job) return send(res, 404, { error: "Projet introuvable." });
      if (m[1] === "videos" && req.method === "GET") return job.status === "done" ? serveVideo(req, res, job) : send(res, 404, { error: "Vidéo non disponible." });
      if (m[1] === "jobs" && req.method === "GET") return send(res, 200, publicJob(job));
      if (m[1] === "jobs" && req.method === "DELETE") {
        fs.rmSync(path.join(VIDEO_DIR, `${job.id}.mp4`), { force: true });
        jobs = jobs.filter(j => j !== job); saveJobs();
        return send(res, 200, { ok: true });
      }
    }
    send(res, 404, { error: "Route inconnue." });
  } catch (e) {
    send(res, e.status || 500, { error: e.message || "Erreur serveur." });
  }
});

server.listen(PORT, () => {
  console.log(`Studio Vidéo Ciné sur http://localhost:${PORT}`);
  console.log(API_KEY ? `Moteur : API Gemini (${BASE})` : "Moteur NON connecté : définissez GEMINI_API_KEY.");
  if (TOKEN_IS_GENERATED) console.log(`Code d'accès généré (définissez APP_TOKEN pour le fixer) : ${APP_TOKEN}`);
  pollJobs();
});
