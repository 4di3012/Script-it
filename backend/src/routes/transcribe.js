import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import { createRequire } from 'module';
import { AssemblyAI } from 'assemblyai';
import youtubeDl from 'youtube-dl-exec';
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

async function transcribeAudioFile(audioPath) {
  const transcript = await getAssemblyAI().transcripts.transcribe({
    audio: audioPath,
    speech_models: ['universal-2'],
  });
  if (transcript.status === 'error') throw new Error(transcript.error);
  return transcript.text;
}

// ── POST /api/transcribe/url ───────────────────────────────────────────────────
// Download audio via youtube-dl-exec (handles TikTok, YouTube, etc.)
// then send the audio file to AssemblyAI for transcription.
router.post('/transcribe/url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required.' });

  const audioPath = path.join(os.tmpdir(), `scriptit-url-${Date.now()}.mp3`);

  try {
    await youtubeDl(url, {
      noPlaylist: true,
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: audioPath,
      ffmpegLocation: path.dirname(ffmpegPath),
    });

    const transcript = await transcribeAudioFile(audioPath);
    res.json({ transcript });
  } catch (err) {
    console.error('URL transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed.' });
  } finally {
    fs.unlink(audioPath, () => {});
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
    console.error('File transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed.' });
  } finally {
    fs.unlink(uploadedPath, () => {});
    fs.unlink(audioPath, () => {});
  }
});

export default router;
