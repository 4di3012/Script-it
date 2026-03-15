import { Router } from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// CJS packages need createRequire in an ESM context
const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static');      // returns the .exe path on Windows
const YTDlpWrap = require('yt-dlp-wrap').default;

ffmpeg.setFfmpegPath(ffmpegPath);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_EXT = process.platform === 'win32' ? '.exe' : '';
const BIN_PATH = path.join(__dirname, '../../bin', `yt-dlp${BIN_EXT}`);

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

// ── Lazy-load yt-dlp, downloading the binary on first use ─────────────────────
let ytDlp = null;

async function getYtDlp() {
  if (ytDlp) return ytDlp;

  if (!fs.existsSync(BIN_PATH)) {
    console.log('Downloading yt-dlp binary (first run only)…');
    await YTDlpWrap.downloadFromGithub(BIN_PATH);
    console.log('yt-dlp ready.');
  }

  ytDlp = new YTDlpWrap(BIN_PATH);
  return ytDlp;
}

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

async function transcribeWithAssemblyAI(audioPath) {
  const transcript = await getAssemblyAI().transcripts.transcribe({
    audio: audioPath,
    speech_models: ['universal'],
  });
  if (transcript.status === 'error') throw new Error(transcript.error);
  return transcript.text;
}

// ── POST /api/transcribe/url ───────────────────────────────────────────────────
router.post('/transcribe/url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required.' });

  const audioPath = path.join(os.tmpdir(), `scriptit-url-${Date.now()}.mp3`);

  try {
    const yt = await getYtDlp();

    // Download audio-only and convert to mp3 using bundled ffmpeg
    await yt.execPromise([
      url,
      '--no-playlist',
      '-x', '--audio-format', 'mp3',
      '--ffmpeg-location', path.dirname(ffmpegPath),
      '-o', audioPath,
    ]);

    const transcript = await transcribeWithAssemblyAI(audioPath);
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
    const transcript = await transcribeWithAssemblyAI(audioPath);
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
