const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const jobs = {};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

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

// FIX #1: Strip markdown fences before JSON.parse
// This was crashing every single Pass 3 — Haiku kept returning ```json blocks
function safeParseJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
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

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE API CALLS
// ─────────────────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage, maxTokens = 32000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600000);
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
        max_tokens: maxTokens,
        system: systemPrompt + SYSTEM_PROMPT_SUFFIX,
        messages: [{ role: 'user', content: userMessage }]
      }),
      signal: controller.signal
    });
    const data = await response.json();
    if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
    return cleanHtml(data.content[0].text);
  } finally {
    clearTimeout(timeout);
  }
}

async function callClaudeJson(userMessage, maxTokens = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
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
        system: 'You are a JSON generator. Your response MUST start with [ character directly. No markdown. No backticks. No explanation. No code fences. Raw JSON array only.',
        messages: [
          { role: 'user', content: userMessage },
          // FIX #1b: Assistant prefill forces model to start with [ — no fences possible
          { role: 'assistant', content: '[' }
        ]
      }),
      signal: controller.signal
    });
    const data = await response.json();
    if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
    // Re-attach the [ prefill then parse
    const raw = '[' + data.content[0].text.trim();
    return safeParseJson(raw);
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY DETECTION + DYNAMIC IMAGE CAP
// ─────────────────────────────────────────────────────────────────────────────

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
  if (text.includes('clinic') || text.includes('medical') || text.includes('aesthetic') || text.includes('injectable')) return 'aesthetics_clinic';
  if (text.includes('store') || text.includes('shop') || text.includes('ecommerce') || text.includes('product')) return 'ecommerce';
  if (text.includes('portfolio') || text.includes('agency') || text.includes('creative')) return 'portfolio';
  if (text.includes('landing') || text.includes('app')) return 'saas';
  return 'business';
}

// Dynamic cap: only generate what the site type actually needs
function getImageCap(industry) {
  const caps = {
    ecommerce:         16,
    fashion:           14,
    skincare:          12,
    restaurant:        12,
    jewelry:           12,
    hospitality:       12,
    aesthetics_clinic: 10,
    wellness:          10,
    fitness:           10,
    real_estate:       10,
    photography:       10,
    coffee:            8,
    music:             8,
    robotics:          8,
    portfolio:         8,
    business:          8,
    saas:              6,
    technology:        6,
  };
  return caps[industry] || 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE GENERATION
// FIX #2: Correct Gemini model string
// Previous string 'gemini-3-pro-image-preview' does not exist — silent null every time
// ─────────────────────────────────────────────────────────────────────────────

async function generateImage(prompt, aspectRatio = '1:1') {
  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        aspectRatio: aspectRatio
      }
    });

    if (!response.candidates || !response.candidates[0]) {
      console.error('Image gen: no candidates returned');
      return null;
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
      }
    }
    console.error('Image gen: no inlineData found in response');
    return null;
  } catch (error) {
    console.error('Image generation error:', error.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT EXTRACTION
// FIX #3: Scan the FULL HTML — previous code only looked at first 8000 chars
// meaning slots in products/team/content sections were never found
// ─────────────────────────────────────────────────────────────────────────────

function extractImageSlots(html) {
  const slots = [];
  const seen = new Set();

  // Primary: data-slot attributes (added by Pass 2) — most descriptive
  // Handle both attribute orderings: src then data-slot, or data-slot then src
  const patterns = [
    /<img[^>]*data-slot="([^"]*)"[^>]*src="([^"]*)"[^>]*/gi,
    /<img[^>]*src="([^"]*)"[^>]*data-slot="([^"]*)"[^>]*/gi,
  ];

  for (let pi = 0; pi < patterns.length; pi++) {
    let match;
    while ((match = patterns[pi].exec(html)) !== null) {
      const slotId = pi === 0 ? match[1] : match[2];
      const src    = pi === 0 ? match[2] : match[1];
      if (slotId && !seen.has(slotId)) {
        seen.add(slotId);
        slots.push({ id: slotId, src, type: 'data-slot' });
      }
    }
  }

  // Fallback: known placeholder URL patterns
  const placeholderPatterns = [
    /src="(https?:\/\/via\.placeholder[^"]*)"/gi,
    /src="(https?:\/\/placehold\.co[^"]*)"/gi,
    /src="(https?:\/\/placehold\.it[^"]*)"/gi,
    /src="(https?:\/\/source\.unsplash[^"]*)"/gi,
    /src="(https?:\/\/picsum\.photos[^"]*)"/gi,
    /src="(https?:\/\/dummyimage[^"]*)"/gi,
    /src="(placeholder[^"]*\.(?:jpg|jpeg|png|webp|gif))"/gi,
    /src="([^"]*\/placeholder[^"]*\.(?:jpg|jpeg|png|webp|gif))"/gi,
  ];

  for (const pattern of placeholderPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const src = match[1];
      if (src && !seen.has(src)) {
        seen.add(src);
        slots.push({ id: `placeholder-${slots.length}`, src, type: 'src' });
      }
    }
  }

  // CSS background-image placeholders
  const bgPattern = /background-image:\s*url\(['"]?(https?:\/\/(?:via\.placeholder|placehold|picsum|source\.unsplash)[^'")\s]*)['"]?\)/gi;
  let match;
  while ((match = bgPattern.exec(html)) !== null) {
    const src = match[1];
    if (src && !seen.has(src)) {
      seen.add(src);
      slots.push({ id: `bg-${slots.length}`, src, type: 'background' });
    }
  }

  return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASS 3 — CONTEXT-AWARE BRANDED IMAGE INJECTION
// ─────────────────────────────────────────────────────────────────────────────

async function injectBrandedImages(html, userRequest, jobId) {
  console.log(`Job ${jobId} — Pass 3 starting (context-aware image generation)`);

  const industry = detectIndustry(userRequest);
  const imageCap = getImageCap(industry);
  console.log(`Job ${jobId} — Industry: ${industry} | Cap: ${imageCap} images`);

  const rawSlots = extractImageSlots(html);
  console.log(`Job ${jobId} — Found ${rawSlots.length} slots in full HTML`);

  if (rawSlots.length === 0) {
    console.log(`Job ${jobId} — No image slots found, skipping`);
    return html;
  }

  const slotsToProcess = rawSlots.slice(0, imageCap);
  console.log(`Job ${jobId} — Processing ${slotsToProcess.length} slots`);

  // Generate a specific branded prompt for each slot
  const promptGenRequest = `You are a world-class brand photographer and creative director.

Brand context: ${userRequest.substring(0, 800)}
Industry: ${industry}

For each image slot below, write a highly specific photorealistic image generation prompt.
Requirements:
- Match the brand's exact aesthetic, color palette, and mood
- Be completely specific to what that slot shows (hero, product card, portrait, etc.)
- Make each prompt unique — no two images should look the same
- Always end with ", no text, no watermarks, no logos, professional photography"

Slots to generate prompts for:
${slotsToProcess.map((s, i) => `${i}. "${s.id}"`).join('\n')}

Return ONLY a JSON array starting with [ immediately:
[{"index":0,"prompt":"full detailed prompt here","aspect_ratio":"16:9"},...]

Use aspect_ratio: "16:9" for heroes/banners/backgrounds, "1:1" for products/avatars/cards, "4:3" for lifestyle/editorial`;

  let promptData = [];
  try {
    promptData = await callClaudeJson(promptGenRequest, 3000);
    console.log(`Job ${jobId} — Prompt generation succeeded: ${promptData.length} prompts`);
  } catch (error) {
    console.error(`Job ${jobId} — Prompt generation failed (${error.message}) — using fallback prompts`);
    promptData = slotsToProcess.map((s, i) => ({
      index: i,
      prompt: `Premium ${industry} brand photography, cinematic lighting, luxury aesthetic, rich deep colors, no text, no watermarks, professional photography`,
      aspect_ratio: (s.id.toLowerCase().includes('hero') || s.id.toLowerCase().includes('banner') || s.id.toLowerCase().includes('bg') || s.id.toLowerCase().includes('background')) ? '16:9' : '1:1'
    }));
  }

  console.log(`Job ${jobId} — Generating ${slotsToProcess.length} images in parallel`);

  const imageResults = await Promise.all(
    slotsToProcess.map(async (slot, i) => {
      const promptEntry = promptData[i] || promptData.find(p => p.index === i);
      if (!promptEntry) {
        console.error(`Job ${jobId} — No prompt for slot ${i}`);
        return { ...slot, generatedImage: null };
      }
      console.log(`Job ${jobId} — Generating [${i + 1}/${slotsToProcess.length}]: ${slot.id}`);
      const img = await generateImage(promptEntry.prompt, promptEntry.aspect_ratio || '1:1');
      if (img) {
        console.log(`Job ${jobId} — ✓ [${i + 1}] success`);
      } else {
        console.error(`Job ${jobId} — ✗ [${i + 1}] failed`);
      }
      return { ...slot, generatedImage: img };
    })
  );

  const successCount = imageResults.filter(r => r.generatedImage).length;
  console.log(`Job ${jobId} — ${successCount}/${slotsToProcess.length} images successful`);

  // Inject each generated image back into the HTML
  for (const result of imageResults) {
    if (!result.generatedImage) continue;

    try {
      if (result.type === 'data-slot') {
        const eid = result.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // src before data-slot
        html = html.replace(
          new RegExp(`(<img[^>]*src=")[^"]*("[^>]*data-slot="${eid}"[^>]*>)`, 'g'),
          `$1${result.generatedImage}$2`
        );
        // data-slot before src
        html = html.replace(
          new RegExp(`(<img[^>]*data-slot="${eid}"[^>]*src=")[^"]*("[^>]*>)`, 'g'),
          `$1${result.generatedImage}$2`
        );
      } else if (result.type === 'background') {
        const esc = result.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(esc, 'g'), result.generatedImage);
      } else {
        const esc = result.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`src="${esc}"`, 'g'), `src="${result.generatedImage}"`);
      }
    } catch (e) {
      console.error(`Job ${jobId} — Inject error for ${result.id}: ${e.message}`);
    }
  }

  console.log(`Job ${jobId} — Pass 3 complete. Final HTML: ${html.length} chars`);
  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD ROUTES
// ─────────────────────────────────────────────────────────────────────────────

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
      const baseSystemPrompt = systemPrompt ||
        'You are an expert frontend developer. Output ONLY a single self-contained HTML file starting with <!DOCTYPE html>. Nothing before it. Nothing after </html>.';

      // ── PASS 1: Structure & Design ───────────────────────────────────────
      console.log(`Job ${jobId} — Pass 1 starting (structure & design)`);
      jobs[jobId].phase = 'pass1';

      const pass1Html = await callClaude(baseSystemPrompt, userRequest, 32000);
      console.log(`Job ${jobId} — Pass 1 complete. HTML length: ${pass1Html.length}`);

      // ── PASS 2: Interactivity + Image Slot Tagging ───────────────────────
      jobs[jobId].phase = 'pass2';
      console.log(`Job ${jobId} — Pass 2 starting (interactivity + image slot tagging)`);

      const pass2Prompt = `You are an expert JavaScript developer and UX engineer.
Upgrade this HTML file with two goals:

GOAL 1 — COMPLETE INTERACTIVITY:
- All buttons functional (nav, CTAs, add to cart, filters, tabs)
- Working sliders/carousels with prev/next and autoplay
- Animated counters that count up on scroll
- Smooth accordion FAQ open/close
- Working modals/lightboxes with overlay close
- Parallax scroll effects on hero and backgrounds
- Cart with running total and item count badge
- Nav shrinks on scroll
- IntersectionObserver scroll-triggered reveals on all sections
- Mobile hamburger menu
- Tab/filter bars switching content
- Form validation with success state
- Smooth anchor scrolling
- All hover micro-interactions

GOAL 2 — IMAGE SLOT TAGGING (CRITICAL):
Add a data-slot attribute to EVERY <img> tag describing exactly what image belongs there.
The name must describe the specific content — this is what the AI image generator reads.

Descriptive examples:
  data-slot="hero-background-luxury-spa-candlelit-interior"
  data-slot="product-card-rose-gold-facial-serum-bottle"
  data-slot="team-member-dr-sarah-chen-professional-portrait"
  data-slot="before-after-skin-rejuvenation-treatment-result"
  data-slot="lifestyle-woman-morning-skincare-routine-bathroom"
  data-slot="ingredient-closeup-hyaluronic-acid-droplet-macro"

Vague names that are NOT acceptable:
  data-slot="image-1" or data-slot="photo" or data-slot="img"

Every image gets a unique descriptive data-slot. This is the most critical part.

Do NOT change design, colors, fonts, layout, or visual decisions from Pass 1.
Return the COMPLETE updated HTML file.

HTML:
${pass1Html}`;

      const pass2Html = await callClaude(
        'You are an expert JavaScript developer. Output ONLY a complete HTML file starting with <!DOCTYPE html>.',
        pass2Prompt,
        32000
      );

      console.log(`Job ${jobId} — Pass 2 complete. HTML length: ${pass2Html.length}`);

      // ── PASS 3: Branded Image Generation & Injection ─────────────────────
      jobs[jobId].phase = 'pass3';
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
    const baseSystemPrompt = systemPrompt ||
      'You are an expert frontend developer. Output ONLY a single self-contained HTML file starting with <!DOCTYPE html>.';
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
