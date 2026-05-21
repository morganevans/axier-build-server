const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const jobs = {};

const MASTER_SYSTEM_PROMPT = `You are an elite brand designer and frontend developer.
Build one complete, polished, upload-ready single-page website as one HTML file.

The website MUST feel like a fully finished production website that could immediately be uploaded to the internet with no missing sections, no broken interactions, no empty areas, and no unfinished layouts.

The first generated version must already feel complete.

Do NOT generate partial landing pages.
Do NOT generate concept layouts.
Do NOT generate incomplete designs.
Do NOT stop after hero sections.
Do NOT create giant empty spaces.
Do NOT rely on future edits to complete the website.

Every section must be fully designed, populated, styled, and functional.

REQUIRED OUTPUT:
- Raw HTML only.
- Start with <!DOCTYPE html>.
- End with </html>.
- Single file only.
- CSS inside <style>.
- JS inside <script>.
- No markdown.
- No external JS libraries.

REQUIRED SITE QUALITY:
- Make all content specific to the user's business/request.
- No lorem ipsum.
- No empty sections.
- No placeholder buttons that do nothing.
- Use CSS variables: --c-bg, --c-surface, --c-accent, --c-accent2, --c-text, --c-text-muted.
- Use premium typography.
- Use placehold.co images for all image slots. These will be replaced later.
- Include a hidden SVG logo symbol with id="brand-logo".
- Contact form must use id="contact-form" and action="CONTACT_FORM_ENDPOINT".
- If using tabs, each data-tab must have a matching data-panel.
- If using carousels, include prev/next buttons and slides.
- Build a complete first version that could be uploaded immediately.

REQUIRED WEBSITE SECTIONS:
Hero, stats/proof, services/features, about/story, portfolio/results/process, team/providers, testimonials/reviews, FAQ, contact, footer.

IMAGE REQUIREMENTS:
- Every premium website must contain REAL photography sections.
- Use actual <img> tags throughout the site.
- Minimum 8 image elements.
- Use placehold.co only for image src values.
- Every image should include a useful data-slot value.
- Include galleries, feature imagery, lifestyle imagery, products, environments, or portraits depending on industry.
- Do NOT rely primarily on SVG graphics or abstract decorations.
- Decorative SVGs are allowed only as accents.
- Real image layouts are mandatory.

Important:
Do not create narrow side-panel-only layouts for the full page.
Use normal vertical scrolling sections.
Use full-width page sections unless a specific component is intentionally split layout.`;

const HTML_OUTPUT_RULES = `
ABSOLUTE OUTPUT RULES:
- Start with <!DOCTYPE html>
- End with </html>
- No markdown fences
- No explanation
- Raw HTML only`;

function cleanHtml(html) {
  html = String(html || '')
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const doctypeIndex = html.indexOf('<!DOCTYPE');
  const htmlTagIndex = html.indexOf('<html');
  const startIndex = doctypeIndex !== -1 ? doctypeIndex : htmlTagIndex;

  if (startIndex > 0) html = html.substring(startIndex);
  if (!html.includes('</body>')) html += '\n</body>';
  if (!html.includes('</html>')) html += '\n</html>';

  return html;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAnyEmail(text) {
  const match = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function extractContactEmail(userRequest) {
  if (!userRequest) return null;

  const direct = String(userRequest).match(/CONTACT_EMAIL:\s*([^\s\n]+)/i);
  if (direct) return direct[1].trim();

  const phrases = [
    /send\s+(?:contact\s+)?(?:form\s+)?(?:requests|submissions|messages|emails)\s+to\s+([^\s\n]+)/i,
    /contact\s+(?:form\s+)?email\s*:\s*([^\s\n]+)/i,
    /form\s+email\s*:\s*([^\s\n]+)/i
  ];

  for (const p of phrases) {
    const m = String(userRequest).match(p);
    if (m && /@/.test(m[1])) return m[1].trim();
  }

  return extractAnyEmail(userRequest);
}

function getContactEmailFromBody(body) {
  return (
    body.contactEmail ||
    body.email ||
    body.formEmail ||
    body.recipientEmail ||
    extractContactEmail(body.userRequest) ||
    process.env.DEFAULT_CONTACT_EMAIL ||
    'morganevans3000@gmail.com'
  );
}

function injectContactEmail(html, contactEmail) {
  const email = String(contactEmail || process.env.DEFAULT_CONTACT_EMAIL || 'morganevans3000@gmail.com').trim();
  const endpoint = `https://formsubmit.co/${email}`;

  html = html.replace(/CONTACT_FORM_ENDPOINT/g, endpoint);

  if (/<form[^>]*id=["']contact-form["'][^>]*>/i.test(html)) {
    html = html.replace(/<form([^>]*id=["']contact-form["'][^>]*)>/i, (m, attrs) => {
      let next = attrs
        .replace(/\saction=["'][^"']*["']/i, '')
        .replace(/\smethod=["'][^"']*["']/i, '');
      return `<form${next} action="${endpoint}" method="POST">`;
    });
  }

  return html;
}

function getGuaranteedContactSection(contactEmail) {
  const endpoint = `https://formsubmit.co/${String(contactEmail).trim()}`;

  return `
<section id="contact" class="axier-contact-section reveal" style="padding:120px 24px;background:linear-gradient(180deg,var(--c-bg,#060408),var(--c-surface,#100b14));">
  <div style="max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1fr 1.1fr;gap:48px;align-items:start;">
    <div>
      <p style="color:var(--c-accent,#D4A853);font-size:.78rem;letter-spacing:4px;text-transform:uppercase;margin:0 0 16px;">Contact</p>
      <h2 style="font-size:clamp(2.2rem,5vw,4.2rem);line-height:1;margin:0 0 22px;color:var(--c-text,#fff);font-weight:900;">Start the conversation</h2>
      <p style="color:var(--c-text-muted,rgba(255,255,255,.62));font-size:1.08rem;line-height:1.8;max-width:520px;margin:0 0 28px;">Send a message and the team will follow up with details, availability, and next steps.</p>
    </div>

    <div style="border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.055);box-shadow:0 30px 90px rgba(0,0,0,.35);backdrop-filter:blur(18px);border-radius:28px;padding:32px;">
      <div id="contact-success" style="display:none;text-align:center;padding:44px 20px;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--c-accent,#D4A853);color:var(--c-bg,#060408);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:2rem;font-weight:900;">✓</div>
        <h3 style="color:var(--c-text,#fff);font-size:1.5rem;margin:0 0 10px;">Message ready to send</h3>
        <p style="color:var(--c-text-muted,rgba(255,255,255,.6));line-height:1.7;margin:0;">Your submission has been validated and is being sent securely.</p>
      </div>

      <form id="contact-form" action="${endpoint}" method="POST" style="display:grid;gap:18px;">
        <input type="hidden" name="_subject" value="New website enquiry">
        <input type="hidden" name="_captcha" value="false">
        <input type="hidden" name="_template" value="table">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <label style="display:grid;gap:8px;color:var(--c-text,#fff);font-size:.78rem;text-transform:uppercase;letter-spacing:2px;">
            Full Name *
            <input name="name" required placeholder="Your name" style="width:100%;box-sizing:border-box;padding:15px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:var(--c-text,#fff);outline:none;font-size:1rem;">
          </label>
          <label style="display:grid;gap:8px;color:var(--c-text,#fff);font-size:.78rem;text-transform:uppercase;letter-spacing:2px;">
            Email *
            <input name="email" type="email" required placeholder="you@email.com" style="width:100%;box-sizing:border-box;padding:15px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:var(--c-text,#fff);outline:none;font-size:1rem;">
          </label>
        </div>

        <label style="display:grid;gap:8px;color:var(--c-text,#fff);font-size:.78rem;text-transform:uppercase;letter-spacing:2px;">
          Phone
          <input name="phone" placeholder="+1 (555) 000-0000" style="width:100%;box-sizing:border-box;padding:15px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:var(--c-text,#fff);outline:none;font-size:1rem;">
        </label>

        <label style="display:grid;gap:8px;color:var(--c-text,#fff);font-size:.78rem;text-transform:uppercase;letter-spacing:2px;">
          Message *
          <textarea name="message" required rows="6" placeholder="Tell us what you need..." style="width:100%;box-sizing:border-box;padding:15px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:var(--c-text,#fff);outline:none;font-size:1rem;font-family:inherit;resize:vertical;"></textarea>
        </label>

        <button type="submit" class="btn primary-btn" style="width:100%;padding:18px 24px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--c-accent,#D4A853),var(--c-accent2,#E8B4C8));color:var(--c-bg,#060408);font-weight:900;letter-spacing:2px;text-transform:uppercase;cursor:pointer;box-shadow:0 16px 40px rgba(212,168,83,.22);">
          Send Message
        </button>
      </form>
    </div>
  </div>
</section>`;
}
function ensureContactSection(html, contactEmail) {
  if (/<form[^>]*id=["']contact-form["'][^>]*>/i.test(html)) {
    return injectContactEmail(html, contactEmail);
  }

  const section = getGuaranteedContactSection(contactEmail);

  if (/<footer/i.test(html)) {
    return html.replace(/<footer/i, section + '\n<footer');
  }

  return html.replace('</body>', section + '\n</body>');
}

function ensureFooter(html) {
  if (/<footer/i.test(html)) return html;

  const footer = `
<footer id="footer" style="background:var(--c-bg,#060408);border-top:1px solid rgba(255,255,255,.08);padding:64px 24px 34px;">
  <div style="max-width:1200px;margin:0 auto;">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:38px;margin-bottom:44px;">
      <div>
        <svg style="width:190px;height:52px;display:block;margin-bottom:18px;"><use href="#brand-logo"></use></svg>
        <p style="color:var(--c-text-muted,rgba(255,255,255,.58));max-width:340px;line-height:1.7;margin:0;">A polished digital experience built to be launched, shared, and improved.</p>
      </div>
      <div>
        <h4 style="color:var(--c-text,#fff);letter-spacing:2px;text-transform:uppercase;font-size:.8rem;">Explore</h4>
        <a href="#services" style="display:block;color:var(--c-text-muted,rgba(255,255,255,.58));margin:10px 0;text-decoration:none;">Services</a>
        <a href="#portfolio" style="display:block;color:var(--c-text-muted,rgba(255,255,255,.58));margin:10px 0;text-decoration:none;">Work</a>
      </div>
      <div>
        <h4 style="color:var(--c-text,#fff);letter-spacing:2px;text-transform:uppercase;font-size:.8rem;">Company</h4>
        <a href="#about" style="display:block;color:var(--c-text-muted,rgba(255,255,255,.58));margin:10px 0;text-decoration:none;">About</a>
        <a href="#team" style="display:block;color:var(--c-text-muted,rgba(255,255,255,.58));margin:10px 0;text-decoration:none;">Team</a>
      </div>
      <div>
        <h4 style="color:var(--c-text,#fff);letter-spacing:2px;text-transform:uppercase;font-size:.8rem;">Contact</h4>
        <a href="#contact" style="display:block;color:var(--c-text-muted,rgba(255,255,255,.58));margin:10px 0;text-decoration:none;">Get in touch</a>
        <a href="#faq" style="display:block;color:var(--c-text-muted,rgba(255,255,255,.58));margin:10px 0;text-decoration:none;">FAQ</a>
      </div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:22px;color:var(--c-text-muted,rgba(255,255,255,.45));display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:.88rem;">
      <span>© 2026. All rights reserved.</span>
      <span>Privacy Policy · Terms</span>
    </div>
  </div>
</footer>`;

  return html.replace('</body>', footer + '\n</body>');
}

function ensureLogo(html, userRequest) {
  const hasLogo = /<symbol[^>]*id=["']brand-logo["']/i.test(html);
  if (hasLogo) return html;

  const text = String(userRequest || '').match(/(?:for|called|named)\s+([A-Za-z0-9&'. -]{2,40})/i);
  const name = text ? text[1].trim().split(/\s+/).slice(0, 3).join(' ') : 'AXIER';

  const logo = `
<svg style="display:none" aria-hidden="true">
  <symbol id="brand-logo" viewBox="0 0 300 70">
    <defs>
      <linearGradient id="brandLogoGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="var(--c-accent,#D4A853)"/>
        <stop offset="100%" stop-color="var(--c-accent2,#E8B4C8)"/>
      </linearGradient>
    </defs>
    <circle cx="35" cy="35" r="25" fill="url(#brandLogoGradient)" opacity=".95"/>
    <path d="M24 46 L35 18 L47 46 M29 38 H42" fill="none" stroke="#060408" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="76" y="42" fill="#fff" font-size="25" font-weight="900" letter-spacing="3" font-family="Arial, sans-serif">${name.toUpperCase().replace(/&/g, '&amp;')}</text>
    <line x1="76" y1="50" x2="210" y2="50" stroke="var(--c-accent,#D4A853)" stroke-width="2" opacity=".55"/>
  </symbol>
</svg>`;

  return html.replace(/<body[^>]*>/i, match => `${match}\n${logo}`);
}

function ensureRootStyles(html) {
  const rootVars = `
<style id="axier-core-fallback-styles">
html{scroll-behavior:smooth;}
body{
  margin:0;
  overflow-x:hidden!important;
  overflow-y:auto!important;
}
img{max-width:100%;}
input:focus,textarea:focus{
  border-color:var(--c-accent,#D4A853)!important;
  box-shadow:0 0 0 4px rgba(212,168,83,.14)!important;
}
#cursor-dot{
  position:fixed;
  width:12px;
  height:12px;
  border-radius:999px;
  background:var(--c-accent,#D4A853);
  pointer-events:none;
  z-index:2147483647;
  transform:translate(-50%,-50%);
  left:50%;
  top:50%;
  box-shadow:0 0 14px var(--c-accent,#D4A853),0 0 34px var(--c-accent,#D4A853);
  transition:width .2s ease,height .2s ease,opacity .2s ease;
}
#cursor-dot.large{width:36px;height:36px;opacity:.6;}
@media(max-width:760px){
  .axier-contact-section > div{grid-template-columns:1fr!important;}
  .axier-contact-section form > div{grid-template-columns:1fr!important;}
}
</style>`;

  html = html.replace(/<style[^>]*id=["']axier-core-fallback-styles["'][\s\S]*?<\/style>/i, '');
  return html.replace('</head>', rootVars + '\n</head>');
}

function ensureCursorElement(html) {
  if (html.includes('id="cursor-dot"')) return html;
  return html.replace(/<body[^>]*>/i, match => `${match}\n<div id="cursor-dot"></div>`);
}

function getCoreJs() {
  return `
<script id="axier-core-js">
(function(){
  function ready(fn){
    if(document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function(){
    document.body.classList.add('js-loaded');

    (function(){
      var dot = document.getElementById('cursor-dot');
      if(!dot) return;

      var mx = window.innerWidth / 2;
      var my = window.innerHeight / 2;
      var cx = mx;
      var cy = my;

      document.addEventListener('mousemove', function(e){
        mx = e.clientX;
        my = e.clientY;
        dot.style.opacity = '1';
      });

      document.addEventListener('mouseleave', function(){ dot.style.opacity = '0'; });
      document.addEventListener('mouseenter', function(){ dot.style.opacity = '1'; });

      document.querySelectorAll('a,button,input,textarea,select,[role="button"],[data-tab],.btn').forEach(function(el){
        el.addEventListener('mouseenter', function(){ dot.classList.add('large'); });
        el.addEventListener('mouseleave', function(){ dot.classList.remove('large'); });
      });

      (function loop(){
        cx += (mx - cx) * 0.14;
        cy += (my - cy) * 0.14;
        dot.style.left = cx + 'px';
        dot.style.top = cy + 'px';
        requestAnimationFrame(loop);
      })();
    })();

    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var href = a.getAttribute('href');
        if(!href || href === '#') return;
        var target = document.querySelector(href);
        if(target){
          e.preventDefault();
          target.scrollIntoView({ behavior:'smooth', block:'start' });
        }
      });
    });

    (function(){
      var nav = document.querySelector('nav,header,.navbar,#navbar');
      if(!nav) return;

      function update(){
        if(window.scrollY > 70){
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
      }

      window.addEventListener('scroll', update, { passive:true });
      update();
    })();

    (function(){
      var btn = document.querySelector('.hamburger,.mobile-toggle,#mobile-toggle,[data-mobile-toggle],.nav-hamburger');
      var menu = document.querySelector('.mobile-menu,.nav-overlay,#mobile-menu,[data-mobile-menu]');
      if(!btn || !menu) return;

      btn.addEventListener('click', function(){
        var open = menu.classList.contains('open');
        menu.classList.toggle('open', !open);
        btn.classList.toggle('active', !open);
        menu.style.display = open ? 'none' : 'flex';
      });

      menu.querySelectorAll('a').forEach(function(a){
        a.addEventListener('click', function(){
          menu.classList.remove('open');
          btn.classList.remove('active');
          menu.style.display = 'none';
        });
      });
    })();

    (function(){
      var items = document.querySelectorAll('.reveal,.slide-left,.slide-right,.scale-in');
      if(!items.length) return;

      if(!('IntersectionObserver' in window)){
        items.forEach(function(el){ el.classList.add('visible'); });
        return;
      }

      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold:.08, rootMargin:'0px 0px -40px 0px' });

      items.forEach(function(el){ io.observe(el); });
    })();

    (function(){
      var counters = document.querySelectorAll('[data-count]');
      if(!counters.length) return;

      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting) return;

          var el = entry.target;
          var target = Number(el.dataset.count || 0);
          var suffix = el.dataset.suffix || '';
          var value = 0;
          var step = Math.max(1, target / 60);

          var timer = setInterval(function(){
            value += step;
            if(value >= target){
              value = target;
              clearInterval(timer);
            }
            el.textContent = Math.floor(value).toLocaleString() + suffix;
          }, 16);

          io.unobserve(el);
        });
      }, { threshold:.4 });

      counters.forEach(function(el){ io.observe(el); });
    })();

        (function(){
      var items = document.querySelectorAll('.faq-item,[data-faq]');
      if(!items.length) return;

      items.forEach(function(item){
        var q = item.querySelector('.faq-question,[data-faq-q]');
        var a = item.querySelector('.faq-answer,[data-faq-a]');
        if(!q || !a) return;

        q.addEventListener('click', function(){
          var open = item.classList.contains('open');

          items.forEach(function(other){
            other.classList.remove('open');
            var oa = other.querySelector('.faq-answer,[data-faq-a]');
            if(oa) oa.style.maxHeight = '0';
          });

          if(!open){
            item.classList.add('open');
            a.style.maxHeight = a.scrollHeight + 40 + 'px';
          }
        });
      });
    })();

    (function(){
      var tabs = document.querySelectorAll('[data-tab]');
      var panels = document.querySelectorAll('[data-panel]');
      if(!tabs.length || !panels.length) return;

      function show(name){
        tabs.forEach(function(tab){
          tab.classList.toggle('active', tab.dataset.tab === name);
        });

        panels.forEach(function(panel){
          var active = panel.dataset.panel === name;
          panel.style.display = active ? 'block' : 'none';
          panel.classList.toggle('active', active);
        });
      }

      tabs.forEach(function(tab){
        tab.addEventListener('click', function(){
          show(tab.dataset.tab);
        });
      });

      show(tabs[0].dataset.tab);
    })();

    (function(){
      var slides = document.querySelectorAll('.testimonial-slide,[data-slide]');
      var track = document.querySelector('.testimonials-track');
      var cards = document.querySelectorAll('.testimonial-card');
      var prev = document.querySelector('.carousel-prev,[data-prev],.test-nav-btn.prev,.test-prev');
      var next = document.querySelector('.carousel-next,[data-next],.test-nav-btn.next,.test-next');
      var dots = document.querySelectorAll('.carousel-dot,[data-dot],.test-dot');

      if(!slides.length && !cards.length) return;

      var set = slides.length ? slides : cards;
      var cur = 0;

      function show(n){
        cur = ((n % set.length) + set.length) % set.length;

        if(track){
          track.style.transform = 'translateX(' + (-cur * 33.333) + '%)';
        }

        set.forEach(function(slide, i){
          slide.classList.toggle('active', i === cur);
          if(slides.length) slide.style.display = i === cur ? 'block' : 'none';
        });

        dots.forEach(function(dot, i){
          dot.classList.toggle('active', i === cur);
        });
      }

      if(prev) prev.addEventListener('click', function(){ show(cur - 1); });
      if(next) next.addEventListener('click', function(){ show(cur + 1); });

      dots.forEach(function(dot, i){
        dot.addEventListener('click', function(){ show(i); });
      });

      show(0);
    })();

    (function(){
      var form = document.getElementById('contact-form');
      var success = document.getElementById('contact-success') || document.querySelector('.form-success');
      if(!form) return;

      form.addEventListener('submit', function(e){
        var name = form.querySelector('[name="name"]');
        var email = form.querySelector('[name="email"]');
        var msg = form.querySelector('[name="message"]');

        if(!name || !name.value.trim()){
          e.preventDefault();
          if(name) name.focus();
          return;
        }

        if(!email || !email.value.trim()){
          e.preventDefault();
          if(email) email.focus();
          return;
        }

        if(!msg || !msg.value.trim()){
          e.preventDefault();
          if(msg) msg.focus();
          return;
        }

        if(success){
          setTimeout(function(){
            success.style.display = 'block';
            success.classList.add('show');
          }, 300);
        }
      });
    })();
  });
})();
</script>`;
}

function ensureCoreJs(html) {
  html = html.replace(/<script[^>]*id=["']axier-core-js["'][\s\S]*?<\/script>/i, '');
  return html.replace('</body>', getCoreJs() + '\n</body>');
}

function validateTabs(html) {
  const tabMatches = [...html.matchAll(/data-tab=["']([^"']+)["']/gi)].map(m => m[1]);
  const panelMatches = [...html.matchAll(/data-panel=["']([^"']+)["']/gi)].map(m => m[1]);

  const missing = tabMatches.filter(t => !panelMatches.includes(t));

  return {
    tabCount: tabMatches.length,
    panelCount: panelMatches.length,
    missingPanels: missing
  };
}

function getQualityReport(html) {
  const sections = [...html.matchAll(/<section[^>]*id=["']([^"']+)["']/gi)].map(m => m[1]);

  return {
    sectionIds: sections,
    hasLogo: /id=["']brand-logo["']/i.test(html),
    hasContactForm: /id=["']contact-form["']/i.test(html),
    hasRealContactEndpoint: /formsubmit\.co/i.test(html),
    hasCursor: /id=["']cursor-dot["']/i.test(html) && /mousemove/i.test(html),
    imageCount: (html.match(/<img\b/gi) || []).length,
    tabs: validateTabs(html),
    htmlChars: html.length
  };
}

function finalQualityEnforce(html, userRequest, contactEmail) {
  html = cleanHtml(html);
  html = ensureRootStyles(html);
  html = ensureLogo(html, userRequest);
  html = ensureCursorElement(html);
  html = ensureFooter(html);
  html = ensureContactSection(html, contactEmail);
  html = injectContactEmail(html, contactEmail);
  html = ensureCoreJs(html);

  return html;
}

async function expandIncompleteWebsite(html, userRequest, qualityReport, jobId) {
  const needsExpansion =
    qualityReport.sectionIds.length < 6 ||
    qualityReport.imageCount < 4;

  if (!needsExpansion) {
    console.log(`[${jobId}] Expansion pass skipped`);
    return html;
  }

  console.log(`[${jobId}] PASS 2.5: website expansion repair`);

  const existingSections = qualityReport.sectionIds.join(', ') || 'none';

  const repairPrompt = `
You previously generated an incomplete website.

CURRENT ISSUES:
- Existing sections: ${existingSections}
- Current image count: ${qualityReport.imageCount}
- Website is missing important full-page sections.
- Website does not contain enough real <img> elements.
- The design style itself is good and MUST be preserved.

YOUR TASK:
Expand this into a COMPLETE premium website while preserving the exact existing visual direction, typography, spacing, colors, and brand identity.

VERY IMPORTANT:
- DO NOT restart from scratch.
- DO NOT change the style direction.
- DO NOT convert into side panels.
- DO NOT remove existing sections.
- EXPAND the website.

YOU MUST ADD:
- stats/proof section
- services/features section
- about/story section
- portfolio/results/gallery section
- testimonials/reviews section
- FAQ section
- enhanced footer
- more image sections

VERY IMPORTANT IMAGE RULES:
- Use REAL image tags.
- Use placehold.co placeholders ONLY.
- Minimum 8 image placeholders.
- Example:
<img src="https://placehold.co/1200x800" data-slot="luxury-gallery-1">

DO NOT:
- use only SVG illustrations
- use only gradients
- use only CSS graphics

Keep all existing branding and styling.

USER REQUEST:
${userRequest}

CURRENT HTML:
${html}

Return ONLY the improved full HTML document.
`;

  let repaired = await callClaude(
    MASTER_SYSTEM_PROMPT,
    repairPrompt,
    24000
  );

  repaired = cleanHtml(repaired);

  console.log(
    `[${jobId}] Expansion pass complete. New size: ${(repaired.length / 1024).toFixed(0)}kb`
  );

  return repaired;
}

async function compressBase64Image(base64DataUrl, targetWidthPx = 1200) {
  try {
    const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return base64DataUrl;

    const inputBuffer = Buffer.from(matches[2], 'base64');

    const outputBuffer = await sharp(inputBuffer)
      .resize(targetWidthPx, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({
        quality: 82,
        progressive: true
      })
      .toBuffer();

    console.log(
      `  Compressed: ${Math.round(inputBuffer.length / 1024)}kb → ${Math.round(outputBuffer.length / 1024)}kb`
    );

    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Compression error:', err.message);
    return base64DataUrl;
  }
}

async function callClaude(systemPrompt, userMessage, maxTokens = 22000) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 1200000);

  try {
    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_BUILD_MODEL || 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          stream: true,
          system: systemPrompt + HTML_OUTPUT_RULES,
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ]
        }),
        signal: controller.signal
      }
    );

      if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic HTTP ${response.status}: ${errText.substring(0, 500)}`);
    }

    let fullText = '';
    let chunkCount = 0;
    const decoder = new TextDecoder();
    const reader = response.body;

    await new Promise((resolve, reject) => {
      let buffer = '';

      reader.on('data', chunk => {
        buffer += decoder.decode(chunk, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();

          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta &&
              parsed.delta.type === 'text_delta'
            ) {
              fullText += parsed.delta.text;
              chunkCount++;

              if (chunkCount % 100 === 0) {
                console.log(`  Streaming... ${fullText.length} chars received`);
              }
            }
          } catch {}
        }
      });

      reader.on('end', resolve);
      reader.on('error', reject);
    });

    if (!fullText) {
      throw new Error('Claude stream returned empty response');
    }

    return cleanHtml(fullText);
  } finally {
    clearTimeout(timeout);
  }
}

async function callClaudeJson(userMessage, maxTokens = 3500) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 120000);

  try {
    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_JSON_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          system: 'You return raw valid JSON only. No markdown. No explanation.',
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ]
        }),
        signal: controller.signal
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(`Anthropic error: ${data.error.message}`);
    }

    let raw = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text
      : '';

    raw = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const startArray = raw.indexOf('[');
    const endArray = raw.lastIndexOf(']');

    if (startArray !== -1 && endArray !== -1) {
      raw = raw.substring(startArray, endArray + 1);
    }

    return JSON.parse(raw);
  } finally {
    clearTimeout(timeout);
  }
}

function detectIndustry(text) {
  text = String(text || '').toLowerCase();

  if (
    text.includes('jewelry') ||
    text.includes('jewellery') ||
    text.includes('ring') ||
    text.includes('necklace') ||
    text.includes('diamond') ||
    text.includes('luxury jewelry') ||
    text.includes('earrings')
  ) {
    return 'jewelry';
  }

  if (
    text.includes('med spa') ||
    text.includes('medspa') ||
    text.includes('aesthetic') ||
    text.includes('injectable') ||
    text.includes('botox') ||
    text.includes('filler') ||
    text.includes('laser clinic')
  ) {
    return 'aesthetics_clinic';
  }

  if (text.includes('nail') || text.includes('manicure') || text.includes('pedicure')) return 'nail_salon';
  if (text.includes('skincare') || text.includes('cosmetic') || text.includes('beauty')) return 'skincare';
  if (text.includes('fashion') || text.includes('clothing') || text.includes('apparel')) return 'fashion';
  if (text.includes('restaurant') || text.includes('dining') || text.includes('food')) return 'restaurant';
  if (text.includes('coffee') || text.includes('cafe') || text.includes('espresso')) return 'coffee';
  if (text.includes('fitness') || text.includes('gym') || text.includes('workout')) return 'fitness';
  if (text.includes('real estate') || text.includes('property')) return 'real_estate';
  if (text.includes('technology') || text.includes('tech') || text.includes('software') || text.includes('saas')) return 'technology';
  if (text.includes('music') || text.includes('band') || text.includes('artist')) return 'music';
  if (text.includes('photography') || text.includes('photographer')) return 'photography';
  if (text.includes('hotel') || text.includes('resort') || text.includes('travel')) return 'hospitality';
  if (text.includes('wellness') || text.includes('spa') || text.includes('yoga')) return 'wellness';
  if (text.includes('plumb') || text.includes('hvac') || text.includes('electrician') || text.includes('contractor')) return 'trades';
  if (text.includes('store') || text.includes('shop') || text.includes('ecommerce') || text.includes('product')) return 'ecommerce';
  if (text.includes('portfolio') || text.includes('agency') || text.includes('creative')) return 'portfolio';
  if (text.includes('aerospace') || text.includes('rocket') || text.includes('space') || text.includes('satellite')) return 'aerospace';
  if (text.includes('landing') || text.includes('app')) return 'saas';

  return 'business';
}

function getImageCap(industry) {
  const caps = {
    nail_salon: 14,
    ecommerce: 16,
    fashion: 14,
    skincare: 12,
    restaurant: 12,
    jewelry: 14,
    hospitality: 12,
    aesthetics_clinic: 14,
    wellness: 10,
    fitness: 10,
    real_estate: 10,
    photography: 10,
    coffee: 10,
    trades: 10,
    aerospace: 10,
    music: 8,
    robotics: 8,
    portfolio: 8,
    business: 8,
    saas: 8,
    technology: 8
  };

  return caps[industry] || 8;
}

function normalizeAspectRatio(ar) {
  const valid = ['16:9', '1:1', '4:3', '3:4', '9:16'];
  return valid.includes(ar) ? ar : '1:1';
}

async function generateImageWithRetry(prompt, aspectRatio = '1:1', maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateImage(prompt, aspectRatio);

      if (result) {
        return result;
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (err) {
      console.error(`Image attempt ${attempt} error: ${err.message}`);

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  return null;
}

async function generateImage(prompt, aspectRatio = '1:1') {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_API_KEY not set');
      return null;
    }

    const model = process.env.IMAGEN_MODEL || 'imagen-4.0-generate-001';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [
          {
            prompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: normalizeAspectRatio(aspectRatio),
          safetySetting: 'block_low_and_above',
          personGeneration: 'allow_adult'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Image API error [${model}]:`, JSON.stringify(data).substring(0, 500));
      return null;
    }

    const prediction = data.predictions && data.predictions[0]
      ? data.predictions[0]
      : null;

    if (!prediction || !prediction.bytesBase64Encoded) {
      console.error('No bytesBase64Encoded in image response');
      return null;
    }

    const mimeType = prediction.mimeType || 'image/png';

    return await compressBase64Image(
      `data:${mimeType};base64,${prediction.bytesBase64Encoded}`,
      1200
    );
  } catch (err) {
    console.error('generateImage error:', err.message);
    return null;
  }
}

function extractImageSlots(html) {
  const slots = [];
  const seen = new Set();

  const withDataSlot1 = /<img[^>]*data-slot=["']([^"']+)["'][^>]*src=["']([^"']+)["'][^>]*>/gi;
  const withDataSlot2 = /<img[^>]*src=["']([^"']+)["'][^>]*data-slot=["']([^"']+)["'][^>]*>/gi;

  let m;

  while ((m = withDataSlot1.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      slots.push({
        id: m[1],
        src: m[2],
        type: 'data-slot'
      });
    }
  }

  while ((m = withDataSlot2.exec(html)) !== null) {
    if (!seen.has(m[2])) {
      seen.add(m[2]);
      slots.push({
        id: m[2],
        src: m[1],
        type: 'data-slot'
      });
    }
  }

  const placeholders = [
    /src=["'](https?:\/\/placehold\.co[^"']*)["']/gi,
    /src=["'](https?:\/\/via\.placeholder[^"']*)["']/gi,
    /src=["'](https?:\/\/picsum\.photos[^"']*)["']/gi,
    /src=["'](https?:\/\/dummyimage[^"']*)["']/gi
  ];

  for (const pat of placeholders) {
    pat.lastIndex = 0;

    while ((m = pat.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);

        slots.push({
          id: `placeholder-${slots.length}`,
          src: m[1],
          type: 'src'
        });
      }
    }
  }

  const bgPat = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]*)['"]?\)/gi;

  while ((m = bgPat.exec(html)) !== null) {
    if (!seen.has(m[1]) && !m[1].startsWith('data:')) {
      seen.add(m[1]);

      const ctx = html
        .substring(Math.max(0, m.index - 200), m.index)
        .toLowerCase();

      slots.push({
        id: ctx.includes('hero') || ctx.includes('banner')
          ? 'hero-background-fullscreen'
          : `background-${slots.length}`,
        src: m[1],
        type: 'background'
      });
    }
  }

  return slots;
}

async function injectBrandedImages(html, userRequest, jobId) {
  console.log(`[${jobId}] Pass 3: image generation`);

  const industry = detectIndustry(userRequest);
  const cap = getImageCap(industry);

  const rawSlots = extractImageSlots(html);

  console.log(`[${jobId}] Industry: ${industry} | Found slots: ${rawSlots.length} | Cap: ${cap}`);

  if (!rawSlots.length) {
    return html;
  }

  const slots = rawSlots.slice(0, cap);

  let promptData = [];

  try {
    const promptRequest = `
Brand context:
${String(userRequest || '').substring(0, 1200)}

Industry: ${industry}

Create photorealistic image prompts for each website image slot.
Return valid raw JSON array only:
[
  {"index":0,"prompt":"...","aspect_ratio":"16:9"}
]

Rules:
- Match the brand and industry.
- No text, no watermarks, no logos.
- Professional photography.
- Use 16:9 for hero/banner/wide scenes.
- Use 1:1 for portraits or square cards.
- Use 4:3 for general lifestyle/product images.

Slots:
${slots.map((s, i) => `${i}. ${s.id}`).join('\n')}
`;

    promptData = await callClaudeJson(promptRequest, 3500);
  } catch (err) {
    console.error(`[${jobId}] Image prompt generation failed: ${err.message}`);

    promptData = slots.map((slot, i) => ({
      index: i,
      prompt: `Premium ${industry} brand photography, cinematic lighting, elegant composition, no text, no watermarks, no logos, professional photography`,
      aspect_ratio: slot.id.includes('hero') || slot.id.includes('background') ? '16:9' : '1:1'
    }));
  }

  const results = await Promise.all(
    slots.map(async (slot, i) => {
      const entry = promptData.find(p => Number(p.index) === i) || promptData[i];

      if (!entry || !entry.prompt) {
        return {
          ...slot,
          img: null
        };
      }

      console.log(`[${jobId}] Generating image [${i + 1}/${slots.length}]: ${slot.id}`);

      const img = await generateImageWithRetry(
        `${entry.prompt}, no text, no watermarks, no logos, professional photography`,
        entry.aspect_ratio || '1:1',
        2
      );

      return {
        ...slot,
        img
      };
    })
  );

  const ok = results.filter(r => r.img).length;

  console.log(`[${jobId}] Images successful: ${ok}/${slots.length}`);

  for (const r of results) {
    if (!r.img) continue;

    try {
      if (r.type === 'data-slot') {
        const eid = escapeRegExp(r.id);

        html = html.replace(
          new RegExp(`(<img[^>]*src=["'])[^"']*(["'][^>]*data-slot=["']${eid}["'][^>]*>)`, 'gi'),
          `$1${r.img}$2`
        );

        html = html.replace(
          new RegExp(`(<img[^>]*data-slot=["']${eid}["'][^>]*src=["'])[^"']*(["'][^>]*>)`, 'gi'),
          `$1${r.img}$2`
        );
      } else if (r.type === 'background') {
        html = html.replace(new RegExp(escapeRegExp(r.src), 'g'), r.img);
      } else {
        html = html.replace(
          new RegExp(`src=["']${escapeRegExp(r.src)}["']`, 'gi'),
          `src="${r.img}"`
        );
      }
    } catch (err) {
      console.error(`[${jobId}] Image inject error for ${r.id}: ${err.message}`);
    }
  }

  console.log(`[${jobId}] Pass 3 done. HTML size: ${(html.length / 1024 / 1024).toFixed(2)}MB`);

  return html;
}

app.post('/build-async', async (req, res) => {
  const body = req.body || {};
  const userRequest = body.userRequest || '';
  const contactEmail = getContactEmailFromBody(body);

  const jobId = Date.now().toString();

  jobs[jobId] = {
    status: 'pending',
    phase: 'starting',
    html: null,
    error: null,
    report: null
  };

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[${jobId}] Job started`);
  console.log(`[${jobId}] Request length: ${userRequest.length}`);
  console.log(`[${jobId}] Contact email: ${contactEmail}`);
  console.log(`[${jobId}] Keys: Anthropic=${!!process.env.ANTHROPIC_API_KEY} Google=${!!process.env.GOOGLE_API_KEY}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Connection', 'close');
  res.end(JSON.stringify({ jobId }));

  (async () => {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Missing ANTHROPIC_API_KEY');
      }

      jobs[jobId].phase = 'pass1';
      console.log(`[${jobId}] PASS 1: Claude full website generation`);

      let html = await callClaude(
        MASTER_SYSTEM_PROMPT,
        userRequest,
        Number(process.env.CLAUDE_MAX_TOKENS || 22000)
      );

      if (html.length < 5000) {
        throw new Error(`Generated HTML too short: ${html.length}`);
      }

      jobs[jobId].phase = 'quality-enforcement';
      console.log(`[${jobId}] PASS 2: deterministic quality enforcement`);

      html = finalQualityEnforce(html, userRequest, contactEmail);

      let beforeImagesReport = getQualityReport(html);

      console.log(`[${jobId}] Quality before images:`, JSON.stringify(beforeImagesReport));

      html = await expandIncompleteWebsite(
        html,
        userRequest,
        beforeImagesReport,
        jobId
      );

      html = finalQualityEnforce(html, userRequest, contactEmail);

      beforeImagesReport = getQualityReport(html);

      console.log(`[${jobId}] Quality AFTER expansion:`, JSON.stringify(beforeImagesReport));

      jobs[jobId].phase = 'pass3-images';

      html = await injectBrandedImages(
        html,
        userRequest,
        jobId
      );

      jobs[jobId].phase = 'final-quality';

      html = finalQualityEnforce(html, userRequest, contactEmail);

      const finalReport = getQualityReport(html);

      console.log(`[${jobId}] Final quality report:`, JSON.stringify(finalReport));

      jobs[jobId] = {
        status: 'done',
        phase: 'complete',
        html,
        error: null,
        report: finalReport
      };

      console.log(`[${jobId}] COMPLETE. Final size: ${(html.length / 1024 / 1024).toFixed(2)}MB`);
    } catch (err) {
      console.error(`[${jobId}] Fatal: ${err.message}`);

      jobs[jobId] = {
        status: 'error',
        phase: 'error',
        html: null,
        error: err.message,
        report: null
      };
    }
  })();
});

app.post('/build', async (req, res) => {
  try {
    const body = req.body || {};
    const userRequest = body.userRequest || '';
    const contactEmail = getContactEmailFromBody(body);

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Missing ANTHROPIC_API_KEY');
    }

    let html = await callClaude(
      MASTER_SYSTEM_PROMPT,
      userRequest,
      Number(process.env.CLAUDE_MAX_TOKENS || 22000)
    );

    html = finalQualityEnforce(html, userRequest, contactEmail);

    let report = getQualityReport(html);

    html = await expandIncompleteWebsite(
      html,
      userRequest,
      report,
      'sync'
    );

    html = finalQualityEnforce(html, userRequest, contactEmail);

    html = await injectBrandedImages(
      html,
      userRequest,
      'sync'
    );

    html = finalQualityEnforce(html, userRequest, contactEmail);

    res.json({
      html,
      report: getQualityReport(html)
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.get('/job/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];

  if (!job) {
    return res.status(404).json({
      error: 'Job not found'
    });
  }

  res.json(job);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    google: !!process.env.GOOGLE_API_KEY,
    defaultContact: !!process.env.DEFAULT_CONTACT_EMAIL
  });
});

app.get('/test-image', async (req, res) => {
  const result = await generateImageWithRetry(
    'A premium luxury med spa clinic interior, warm bronze lighting, elegant treatment room, cinematic composition, no text, no watermarks, no logos, professional photography',
    '16:9',
    2
  );

  res.json({
    success: !!result,
    message: result
      ? `OK — ${Math.round(result.length / 1024)}kb`
      : 'Failed — check logs'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Axier Build Server',
    status: 'running',
    endpoints: [
      '/build-async',
      '/job/:jobId',
      '/build',
      '/health',
      '/test-image'
    ]
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Axier build server running on port ${PORT}`);
});
