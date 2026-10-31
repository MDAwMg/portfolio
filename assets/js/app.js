/* ============================================================
   HUANG HELOU — Portfolio 2026
   ============================================================ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const STATIC = new URLSearchParams(location.search).has('static');
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ══════════════════════════════════════════════════════════
   1. DOT–LINE NETWORK FIELD
   ══════════════════════════════════════════════════════════ */
class NetField {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    if (!canvas) return;
    this.o = Object.assign({
      density: 16000, min: 34, max: 108, link: 168, speed: .24,
      mouseR: 200, hubs: true, alpha: .22,
      accent: '203,255,60', base: '226,236,240',
      hubLayout: [[.10,.24],[.30,.11],[.53,.27],[.76,.13],[.90,.44],[.72,.70],[.44,.63],[.17,.58]]
    }, opts);
    this.m = { x: -9e9, y: -9e9, on: false };
    this.t = 0; this.alive = true; this.visible = true;
    this.resize();
    this.bindEvents();
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(en => { this.visible = en[0].isIntersecting; }, { threshold: 0 })
        .observe(this.canvas);
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width  = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.build();
  }

  build() {
    const n = clamp(Math.round((this.w * this.h) / this.o.density), this.o.min, this.o.max);
    this.pts = Array.from({ length: n }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - .5) * this.o.speed * 2,
      vy: (Math.random() - .5) * this.o.speed * 2,
      r: .7 + Math.random() * 1.2,
      ph: Math.random() * Math.PI * 2
    }));

    this.hubs = this.o.hubLayout.map(([a, b]) => ({
      nx: a, ny: b, x: a * this.w, y: b * this.h
    }));
    this.edges = [];
    if (this.o.hubs) {
      for (let i = 0; i < this.hubs.length; i++) this.edges.push([i, (i + 1) % this.hubs.length]);
      this.edges.push([1, 4], [3, 6], [0, 5]);
    }
  }

  bindEvents() {
    this._onMove = e => {
      const r = this.canvas.getBoundingClientRect();
      this.m.x = e.clientX - r.left;
      this.m.y = e.clientY - r.top;
      this.m.on = true;
    };
    this._onLeave = () => { this.m.on = false; this.m.x = -9e9; this.m.y = -9e9; };
    window.addEventListener('pointermove', this._onMove, { passive: true });
    window.addEventListener('pointerleave', this._onLeave, { passive: true });

    let t = null;
    this._onResize = () => { clearTimeout(t); t = setTimeout(() => this.resize(), 160); };
    window.addEventListener('resize', this._onResize);
  }

  elbow(a, b) {
    const { ctx } = this;
    const dx = b.x - a.x, dy = b.y - a.y;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    if (Math.abs(dx) > Math.abs(dy)) {
      const mx = a.x + dx * .5;
      ctx.lineTo(mx, a.y); ctx.lineTo(mx, b.y); ctx.lineTo(b.x, b.y);
    } else {
      const my = a.y + dy * .5;
      ctx.lineTo(a.x, my); ctx.lineTo(b.x, my); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }

  draw() {
    const { ctx, w, h, o } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    /* ---- hub circuit layer ---- */
    if (o.hubs) {
      ctx.strokeStyle = `rgba(${o.base},.09)`;
      ctx.lineWidth = 1;
      const drift = this.t * .00016;
      this.hubs.forEach((hb, i) => {
        hb.x = hb.nx * w + Math.sin(this.t * .0003 + i) * 9;
        hb.y = hb.ny * h + Math.cos(this.t * .00024 + i * 1.7) * 9;
      });
      this.edges.forEach(([i, j]) => this.elbow(this.hubs[i], this.hubs[j]));

      // hub crosses
      ctx.strokeStyle = `rgba(${o.accent},.34)`;
      this.hubs.forEach((hb, i) => {
        const s = 4.5 + Math.sin(this.t * .0016 + i) * 1.1;
        ctx.beginPath();
        ctx.moveTo(hb.x - s, hb.y); ctx.lineTo(hb.x + s, hb.y);
        ctx.moveTo(hb.x, hb.y - s); ctx.lineTo(hb.x, hb.y + s);
        ctx.stroke();
        // outer ring for 2 hubs
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.arc(hb.x, hb.y, 9 + Math.sin(this.t * .0012 + i) * 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${o.accent},.13)`;
          ctx.stroke();
        }
      });
    }

    /* ---- proximity links ---- */
    const pts = this.pts, L = o.link, L2 = L * L;
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const dx = a.x - b.x; if (dx > L || dx < -L) continue;
        const dy = a.y - b.y; if (dy > L || dy < -L) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > L2) continue;
        const k = 1 - Math.sqrt(d2) / L;
        const al = k * k * o.alpha * 2.1;
        if (al < .012) continue;
        ctx.strokeStyle = `rgba(${o.base},${al.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    /* ---- mouse links ---- */
    if (this.m.on) {
      const near = pts
        .map(p => ({ p, d: Math.hypot(p.x - this.m.x, p.y - this.m.y) }))
        .filter(o2 => o2.d < o.mouseR * 1.25)
        .sort((x, y) => x.d - y.d)
        .slice(0, 5);
      near.forEach(({ p, d }) => {
        const k = 1 - d / (o.mouseR * 1.25);
        ctx.strokeStyle = `rgba(${o.accent},${(k * .5).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(this.m.x, this.m.y); ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });
    }

    /* ---- nodes ---- */
    for (const p of pts) {
      const dm = Math.hypot(p.x - this.m.x, p.y - this.m.y);
      const hot = this.m.on && dm < o.mouseR * .8;
      const tw = .5 + .5 * Math.sin(this.t * .0018 + p.ph);
      if (hot) {
        ctx.fillStyle = `rgba(${o.accent},${(.55 + tw * .4).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + .9, 0, 6.2832); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${o.base},${(.16 + tw * .3).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
    }

    /* ---- cursor reticle inside field ---- */
    if (this.m.on) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(${o.accent},.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.m.x, this.m.y, 15, 0, 6.2832);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.m.x - 22, this.m.y); ctx.lineTo(this.m.x - 9, this.m.y);
      ctx.moveTo(this.m.x + 9, this.m.y);  ctx.lineTo(this.m.x + 22, this.m.y);
      ctx.moveTo(this.m.x, this.m.y - 22); ctx.lineTo(this.m.x, this.m.y - 9);
      ctx.moveTo(this.m.x, this.m.y + 9);  ctx.lineTo(this.m.x, this.m.y + 22);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  step() {
    const { pts, w, h, o } = this;
    for (const p of pts) {
      // organic drift
      p.x += p.vx; p.y += p.vy;

      // mouse field: repel close, attract mid
      if (this.m.on) {
        const dx = this.m.x - p.x, dy = this.m.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < o.mouseR && d > .001) {
          const n = 1 - d / o.mouseR;
          const f = n < .3 ? -1.5 * (1 - n / .3) : .42 * (n - .3);
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }

      // wrap
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }
  }

  _loop(ts) {
    if (!this.alive) return;
    this.t = ts || 0;
    if (!RM && this.visible) this.step();
    if (this.visible) this.draw();
    this.raf = requestAnimationFrame(this._loop);
  }
}

/* ══════════════════════════════════════════════════════════
   2. RADAR CHART
   ══════════════════════════════════════════════════════════ */
function drawRadar(canvas, data, prog = 1) {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(180, rect.width || 400);
  const H = W;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const R = W * .33;
  const N = data.length;
  const ang = i => (Math.PI * 2 * i / N) - Math.PI / 2;
  const pt = (i, k) => [cx + Math.cos(ang(i)) * R * k, cy + Math.sin(ang(i)) * R * k];

  // rings
  for (let r = 1; r <= 4; r++) {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, r / 4);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = r === 4 ? 'rgba(230,240,245,.16)' : 'rgba(230,240,245,.065)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // axes + ticks
  for (let i = 0; i < N; i++) {
    const [x, y] = pt(i, 1);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(230,240,245,.08)';
    ctx.stroke();
    // tick mark
    const [tx1, ty1] = pt(i, .955), [tx2, ty2] = pt(i, .915);
    ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2);
    ctx.strokeStyle = 'rgba(203,255,60,.55)';
    ctx.stroke();
  }

  // data polygon
  ctx.beginPath();
  data.forEach((d, i) => {
    const [x, y] = pt(i, (d.v / 100) * easeOut(prog));
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, 'rgba(203,255,60,.24)');
  g.addColorStop(1, 'rgba(203,255,60,.03)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(203,255,60,.92)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // vertices
  data.forEach((d, i) => {
    const [x, y] = pt(i, (d.v / 100) * easeOut(prog));
    ctx.fillStyle = '#08090B';
    ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    ctx.strokeStyle = 'rgba(203,255,60,.95)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
  });

  // center mark
  ctx.beginPath(); ctx.arc(cx, cy, 1.4, 0, 6.2832);
  ctx.fillStyle = 'rgba(203,255,60,.8)'; ctx.fill();
}

/* ══════════════════════════════════════════════════════════
   3. HERO SPARKLINE
   ══════════════════════════════════════════════════════════ */
function initSpark() {
  const c = $('#spark');
  if (!c) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = c.clientWidth || 240, H = 44;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const N = 46;
  const vals = Array.from({ length: N }, () => .3 + Math.random() * .6);
  let shift = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const step = W / (N - 1);
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = i * step, y = H - 4 - v * (H - 10);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(203,255,60,.22)');
    g.addColorStop(1, 'rgba(203,255,60,0)');
    ctx.fillStyle = g; ctx.fill();

    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = i * step, y = H - 4 - v * (H - 10);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = 'rgba(203,255,60,.75)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const lastX = (N - 1) * step, lastY = H - 4 - vals[N - 1] * (H - 10);
    ctx.beginPath(); ctx.arc(lastX - 1, lastY, 1.8, 0, 6.2832);
    ctx.fillStyle = '#CBFF3C'; ctx.fill();
  }
  draw();
  if (RM) return;
  setInterval(() => {
    vals.shift();
    vals.push(clamp(vals[vals.length - 1] + (Math.random() - .5) * .34, .12, .96));
    shift++;
    draw();
  }, 520);
}

/* ══════════════════════════════════════════════════════════
   4. CURSOR
   ══════════════════════════════════════════════════════════ */
function initCursor() {
  if (!FINE || RM) return;
  const el = $('#cur'), lbl = $('#curLbl');
  if (!el) return;
  document.documentElement.classList.add('cur-on');
  const tx = { x: innerWidth / 2, y: innerHeight / 2 };
  const cur = { ...tx };
  let raf = 0;

  window.addEventListener('pointermove', e => {
    tx.x = e.clientX; tx.y = e.clientY;
    el.classList.add('on');
    if (lbl) lbl.textContent = `X${String(Math.round(e.clientX)).padStart(4, '0')} Y${String(Math.round(e.clientY)).padStart(4, '0')}`;
  }, { passive: true });

  document.addEventListener('pointerleave', () => el.classList.remove('on'));

  const HOT = 'a,button,.card,.fbtn,.mailrow,.cmp__handle,[data-open]';
  document.addEventListener('pointerover', e => {
    if (e.target.closest && e.target.closest(HOT)) el.classList.add('is-hot');
  });
  document.addEventListener('pointerout', e => {
    if (e.target.closest && e.target.closest(HOT)) el.classList.remove('is-hot');
  });

  (function tick() {
    cur.x = lerp(cur.x, tx.x, .18);
    cur.y = lerp(cur.y, tx.y, .18);
    el.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;
    raf = requestAnimationFrame(tick);
  })();
}

/* ══════════════════════════════════════════════════════════
   5. BOOT
   ══════════════════════════════════════════════════════════ */
function initBoot() {
  const boot = $('#boot');
  if (!boot) return;
  if (STATIC) { boot.remove(); return; }
  const seen = sessionStorage.getItem('hh_booted') === '1';
  if (RM || seen) { boot.remove(); return; }
  document.documentElement.style.overflow = 'hidden';

  const lines = [
    ['INITIALIZING PERSONNEL TERMINAL', ''],
    ['LOADING ASSET INDEX', 'OK'],
    ['MOUNTING RENDER ARCHIVE', 'OK'],
    ['CALIBRATING HUD MODULES', 'OK'],
    ['AUTHENTICATED — HUANG HELOU', '']
  ];
  const box = $('#bootLines'), bar = $('#bootBar'), pct = $('#bootPct');
  let i = 0;
  const step = 210;
  const timer = setInterval(() => {
    if (i >= lines.length) return;
    const [label, tag] = lines[i];
    const row = document.createElement('div');
    row.innerHTML = `<b>&gt;</b> ${label} ${tag ? `<i>${'.'.repeat(Math.max(3, 26 - label.length))} ${tag}</i>` : ''}`;
    box.appendChild(row);
    i++;
  }, step);

  const t0 = performance.now();
  const DUR = 1180;
  (function prog() {
    const p = clamp((performance.now() - t0) / DUR, 0, 1);
    bar.style.width = (p * 100) + '%';
    pct.textContent = String(Math.round(p * 100)).padStart(3, '0');
    if (p < 1) requestAnimationFrame(prog);
  })();

  setTimeout(() => {
    clearInterval(timer);
    boot.classList.add('done');
    document.documentElement.style.overflow = '';
    sessionStorage.setItem('hh_booted', '1');
    setTimeout(() => boot.remove(), 1300);
    // kick hero animations
    $$('.hero .hero__inner > *').forEach((n, k) => {
      n.style.animation = `heroIn .9s ${.06 * k}s cubic-bezier(.22,.61,.36,1) both`;
    });
  }, DUR + 180);
}

/* hero entrance */
const heroInStyle = document.createElement('style');
heroInStyle.textContent = `@keyframes heroIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}`;
document.head.appendChild(heroInStyle);

/* ══════════════════════════════════════════════════════════
   6. NAV / SCROLL / RAILS
   ══════════════════════════════════════════════════════════ */
function initNav() {
  const nav = $('#nav');
  const bar = $('#scrollBar');
  const links = $$('.nav__links a');
  const burger = $('#burger');
  const mmenu = $('#mmenu');

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('stuck', y > 24);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.height = (max > 0 ? clamp(y / max, 0, 1) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // rail marks
  const marks = $('#railMarks');
  if (marks) {
    ['works', 'profile', 'experience', 'awards', 'contact'].forEach(() => {
      marks.appendChild(document.createElement('b'));
    });
  }

  const secs = ['works', 'profile', 'experience', 'awards', 'contact']
    .map(id => document.getElementById(id)).filter(Boolean);

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      if (id === 'hero') {
        // 回到首屏时清空高亮，避免导航项一直停留在最后一节
        links.forEach(a => a.classList.remove('on'));
        if (marks) [...marks.children].forEach(b => b.classList.remove('on'));
        return;
      }
      links.forEach(a => a.classList.toggle('on', a.dataset.sec === id));
      const idx = secs.findIndex(s => s.id === id);
      if (marks) [...marks.children].forEach((b, i) => b.classList.toggle('on', i === idx));
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  secs.forEach(s => io.observe(s));
  const heroEl = document.getElementById('hero');
  if (heroEl) io.observe(heroEl);

  // mobile menu
  const close = () => {
    burger.classList.remove('on');
    mmenu.classList.remove('on');
    burger.setAttribute('aria-expanded', 'false');
    mmenu.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  };
  burger.addEventListener('click', () => {
    const on = !mmenu.classList.contains('on');
    burger.classList.toggle('on', on);
    mmenu.classList.toggle('on', on);
    burger.setAttribute('aria-expanded', String(on));
    mmenu.setAttribute('aria-hidden', String(!on));
    document.documentElement.style.overflow = on ? 'hidden' : '';
  });
  $$('.mmenu a').forEach(a => a.addEventListener('click', close));
  window.addEventListener('resize', () => { if (innerWidth > 900) close(); });
}

/* ══════════════════════════════════════════════════════════
   7. REVEAL
   ══════════════════════════════════════════════════════════ */
function initReveal() {
  const els = $$('.reveal, .sec-head');
  if (!('IntersectionObserver' in window) || RM) {
    els.forEach(e => e.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .1 });
    els.forEach(e => io.observe(e));
  }

  // skills bars
  const sk = $('#skills');
  if (sk) {
    const io2 = new IntersectionObserver(en => {
      if (en[0].isIntersecting) { sk.classList.add('in'); io2.disconnect(); }
    }, { threshold: .12 });
    io2.observe(sk);
  }

  // radar
  const rc = $('#radar');
  if (rc && typeof RADAR !== 'undefined') {
    let started = false;
    const io3 = new IntersectionObserver(en => {
      if (!en[0].isIntersecting || started) return;
      started = true; io3.disconnect();
      if (RM) { drawRadar(rc, RADAR, 1); return; }
      const t0 = performance.now(), D = 1300;
      (function anim() {
        const p = clamp((performance.now() - t0) / D, 0, 1);
        drawRadar(rc, RADAR, p);
        if (p < 1) requestAnimationFrame(anim);
      })();
    }, { threshold: .25 });
    io3.observe(rc);
    drawRadar(rc, RADAR, RM ? 1 : 0);
    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => drawRadar(rc, RADAR, 1), 200);
    });
  }
}

/* ══════════════════════════════════════════════════════════
   8. COUNTERS
   ══════════════════════════════════════════════════════════ */
function initCounters() {
  const nodes = $$('[data-count]');
  if (!nodes.length) return;
  const run = (el) => {
    const target = +el.dataset.count;
    if (RM) { el.textContent = target; return; }
    const t0 = performance.now(), D = 1500;
    (function a() {
      const p = clamp((performance.now() - t0) / D, 0, 1);
      el.textContent = Math.round(target * easeOut(p));
      if (p < 1) requestAnimationFrame(a);
    })();
  };
  if (RM) { nodes.forEach(n => n.textContent = n.dataset.count); return; }
  setTimeout(() => nodes.forEach(run), 900);
}

/* ══════════════════════════════════════════════════════════
   9. CLOCK
   ══════════════════════════════════════════════════════════ */
function initClock() {
  const el = $('#hudClock');
  if (!el) return;
  const tick = () => {
    const d = new Date();
    el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(':');
  };
  tick(); setInterval(tick, 1000);
}

/* ══════════════════════════════════════════════════════════
   10. HERO PARALLAX
   ══════════════════════════════════════════════════════════ */
function initParallax() {
  const img = $('#heroImg');
  if (!img || RM || !FINE) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('pointermove', e => {
    tx = (e.clientX / innerWidth - .5) * -14;
    ty = (e.clientY / innerHeight - .5) * -10;
  }, { passive: true });
  (function a() {
    if (window.scrollY < innerHeight * 1.1) {
      cx = lerp(cx, tx, .06); cy = lerp(cy, ty, .06);
      img.style.transform = `scale(1.08) translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
    }
    requestAnimationFrame(a);
  })();
}

/* ══════════════════════════════════════════════════════════
   11. WORK CARDS
   ══════════════════════════════════════════════════════════ */
function videoFor(w, key) {
  return `assets/video/lp_${w.id}.mp4`;
}

function cardHTML(w, i) {
  const cat = CATS[w.cat] || '';
  return `<button class="card" data-id="${w.id}" style="animation-delay:${Math.min(i * 45, 420)}ms" aria-label="查看作品：${w.title}">
    <div class="card__media">
      <img src="assets/img/${w.img}.webp" alt="${w.title}" loading="lazy" decoding="async"${w.pos ? ` style="object-position:${w.pos}"` : ''}>
      ${w.loop ? `<video class="loop" data-src="assets/video/lp_${w.id}.mp4" muted loop playsinline preload="none"${w.pos ? ` style="object-position:${w.pos}"` : ''}></video>` : ''}
    </div>
    <div class="card__grad"></div>
    <span class="card__line"></span>
    <div class="card__top">
      <span class="card__idx">${w.idx}</span>
      <span class="card__cat">${cat}</span>
    </div>
    <span class="card__open">↗</span>
    <div class="card__foot">
      <div>
        <h4>${w.title}</h4>
        <p>${w.latin}</p>
      </div>
      <span class="card__yr">${w.year}</span>
    </div>
  </button>`;
}

const CTA_HTML = `<a class="card card--cta" href="#contact" style="animation-delay:460ms" aria-label="索取完整片单">
  <span class="cta-in">
    <b>↗</b>
    <span class="cta-in__t">FULL&nbsp;PLAYLIST</span>
    <small>还有 4 支短片与工程拆解 · 欢迎来信索取完整片单</small>
  </span>
</a>`;

let FILTER = 'all';

function renderWorks() {
  const grid = $('#worksGrid');
  if (!grid) return;
  const list = FILTER === 'all' ? WORKS : WORKS.filter(w => w.cat === FILTER);
  grid.innerHTML = list.map(cardHTML).join('') + (FILTER === 'all' ? CTA_HTML : '');
  bindCards();
}

function bindCards() {
  $$('.card[data-id]').forEach(card => {
    const v = card.querySelector('video.loop');

    if (FINE && v && !RM) {
      card.addEventListener('pointerenter', () => {
        if (!v.src) v.src = v.dataset.src;
        v.play().then(() => v.classList.add('on')).catch(() => {});
      });
      card.addEventListener('pointerleave', () => {
        v.pause();
        v.currentTime = 0;
        v.classList.remove('on');
      });
    }

    card.addEventListener('click', () => openModal(card.dataset.id));
  });

  // feature block loop
  const feat = $('.feature');
  const fv = feat && feat.querySelector('video.loop');
  if (feat && fv && FINE && !RM) {
    feat.addEventListener('pointerenter', () => {
      if (!fv.src) fv.src = fv.dataset.src;
      fv.play().then(() => fv.classList.add('on')).catch(() => {});
    });
    feat.addEventListener('pointerleave', () => {
      fv.pause(); fv.currentTime = 0; fv.classList.remove('on');
    });
    $('[data-open]', feat).addEventListener('click', e => {
      e.stopPropagation();
      openModal('w01');
    });
    feat.addEventListener('click', e => {
      if (e.target.closest('[data-open]')) return;
      openModal('w01');
    });
  }
}

function initFilters() {
  $$('.fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.fbtn').forEach(b => {
        b.classList.toggle('is-on', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      FILTER = btn.dataset.cat;
      renderWorks();
    });
  });
}

/* ══════════════════════════════════════════════════════════
   12. MODAL
   ══════════════════════════════════════════════════════════ */
let LAST_FOCUS = null;
let MODAL_POOL = [];
let MODAL_IDX = 0;

function currentList() {
  return FILTER === 'all' ? WORKS : WORKS.filter(w => w.cat === FILTER);
}

function openModal(id) {
  const modal = $('#modal');
  const filtered = currentList();
  let pool = filtered.some(w => w.id === id) ? filtered : WORKS;
  let idx = pool.findIndex(w => w.id === id);
  if (idx < 0) return;

  MODAL_POOL = pool;
  MODAL_IDX = idx;
  fillModal(pool[idx]);

  LAST_FOCUS = document.activeElement;
  modal.classList.add('on');
  modal.setAttribute('aria-hidden', 'false');
  document.documentElement.style.overflow = 'hidden';
  const p = $('.modal__panel', modal);
  if (p) p.scrollTop = 0;
  setTimeout(() => $('.modal__close', modal).focus(), 60);
}

function fillModal(w) {
  const media = $('#mMedia');
  $('#mTitle').textContent = w.title;
  $('#mLatin').textContent = w.latin;
  $('.m-id').textContent = `${w.idx} / ${String(WORKS.length + 1).padStart(3, '0')}`;
  $('.m-cat').textContent = CATS[w.cat] || '';
  $('#mDesc').textContent = w.desc;
  $('#mSpec').innerHTML = (w.spec || []).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#mTags').innerHTML = (w.tags || []).map(t => `<span>${t}</span>`).join('');

  if (w.compare) {
    media.innerHTML = `<div class="cmp" data-cmp>
      <img class="cmp__a" src="assets/img/${w.img}.webp" alt="${w.title} — 版本 A">
      <img class="cmp__b" src="assets/img/${w.imgB}.webp" alt="${w.title} — 版本 B" style="clip-path:inset(0 0 0 50%)">
      <span class="cmp__tag cmp__tag--a">${w.id === 'w06' ? '写实渲染' : '版本 A'}</span>
      <span class="cmp__tag cmp__tag--b">${w.id === 'w06' ? '卡通渲染' : '版本 B'}</span>
      <div class="cmp__handle" style="left:50%"></div>
    </div>`;
    initCompare(media.querySelector('[data-cmp]'));
  } else if (w.full) {
    media.innerHTML = `<video src="assets/video/full_${w.id}.mp4" poster="assets/img/${w.img}.webp" controls autoplay muted loop playsinline></video>`;
  } else {
    media.innerHTML = `<img src="assets/img/${w.img}.webp" alt="${w.title}">`;
  }

  modal.dataset.pool = '1';
  $$('.modal__nav').forEach(b => b.disabled = MODAL_POOL.length < 2);
}

function stepModal(dir) {
  const modal = $('#modal');
  if (!modal.classList.contains('on') || MODAL_POOL.length < 2) return;
  MODAL_IDX = (MODAL_IDX + dir + MODAL_POOL.length) % MODAL_POOL.length;
  fillModal(MODAL_POOL[MODAL_IDX]);
  const p = $('.modal__panel', modal);
  if (p) p.scrollTop = 0;
}

function initCompare(root) {
  const b = root.querySelector('.cmp__b');
  const h = root.querySelector('.cmp__handle');
  let drag = false;
  const set = clientX => {
    const r = root.getBoundingClientRect();
    const p = clamp((clientX - r.left) / r.width, 0, 1) * 100;
    b.style.clipPath = `inset(0 0 0 ${p}%)`;
    h.style.left = p + '%';
  };
  root.addEventListener('pointerdown', e => { drag = true; set(e.clientX); root.setPointerCapture(e.pointerId); });
  root.addEventListener('pointermove', e => { if (drag) set(e.clientX); });
  root.addEventListener('pointerup', () => drag = false);
  root.addEventListener('pointercancel', () => drag = false);
}

function initModal() {
  const modal = $('#modal');
  if (!modal) return;
  modal.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeModal();
  });
  $('.modal__close', modal).addEventListener('click', closeModal);
  $$('.modal__nav', modal).forEach(b => b.addEventListener('click', () => stepModal(+b.dataset.nav)));

  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('on')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') stepModal(1);
    if (e.key === 'ArrowLeft') stepModal(-1);
  });

  // keep focus inside the dialog
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])', modal)
      .filter(el => el.offsetWidth || el.offsetHeight);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

function closeModal() {
  const modal = $('#modal');
  modal.classList.remove('on');
  modal.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = '';
  setTimeout(() => { $('#mMedia').innerHTML = ''; }, 320);
  if (LAST_FOCUS) LAST_FOCUS.focus({ preventScroll: true });
}

/* ══════════════════════════════════════════════════════════
   13. STATIC SECTIONS
   ══════════════════════════════════════════════════════════ */
function renderSkills() {
  const root = $('#skills');
  if (!root || typeof SKILLS === 'undefined') return;
  root.innerHTML = SKILLS.map(g => `
    <div class="skillgrp">
      <h4><i>${g.idx}</i>${g.title}<em>${g.latin}</em></h4>
      <ul>
        ${g.items.map(([n, v], k) => `
          <li>
            <div class="s-row"><span class="s-name">${n}</span><span class="s-val">${v}</span></div>
            <div class="s-bar"><i style="--w:${v}%;--d:${.12 + k * .07}s"></i></div>
          </li>`).join('')}
      </ul>
    </div>`).join('');
}

function renderTimeline() {
  const root = $('#timeline');
  if (!root || typeof TIMELINE === 'undefined') return;
  root.innerHTML = TIMELINE.map(t => `
    <li class="reveal">
      <div class="tl__period">${t.period}</div>
      <div class="tl__body">
        <h3>${t.title}</h3>
        <p class="tl__org">${t.org} ${(t.chips || []).map(c => `<span>${c}</span>`).join('')}</p>
        <ul>${(t.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
      </div>
    </li>`).join('');
}

function renderAwards() {
  const root = $('#awardsList');
  if (!root || typeof AWARDS === 'undefined') return;
  root.innerHTML = AWARDS.map(a => `
    <li class="reveal">
      <span class="aw__yr">${a.yr}</span>
      <span class="aw__name">${a.name}</span>
      <span class="aw__prize ${a.hl ? 'hl' : ''}">${a.prize}</span>
    </li>`).join('');
}

function renderRadarLegend() {
  const el = $('#radarLegend');
  if (!el || typeof RADAR === 'undefined') return;
  el.innerHTML = RADAR.map(d => `<li><i></i>${d.name}<b>${d.v}</b></li>`).join('');
}

/* ══════════════════════════════════════════════════════════
   13.5 EXTERNAL LINKS & COPY
   ══════════════════════════════════════════════════════════ */
function initLinks() {
  if (typeof LINKS === 'undefined') return;

  const bili = (LINKS.bilibili || '').trim();
  const qr = (LINKS.qr || '').trim();

  // B站文字入口 + 二维码块：始终显示；没填链接时只禁用跳转，不隐藏、不留死链
  $$('[data-bili], [data-qr]').forEach(a => {
    if (bili) {
      a.href = bili;
      a.target = '_blank';
      a.rel = 'noopener';
      a.removeAttribute('aria-disabled');
    } else {
      a.setAttribute('aria-disabled', 'true');
      a.addEventListener('click', e => e.preventDefault());
    }
  });

  // 二维码图片：填了 qr 就替换默认占位图
  const qrBlock = $('[data-qr]');
  if (qrBlock && qr) {
    const img = qrBlock.querySelector('img');
    if (img) img.src = qr;
  }

  if (LINKS.email) {
    const mail = $('[data-mail]');
    if (mail) mail.href = 'mailto:' + LINKS.email;
    const t = $('[data-mail-text]');
    if (t) t.textContent = LINKS.email;
  }
}

function initCopy() {
  $$('[data-copy]').forEach(btn => {
    const label = btn.querySelector('[data-copy-label]');
    const orig = label ? label.textContent : '';
    btn.addEventListener('click', async () => {
      const val = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(val);
        ok = true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = val;
        ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch {}
        ta.remove();
      }
      if (!label) return;
      label.textContent = ok ? '已复制 ✓' : '请手动复制';
      label.style.color = ok ? 'var(--acc)' : 'var(--fg-2)';
      clearTimeout(btn._t);
      btn._t = setTimeout(() => {
        label.textContent = orig;
        label.style.color = '';
      }, 1600);
    });
  });
}

/* ══════════════════════════════════════════════════════════
   14. BOOTSTRAP
   ══════════════════════════════════════════════════════════ */
function init() {
  renderSkills();
  renderTimeline();
  renderAwards();
  renderRadarLegend();
  renderWorks();
  initFilters();
  initModal();
  initReveal();
  initNav();
  initCursor();
  initClock();
  initParallax();
  initCounters();
  initSpark();
  initLinks();
  initCopy();
  initBoot();

  new NetField($('#heroNet'), { density: 15000, min: 40, max: 112, alpha: .16 });
  new NetField($('#ctaNet'), {
    density: 42000, min: 18, max: 52, alpha: .16, mouseR: 170, hubs: false, speed: .18
  });

  const wc = $('#worksCount');
  if (wc && typeof WORKS !== 'undefined') wc.textContent = `ARCHIVE / ${String(WORKS.length + 1).padStart(3, '0')}`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
