/**
 * Exposure calculator pure module.
 *
 * All photographic math, preset tables, formatting, and state transitions live
 * here as framework-free pure functions. `components/tools/ExposureCalculator`
 * owns the React state and rendering; this module never touches the DOM, so it
 * is importable during server rendering and unit-testable in isolation.
 */

export type CameraKey = 'iso' | 'shutter' | 'aperture';
export type CompensationExclude = CameraKey | 'nd' | null;

export interface CameraValues {
  iso: number;
  shutter: number;
  aperture: number;
}

export interface Locks {
  iso: boolean;
  shutter: boolean;
  aperture: boolean;
  nd: boolean;
}

export interface NdFilter {
  id: number;
  name: string;
  stops: number;
}

export type FlashMode = 'custom' | 'estimate';

export interface FlashEntry {
  id: number;
  name: string;
  mode: FlashMode;
  power: number;
  draftPower: number;
  basePower: number;
  baseExposureStops: number;
  gn: number;
  distance: number;
}

export const ISO_VALUES: readonly number[] = [
  25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800,
  1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800,
  16000, 20000, 25600, 32000, 40000, 51200, 64000, 80000, 102400
];

export const APERTURE_VALUES: readonly number[] = [
  1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6,
  6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45
];

export const SHUTTER_VALUES: readonly number[] = [
  1, 0.8, 0.6, 0.5, 0.4, 1 / 3, 0.25, 0.2, 1 / 6, 0.125, 0.1, 1 / 13,
  1 / 15, 0.05, 0.04, 1 / 30, 0.025, 0.02, 1 / 60, 0.0125, 0.01, 0.008,
  0.00625, 0.005, 0.004, 0.003125, 0.0025, 0.002, 0.0015625, 0.00125, 0.001,
  0.0008, 0.000625, 0.0005, 0.0004, 0.0003125, 0.00025, 0.0002, 0.00015625,
  0.000125, 0.0001, 1 / 12800, 0.0000625, 0.00005, 1 / 25600, 0.00003125
];

export const SHUTTER_LABELS: readonly string[] = [
  '1s', '0.8s', '0.6s', '1/2', '1/2.5', '1/3', '1/4', '1/5', '1/6', '1/8',
  '1/10', '1/13', '1/15', '1/20', '1/25', '1/30', '1/40', '1/50', '1/60',
  '1/80', '1/100', '1/125', '1/160', '1/200', '1/250', '1/320', '1/400',
  '1/500', '1/640', '1/800', '1/1000', '1/1250', '1/1600', '1/2000', '1/2500',
  '1/3200', '1/4000', '1/5000', '1/6400', '1/8000', '1/10000', '1/12800',
  '1/16000', '1/20000', '1/25600', '1/32000'
];

export const VALUE_SETS: Record<CameraKey, readonly number[]> = {
  iso: ISO_VALUES,
  shutter: SHUTTER_VALUES,
  aperture: APERTURE_VALUES
};

export interface NdPreset {
  stops: number;
  name: string;
}

export const ND_PRESETS: readonly NdPreset[] = [
  { stops: 1, name: 'ND2' },
  { stops: 2, name: 'ND4' },
  { stops: 3, name: 'ND8' },
  { stops: 4, name: 'ND16' },
  { stops: 5, name: 'ND32' },
  { stops: 6, name: 'ND64' },
  { stops: 7, name: 'ND128' },
  { stops: 8, name: 'ND256' },
  { stops: 9, name: 'ND512' },
  { stops: 10, name: 'ND1024' }
];

export const TARGET_MIN = -10;
export const TARGET_MAX = 10;
export const FLASH_MIN = -9;
export const FLASH_MAX = 0;
export const ND_MIN_STOPS = 1;
export const ND_MAX_STOPS = 10;

/** Compensation scans unlocked parameters in this fixed photographic order. */
const COMPENSATION_ORDER: readonly (CameraKey | 'nd')[] = [
  'shutter',
  'aperture',
  'iso',
  'nd'
];

export const DEFAULT_CAMERA: CameraValues = {
  iso: 100,
  shutter: 1 / 125,
  aperture: 5.6
};

export function nearestIndex(
  values: readonly number[],
  value: number
): number {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (
      Math.abs(values[index] - value) < Math.abs(values[best] - value)
    ) {
      best = index;
    }
  }
  return best;
}

export function sliderIndex(key: CameraKey, value: number): number {
  return nearestIndex(VALUE_SETS[key], value);
}

export function signed(value: number): string {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

export function formatValue(key: CameraKey, value: number): string {
  if (key === 'iso') return `ISO ${Math.round(value)}`;
  // 相機慣例：f/10 以上機身只顯示整數，小數由機身四捨五入，保持顯示與相機一致。
  if (key === 'aperture') {
    return `f/${value < 10 ? value.toFixed(1) : Math.round(value)}`;
  }
  const index = nearestIndex(SHUTTER_VALUES, value);
  if (Math.abs(SHUTTER_VALUES[index] - value) < 0.000001) {
    return SHUTTER_LABELS[index];
  }
  // 非預設快門：<1s 用分數（相機慣例），>=1s 用秒數，避免小快門被 toFixed(1) 吃成 0.0s。
  if (value < 1 && value > 0) return `1/${Math.round(1 / value)}`;
  return `${Number(value.toFixed(1))}s`;
}

export function formatEditableValue(key: CameraKey, value: number): string {
  if (key === 'iso') return String(Math.round(value));
  if (key === 'aperture') {
    return value < 10 ? value.toFixed(1) : String(Math.round(value));
  }
  return formatValue(key, value);
}

export function formatPower(value: number): string {
  // 相機慣例：以整檔為底加餘數（如 1/2 +0.9 表 -0.1 檔），與機身顯示一致，保持不動。
  if (value >= -0.04) return '1/1';
  const baseStop = -Math.ceil(-value);
  const fine = Math.round((value - baseStop) * 10);
  const base = `1/${2 ** -baseStop}`;
  return fine ? `${base} +${fine / 10}` : base;
}

export function ambientStops(
  camera: CameraValues,
  ndStops: number
): number {
  return (
    Math.log2(camera.iso / 100) +
    Math.log2(camera.shutter) -
    2 * Math.log2(camera.aperture) -
    ndStops
  );
}

export function flashStops(
  camera: CameraValues,
  ndStops: number
): number {
  return (
    Math.log2(camera.iso / 100) -
    2 * Math.log2(camera.aperture) -
    ndStops
  );
}

export function totalNdStops(nds: readonly NdFilter[]): number {
  return nds.reduce((total, filter) => total + filter.stops, 0);
}

export function ambientEv(
  camera: CameraValues,
  ndStops: number,
  baseAmbient: number
): number {
  return ambientStops(camera, ndStops) - baseAmbient;
}

export function clampTarget(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(TARGET_MIN, Math.min(TARGET_MAX, raw));
}

export function clampFlashPower(raw: number): number {
  if (!Number.isFinite(raw)) return FLASH_MIN;
  return Math.max(FLASH_MIN, Math.min(FLASH_MAX, raw));
}

export function estimatedPower(
  camera: CameraValues,
  ndStops: number,
  gn: number,
  distance: number
): number {
  const safeGn = Math.max(1, gn);
  const safeDistance = Math.max(0.1, distance);
  const isoGn = safeGn * Math.sqrt(camera.iso / 100);
  const requiredPower =
    2 * Math.log2((camera.aperture * safeDistance) / isoGn) + ndStops;
  return clampFlashPower(requiredPower);
}

/**
 * Parse a hand-typed camera value. Returns `null` for invalid input so the
 * caller can restore the previous display instead of storing garbage.
 *
 * 快門：先去秒後綴再測分數，否則「1/125s」「1/125秒」會因尾巴對不上 regex、
 * 掉到 Number("1/125")=NaN 被當無效輸入。
 */
export function parseDirectValue(
  key: CameraKey,
  raw: string
): number | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return null;
  if (key === 'iso') {
    const value = Number(normalized.replace('iso', ''));
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (key === 'aperture') {
    const value = Number(
      normalized.replace('f/', '').replace('f', '')
    );
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  const bare = normalized.replace(/秒/g, '').replace(/s/g, '');
  const fraction = bare.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const value = Number(fraction[1]) / Number(fraction[2]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  const value = Number(bare);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export interface CompensationInput {
  camera: CameraValues;
  nds: readonly NdFilter[];
  locks: Locks;
  target: number;
  baseAmbient: number;
  exclude?: CompensationExclude;
}

export interface CompensationResult {
  camera: CameraValues;
  nds: NdFilter[];
}

/**
 * Move the first eligible unlocked parameter toward `target`. Discrete camera
 * values are searched for minimum target error; ND compensation rewrites only
 * the first attached filter and does nothing when no ND exists.
 */
export function compensate(input: CompensationInput): CompensationResult {
  const { locks, target, baseAmbient, exclude = null } = input;
  const key = COMPENSATION_ORDER.find(
    (candidate) => candidate !== exclude && !locks[candidate]
  );
  if (!key) {
    return { camera: { ...input.camera }, nds: input.nds.map((nd) => ({ ...nd })) };
  }
  if (key === 'nd') {
    const nds = input.nds.map((nd) => ({ ...nd }));
    if (!nds.length) return { camera: { ...input.camera }, nds };
    const otherStops = totalNdStops(nds) - nds[0].stops;
    const required =
      ambientStops(input.camera, 0) - baseAmbient - target - otherStops;
    const stops = Math.max(
      ND_MIN_STOPS,
      Math.min(ND_MAX_STOPS, Math.round(required))
    );
    const multiplier = 2 ** stops;
    nds[0] = { ...nds[0], name: `ND${multiplier}`, stops };
    return { camera: { ...input.camera }, nds };
  }
  const nd = totalNdStops(input.nds);
  let best = input.camera[key];
  let smallestError = Infinity;
  for (const value of VALUE_SETS[key]) {
    const candidate: CameraValues = { ...input.camera, [key]: value };
    const error = Math.abs(
      ambientStops(candidate, nd) - baseAmbient - target
    );
    if (error < smallestError) {
      best = value;
      smallestError = error;
    }
  }
  return {
    camera: { ...input.camera, [key]: best },
    nds: input.nds.map((ndFilter) => ({ ...ndFilter }))
  };
}

/**
 * Follow ambient drift for custom-mode flashes: each flash keeps the offset it
 * had against its own baseline exposure. Estimate-mode flashes are untouched.
 */
export function syncCustomFlashPowers(
  flashes: readonly FlashEntry[],
  camera: CameraValues,
  ndStops: number
): FlashEntry[] {
  const current = flashStops(camera, ndStops);
  return flashes.map((flash) => {
    if (flash.mode !== 'custom') return flash;
    const needed = flash.basePower - (current - flash.baseExposureStops);
    const power = clampFlashPower(Math.round(needed * 10) / 10);
    if (power === flash.power && power === flash.draftPower) return flash;
    return { ...flash, power, draftPower: power };
  });
}
