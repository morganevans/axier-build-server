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

function detectIndustry(text) {
  text = text.toLowerCase();
  if (text.includes('coffee') || text.includes('cafe') || text.includes('espresso') || text.includes('roast')) return 'coffee';
  if (text.includes('fashion') || text.includes('clothing') || text.includes('apparel') || text.includes('wear')) return 'fashion';
  if (text.includes('restaurant') || text.includes('dining') || text.includes('food') || text.includes('bistro')) return 'restaurant';
  if (text.includes('fitness') || text.includes('gym') || text.includes('workout') || text.includes('training')) return 'fitness';
  if (text.includes('tech') || text.includes('software') || text.includes('saas') || text.includes('app')) return 'technology';
  if (text.includes('real estate') || text.includes('property') || text.includes('homes') || text.includes('realty')) return 'real_estate';
  if (text.includes('wellness') || text.includes('spa') || text.includes('yoga') || text.includes('meditation')) return 'wellness';
  if (text.includes('skincare') || text.includes('beauty') || text.includes('cosmetic') || text.includes('botanical')) return 'skincare';
  if (text.includes('jewelry') || text.includes('jewellery') || text.includes('luxury') || text.includes('fine')) return 'luxury';
  if (text.includes('hotel') || text.includes('resort') || text.includes('travel') || text.includes('hospitality')) return 'hospitality';
  if (text.includes('music') || text.includes('artist') || text.includes('band') || text.includes('studio')) return 'music';
  if (text.includes('photography') || text.includes('photographer') || text.includes('photo')) return 'photography';
  if (text.includes('robot') || text.includes('robotics') || text.includes('autonomous') || text.includes('nexery')) return 'robotics';
  return 'business';
}

function buildImagePrompts(userRequest, industry) {
  const industryPrompts = {
    coffee: {
      hero: 'cinematic coffee shop interior, warm amber lighting, espresso machine steaming, dark wood surfaces, moody atmospheric photography, high-end editorial style, no text',
      product: 'artisan coffee cup latte art on dark slate, professional food photography, bokeh background, warm tones, luxury cafe aesthetic, no text',
      lifestyle: 'person enjoying coffee in minimalist luxury cafe, natural window light, editorial lifestyle photography, sophisticated atmosphere, no text',
      texture: 'roasted coffee beans close up macro photography, dark background, warm brown tones, textural detail, premium quality aesthetic, no text'
    },
    fashion: {
      hero: 'luxury fashion editorial photography, dramatic lighting, dark moody background, high fashion aesthetic, cinematic composition, no text, no people',
      product: 'luxury clothing flat lay on dark marble, professional product photography, editorial styling, premium fashion brand aesthetic, no text',
      lifestyle: 'high fashion editorial lifestyle, sophisticated model in luxury clothing, dramatic lighting, Vogue magazine aesthetic, cinematic, no text',
      texture: 'luxury fabric texture close up, silk or cashmere detail, dark moody lighting, premium material photography, no text'
    },
    restaurant: {
      hero: 'fine dining restaurant interior, candlelight ambiance, dark elegant atmosphere, luxury table setting, cinematic moody photography, no text',
      product: 'gourmet dish plating on dark slate, professional food photography, dramatic lighting, Michelin star aesthetic, no text',
      lifestyle: 'couple dining in luxury restaurant, intimate lighting, editorial lifestyle photography, sophisticated atmosphere, no text',
      texture: 'fresh premium ingredients on dark surface, chef knife, culinary detail photography, moody dramatic lighting, no text'
    },
    fitness: {
      hero: 'modern luxury gym interior, dramatic lighting, premium equipment, cinematic wide angle, athletic aesthetic, no text, no people',
      product: 'premium fitness equipment close up, dark dramatic lighting, high contrast, athletic performance aesthetic, no text',
      lifestyle: 'athlete training in luxury gym, dramatic side lighting, editorial sports photography, peak performance aesthetic, no text',
      texture: 'athletic texture detail, dark background, high contrast dramatic lighting, performance material close up, no text'
    },
    skincare: {
      hero: 'luxury skincare product arrangement, dark background, gold accents, botanical elements, dramatic studio lighting, premium brand aesthetic, no text',
      product: 'premium skincare serum bottle on dark marble, professional product photography, gold foil details, botanical ingredients, luxury aesthetic, no text',
      lifestyle: 'luxury skincare ritual, woman applying serum, soft dramatic lighting, editorial beauty photography, sophisticated aesthetic, no text',
      texture: 'botanical ingredients close up, dark moody background, macro photography, natural luxury aesthetic, leaves herbs flowers, no text'
    },
    technology: {
      hero: 'minimal dark tech workspace, laptop glowing screen, dark desk setup, premium technology aesthetic, cinematic moody lighting, no text',
      product: 'premium tech device on dark minimal surface, professional product photography, dramatic side lighting, high tech aesthetic, no text',
      lifestyle: 'professional working on minimal tech setup, dark modern office, editorial photography, sophisticated digital aesthetic, no text',
      texture: 'dark circuit board or code on screen close up, dramatic lighting, technology texture detail, no text'
    },
    robotics: {
      hero: 'futuristic industrial robotics facility, electric blue lighting, dark steel environment, cinematic wide angle, SpaceX aesthetic, no text',
      product: 'precision robotic arm close up, dark background, electric blue glow, dramatic studio lighting, engineering aesthetic, no text',
      lifestyle: 'engineer working with advanced robotics, dark lab environment, dramatic lighting, high-tech cinematic, no text',
      texture: 'industrial metal surface close up, dark steel texture, electric blue highlights, precision engineering detail, no text'
    },
    luxury: {
      hero: 'luxury jewelry on dark velvet, dramatic studio lighting, gold and diamond details, premium brand photography, cinematic, no text',
      product: 'luxury product close up on dark marble, professional product photography, dramatic lighting, premium aesthetic, no text',
      lifestyle: 'luxury lifestyle editorial, sophisticated setting, dramatic lighting, high-end brand aesthetic, no text',
      texture: 'luxury material texture close up, gold or precious metal detail, dark background, premium quality photography, no text'
    },
    hospitality: {
      hero: 'luxury hotel lobby or suite interior, dramatic lighting, premium materials, cinematic architecture photography, no text, no people',
      product: 'luxury hotel room detail, premium amenities, dramatic lighting, five star aesthetic, no text',
      lifestyle: 'luxury resort lifestyle, pool at dusk, dramatic sky, editorial travel photography, sophisticated atmosphere, no text',
      texture: 'luxury hotel detail close up, premium fabric or marble texture, dramatic lighting, five star quality, no text'
    },
    wellness: {
      hero: 'luxury spa interior, zen atmosphere, candlelight, dark moody tones, premium wellness aesthetic, cinematic photography, no text, no people',
      product: 'wellness products on dark stone, botanical elements, dramatic soft lighting, premium spa aesthetic, no text',
      lifestyle: 'yoga meditation in luxury setting, dramatic natural light, editorial wellness photography, peaceful sophisticated atmosphere, no text',
      texture: 'natural wellness ingredients close up, dark moody background, botanical texture, premium organic aesthetic, no text'
    },
    real_estate: {
      hero: 'luxury modern home exterior at dusk, dramatic sky, premium architecture photography, cinematic lighting, no text',
      product: 'luxury interior living room, dramatic lighting, premium materials, architectural photography, sophisticated design, no text',
      lifestyle: 'luxury home lifestyle, terrace view at sunset, editorial real estate photography, aspirational living, no text',
      texture: 'premium architectural detail close up, marble or wood texture, dramatic lighting, luxury material photography, no text'
    },
    music: {
      hero: 'music studio dark dramatic atmosphere, vintage equipment glowing, cinematic moody photography, creative aesthetic, no text',
      product: 'musical instrument dramatic close up, dark background, studio lighting, premium photography, no text',
      lifestyle: 'musician in dramatic studio lighting, artistic editorial photography, creative atmosphere, no text',
      texture: 'music equipment texture detail, dark moody background, dramatic lighting, creative studio aesthetic, no text'
    },
    photography: {
      hero: 'dramatic dark photography studio setup, camera equipment, moody cinematic atmosphere, premium photography aesthetic, no text',
      product: 'premium camera on dark surface, dramatic lighting, professional photography equipment, no text',
      lifestyle: 'photographer working in dramatic light, editorial photography, cinematic composition, creative atmosphere, no text',
      texture: 'camera lens or film texture close up, dark background, dramatic lighting, photography detail, no text'
    },
    business: {
      hero: 'modern luxury office interior, dramatic lighting, premium materials, cinematic business photography, no text, no people',
      product: 'premium business product or service visualization, dark minimal background, dramatic lighting, no text',
      lifestyle: 'professional business setting, editorial photography, sophisticated atmosphere, no text',
      texture: 'premium business material texture, dark background, dramatic lighting, professional aesthetic, no text'
    }
  };

  return industryPrompts[industry] || industryPrompts.business;
}

async function generateImage(prompt, aspectRatio = '16:9') {
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

async function injectBrandedImages(html, userRequest, jobId) {
  console.log(`Job ${jobId} — Pass 3 starting (image generation)`);

  const industry = detectIndustry(userRequest);
  const prompts = buildImagePrompts(userRequest, industry);

  console.log(`Job ${jobId} — Detected industry: ${industry}`);

  const [heroImg, productImg, lifestyleImg, textureImg] = await Promise.all([
    generateImage(prompts.hero, '16:9'),
    generateImage(prompts.product, '1:1'),
    generateImage(prompts.lifestyle, '4:3'),
    generateImage(prompts.texture, '4:3')
  ]);

  console.log(`Job ${jobId} — Images generated: hero=${!!heroImg}, product=${!!productImg}, lifestyle=${!!lifestyleImg}, texture=${!!textureImg}`);

  // Direct regex injection — no Claude call, no token limit issues
  if (heroImg) {
    // Replace background-image CSS with hero
    html = html.replace(
      /background-image:\s*url\(['"]?(?!data:)[^'")\s]*['"]?\)/gi,
      `background-image: url('${heroImg}')`
    );
    // Replace hero img tags
    html = html.replace(
      /<img([^>]*?)class="([^"]*hero[^"]*)"([^>]*?)>/gi,
      `<img$1class="$2"$3 src="${heroImg}" style="width:100%;height:100%;object-fit:cover;">`
    );
    // Replace src with hero/banner/placeholder keywords
    html = html.replace(
      /src="[^"]*(?:hero|banner|header-img|hero-img)[^"]*"/gi,
      `src="${heroImg}"`
    );
  }

  if (productImg) {
    html = html.replace(
      /<img([^>]*?)class="([^"]*product[^"]*)"([^>]*?)>/gi,
      `<img$1class="$2"$3 src="${productImg}" style="width:100%;height:100%;object-fit:cover;">`
    );
    html = html.replace(
      /src="[^"]*(?:product|item|card-img|service-img)[^"]*"/gi,
      `src="${productImg}"`
    );
  }

  if (lifestyleImg) {
    html = html.replace(
      /<img([^>]*?)class="([^"]*(?:lifestyle|about|team)[^"]*)"([^>]*?)>/gi,
      `<img$1class="$2"$3 src="${lifestyleImg}" style="width:100%;height:100%;object-fit:cover;">`
    );
    html = html.replace(
      /src="[^"]*(?:lifestyle|about|team-img)[^"]*"/gi,
      `src="${lifestyleImg}"`
    );
  }

  if (textureImg) {
    html = html.replace(
      /src="[^"]*(?:texture|bg-img|background-img|pattern)[^"]*"/gi,
      `src="${textureImg}"`
    );
  }

  // Replace any remaining placeholder image paths (common patterns Claude uses)
  const placeholderPatterns = [
    /src="placeholder[^"]*"/gi,
    /src="[^"]*placeholder[^"]*"/gi,
    /src="https:\/\/via\.placeholder[^"]*"/gi,
    /src="https:\/\/placehold[^"]*"/gi,
    /src="[^"]*\/images\/[^"]*\.(?:jpg|jpeg|png|webp)"/gi,
  ];

  let imgIndex = 0;
  const imgPool = [heroImg, productImg, lifestyleImg, textureImg].filter(Boolean);

  if (imgPool.length > 0) {
    for (const pattern of placeholderPatterns) {
      html = html.replace(pattern, () => {
        const img = imgPool[imgIndex % imgPool.length];
        imgIndex++;
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

      // PASS 3: Image Generation
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
