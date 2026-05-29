// app.js — upload, state, render orchestration

const uploadZone   = document.getElementById('uploadZone');
const fileInput    = document.getElementById('fileInput');
const previewArea  = document.getElementById('previewArea');
const controlsEl   = document.getElementById('controls');
const memeStrip    = document.getElementById('memeStrip');
const canvasBefore = document.getElementById('canvasBefore');
const canvasAfter  = document.getElementById('canvasAfter');

// Slider refs
const sl = {
  grain:      document.getElementById('slGrain'),
  warmth:     document.getElementById('slWarmth'),
  fade:       document.getElementById('slFade'),
  petals:     document.getElementById('slPetals'),
  contrast:   document.getElementById('slContrast'),
  clarity:    document.getElementById('slClarity'),
  dreamy:     document.getElementById('slDreamy'),
  txtSize:    document.getElementById('slTxtSize'),
  txtOpacity: document.getElementById('slTxtOpacity'),
};
const val = {
  grain:      document.getElementById('valGrain'),
  warmth:     document.getElementById('valWarmth'),
  fade:       document.getElementById('valFade'),
  petals:     document.getElementById('valPetals'),
  contrast:   document.getElementById('valContrast'),
  clarity:    document.getElementById('valClarity'),
  dreamy:     document.getElementById('valDreamy'),
  txtSize:    document.getElementById('valTxtSize'),
  txtOpacity: document.getElementById('valTxtOpacity'),
};

let state = {
  preset:   'yugen',
  grain:    40,
  warmth:   30,
  fade:     15,
  petals:   20,
  contrast: 5,
  clarity:  0,
  dreamy:   0,
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
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 60);
}

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
      document.fonts.ready.then(() => render());
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawOriginal(img) {
  const maxW = 2000;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
  canvasBefore.width  = w; canvasBefore.height = h;
  canvasAfter.width   = w; canvasAfter.height  = h;
  canvasBefore.getContext('2d').drawImage(img, 0, 0, w, h);
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
    preset:   state.preset,
    grain:    state.grain,
    warmth:   state.warmth,
    fade:     state.fade,
    petals:   state.petals,
    contrast: state.contrast,
    clarity:  state.clarity,
    dreamy:   state.dreamy,
    textOpts: state.text.enabled ? state.text : null,
  });
}

// ─── Presets ──────────────────────────────────────────────────
document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.preset = btn.dataset.preset;

    const p = PRESETS[state.preset];
    // Sync sliders to preset values
    sl.warmth.value   = p.warmth;   val.warmth.textContent   = p.warmth;   state.warmth   = p.warmth;
    sl.fade.value     = p.fade;     val.fade.textContent     = p.fade;     state.fade     = p.fade;
    sl.contrast.value = p.contrast; val.contrast.textContent = p.contrast; state.contrast = p.contrast;
    sl.clarity.value  = p.clarity;  val.clarity.textContent  = p.clarity;  state.clarity  = p.clarity;

    scheduleRender();
  });
});

// ─── Sliders ──────────────────────────────────────────────────
const sliderMap = [
  ['grain',    'grain'],
  ['warmth',   'warmth'],
  ['fade',     'fade'],
  ['petals',   'petals'],
  ['contrast', 'contrast'],
  ['clarity',  'clarity'],
  ['dreamy',   'dreamy'],
];

sliderMap.forEach(([id, key]) => {
  sl[id].addEventListener('input', () => {
    state[key] = +sl[id].value;
    val[id].textContent = state[key];
    scheduleRender();
  });
});

// ─── Text toggle ──────────────────────────────────────────────
const toggleTextBtn = document.getElementById('toggleText');
const textPanel     = document.getElementById('textPanel');
const toggleArrow   = document.getElementById('toggleArrow');
const txtInput      = document.getElementById('txtInput');

toggleTextBtn.addEventListener('click', () => {
  state.text.enabled   = !state.text.enabled;
  textPanel.hidden     = !state.text.enabled;
  toggleArrow.classList.toggle('open', state.text.enabled);
  scheduleRender();
});

txtInput.addEventListener('input', () => {
  state.text.text = txtInput.value;
  scheduleRender();
});

sl.txtSize.addEventListener('input', () => {
  state.text.size = +sl.txtSize.value;
  val.txtSize.textContent = state.text.size;
  scheduleRender();
});
sl.txtOpacity.addEventListener('input', () => {
  state.text.opacity = +sl.txtOpacity.value;
  val.txtOpacity.textContent = state.text.opacity;
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

// ─── Download / Reset ─────────────────────────────────────────
document.getElementById('btnDownload').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `vaibu_${state.preset}_${Date.now()}.jpg`;
  link.href = canvasAfter.toDataURL('image/jpeg', 0.93);
  link.click();
});
document.getElementById('btnReset').addEventListener('click', () => {
  location.reload();
});
