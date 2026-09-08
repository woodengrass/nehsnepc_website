const ISO_VALUES = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000, 51200, 64000, 80000, 102400];
const APERTURE_VALUES = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45];
const SHUTTER_VALUES = [1, .8, .6, .5, .4, 1 / 3, .25, .2, 1 / 6, .125, .1, 1 / 13, 1 / 15, .05, .04, 1 / 30, .025, .02, 1 / 60, .0125, .01, .008, .00625, .005, .004, .003125, .0025, .002, .0015625, .00125, .001, .0008, .000625, .0005, .0004, .0003125, .00025, .0002, .00015625, .000125, .0001, 1 / 12800, .0000625, .00005, 1 / 25600, .00003125];
const SHUTTER_LABELS = ['1s', '0.8s', '0.6s', '1/2', '1/2.5', '1/3', '1/4', '1/5', '1/6', '1/8', '1/10', '1/13', '1/15', '1/20', '1/25', '1/30', '1/40', '1/50', '1/60', '1/80', '1/100', '1/125', '1/160', '1/200', '1/250', '1/320', '1/400', '1/500', '1/640', '1/800', '1/1000', '1/1250', '1/1600', '1/2000', '1/2500', '1/3200', '1/4000', '1/5000', '1/6400', '1/8000', '1/10000', '1/12800', '1/16000', '1/20000', '1/25600', '1/32000'];
const VALUE_SETS = { iso: ISO_VALUES, shutter: SHUTTER_VALUES, aperture: APERTURE_VALUES };
const ND_PRESETS = { nd2: [1, 'ND2'], nd4: [2, 'ND4'], nd8: [3, 'ND8'], nd16: [4, 'ND16'], nd32: [5, 'ND32'], nd64: [6, 'ND64'], nd128: [7, 'ND128'], nd256: [8, 'ND256'], nd512: [9, 'ND512'], nd1024: [10, 'ND1024'] };
const ND_OPTIONS = Object.entries(ND_PRESETS);
const TARGET_MIN = -10;
const TARGET_MAX = 10;
const FLASH_MIN = -9;
const FLASH_MAX = 0;
const ND_MIN_STOPS = 1;
const ND_MAX_STOPS = 10;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

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
  // 相機慣例：f/10 以上機身只顯示整數，小數由機身四捨五入，保持顯示與相機一致。
  if (key === 'aperture') return `f/${value < 10 ? value.toFixed(1) : Math.round(value)}`;
  const index = nearestIndex(SHUTTER_VALUES, value);
  if (Math.abs(SHUTTER_VALUES[index] - value) < .000001) return SHUTTER_LABELS[index];
  // 非預設快門：<1s 用分數（相機慣例），>=1s 用秒數，避免小快門被 toFixed(1) 吃成 0.0s。
  if (value < 1 && value > 0) return `1/${Math.round(1 / value)}`;
  return `${Number(value.toFixed(1))}s`;
}

function formatEditableValue(key, value) {
  if (key === 'iso') return String(Math.round(value));
  if (key === 'aperture') return value < 10 ? value.toFixed(1) : String(Math.round(value));
  return formatValue(key, value);
}

function formatPower(value) {
  // 相機慣例：以整檔為底加餘數（如 1/2 +0.9 表 -0.1 檔），與機身顯示一致，保持不動。
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
  const controller = new AbortController();
  const listen = (element, type, listener) => element.addEventListener(type, listener, { signal: controller.signal });
  let baseAmbient = ambientStops(state.base, 0);
  let flashSeq = 0;

  function totalNd() {
    return state.nds.reduce((total, filter) => total + filter.stops, 0);
  }

  function ambientEv() {
    return ambientStops(state.camera, totalNd()) - baseAmbient;
  }

  function estimatedPower(flash) {
    const isoGn = flash.gn * Math.sqrt(state.camera.iso / 100);
    const nd = totalNd();
    const requiredPower = 2 * Math.log2((state.camera.aperture * flash.distance) / isoGn) + nd;
    return Math.max(FLASH_MIN, Math.min(FLASH_MAX, requiredPower));
  }

  function renderCamera() {
    elements.camera.innerHTML = ['iso', 'shutter', 'aperture'].map((key) => {
      const index = nearestIndex(VALUE_SETS[key], state.camera[key]);
      const label = key === 'iso' ? 'ISO' : key === 'shutter' ? '快門' : '光圈';
      const longExposure = key === 'shutter' ? `<input class="long-exposure" data-long-shutter type="text" inputmode="decimal" aria-label="長曝秒數" value="${state.camera.shutter > 1 ? state.camera.shutter : ''}" placeholder="長曝秒數">` : '';
      const prefix = key === 'iso' ? 'ISO ' : key === 'aperture' ? 'f/' : '';
      return `<div class="slider-row parameter-row"><label>${label}</label><input data-camera="${key}" type="range" min="0" max="${VALUE_SETS[key].length - 1}" value="${index}" aria-label="${label}"><output title="點擊數值可直接輸入"><span>${prefix}</span><span data-direct="${key}" contenteditable="true" role="textbox" tabindex="0">${formatEditableValue(key, state.camera[key])}</span></output><label class="lock"><input data-lock="${key}" type="checkbox" ${state.locks[key] ? 'checked' : ''}> 鎖定</label>${longExposure}</div>`;
    }).join('');
  }

  function updateCameraControls() {
    ['iso', 'shutter', 'aperture'].forEach((key) => {
      const input = elements.camera.querySelector(`[data-camera="${key}"]`);
      const direct = elements.camera.querySelector(`[data-direct="${key}"]`);
      if (!input || !direct) return;
      input.value = nearestIndex(VALUE_SETS[key], state.camera[key]);
      direct.textContent = formatEditableValue(key, state.camera[key]);
    });
  }

  function renderNds() {
    elements.lockNd.checked = state.locks.nd;
    elements.ndStack.textContent = state.nds.length ? state.nds.map((filter) => filter.name).join(' + ') : '無濾鏡';
    elements.ndList.innerHTML = state.nds.map((filter, index) => `<div class="nd-card">
      <input data-nd-value="${index}" type="range" min="0" max="${ND_OPTIONS.length - 1}" step="1" value="${filter.stops - 1}" aria-label="ND 濾鏡減光檔數"><output>${filter.name}</output><button class="remove" data-remove-nd="${index}" type="button">刪除</button>
    </div>`).join('');
  }

  function updateNdControls() {
    elements.ndStack.textContent = state.nds.length ? state.nds.map((filter) => filter.name).join(' + ') : '無濾鏡';
    state.nds.forEach((filter, index) => {
      const input = elements.ndList.querySelector(`[data-nd-value="${index}"]`);
      const card = input ? input.closest('.nd-card') : null;
      const output = card ? card.querySelector('output') : null;
      if (!input || !output) return;
      input.value = filter.stops - 1;
      output.textContent = filter.name;
    });
  }

  function renderFlashes() {
    elements.flashList.innerHTML = state.flashes.map((flash, index) => `<article class="flash-card">
      <div class="flash-top"><input data-flash-name="${index}" value="${escapeHtml(flash.name)}" aria-label="閃燈名稱"><div class="flash-mode"><button data-mode="custom" data-index="${index}" class="${flash.mode === 'custom' ? 'active' : ''}" type="button">自訂基準</button><button data-mode="estimate" data-index="${index}" class="${flash.mode === 'estimate' ? 'active' : ''}" type="button">功率估算</button></div><button class="remove" data-remove-flash="${index}" type="button">刪除</button></div>
      ${flash.mode === 'custom' ? `<div class="flash-fields"><label>亮度<input data-flash-power="${index}" type="range" min="${FLASH_MIN}" max="${FLASH_MAX}" step="0.1" value="${flash.draftPower}"></label><label>預覽<strong data-power-preview="${index}">${formatPower(flash.draftPower)}</strong></label><button data-confirm-flash="${index}" type="button">確定</button></div><p class="flash-status">目前基準 <strong data-power-baseline="${index}">${formatPower(flash.power)}</strong></p>` : `<div class="flash-fields"><label>GN<input data-flash-gn="${index}" type="number" min="1" step="0.1" value="${flash.gn}"></label><label>距離（m）<input data-flash-distance="${index}" type="number" min=".1" step=".1" value="${flash.distance}"></label><button data-calculate-flash="${index}" type="button">計算</button></div><p class="flash-status">將依 GN、距離、ISO、光圈與 ND 估算功率。</p>`}
    </article>`).join('');
  }

  function syncFlashPower() {
    const nd = totalNd();
    const current = flashStops(state.camera, nd);
    state.flashes.forEach((flash) => {
      if (flash.mode !== 'custom') return;
      const needed = flash.basePower - (current - flash.baseExposureStops);
      flash.power = Math.max(FLASH_MIN, Math.min(FLASH_MAX, Math.round(needed * 10) / 10));
      flash.draftPower = flash.power;
    });
  }

  // 輕量更新：滑動中讓閃燈顯示跟上 sync 結果，不重建 DOM、不搶焦點。
  function updateFlashPreview() {
    state.flashes.forEach((flash, index) => {
      if (flash.mode !== 'custom') return;
      const slider = elements.flashList.querySelector(`[data-flash-power="${index}"]`);
      if (slider) slider.value = flash.draftPower;
      const preview = elements.flashList.querySelector(`[data-power-preview="${index}"]`);
      if (preview) preview.textContent = formatPower(flash.draftPower);
      const baseline = elements.flashList.querySelector(`[data-power-baseline="${index}"]`);
      if (baseline) baseline.textContent = formatPower(flash.power);
    });
  }

  function updateReading() {
    const ambient = ambientEv();
    // 回寫 slider 取到 0.1（與 step 一致），計算仍用全精度 state.target，不影響誤差。
    elements.target.value = Math.round(state.target * 10) / 10;
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
    updateFlashPreview();
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
      const stops = Math.max(ND_MIN_STOPS, Math.min(ND_MAX_STOPS, Math.round(required)));
      const multiplier = 2 ** stops;
      state.nds[0] = { kind: `nd${multiplier}`, name: `ND${multiplier}`, stops };
      return;
    }
    let best = state.camera[key];
    let smallestError = Infinity;
    const nd = totalNd();
    VALUE_SETS[key].forEach((value) => {
      const candidate = { ...state.camera, [key]: value };
      const error = Math.abs(ambientStops(candidate, nd) - baseAmbient - target);
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
    // 鎖定只改變後續補償對象，顯示值不變：不同步重建，避免打掉剛點的 checkbox 焦點。
    if (key) { state.locks[key] = event.target.checked; updateReading(); return; }
    if (!('longShutter' in event.target.dataset)) return;
    const seconds = Number(event.target.value);
    if (!Number.isFinite(seconds) || seconds <= 1) return;
    state.camera.shutter = seconds;
    if (state.evLocked) compensate('shutter');
    else state.target = ambientEv();
    refresh();
  });
  function parseDirectValue(key, value) {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
    if (key === 'iso') return Number(normalized.replace('iso', ''));
    if (key === 'aperture') return Number(normalized.replace('f/', '').replace('f', ''));
    // 快門：先去秒後綴再測分數，否則「1/125s」「1/125秒」會因尾巴對不上 regex、
    // 掉到 Number("1/125")=NaN 被當無效輸入。
    const bare = normalized.replace(/秒/g, '').replace(/s/g, '');
    const fraction = bare.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (fraction) return Number(fraction[1]) / Number(fraction[2]);
    return Number(bare);
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
    state.target = Math.max(TARGET_MIN, Math.min(TARGET_MAX, Number(value) || 0));
    compensate();
    if (isSliding) refreshWhileSliding();
    else refresh();
  }
  listen(elements.target, 'input', (event) => setTarget(event.target.value, true));
  listen(elements.lockEv, 'change', () => {
    state.evLocked = elements.lockEv.checked;
    state.target = ambientEv();
    updateReading();
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
    // 只動內部基準與讀數，相機/ND/閃燈卡片顯示不變，不重建。
    updateReading();
  });
  listen(elements.addNd, 'click', () => {
    state.nds.push({ kind: 'nd2', name: 'ND2', stops: 1 });
    if (state.evLocked) compensate('nd');
    else state.target = ambientEv();
    refresh();
  });
  listen(elements.lockNd, 'change', () => { state.locks.nd = elements.lockNd.checked; updateReading(); });
  listen(elements.ndList, 'input', (event) => {
    const index = Number(event.target.dataset.ndValue);
    if (Number.isNaN(index) || !state.nds[index]) return;
    const option = ND_OPTIONS[Number(event.target.value)];
    if (!option) return;
    const [kind, [stops, name]] = option;
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
    flashSeq += 1;
    state.flashes.push({ name: `閃燈 ${flashSeq}`, mode: 'custom', power, draftPower: power, basePower: power, baseExposureStops: flashStops(state.camera, totalNd()), gn: 60, distance: 2 });
    // 只動閃燈區，相機/ND/讀數不變。
    renderFlashes();
    updateReading();
  });
  listen(elements.flashList, 'input', (event) => {
    const index = Number(event.target.dataset.flashName ?? event.target.dataset.flashPower ?? event.target.dataset.flashGn ?? event.target.dataset.flashDistance);
    if (Number.isNaN(index)) return;
    const flash = state.flashes[index];
    if (!flash) return;
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
    // 名稱/GN/距離只影響閃燈區（名稱需重建以跳脫），相機/ND/讀數不變。
    if (event.target.dataset.flashName !== undefined || event.target.dataset.flashGn !== undefined || event.target.dataset.flashDistance !== undefined) { renderFlashes(); updateReading(); }
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
    // 模式/刪除/確認/估算只影響閃燈區，相機/ND/讀數不變。
    renderFlashes();
    updateReading();
  });
  refresh();
  return () => controller.abort();
}
