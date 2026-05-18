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

// Call Anthropic API
async function callClaude(systemPrompt, userMessage, maxTokens = 64000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt + SYSTEM_PROMPT_SUFFIX,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Anthropic error: ${data.error.message}`);
  }

  return cleanHtml(data.content[0].text);
}

// Start a build job - returns immediately with jobId
app.post('/build-async', async (req, res) => {
  const { userRequest, systemPrompt } = req.body;

  const jobId = Date.now().toString();
  jobs[jobId] = { status: 'pending', phase: 'building', html: null, error: null };

  console.log(`Job ${jobId} started`);
  console.log('systemPrompt length:', systemPrompt?.length);
  console.log('API key exists:', !!process.env.ANTHROPIC_API_KEY);

  // Return jobId immediately
  res.json({ jobId });

  // Two-pass build in background
  (async () => {
    try {
      const baseSystemPrompt = systemPrompt || 'You are an expert frontend developer. Output ONLY a single self-contained HTML file starting with <!DOCTYPE html>. Nothing before it. Nothing after </html>.';

      // PASS 1: Structure & Design
      console.log(`Job ${jobId} — Pass 1 starting (structure & design)`);
      jobs[jobId].phase = 'pass1';

      const pass1Html = await callClaude(baseSystemPrompt, userRequest, 64000);
      console.log(`Job ${jobId} — Pass 1 complete. HTML length: ${pass1Html.length}`);

      jobs[jobId].phase = 'pass2';

      // PASS 2: Interactivity
      console.log(`Job ${jobId} — Pass 2 starting (interactivity)`);

      const pass2Prompt = `You are an expert JavaScript developer. 
I have a website that needs all its interactive features completed.
Add ALL missing JavaScript functionality to this HTML file:

REQUIRED INTERACTIONS TO ADD OR FIX:
- All buttons must be functional (nav, CTAs, add to cart, filters)
- Working sliders and carousels with prev/next controls and autoplay
- Animated counters that count up from 0 when scrolled into view
- Accordion FAQ — clicking opens/closes with smooth animation
- Working modal/quick view popups with close button and overlay
- Parallax scroll effects on hero and background elements
- Cart add/remove with running total and item count in nav
- All hover animations and micro-interactions
- Navigation scroll behavior — compact on scroll, smooth links
- IntersectionObserver scroll-triggered reveals on all sections
- Mobile hamburger menu that opens/closes
- Any tabs or filter bars that switch content
- Form validation and simulated submission success states
- Any missing scroll animations or transitions

Do not change any design, colors, fonts, or layout.
Only add or fix JavaScript and any broken CSS interactions.
Return the COMPLETE updated HTML file with all interactions working.

EXISTING HTML TO ENHANCE:
${pass1Html}`;

      const pass2Html = await callClaude(
        'You are an expert JavaScript developer. Output ONLY a complete HTML file. No preamble. No explanation. Start with <!DOCTYPE html>.',
        pass2Prompt,
        32000
      );

      console.log(`Job ${jobId} — Pass 2 complete. Final HTML length: ${pass2Html.length}`);
      jobs[jobId] = { status: 'done', phase: 'complete', html: pass2Html };

    } catch (error) {
      console.error(`Job ${jobId} error:`, error.message);
      jobs[jobId] = { status: 'error', phase: 'error', error: error.message };
    }
  })();
});

// Poll job status
app.get('/job/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// Legacy /build endpoint
app.post('/build', async (req, res) => {
  const { userRequest, systemPrompt } = req.body;

  try {
    const baseSystemPrompt = systemPrompt || 'You are an expert frontend developer. Output ONLY a single self-contained HTML file starting with <!DOCTYPE html>.';
    const html = await callClaude(baseSystemPrompt, userRequest, 16000);
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
