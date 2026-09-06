'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ABOUT_FOCUS_CONTENT } from '@/lib/about_content';

gsap.registerPlugin(ScrollTrigger);

const FOCUS_POINT = 62;
const STATION_SNAP_POINTS = [0.325, 0.855];

type ArchiveScene = {
  setProgress: (progress: number, immediate?: boolean) => void;
  setExitProgress: (progress: number) => void;
  setRenderingPaused: (isPaused: boolean) => void;
  destroy: () => void;
};

type ExitPageFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  progress: number;
};

export default function AboutExperience() {
  useEffect(() => {
    const pageQuery = document.querySelector<HTMLElement>('.obscura');
    const focusReadingQuery = document.getElementById('focusReading');
    const microprismCanvasQuery = document.getElementById('microprismCanvas') as HTMLCanvasElement | null;
    const viewfinderImageQuery = document.querySelector<HTMLImageElement>('.obscura-image');
    const imageWrapQuery = document.querySelector<HTMLElement>('.obscura-image-wrap');
    const archiveCanvasQuery = document.getElementById('archiveCanvas') as HTMLCanvasElement | null;
    const focusGuideQuery = document.getElementById('focusGuide');
    const afterwordQuery = document.querySelector<HTMLElement>('.obscura-afterword');
    const exitQuery = document.querySelector<HTMLElement>('.obscura-exit');
    const exitStageQuery = document.querySelector<HTMLElement>('.obscura-exit-stage');

    if (
      !pageQuery ||
      !focusReadingQuery ||
      !microprismCanvasQuery ||
      !viewfinderImageQuery ||
      !imageWrapQuery ||
      !archiveCanvasQuery ||
      !focusGuideQuery ||
      !afterwordQuery ||
      !exitQuery ||
      !exitStageQuery
    ) {
      return;
    }

    const page: HTMLElement = pageQuery;
    const focusReading: HTMLElement = focusReadingQuery;
    const microprismCanvas: HTMLCanvasElement = microprismCanvasQuery;
    const viewfinderImage: HTMLImageElement = viewfinderImageQuery;
    const imageWrap: HTMLElement = imageWrapQuery;
    const archiveCanvas: HTMLCanvasElement = archiveCanvasQuery;
    const focusGuide: HTMLElement = focusGuideQuery;
    const afterword: HTMLElement = afterwordQuery;
    const exit: HTMLElement = exitQuery;
    const exitStage: HTMLElement = exitStageQuery;

    let focusFrame: number | null = null;
    let prismFrame: number | null = null;
    let archivePauseFrame: number | null = null;
    let prismSceneCanvas: HTMLCanvasElement | null = null;
    let prismError = 1;
    let currentFocusValue = 8;
    let pendingFocusValue = currentFocusValue;
    let archiveProgress = 0;
    let archiveExitProgress = 0;
    let archiveScene: ArchiveScene | null = null;
    let archiveLoadPromise: Promise<ArchiveScene | null> | null = null;
    let isExperienceUnlocked = false;
    let isFocusTransitionActive = false;
    let isStoryViewActive = false;
    let isExitSettled = false;
    let afterwordLayout: { left: number; top: number; width: number; height: number } | null = null;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const media = gsap.matchMedia();

    function resetAfterwordProjection() {
      isExitSettled = false;
      afterword.classList.remove('is-projecting', 'is-projection-interactive', 'is-exit-settled');
      afterword.style.removeProperty('opacity');
      afterword.style.removeProperty('transform');
    }

    function projectAfterword(frame: ExitPageFrame) {
      const { left, top, width, height, opacity, progress } = frame;
      if (isExitSettled && progress < 0.995) resetAfterwordProjection();
      if (isExitSettled) return;
      if (opacity <= 0 || progress <= 0) {
        resetAfterwordProjection();
        if (isStoryViewActive) gsap.set(archiveCanvas, { autoAlpha: 1 });
        return;
      }

      if (!afterwordLayout) {
        const bounds = afterword.getBoundingClientRect();
        afterwordLayout = {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height
        };
      }
      const scaleX = width / afterwordLayout.width;
      const scaleY = height / afterwordLayout.height;
      afterword.classList.add('is-projecting');
      afterword.classList.toggle('is-projection-interactive', progress >= 0.99);
      afterword.style.opacity = String(opacity);
      afterword.style.transform = `translate3d(${left - afterwordLayout.left}px, ${top - afterwordLayout.top}px, 0) scale(${scaleX}, ${scaleY})`;
      const rawCanvasReveal = Math.max(0, Math.min(1, (progress - 0.99) / 0.01));
      const canvasReveal = rawCanvasReveal * rawCanvasReveal * (3 - 2 * rawCanvasReveal);
      gsap.set(archiveCanvas, { autoAlpha: 1 - canvasReveal });
      if (progress >= 0.999 && opacity >= 0.999) {
        isExitSettled = true;
        afterword.classList.add('is-exit-settled');
        afterword.style.opacity = '1';
        afterword.style.transform = 'none';
        archiveScene?.setRenderingPaused(true);
      }
    }

    function loadArchiveScene() {
      if (prefersReducedMotion.matches) return Promise.resolve(null);
      if (archiveLoadPromise) return archiveLoadPromise;
      archiveLoadPromise = import('@/lib/archive_scene')
        .then(({ createArchiveScene }) => createArchiveScene(archiveCanvas, projectAfterword))
        .then((scene) => {
          archiveScene = scene as ArchiveScene;
          page.classList.add('is-archive-3d');
          archiveScene?.setProgress(archiveProgress, page.classList.contains('reduced-motion'));
          archiveScene?.setExitProgress(archiveExitProgress);
          setStoryViewActive(isStoryViewActive);
          // DOM 備援切換為 3D 後高度會縮短，下一幀重新量測固定捲動區間。
          window.requestAnimationFrame(() => ScrollTrigger.refresh());
          return archiveScene;
        })
        .catch((error) => {
          console.error('Unable to initialize the archive scene.', error);
          showDomFallback();
          return null;
        });
      return archiveLoadPromise;
    }

    function showDomFallback() {
      destroyArchiveScene();
      page.classList.remove('is-archive-3d', 'is-in-story');
      media.revert();
      setStoryViewActive(false);
    }

    function destroyArchiveScene() {
      archiveScene?.destroy();
      archiveScene = null;
    }

    function setArchiveProgress(progress: number, immediate = false) {
      archiveProgress = progress;
      page.classList.toggle('is-in-story', progress > 0.04);
      if (progress > 0.01) loadArchiveScene();
      archiveScene?.setProgress(progress, immediate);
    }

    function setArchiveExitProgress(progress: number) {
      archiveExitProgress = progress;
      if (progress < 0.995) archiveScene?.setRenderingPaused(false);
      archiveScene?.setExitProgress(progress);
    }

    function focusDistanceValue(value: number) {
      const normalizedValue = value / 100;
      if (normalizedValue >= 0.97) return Number.POSITIVE_INFINITY;
      return 0.45 / Math.pow(1 - normalizedValue, 1.54);
    }

    function focusDistance(value: number) {
      const distance = focusDistanceValue(value);
      if (!Number.isFinite(distance)) return '\u221e';
      if (distance < 1) return distance.toFixed(2);
      return distance < 10 ? distance.toFixed(1) : String(Math.round(distance));
    }

    function focusSensitivity(value: number) {
      const distance = focusDistanceValue(value);
      if (!Number.isFinite(distance)) return 1;
      const distanceFromFocus = Math.abs(distance - 2);
      if (distanceFromFocus <= 1) return 0.35;
      return 0.35 + Math.min(1, (distanceFromFocus - 1) / 0.5) * 0.65;
    }

    function renderMicroprism() {
      prismFrame = null;
      if (isExperienceUnlocked) return;
      const bounds = microprismCanvas.getBoundingClientRect();
      const size = Math.round(bounds.width);
      if (!size || !viewfinderImage.complete) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const renderedSize = size * pixelRatio;
      if (microprismCanvas.width !== renderedSize || microprismCanvas.height !== renderedSize) {
        microprismCanvas.width = renderedSize;
        microprismCanvas.height = renderedSize;
      }
      const context = microprismCanvas.getContext('2d');
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, size, size);

      if (!prismSceneCanvas || prismSceneCanvas.width !== renderedSize || prismSceneCanvas.height !== renderedSize) {
        prismSceneCanvas = document.createElement('canvas');
        prismSceneCanvas.width = renderedSize;
        prismSceneCanvas.height = renderedSize;
        const sceneContext = prismSceneCanvas.getContext('2d');
        if (!sceneContext) return;
        sceneContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        const imageScale = Math.max(window.innerWidth / viewfinderImage.naturalWidth, window.innerHeight / viewfinderImage.naturalHeight);
        const imageWidth = viewfinderImage.naturalWidth * imageScale;
        const imageHeight = viewfinderImage.naturalHeight * imageScale;
        const imageLeft = (window.innerWidth - imageWidth) * 0.5;
        const imageTop = (window.innerHeight - imageHeight) * 0.62;
        const cropLeft = window.innerWidth / 2 - size / 2;
        const cropTop = window.innerHeight / 2 - size / 2;
        sceneContext.drawImage(viewfinderImage, imageLeft - cropLeft, imageTop - cropTop, imageWidth, imageHeight);
      }

      const center = size / 2;
      const outerRadius = size * 0.49;
      const innerRadius = size * 0.31;
      const facetCount = 48;
      const displacement = prismError * 8;

      for (let index = 0; index < facetCount; index += 1) {
        const startAngle = (index / facetCount) * Math.PI * 2;
        const endAngle = ((index + 1) / facetCount) * Math.PI * 2;
        const facetAngle = (startAngle + endAngle) / 2;
        const direction = index % 4 < 2 ? 1 : -1;

        context.save();
        context.beginPath();
        context.arc(center, center, outerRadius, startAngle, endAngle);
        context.arc(center, center, innerRadius, endAngle, startAngle, true);
        context.closePath();
        context.clip();
        context.drawImage(
          prismSceneCanvas,
          Math.cos(facetAngle) * displacement * direction,
          Math.sin(facetAngle) * displacement * direction,
          size,
          size
        );
        context.restore();

        context.beginPath();
        context.moveTo(center + Math.cos(startAngle) * innerRadius, center + Math.sin(startAngle) * innerRadius);
        context.lineTo(center + Math.cos(startAngle) * outerRadius, center + Math.sin(startAngle) * outerRadius);
        context.strokeStyle = `rgba(255, 255, 255, ${0.035 + prismError * 0.07})`;
        context.lineWidth = 0.5;
        context.stroke();
      }
    }

    function scheduleMicroprism(error: number) {
      if (isExperienceUnlocked) return;
      prismError = error;
      if (!prismFrame) prismFrame = window.requestAnimationFrame(renderMicroprism);
    }

    function unlockExperience() {
      if (isExperienceUnlocked) return;
      isExperienceUnlocked = true;
      isFocusTransitionActive = true;
      document.documentElement.classList.remove('is-focus-locked');
      document.body.classList.remove('is-focus-locked');
      page.classList.add('is-unlocked');
      focusGuide.textContent = ABOUT_FOCUS_CONTENT.lockedPrompt;
      page.removeEventListener('pointerdown', handlePointerDown);
      if (prismFrame !== null) window.cancelAnimationFrame(prismFrame);
      prismFrame = null;
      prismSceneCanvas = null;
      microprismCanvas.width = 0;
      microprismCanvas.height = 0;
      // 對焦完成後立即準備 3D 場景，避免使用者開始滑動時入口照片尚未載入。
      loadArchiveScene();
      gsap.fromTo('.obscura-flash', { autoAlpha: 0.95 }, {
        autoAlpha: 0,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: () => {
          isFocusTransitionActive = false;
          removeFocusScrollListeners();
          if (focusPointerId === null) removeFocusPointerListeners();
        }
      });
    }

    function applyFocus(value: number) {
      const valueInRange = Math.max(0, Math.min(100, Number(value)));
      currentFocusValue = valueInRange;
      const sideRange = valueInRange < FOCUS_POINT ? FOCUS_POINT : 100 - FOCUS_POINT;
      const signedError = (valueInRange - FOCUS_POINT) / sideRange;
      const focusError = Math.min(1, Math.abs(signedError));
      const opticalFocus = 1 - focusError;
      const distance = focusDistance(valueInRange);
      const isFocused = Math.abs(valueInRange - FOCUS_POINT) <= 0.8;

      page.style.setProperty('--focus', String(opticalFocus));
      page.style.setProperty('--focus-error', String(focusError));
      page.style.setProperty('--split-offset', `${signedError * 18}px`);
      focusReading.textContent = distance === '\u221e' ? distance : `${distance}m`;
      page.classList.toggle('is-focused', isFocused);
      if (isFocused) unlockExperience();
      scheduleMicroprism(focusError);
    }

    function setFocus(value: number) {
      const valueInRange = Math.max(0, Math.min(100, Number(value)));
      currentFocusValue = valueInRange;
      pendingFocusValue = valueInRange;
      if (Math.abs(valueInRange - FOCUS_POINT) <= 0.8) {
        if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
        focusFrame = null;
        applyFocus(valueInRange);
        return;
      }
      if (focusFrame === null) {
        focusFrame = window.requestAnimationFrame(() => {
          focusFrame = null;
          applyFocus(pendingFocusValue);
        });
      }
    }

    function adjustFocus(amount: number) {
      const nextValue = currentFocusValue + amount * focusSensitivity(currentFocusValue);
      const crossesFocus = (currentFocusValue - FOCUS_POINT) * (nextValue - FOCUS_POINT) <= 0;
      if (crossesFocus || Math.abs(nextValue - FOCUS_POINT) <= 1.1) {
        setFocus(FOCUS_POINT);
        return;
      }
      setFocus(nextValue);
    }

    function snapToNearestStation(progress: number) {
      const nearest = STATION_SNAP_POINTS.reduce((closest, point) => (
        Math.abs(point - progress) < Math.abs(closest - progress) ? point : closest
      ));
      return Math.abs(nearest - progress) <= 0.055 ? nearest : progress;
    }

    function setStoryViewActive(isActive: boolean) {
      // 3D canvas 不可放在 timeline 的時間 0 使用 .set()：GSAP 建立時間軸時會立即
      // 套用零時刻狀態，導致使用者尚未捲動，載入完成的 canvas 就蓋掉對焦畫面。
      // 改由 ScrollTrigger 的進出事件切換，讓初始、進入故事及返回頂部都有明確狀態。
      isStoryViewActive = isActive;
      if (isActive) {
        if (archivePauseFrame !== null) window.cancelAnimationFrame(archivePauseFrame);
        archivePauseFrame = null;
        archiveScene?.setRenderingPaused(false);
      } else if (archiveScene && archivePauseFrame === null) {
        // Allow the newly created renderer to present before pausing its hidden scene.
        archivePauseFrame = window.requestAnimationFrame(() => {
          archivePauseFrame = window.requestAnimationFrame(() => {
            archivePauseFrame = null;
            if (!isStoryViewActive) archiveScene?.setRenderingPaused(true);
          });
        });
      }
      const showArchive = isActive && archiveScene !== null;
      gsap.set(archiveCanvas, { autoAlpha: showArchive ? 1 : 0 });
      gsap.set(imageWrap, { autoAlpha: showArchive ? 0 : 1 });
      if (!isActive) resetAfterwordProjection();
    }

    function updateVisitorCoordinate() {
      const coordinate = page.querySelector('.obscura-coordinate-top');
      if (!coordinate) return;
      coordinate.textContent = 'LOCATING...';
      fetch('https://ipwho.is/')
        .then((response) => response.json())
        .then((location) => {
          if (!location.success || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            throw new Error('IP location is unavailable.');
          }
          const latitude = `${Math.abs(location.latitude).toFixed(2)}${location.latitude >= 0 ? ' N' : ' S'}`;
          const longitude = `${Math.abs(location.longitude).toFixed(2)}${location.longitude >= 0 ? ' E' : ' W'}`;
          coordinate.textContent = `${latitude} / ${longitude}`;
        })
        .catch(() => { coordinate.textContent = ABOUT_FOCUS_CONTENT.coordinateFallback; });
    }

    function handleWheel(event: WheelEvent) {
      if (isFocusTransitionActive) {
        event.preventDefault();
        return;
      }
      if (isExperienceUnlocked) return;
      event.preventDefault();
      adjustFocus(event.deltaY * 0.04);
    }

    let focusPointerId: number | null = null;
    let lastPointerY: number | null = null;

    function handlePointerDown(event: PointerEvent) {
      if (isExperienceUnlocked || event.pointerType !== 'touch') return;
      focusPointerId = event.pointerId;
      lastPointerY = event.clientY;
      page.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== focusPointerId || lastPointerY === null) return;
      event.preventDefault();
      // 對焦可在一個 gesture 中完成，但同一手勢的剩餘移動不能交回瀏覽器捲動。
      if (isExperienceUnlocked) return;
      const movement = lastPointerY - event.clientY;
      adjustFocus(movement * 0.18);
      lastPointerY = event.clientY;
    }

    function handlePointerEnd(event: PointerEvent) {
      if (event.pointerId !== focusPointerId) return;
      if (page.hasPointerCapture(event.pointerId)) page.releasePointerCapture(event.pointerId);
      focusPointerId = null;
      lastPointerY = null;
      if (isExperienceUnlocked && !isFocusTransitionActive) removeFocusPointerListeners();
    }

    function handleKeydown(event: KeyboardEvent) {
      if (isExperienceUnlocked || !['ArrowDown', 'PageDown', ' ', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      adjustFocus(direction * 4);
    }

    function removeFocusScrollListeners() {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeydown);
    }

    function removeFocusPointerListeners() {
      page.removeEventListener('pointermove', handlePointerMove);
      page.removeEventListener('pointerup', handlePointerEnd);
      page.removeEventListener('pointercancel', handlePointerEnd);
    }

    function handleResize() {
      afterwordLayout = null;
      if (isExperienceUnlocked) return;
      prismSceneCanvas = null;
      scheduleMicroprism(prismError);
    }

    function handlePageHide(event: PageTransitionEvent) {
      if (!event.persisted) destroyArchiveScene();
    }

    function handleContextLost(event: Event) {
      event.preventDefault();
      showDomFallback();
    }

    function handleViewfinderLoad() {
      renderMicroprism();
    }

    document.documentElement.classList.add('is-focus-locked');
    document.body.classList.add('is-focus-locked');
    window.scrollTo(0, 0);
    const runVisitorCoordinate = () => {
      const requestIdle = window.requestIdleCallback;
      if (requestIdle) {
        requestIdle(updateVisitorCoordinate, { timeout: 1500 });
      } else {
        globalThis.setTimeout(updateVisitorCoordinate, 0);
      }
    };
    if (document.readyState === 'complete') runVisitorCoordinate();
    else window.addEventListener('load', runVisitorCoordinate, { once: true });

    if (viewfinderImage.complete) renderMicroprism();
    else viewfinderImage.addEventListener('load', handleViewfinderLoad, { once: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('pagehide', handlePageHide);
    archiveCanvas.addEventListener('webglcontextlost', handleContextLost);
    window.addEventListener('wheel', handleWheel, { passive: false });
    page.addEventListener('pointerdown', handlePointerDown, { passive: true });
    page.addEventListener('pointermove', handlePointerMove, { passive: false });
    page.addEventListener('pointerup', handlePointerEnd, { passive: true });
    page.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    window.addEventListener('keydown', handleKeydown);

    setFocus(8);

    media.add('(prefers-reduced-motion: no-preference)', () => {
      // 每次媒體條件建立或重建動畫時，都先保證頁首仍由對焦畫面接管。
      setStoryViewActive(false);
      const progression = gsap.timeline({
        scrollTrigger: {
          trigger: '.obscura-story',
          start: 'top top',
          end: '+=540%',
          pin: true,
          // ScrollTrigger 只提供原始目標進度，實際相機速度由 3D 場景的阻尼曲線控制。
          // 避免這裡再次加入 scrub 秒數，否則兩層延遲會讓觸控板操作顯得黏滯。
          scrub: true,
          snap: {
            snapTo: snapToNearestStation,
            delay: 0.08,
            duration: { min: 0.2, max: 0.55 },
            ease: 'power2.out',
            inertia: false
          },
          onEnter: () => setStoryViewActive(true),
          onEnterBack: () => setStoryViewActive(true),
          onLeaveBack: () => setStoryViewActive(false),
          onUpdate: ({ progress }) => setArchiveProgress(progress)
        }
      });

      progression
        .addLabel('enter-frame', 0)
        .to('.obscura-intro', { autoAlpha: 0, y: -24, ease: 'none', duration: 0.05 }, 0)
        .to('.obscura-hud', { opacity: 0, ease: 'none', duration: 0.05 }, 0);

      const exitState = { progress: 0 };
      const exitTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: '.obscura-exit',
          start: 'top top',
          // 出口區塊保留一個 large viewport 舞台；其餘實際可捲動距離就是動畫範圍。
          end: () => `+=${Math.max(1, exit.offsetHeight - exitStage.offsetHeight)}`,
          scrub: true,
          invalidateOnRefresh: true,
          onLeave: () => setArchiveExitProgress(1)
        }
      });

      // Three.js 回傳實體紙面的螢幕投影，真正的 DOM 頁面從遠處一路貼合該範圍。
      // 相機靠近到滿版時 transform 自然回到原始版面，因此不需要切換第二套排版。
      exitTimeline
        .to(exitState, {
          progress: 1,
          duration: 1,
          ease: 'none',
          onUpdate: () => setArchiveExitProgress(exitState.progress)
        }, 0);
    });

    media.add('(prefers-reduced-motion: reduce)', () => {
      page.classList.add('reduced-motion');
      setFocus(FOCUS_POINT);
      page.style.setProperty('--story-defocus', '0.7');
      return () => {
        page.classList.remove('reduced-motion');
        page.style.removeProperty('--story-defocus');
      };
    });

    return () => {
      media.revert();
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      if (prismFrame !== null) window.cancelAnimationFrame(prismFrame);
      if (archivePauseFrame !== null) window.cancelAnimationFrame(archivePauseFrame);
      window.removeEventListener('load', runVisitorCoordinate);
      viewfinderImage.removeEventListener('load', handleViewfinderLoad);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pagehide', handlePageHide);
      archiveCanvas.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('wheel', handleWheel);
      page.removeEventListener('pointerdown', handlePointerDown);
      page.removeEventListener('pointermove', handlePointerMove);
      page.removeEventListener('pointerup', handlePointerEnd);
      page.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('keydown', handleKeydown);
      destroyArchiveScene();
      document.documentElement.classList.remove('is-focus-locked');
      document.body.classList.remove('is-focus-locked');
    };
  }, []);

  return null;
}
