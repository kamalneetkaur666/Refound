import { matchItemWithCandidates } from '../server/gemini';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { targetItem, candidates } = req.body || {};
    if (!targetItem || !candidates) {
      return res.status(400).json({ success: false, error: 'targetItem and candidates are required' });
    }

    const matches = await matchItemWithCandidates(targetItem, candidates);
    return res.status(200).json({ success: true, matches });
  } catch (error: any) {
    console.error('Vercel API match error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Matching failed' });
  }
}
