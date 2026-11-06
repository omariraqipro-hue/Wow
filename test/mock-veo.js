// Faux serveur imitant l'API Gemini/Veo, UNIQUEMENT pour tester la plomberie du serveur sans clé ni facturation.
// Il ne prouve pas que l'API réelle se comporte ainsi. La "vidéo" est une mire ffmpeg, pas une génération IA.
import http from "node:http";
import fs from "node:fs";
const [,, port, videoFile, logFile] = process.argv;
let polls = 0;
http.createServer((req, res) => {
  const json = (s, o) => { res.writeHead(s, {"content-type":"application/json"}); res.end(JSON.stringify(o)); };
  if (req.headers["x-goog-api-key"] !== "testkey") return json(403, {error:{message:"API key not valid"}});
  if (req.url.startsWith("/v1beta/models?")) return json(200, {models:[
    {name:"models/gemini-2.5-flash", supportedGenerationMethods:["generateContent"]},
    {name:"models/veo-3.1-fast-generate-preview", supportedGenerationMethods:["predictLongRunning"]}]});
  if (req.method === "POST" && req.url.includes(":predictLongRunning")) {
    let b = ""; req.on("data", c => b += c); req.on("end", () => { fs.appendFileSync(logFile, req.url + " " + b + "\n"); json(200, {name:"models/veo-3.1-fast-generate-preview/operations/op1"}); });
    return;
  }
  if (req.url.includes("/operations/op1")) return json(200, ++polls < 2 ? {name:"op1", done:false} : {name:"op1", done:true, response:{generateVideoResponse:{generatedSamples:[{video:{uri:`http://127.0.0.1:${port}/files/v.mp4`}}]}}});
  if (req.url === "/files/v.mp4") { const d = fs.readFileSync(videoFile); res.writeHead(200, {"content-type":"video/mp4"}); return res.end(d); }
  json(404, {error:{message:"not found"}});
}).listen(Number(port), "127.0.0.1");
