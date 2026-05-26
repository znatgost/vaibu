// filters.js — all Canvas pixel-manipulation & drawing logic

const PRESETS = {
  yugen: { warmth: 30, fade: 15, saturation: 0.85, teal: 0.08, hueShift: 8, vignette: 0.55 },
  sakura: { warmth: 50, fade: 25, saturation: 0.7, teal: 0.0, hueShift: 15, vignette: 0.4 },
  shiro: { warmth: 5, fade: 30, saturation: 0.4, teal: 0.06, hueShift: -5, vignette: 0.6 },
  yoru: { warmth: -30, fade: 10, saturation: 1.1, teal: 0.15, hueShift: -15, vignette: 0.8 },
};

/**
 * Apply full vaibu transformation to a canvas
 * @param {HTMLCanvasElement} src - source canvas (original image)
 * @param {HTMLCanvasElement} dst - destination canvas (output)
 * @param {object} opts
 */
function applyVaiburu(src, dst, opts = {}) {
  const {
    preset = 'yugen',
    grain = 40,
    warmth = null,
    fade = null,
    petals = 20,
    textOpts = null,
  } = opts;

  const p = PRESETS[preset] || PRESETS.yugen;
  const finalWarmth = warmth !== null ? warmth : p.warmth;
  const finalFade = fade !== null ? fade : p.fade;

  const w = src.width;
  const h = src.height;
  dst.width = w;
  dst.height = h;

  const ctx = dst.getContext('2d');
  ctx.drawImage(src, 0, 0);

  // 1. Pixel-level: color grade
  colorGrade(ctx, w, h, {
    warmth: finalWarmth,
    fade: finalFade,
    saturation: p.saturation,
    hueShift: p.hueShift,
    teal: p.teal,
  });

  // 2. Film grain
  if (grain > 0) addGrain(ctx, w, h, grain);

  // 3. Vignette
  addVignette(ctx, w, h, p.vignette);

  // 4. Sakura petals overlay
  if (petals > 0) drawPetals(ctx, w, h, petals, preset);

  // 5. User text overlay
  if (textOpts && textOpts.text) drawTextOverlay(ctx, w, h, textOpts);

  // 6. Subtle stamp
  drawStamp(ctx, w, h);
}

/* ─── Color Grade ─────────────────────────────────────────────── */
function colorGrade(ctx, w, h, { warmth, fade, saturation, hueShift, teal }) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    // Saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;

    // Warmth (shift R/B channels)
    const w2 = warmth / 100;
    r += w2 * 30;
    b -= w2 * 20;
    g += w2 * 8;

    // Teal shadows (lift blues in darks)
    const lum = (r + g + b) / 3;
    if (lum < 128) {
      b += teal * (128 - lum) * 0.6;
      g += teal * (128 - lum) * 0.2;
    }

    // Fade / lifted blacks
    const fadeAmt = (fade / 100) * 40;
    r = r * (1 - fade / 100) + fadeAmt;
    g = g * (1 - fade / 100) + fadeAmt;
    b = b * (1 - fade / 100) + fadeAmt;

    // Gentle hue shift via rotation approximation
    if (hueShift !== 0) {
      const h2 = (hueShift / 360) * Math.PI * 2;
      const cos = Math.cos(h2);
      const sin = Math.sin(h2);
      const nr = r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928);
      const ng = r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283);
      const nb = r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072);
      r = nr; g = ng; b = nb;
    }

    d[i]     = Math.min(255, Math.max(0, r));
    d[i + 1] = Math.min(255, Math.max(0, g));
    d[i + 2] = Math.min(255, Math.max(0, b));
  }

  ctx.putImageData(img, 0, 0);
}

/* ─── Film Grain ──────────────────────────────────────────────── */
function addGrain(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const intensity = amount * 0.6;

  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity;
    d[i]     = Math.min(255, Math.max(0, d[i] + noise));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
  }

  ctx.putImageData(img, 0, 0);
}

/* ─── Vignette ────────────────────────────────────────────────── */
function addVignette(ctx, w, h, strength) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.85);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength * 0.75})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/* ─── Sakura Petals ───────────────────────────────────────────── */
function drawPetals(ctx, w, h, count, preset) {
  const colors = {
    yugen:  ['rgba(220,160,140,0.55)', 'rgba(200,140,130,0.35)'],
    sakura: ['rgba(240,180,190,0.65)', 'rgba(210,150,165,0.45)'],
    shiro:  ['rgba(230,220,215,0.45)', 'rgba(200,195,190,0.3)'],
    yoru:   ['rgba(180,130,200,0.5)', 'rgba(140,100,180,0.35)'],
  };
  const [c1, c2] = colors[preset] || colors.yugen;

  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = 3 + Math.random() * 7;
    const angle = Math.random() * Math.PI * 2;
    const col = Math.random() > 0.5 ? c1 : c2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = col;
    drawPetalShape(ctx, size);
    ctx.restore();
  }
  ctx.restore();
}

function drawPetalShape(ctx, size) {
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.7, size * 0.35, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ─── Text Overlay ────────────────────────────────────────────── */
const TEXT_COLORS = {
  cream:  '#f0e8d8',
  white:  '#ffffff',
  black:  '#111111',
  sakura: '#e8a0b4',
  gold:   '#c8a97e',
  teal:   '#7ec8c8',
};

const TEXT_STYLES = {
  'jp-serif': { family: "'Shippori Mincho', serif", weight: '400', transform: null },
  'mono':     { family: "'DM Mono', monospace",     weight: '300', transform: null },
  'big':      { family: "'DM Mono', monospace",     weight: '400', transform: 'uppercase' },
  'stamp':    { family: "'Shippori Mincho', serif", weight: '700', transform: null },
};

/**
 * Draw user text onto canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {object} opts
 */
function drawTextOverlay(ctx, w, h, opts = {}) {
  const {
    text = '',
    style = 'jp-serif',
    position = 'bottom-left',
    color = 'cream',
    size = 32,
    opacity = 90,
  } = opts;

  if (!text.trim()) return;

  const ts = TEXT_STYLES[style] || TEXT_STYLES['jp-serif'];
  const hexColor = TEXT_COLORS[color] || TEXT_COLORS.cream;
  const alpha = opacity / 100;

  // Scale font size relative to canvas width (designed for 800px)
  const scaledSize = Math.round(size * (w / 800));
  const displayText = ts.transform === 'uppercase' ? text.toUpperCase() : text;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${ts.weight} ${scaledSize}px ${ts.family}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = hexColor;

  // Measure text
  const metrics = ctx.measureText(displayText);
  const tw = metrics.width;
  const th = scaledSize;
  const pad = scaledSize * 0.8;

  // Resolve position
  let x, y;
  const positions = {
    'bottom-left':   { x: pad,              y: h - pad },
    'bottom-center': { x: w / 2 - tw / 2,  y: h - pad },
    'bottom-right':  { x: w - tw - pad,     y: h - pad },
    'top-left':      { x: pad,              y: th + pad },
    'top-center':    { x: w / 2 - tw / 2,  y: th + pad },
    'top-right':     { x: w - tw - pad,     y: th + pad },
    'center':        { x: w / 2 - tw / 2,  y: h / 2 + th / 3 },
  };

  ({ x, y } = positions[position] || positions['bottom-left']);

  // Drop shadow / soft backing for readability
  if (style === 'stamp') {
    // Stamp: draw outline
    ctx.strokeStyle = color === 'black' ? '#f0e8d8' : '#111111';
    ctx.lineWidth = scaledSize * 0.06;
    ctx.strokeText(displayText, x, y);
  } else {
    // Subtle text shadow
    ctx.save();
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = color === 'black' ? '#ffffff' : '#000000';
    ctx.fillText(displayText, x + scaledSize * 0.04, y + scaledSize * 0.04);
    ctx.restore();
  }

  ctx.fillStyle = hexColor;
  ctx.fillText(displayText, x, y);
  ctx.restore();
}
function drawStamp(ctx, w, h) {
  ctx.save();
  ctx.font = `${Math.max(10, w * 0.018)}px 'Shippori Mincho', serif`;
  ctx.fillStyle = 'rgba(200,169,126,0.35)';
  ctx.textAlign = 'right';
  ctx.fillText('雰囲気 vaibu', w - w * 0.025, h - h * 0.025);
  ctx.restore();
}
