import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRoute from './routes/generate.js';
import transcribeRoute from './routes/transcribe.js';

dotenv.config();

const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
console.log(`ASSEMBLYAI_API_KEY: ${assemblyKey ? assemblyKey.slice(0, 8) + '...' : 'NOT SET'}`);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', generateRoute);
app.use('/api', transcribeRoute);

app.listen(PORT, () => {
  console.log(`Script It backend running on http://localhost:${PORT}`);
});
