import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  return supabase;
}

router.post('/feedback', async (req, res) => {
  const { scriptId, rating, script, creatorVoice, feedbackNote } = req.body;

  if (!rating || !script) {
    return res.status(400).json({ error: 'rating and script are required.' });
  }

  const { error } = await getSupabase().from('script_feedback').insert({
    script_id: String(scriptId),
    rating,
    script,
    creator_voice: creatorVoice || null,
    feedback_note: feedbackNote || null,
  });

  if (error) {
    console.error('Supabase feedback error:', error);
    return res.status(500).json({ error: error.message });
  }

  const { count } = await getSupabase()
    .from('script_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('creator_voice', creatorVoice || '');
  console.log(`Feedbacks for this creator voice: ${count ?? 0}`);

  res.json({ ok: true, voiceFeedbackCount: count ?? 0 });
});

export default router;
