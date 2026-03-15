import { Router } from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import { createRequire } from 'module';
import { AssemblyAI } from 'assemblyai';
import { Supadata } from '@supadata/js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const router = Router();

// ── Lazy clients ───────────────────────────────────────────────────────────────

let assemblyai = null;
function getAssemblyAI() {
  if (!assemblyai) assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  return assemblyai;
}

let supadata = null;
function getSupadata() {
  if (!supadata) supadata = new Supadata({ apiKey: process.env.SUPADATA_API_KEY });
  return supadata;
}

// ── Multer setup ───────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) =>
      cb(null, `scriptit-${Date.now()}${path.extname(file.originalname) || '.mp4'}`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// ── Helpers ────────────────────────────────────────────────────────────────────

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

async function transcribeAudioFile(audioPath) {
  const key = process.env.ASSEMBLYAI_API_KEY;
  console.log(`AssemblyAI key in use: ${key ? key.slice(0, 8) + '...' : 'NOT SET'}`);
  const transcript = await getAssemblyAI().transcripts.transcribe({
    audio: audioPath,
    speech_models: ['universal-2'],
  });
  if (transcript.status === 'error') {
    console.error('AssemblyAI transcript error:', transcript.error);
    throw new Error(transcript.error);
  }
  return transcript.text;
}

// ── POST /api/transcribe/url ───────────────────────────────────────────────────

router.post('/transcribe/url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required.' });

  try {
    // Supadata handles YouTube and TikTok natively — no download, no Python
    const result = await getSupadata().transcript({ url, text: true });
    const transcript = typeof result.content === 'string'
      ? result.content
      : result.content.map((s) => s.text).join(' ');
    return res.json({ transcript });
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
    const transcript = await transcribeAudioFile(audioPath);
    res.json({ transcript });
  } catch (err) {
    console.error('File transcription error:', err?.message, err?.status, err?.response?.data);
    res.status(500).json({ error: err.message || 'Transcription failed.' });
  } finally {
    fs.unlink(uploadedPath, () => {});
    fs.unlink(audioPath, () => {});
  }
});

export default router;
