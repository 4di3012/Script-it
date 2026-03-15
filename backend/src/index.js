import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRoute from './routes/generate.js';
import transcribeRoute from './routes/transcribe.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api', generateRoute);
app.use('/api', transcribeRoute);

app.listen(PORT, () => {
  console.log(`Script It backend running on http://localhost:${PORT}`);
});
