const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const jobs = {};

// ─────────────────────────────────────────────────────────────────────────────
// MASTER DESIGN SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const MASTER_SYSTEM_PROMPT = `You are the world's best UI/UX designer and frontend developer combined.
You build stunning, award-winning websites that look like they cost $10,000–$50,000 to produce.
Every site you build is a complete, multi-section, fully responsive HTML file.

DESIGN PHILOSOPHY:
- Every site must have a strong, unique visual identity
- Use industry-appropriate color psychology (NOT default white/gold/black for everything)
- Typography must be intentional — mix a display font with a body font from Google Fonts
- Layouts must be sophisticated: asymmetric grids, overlapping elements, bold section breaks
- Every section must feel intentional and designed, not templated
- Dark, rich backgrounds with strategic use of light — cinematic quality
- Micro-animations and scroll reveals on every section
- Mobile-first responsive design
- CURSOR RULE: Always design a custom cursor experience suited to the brand aesthetic. Use a small branded cursor overlay (16-24px circle or dot in the brand's accent color) that follows the mouse using JavaScript mousemove. The overlay must use pointer-events:none so it never blocks clicks. NEVER use cursor:none — keep the default cursor visible at all times so the user can always click accurately. The custom overlay adds personality on top of the native cursor.
- SCROLL REVEAL RULE: All content must be fully visible by default. Never set opacity:0 or visibility:hidden on content in CSS. Scroll reveal animations must be added by JavaScript AFTER the page loads — JS adds a class like "reveal-ready" to the body first, then applies opacity:0 to elements, then triggers the reveal. This ensures all content is visible even if JS loads slowly.

LOGO REQUIREMENTS (CRITICAL — DO THIS EVERY TIME):
- Design a unique SVG logo for the brand based on their industry and brief
- The logo must have an icon/mark AND the brand name in a matching typeface
- Use industry-appropriate colors — NOT generic white text
- Define it as: <symbol id="brand-logo" viewBox="0 0 280 70">...</symbol>
- Use it via <use href="#brand-logo"/> in the navbar AND footer
- The logo must be professional enough to use on a real business card
- ICON DESIGN RULES: The icon must be clean, geometric, and instantly recognizable. Use simple precise shapes — circles, arcs, lines, minimal geometric forms built from clean SVG paths. NO abstract blobs, NO poorly formed organic shapes, NO complex paths that look broken or accidental. Think Nike swoosh simplicity — one clean idea executed perfectly. Examples by industry: wellness/spa → a perfect minimal lotus (3 clean petals as simple ellipses) or a clean circle with an inner line; tech → a precise geometric mark using rectangles or clean angles; food/restaurant → a simple elegant fork or leaf; medical/clinic → a clean cross or minimal circle; jewelry → a simple diamond shape or ring. The icon must look intentional, refined, and professional at any size. Test: would a real design agency be proud to show this to a client?

EVERY SITE MUST INCLUDE THESE SECTIONS:
1. Fixed navbar (transparent → solid on scroll) with SVG logo and nav links
2. Full-screen hero (100vh) with headline, subheading, and CTAs
3. Stats/social proof bar with animated counters
4. Services or Products section with cards (3–6 items)
5. About/Story section with text and image side by side
6. Featured work, portfolio, or results section
7. Team or credentials section with portrait images
8. Testimonials with star ratings
9. FAQ accordion with full answers
10. Contact section with working form
11. Footer with logo, links, and copyright

IMAGE REQUIREMENTS (CRITICAL):
- For EVERY image use an <img> tag with src="https://placehold.co/WIDTHxHEIGHT"
- Size placeholders correctly: hero: 1920x1080, products: 600x600, portraits: 400x400, cards: 800x600
- HERO SECTION: ALWAYS use an <img> tag with src="https://placehold.co/1920x1080" as the hero background image — do NOT use CSS background-image for the hero. Place the <img> absolutely positioned behind the content with position:absolute, top:0, left:0, width:100%, height:100%, object-fit:cover, z-index:0. Put a dark overlay div above it (z-index:1) and content above that (z-index:2).
- DO NOT use Unsplash URLs, CSS background-image with real URLs, or any external image URLs anywhere
- The image AI replaces all placehold.co URLs with real branded photos

NAVBAR REQUIREMENTS (CRITICAL):
- Initial state: fully transparent background, white/light text, NO background color at all
- The navbar CSS must start with: background: transparent !important; backdrop-filter: none;
- On scroll past 80px JavaScript adds class "scrolled" to the navbar element
- CSS for .navbar.scrolled: background: rgba(10,10,10,0.97) !important; backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.08);
- NEVER set a background color on the navbar in its default state — it must be fully transparent
- JavaScript scroll listener: window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 80); });

FAQ REQUIREMENTS (CRITICAL):
- Every FAQ item must have BOTH a question AND a full detailed answer written out
- Answers must be 2-4 sentences of real useful content — never empty, never placeholder
- Clicking a question reveals its answer with smooth animation
- Only one answer open at a time

FILTER/TAB REQUIREMENTS (CRITICAL):
- Every tab and filter button must work — ALL of them, not just the first
- Each tab button must have a data-tab or data-filter attribute matching its content section
- JavaScript: clicking a tab hides ALL content sections then shows only the matching one
- Active class updates on every click
- Content sections use matching data-tab or data-filter attributes

CONTACT FORM REQUIREMENTS (CRITICAL):
- Use action="CONTACT_FORM_ENDPOINT" method="POST" on the form
- The CONTACT_FORM_ENDPOINT placeholder will be replaced by the build system with the real endpoint
- Include fields: Full Name, Email, Phone (optional), Message, Submit button
- Add: <input type="hidden" name="_subject" value="New Contact Form Submission">
- Add: <input type="hidden" name="_captcha" value="false">
- Style with dark inputs, accent color focus borders, full-width submit button
- Show success message after submission

CAROUSEL/SLIDER REQUIREMENTS (CRITICAL):
- All prev/next buttons cycle through ALL slides with wrap-around
- Auto-advance every 5 seconds
- Navigation dots update and are clickable

JAVASCRIPT REQUIREMENTS:
- Navbar: transparent by default, solid dark on scroll past 80px
- Mobile hamburger menu
- Smooth scroll to anchors
- IntersectionObserver scroll reveals (JS-only, never CSS opacity:0 on content)
- Animated number counters
- Working FAQ accordion with full answers
- All filter/tab bars fully functional — every tab works
- Working carousels with prev/next and dots
- Contact form with validation and success state
- Custom branded cursor overlay

TECHNICAL REQUIREMENTS:
- Single self-contained HTML file
- All CSS in <style> tags
- All JS in <script> tags
- Google Fonts via @import
- Minimum 1000 lines of code
- Pixel-perfect on mobile and desktop`;

const HTML_OUTPUT_RULES = `

ABSOLUTE OUTPUT RULES — ZERO TOLERANCE:
- Start your response with <!DOCTYPE html> — nothing before it, not even a space
- End with </html> — nothing after it
- No markdown code fences (no \`\`\`html)
- No explanations, no preamble, no commentary
- Raw HTML only`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function cleanHtml(html) {
  html = html.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
  const doctypeIndex = html.indexOf('<!DOCTYPE');
  const htmlTagIndex = html.indexOf('<html');
  const startIndex = doctypeIndex !== -1 ? doctypeIndex : htmlTagIndex;
  if (startIndex > 0) html = html.substring(startIndex);
  if (!html.includes('</body>')) html += '\n</body>';
  if (!html.includes('</html>')) html += '\n</html>';
  return html;
}

function safeParseJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

// Inject Formsubmit contact email — no signup, no account needed
// First submission triggers a one-time activation email to the client
// After activation all submissions go straight to their inbox forever
function injectContactEmail(html, contactEmail) {
  if (!contactEmail) return html;
  const formsubmitUrl = `https://formsubmit.co/${contactEmail.trim()}`;
  return html.replace(/CONTACT_FORM_ENDPOINT/g, formsubmitUrl);
}

// Extract contact email from userRequest if embedded as CONTACT_EMAIL: value
function extractContactEmail(userRequest) {
  if (!userRequest) return null;
  const match = userRequest.match(/CONTACT_EMAIL:\s*([^\s\n]+)/i);
  return match ? match[1].trim() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE COMPRESSION
// ─────────────────────────────────────────────────────────────────────────────

async function compressBase64Image(base64DataUrl, targetWidthPx = 1200) {
  try {
    const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return base64DataUrl;

    const base64Data = matches[2];
    const inputBuffer = Buffer.from(base64Data, 'base64');

    const outputBuffer = await sharp(inputBuffer)
      .resize(targetWidthPx, null, { withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer();

    const originalKb = Math.round(inputBuffer.length / 1024);
    const compressedKb = Math.round(outputBuffer.length / 1024);
    console.log(`Image compressed: ${originalKb}kb → ${compressedKb}kb`);

    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Image compression error:', error.message);
    return base64DataUrl;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE API CALLS
// ─────────────────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage, maxTokens = 24000) {
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
        system: systemPrompt + HTML_OUTPUT_RULES,
        messages: [{ role: 'user', content: userMessage }]
      }),
      signal: controller.signal
    });
    const data = await response.json();
    if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
    const text = data.content[0].text;
    console.log(`callClaude raw response length: ${text.length}, starts with: ${text.substring(0, 80)}`);
    return cleanHtml(text);
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
          { role: 'assistant', content: '[' }
        ]
      }),
      signal: controller.signal
    });
    const data = await response.json();
    if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
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
  if (text.includes('clinic') || text.includes('medical') || text.includes('aesthetic') || text.includes('injectable') || text.includes('med spa') || text.includes('medspa')) return 'aesthetics_clinic';
  if (text.includes('store') || text.includes('shop') || text.includes('ecommerce') || text.includes('product')) return 'ecommerce';
  if (text.includes('portfolio') || text.includes('agency') || text.includes('creative')) return 'portfolio';
  if (text.includes('landing') || text.includes('app')) return 'saas';
  return 'business';
}

function getImageCap(industry) {
  const caps = {
    ecommerce: 16, fashion: 14, skincare: 12, restaurant: 12,
    jewelry: 12, hospitality: 12, aesthetics_clinic: 12, wellness: 10,
    fitness: 10, real_estate: 10, photography: 10, coffee: 10,
    music: 8, robotics: 8, portfolio: 8, business: 8, saas: 6, technology: 6,
  };
  return caps[industry] || 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE GENERATION — with retry
// ─────────────────────────────────────────────────────────────────────────────

async function generateImageWithRetry(prompt, aspectRatio = '1:1', maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateImage(prompt, aspectRatio);
      if (result) return result;
      if (attempt < maxAttempts) {
        console.log(`Image gen attempt ${attempt} returned null — retrying...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error(`Image gen attempt ${attempt} error: ${error.message}`);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.error(`Image gen failed after ${maxAttempts} attempts`);
  return null;
}

async function generateImage(prompt, aspectRatio = '1:1') {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { console.error('GOOGLE_API_KEY not set'); return null; }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Image gen API error:', JSON.stringify(data));
      return await generateImageFallback(prompt);
    }

    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const raw = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        return await compressBase64Image(raw, 1200);
      }
    }

    console.error('Image gen: no inlineData in response');
    return await generateImageFallback(prompt);

  } catch (error) {
    console.error('Image generation error:', error.message);
    return null;
  }
}

async function generateImageFallback(prompt) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log('Trying fallback: gemini-2.5-flash-preview');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) { console.error('Fallback error:', JSON.stringify(data)); return null; }

    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const raw = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        return await compressBase64Image(raw, 1200);
      }
    }
    return null;
  } catch (error) {
    console.error('Fallback error:', error.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT EXTRACTION — Full HTML scan
// ─────────────────────────────────────────────────────────────────────────────

function extractImageSlots(html) {
  const slots = [];
  const seen = new Set();

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

  const placeholderPatterns = [
    /src="(https?:\/\/via\.placeholder[^"]*)"/gi,
    /src="(https?:\/\/placehold\.co[^"]*)"/gi,
    /src="(https?:\/\/placehold\.it[^"]*)"/gi,
    /src="(https?:\/\/source\.unsplash[^"]*)"/gi,
    /src="(https?:\/\/images\.unsplash[^"]*)"/gi,
    /src="(https?:\/\/unsplash[^"]*)"/gi,
    /src="(https?:\/\/picsum\.photos[^"]*)"/gi,
    /src="(https?:\/\/dummyimage[^"]*)"/gi,
    /src="(placeholder[^"]*\.(?:jpg|jpeg|png|webp|gif))"/gi,
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

  const bgPattern = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]*)['"]?\)/gi;
  let match;
  while ((match = bgPattern.exec(html)) !== null) {
    const src = match[1];
    if (src && !seen.has(src) && !src.startsWith('data:')) {
      seen.add(src);
      const contextStart = Math.max(0, match.index - 200);
      const context = html.substring(contextStart, match.index).toLowerCase();
      const isHero = context.includes('hero') || context.includes('banner') || context.includes('section-hero');
      slots.push({
        id: isHero ? `hero-background-fullscreen` : `bg-${slots.length}`,
        src,
        type: 'background'
      });
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

  const promptGenRequest = `You are a world-class brand photographer and creative director.

Brand context: ${userRequest.substring(0, 800)}
Industry: ${industry}

For each image slot below, write a highly specific photorealistic image generation prompt.
Requirements:
- Match the brand's exact aesthetic, color palette, and mood
- Be completely specific to what that slot shows
- Make each prompt unique
- Always end with ", no text, no watermarks, no logos, professional photography"

Slots:
${slotsToProcess.map((s, i) => `${i}. "${s.id}"`).join('\n')}

Return ONLY a JSON array starting with [ immediately:
[{"index":0,"prompt":"...","aspect_ratio":"16:9"},...]

aspect_ratio: "16:9" for heroes/banners, "1:1" for products/portraits/cards, "4:3" for lifestyle`;

  let promptData = [];
  try {
    promptData = await callClaudeJson(promptGenRequest, 3000);
    console.log(`Job ${jobId} — Prompt generation succeeded: ${promptData.length} prompts`);
  } catch (error) {
    console.error(`Job ${jobId} — Prompt generation failed (${error.message}) — using fallback`);
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
      if (!promptEntry) return { ...slot, generatedImage: null };
      console.log(`Job ${jobId} — Generating [${i + 1}/${slotsToProcess.length}]: ${slot.id}`);
      const img = await generateImageWithRetry(promptEntry.prompt, promptEntry.aspect_ratio || '1:1', 2);
      if (img) console.log(`Job ${jobId} — ✓ [${i + 1}] success`);
      else console.error(`Job ${jobId} — ✗ [${i + 1}] failed after retries`);
      return { ...slot, generatedImage: img };
    })
  );

  const successCount = imageResults.filter(r => r.generatedImage).length;
  console.log(`Job ${jobId} — ${successCount}/${slotsToProcess.length} images successful`);

  for (const result of imageResults) {
    if (!result.generatedImage) continue;
    try {
      if (result.type === 'data-slot') {
        const eid = result.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(
          new RegExp(`(<img[^>]*src=")[^"]*("[^>]*data-slot="${eid}"[^>]*>)`, 'g'),
          `$1${result.generatedImage}$2`
        );
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

  const finalSizeMb = (html.length / 1024 / 1024).toFixed(2);
  console.log(`Job ${jobId} — Pass 3 complete. Final HTML: ${html.length} chars (${finalSizeMb}MB)`);
  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

app.post('/build-async', async (req, res) => {
  const { userRequest, contactEmail: directEmail } = req.body;

  // Extract contact email — either passed directly or embedded in userRequest
  const contactEmail = directEmail || extractContactEmail(userRequest);

  const jobId = Date.now().toString();
  jobs[jobId] = { status: 'pending', phase: 'starting', html: null, error: null };

  console.log(`Job ${jobId} started`);
  console.log(`userRequest length: ${userRequest?.length}`);
  console.log(`contactEmail: ${contactEmail || 'not provided'}`);
  console.log(`API key exists: ${!!process.env.ANTHROPIC_API_KEY}`);
  console.log(`Google API key exists: ${!!process.env.GOOGLE_API_KEY}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Connection', 'close');
  res.end(JSON.stringify({ jobId }));

  (async () => {
    try {
      // ── PASS 1: Full site structure, design, content, logo ───────────────
      console.log(`Job ${jobId} — Pass 1 starting (structure & design)`);
      jobs[jobId].phase = 'pass1';

      const pass1Html = await callClaude(MASTER_SYSTEM_PROMPT, userRequest, 24000);
      console.log(`Job ${jobId} — Pass 1 complete. HTML length: ${pass1Html.length}`);

      if (pass1Html.length < 5000) {
        throw new Error(`Pass 1 output too short (${pass1Html.length} chars)`);
      }

      // ── PASS 2: Interactivity + image slot tagging ───────────────────────
      jobs[jobId].phase = 'pass2';
      console.log(`Job ${jobId} — Pass 2 starting (interactivity + image slot tagging)`);

      const pass2Prompt = `You are an expert JavaScript developer and UX engineer.
Upgrade this HTML file with two goals:

GOAL 1 — COMPLETE INTERACTIVITY (every item below is mandatory):

NAVBAR (CRITICAL):
- Remove ANY background color from the navbar default CSS state
- navbar default: background: transparent !important; backdrop-filter: none !important;
- Add JS: window.addEventListener('scroll', () => { const nav = document.querySelector('nav, header, .navbar, #navbar, [class*="nav"]'); if(nav) nav.classList.toggle('scrolled', window.scrollY > 80); });
- Add CSS: nav.scrolled, header.scrolled, .navbar.scrolled, [class*="nav"].scrolled { background: rgba(10,10,10,0.97) !important; backdrop-filter: blur(20px) !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
- Mobile hamburger menu

CUSTOM CURSOR:
- 20px circle in accent color, fixed, pointer-events:none, z-index:9999
- Smooth lerp mouse follow
- Scales to 40px on hover over links/buttons
- NEVER cursor:none

FILTER TABS (CRITICAL — implement exactly this):
- Add data-tab="name" to every tab button
- Add data-tab-content="name" to every matching content section
- JavaScript:
  function initTabs() {
    const tabs = document.querySelectorAll('[data-tab]');
    const contents = document.querySelectorAll('[data-tab-content]');
    if (!tabs.length) return;
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        contents.forEach(c => { c.style.display = 'none'; c.style.opacity = '0'; });
        btn.classList.add('active');
        const content = document.querySelector('[data-tab-content="' + btn.dataset.tab + '"]');
        if (content) { content.style.display = 'block'; setTimeout(() => content.style.opacity = '1', 10); }
      });
    });
    tabs[0].click();
  }
  initTabs();

FAQ ACCORDION (CRITICAL):
- Every FAQ must have a complete written answer — write content if missing
- One open at a time with smooth animation

CAROUSELS:
- All prev/next buttons wrap around through all slides
- Auto-advance every 5 seconds
- Dots are clickable and update

COUNTERS: Count up on scroll using IntersectionObserver

FORMS: Validate required fields, show success message

SCROLL REVEALS:
- NEVER opacity:0 in CSS on content elements
- JS adds "js-ready" to body → CSS targets .js-ready .reveal → IntersectionObserver adds "revealed"

GOAL 2 — IMAGE SLOT TAGGING (CRITICAL):
Add data-slot to EVERY <img> tag — unique specific description of what image belongs there.
Good: data-slot="hero-background-dark-moody-coffee-shop-interior-warm-lighting"
Bad: data-slot="image-1" or data-slot="photo"

Do NOT change design, colors, fonts, or layout from Pass 1.
Return the COMPLETE updated HTML — every line, nothing truncated.

HTML:
${pass1Html}`;

      const pass2Html = await callClaude(
        'You are an expert JavaScript developer. Output ONLY a complete HTML file starting with <!DOCTYPE html>. Never truncate — return every line.',
        pass2Prompt,
        24000
      );

      console.log(`Job ${jobId} — Pass 2 complete. HTML length: ${pass2Html.length}`);

      // Inject Formsubmit contact email — works with no signup required
      const htmlWithForm = contactEmail
        ? injectContactEmail(pass2Html, contactEmail)
        : pass2Html;

      if (contactEmail) {
        console.log(`Job ${jobId} — Contact form injected for: ${contactEmail}`);
      }

      // ── PASS 3: Branded image generation & injection ─────────────────────
      jobs[jobId].phase = 'pass3';
      const finalHtml = await injectBrandedImages(htmlWithForm, userRequest, jobId);

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
  const { userRequest } = req.body;
  try {
    const html = await callClaude(MASTER_SYSTEM_PROMPT, userRequest, 16000);
    res.json({ html });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/test-image', async (req, res) => {
  console.log('Test image endpoint hit');
  const result = await generateImageWithRetry(
    'A premium luxury skincare serum bottle on white marble, cinematic lighting, no text, professional photography',
    '1:1',
    2
  );
  if (result) {
    const sizeKb = Math.round(result.length / 1024);
    res.json({ success: true, message: `Image generated and compressed — ${sizeKb}kb base64` });
  } else {
    res.json({ success: false, message: 'Image generation failed — check deploy logs' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Axier build server running on port ${PORT}`);
});
