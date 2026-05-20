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
You build stunning, award-winning websites that look like they cost $10,000-$50,000 to produce.
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
- CURSOR RULE: Always design a custom branded cursor overlay — a 20px circle in the site's primary accent color, fixed position, pointer-events:none, z-index:9999. Use JS mousemove with smooth lerp to follow the cursor. Scale to 40px on hover over links/buttons. NEVER cursor:none — default cursor always visible underneath.
- SCROLL REVEAL RULE: All content must be fully visible by default. Never set opacity:0 or visibility:hidden in CSS on content. JS adds "js-ready" class to body on DOMContentLoaded, then CSS targets .js-ready .reveal with opacity:0 and translateY(30px), then IntersectionObserver adds "revealed" class.

LOGO REQUIREMENTS (CRITICAL):
- The logo SVG will be provided to you as a <symbol id="brand-logo"> block — USE IT EXACTLY AS PROVIDED
- Place it in the navbar with: <svg class="logo-svg"><use href="#brand-logo"/></svg>
- Place it in the footer with: <svg class="logo-svg"><use href="#brand-logo"/></svg>
- Size it with CSS: .logo-svg { width: 180px; height: 45px; }
- DO NOT redesign or modify the provided logo

EVERY SITE MUST INCLUDE THESE SECTIONS (ALL REQUIRED — NO EXCEPTIONS):
1. Fixed navbar (transparent to solid on scroll) with provided SVG logo and nav links
2. Full-screen hero (100vh) with headline, subheading, CTAs, and hero background image
3. Stats/social proof bar with animated counters
4. Services or Products section with cards (minimum 6 items) with icons and full descriptions
5. About/Story section with text and image side by side
6. Featured work, portfolio, or process/steps section
7. Team or credentials section with portrait images and bios
8. Testimonials carousel with star ratings (minimum 3 testimonials)
9. FAQ accordion — minimum 6 questions each with 2-4 sentence answers — NEVER leave answers empty
10. Contact section with form using action="CONTACT_FORM_ENDPOINT" method="POST"
11. Footer with logo, links, social icons, and copyright

IMAGE REQUIREMENTS (CRITICAL):
- For EVERY image use an <img> tag with src="https://placehold.co/WIDTHxHEIGHT"
- hero: 1920x1080, team portraits: 400x400, service cards: 600x400, about: 800x600
- HERO SECTION: <img> absolutely positioned, position:absolute, top:0, left:0, width:100%, height:100%, object-fit:cover, z-index:0. Dark overlay div z-index:1. Content z-index:2.
- NO CSS background-image with real URLs anywhere
- NO Unsplash or external image URLs

NAVBAR (CRITICAL):
- Default state: background: transparent !important; backdrop-filter: none !important;
- NEVER add any background color to the navbar default state
- JS: window.addEventListener('scroll', () => { const nav = document.querySelector('nav, .navbar, header'); if(nav) nav.classList.toggle('scrolled', window.scrollY > 80); });
- CSS: nav.scrolled, .navbar.scrolled, header.scrolled { background: rgba(10,10,10,0.97) !important; backdrop-filter: blur(20px) !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }

FAQ (CRITICAL):
- Minimum 6 FAQ items
- Every single FAQ item MUST have a complete written answer of 2-4 sentences
- NEVER leave an answer empty or as placeholder text
- Clicking opens/closes with smooth animation — one open at a time

CONTACT FORM (CRITICAL):
- form action="CONTACT_FORM_ENDPOINT" method="POST"
- Include: Full Name, Email, Phone (optional), Message textarea, Submit button
- Hidden fields: <input type="hidden" name="_subject" value="New Enquiry">
- Hidden fields: <input type="hidden" name="_captcha" value="false">
- Dark styled inputs with accent color focus glow
- Success message shown after submit

FILTER TABS:
- data-tab="name" on buttons, data-tab-content="name" on content sections
- All tabs functional — clicking any tab shows its content

CAROUSELS:
- prev/next wrap around, auto-advance 5s, dots clickable

JAVASCRIPT REQUIREMENTS:
- Navbar scroll transparency to solid
- Custom branded cursor with lerp
- All tabs/filters working
- FAQ accordion with full answers
- Animated counters on scroll
- Carousel/slider
- Form validation + success state
- Smooth anchor scroll
- Mobile hamburger menu
- Scroll reveal with js-ready pattern

TECHNICAL:
- Single HTML file, CSS in <style>, JS in <script>
- Google Fonts via @import
- Minimum 1200 lines
- Pixel perfect mobile and desktop`;

const HTML_OUTPUT_RULES = `

ABSOLUTE OUTPUT RULES:
- Start with <!DOCTYPE html> — nothing before it
- End with </html> — nothing after it
- No markdown fences, no explanation, no commentary
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
  const cleaned = text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

function injectContactEmail(html, contactEmail) {
  if (!contactEmail) return html;
  return html.replace(/CONTACT_FORM_ENDPOINT/g, `https://formsubmit.co/${contactEmail.trim()}`);
}

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
    const inputBuffer = Buffer.from(matches[2], 'base64');
    const outputBuffer = await sharp(inputBuffer)
      .resize(targetWidthPx, null, { withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: 82, progressive: true }).toBuffer();
    const originalKb = Math.round(inputBuffer.length / 1024);
    const compressedKb = Math.round(outputBuffer.length / 1024);
    console.log(`Image compressed: ${originalKb}kb -> ${compressedKb}kb`);
    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Image compression error:', error.message);
    return base64DataUrl;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO GENERATION — Gemini Flash generates professional SVG logo
// ─────────────────────────────────────────────────────────────────────────────

async function generateLogoWithGemini(brandName, industry, colorPalette, userRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { console.log('No Google API key — skipping logo generation'); return null; }

    const logoPrompt = `You are a world-class SVG logo designer. Create a professional SVG logo for this brand.

Brand: ${brandName}
Industry: ${industry}
Colors: ${colorPalette}
Brief: ${userRequest.substring(0, 400)}

Design rules:
- Clean, geometric icon mark — simple shapes only (circles, lines, arcs, polygons)
- NO abstract blobs, NO complex organic paths, NO broken shapes
- Icon + wordmark side by side
- Professional enough for a business card
- The icon must be instantly recognizable and relevant to the industry
- Use the provided brand colors

Output ONLY a valid SVG <symbol> element in this exact format:
<symbol id="brand-logo" viewBox="0 0 280 60">
  <!-- icon mark on the left -->
  <!-- wordmark text on the right -->
</symbol>

No explanation. No markdown. Just the <symbol> element starting with <symbol and ending with </symbol>.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: logoPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) { console.error('Logo gen error:', JSON.stringify(data)); return null; }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) { console.log('Logo gen: no text returned'); return null; }

    const symbolMatch = text.match(/<symbol[\s\S]*?<\/symbol>/i);
    if (!symbolMatch) { console.log('Logo gen: no symbol element found'); return null; }

    console.log('Logo generated successfully via Gemini');
    return symbolMatch[0];

  } catch (error) {
    console.error('Logo generation error:', error.message);
    return null;
  }
}

function extractBrandInfo(userRequest) {
  const text = userRequest.toLowerCase();

  let brandName = 'Brand';
  const nameMatch = userRequest.match(/(?:called|named|for)\s+([A-Z][A-Za-z\s&]+?)(?:\s*[—\-,.]|\s+is\s|\s+we\s|\s+a\s)/);
  if (nameMatch) brandName = nameMatch[1].trim();

  let industry = 'business';
  if (text.includes('plumb') || text.includes('hvac') || text.includes('electrical') || text.includes('trades') || text.includes('contractor')) industry = 'trades';
  else if (text.includes('coffee') || text.includes('cafe') || text.includes('espresso')) industry = 'coffee';
  else if (text.includes('spa') || text.includes('wellness') || text.includes('yoga')) industry = 'wellness';
  else if (text.includes('med spa') || text.includes('medspa') || text.includes('aesthetic') || text.includes('injectable')) industry = 'aesthetics_clinic';
  else if (text.includes('restaurant') || text.includes('dining') || text.includes('food')) industry = 'restaurant';
  else if (text.includes('fitness') || text.includes('gym') || text.includes('workout')) industry = 'fitness';
  else if (text.includes('real estate') || text.includes('property')) industry = 'real_estate';
  else if (text.includes('tech') || text.includes('software') || text.includes('saas')) industry = 'technology';
  else if (text.includes('medical') || text.includes('clinic')) industry = 'medical';
  else if (text.includes('jewelry') || text.includes('jewellery')) industry = 'jewelry';
  else if (text.includes('fashion') || text.includes('clothing') || text.includes('apparel')) industry = 'fashion';
  else if (text.includes('skincare') || text.includes('beauty') || text.includes('cosmetic')) industry = 'skincare';
  else if (text.includes('hotel') || text.includes('resort') || text.includes('travel')) industry = 'hospitality';
  else if (text.includes('music') || text.includes('band') || text.includes('artist')) industry = 'music';
  else if (text.includes('photography') || text.includes('photographer')) industry = 'photography';
  else if (text.includes('store') || text.includes('shop') || text.includes('ecommerce')) industry = 'ecommerce';
  else if (text.includes('portfolio') || text.includes('agency') || text.includes('creative')) industry = 'portfolio';

  const colorKeywords = ['navy', 'orange', 'gold', 'teal', 'green', 'blue', 'red', 'black', 'white', 'grey', 'purple', 'amber', 'steel', 'charcoal', 'cream', 'beige'];
  const foundColors = colorKeywords.filter(c => text.includes(c));
  const colorPalette = foundColors.length > 0 ? foundColors.join(', ') : 'professional industry-appropriate colors';

  return { brandName, industry, colorPalette };
}

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
// INDUSTRY DETECTION + IMAGE CAP
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
  if (text.includes('plumb') || text.includes('hvac') || text.includes('electrician') || text.includes('contractor') || text.includes('trades')) return 'trades';
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
    trades: 10, music: 8, robotics: 8, portfolio: 8, business: 8,
    saas: 6, technology: 6,
  };
  return caps[industry] || 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE GENERATION — Gemini Pro with fallback + retry
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
// SLOT EXTRACTION — catches <img> tags, placeholders, and CSS background-image
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
      slots.push({ id: isHero ? 'hero-background-fullscreen' : `bg-${slots.length}`, src, type: 'background' });
    }
  }
  return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASS 3 — CONTEXT-AWARE BRANDED IMAGE INJECTION
// ─────────────────────────────────────────────────────────────────────────────

async function injectBrandedImages(html, userRequest, jobId) {
  console.log(`Job ${jobId} — Pass 3 starting (image generation)`);
  const industry = detectIndustry(userRequest);
  const imageCap = getImageCap(industry);
  console.log(`Job ${jobId} — Industry: ${industry} | Cap: ${imageCap} images`);

  const rawSlots = extractImageSlots(html);
  console.log(`Job ${jobId} — Found ${rawSlots.length} slots in full HTML`);
  if (rawSlots.length === 0) { console.log(`Job ${jobId} — No image slots, skipping`); return html; }

  const slotsToProcess = rawSlots.slice(0, imageCap);
  console.log(`Job ${jobId} — Processing ${slotsToProcess.length} slots`);

  const promptGenRequest = `You are a world-class brand photographer and creative director.
Brand context: ${userRequest.substring(0, 800)}
Industry: ${industry}
For each image slot, write a highly specific photorealistic image generation prompt.
- Match the brand aesthetic, color palette, and mood exactly
- Be completely specific to what that slot shows
- Make each prompt unique
- End with ", no text, no watermarks, no logos, professional photography"
Slots:
${slotsToProcess.map((s, i) => `${i}. "${s.id}"`).join('\n')}
Return ONLY a JSON array starting with [ immediately:
[{"index":0,"prompt":"...","aspect_ratio":"16:9"},...]
aspect_ratio: "16:9" heroes/banners, "1:1" products/portraits/cards, "4:3" lifestyle`;

  let promptData = [];
  try {
    promptData = await callClaudeJson(promptGenRequest, 3000);
    console.log(`Job ${jobId} — Prompt generation succeeded: ${promptData.length} prompts`);
  } catch (error) {
    console.error(`Job ${jobId} — Prompt generation failed — using fallback`);
    promptData = slotsToProcess.map((s, i) => ({
      index: i,
      prompt: `Premium ${industry} brand photography, cinematic lighting, no text, no watermarks, professional photography`,
      aspect_ratio: (s.id.toLowerCase().includes('hero') || s.id.toLowerCase().includes('background')) ? '16:9' : '1:1'
    }));
  }

  console.log(`Job ${jobId} — Generating ${slotsToProcess.length} images in parallel`);
  const imageResults = await Promise.all(
    slotsToProcess.map(async (slot, i) => {
      const promptEntry = promptData[i] || promptData.find(p => p.index === i);
      if (!promptEntry) return { ...slot, generatedImage: null };
      console.log(`Job ${jobId} — Generating [${i + 1}/${slotsToProcess.length}]: ${slot.id}`);
      const img = await generateImageWithRetry(promptEntry.prompt, promptEntry.aspect_ratio || '1:1', 2);
      if (img) console.log(`Job ${jobId} — [${i + 1}] success`);
      else console.error(`Job ${jobId} — [${i + 1}] failed`);
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
        html = html.replace(new RegExp(`(<img[^>]*src=")[^"]*("[^>]*data-slot="${eid}"[^>]*>)`, 'g'), `$1${result.generatedImage}$2`);
        html = html.replace(new RegExp(`(<img[^>]*data-slot="${eid}"[^>]*src=")[^"]*("[^>]*>)`, 'g'), `$1${result.generatedImage}$2`);
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

      // ── LOGO: Gemini generates professional SVG logo ──────────────────────
      console.log(`Job ${jobId} — Logo generation starting`);
      jobs[jobId].phase = 'logo';
      const { brandName, industry, colorPalette } = extractBrandInfo(userRequest);
      console.log(`Job ${jobId} — Brand: ${brandName} | Industry: ${industry} | Colors: ${colorPalette}`);
      const logoSvg = await generateLogoWithGemini(brandName, industry, colorPalette, userRequest);
      if (logoSvg) console.log(`Job ${jobId} — Logo generated successfully`);
      else console.log(`Job ${jobId} — Logo generation failed — Claude will design its own`);

      const pass1UserRequest = logoSvg
        ? `${userRequest}\n\n<!-- BRAND LOGO — Use this exact SVG symbol in navbar and footer -->\n<svg style="display:none">${logoSvg}</svg>\n\nIMPORTANT: The brand logo SVG symbol has been provided above with id="brand-logo". Use it exactly as provided in both navbar and footer with <use href="#brand-logo"/>. Do not redesign it.`
        : userRequest;

      // ── PASS 1: Full site structure, design, content — 32k tokens ─────────
      console.log(`Job ${jobId} — Pass 1 starting (structure & design)`);
      jobs[jobId].phase = 'pass1';
      const pass1Html = await callClaude(MASTER_SYSTEM_PROMPT, pass1UserRequest, 32000);
      console.log(`Job ${jobId} — Pass 1 complete. HTML length: ${pass1Html.length}`);
      if (pass1Html.length < 5000) throw new Error(`Pass 1 output too short (${pass1Html.length} chars)`);

      // ── PASS 2: Full JS interactivity + image slot tagging — 32k tokens ───
      jobs[jobId].phase = 'pass2';
      console.log(`Job ${jobId} — Pass 2 starting (interactivity + image slot tagging)`);

      const pass2Prompt = `You are an expert JavaScript developer and UX engineer.
Upgrade this HTML file with two goals:

GOAL 1 — COMPLETE INTERACTIVITY (every single item is mandatory):

NAVBAR (CRITICAL — do this first):
- Find the navbar/header element and remove ANY existing background color from its default CSS
- Set default CSS: background: transparent !important; backdrop-filter: none !important;
- Add this exact JS:
  (function() {
    const nav = document.querySelector('nav, header, .navbar, #navbar, #header');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 80) {
        nav.style.background = 'rgba(10,10,10,0.97)';
        nav.style.backdropFilter = 'blur(20px)';
        nav.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
      } else {
        nav.style.background = 'transparent';
        nav.style.backdropFilter = 'none';
        nav.style.borderBottom = 'none';
      }
    });
  })();

CUSTOM CURSOR (CRITICAL — must be animated):
- Create: <div id="custom-cursor"></div> at top of body
- CSS: #custom-cursor { position:fixed; width:20px; height:20px; border-radius:50%; pointer-events:none; z-index:9999; transition: width 0.2s, height 0.2s, opacity 0.2s; mix-blend-mode:difference; }
- Set background color to the site's primary accent color
- JS lerp animation:
  (function() {
    let curX = 0, curY = 0, tgX = 0, tgY = 0;
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;
    document.addEventListener('mousemove', e => { tgX = e.clientX; tgY = e.clientY; });
    function animCursor() {
      curX += (tgX - curX) / 8;
      curY += (tgY - curY) / 8;
      cursor.style.transform = 'translate(' + (curX - 10) + 'px,' + (curY - 10) + 'px)';
      requestAnimationFrame(animCursor);
    }
    animCursor();
    document.querySelectorAll('a,button,[role="button"]').forEach(el => {
      el.addEventListener('mouseenter', () => { cursor.style.width='40px'; cursor.style.height='40px'; cursor.style.opacity='0.7'; });
      el.addEventListener('mouseleave', () => { cursor.style.width='20px'; cursor.style.height='20px'; cursor.style.opacity='1'; });
    });
  })();
- NEVER set cursor:none anywhere

FILTER TABS (CRITICAL — all must work):
- Add data-tab="tabname" to every tab/filter button
- Add data-tab-content="tabname" to every matching content container
- JS:
  (function() {
    const tabs = document.querySelectorAll('[data-tab]');
    const contents = document.querySelectorAll('[data-tab-content]');
    if (!tabs.length) return;
    function showTab(name) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
      contents.forEach(c => { c.style.display = c.dataset.tabContent === name ? 'block' : 'none'; });
    }
    tabs.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
    showTab(tabs[0].dataset.tab);
  })();

FAQ ACCORDION (CRITICAL):
- Every FAQ item MUST have a complete written answer — if any answer is missing write 2-4 sentences now
- One open at a time, smooth max-height animation

CAROUSELS: All prev/next wrap around, auto-advance 5s, dots clickable and update
COUNTERS: Count up using IntersectionObserver when scrolled into view
FORMS: Validate required fields, show styled success message on submit
SMOOTH SCROLL: All anchor links scroll smoothly
MOBILE MENU: Hamburger opens/closes nav overlay

SCROLL REVEALS:
- NEVER set opacity:0 in CSS on content elements
- JS on DOMContentLoaded: document.body.classList.add('js-ready'); new IntersectionObserver((entries) => { entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('revealed'); }); }, {threshold:0.1}).observe each .reveal element
- CSS: .js-ready .reveal { opacity:0; transform:translateY(30px); transition:opacity 0.7s ease,transform 0.7s ease; } .js-ready .reveal.revealed { opacity:1; transform:translateY(0); }

GOAL 2 — IMAGE SLOT TAGGING (CRITICAL):
Add data-slot to EVERY <img> tag — unique specific description of what image belongs there.
Good: data-slot="hero-background-professional-plumber-toronto-basement-dark-pipes"
Bad: data-slot="image-1" or data-slot="photo" or data-slot="img"
Every single <img> tag gets a unique descriptive data-slot — no exceptions.

Do NOT change any design, colors, fonts, or layout from Pass 1.
Return the COMPLETE updated HTML file — every line, nothing truncated or abbreviated.

HTML TO UPGRADE:
${pass1Html}`;

      const pass2Html = await callClaude(
        'You are an expert JavaScript developer. Output ONLY a complete HTML file starting with <!DOCTYPE html>. Return every single line — never truncate or abbreviate.',
        pass2Prompt,
        32000
      );
      console.log(`Job ${jobId} — Pass 2 complete. HTML length: ${pass2Html.length}`);

      // Inject Formsubmit contact email — no signup required
      const htmlWithForm = contactEmail ? injectContactEmail(pass2Html, contactEmail) : pass2Html;
      if (contactEmail) console.log(`Job ${jobId} — Contact form injected for: ${contactEmail}`);

      // ── PASS 3: Branded image generation & injection ──────────────────────
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
    'A premium luxury skincare serum bottle on white marble, cinematic lighting, no text, professional photography', '1:1', 2
  );
  if (result) {
    const sizeKb = Math.round(result.length / 1024);
    res.json({ success: true, message: `Image generated and compressed — ${sizeKb}kb base64` });
  } else {
    res.json({ success: false, message: 'Image generation failed — check deploy logs' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => { console.log(`Axier build server running on port ${PORT}`); });
