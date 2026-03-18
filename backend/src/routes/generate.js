import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const router = Router();

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  return supabase;
}

// Lazy: created on first request so dotenv has already run by then
let client = null;
function getClient() {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    console.log('ANTHROPIC_API_KEY present:', !!key);
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

function buildPrompt({ referenceScript, productName, productDescription, keyBenefits, targetAudience, creatorVoice }) {
  const voiceLine = creatorVoice?.trim()
    ? `\nWrite in this creator's voice and style: ${creatorVoice}. Sound like a real person talking on camera, not a polished ad. Use natural speech patterns, avoid buzzwords like "dialed-in", "game-changer", "unlock", "zero brain fog". Write how this specific creator actually talks.\n`
    : '';

  return `You are an expert direct-response copywriter specializing in video ad scripts.${voiceLine}

Your task is to analyze a reference ad script and write a new script for a different product that mirrors the EXACT same structure, pacing, and tone.

---

REFERENCE SCRIPT:
${referenceScript}

---

PRODUCT DETAILS:
- Product Name: ${productName}
- What It Does: ${productDescription}
- Key Benefits: ${keyBenefits}
- Target Audience: ${targetAudience}

---

INSTRUCTIONS:

Step 1 - Analyze the reference script's anatomy:
- Hook: How does it open? What makes it immediately grab attention?
- Problem/Tension: What pain point, desire, or conflict does it establish?
- Solution reveal: How is the product introduced? What's the framing?
- Proof/Value stack: What evidence, benefits, or emotional payoffs are shown?
- CTA: How does it close? What action does it drive?
- Tone: What is the voice? (e.g., urgent, conversational, aspirational, punchy, narrative)
- Rhythm: Are lines short and punchy or longer and narrative? Fast cuts or slow build?

Step 2 - Write a new video ad script for the product above that:
- Mirrors the EXACT structural flow — same number of beats, same order
- Matches the tone, sentence length, and rhythm of the original
- Feels completely native to the new product (never forced or templated)
- Uses natural spoken language appropriate for video
- Does NOT reference or copy lines from the reference — only its structure

Step 3 - Organize the script by analyzing where each section naturally falls based on the reference script structure. Do not force a set number of talking points — let the reference script dictate the flow.

Output the script in this EXACT JSON format and nothing else — no preamble, no explanation, just the JSON:

{
  "hook": [
    {
      "talking_point": "the words the creator says",
      "visual": "recommended visual direction for this moment"
    }
  ],
  "intro": [
    {
      "talking_point": "the words the creator says",
      "visual": "recommended visual direction for this moment"
    }
  ],
  "body": [
    {
      "talking_point": "the words the creator says",
      "visual": "recommended visual direction for this moment"
    }
  ],
  "close": [
    {
      "talking_point": "the words the creator says",
      "visual": "recommended visual direction for this moment"
    }
  ]
}

Rules:
- Hook always has exactly 1 talking point — the single opening line that grabs attention
- Intro, Body, and Close talking points are determined naturally by analyzing the reference script — do not force a set number
- Let the reference script dictate how many talking points each section needs — if the reference has a long body with 4 beats, match that, if it has a short intro with 1 beat, match that
- Every talking point must have a specific visual recommendation based on what works in winning UGC ads (e.g. "Direct to camera, hold product up", "B-roll of morning routine", "Close up of product label", "Lean in slightly for CTA")
- Talking points are the actual words the creator says, natural and conversational
- Never force content into a section just to fill it — if the script flows naturally from hook straight into body, the intro can have just 1 talking point`;
}

router.post('/generate', async (req, res) => {
  const { referenceScript, productName, productDescription, keyBenefits, targetAudience, creatorVoice } = req.body;

  if (!referenceScript || !productName || !productDescription || !keyBenefits || !targetAudience) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let memoryContext = '';
    const voice = creatorVoice?.trim();
    const [{ data: highRated }, { data: lowRated }] = await Promise.all([
      voice
        ? getSupabase().from('script_feedback').select('script').gte('rating', 4).ilike('creator_voice', `%${voice}%`).order('rating', { ascending: false }).limit(3)
        : getSupabase().from('script_feedback').select('script').gte('rating', 4).order('rating', { ascending: false }).limit(3),
      voice
        ? getSupabase().from('script_feedback').select('script').lte('rating', 2).ilike('creator_voice', `%${voice}%`).order('rating', { ascending: true }).limit(3)
        : getSupabase().from('script_feedback').select('script').lte('rating', 2).order('rating', { ascending: true }).limit(3),
    ]);
    if (highRated?.length) memoryContext += '\n\nHere are examples of scripts this creator style rated highly — match this tone and style:\n' + highRated.map(r => r.script).join('\n---\n');
    if (lowRated?.length)  memoryContext += '\n\nHere are examples this creator style rated poorly — avoid these patterns:\n'  + lowRated.map(r => r.script).join('\n---\n');
    console.log(`[memory] highRated: ${highRated?.length ?? 0}, lowRated: ${lowRated?.length ?? 0}`);
    console.log(`[memory] context injected:\n${memoryContext || '(none)'}\n`);

    const stream = getClient().messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8096,
      thinking: { type: 'adaptive' },
      messages: [
        {
          role: 'user',
          content: buildPrompt({ referenceScript, productName, productDescription, keyBenefits, targetAudience, creatorVoice }) + memoryContext,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const data = JSON.stringify({ text: event.delta.text });
        res.write(`data: ${data}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Claude API error:', err);
    const message = err instanceof Anthropic.APIError
      ? `API error ${err.status}: ${err.message}`
      : `${err.message || err}`;
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

export default router;
