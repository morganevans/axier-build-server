const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/build', async (req, res) => {
  console.log('Build request received');
  console.log('Body keys:', Object.keys(req.body));
  
  const { userRequest, systemPrompt } = req.body;
  
  console.log('userRequest length:', userRequest?.length);
  console.log('systemPrompt length:', systemPrompt?.length);
  console.log('API key exists:', !!process.env.ANTHROPIC_API_KEY);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: systemPrompt || 'You are an expert frontend developer. Output ONLY a single self-contained HTML file starting with <!DOCTYPE html>.',
        messages: [{ role: 'user', content: userRequest }]
      })
    });

    console.log('Anthropic status:', response.status);
    
    const data = await response.json();
    
    if (data.error) {
      console.log('Anthropic error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }
    
    const html = data.content[0].text;
    console.log('HTML length:', html?.length);
    
    res.json({ html });
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Axier build server running on port ${PORT}`);
});
