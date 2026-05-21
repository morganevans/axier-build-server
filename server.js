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
════════════════════════════════════════════════════════════════════════

Before writing a single line of HTML, design:
  A) The logo mark + wordmark
  B) The color palette (CSS vars)
  C) The typography pairing
  D) Visual tone and texture language

Then build the ENTIRE site to match that brand identity consistently.

──── A) LOGO — NON-NEGOTIABLE QUALITY STANDARD ────

The logo lives in: <symbol id="brand-logo" viewBox="0 0 300 70">
Placed inside <svg style="display:none"> at top of <body>.
Used everywhere as: <svg style="width:200px;height:50px;display:block"><use href="#brand-logo"/></svg>

THE ICON MARK (left ~65×65 of the viewBox):
Choose ONE construction method and execute it with mastery:

METHOD A — COMPOUND OVERLAP MARK:
  2-3 geometric primitives (circles, ellipses, polygons) offset so they partially overlap.
  Use <clipPath> so the overlap zone shows a different accent fill.
  Outer shapes: 2-3px stroke, semi-transparent fill.
  Result: layered, dimensional mark that looks engineered.

METHOD B — DECONSTRUCTED LETTERFORM:
  Brand's first letter broken into 2-4 thick rectangular/polygonal strokes.
  Recompose with deliberate spacing, rotation or extension.
  Add one accent element: dot, arc, underline or encircling ring in accent color.

METHOD C — CONCEPT SYMBOL:
  Single geometric concept representing the brand's core idea.
  Built ONLY from SVG primitives: rect, circle, ellipse, polygon, path, line.
  Must use <linearGradient> or <radialGradient> in <defs>.
  Must have <filter id="icon-glow"> with feGaussianBlur for premium feel.

ICON MUST-HAVES (every single one, no exceptions):
  ✓ Uses 2-3 brand palette colors — NOT just white/grey
  ✓ Has visual weight — at least one filled shape, not just outlines
  ✓ Contains a gradient inside <defs>
  ✓ Contains a glow filter via feGaussianBlur
  ✓ Clearly readable at 35px rendered height
  ✓ Feels engineered and intentional — NOT clip-art or default icon set geometry

THE WORDMARK (right, ~220px wide):
Choose ONE technique:

TECHNIQUE 1 — SPLIT COLOR:
  Brand name ALL CAPS, font-size 26-28, font-weight 800, letter-spacing 4+.
  One letter/syllable in accent color, rest white.
  Tagline below at font-size 9, letter-spacing 3, fill rgba(255,255,255,0.5).
  1px horizontal rule between name and tagline in accent color at 40% opacity.

TECHNIQUE 2 — STACKED BADGE:
  Brand name bold + large on top.
  Descriptor below in lighter weight, spaced out.
  Thin 2px accent rectangle as a divider.

TECHNIQUE 3 — OUTLINED CONTRAST:
  Alternate letters: odd filled white, even stroke-only (fill:none, stroke:accent).
  Bold font-weight 900. Editorial high-fashion feel.

──── B) COLOR PALETTE ────
CSS vars on :root:
  --c-bg: main dark background (NOT pure black — use #060408, #080610, #0a0806 etc)
  --c-surface: card/panel bg (slightly lighter)
  --c-accent: electric pop color — defines brand personality
  --c-accent2: secondary for gradients/hover
  --c-text: near-white body text
  --c-text-muted: 50-60% opacity text

Unexpected industry-right accents:
  Nail/beauty: #E8B4C8 blush rose, #D4A853 warm champagne, #9B6B9B mauve
  Aerospace: #E8FF00 acid yellow, #00FFD1 electric teal
  Medical/luxury: #C8A97E warm gold, #E8C4B8 blush
  Trades: #FF6B35 construction orange
  Fitness: #39FF14 neon green
  Coffee: #E8C547 warm amber
  Tech: #7C3AED deep violet

──── C) TYPOGRAPHY ────
Import 2 Google Fonts — one display, one body.
Display: Cormorant Garamond / Playfair Display (luxury) | Orbitron / Rajdhani (tech) | Bebas Neue (fitness)
Body: always pair with Inter, DM Sans, Manrope, or Plus Jakarta Sans

──── D) SECTION ICONS ────
Every service/feature card needs an SVG icon that:
  - Is UNIQUE to that specific service (not a generic checkbox or circle)
  - Uses the brand accent color as stroke or fill
  - Is drawn from SVG primitives — no icon font classes
  - Has consistent stroke-width (1.5-2px) and style across the set
  - Is sized 40-48px rendered and clearly communicates the service at a glance
  NAIL SALON example icons: droplet shape for gel, fine-tip brush for art,
    foot outline for pedicure, extension nail for acrylics, leaf for treatments,
    ring with flower for bridal
  NEVER use: generic star, checkbox, circle-check, arrow, or abstract blob as service icon

════════════════════════════════════════════════════════════════════════
STEP 2 — BUILD ALL 11 SECTIONS (ALL REQUIRED, ZERO EXCEPTIONS)
════════════════════════════════════════════════════════════════════════

1. FIXED NAVBAR
   position:fixed, top:0, width:100%, z-index:1000
   Default: background:transparent, backdrop-filter:none
   SVG logo left | nav links center/right | CTA button far right (accent bg)
   Mobile: hamburger toggles fullscreen overlay

2. HERO (100vh)
   <img> hero bg: position:absolute, top:0, left:0, width:100%, height:100%, object-fit:cover, z-index:0
   Overlay: position:absolute, inset:0, z-index:1 (gradient from brand bg)
   Content: position:relative, z-index:2
   Headline: font-size clamp(3rem,8vw,7rem), font-weight:900, line-height:1.0
   Subheading: font-size clamp(1rem,2vw,1.3rem), max-width:600px
   Two CTAs: primary (accent bg) + secondary (transparent border)

3. STATS BAR
   4-6 stats, numbers animate 0→final on scroll (IntersectionObserver + data-count)
   Dark surface bg, accent-colored numbers

4. SERVICES / PRODUCTS (min 6 cards)
   Each: UNIQUE SVG icon (brand-appropriate), title, 2-3 sentence description
   Cards: glass morphism or dark solid with accent border-left
   Hover: accent glow + translateY(-4px)

5. ABOUT / STORY
   Two-column: text + image
   Specific brand narrative — NOT generic filler text

6. PORTFOLIO / PROCESS / FEATURED WORK
   If tabs/filters exist: ALL buttons wired with data-tab/data-panel
   Every panel has REAL brand-relevant content — never empty
   Grid items have images (placehold.co)

7. TEAM
   Min 3 members: portrait <img>, name, title, 1-2 sentence bio

8. TESTIMONIALS CAROUSEL
   Min 3: quote, ★★★★★ stars, client name, company/title
   Prev/next fully wired + wrap around
   Auto-advance 5s, clickable dots

9. FAQ ACCORDION
   Min 6 questions, EVERY answer 2-4 complete sentences
   Smooth max-height, one open at a time
   Accent color on open question

10. CONTACT SECTION
    <section id="contact">
    <form id="contact-form" action="CONTACT_FORM_ENDPOINT" method="POST">
    Fields: Full Name*, Email*, Phone (optional), Message*
    Hidden: _subject, _captcha=false
    Dark inputs with accent focus glow (box-shadow)
    Large accent submit button
    Success div (id="contact-success", display:none) shown on submit

11. FOOTER
    SVG logo | nav columns | social SVG icons | copyright
    Dark bg, accent top border at low opacity
    MUST be present and fully built — never omit

════════════════════════════════════════════════════════════════════════
STEP 3 — ALL JAVASCRIPT WORKING IN THE OUTPUT FILE
════════════════════════════════════════════════════════════════════════

── CUSTOM CURSOR (activates immediately on page load) ──
<div id="cursor-dot"></div> as VERY FIRST element inside <body>.
CSS:
  #cursor-dot {
    position:fixed; width:12px; height:12px; border-radius:50%;
    background:var(--c-accent); pointer-events:none; z-index:99999;
    transform:translate(-50%,-50%);
    transition:width 0.2s ease,height 0.2s ease,opacity 0.2s ease;
    box-shadow:0 0 12px var(--c-accent),0 0 24px var(--c-accent);
    left:50%; top:50%;
  }
  #cursor-dot.large { width:36px; height:36px; opacity:0.6; }
JS — use this EXACT pattern:
  (function(){
    var dot=document.getElementById('cursor-dot');
    if(!dot)return;
    var mx=window.innerWidth/2,my=window.innerHeight/2,cx=mx,cy=my;
    dot.style.left=cx+'px'; dot.style.top=cy+'px';
    document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;});
    document.addEventListener('mouseleave',function(){dot.style.opacity='0';});
    document.addEventListener('mouseenter',function(){dot.style.opacity='1';});
    document.querySelectorAll('a,button,[role="button"],input,textarea,[data-tab],[class*="btn"]').forEach(function(el){
      el.addEventListener('mouseenter',function(){dot.classList.add('large');});
      el.addEventListener('mouseleave',function(){dot.classList.remove('large');});
    });
    (function loop(){
      cx+=(mx-cx)*0.12; cy+=(my-cy)*0.12;
      dot.style.left=cx+'px'; dot.style.top=cy+'px';
      requestAnimationFrame(loop);
    })();
  })();
NEVER use cursor:none anywhere. System cursor always visible underneath.

── NAVBAR SCROLL (transparent → solid) ──
  (function(){
    var nav=document.querySelector('nav,header,.navbar,#navbar');
    if(!nav)return;
    function u(){
      if(window.scrollY>80){
        nav.style.background='rgba(6,4,8,0.96)';
        nav.style.backdropFilter='blur(20px)';
        nav.style.webkitBackdropFilter='blur(20px)';
        nav.style.borderBottom='1px solid rgba(255,255,255,0.07)';
      } else {
        nav.style.background='transparent';
        nav.style.backdropFilter='none';
        nav.style.webkitBackdropFilter='none';
        nav.style.borderBottom='none';
      }
    }
    window.addEventListener('scroll',u,{passive:true});
    u();
  })();

── SMOOTH SCROLL ──
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t=document.querySelector(this.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

── MOBILE HAMBURGER ──
  (function(){
    var btn=document.querySelector('.hamburger,.mobile-toggle,#mobile-toggle,[data-mobile-toggle]');
    var menu=document.querySelector('.mobile-menu,.nav-overlay,#mobile-menu,[data-mobile-menu]');
    if(!btn||!menu)return;
    btn.addEventListener('click',function(){
      var open=menu.classList.contains('open');
      menu.style.display=open?'none':'flex';
      menu.classList.toggle('open',!open);
      btn.classList.toggle('active',!open);
    });
  })();

── SCROLL REVEALS ──
CSS:
  .reveal{opacity:1;transform:none;transition:opacity 0.7s ease,transform 0.7s ease;}
  .js-loaded .reveal{opacity:0;transform:translateY(28px);}
  .js-loaded .reveal.visible{opacity:1;transform:translateY(0);}
JS:
  (function(){
    document.body.classList.add('js-loaded');
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}});
    },{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});
  })();
Apply class="reveal" to: ALL section headings, paragraph blocks, card grids,
  stat items, team cards, about content, portfolio items, FAQ container,
  contact form, footer columns. EVERY section must have reveal on primary children.

── ANIMATED COUNTERS ──
  (function(){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting)return;
        var el=e.target,target=+el.dataset.count,suffix=el.dataset.suffix||'',val=0,step=target/60;
        var t=setInterval(function(){val+=step;if(val>=target){val=target;clearInterval(t);}el.textContent=Math.floor(val).toLocaleString()+suffix;},16);
        io.unobserve(el);
      });
    },{threshold:0.5});
    document.querySelectorAll('[data-count]').forEach(function(el){io.observe(el);});
  })();
Usage: <span data-count="2000" data-suffix="+">0</span>

── FAQ ACCORDION ──
  (function(){
    document.querySelectorAll('.faq-item,[data-faq]').forEach(function(item){
      var q=item.querySelector('.faq-question,[data-faq-q]');
      var a=item.querySelector('.faq-answer,[data-faq-a]');
      if(!q||!a)return;
      a.style.maxHeight='0';a.style.overflow='hidden';
      a.style.transition='max-height 0.4s ease,padding 0.4s ease';
      q.style.cursor='pointer';
      q.addEventListener('click',function(){
        var open=item.classList.contains('open');
        document.querySelectorAll('.faq-item,[data-faq]').forEach(function(i){
          i.classList.remove('open');
          var ia=i.querySelector('.faq-answer,[data-faq-a]');
          if(ia)ia.style.maxHeight='0';
        });
        if(!open){item.classList.add('open');a.style.maxHeight=a.scrollHeight+32+'px';}
      });
    });
  })();

── TABS / FILTER BUTTONS ──
  (function(){
    var tabs=document.querySelectorAll('[data-tab]');
    var panels=document.querySelectorAll('[data-panel]');
    if(!tabs.length)return;
    function show(name){
      tabs.forEach(function(t){t.classList.toggle('active',t.dataset.tab===name);});
      panels.forEach(function(p){p.style.display=p.dataset.panel===name?'block':'none';});
    }
    tabs.forEach(function(t){t.addEventListener('click',function(){show(t.dataset.tab);});});
    show(tabs[0].dataset.tab);
  })();
CRITICAL: Every [data-tab] button MUST have a matching [data-panel] with same value.
Every panel MUST contain real brand-relevant content — NEVER empty or placeholder.

── TESTIMONIALS CAROUSEL ──
  (function(){
    var slides=document.querySelectorAll('.testimonial-slide,[data-slide]');
    var dots=document.querySelectorAll('.carousel-dot,[data-dot]');
    var prev=document.querySelector('.carousel-prev,[data-prev]');
    var next=document.querySelector('.carousel-next,[data-next]');
    if(!slides.length)return;
    var cur=0;
    function show(n){
      cur=((n%slides.length)+slides.length)%slides.length;
      slides.forEach(function(s,i){s.style.display=i===cur?'block':'none';});
      dots.forEach(function(d,i){d.classList.toggle('active',i===cur);});
    }
    if(prev)prev.addEventListener('click',function(){show(cur-1);});
    if(next)next.addEventListener('click',function(){show(cur+1);});
    dots.forEach(function(d,i){d.addEventListener('click',function(){show(i);});});
    show(0);
    setInterval(function(){show(cur+1);},5000);
  })();

── CONTACT FORM ──
  (function(){
    var form=document.getElementById('contact-form');
    var success=document.getElementById('contact-success');
    if(!form)return;
    form.addEventListener('submit',function(e){
      var n=form.querySelector('[name="name"]');
      var em=form.querySelector('[name="email"]');
      var msg=form.querySelector('[name="message"]');
      if(!n||!n.value.trim()){e.preventDefault();if(n)n.focus();return;}
      if(!em||!em.value.trim()){e.preventDefault();if(em)em.focus();return;}
      if(!msg||!msg.value.trim()){e.preventDefault();if(msg)msg.focus();return;}
      if(success){setTimeout(function(){form.style.display='none';success.style.display='block';},800);}
    });
  })();

════════════════════════════════════════════════════════════════════════
STEP 4 — IMAGES
════════════════════════════════════════════════════════════════════════
Every image: <img src="https://placehold.co/WIDTHxHEIGHT" ...>
Sizes: hero 1920x1080, team 400x400, cards 600x400, about 800x600
These get replaced by AI-generated images in a later pass.

════════════════════════════════════════════════════════════════════════
STEP 5 — TECHNICAL
════════════════════════════════════════════════════════════════════════
- Single HTML file. CSS in <style>. JS in one <script> at end of body.
- Google Fonts via @import in <style>
- Minimum 1500 lines
- All section IDs match navbar anchors exactly
- No external JS libraries
- Pixel perfect 375px mobile + 1440px desktop
- FOOTER IS MANDATORY — must be the last section before </body>`;

const HTML_OUTPUT_RULES = `

ABSOLUTE OUTPUT RULES:
- Start with <!DOCTYPE html> — nothing before it
- End with </html> — nothing after it
- No markdown fences, no explanation, no commentary
- Raw HTML only`;

// ─────────────────────────────────────────────────────────────────────────────
// PASS 2 — SURGICAL AUDIT PROMPT
// Returns JSON only — never rewrites HTML
// ─────────────────────────────────────────────────────────────────────────────

const PASS2_SYSTEM_PROMPT = `You are a precise code auditor. You receive an HTML site summary and return ONLY a raw JSON object.
No markdown. No backticks. No explanation. Raw JSON only.

Return this exact shape:
{
  "fixes": [
    { "id": "fix-id", "description": "what this fixes", "script": "complete IIFE JS string" }
  ],
  "slots": [
    { "src": "exact src value from html", "slot": "descriptive-slot-id" }
  ]
}

AUDIT: Only add fixes for things genuinely missing based on the boolean flags.
SLOTS: One entry per unique img src. Make slot ids highly descriptive and specific.`;

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
    .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
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
// SURGICAL PASS 2 APPLICATION
// ─────────────────────────────────────────────────────────────────────────────

function applyPass2(html, pass2Json) {
  let result = html;

  if (pass2Json.fixes && pass2Json.fixes.length > 0) {
    const scripts = pass2Json.fixes.map(fix => {
      console.log(`  Fix: ${fix.id} — ${fix.description}`);
      return `\n<script data-fix="${fix.id}">\n${fix.script}\n</scr` + `ipt>`;
    }).join('\n');
    result = result.replace('</body>', scripts + '\n</body>');
  }

  if (pass2Json.slots && pass2Json.slots.length > 0) {
    let count = 0;
    pass2Json.slots.forEach(function(slot) {
      const esc = slot.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(
        new RegExp(`(<img[^>]*src="${esc}"[^>]*)(>)`, 'gi'),
        function(match, open, close) {
          if (match.includes('data-slot')) return match;
          count++;
          return open + ` data-slot="${slot.slot}"` + close;
        }
      );
    });
    console.log(`  Applied ${count} data-slot attributes`);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT FORM SAFETY NET
// ─────────────────────────────────────────────────────────────────────────────

function ensureContactSection(html) {
  const hasForm = /<form[^>]*id=["']contact-form["']/i.test(html) ||
                  /CONTACT_FORM_ENDPOINT/i.test(html) ||
                  /formsubmit\.co/i.test(html);
  if (hasForm) {
    console.log('  Contact form present — OK');
    return html;
  }

  console.log('  Contact form MISSING — injecting fallback');
  const section = `
<section id="contact" style="padding:120px 0;background:var(--c-bg,#060408);">
  <div style="max-width:680px;margin:0 auto;padding:0 24px;">
    <div class="reveal" style="text-align:center;margin-bottom:56px;">
      <p style="color:var(--c-accent,#D4A853);font-size:0.75rem;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">Contact</p>
      <h2 style="font-size:clamp(2rem,5vw,3.2rem);font-weight:800;color:#fff;margin:0 0 20px;">Get In Touch</h2>
      <p style="color:var(--c-text-muted,rgba(255,255,255,0.55));font-size:1.05rem;line-height:1.7;">Send us a message and we'll get back to you within 24 hours.</p>
    </div>
    <div id="contact-success" style="display:none;text-align:center;padding:56px 32px;background:rgba(255,255,255,0.04);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
      <p style="color:var(--c-accent,#D4A853);font-size:2rem;margin-bottom:12px;">✓</p>
      <p style="color:#fff;font-size:1.2rem;font-weight:700;margin-bottom:8px;">Message Sent</p>
      <p style="color:var(--c-text-muted,rgba(255,255,255,0.55));">We'll be in touch shortly.</p>
    </div>
    <form id="contact-form" action="CONTACT_FORM_ENDPOINT" method="POST" class="reveal" style="display:flex;flex-direction:column;gap:20px;">
      <input type="hidden" name="_subject" value="New Enquiry">
      <input type="hidden" name="_captcha" value="false">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Full Name *</label>
          <input type="text" name="name" required placeholder="Your name" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:1rem;outline:none;box-sizing:border-box;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#D4A853)';this.style.boxShadow='0 0 0 3px rgba(212,168,83,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'">
        </div>
        <div>
          <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Email *</label>
          <input type="email" name="email" required placeholder="you@email.com" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:1rem;outline:none;box-sizing:border-box;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#D4A853)';this.style.boxShadow='0 0 0 3px rgba(212,168,83,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'">
        </div>
      </div>
      <div>
        <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Phone (optional)</label>
        <input type="tel" name="phone" placeholder="+1 (555) 000-0000" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:1rem;outline:none;box-sizing:border-box;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#D4A853)';this.style.boxShadow='0 0 0 3px rgba(212,168,83,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'">
      </div>
      <div>
        <label style="display:block;color:rgba(255,255,255,0.5);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Message *</label>
        <textarea name="message" required rows="6" placeholder="Tell us about your project..." style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:1rem;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;transition:border-color 0.3s,box-shadow 0.3s;" onfocus="this.style.borderColor='var(--c-accent,#D4A853)';this.style.boxShadow='0 0 0 3px rgba(212,168,83,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'"></textarea>
      </div>
      <button type="submit" style="padding:18px 48px;background:var(--c-accent,#D4A853);color:#060408;font-size:0.85rem;font-weight:800;letter-spacing:3px;text-transform:uppercase;border:none;border-radius:8px;cursor:pointer;transition:opacity 0.3s,transform 0.2s;" onmouseover="this.style.opacity='0.85';this.style.transform='translateY(-2px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">Send Message</button>
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
// FOOTER SAFETY NET
// ─────────────────────────────────────────────────────────────────────────────

function ensureFooter(html) {
  const hasFooter = /<footer/i.test(html);
  if (hasFooter) {
    console.log('  Footer present — OK');
    return html;
  }

  console.log('  Footer MISSING — injecting fallback');
  const footer = `
<footer style="background:var(--c-bg,#060408);border-top:1px solid rgba(255,255,255,0.06);padding:60px 0 32px;">
  <div style="max-width:1200px;margin:0 auto;padding:0 24px;">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px;">
      <div>
        <svg style="width:180px;height:45px;display:block;margin-bottom:20px;"><use href="#brand-logo"/></svg>
        <p style="color:var(--c-text-muted,rgba(255,255,255,0.5));font-size:0.9rem;line-height:1.7;max-width:280px;">Crafting exceptional experiences with passion and precision.</p>
      </div>
      <div>
        <p style="color:#fff;font-size:0.75rem;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">Services</p>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;">
          <li><a href="#services" style="color:var(--c-text-muted,rgba(255,255,255,0.5));text-decoration:none;font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--c-accent,#D4A853)'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">Our Services</a></li>
          <li><a href="#portfolio" style="color:var(--c-text-muted,rgba(255,255,255,0.5));text-decoration:none;font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--c-accent,#D4A853)'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">Portfolio</a></li>
          <li><a href="#team" style="color:var(--c-text-muted,rgba(255,255,255,0.5));text-decoration:none;font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--c-accent,#D4A853)'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">Our Team</a></li>
        </ul>
      </div>
      <div>
        <p style="color:#fff;font-size:0.75rem;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">Company</p>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;">
          <li><a href="#about" style="color:var(--c-text-muted,rgba(255,255,255,0.5));text-decoration:none;font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--c-accent,#D4A853)'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">About</a></li>
          <li><a href="#faq" style="color:var(--c-text-muted,rgba(255,255,255,0.5));text-decoration:none;font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--c-accent,#D4A853)'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">FAQ</a></li>
          <li><a href="#contact" style="color:var(--c-text-muted,rgba(255,255,255,0.5));text-decoration:none;font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--c-accent,#D4A853)'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">Contact</a></li>
        </ul>
      </div>
      <div>
        <p style="color:#fff;font-size:0.75rem;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">Follow</p>
        <div style="display:flex;gap:16px;">
          <a href="#" style="width:40px;height:40px;border:1px solid rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;transition:border-color 0.2s,background 0.2s;" onmouseover="this.style.borderColor='var(--c-accent,#D4A853)';this.style.background='rgba(212,168,83,0.1)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="#" style="width:40px;height:40px;border:1px solid rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;transition:border-color 0.2s,background 0.2s;" onmouseover="this.style.borderColor='var(--c-accent,#D4A853)';this.style.background='rgba(212,168,83,0.1)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
          </a>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <p style="color:var(--c-text-muted,rgba(255,255,255,0.4));font-size:0.8rem;margin:0;">© 2026 All rights reserved.</p>
      <p style="color:var(--c-text-muted,rgba(255,255,255,0.4));font-size:0.8rem;margin:0;">Privacy Policy · Terms of Service</p>
    </div>
  </div>
</footer>`;

  html = html.replace('</body>', footer + '\n</body>');
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
    console.error('  Compression error:', err.message);
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
    return JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim());
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY DETECTION + IMAGE CAP
// ─────────────────────────────────────────────────────────────────────────────

function detectIndustry(text) {
  text = text.toLowerCase();
  if (text.includes('nail') || text.includes('beauty bar') || text.includes('manicure') || text.includes('pedicure')) return 'nail_salon';
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
    nail_salon: 14, ecommerce: 16, fashion: 14, skincare: 12, restaurant: 12,
    jewelry: 12, hospitality: 12, aesthetics_clinic: 12, wellness: 10,
    fitness: 10, real_estate: 10, photography: 10, coffee: 10,
    trades: 10, aerospace: 10, music: 8, robotics: 8, portfolio: 8,
    business: 8, saas: 6, technology: 6,
  };
  return caps[industry] || 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE GENERATION — Imagen 4 (imagen-4.0-generate-001)
// Confirmed working endpoint as of May 2026
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
    if (!apiKey) { console.error('  GOOGLE_API_KEY not set'); return null; }

    // Imagen 4 — confirmed working model name May 2026
    const model = 'imagen-4.0-generate-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: normalizeAspectRatio(aspectRatio),
          safetySetting: 'block_low_and_above',
          personGeneration: 'allow_adult',
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`  Image API error [${model}]:`, JSON.stringify(data).substring(0, 250));
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

  const ds1 = /<img[^>]*data-slot="([^"]*)"[^>]*src="([^"]*)"[^>]*/gi;
  const ds2 = /<img[^>]*src="([^"]*)"[^>]*data-slot="([^"]*)"[^>]*/gi;
  let m;
  while ((m = ds1.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); slots.push({ id: m[1], src: m[2], type: 'data-slot' }); }
  }
  while ((m = ds2.exec(html)) !== null) {
    if (!seen.has(m[2])) { seen.add(m[2]); slots.push({ id: m[2], src: m[1], type: 'data-slot' }); }
  }

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

  const bgPat = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]*)['"]?\)/gi;
  while ((m = bgPat.exec(html)) !== null) {
    if (!seen.has(m[1]) && !m[1].startsWith('data:')) {
      seen.add(m[1]);
      const ctx = html.substring(Math.max(0,m.index-200),m.index).toLowerCase();
      slots.push({ id: ctx.includes('hero')||ctx.includes('banner') ? 'hero-background-fullscreen' : `bg-${slots.length}`, src: m[1], type: 'background' });
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

  let promptData = [];
  try {
    const req = `Brand context: ${userRequest.substring(0,800)}
Industry: ${industry}
Write a photorealistic Imagen 4 prompt for each slot. Match brand aesthetic exactly. End each with ", no text, no watermarks, no logos, professional photography"
Slots: ${slots.map((s,i) => `${i}. "${s.id}"`).join('\n')}
Return JSON array: [{"index":0,"prompt":"...","aspect_ratio":"16:9"},...]
aspect_ratio: "16:9" heroes/banners, "1:1" portraits/square, "4:3" lifestyle, "3:4" portrait`;
    promptData = await callClaudeJson(req, 3000);
    console.log(`[${jobId}] Generated ${promptData.length} prompts`);
  } catch (err) {
    console.error(`[${jobId}] Prompt gen failed, using fallback`);
    promptData = slots.map((s,i) => ({
      index: i,
      prompt: `Premium ${industry} brand photography, cinematic lighting, no text, no watermarks, professional photography`,
      aspect_ratio: s.id.includes('hero')||s.id.includes('background') ? '16:9' : '1:1'
    }));
  }

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

  for (const r of results) {
    if (!r.img) continue;
    try {
      if (r.type === 'data-slot') {
        const eid = r.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        html = html.replace(new RegExp(`(<img[^>]*src=")[^"]*("[^>]*data-slot="${eid}"[^>]*>)`,'gi'), `$1${r.img}$2`);
        html = html.replace(new RegExp(`(<img[^>]*data-slot="${eid}"[^>]*src=")[^"]*("[^>]*>)`,'gi'), `$1${r.img}$2`);
      } else if (r.type === 'background') {
        const esc = r.src.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        html = html.replace(new RegExp(esc,'g'), r.img);
      } else {
        const esc = r.src.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        html = html.replace(new RegExp(`src="${esc}"`,'gi'), `src="${r.img}"`);
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
  console.log(`[${jobId}] Contact: ${contactEmail || 'none'}`);
  console.log(`[${jobId}] Keys: Anthropic=${!!process.env.ANTHROPIC_API_KEY} Google=${!!process.env.GOOGLE_API_KEY}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Connection', 'close');
  res.end(JSON.stringify({ jobId }));

  (async () => {
    try {
      // ── PASS 1 ─────────────────────────────────────────────────────────────
      console.log(`\n[${jobId}] ── PASS 1: Full site generation`);
      jobs[jobId].phase = 'pass1';
      const pass1Html = await callClaude(MASTER_SYSTEM_PROMPT, userRequest, 32000);
      console.log(`[${jobId}] Pass 1: ${pass1Html.length} chars`);
      if (pass1Html.length < 8000) throw new Error(`Pass 1 too short: ${pass1Html.length}`);

      // ── PASS 2 — Surgical audit ────────────────────────────────────────────
      console.log(`\n[${jobId}] ── PASS 2: Surgical audit`);
      jobs[jobId].phase = 'pass2';

      const imgSrcs = [];
      const imgPat = /src="(https?:\/\/[^"]+)"/gi;
      let im;
      while ((im = imgPat.exec(pass1Html)) !== null) imgSrcs.push(im[1]);

      const summary = {
        hasCursorDot: pass1Html.includes('cursor-dot'),
        hasNavScroll: pass1Html.includes('scrollY'),
        hasFaq: pass1Html.includes('faq-item') || pass1Html.includes('faq-question'),
        hasTabs: pass1Html.includes('data-tab') && pass1Html.includes('data-panel'),
        hasCarousel: pass1Html.includes('testimonial-slide') || pass1Html.includes('data-slide'),
        hasCounters: pass1Html.includes('data-count'),
        hasReveal: pass1Html.includes('reveal'),
        hasContactForm: pass1Html.includes('contact-form'),
        hasMobileMenu: pass1Html.includes('hamburger') || pass1Html.includes('mobile-toggle'),
        hasFooter: pass1Html.includes('<footer'),
        imgSrcs: imgSrcs.slice(0, 30),
      };

      console.log(`[${jobId}] Summary flags:`, JSON.stringify(summary).substring(0, 200));

      let pass2Json = { fixes: [], slots: [] };
      try {
        const pass2Raw = await callClaudeRaw(
          PASS2_SYSTEM_PROMPT,
          `Site audit summary: ${JSON.stringify(summary, null, 2)}\n\nHTML snippet (first 8000 chars):\n${pass1Html.substring(0, 8000)}`,
          8000
        );
        pass2Json = safeParseJson(pass2Raw);
        console.log(`[${jobId}] Pass 2: ${pass2Json.fixes?.length||0} fixes, ${pass2Json.slots?.length||0} slots`);
      } catch (err) {
        console.error(`[${jobId}] Pass 2 failed: ${err.message} — continuing`);
      }

      let html = applyPass2(pass1Html, pass2Json);

      // Post-processing
      if (contactEmail) { html = injectContactEmail(html, contactEmail); console.log(`[${jobId}] Contact email injected`); }
      html = ensureContactSection(html);
      html = ensureFooter(html);

      // ── PASS 3 ─────────────────────────────────────────────────────────────
      console.log(`\n[${jobId}] ── PASS 3: Image generation`);
      jobs[jobId].phase = 'pass3';
      const finalHtml = await injectBrandedImages(html, userRequest, jobId);

      jobs[jobId] = { status: 'done', phase: 'complete', html: finalHtml };
      console.log(`\n[${jobId}] ✓ Complete. Final: ${(finalHtml.length/1024/1024).toFixed(2)}MB`);

    } catch (err) {
      console.error(`[${jobId}] Fatal: ${err.message}`);
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
  console.log('[test-image] Testing Imagen 4');
  const result = await generateImageWithRetry(
    'A luxury nail salon interior, soft champagne and blush tones, marble surfaces, editorial lighting, no text, no watermarks, professional photography',
    '16:9', 2
  );
  if (result) {
    res.json({ success: true, message: `OK — ${Math.round(result.length/1024)}kb` });
  } else {
    res.json({ success: false, message: 'Failed — check logs' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Axier build server running on port ${PORT}`));
