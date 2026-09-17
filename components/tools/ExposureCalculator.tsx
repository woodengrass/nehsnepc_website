'use client';

import { useRef, useState } from 'react';

import {
  DEFAULT_CAMERA,
  ND_PRESETS,
  TARGET_MAX,
  TARGET_MIN,
  VALUE_SETS,
  ambientEv,
  ambientStops,
  clampTarget,
  compensate,
  estimatedPower,
  flashStops,
  formatEditableValue,
  formatPower,
  parseDirectValue,
  signed,
  sliderIndex,
  syncCustomFlashPowers,
  totalNdStops,
  type CameraKey,
  type CameraValues,
  type FlashEntry,
  type FlashMode,
  type Locks,
  type NdFilter
} from '@/lib/exposure/exposure';

const CAMERA_KEYS: readonly CameraKey[] = ['iso', 'shutter', 'aperture'];

const CAMERA_LABELS: Record<CameraKey, string> = {
  iso: 'ISO',
  shutter: '快門',
  aperture: '光圈'
};

const CAMERA_PREFIX: Record<CameraKey, string> = {
  iso: 'ISO ',
  shutter: '',
  aperture: 'f/'
};

interface CalculatorState {
  base: CameraValues;
  baseAmbient: number;
  camera: CameraValues;
  locks: Locks;
  evLocked: boolean;
  target: number;
  nds: NdFilter[];
  flashes: FlashEntry[];
}

function createInitialState(): CalculatorState {
  return {
    base: { ...DEFAULT_CAMERA },
    baseAmbient: ambientStops(DEFAULT_CAMERA, 0),
    camera: { ...DEFAULT_CAMERA },
    locks: { iso: false, shutter: false, aperture: false, nd: false },
    evLocked: false,
    target: 0,
    nds: [],
    flashes: []
  };
}

interface CommitFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'onBlur'
  > {
  value: string;
  onCommit: (raw: string) => void;
}

/**
 * Free-text field with local draft state. Typing never writes to parent state;
 * the parent commits on Enter or blur. Invalid commits are ignored by the
 * caller, so the field falls back to the formatted `value` prop.
 */
function CommitField({ value, onCommit, onKeyDown, ...rest }: CommitFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    setDraft(null);
    onCommit(raw);
  };

  return (
    <input
      {...rest}
      value={draft ?? value}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit((event.target as HTMLInputElement).value);
        }
        onKeyDown?.(event);
      }}
    />
  );
}

export default function ExposureCalculator() {
  const [state, setState] = useState<CalculatorState>(createInitialState);
  const ndIdRef = useRef(1);
  const flashSeqRef = useRef(0);

  const ndTotal = totalNdStops(state.nds);
  const ambient = ambientEv(state.camera, ndTotal, state.baseAmbient);
  const targetSlider = Math.round(state.target * 10) / 10;

  const withSyncedFlashes = (
    prev: CalculatorState,
    camera: CameraValues,
    nds: NdFilter[]
  ): FlashEntry[] =>
    syncCustomFlashPowers(prev.flashes, camera, totalNdStops(nds));

  const handleCameraSlider = (key: CameraKey, index: number) => {
    const value = VALUE_SETS[key][index];
    if (value === undefined) return;
    const camera = { ...state.camera, [key]: value };
    if (state.evLocked) {
      const compensated = compensate({
        camera,
        nds: state.nds,
        locks: state.locks,
        target: state.target,
        baseAmbient: state.baseAmbient,
        exclude: key
      });
      setState({
        ...state,
        camera: compensated.camera,
        nds: compensated.nds,
        flashes: withSyncedFlashes(
          state,
          compensated.camera,
          compensated.nds
        )
      });
    } else {
      const target = ambientEv(camera, ndTotal, state.baseAmbient);
      setState({
        ...state,
        camera,
        target,
        flashes: withSyncedFlashes(state, camera, state.nds)
      });
    }
  };

  const handleLockToggle = (key: CameraKey, checked: boolean) => {
    // 鎖定只改變後續補償對象，顯示值不變。
    setState({ ...state, locks: { ...state.locks, [key]: checked } });
  };

  const handleDirectCommit = (key: CameraKey, raw: string) => {
    const parsed = parseDirectValue(key, raw);
    if (parsed === null) return;
    const camera = { ...state.camera, [key]: parsed };
    if (state.evLocked) {
      const compensated = compensate({
        camera,
        nds: state.nds,
        locks: state.locks,
        target: state.target,
        baseAmbient: state.baseAmbient,
        exclude: key
      });
      setState({
        ...state,
        camera: compensated.camera,
        nds: compensated.nds,
        flashes: withSyncedFlashes(
          state,
          compensated.camera,
          compensated.nds
        )
      });
    } else {
      const target = ambientEv(camera, ndTotal, state.baseAmbient);
      setState({
        ...state,
        camera,
        target,
        flashes: withSyncedFlashes(state, camera, state.nds)
      });
    }
  };

  const handleLongExposureCommit = (raw: string) => {
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds <= 1) return;
    const camera = { ...state.camera, shutter: seconds };
    if (state.evLocked) {
      const compensated = compensate({
        camera,
        nds: state.nds,
        locks: state.locks,
        target: state.target,
        baseAmbient: state.baseAmbient,
        exclude: 'shutter'
      });
      setState({
        ...state,
        camera: compensated.camera,
        nds: compensated.nds,
        flashes: withSyncedFlashes(
          state,
          compensated.camera,
          compensated.nds
        )
      });
    } else {
      const target = ambientEv(camera, ndTotal, state.baseAmbient);
      setState({
        ...state,
        camera,
        target,
        flashes: withSyncedFlashes(state, camera, state.nds)
      });
    }
  };

  const handleTarget = (raw: number) => {
    const target = clampTarget(raw);
    const compensated = compensate({
      camera: state.camera,
      nds: state.nds,
      locks: state.locks,
      target,
      baseAmbient: state.baseAmbient,
      exclude: null
    });
    setState({
      ...state,
      camera: compensated.camera,
      nds: compensated.nds,
      target,
      flashes: withSyncedFlashes(
        state,
        compensated.camera,
        compensated.nds
      )
    });
  };

  const handleLockEv = (checked: boolean) => {
    setState({
      ...state,
      evLocked: checked,
      target: ambientEv(state.camera, ndTotal, state.baseAmbient)
    });
  };

  const handleResetBaseline = () => {
    const base = { ...state.camera };
    const baseAmbient = ambientStops(base, ndTotal);
    const flashes = state.flashes.map((flash) => ({
      ...flash,
      basePower: flash.power,
      draftPower: flash.power,
      baseExposureStops: flashStops(state.camera, ndTotal)
    }));
    // 只動內部基準與讀數，相機/ND/閃燈顯示不變。
    setState({ ...state, base, baseAmbient, target: 0, flashes });
  };

  const handleAddNd = () => {
    const nds: NdFilter[] = [
      ...state.nds,
      { id: ndIdRef.current++, name: 'ND2', stops: 1 }
    ];
    if (state.evLocked) {
      const compensated = compensate({
        camera: state.camera,
        nds,
        locks: state.locks,
        target: state.target,
        baseAmbient: state.baseAmbient,
        exclude: 'nd'
      });
      setState({
        ...state,
        nds: compensated.nds,
        camera: compensated.camera,
        flashes: withSyncedFlashes(
          state,
          compensated.camera,
          compensated.nds
        )
      });
    } else {
      const target = ambientEv(state.camera, totalNdStops(nds), state.baseAmbient);
      setState({
        ...state,
        nds,
        target,
        flashes: withSyncedFlashes(state, state.camera, nds)
      });
    }
  };

  const handleLockNd = (checked: boolean) => {
    setState({ ...state, locks: { ...state.locks, nd: checked } });
  };

  const handleNdSlider = (id: number, index: number) => {
    const preset = ND_PRESETS[index];
    if (!preset) return;
    const nds = state.nds.map((filter) =>
      filter.id === id
        ? { ...filter, name: preset.name, stops: preset.stops }
        : filter
    );
    if (state.evLocked) {
      const compensated = compensate({
        camera: state.camera,
        nds,
        locks: state.locks,
        target: state.target,
        baseAmbient: state.baseAmbient,
        exclude: 'nd'
      });
      setState({
        ...state,
        nds: compensated.nds,
        camera: compensated.camera,
        flashes: withSyncedFlashes(
          state,
          compensated.camera,
          compensated.nds
        )
      });
    } else {
      const target = ambientEv(state.camera, totalNdStops(nds), state.baseAmbient);
      setState({
        ...state,
        nds,
        target,
        flashes: withSyncedFlashes(state, state.camera, nds)
      });
    }
  };

  const handleRemoveNd = (id: number) => {
    const nds = state.nds.filter((filter) => filter.id !== id);
    if (state.evLocked) {
      const compensated = compensate({
        camera: state.camera,
        nds,
        locks: state.locks,
        target: state.target,
        baseAmbient: state.baseAmbient,
        exclude: 'nd'
      });
      setState({
        ...state,
        nds: compensated.nds,
        camera: compensated.camera,
        flashes: withSyncedFlashes(
          state,
          compensated.camera,
          compensated.nds
        )
      });
    } else {
      const target = ambientEv(state.camera, totalNdStops(nds), state.baseAmbient);
      setState({
        ...state,
        nds,
        target,
        flashes: withSyncedFlashes(state, state.camera, nds)
      });
    }
  };

  const handleAddFlash = () => {
    const power = -2;
    flashSeqRef.current += 1;
    const id = flashSeqRef.current;
    setState({
      ...state,
      flashes: [
        ...state.flashes,
        {
          id,
          name: `閃燈 ${id}`,
          mode: 'custom',
          power,
          draftPower: power,
          basePower: power,
          baseExposureStops: flashStops(state.camera, ndTotal),
          gn: 60,
          distance: 2
        }
      ]
    });
  };

  const updateFlash = (
    id: number,
    update: (flash: FlashEntry) => FlashEntry
  ) => {
    setState({
      ...state,
      flashes: state.flashes.map((flash) =>
        flash.id === id ? update(flash) : flash
      )
    });
  };

  const handleFlashMode = (id: number, mode: FlashMode) => {
    updateFlash(id, (flash) => ({ ...flash, mode }));
  };

  const handleRemoveFlash = (id: number) => {
    setState({
      ...state,
      flashes: state.flashes.filter((flash) => flash.id !== id)
    });
  };

  const handleConfirmFlash = (id: number) => {
    updateFlash(id, (flash) => ({
      ...flash,
      power: flash.draftPower,
      basePower: flash.draftPower,
      baseExposureStops: flashStops(state.camera, ndTotal)
    }));
  };

  const handleCalculateFlash = (id: number) => {
    const flash = state.flashes.find((entry) => entry.id === id);
    if (!flash) return;
    const power =
      Math.round(
        estimatedPower(state.camera, ndTotal, flash.gn, flash.distance) * 10
      ) / 10;
    updateFlash(id, (entry) => ({
      ...entry,
      mode: 'custom',
      power,
      draftPower: power,
      basePower: power,
      baseExposureStops: flashStops(state.camera, ndTotal)
    }));
  };

  return (
    <main
      className={`
        mx-auto
        w-[min(1180px,calc(100%-140px))]
        pt-32
        pb-24
        max-[767px]:w-[min(calc(100%-38px),620px)]
        max-[767px]:pt-24
      `}
    >
      <header
        className={`
          grid
          grid-cols-[1fr_auto]
          items-end
          gap-8
          border-b
          border-[var(--color-line)]
          pb-8
          max-[560px]:grid-cols-1
        `}
      >
        <div>
          <p
            className={`
              mb-5
              text-[0.62rem]
              tracking-[0.14em]
              text-[var(--color-muted)]
              uppercase
            `}
          >
            Tools / 01
          </p>
          <h1
            className={`
              text-[clamp(3rem,7vw,5.6rem)]
              leading-[0.88]
              font-medium
              tracking-[-0.055em]
            `}
          >
            曝光計算器
          </h1>
          <p
            className={`
              mt-6
              max-w-[34rem]
              text-[0.92rem]
              leading-[1.8]
              text-[var(--color-muted)]
            `}
          >
            先將目前參數設為基準，再選擇想要的曝光偏移。鎖定不想改變的參數，計算器會自動調整其餘項目。
          </p>
        </div>
        <button
          id="resetBaseline"
          className={`
            min-h-11
            border
            border-[var(--color-text)]
            px-4
            text-[0.62rem]
            tracking-[0.1em]
            uppercase
            transition-colors
            hover:bg-[var(--color-text)]
            hover:text-[var(--color-bg)]
          `}
          type="button"
          onClick={handleResetBaseline}
        >
          設目前為基準
        </button>
      </header>

      <div
        className={`
          grid
          grid-cols-[minmax(0,7fr)_minmax(320px,5fr)]
          gap-12
          max-[900px]:grid-cols-1
          max-[900px]:gap-0
        `}
      >
        <div
          className={`
            min-w-0
          `}
        >
      <section
        className={`
          relative
          mt-10
          border-b
          border-[var(--color-line)]
          bg-[var(--color-blue)]
          px-6
          py-6
          text-white
          max-[560px]:px-4
        `}
        aria-live="polite"
      >
        <span
          className={`
            absolute
            top-0
            left-0
            bg-[var(--color-red)]
            px-3
            py-1
            text-[0.55rem]
            tracking-[0.14em]
            uppercase
          `}
        >
          Step 01 / 目標
        </span>
        <div
          className={`
            mt-7
            mb-4
            flex
            items-baseline
            justify-between
            gap-[13px]
          `}
        >
          <span
            className={`
              text-[0.6rem]
              tracking-[0.16em]
              text-white/60
            `}
          >
            目前曝光偏移
          </span>
          <strong
            id="errorReading"
            className={`
              text-[clamp(2rem,5vw,3.6rem)]
              leading-none
              font-normal
            `}
          >
            {`${signed(ambient)} EV`}
          </strong>
        </div>
        <div
          className={`
            grid
            min-h-[47px]
            grid-cols-[72px_1fr_82px_68px]
            items-center
            gap-[13px]
            max-[560px]:grid-cols-[58px_1fr_65px]
            max-[560px]:gap-[9px]
          `}
        >
          <label
            className={`
              text-[0.68rem]
              tracking-[0.09em]
            `}
            htmlFor="targetEv"
          >
            EV
          </label>
          <input
            id="targetEv"
            className={`
              w-full
              accent-white
            `}
            type="range"
            min={TARGET_MIN}
            max={TARGET_MAX}
            step="0.1"
            value={targetSlider}
            onChange={(event) => handleTarget(Number(event.target.value))}
          />
          <output
            id="targetEvLabel"
            className={`
              text-right
              text-[1.2rem]
              whitespace-nowrap
              max-[560px]:col-start-3
            `}
          >
            {`${signed(state.target)} EV`}
          </output>
          <label
            className={`
              justify-self-end
              text-[0.56rem]
              tracking-[0.06em]
              text-white/70
            `}
          >
            <input
              id="lockEv"
              className={`
                accent-white
              `}
              type="checkbox"
              checked={state.evLocked}
              onChange={(event) => handleLockEv(event.target.checked)}
            />{' '}
            保持目標
          </label>
        </div>
        <p
          className={`
            mt-3
            border-t
            border-white/20
            pt-3
            text-[0.68rem]
            leading-[1.7]
            text-white/60
          `}
        >
          向右增加曝光，向左減少曝光。開啟「保持目標」後，改變任一參數時會自動補償。
        </p>
      </section>

      <section
        className={`
          relative
          mt-10
          border-b
          border-[var(--color-line)]
          pt-12
          pb-6
        `}
      >
        <div
          className={`
            absolute
            top-0
            left-0
            flex
            w-full
            items-center
            justify-between
            border-b
            border-[var(--color-line)]
            pb-3
          `}
        >
          <span
            className={`
              text-[0.6rem]
              tracking-[0.14em]
              uppercase
            `}
          >
            Step 02 / 相機參數
          </span>
          <span
            className={`
              text-[0.58rem]
              text-[var(--color-muted)]
            `}
          >
            勾選鎖定 = 不參與自動調整
          </span>
        </div>
        <div
          id="cameraControls"
          className={`
            [&_.parameter-row]:grid
            [&_.parameter-row]:min-h-[47px]
            [&_.parameter-row]:grid-cols-[72px_1fr_82px_68px]
            [&_.parameter-row]:items-center
            [&_.parameter-row]:gap-[13px]
            [&_.parameter-row]:py-3
            [&_.parameter-row+_.parameter-row]:border-t
            [&_.parameter-row+_.parameter-row]:border-[rgba(10,10,10,0.12)]
            [&_.parameter-row>label:first-child]:text-[0.68rem]
            [&_.parameter-row>label:first-child]:tracking-[0.09em]
            [&_input[type=range]]:w-full
            [&_input[type=range]]:accent-[var(--color-text)]
            [&_output]:text-right
            [&_output]:text-[1.08rem]
            [&_output]:font-semibold
            [&_output]:whitespace-nowrap
            [&_.lock]:justify-self-end
            [&_.lock]:text-[0.56rem]
            [&_.lock]:tracking-[0.06em]
            [&_.lock]:text-[var(--color-muted)]
            [&_.lock_input]:accent-[var(--color-text)]
            [&_[data-direct]]:w-[4em]
            [&_[data-direct]]:border-0
            [&_[data-direct]]:bg-transparent
            [&_[data-direct]]:p-0
            [&_[data-direct]]:text-right
            [&_[data-direct]]:cursor-text
            [&_[data-direct]:focus]:border-b
            [&_[data-direct]:focus]:border-[var(--color-line)]
            [&_[data-direct]:focus]:outline-none
            [&_.long-exposure]:col-span-2
            [&_.long-exposure]:col-start-2
            [&_.long-exposure]:-mt-1
            [&_.long-exposure]:border-0
            [&_.long-exposure]:border-b
            [&_.long-exposure]:border-[var(--color-line)]
            [&_.long-exposure]:bg-transparent
            [&_.long-exposure]:py-1
            [&_.long-exposure]:text-[0.72rem]
            [&_.long-exposure]:outline-none
            max-[560px]:[&_.parameter-row]:grid-cols-[58px_1fr_65px]
            max-[560px]:[&_.parameter-row]:gap-[9px]
            max-[560px]:[&_output]:col-start-3
            max-[560px]:[&_.lock]:col-start-1
            max-[560px]:[&_.lock]:row-start-2
          `}
        >
          {CAMERA_KEYS.map((key) => {
            const label = CAMERA_LABELS[key];
            return (
              <div key={key} className="slider-row parameter-row">
                <label>{label}</label>
                <input
                  data-camera={key}
                  type="range"
                  min="0"
                  max={VALUE_SETS[key].length - 1}
                  value={sliderIndex(key, state.camera[key])}
                  aria-label={label}
                  onChange={(event) =>
                    handleCameraSlider(key, Number(event.target.value))
                  }
                />
                <output title="點擊數值可直接輸入">
                  <span>{CAMERA_PREFIX[key]}</span>
                  <CommitField
                    data-direct={key}
                    aria-label={`直接輸入${label}`}
                    value={formatEditableValue(key, state.camera[key])}
                    onCommit={(raw) => handleDirectCommit(key, raw)}
                  />
                </output>
                <label className="lock">
                  <input
                    data-lock={key}
                    type="checkbox"
                    aria-label={`${label}鎖定`}
                    checked={state.locks[key]}
                    onChange={(event) =>
                      handleLockToggle(key, event.target.checked)
                    }
                  />{' '}
                  鎖定
                </label>
                {key === 'shutter' && (
                  <CommitField
                    className="long-exposure"
                    type="text"
                    inputMode="decimal"
                    aria-label="長曝秒數"
                    placeholder="長曝秒數"
                    value={
                      state.camera.shutter > 1
                        ? String(
                            Number(state.camera.shutter.toFixed(3))
                          )
                        : ''
                    }
                    onCommit={handleLongExposureCommit}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
        </div>

        <aside
          className={`
            min-w-0
            border-l
            border-[var(--color-line)]
            pl-12
            max-[900px]:mt-12
            max-[900px]:border-l-0
            max-[900px]:border-t
            max-[900px]:pl-0
          `}
          aria-label="選用曝光附件"
        >
      <section
        className={`
          mt-10
          border-b
          border-[var(--color-line)]
          py-[18px]
        `}
      >
        <div
          className={`
            mb-[10px]
            flex
            items-center
            justify-between
          `}
        >
          <span
            className={`
              text-[1.5rem]
              font-semibold
            `}
          >
            ND 濾鏡
            <small
              className={`
                ml-3
                text-[0.56rem]
                font-normal
                tracking-[0.12em]
                text-[var(--color-muted)]
                uppercase
              `}
            >
              Optional
            </small>
          </span>
          <div>
            <label
              className={`
                mr-[14px]
                text-[0.56rem]
                tracking-[0.06em]
                text-[var(--color-muted)]
              `}
            >
              <input
                id="lockNd"
                className={`
                  accent-[var(--color-text)]
                `}
                type="checkbox"
                checked={state.locks.nd}
                onChange={(event) => handleLockNd(event.target.checked)}
              />{' '}
              鎖定
            </label>
            <button
              id="addNd"
              className={`
                border-b
                border-[var(--color-line)]
                pb-[3px]
                text-[0.58rem]
                tracking-[0.08em]
              `}
              type="button"
              onClick={handleAddNd}
            >
              + 新增
            </button>
          </div>
        </div>
        <div
          id="ndStack"
          className={`
            text-[1.35rem]
            text-[rgba(10,10,10,0.72)]
          `}
        >
          {state.nds.length
            ? state.nds.map((filter) => filter.name).join(' + ')
            : '無濾鏡'}
        </div>
        <p
          className={`
            mt-2
            text-[0.68rem]
            leading-[1.7]
            text-[var(--color-muted)]
          `}
        >
          裝上 ND 濾鏡時才需要新增。多個濾鏡會自動累加減光檔數。
        </p>
        <div
          id="ndList"
          className={`
            mt-[10px]
            grid
            gap-[7px]
            [&_.nd-card]:grid
            [&_.nd-card]:grid-cols-[1fr_74px_auto]
            [&_.nd-card]:items-center
            [&_.nd-card]:gap-3
            [&_.nd-card]:border
            [&_.nd-card]:border-[var(--color-line)]
            [&_.nd-card]:p-[13px]
            [&_input[type=range]]:w-full
            [&_input[type=range]]:accent-[var(--color-text)]
            [&_output]:text-right
            [&_output]:text-[1.35rem]
            [&_.remove]:text-[0.55rem]
            [&_.remove]:tracking-[0.08em]
            [&_.remove]:text-[var(--color-muted)]
          `}
        >
          {state.nds.map((filter) => (
            <div key={filter.id} className="nd-card">
              <input
                type="range"
                min="0"
                max={ND_PRESETS.length - 1}
                step="1"
                value={filter.stops - 1}
                aria-label="ND 濾鏡減光檔數"
                onChange={(event) =>
                  handleNdSlider(filter.id, Number(event.target.value))
                }
              />
              <output>{filter.name}</output>
              <button
                className="remove"
                type="button"
                aria-label={`刪除 ${filter.name}`}
                onClick={() => handleRemoveNd(filter.id)}
              >
                刪除
              </button>
            </div>
          ))}
        </div>
      </section>

      <section
        className={`
          border-b
          border-[var(--color-line)]
          py-[18px]
        `}
      >
        <div
          className={`
            mb-[10px]
            flex
            items-center
            justify-between
          `}
        >
          <span
            className={`
              text-[1.5rem]
              font-semibold
            `}
          >
            閃燈
            <small
              className={`
                ml-3
                text-[0.56rem]
                font-normal
                tracking-[0.12em]
                text-[var(--color-muted)]
                uppercase
              `}
            >
              Optional
            </small>
          </span>
          <button
            id="addFlash"
            className={`
              border-b
              border-[var(--color-line)]
              pb-[3px]
              text-[0.58rem]
              tracking-[0.08em]
            `}
            type="button"
            onClick={handleAddFlash}
          >
            + 新增
          </button>
        </div>
        <p
          className={`
            text-[0.68rem]
            leading-[1.7]
            text-[var(--color-muted)]
          `}
        >
          需要混合環境光與閃燈時使用。可記錄現有功率，或用 GN 與距離估算輸出。
        </p>
        <div
          id="flashList"
          className={`
            mt-[10px]
            grid
            gap-[7px]
            [&_.flash-card]:border
            [&_.flash-card]:border-[var(--color-line)]
            [&_.flash-card]:p-[13px]
            [&_.flash-top]:flex
            [&_.flash-top]:items-center
            [&_.flash-top]:gap-[10px]
            max-[560px]:[&_.flash-top]:flex-wrap
            [&_.flash-top>input]:min-w-0
            [&_.flash-top>input]:flex-1
            [&_.flash-top>input]:text-[1.15rem]
            [&_.flash-mode]:flex
            [&_.flash-mode]:gap-[10px]
            max-[560px]:[&_.flash-mode]:order-3
            max-[560px]:[&_.flash-mode]:w-full
            [&_.flash-mode_button]:py-[5px]
            [&_.flash-mode_button]:text-[0.56rem]
            [&_.flash-mode_button]:tracking-[0.06em]
            [&_.flash-mode_button]:opacity-45
            [&_.flash-mode_button.active]:border-b
            [&_.flash-mode_button.active]:border-[var(--color-text)]
            [&_.flash-mode_button.active]:opacity-100
            [&_.flash-fields]:mt-[13px]
            [&_.flash-fields]:grid
            [&_.flash-fields]:grid-cols-3
            [&_.flash-fields]:items-end
            [&_.flash-fields]:gap-3
            max-[560px]:[&_.flash-fields]:grid-cols-2
            [&_.flash-fields_label]:grid
            [&_.flash-fields_label]:gap-[5px]
            [&_.flash-fields_label]:text-[0.75rem]
            [&_.flash-fields_label]:tracking-[0.07em]
            [&_.flash-fields_label]:text-[var(--color-muted)]
            [&_.flash-fields_label_strong]:text-[1.25rem]
            [&_.flash-fields_label_strong]:tracking-normal
            [&_.flash-fields_label_strong]:text-[var(--color-text)]
            [&_.flash-fields_input]:w-full
            [&_.flash-fields_button]:min-h-[27px]
            [&_.flash-fields_button]:border-b
            [&_.flash-fields_button]:border-[var(--color-line)]
            [&_.flash-fields_button]:text-[0.57rem]
            [&_.flash-fields_button]:tracking-[0.08em]
            [&_.flash-status]:mt-3
            [&_.flash-status]:text-[0.82rem]
            [&_.flash-status]:tracking-[0.06em]
            [&_.flash-status]:text-[var(--color-muted)]
            [&_.flash-status_strong]:ml-[6px]
            [&_.flash-status_strong]:text-[1.3rem]
            [&_.flash-status_strong]:text-[var(--color-text)]
            [&_.remove]:text-[0.55rem]
            [&_.remove]:tracking-[0.08em]
            [&_.remove]:text-[var(--color-muted)]
            [&_.flash-card_input]:border-0
            [&_.flash-card_input]:border-b
            [&_.flash-card_input]:border-[var(--color-line)]
            [&_.flash-card_input]:bg-transparent
            [&_.flash-card_input]:py-[5px]
            [&_.flash-card_input]:text-[0.7rem]
            [&_.flash-card_input]:outline-none
          `}
        >
          {state.flashes.map((flash) => (
            <article key={flash.id} className="flash-card">
              <div className="flash-top">
                <input
                  value={flash.name}
                  aria-label="閃燈名稱"
                  onChange={(event) =>
                    updateFlash(flash.id, (entry) => ({
                      ...entry,
                      name: event.target.value
                    }))
                  }
                />
                <div className="flash-mode">
                  <button
                    className={flash.mode === 'custom' ? 'active' : ''}
                    type="button"
                    onClick={() => handleFlashMode(flash.id, 'custom')}
                  >
                    自訂基準
                  </button>
                  <button
                    className={flash.mode === 'estimate' ? 'active' : ''}
                    type="button"
                    onClick={() => handleFlashMode(flash.id, 'estimate')}
                  >
                    功率估算
                  </button>
                </div>
                <button
                  className="remove"
                  type="button"
                  aria-label={`刪除 ${flash.name}`}
                  onClick={() => handleRemoveFlash(flash.id)}
                >
                  刪除
                </button>
              </div>
              {flash.mode === 'custom' ? (
                <>
                  <div className="flash-fields">
                    <label>
                      亮度
                      <input
                        type="range"
                        min="-9"
                        max="0"
                        step="0.1"
                        value={flash.draftPower}
                        aria-label={`${flash.name}亮度`}
                        onChange={(event) => {
                          const draftPower = Number(event.target.value);
                          updateFlash(flash.id, (entry) => ({
                            ...entry,
                            draftPower
                          }));
                        }}
                      />
                    </label>
                    <label>
                      預覽
                      <strong>{formatPower(flash.draftPower)}</strong>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleConfirmFlash(flash.id)}
                    >
                      確定
                    </button>
                  </div>
                  <p className="flash-status">
                    目前基準{' '}
                    <strong>{formatPower(flash.power)}</strong>
                  </p>
                </>
              ) : (
                <>
                  <div className="flash-fields">
                    <label>
                      GN
                      <CommitField
                        type="number"
                        min="1"
                        step="0.1"
                        aria-label={`${flash.name} GN 值`}
                        value={String(flash.gn)}
                        onCommit={(raw) => {
                          const parsed = Number(raw);
                          if (!Number.isFinite(parsed)) return;
                          updateFlash(flash.id, (entry) => ({
                            ...entry,
                            gn: Math.max(1, parsed)
                          }));
                        }}
                      />
                    </label>
                    <label>
                      距離（m）
                      <CommitField
                        type="number"
                        min="0.1"
                        step="0.1"
                        aria-label={`${flash.name}距離公尺`}
                        value={String(flash.distance)}
                        onCommit={(raw) => {
                          const parsed = Number(raw);
                          if (!Number.isFinite(parsed)) return;
                          updateFlash(flash.id, (entry) => ({
                            ...entry,
                            distance: Math.max(0.1, parsed)
                          }));
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCalculateFlash(flash.id)}
                    >
                      計算
                    </button>
                  </div>
                  <p className="flash-status">
                    將依 GN、距離、ISO、光圈與 ND 估算功率。
                  </p>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
        </aside>
      </div>
    </main>
  );
}
