const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory job store
const jobs = {};

// Clean HTML - strip any preamble before <!DOCTYPE
function cleanHtml(html) {
  const doctypeIndex = html.indexOf('<!DOCTYPE');
  const htmlTagIndex = html.indexOf('<html');
  const startIndex = doctypeIndex !== -1 ? doctypeIndex : htmlTagIndex;
  if (startIndex > 0) html = html.substring(startIndex);
  // Strip markdown fences if present
  html = html.replace(/^```html\n?/i, '').replace(/```\s*$/i, '');
  if (!html.includes('</body>')) html += '</body>';
  if (!html.includes('</html>')) html += '</html>';
  return html;
}

const SYSTEM_PROMPT_SUFFIX = `

CRITICAL OUTPUT RULES — NO EXCEPTIONS:
- Your response must begin with <!DOCTYPE html> and nothing else
- The very first character of your response must be "<"
- No explanation before the code
- No preamble sentence
- No markdown code fences
- No "I'll build..." or "Here is..." or any text before the HTML
- Output ONLY the raw HTML file
- End with </html> and nothing after it`;

// Start a build job - returns immediately with jobId
app.post('/build-async', async (req, res) => {
  const { userRequest, systemPrompt } = req.body;
  
  const jobId = Date.now().toString();
  jobs[jobId] = { status: 'pending', html: null, error: null };
  
  console.log(`Job ${jobId} started`);
  console.log('systemPrompt length:', systemPrompt?.length);
  console.log('API key exists:', !!process.env.ANTHROPIC_API_KEY);
  
  // Return jobId immediately
  res.json({ jobId });
  
  // Build in background
  (async () => {
    try {
      const finalSystemPrompt = (systemPrompt || 'You are an expert frontend developer. Output ONLY a single self-contained HTML file starting with <!DOCTYPE html>. Nothing before it. Nothing after </html>.') + SYSTEM_PROMPT_SUFFIX;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 64000,
          system: finalSystemPrompt,
          messages: [{ role: 'user', content: userRequest }]
        })
      });

      console.log(`Job ${jobId} Anthropic status:`, response.status);
      const data = await response.json();

      if (data.error) {
        console.log(`Job ${jobId} Anthropic error:`, data.error);
        jobs[jobId] = { status: 'error', error: data.error.message };
        return;
      }

      const html = cleanHtml(data.content[0].text);
      console.log(`Job ${jobId} complete. HTML length:`, html.length);
      jobs[jobId] = { status: 'done', html };

    } catch (error) {
      console.error(`Job ${jobId} error:`, error.message);
      jobs[jobId] = { status: 'error', error: error.message };
    }
  })();
});

// Poll job status
app.get('/job/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// Keep old /build endpoint working
app.post('/build', async (req, res) => {
  const { userRequest, systemPrompt } = req.body;
  
  try {
    const finalSystemPrompt = (systemPrompt || 'You are an expert frontend developer. Output ONLY a single self-contained HTML file starting with <!DOCTYPE html>.') + SYSTEM_PROMPT_SUFFIX;

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
        system: finalSystemPrompt,
        messages: [{ role: 'user', content: userRequest }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    
    const html = cleanHtml(data.content[0].text);
    res.json({ html });

  } catch (error) {
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
