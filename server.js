const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const jobs = {};

// ─────────────────────────────────────────────────────────────────────────────
// PASS 1 — MASTER PROMPT
// Delivers complete site with ALL JS working. Pass 2 is surgical only.
// ─────────────────────────────────────────────────────────────────────────────

const MASTER_SYSTEM_PROMPT = `You are the world's best brand identity designer and frontend developer combined.
You build stunning, award-winning websites that look like they cost $10,000–$50,000 to produce.
Every site is a complete, single HTML file with all CSS and JS included and fully working.

════════════════════════════════════════════════════════════════════════
STEP 1 — DESIGN THE BRAND IDENTITY FIRST (before writing any HTML)
This is the most important step. The entire site derives from the brand.
════════════════════════════════════════════════════════════════════════

Before writing a single line of HTML, mentally design:
  A) The logo mark + wordmark
  B) The color palette (3-4 vars)
  C) The typography pairing
  D) The visual tone and texture language

Then build the ENTIRE site to match that brand identity.

──── A) LOGO — NON-NEGOTIABLE QUALITY STANDARD ────

The logo lives in: <symbol id="brand-logo" viewBox="0 0 300 70">
Placed inside <svg style="display:none"> at top of <body>.
Used everywhere as: <svg style="width:200px;height:50px;display:block"><use href="#brand-logo"/></svg>

THE ICON MARK (left ~65×65 of the viewBox):
Choose ONE of these construction methods — execute it with mastery:

METHOD A — COMPOUND OVERLAP MARK:
  Take 2-3 geometric primitives (circles, ellipses, polygons, arcs).
  Offset or rotate them so they partially overlap.
  Use <clipPath> so the overlap zone shows a different fill (the accent color).
  Outer shapes: 2-3px stroke in a secondary color, semi-transparent fill.
  Result: a layered, dimensional mark that looks engineered.
  Example for aerospace: two ellipses at 45° angles, overlap zone filled electric yellow,
  outer rings thin cyan strokes — suggesting orbital intersection paths.

METHOD B — DECONSTRUCTED LETTERFORM:
  Take the brand's first letter. Break it into 2-4 thick rectangular/polygonal strokes.
  Recompose with deliberate spacing, rotation, or extension beyond the bounding box.
  Add one accent element: a dot, arc, underline, or encircling ring in the accent color.
  Font weight equivalent: 900. Stroke ends: square caps for tech, round for organic brands.
  Example: "A" as two thick angled rects (fill: white) + accent-colored crossbar rect
  + thin partial circle arc sweeping from top-left to bottom-right.

METHOD C — CONCEPT SYMBOL:
  A single geometric concept that represents the brand's core idea.
  Built ONLY from SVG primitives: rect, circle, ellipse, polygon, path, line.
  Must use a <linearGradient> or <radialGradient> inside <defs> for at least one element.
  Must have a <filter> with feGaussianBlur for a subtle glow on the key element.
  Industry examples:
  - Aerospace: tapered exhaust plume polygon (gradient: accent→transparent) + two swept
    trajectory arcs as thick strokes, suggesting a rocket's path continuing off-mark
  - Medical/aesthetics: a stylized cell or droplet — teardrop polygon + inner circle
    offset upward, gradient fill from accent to deeper shade
  - Trades: isometric cube corner — three rhombus shapes, each a different brand shade,
    creating a 3D block illusion from flat geometry
  - Tech/SaaS: three concentric partial arcs (like a signal/wifi) rotated 45°,
    each arc a different opacity of the accent color, center dot filled solid
  - Fitness: a dynamic forward-slash shape (thick, rounded ends) with a circular
    weight disc at each tip — bold, kinetic, immediately readable
  - Coffee: a side-profile cup trapezoid + steam as a triple sine-wave path,
    cup filled with gradient from dark espresso to warm amber

ICON MUST-HAVES (every single one):
  ✓ Uses 2-3 colors from the brand palette — NOT just white/grey
  ✓ Has visual weight — at least one filled shape, not just thin outlines
  ✓ Contains a <linearGradient> or <radialGradient> inside <defs>
  ✓ Contains a <filter id="glow"> with feGaussianBlur stdDeviation="3" for premium feel
  ✓ Clearly readable and recognizable at 35px rendered height
  ✓ Feels engineered and intentional — not clip-art, not a default icon set

THE WORDMARK (right side, ~220px wide):
Choose ONE technique:

TECHNIQUE 1 — SPLIT COLOR:
  Brand name in ALL CAPS, font-size 26-28, font-weight 800, letter-spacing 4+.
  One letter or syllable rendered in accent color, rest in white.
  Tagline or descriptor below at font-size 9, letter-spacing 3, fill: rgba(255,255,255,0.5).
  A 1px horizontal rule between name and tagline in accent color at 40% opacity.

TECHNIQUE 2 — STACKED BADGE:
  Brand name bold + large on top line.
  Descriptor/industry text below in lighter weight, spaced out.
  Thin accent-colored rectangle (2px tall, 30px wide) as a divider between lines.

TECHNIQUE 3 — OUTLINED CONTRAST:
  Alternate letters: odd ones filled white, even ones stroke-only (fill:none, stroke:accent, stroke-width:1.5).
  Creates editorial high-fashion feel. Bold font-weight 900.

──── B) COLOR PALETTE ────
Define as CSS vars on :root. Pick unexpected, industry-right colors.
Required vars:
  --c-bg: main dark background (almost never pure black — use #050510, #0a0806, #0d0d0a etc)
  --c-surface: card/panel background (slightly lighter than bg)
  --c-accent: the electric pop color — this defines the brand personality
  --c-accent2: secondary accent for gradients and hover states
  --c-text: near-white body text
  --c-text-muted: 50-60% opacity text

Unexpected accent color ideas (do NOT default to safe choices):
  Aerospace/tech: #E8FF00 acid yellow, #FF3CAC hot magenta, #00FFD1 electric teal
  Medical/luxury: #C8A97E warm gold, #E8C4B8 blush rose, #A8D8A8 sage
  Trades/industrial: #FF6B35 construction orange, #FFD23F safety yellow, #06FFA5 electric green
  Fitness/sport: #39FF14 neon green, #FF006E neon pink, #FB5607 vivid orange
  Coffee/food: #E8C547 warm amber, #FF8C42 citrus, #6BCB77 fresh herb
  Finance/SaaS: #7C3AED deep violet, #2563EB royal blue, #059669 emerald

──── C) TYPOGRAPHY ────
Import 2 Google Fonts — one display, one body.
Display font examples by industry:
  Aerospace/tech: Orbitron, Rajdhani, Space Grotesk, Exo 2
  Luxury/fashion: Cormorant Garamond, Playfair Display, DM Serif Display
  Trades/industrial: Oswald, Barlow Condensed, Anton
  Fitness: Bebas Neue, Black Han Sans, Russo One
  Medical/wellness: Josefin Sans, Nunito, Lato
  Creative/portfolio: Syne, Cabinet Grotesk, Clash Display

Body font: always pair with a clean readable sans (Inter, DM Sans, Manrope, Plus Jakarta Sans)

──── D) VISUAL TONE ────
Apply consistently across every section:
  - Dark backgrounds with subtle texture (CSS noise via SVG filter, or radial gradients)
  - Sections separated by: angled clip-path dividers, or full-bleed accent strips, or gradient fades
  - Cards: glass morphism (backdrop-filter:blur + semi-transparent border) OR dark solid with accent border-left
  - All CTAs: accent color background, dark text, subtle box-shadow glow matching accent color

════════════════════════════════════════════════════════════════════════
STEP 2 — BUILD ALL 11 SECTIONS (ALL REQUIRED — ZERO EXCEPTIONS)
════════════════════════════════════════════════════════════════════════

1. FIXED NAVBAR
   - position:fixed, top:0, width:100%, z-index:1000
   - Default: background:transparent, backdrop-filter:none
   - SVG logo (use href="#brand-logo") on left
   - All nav links in center/right — link to every section via #id anchors
   - CTA button (accent color) on far right
   - Mobile: hamburger icon toggles fullscreen nav overlay

2. HERO (100vh, full screen)
   - <img> for hero background: position:absolute, top:0, left:0, width:100%, height:100%, object-fit:cover, z-index:0
   - Dark overlay: position:absolute, inset:0, background:linear-gradient(to bottom, rgba(bg,0.7), rgba(bg,0.9)), z-index:1
   - All hero content: position:relative, z-index:2
   - Headline: font-size clamp(3rem, 8vw, 7rem), font-weight:900, line-height:1.0
   - Subheading: font-size clamp(1rem, 2vw, 1.3rem), max-width:600px, opacity:0.8
   - Two CTAs: primary (accent bg) + secondary (transparent border)
   - Optional: decorative HUD elements, stat badges, or animated lines as brand flavor

3. STATS BAR
   - 4-6 stats with large numbers + labels
   - Numbers animate from 0 to final value when scrolled into view (IntersectionObserver)
   - Dark surface background, accent-colored numbers

4. SERVICES / PRODUCTS (min 6 cards)
   - Each card: SVG icon, title, 2-3 sentence description
   - Cards use brand's glass/dark style
   - Hover: accent border glow + slight translateY(-4px)

5. ABOUT / STORY
   - Two-column: text left, image right (or reversed)
   - Compelling brand narrative — specific to the business, not generic filler
   - Brand accent used for section label, pull quote, or highlight text

6. PORTFOLIO / PROCESS / FEATURED WORK
   - If portfolio: image grid with overlay on hover
   - If process: numbered steps with icons and descriptions
   - If slider tabs exist here: ALL tab buttons must be wired up, each panel has real content

7. TEAM
   - Grid of team cards: portrait <img>, name, title, 1-2 sentence bio
   - Min 3 team members

8. TESTIMONIALS CAROUSEL
   - Min 3 testimonials: quote text, star rating (★★★★★), client name, company/title
   - Prev/next buttons: fully wired, wrap around
   - Auto-advance every 5 seconds
   - Dot indicators: clickable, update on slide change

9. FAQ ACCORDION
   - Min 6 questions
   - EVERY answer: 2-4 complete sentences — specific to the business, no placeholders
   - Click to open/close, smooth max-height transition
   - Only one open at a time
   - Accent color on open item's question text

10. CONTACT SECTION
    - <section id="contact">
    - <form id="contact-form" action="CONTACT_FORM_ENDPOINT" method="POST">
    - Fields: Full Name (required), Email (required), Phone (optional), Message textarea (required)
    - Hidden: <input type="hidden" name="_subject" value="New Enquiry">
    - Hidden: <input type="hidden" name="_captcha" value="false">
    - Inputs: dark bg, accent border on focus with box-shadow glow
    - Submit: accent color bg, dark text, full width or large button
    - On submit: hide form, show styled success message div

11. FOOTER
    - SVG logo (use href="#brand-logo")
    - Navigation links organized in columns
    - Social media icons (SVG paths — no external icon libraries)
    - Copyright line
    - Dark background, subtle top border in accent color at low opacity

════════════════════════════════════════════════════════════════════════
STEP 3 — ALL JAVASCRIPT (WORKING, IN-FILE, NO EXCEPTIONS)
Every single interaction must be coded and working in the output file.
════════════════════════════════════════════════════════════════════════

── CUSTOM CURSOR (CRITICAL — must activate immediately on page load) ──
Add <div id="cursor-dot"></div> as the VERY FIRST element inside <body>.
CSS:
  #cursor-dot {
    position: fixed;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--c-accent);
    pointer-events: none;
    z-index: 99999;
    transform: translate(-50%, -50%);
    transition: width 0.2s ease, height 0.2s ease, opacity 0.2s ease;
    box-shadow: 0 0 12px var(--c-accent), 0 0 24px var(--c-accent);
  }
  #cursor-dot.large {
    width: 36px;
    height: 36px;
    opacity: 0.6;
  }
JS (use this EXACT pattern — do not deviate):
  (function() {
    var dot = document.getElementById('cursor-dot');
    if (!dot) return;
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var cx = mx, cy = my;
    dot.style.left = cx + 'px';
    dot.style.top = cy + 'px';
    document.addEventListener('mousemove', function(e) { mx = e.clientX; my = e.clientY; });
    document.addEventListener('mouseenter', function() { dot.style.opacity = '1'; });
    document.addEventListener('mouseleave', function() { dot.style.opacity = '0'; });
    document.querySelectorAll('a, button, [role="button"], input, textarea, [class*="tab"], [class*="btn"]').forEach(function(el) {
      el.addEventListener('mouseenter', function() { dot.classList.add('large'); });
      el.addEventListener('mouseleave', function() { dot.classList.remove('large'); });
    });
    function loop() {
      cx += (mx - cx) * 0.12;
      cy += (my - cy) * 0.12;
      dot.style.left = cx + 'px';
      dot.style.top = cy + 'px';
      requestAnimationFrame(loop);
    }
    loop();
  })();
NEVER use cursor:none anywhere. The system cursor stays visible. The dot is an ADDITION.

── NAVBAR SCROLL ──
  (function() {
    var nav = document.querySelector('nav, header, .navbar, #navbar');
    if (!nav) return;
    function updateNav() {
      if (window.scrollY > 80) {
        nav.style.background = 'rgba(5,5,16,0.97)';
        nav.style.backdropFilter = 'blur(20px)';
        nav.style.webkitBackdropFilter = 'blur(20px)';
        nav.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      } else {
        nav.style.background = 'transparent';
        nav.style.backdropFilter = 'none';
        nav.style.webkitBackdropFilter = 'none';
        nav.style.borderBottom = 'none';
      }
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  })();

── SMOOTH SCROLL ──
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

── MOBILE HAMBURGER ──
  (function() {
    var btn = document.querySelector('.hamburger, .mobile-toggle, #mobile-toggle, [data-mobile-toggle]');
    var menu = document.querySelector('.mobile-menu, .nav-overlay, #mobile-menu, [data-mobile-menu]');
    if (!btn || !menu) return;
    btn.addEventListener('click', function() {
      var open = menu.style.display === 'flex' || menu.classList.contains('open');
      if (open) { menu.style.display = 'none'; menu.classList.remove('open'); btn.classList.remove('active'); }
      else { menu.style.display = 'flex'; menu.classList.add('open'); btn.classList.add('active'); }
    });
  })();

── SCROLL REVEALS ──
CSS (in <style>):
  .reveal { opacity: 1; transform: none; transition: opacity 0.7s ease, transform 0.7s ease; }
  .js-loaded .reveal { opacity: 0; transform: translateY(28px); }
  .js-loaded .reveal.visible { opacity: 1; transform: translateY(0); }
JS:
  (function() {
    document.body.classList.add('js-loaded');
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el) { io.observe(el); });
  })();
Apply class="reveal" to: section headings, paragraph blocks, card grids, stat items, team cards,
  about content, portfolio items, FAQ container, contact form, footer content.
ALL sections must have .reveal on their primary content children.

── ANIMATED COUNTERS ──
  (function() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (!e.isIntersecting) return;
        var el = e.target, target = +el.dataset.count, suffix = el.dataset.suffix || '', start = 0;
        var step = target / 60;
        var timer = setInterval(function() {
          start += step;
          if (start >= target) { start = target; clearInterval(timer); }
          el.textContent = Math.floor(start).toLocaleString() + suffix;
        }, 16);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function(el) { io.observe(el); });
  })();
Usage: <span data-count="420" data-suffix="km">0</span>

── FAQ ACCORDION ──
  (function() {
    var items = document.querySelectorAll('.faq-item, [data-faq]');
    items.forEach(function(item) {
      var q = item.querySelector('.faq-question, [data-faq-q]');
      var a = item.querySelector('.faq-answer, [data-faq-a]');
      if (!q || !a) return;
      a.style.maxHeight = '0';
      a.style.overflow = 'hidden';
      a.style.transition = 'max-height 0.4s ease, padding 0.4s ease';
      q.style.cursor = 'pointer';
      q.addEventListener('click', function() {
        var isOpen = item.classList.contains('open');
        items.forEach(function(i) {
          i.classList.remove('open');
          var ia = i.querySelector('.faq-answer, [data-faq-a]');
          if (ia) ia.style.maxHeight = '0';
        });
        if (!isOpen) {
          item.classList.add('open');
          a.style.maxHeight = a.scrollHeight + 32 + 'px';
        }
      });
    });
  })();

── TABS / FILTER BUTTONS ──
  (function() {
    var tabs = document.querySelectorAll('[data-tab]');
    var panels = document.querySelectorAll('[data-panel]');
    if (!tabs.length) return;
    function showTab(name) {
      tabs.forEach(function(t) { t.classList.toggle('active', t.dataset.tab === name); });
      panels.forEach(function(p) { p.style.display = p.dataset.panel === name ? 'block' : 'none'; });
    }
    tabs.forEach(function(t) { t.addEventListener('click', function() { showTab(t.dataset.tab); }); });
    showTab(tabs[0].dataset.tab);
  })();
CRITICAL: Every [data-tab] button must have a matching [data-panel] with the same name value.
Every panel must contain real, brand-relevant content — never empty or placeholder.

── TESTIMONIALS CAROUSEL ──
  (function() {
    var slides = document.querySelectorAll('.testimonial-slide, [data-slide]');
    var dots = document.querySelectorAll('.carousel-dot, [data-dot]');
    var prev = document.querySelector('.carousel-prev, [data-prev]');
    var next = document.querySelector('.carousel-next, [data-next]');
    if (!slides.length) return;
    var current = 0;
    function show(n) {
      current = ((n % slides.length) + slides.length) % slides.length;
      slides.forEach(function(s, i) { s.style.display = i === current ? 'block' : 'none'; });
      dots.forEach(function(d, i) { d.classList.toggle('active', i === current); });
    }
    if (prev) prev.addEventListener('click', function() { show(current - 1); });
    if (next) next.addEventListener('click', function() { show(current + 1); });
    dots.forEach(function(d, i) { d.addEventListener('click', function() { show(i); }); });
    show(0);
    setInterval(function() { show(current + 1); }, 5000);
  })();

── CONTACT FORM ──
  (function() {
    var form = document.getElementById('contact-form');
    var success = document.getElementById('contact-success');
    if (!form) return;
    form.addEventListener('submit', function(e) {
      var name = form.querySelector('[name="name"]');
      var email = form.querySelector('[name="email"]');
      var message = form.querySelector('[name="message"]');
      if (!name || !name.value.trim()) { e.preventDefault(); name && name.focus(); return; }
      if (!email || !email.value.trim()) { e.preventDefault(); email && email.focus(); return; }
      if (!message || !message.value.trim()) { e.preventDefault(); message && message.focus(); return; }
      if (success) {
        setTimeout(function() { form.style.display = 'none'; success.style.display = 'block'; }, 800);
      }
    });
  })();

════════════════════════════════════════════════════════════════════════
STEP 4 — IMAGE PLACEHOLDERS
════════════════════════════════════════════════════════════════════════
Every image uses <img src="https://placehold.co/WIDTHxHEIGHT" ...>
Sizes: hero 1920x1080, team portraits 400x400, service/work cards 600x400, about 800x600
These will be replaced by AI-generated images in a later pass.

════════════════════════════════════════════════════════════════════════
STEP 5 — TECHNICAL REQUIREMENTS
════════════════════════════════════════════════════════════════════════
- Single HTML file. All CSS in <style>. All JS in one <script> at end of body.
- Google Fonts via @import url() in <style>
- Minimum 1500 lines
- All section IDs match navbar anchor links exactly
- No external JS libraries — vanilla JS only
- Pixel perfect on mobile (375px) and desktop (1440px)`;

const HTML_OUTPUT_RULES = `

ABSOLUTE OUTPUT RULES:
- Start with <!DOCTYPE html> — nothing before it
- End with </html> — nothing after it
- No markdown fences, no explanation, no commentary
- Raw HTML only`;

// ─────────────────────────────────────────────────────────────────────────────
// PASS 2 — SURGICAL JS + DATA-SLOT INJECTION PROMPT
// Returns ONLY a JSON object, never rewrites HTML
// ─────────────────────────────────────────────────────────────────────────────

const PASS2_SYSTEM_PROMPT = `You are a precise code auditor and JavaScript specialist.
You receive an HTML site and return ONLY a JSON object — never HTML, never markdown.

Your job has two parts:
1. Audit the site's interactive elements and return any missing/broken JS as self-contained fix scripts
2. Audit every <img> tag and return data-slot assignments

Return ONLY this JSON shape (raw, no markdown, no backticks):
{
  "fixes": [
    {
      "id": "short-fix-id",
      "description": "what this fixes",
      "script": "...complete self-contained JS as a string, wrapped in IIFE..."
    }
  ],
  "slots": [
    {
      "src": "exact src attribute value of the img tag",
      "slot": "descriptive-slot-id-like-hero-bg-rocket-launch-night"
    }
  ]
}

AUDIT RULES:
- Check cursor: does #cursor-dot exist and have a mousemove loop? If missing or broken, add fix.
- Check navbar: does it go transparent→solid on scroll? If missing, add fix.
- Check FAQ: do .faq-item clicks open/close answers? If broken, add fix.
- Check tabs: do [data-tab] buttons show/hide [data-panel] content? If broken, add fix.
- Check carousel: do prev/next/dots work? If broken, add fix.
- Check counters: do [data-count] elements animate? If broken, add fix.
- Check scroll reveals: do .reveal elements get .visible class? If broken, add fix.
- Check contact form: does #contact-form exist with validation? If broken, add fix.
- Check mobile menu: does hamburger toggle work? If broken, add fix.

SLOT RULES:
- Every <img> tag gets a slot entry
- src must be the EXACT src value from the HTML (for matching)
- slot must be a descriptive hyphenated id specific to that image's purpose
- Examples: "hero-bg-aerospace-rocket-launch-night-exhaust",
  "team-portrait-ceo-professional-headshot", "service-card-satellite-deployment-orbit"

Output ONLY the raw JSON object. No explanation. No markdown. No HTML.`;

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
  let cleaned = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  // Extract JSON object if wrapped in other text
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1) cleaned = cleaned.substring(objStart, objEnd + 1);
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
// SURGICAL PASS 2 INJECTION
// Takes the JSON from Pass 2 and applies fixes + data-slots to Pass 1 HTML
// Never touches HTML content — only injects scripts and attributes
// ─────────────────────────────────────────────────────────────────────────────

function applyPass2(html, pass2Json) {
  let result = html;

  // 1. Inject fix scripts before </body>
  if (pass2Json.fixes && pass2Json.fixes.length > 0) {
    const scriptBlocks = pass2Json.fixes.map(fix => {
      console.log(`  Injecting fix: ${fix.id} — ${fix.description}`);
      return `\n<script data-fix="${fix.id}">\n/* Fix: ${fix.description} */\n${fix.script}\n</scr` + `ipt>`;
    }).join('\n');
    result = result.replace('</body>', scriptBlocks + '\n</body>');
  }

  // 2. Apply data-slot attributes to img tags
  if (pass2Json.slots && pass2Json.slots.length > 0) {
    let slotCount = 0;
    pass2Json.slots.forEach(function(slot) {
      const escapedSrc = slot.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match img tags with this src, add data-slot if not already present
      const imgPattern = new RegExp(`(<img[^>]*src="${escapedSrc}"[^>]*)(>)`, 'gi');
      const before = result.length;
      result = result.replace(imgPattern, function(match, imgOpen, close) {
        if (match.includes('data-slot')) return match; // already has slot
        return imgOpen + ` data-slot="${slot.slot}"` + close;
      });
      if (result.length !== before || result.includes(`data-slot="${slot.slot}"`)) slotCount++;
    });
    console.log(`  Applied ${slotCount} data-slot attributes`);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT FORM SAFETY NET
// Hard fallback if Pass 1 somehow dropped the contact section
// ─────────────────────────────────────────────────────────────────────────────

function ensureContactSection(html) {
  const hasForm = /<form[^>]*id=["']contact-form["']/i.test(html) ||
                  /<form[^>]*action[^>]*(CONTACT_FORM_ENDPOINT|formsubmit)/i.test(html);
  if (hasForm) return html;

  console.log('  Contact form missing — injecting fallback');

  const section = `
<section id="contact" style="padding:120px 0;background:var(--c-bg,#050510);">
  <div style="max-width:680px;margin:0 auto;padding:0 24px;">
    <div class="reveal" style="text-align:center;margin-bottom:56px;">
      <p style="color:var(--c-accent,#00FFD1);font-size:0.8rem;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">Contact</p>
      <h2 style="font-size:clamp(2rem,5vw,3.2rem);font-weight:800;color:#fff;margin:0 0 20px;">Get In Touch</h2>
      <p style="color:var(--c-text-muted,rgba(255,255,255,0.55));font-size:1.05rem;line-height:1.7;">Ready to start? Send us a message and we'll respond within 24 hours.</p>
    </div>
    <div id="contact-success" style="display:none;text-align:center;padding:56px 32px;background:rgba(255,255,255,0.04);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
      <div style="font-size:2.5rem;margin-bottom:16px;">✓</div>
      <p style="color:#fff;font-size:1.2rem;font-weight:700;margin-bottom:8px;">Message Sent</p>
      <p style="color:var(--c-text-muted,rgba(255,255,255,0.55));">We'll be in touch shortly.</p>
    </div>
    <form id="contact-form" action="CONTACT_FORM_ENDPOINT" method="POST" class="reveal" style="display:flex;flex-direction:column;gap:22px;">
      <input type="hidden" name="_subject" value="New Enquiry">
      <input type="hidden" name="_captcha" value="false">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;">
        <div>
          <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Full Name *</label>
          <input type="text" name="name" required placeholder="Your name" style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:1rem;outline:none;box-sizing:border-box;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#00FFD1)';this.style.boxShadow='0 0 0 3px rgba(0,255,209,0.12)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'">
        </div>
        <div>
          <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Email *</label>
          <input type="email" name="email" required placeholder="you@email.com" style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:1rem;outline:none;box-sizing:border-box;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#00FFD1)';this.style.boxShadow='0 0 0 3px rgba(0,255,209,0.12)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'">
        </div>
      </div>
      <div>
        <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Phone (optional)</label>
        <input type="tel" name="phone" placeholder="+1 (555) 000-0000" style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:1rem;outline:none;box-sizing:border-box;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#00FFD1)';this.style.boxShadow='0 0 0 3px rgba(0,255,209,0.12)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'">
      </div>
      <div>
        <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Message *</label>
        <textarea name="message" required rows="6" placeholder="Tell us about your project..." style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:1rem;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#00FFD1)';this.style.boxShadow='0 0 0 3px rgba(0,255,209,0.12)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'"></textarea>
      </div>
      <button type="submit" style="padding:18px 48px;background:var(--c-accent,#00FFD1);color:#050510;font-size:0.9rem;font-weight:800;letter-spacing:3px;text-transform:uppercase;border:none;border-radius:10px;cursor:pointer;transition:opacity 0.3s,transform 0.2s;align-self:stretch;" onmouseover="this.style.opacity='0.85';this.style.transform='translateY(-2px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">Send Message</button>
    </form>
  </div>
</section>`;

  if (html.includes('<footer')) {
    html = html.replace('<footer', section + '\n<footer');
  } else {
    html = html.replace('</body>', section + '\n</body>');
  }
  return html;
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
    console.log(`  Compressed: ${Math.round(inputBuffer.length/1024)}kb → ${Math.round(outputBuffer.length/1024)}kb`);
    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Compression error:', err.message);
    return base64DataUrl;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE API
// ─────────────────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage, maxTokens = 32000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200000);
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
    console.log(`  Claude response: ${text.length} chars`);
    return cleanHtml(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function callClaudeRaw(systemPrompt, userMessage, maxTokens = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
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
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      }),
      signal: controller.signal
    });
    const data = await response.json();
    if (data.error) throw new Error(`Anthropic error: ${data.error.message}`);
    return data.content[0].text;
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
        system: 'You are a JSON generator. Respond with a raw JSON array starting with [ immediately. No markdown, no backticks, no explanation.',
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
    let cleaned = raw.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
    return JSON.parse(cleaned);
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
  if (text.includes('aerospace') || text.includes('rocket') || text.includes('space') || text.includes('satellite')) return 'aerospace';
  if (text.includes('landing') || text.includes('app')) return 'saas';
  return 'business';
}

function getImageCap(industry) {
  const caps = {
    ecommerce: 16, fashion: 14, skincare: 12, restaurant: 12,
    jewelry: 12, hospitality: 12, aesthetics_clinic: 12, wellness: 10,
    fitness: 10, real_estate: 10, photography: 10, coffee: 10,
    trades: 10, aerospace: 10, music: 8, robotics: 8, portfolio: 8,
    business: 8, saas: 6, technology: 6,
  };
  return caps[industry] || 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE GENERATION — Imagen 3
// ─────────────────────────────────────────────────────────────────────────────

function normalizeAspectRatio(ar) {
  const valid = ['16:9','1:1','4:3','3:4','9:16'];
  return valid.includes(ar) ? ar : '1:1';
}

async function generateImageWithRetry(prompt, aspectRatio = '1:1', maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateImage(prompt, aspectRatio);
      if (result) return result;
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  Image attempt ${attempt} error: ${err.message}`);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1500));
    }
  }
  return null;
}

async function generateImage(prompt, aspectRatio = '1:1') {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { console.error('GOOGLE_API_KEY not set'); return null; }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: normalizeAspectRatio(aspectRatio),
          safetySetting: 'block_only_high',
          personGeneration: 'allow_adult',
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('  Image API error:', JSON.stringify(data).substring(0, 200));
      return null;
    }

    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      console.error('  No bytesBase64Encoded in response');
      return null;
    }

    const mimeType = prediction.mimeType || 'image/png';
    return await compressBase64Image(`data:${mimeType};base64,${prediction.bytesBase64Encoded}`, 1200);
  } catch (err) {
    console.error('  generateImage error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractImageSlots(html) {
  const slots = [];
  const seen = new Set();

  // data-slot tagged imgs
  const ds1 = /<img[^>]*data-slot="([^"]*)"[^>]*src="([^"]*)"[^>]*/gi;
  const ds2 = /<img[^>]*src="([^"]*)"[^>]*data-slot="([^"]*)"[^>]*/gi;
  let m;
  while ((m = ds1.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); slots.push({ id: m[1], src: m[2], type: 'data-slot' }); }
  }
  while ((m = ds2.exec(html)) !== null) {
    if (!seen.has(m[2])) { seen.add(m[2]); slots.push({ id: m[2], src: m[1], type: 'data-slot' }); }
  }

  // Placeholder srcs
  const placeholders = [
    /src="(https?:\/\/placehold\.co[^"]*)"/gi,
    /src="(https?:\/\/via\.placeholder[^"]*)"/gi,
    /src="(https?:\/\/picsum\.photos[^"]*)"/gi,
    /src="(https?:\/\/dummyimage[^"]*)"/gi,
  ];
  for (const pat of placeholders) {
    pat.lastIndex = 0;
    while ((m = pat.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        slots.push({ id: `placeholder-${slots.length}`, src: m[1], type: 'src' });
      }
    }
  }

  // CSS background-image
  const bgPat = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]*)['"]?\)/gi;
  while ((m = bgPat.exec(html)) !== null) {
    if (!seen.has(m[1]) && !m[1].startsWith('data:')) {
      seen.add(m[1]);
      const ctx = html.substring(Math.max(0, m.index - 200), m.index).toLowerCase();
      const isHero = ctx.includes('hero') || ctx.includes('banner');
      slots.push({ id: isHero ? 'hero-background-fullscreen' : `bg-${slots.length}`, src: m[1], type: 'background' });
    }
  }

  return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASS 3 — IMAGE INJECTION
// ─────────────────────────────────────────────────────────────────────────────

async function injectBrandedImages(html, userRequest, jobId) {
  console.log(`[${jobId}] Pass 3: image generation`);
  const industry = detectIndustry(userRequest);
  const cap = getImageCap(industry);
  console.log(`[${jobId}] Industry: ${industry} | Cap: ${cap}`);

  const rawSlots = extractImageSlots(html);
  console.log(`[${jobId}] Found ${rawSlots.length} slots`);
  if (!rawSlots.length) return html;

  const slots = rawSlots.slice(0, cap);
  console.log(`[${jobId}] Processing ${slots.length} slots`);

  // Generate prompts
  let promptData = [];
  try {
    const promptReq = `Brand context: ${userRequest.substring(0, 800)}
Industry: ${industry}
Write a photorealistic image generation prompt for each slot.
Each prompt must: match brand aesthetic, be specific to the slot's purpose, end with ", no text, no watermarks, no logos, professional photography"
Slots: ${slots.map((s,i) => `${i}. "${s.id}"`).join('\n')}
Return JSON array: [{"index":0,"prompt":"...","aspect_ratio":"16:9"},...]
aspect_ratio: "16:9" heroes/banners, "1:1" portraits/cards, "4:3" lifestyle, "3:4" portrait`;
    promptData = await callClaudeJson(promptReq, 3000);
    console.log(`[${jobId}] Generated ${promptData.length} image prompts`);
  } catch (err) {
    console.error(`[${jobId}] Prompt gen failed, using fallback`);
    promptData = slots.map((s, i) => ({
      index: i,
      prompt: `Premium ${industry} brand photography, cinematic lighting, no text, no watermarks, professional photography`,
      aspect_ratio: s.id.includes('hero') || s.id.includes('background') ? '16:9' : '1:1'
    }));
  }

  // Generate all images in parallel
  const results = await Promise.all(slots.map(async (slot, i) => {
    const entry = promptData[i] || promptData.find(p => p.index === i);
    if (!entry) return { ...slot, img: null };
    console.log(`[${jobId}] Generating [${i+1}/${slots.length}]: ${slot.id}`);
    const img = await generateImageWithRetry(entry.prompt, entry.aspect_ratio || '1:1', 2);
    console.log(`[${jobId}] [${i+1}] ${img ? 'OK' : 'FAILED'}`);
    return { ...slot, img };
  }));

  const ok = results.filter(r => r.img).length;
  console.log(`[${jobId}] Images: ${ok}/${slots.length} successful`);

  // Inject images
  for (const r of results) {
    if (!r.img) continue;
    try {
      if (r.type === 'data-slot') {
        const eid = r.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`(<img[^>]*src=")[^"]*("[^>]*data-slot="${eid}"[^>]*>)`, 'gi'), `$1${r.img}$2`);
        html = html.replace(new RegExp(`(<img[^>]*data-slot="${eid}"[^>]*src=")[^"]*("[^>]*>)`, 'gi'), `$1${r.img}$2`);
      } else if (r.type === 'background') {
        const esc = r.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(esc, 'g'), r.img);
      } else {
        const esc = r.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`src="${esc}"`, 'gi'), `src="${r.img}"`);
      }
    } catch (e) {
      console.error(`[${jobId}] Inject error ${r.id}: ${e.message}`);
    }
  }

  console.log(`[${jobId}] Pass 3 done. HTML: ${(html.length/1024/1024).toFixed(2)}MB`);
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

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${jobId}] Job started`);
  console.log(`[${jobId}] Request length: ${userRequest?.length}`);
  console.log(`[${jobId}] Contact email: ${contactEmail || 'none'}`);
  console.log(`[${jobId}] Anthropic key: ${!!process.env.ANTHROPIC_API_KEY}`);
  console.log(`[${jobId}] Google key: ${!!process.env.GOOGLE_API_KEY}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Connection', 'close');
  res.end(JSON.stringify({ jobId }));

  (async () => {
    try {

      // ── PASS 1: Full site, all JS working, all 11 sections ─────────────────
      console.log(`\n[${jobId}] ── PASS 1: Full site generation`);
      jobs[jobId].phase = 'pass1';
      const pass1Html = await callClaude(MASTER_SYSTEM_PROMPT, userRequest, 32000);
      console.log(`[${jobId}] Pass 1 done: ${pass1Html.length} chars`);
      if (pass1Html.length < 8000) throw new Error(`Pass 1 too short: ${pass1Html.length} chars`);

      // ── PASS 2: Surgical audit — JS fixes + data-slot JSON only ───────────
      console.log(`\n[${jobId}] ── PASS 2: Surgical audit (JS fixes + slots)`);
      jobs[jobId].phase = 'pass2';

      // Only send a compact summary to Pass 2, not the full HTML
      // Extract img srcs and check for key JS patterns
      const imgSrcs = [];
      const imgPat = /src="(https?:\/\/[^"]+)"/gi;
      let im;
      while ((im = imgPat.exec(pass1Html)) !== null) imgSrcs.push(im[1]);

      const jsSummary = {
        hasCursorDot: pass1Html.includes('cursor-dot'),
        hasNavScroll: pass1Html.includes('scrollY') || pass1Html.includes('scroll'),
        hasFaqAccordion: pass1Html.includes('faq-item') || pass1Html.includes('faq_item') || pass1Html.includes('[data-faq]'),
        hasTabs: pass1Html.includes('data-tab') && pass1Html.includes('data-panel'),
        hasCarousel: pass1Html.includes('testimonial-slide') || pass1Html.includes('data-slide'),
        hasCounters: pass1Html.includes('data-count'),
        hasReveal: pass1Html.includes('reveal'),
        hasContactForm: pass1Html.includes('contact-form'),
        hasMobileMenu: pass1Html.includes('hamburger') || pass1Html.includes('mobile-toggle'),
        imgSrcs: imgSrcs.slice(0, 30),
        sectionIds: (pass1Html.match(/id=["']([^"']+)["']/gi) || []).slice(0, 40).map(s => s.replace(/id=["']/,'').replace(/["']/,''))
      };

      const pass2Prompt = `Audit this site's JS completeness and image tags.
Site summary:
${JSON.stringify(jsSummary, null, 2)}

Full HTML (for context):
${pass1Html.substring(0, 12000)}
...
${pass1Html.substring(pass1Html.length - 4000)}

Return ONLY raw JSON (no markdown, no backticks):
{
  "fixes": [
    { "id": "fix-id", "description": "what it fixes", "script": "complete IIFE JS string" }
  ],
  "slots": [
    { "src": "exact-src-from-html", "slot": "descriptive-slot-id" }
  ]
}

For fixes: only add fixes for things that are genuinely missing or broken based on the summary flags.
For slots: create one entry per unique img src in imgSrcs, with a descriptive slot name.`;

      let pass2Json = { fixes: [], slots: [] };
      try {
        const pass2Raw = await callClaudeRaw(PASS2_SYSTEM_PROMPT, pass2Prompt, 8000);
        console.log(`[${jobId}] Pass 2 raw length: ${pass2Raw.length}`);
        pass2Json = safeParseJson(pass2Raw);
        console.log(`[${jobId}] Pass 2: ${pass2Json.fixes?.length || 0} fixes, ${pass2Json.slots?.length || 0} slots`);
      } catch (err) {
        console.error(`[${jobId}] Pass 2 parse failed: ${err.message} — proceeding with Pass 1 only`);
      }

      // Apply surgical fixes + slots to Pass 1 HTML
      let html = applyPass2(pass1Html, pass2Json);
      console.log(`[${jobId}] After Pass 2 injection: ${html.length} chars`);

      // Inject contact email
      if (contactEmail) {
        html = injectContactEmail(html, contactEmail);
        console.log(`[${jobId}] Contact email injected`);
      }

      // Safety net: ensure contact form exists
      html = ensureContactSection(html);

      // ── PASS 3: Image generation ───────────────────────────────────────────
      console.log(`\n[${jobId}] ── PASS 3: Image generation`);
      jobs[jobId].phase = 'pass3';
      const finalHtml = await injectBrandedImages(html, userRequest, jobId);

      jobs[jobId] = { status: 'done', phase: 'complete', html: finalHtml };
      console.log(`\n[${jobId}] ✓ Complete. Final: ${(finalHtml.length/1024/1024).toFixed(2)}MB`);

    } catch (err) {
      console.error(`[${jobId}] Fatal error: ${err.message}`);
      jobs[jobId] = { status: 'error', phase: 'error', error: err.message };
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/test-image', async (req, res) => {
  console.log('[test-image] Testing Imagen 3');
  const result = await generateImageWithRetry(
    'A premium luxury skincare serum bottle on white marble, soft studio lighting, no text, no watermarks, professional product photography',
    '1:1', 2
  );
  if (result) {
    res.json({ success: true, message: `OK — ${Math.round(result.length/1024)}kb` });
  } else {
    res.json({ success: false, message: 'Failed — check logs' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Axier build server running on port ${PORT}`));
