const ISO_VALUES = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000, 51200, 64000, 80000, 102400];
const APERTURE_VALUES = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45];
const SHUTTER_VALUES = [1, .8, .6, .5, .4, 1 / 3, .25, .2, 1 / 6, .125, .1, 1 / 13, 1 / 15, .05, .04, 1 / 30, .025, .02, 1 / 60, .0125, .01, .008, .00625, .005, .004, .003125, .0025, .002, .0015625, .00125, .001, .0008, .000625, .0005, .0004, .0003125, .00025, .0002, .00015625, .000125, .0001, 1 / 12800, .0000625, .00005, 1 / 25600, .00003125];
const SHUTTER_LABELS = ['1s', '0.8s', '0.6s', '1/2', '1/2.5', '1/3', '1/4', '1/5', '1/6', '1/8', '1/10', '1/13', '1/15', '1/20', '1/25', '1/30', '1/40', '1/50', '1/60', '1/80', '1/100', '1/125', '1/160', '1/200', '1/250', '1/320', '1/400', '1/500', '1/640', '1/800', '1/1000', '1/1250', '1/1600', '1/2000', '1/2500', '1/3200', '1/4000', '1/5000', '1/6400', '1/8000', '1/10000', '1/12800', '1/16000', '1/20000', '1/25600', '1/32000'];
const VALUE_SETS = { iso: ISO_VALUES, shutter: SHUTTER_VALUES, aperture: APERTURE_VALUES };
const ND_PRESETS = { nd2: [1, 'ND2'], nd4: [2, 'ND4'], nd8: [3, 'ND8'], nd16: [4, 'ND16'], nd32: [5, 'ND32'], nd64: [6, 'ND64'], nd128: [7, 'ND128'], nd256: [8, 'ND256'], nd512: [9, 'ND512'], nd1024: [10, 'ND1024'] };
const ND_OPTIONS = Object.entries(ND_PRESETS);
let activeController = null;

function nearestIndex(values, value) {
  return values.reduce((best, candidate, index) => (
    Math.abs(candidate - value) < Math.abs(values[best] - value) ? index : best
  ), 0);
}

function signed(value) {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

function formatValue(key, value) {
  if (key === 'iso') return `ISO ${Math.round(value)}`;
  if (key === 'aperture') return `f/${value < 10 ? value.toFixed(1) : Math.round(value)}`;
  const index = nearestIndex(SHUTTER_VALUES, value);
  if (Math.abs(SHUTTER_VALUES[index] - value) < .000001) return SHUTTER_LABELS[index];
  return `${Number(value.toFixed(1))}s`;
}

function formatEditableValue(key, value) {
  if (key === 'iso') return String(Math.round(value));
  if (key === 'aperture') return value < 10 ? value.toFixed(1) : String(Math.round(value));
  return formatValue(key, value);
}

function formatPower(value) {
  if (value >= -.04) return '1/1';
  const baseStop = -Math.ceil(-value);
  const fine = Math.round((value - baseStop) * 10);
  const base = `1/${2 ** -baseStop}`;
  return fine ? `${base} +${fine / 10}` : base;
}

function ambientStops(camera, ndStops) {
  return Math.log2(camera.iso / 100) + Math.log2(camera.shutter) - 2 * Math.log2(camera.aperture) - ndStops;
}

function flashStops(camera, ndStops) {
  return Math.log2(camera.iso / 100) - 2 * Math.log2(camera.aperture) - ndStops;
}

export function initExposureCalculator() {
  const elements = {
    camera: document.getElementById('cameraControls'), target: document.getElementById('targetEv'), targetLabel: document.getElementById('targetEvLabel'), lockEv: document.getElementById('lockEv'), errorReading: document.getElementById('errorReading'), reset: document.getElementById('resetBaseline'),
    addNd: document.getElementById('addNd'), lockNd: document.getElementById('lockNd'), ndStack: document.getElementById('ndStack'), ndList: document.getElementById('ndList'),
    addFlash: document.getElementById('addFlash'), flashList: document.getElementById('flashList')
  };
  const state = {
    base: { iso: 100, shutter: 1 / 125, aperture: 5.6 }, camera: { iso: 100, shutter: 1 / 125, aperture: 5.6 },
    locks: { iso: false, shutter: false, aperture: false, nd: false }, evLocked: false, target: 0, nds: [], flashes: []
  };
  if (Object.values(elements).some((element) => !element)) return () => {};
  activeController?.abort();
  activeController = new AbortController();
  const listen = (element, type, listener) => element.addEventListener(type, listener, { signal: activeController.signal });
  let baseAmbient = ambientStops(state.base, 0);

  function totalNd() {
    return state.nds.reduce((total, filter) => total + filter.stops, 0);
  }

  function ambientEv() {
    return ambientStops(state.camera, totalNd()) - baseAmbient;
  }

  function relativeFlash(flash) {
    return flashStops(state.camera, totalNd()) - flash.baseExposureStops + flash.power - flash.basePower;
  }

  function estimatedPower(flash) {
    const isoGn = flash.gn * Math.sqrt(state.camera.iso / 100);
    const requiredPower = 2 * Math.log2((state.camera.aperture * flash.distance) / isoGn) + totalNd();
    return Math.max(-9, Math.min(0, requiredPower));
  }

  function renderCamera() {
    elements.camera.innerHTML = ['iso', 'shutter', 'aperture'].map((key) => {
      const index = nearestIndex(VALUE_SETS[key], state.camera[key]);
      const label = key === 'iso' ? 'ISO' : key === 'shutter' ? '快門' : '光圈';
      const longExposure = key === 'shutter' ? `<input class="long-exposure" data-long-shutter type="text" inputmode="decimal" value="${state.camera.shutter > 1 ? state.camera.shutter : ''}" placeholder="長曝秒數">` : '';
      const prefix = key === 'iso' ? 'ISO ' : key === 'aperture' ? 'f/' : '';
      return `<div class="slider-row parameter-row"><label>${label}</label><input data-camera="${key}" type="range" min="0" max="${VALUE_SETS[key].length - 1}" value="${index}" aria-label="${label}"><output title="點擊數值可直接輸入"><span>${prefix}</span><span data-direct="${key}" contenteditable="true" role="textbox" tabindex="0">${formatEditableValue(key, state.camera[key])}</span></output><label class="lock"><input data-lock="${key}" type="checkbox" ${state.locks[key] ? 'checked' : ''}> 鎖定</label>${longExposure}</div>`;
    }).join('');
  }

  function updateCameraControls() {
    ['iso', 'shutter', 'aperture'].forEach((key) => {
      const input = elements.camera.querySelector(`[data-camera="${key}"]`);
      if (!input) return;
      input.value = nearestIndex(VALUE_SETS[key], state.camera[key]);
      input.nextElementSibling.querySelector(`[data-direct="${key}"]`).textContent = formatEditableValue(key, state.camera[key]);
    });
  }

  function renderNds() {
    elements.lockNd.checked = state.locks.nd;
    elements.ndStack.textContent = state.nds.length ? state.nds.map((filter) => filter.name).join(' + ') : '無濾鏡';
    elements.ndList.innerHTML = state.nds.map((filter, index) => `<div class="nd-card">
      <input data-nd-value="${index}" type="range" min="0" max="${ND_OPTIONS.length - 1}" step="1" value="${filter.stops - 1}"><output>${filter.name}</output><button class="remove" data-remove-nd="${index}" type="button">刪除</button>
    </div>`).join('');
  }

  function updateNdControls() {
    elements.ndStack.textContent = state.nds.length ? state.nds.map((filter) => filter.name).join(' + ') : '無濾鏡';
    state.nds.forEach((filter, index) => {
      const input = elements.ndList.querySelector(`[data-nd-value="${index}"]`);
      if (!input) return;
      input.value = filter.stops - 1;
      input.nextElementSibling.textContent = filter.name;
    });
  }

  function renderFlashes() {
    elements.flashList.innerHTML = state.flashes.map((flash, index) => `<article class="flash-card">
      <div class="flash-top"><input data-flash-name="${index}" value="${flash.name}" aria-label="閃燈名稱"><div class="flash-mode"><button data-mode="custom" data-index="${index}" class="${flash.mode === 'custom' ? 'active' : ''}" type="button">自訂基準</button><button data-mode="estimate" data-index="${index}" class="${flash.mode === 'estimate' ? 'active' : ''}" type="button">功率估算</button></div><button class="remove" data-remove-flash="${index}" type="button">刪除</button></div>
      ${flash.mode === 'custom' ? `<div class="flash-fields"><label>亮度<input data-flash-power="${index}" type="range" min="-9" max="0" step="0.1" value="${flash.draftPower}"></label><label>預覽<strong data-power-preview="${index}">${formatPower(flash.draftPower)}</strong></label><button data-confirm-flash="${index}" type="button">確定</button></div><p class="flash-status">目前基準 <strong>${formatPower(flash.power)}</strong></p>` : `<div class="flash-fields"><label>GN<input data-flash-gn="${index}" type="number" min="1" step="0.1" value="${flash.gn}"></label><label>距離（m）<input data-flash-distance="${index}" type="number" min=".1" step=".1" value="${flash.distance}"></label><button data-calculate-flash="${index}" type="button">計算</button></div><p class="flash-status">將依 GN、距離、ISO、光圈與 ND 估算功率。</p>`}
    </article>`).join('');
  }

  function syncFlashPower() {
    state.flashes.forEach((flash) => {
      if (flash.mode !== 'custom') return;
      const needed = flash.basePower - (flashStops(state.camera, totalNd()) - flash.baseExposureStops);
      flash.power = Math.max(-9, Math.min(0, Math.round(needed * 10) / 10));
      flash.draftPower = flash.power;
    });
  }

  function updateReading() {
    const ambient = ambientEv();
    elements.target.value = state.target;
    elements.targetLabel.textContent = `${signed(state.target)} EV`;
    elements.lockEv.checked = state.evLocked;
    elements.errorReading.textContent = `${signed(ambient)} EV`;
  }

  function refresh(syncFlash = true) {
    if (syncFlash) syncFlashPower();
    renderCamera();
    renderNds();
    renderFlashes();
    updateReading();
  }

  function refreshWhileSliding(syncFlash = true) {
    if (syncFlash) syncFlashPower();
    updateCameraControls();
    updateNdControls();
    updateReading();
  }

  function compensate(exclude = null) {
    const target = state.target;
    const key = ['shutter', 'aperture', 'iso', 'nd'].find((candidate) => candidate !== exclude && !state.locks[candidate]);
    if (!key) return;
    if (key === 'nd') {
      if (!state.nds.length) return;
      const otherStops = totalNd() - state.nds[0].stops;
      const required = ambientStops(state.camera, 0) - baseAmbient - target - otherStops;
      const stops = Math.max(1, Math.min(10, Math.round(required)));
      const multiplier = 2 ** stops;
      state.nds[0] = { kind: `nd${multiplier}`, name: `ND${multiplier}`, stops };
      return;
    }
    let best = state.camera[key];
    let smallestError = Infinity;
    VALUE_SETS[key].forEach((value) => {
      const candidate = { ...state.camera, [key]: value };
      const error = Math.abs(ambientStops(candidate, totalNd()) - baseAmbient - target);
      if (error < smallestError) { best = value; smallestError = error; }
    });
    state.camera[key] = best;
  }

  listen(elements.camera, 'input', (event) => {
    const key = event.target.dataset.camera;
    if (!key) return;
    state.camera[key] = VALUE_SETS[key][Number(event.target.value)];
    if (state.evLocked) compensate(key);
    else state.target = ambientEv();
    refreshWhileSliding();
  });
  listen(elements.camera, 'change', (event) => {
    const key = event.target.dataset.lock;
    if (key) { state.locks[key] = event.target.checked; refresh(false); return; }
    if (event.target.dataset.longShutter === undefined) return;
    const seconds = Number(event.target.value);
    if (!Number.isFinite(seconds) || seconds <= 1) return;
    state.camera.shutter = seconds;
    if (state.evLocked) compensate('shutter');
    else state.target = ambientEv();
    refresh();
  });
  function parseDirectValue(key, value) {
    const normalized = value.trim().toLowerCase().replaceAll(' ', '');
    if (key === 'iso') return Number(normalized.replace('iso', ''));
    if (key === 'aperture') return Number(normalized.replace('f/', '').replace('f', ''));
    const fraction = normalized.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (fraction) return Number(fraction[1]) / Number(fraction[2]);
    return Number(normalized.replace('秒', '').replace('s', ''));
  }
  function applyDirectValue(output) {
    const key = output.dataset.direct;
    if (!key) return;
    const value = parseDirectValue(key, output.textContent);
    if (!Number.isFinite(value) || value <= 0) {
      output.textContent = formatEditableValue(key, state.camera[key]);
      return;
    }
    state.camera[key] = value;
    if (state.evLocked) compensate(key);
    else state.target = ambientEv();
    refresh();
  }
  listen(elements.camera, 'keydown', (event) => {
    if (!event.target.dataset.direct || event.key !== 'Enter') return;
    event.preventDefault();
    applyDirectValue(event.target);
  });
  listen(elements.camera, 'focusout', (event) => {
    if (event.target.dataset.direct) applyDirectValue(event.target);
  });
  function setTarget(value, isSliding = false) {
    state.target = Math.max(-20, Math.min(20, Number(value) || 0));
    compensate();
    if (isSliding) refreshWhileSliding();
    else refresh();
  }
  listen(elements.target, 'input', (event) => setTarget(event.target.value, true));
  listen(elements.lockEv, 'change', () => {
    state.evLocked = elements.lockEv.checked;
    state.target = ambientEv();
    refresh(false);
  });
  listen(elements.reset, 'click', () => {
    state.base = { ...state.camera };
    baseAmbient = ambientStops(state.base, totalNd());
    state.target = 0;
    state.flashes.forEach((flash) => {
      flash.basePower = flash.power;
      flash.draftPower = flash.power;
      flash.baseExposureStops = flashStops(state.camera, totalNd());
    });
    refresh(false);
  });
  listen(elements.addNd, 'click', () => {
    state.nds.push({ kind: 'nd2', name: 'ND2', stops: 1 });
    if (state.evLocked) compensate('nd');
    else state.target = ambientEv();
    refresh();
  });
  listen(elements.lockNd, 'change', () => { state.locks.nd = elements.lockNd.checked; refresh(false); });
  listen(elements.ndList, 'input', (event) => {
    const index = Number(event.target.dataset.ndValue);
    if (Number.isNaN(index)) return;
    const [kind, [stops, name]] = ND_OPTIONS[Number(event.target.value)];
    state.nds[index] = { kind, name, stops };
    if (state.evLocked) compensate('nd');
    else state.target = ambientEv();
    refreshWhileSliding();
  });
  listen(elements.ndList, 'click', (event) => {
    const index = Number(event.target.dataset.removeNd);
    if (Number.isNaN(index)) return;
    state.nds.splice(index, 1);
    if (state.evLocked) compensate('nd');
    else state.target = ambientEv();
    refresh();
  });
  listen(elements.addFlash, 'click', () => {
    const power = -2;
    state.flashes.push({ name: `閃燈 ${state.flashes.length + 1}`, mode: 'custom', power, draftPower: power, basePower: power, baseExposureStops: flashStops(state.camera, totalNd()), gn: 60, distance: 2 });
    refresh();
  });
  listen(elements.flashList, 'input', (event) => {
    const index = Number(event.target.dataset.flashName ?? event.target.dataset.flashPower ?? event.target.dataset.flashGn ?? event.target.dataset.flashDistance);
    if (Number.isNaN(index)) return;
    const flash = state.flashes[index];
    if (event.target.dataset.flashName !== undefined) flash.name = event.target.value;
    if (event.target.dataset.flashPower !== undefined) {
      flash.draftPower = Number(event.target.value);
      const preview = elements.flashList.querySelector(`[data-power-preview="${index}"]`);
      if (preview) preview.textContent = formatPower(flash.draftPower);
    }
    if (event.target.dataset.flashGn !== undefined) flash.gn = Math.max(1, Number(event.target.value) || 1);
    if (event.target.dataset.flashDistance !== undefined) flash.distance = Math.max(.1, Number(event.target.value) || .1);
  });
  listen(elements.flashList, 'change', (event) => {
    if (event.target.dataset.flashName !== undefined || event.target.dataset.flashGn !== undefined || event.target.dataset.flashDistance !== undefined) refresh(false);
  });
  listen(elements.flashList, 'click', (event) => {
    const index = Number(event.target.dataset.index ?? event.target.dataset.removeFlash ?? event.target.dataset.confirmFlash ?? event.target.dataset.calculateFlash);
    if (Number.isNaN(index)) return;
    if (event.target.dataset.removeFlash !== undefined) state.flashes.splice(index, 1);
    else if (event.target.dataset.confirmFlash !== undefined) {
      const flash = state.flashes[index];
      flash.power = flash.draftPower;
      flash.basePower = flash.power;
      flash.baseExposureStops = flashStops(state.camera, totalNd());
    } else if (event.target.dataset.calculateFlash !== undefined) {
      const flash = state.flashes[index];
      const power = Math.round(estimatedPower(flash) * 10) / 10;
      flash.mode = 'custom';
      flash.power = power;
      flash.draftPower = power;
      flash.basePower = power;
      flash.baseExposureStops = flashStops(state.camera, totalNd());
    } else state.flashes[index].mode = event.target.dataset.mode;
    refresh(false);
  });
  refresh();
  return () => activeController?.abort();
}
