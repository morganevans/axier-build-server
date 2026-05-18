const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const jobs = {};

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
  if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
  return cleanHtml(data.content[0].text);
}

async function callClaudeJson(userMessage, maxTokens = 4000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: 'You are a JSON generator. Return ONLY valid JSON. No explanation. No markdown. No code fences. Just the raw JSON.',
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
  const text = data.content[0].text.trim();
  return JSON.parse(text);
}

function detectIndustry(text) {
  text = text.toLowerCase();
  if (text.includes('coffee') || text.includes('cafe') || text.includes('espresso')) return 'coffee';
  if (text.includes('fashion') || text.includes('clothing') || text.includes('apparel')) return 'fashion';
  if (text.includes('restaurant') || text.includes('dining') || text.includes('food')) return 'restaurant';
  if (text.includes('fitness') || text.includes('gym') || text.includes('workout')) return 'fitness';
  if (text.includes('skincare') || text.includes('beauty') || text.includes('cosmetic') || text.includes('botanical')) return 'skincare';
  if (text.includes('robot') || text.includes('robotics') || text.includes('autonomous')) return 'robotics';
  if (text.includes('jewelry') || text.includes('jewellery')) return 'jewelry';
  if (text.includes('hotel') || text.includes('resort') || text.includes('travel')) return 'hospitality';
  if (text.includes('wellness') || text.includes('spa') || text.includes('yoga')) return 'wellness';
  if (text.includes('real estate') || text.includes('property')) return 'real_estate';
  if (text.includes('tech') || text.includes('software') || text.includes('saas')) return 'technology';
  if (text.includes('music') || text.includes('band') || text.includes('artist')) return 'music';
  if (text.includes('photography') || text.includes('photographer')) return 'photography';
  return 'business';
}

// Generate a single image using Nano Banana Pro (Gemini)
async function generateImage(prompt, aspectRatio = '1:1') {
  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        aspectRatio: aspectRatio
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
      }
    }
    return null;
  } catch (error) {
    console.error('Image generation error:', error.message);
    return null;
  }
}

// Pass 3: Context-aware image generation and injection
async function injectBrandedImages(html, userRequest, jobId) {
  console.log(`Job ${jobId} — Pass 3 starting (context-aware image generation)`);

  const industry = detectIndustry(userRequest);
  console.log(`Job ${jobId} — Detected industry: ${industry}`);

  // Step 1: Ask Claude (Haiku, fast + cheap) to scan HTML and identify image slots
  const scanPrompt = `You are scanning an HTML file to identify every image slot that needs a real AI-generated image.

Brand/site context: ${userRequest.substring(0, 500)}
Industry: ${industry}

For each image slot in the HTML, identify:
1. The exact src attribute value currently in the HTML (or background-image URL)
2. What specific image should go there based on context
3. The best Nano Banana Pro prompt to generate that exact image
4. The aspect ratio needed (16:9 for heroes/banners, 1:1 for products/cards, 4:3 for editorial/lifestyle)

Rules:
- Maximum 12 image slots (prioritize most important)
- Each prompt must be specific to what that slot actually needs
- Product images must show the actual product being sold
- Hero images must match the brand aesthetic
- Be specific — "red leather phone case on dark marble" not "product image"
- Always end prompts with ", no text, professional photography"
- For background-image CSS, use the full CSS value as the identifier

Return a JSON array like this:
[
  {
    "id": "unique-slot-id",
    "identifier": "exact src value or CSS background-image value to find and replace",
    "type": "src" or "background",
    "description": "what this image is for",
    "prompt": "detailed Nano Banana Pro generation prompt",
    "aspect_ratio": "16:9" or "1:1" or "4:3"
  }
]

HTML to scan (first 8000 chars):
${html.substring(0, 8000)}`;

  let imageSlots = [];
  try {
    imageSlots = await callClaudeJson(scanPrompt, 3000);
    console.log(`Job ${jobId} — Found ${imageSlots.length} image slots`);
  } catch (error) {
    console.error(`Job ${jobId} — Slot scan failed:`, error.message);
    // Fallback to basic injection
    return html;
  }

  if (!imageSlots || imageSlots.length === 0) {
    console.log(`Job ${jobId} — No image slots found, skipping image generation`);
    return html;
  }

  // Step 2: Generate all images in parallel (max 12)
  const slotsToProcess = imageSlots.slice(0, 12);
  console.log(`Job ${jobId} — Generating ${slotsToProcess.length} images in parallel`);

  const imageResults = await Promise.all(
    slotsToProcess.map(async (slot) => {
      const img = await generateImage(slot.prompt, slot.aspect_ratio || '1:1');
      return { ...slot, generatedImage: img };
    })
  );

  const successCount = imageResults.filter(r => r.generatedImage).length;
  console.log(`Job ${jobId} — Successfully generated ${successCount}/${slotsToProcess.length} images`);

  // Step 3: Inject each generated image into its exact slot
  for (const result of imageResults) {
    if (!result.generatedImage) continue;

    try {
      if (result.type === 'background') {
        // Replace CSS background-image
        const escaped = result.identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        html = html.replace(regex, `url('${result.generatedImage}')`);
      } else {
        // Replace img src
        if (result.identifier && result.identifier !== '') {
          const escaped = result.identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const srcRegex = new RegExp(`src="${escaped}"`, 'g');
          html = html.replace(srcRegex, `src="${result.generatedImage}"`);
        }
      }
    } catch (e) {
      console.error(`Job ${jobId} — Failed to inject image for slot ${result.id}:`, e.message);
    }
  }

  // Also catch any remaining common placeholder patterns
  const remainingPlaceholders = [
    /src="https:\/\/via\.placeholder[^"]*"/gi,
    /src="https:\/\/placehold[^"]*"/gi,
    /src="placeholder[^"]*"/gi,
  ];

  const imgPool = imageResults
    .filter(r => r.generatedImage)
    .map(r => r.generatedImage);

  if (imgPool.length > 0) {
    let idx = 0;
    for (const pattern of remainingPlaceholders) {
      html = html.replace(pattern, () => {
        const img = imgPool[idx % imgPool.length];
        idx++;
        return `src="${img}"`;
      });
    }
  }

  console.log(`Job ${jobId} — Pass 3 complete. Final HTML length: ${html.length}`);
  return html;
}

app.post('/build-async', async (req, res) => {
  const { userRequest, systemPrompt } = req.body;

  const jobId = Date.now().toString();
  jobs[jobId] = { status: 'pending', phase: 'starting', html: null, error: null };

  console.log(`Job ${jobId} started`);
  console.log('systemPrompt length:', systemPrompt?.length);
  console.log('API key exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('Google API key exists:', !!process.env.GOOGLE_API_KEY);

  res.json({ jobId });

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
Add ALL missing JavaScript functionality to this HTML file:

REQUIRED:
- All buttons functional (nav, CTAs, add to cart, filters)
- Working sliders and carousels with prev/next and autoplay
- Animated counters that count up from 0 on scroll
- Accordion FAQ open/close with smooth animation
- Working modal/quick view popups with close and overlay
- Parallax scroll effects on hero and backgrounds
- Cart add/remove with running total and item count
- All hover animations and micro-interactions
- Navigation scroll behavior — compact on scroll
- IntersectionObserver scroll-triggered reveals
- Mobile hamburger menu open/close
- Tab/filter bars that switch content
- Form validation and simulated submission success
- All missing scroll animations

IMPORTANT: For every <img> tag that has a placeholder src,
add a data-slot attribute describing what image belongs there.
Example: <img src="placeholder.jpg" data-slot="hero-background">
Example: <img src="product1.jpg" data-slot="product-phone-case-red">
This helps the image generation system know what to generate.

Do not change design, colors, fonts, or layout.
Only add or fix JavaScript and broken CSS interactions.
Return COMPLETE updated HTML.

HTML:
${pass1Html}`;

      const pass2Html = await callClaude(
        'You are an expert JavaScript developer. Output ONLY a complete HTML file starting with <!DOCTYPE html>.',
        pass2Prompt,
        32000
      );

      console.log(`Job ${jobId} — Pass 2 complete. HTML length: ${pass2Html.length}`);

      jobs[jobId].phase = 'pass3';

      // PASS 3: Context-aware image generation
      const finalHtml = await injectBrandedImages(pass2Html, userRequest, jobId);

      jobs[jobId] = { status: 'done', phase: 'complete', html: finalHtml };

    } catch (error) {
      console.error(`Job ${jobId} error:`, error.message);
      jobs[jobId] = { status: 'error', phase: 'error', error: error.message };
    }
  })();
});

app.get('/job/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

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
