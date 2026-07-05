import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const defaultModel = process.env.OPENROUTER_MODEL || 'x-ai/grok-4.3';

app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, defaultModel });
});

const handleAgentRequest = async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'Missing OPENROUTER_API_KEY. Add it to your local .env file.' });
    return;
  }

  const { prompt, model, agentName } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt.' });
    return;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_TITLE || 'AITSEO-like Blog Generator'
      },
      body: JSON.stringify({
        model: model || defaultModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(process.env.OPENROUTER_TEMPERATURE || 0.65),
        max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS || 9000)
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      res.status(response.status).json({
        error: data?.error?.message || data?.message || response.statusText,
        agentName
      });
      return;
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      res.status(502).json({ error: 'OpenRouter returned no content.', agentName });
      return;
    }

    res.json({ content, model: model || defaultModel, agentName });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to call OpenRouter.',
      agentName
    });
  }
};

app.post('/api/agent', handleAgentRequest);
app.post('/api/generate', handleAgentRequest);

app.listen(port, () => {
  console.log(`Local API server running at http://localhost:${port}`);
});
