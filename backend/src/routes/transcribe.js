import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import { createRequire } from 'module';
import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const router = Router();

// Lazy: AssemblyAI client is created on first request so dotenv has run by then
let assemblyai = null;
function getAssemblyAI() {
  if (!assemblyai) assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  return assemblyai;
}

// Multer: disk storage so large video files don't blow up memory
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) =>
      cb(null, `scriptit-${Date.now()}${path.extname(file.originalname) || '.mp4'}`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// ── Shared helpers ─────────────────────────────────────────────────────────────

function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', resolve)
      .on('error', (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
      .run();
  });
}

// ── POST /api/transcribe/url ───────────────────────────────────────────────────
// Pass the URL directly to AssemblyAI — no yt-dlp or local download needed.
router.post('/transcribe/url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required.' });

  try {
    const transcript = await getAssemblyAI().transcripts.transcribe({
      audio_url: url,
      speech_model: 'universal',
    });
    if (transcript.status === 'error') throw new Error(transcript.error);
    res.json({ transcript: transcript.text });
  } catch (err) {
    console.error('URL transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed.' });
  }
});

// ── POST /api/transcribe/file ──────────────────────────────────────────────────
router.post('/transcribe/file', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const uploadedPath = req.file.path;
  const audioPath = uploadedPath + '.mp3';

  try {
    await extractAudio(uploadedPath, audioPath);
    const transcript = await getAssemblyAI().transcripts.transcribe({
      audio: audioPath,
      speech_model: 'universal',
    });
    if (transcript.status === 'error') throw new Error(transcript.error);
    res.json({ transcript: transcript.text });
  } catch (err) {
    console.error('File transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed.' });
  } finally {
    fs.unlink(uploadedPath, () => {});
    fs.unlink(audioPath, () => {});
  }
});

export default router;
