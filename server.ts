import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchItemWithCandidates } from './server/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

app.post('/api/match', async (req, res) => {
  try {
    const { targetItem, candidates } = req.body;
    if (!targetItem || !candidates) {
      return res.status(400).json({ success: false, error: 'targetItem and candidates are required' });
    }
    const matches = await matchItemWithCandidates(targetItem, candidates);
    res.json({ success: true, matches });
  } catch (error: any) {
    console.error('API /api/match error:', error);
    res.status(500).json({ success: false, error: error.message || 'Matching failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReFound API', time: new Date().toISOString() });
});

// Serve frontend build in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ReFound server listening on port ${PORT}`);
});
