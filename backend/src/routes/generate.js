import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

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

Step 1 — Analyze the reference script's anatomy:
• Hook: How does it open? What makes it immediately grab attention?
• Problem/Tension: What pain point, desire, or conflict does it establish?
• Solution reveal: How is the product introduced? What's the framing?
• Proof/Value stack: What evidence, benefits, or emotional payoffs are shown?
• CTA: How does it close? What action does it drive?
• Tone: What is the voice? (e.g., urgent, conversational, aspirational, punchy, narrative)
• Rhythm: Are lines short and punchy or longer and narrative? Fast cuts or slow build?

Step 2 — Write a new video ad script for the product above that:
• Mirrors the EXACT structural flow — same number of beats, same order
• Matches the tone, sentence length, and rhythm of the original
• Feels completely native to the new product (never forced or templated)
• Uses natural spoken language appropriate for video
• Includes brief [direction notes] in brackets where they help the creator visualize the shot or delivery
• Does NOT reference or copy lines from the reference — only its structure

Output the script only. No preamble, no analysis, no labels — just the finished script ready to hand to a creator.`;
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
    const stream = getClient().messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8096,
      thinking: { type: 'adaptive' },
      messages: [
        {
          role: 'user',
          content: buildPrompt({ referenceScript, productName, productDescription, keyBenefits, targetAudience, creatorVoice }),
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
