'use strict';
// Tests the real FFmpeg assembly with locally generated images and audio (no network, no AI engine).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { produce, newJob, buildAss } = require('../server.js');

const ff = (...a) => spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { encoding: 'utf8' });

test('buildAss highlights words with timings that fill the scene', () => {
  const ass = buildAss('Un petit robot trouve une graine.', 4, 720, 1280);
  assert.match(ass, /\{\\k\d+\}Un/);
  const total = [...ass.matchAll(/\\k(\d+)/g)].reduce((a, m) => a + +m[1], 0);
  assert.ok(Math.abs(total - 400) <= 8, `total centisecondes ${total}`);
});

test('produce renders a real H.264/AAC MP4 with subtitles and motion', async () => {
  const job = newJob({ style: 'anime', format: '16:9', lang: 'fr-FR', scenes: [
    { narration: 'Premiere scene du test video.', visual: 'a', seconds: 3 },
    { narration: 'Deuxieme scene avec un autre plan.', visual: 'b', seconds: 3 }] }, { music: false, voiceOn: true });
  job.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-'));
  const impl = {
    image: async (prompt, w, h, i) => {
      const f = path.join(os.tmpdir(), `t-${i}.png`);
      ff('-f', 'lavfi', '-i', `testsrc2=s=${w}x${h}:d=1`, '-frames:v', '1', f);
      return { buf: fs.readFileSync(f), ext: 'png' };
    },
    tts: async (text, lang, base) => { ff('-f', 'lavfi', '-i', 'sine=frequency=300:duration=2.2', base + '.wav'); return base + '.wav'; },
    video: null, music: null
  };
  await produce(job, impl);
  assert.strictEqual(job.status, 'done', job.error);
  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(job.dir, 'video.mp4')], { encoding: 'utf8' }).stdout);
  const codecs = probe.streams.map(s => s.codec_name).sort();
  assert.deepStrictEqual(codecs, ['aac', 'h264']);
  assert.ok(+probe.format.duration > 4.5 && +probe.format.duration < 6, `durée ${probe.format.duration}`);
  const v = probe.streams.find(s => s.codec_name === 'h264');
  assert.strictEqual(v.width, 1280);
  // frames differ over time: not a still image
  const a = path.join(job.dir, 'f1.png'), b = path.join(job.dir, 'f2.png');
  ff('-ss', '0.3', '-i', path.join(job.dir, 'video.mp4'), '-frames:v', '1', a);
  ff('-ss', '2.4', '-i', path.join(job.dir, 'video.mp4'), '-frames:v', '1', b);
  assert.notDeepStrictEqual(fs.readFileSync(a), fs.readFileSync(b));
});
