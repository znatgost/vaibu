// app.js — upload, state, render orchestration

const uploadZone  = document.getElementById('uploadZone');
const fileInput   = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const controlsEl  = document.getElementById('controls');
const memeStrip   = document.getElementById('memeStrip');

const canvasBefore = document.getElementById('canvasBefore');
const canvasAfter  = document.getElementById('canvasAfter');

const slGrain   = document.getElementById('slGrain');
const slWarmth  = document.getElementById('slWarmth');
const slFade    = document.getElementById('slFade');
const slPetals  = document.getElementById('slPetals');

const valGrain  = document.getElementById('valGrain');
const valWarmth = document.getElementById('valWarmth');
const valFade   = document.getElementById('valFade');
const valPetals = document.getElementById('valPetals');

const btnDownload = document.getElementById('btnDownload');
const btnReset    = document.getElementById('btnReset');

let state = {
  preset:  'yugen',
  grain:   40,
  warmth:  30,
  fade:    15,
  petals:  20,
  imageLoaded: false,
  text: {
    enabled:  false,
    text:     '',
    style:    'jp-serif',
    position: 'bottom-left',
    color:    'cream',
    size:     32,
    opacity:  90,
  },
};

let renderTimer = null;

// ─── Upload ────────────────────────────────────────────────────
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadImage(fileInput.files[0]);
});

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      drawOriginal(img);
      state.imageLoaded = true;
      reveal();
      // Wait for Google Fonts before first render so text overlay uses correct typeface
      document.fonts.ready.then(() => render());
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawOriginal(img) {
  // Fit to max 800px wide
  const maxW = 800;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }

  canvasBefore.width  = w;
  canvasBefore.height = h;
  canvasAfter.width   = w;
  canvasAfter.height  = h;

  const ctx = canvasBefore.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
}

function reveal() {
  previewArea.hidden = false;
  controlsEl.hidden  = false;
  memeStrip.hidden   = false;
  uploadZone.style.display = 'none';
}

// ─── Render ───────────────────────────────────────────────────
function render() {
  if (!state.imageLoaded) return;
  applyVaiburu(canvasBefore, canvasAfter, {
    preset: state.preset,
    grain:  state.grain,
    warmth: state.warmth,
    fade:   state.fade,
    petals: state.petals,
    textOpts: state.text.enabled ? state.text : null,
  });
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 60);
}

// ─── Controls ─────────────────────────────────────────────────
document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.preset = btn.dataset.preset;

    // Sync sliders to preset defaults
    const p = PRESETS[state.preset];
    slWarmth.value = p.warmth;
    slFade.value   = p.fade;
    valWarmth.textContent = p.warmth;
    valFade.textContent   = p.fade;
    state.warmth = p.warmth;
    state.fade   = p.fade;

    scheduleRender();
  });
});

slGrain.addEventListener('input', () => {
  state.grain = +slGrain.value;
  valGrain.textContent = state.grain;
  scheduleRender();
});

slWarmth.addEventListener('input', () => {
  state.warmth = +slWarmth.value;
  valWarmth.textContent = state.warmth;
  scheduleRender();
});

slFade.addEventListener('input', () => {
  state.fade = +slFade.value;
  valFade.textContent = state.fade;
  scheduleRender();
});

slPetals.addEventListener('input', () => {
  state.petals = +slPetals.value;
  valPetals.textContent = state.petals;
  scheduleRender();
});

// ─── Download ─────────────────────────────────────────────────
btnDownload.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `vaibu_${state.preset}_${Date.now()}.jpg`;
  link.href = canvasAfter.toDataURL('image/jpeg', 0.93);
  link.click();
});

// ─── Text overlay controls ─────────────────────────────────────
const toggleTextBtn = document.getElementById('toggleText');
const textPanel     = document.getElementById('textPanel');
const toggleArrow   = document.getElementById('toggleArrow');
const txtInput      = document.getElementById('txtInput');
const slTxtSize     = document.getElementById('slTxtSize');
const slTxtOpacity  = document.getElementById('slTxtOpacity');
const valTxtSize    = document.getElementById('valTxtSize');
const valTxtOpacity = document.getElementById('valTxtOpacity');

toggleTextBtn.addEventListener('click', () => {
  state.text.enabled = !state.text.enabled;
  textPanel.hidden = !state.text.enabled;
  toggleArrow.classList.toggle('open', state.text.enabled);
  scheduleRender();
});

txtInput.addEventListener('input', () => {
  state.text.text = txtInput.value;
  scheduleRender();
});

slTxtSize.addEventListener('input', () => {
  state.text.size = +slTxtSize.value;
  valTxtSize.textContent = state.text.size;
  scheduleRender();
});

slTxtOpacity.addEventListener('input', () => {
  state.text.opacity = +slTxtOpacity.value;
  valTxtOpacity.textContent = state.text.opacity;
  scheduleRender();
});

document.querySelectorAll('.pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.text.style = btn.dataset.style;
    scheduleRender();
  });
});

document.querySelectorAll('.pos-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.text.position = btn.dataset.pos;
    scheduleRender();
  });
});

document.querySelectorAll('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.text.color = btn.dataset.color;
    scheduleRender();
  });
});

// ─── Reset ────────────────────────────────────────────────────
btnReset.addEventListener('click', () => {
  location.reload();
});
