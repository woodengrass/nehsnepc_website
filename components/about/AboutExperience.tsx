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

    if (
      !pageQuery ||
      !focusReadingQuery ||
      !microprismCanvasQuery ||
      !viewfinderImageQuery ||
      !imageWrapQuery ||
      !archiveCanvasQuery ||
      !focusGuideQuery ||
      !afterwordQuery
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

    let prismFrame: number | null = null;
    let prismError = 1;
    let currentFocusValue = 8;
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
      if (progress >= 0.999 && opacity >= 0.999) {
        isExitSettled = true;
        afterword.classList.add('is-exit-settled');
        afterword.style.opacity = '1';
        afterword.style.transform = 'none';
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
      archiveScene?.destroy();
      archiveScene = null;
      page.classList.remove('is-archive-3d', 'is-in-story');
      media.revert();
      setStoryViewActive(false);
    }

    function setArchiveProgress(progress: number, immediate = false) {
      archiveProgress = progress;
      page.classList.toggle('is-in-story', progress > 0.04);
      if (progress > 0.01) loadArchiveScene();
      archiveScene?.setProgress(progress, immediate);
    }

    function setArchiveExitProgress(progress: number) {
      archiveExitProgress = progress;
      archiveScene?.setExitProgress(progress);

      // 僅在故事視圖接管畫面時控制顯露比例。進度回到 0 或返回頁首後不再寫入，
      // 避免退出 ScrollTrigger 的尾端更新覆蓋 setStoryViewActive(false)。
      if (progress <= 0 || !isStoryViewActive) return;
      const rawRevealProgress = Math.max(0, Math.min(1, (progress - 0.99) / 0.01));
      const revealProgress = rawRevealProgress * rawRevealProgress * (3 - 2 * rawRevealProgress);
      gsap.set(archiveCanvas, { autoAlpha: 1 - revealProgress });
      if (progress >= 0.999) gsap.set(archiveCanvas, { autoAlpha: 0 });
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
      const bounds = microprismCanvas.getBoundingClientRect();
      const size = Math.round(bounds.width);
      if (!size || !viewfinderImage.complete) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      microprismCanvas.width = size * pixelRatio;
      microprismCanvas.height = size * pixelRatio;
      const context = microprismCanvas.getContext('2d');
      if (!context) return;
      context.scale(pixelRatio, pixelRatio);
      context.clearRect(0, 0, size, size);

      const scene = document.createElement('canvas');
      scene.width = size * pixelRatio;
      scene.height = size * pixelRatio;
      const sceneContext = scene.getContext('2d');
      if (!sceneContext) return;
      sceneContext.scale(pixelRatio, pixelRatio);

      const imageScale = Math.max(window.innerWidth / viewfinderImage.naturalWidth, window.innerHeight / viewfinderImage.naturalHeight);
      const imageWidth = viewfinderImage.naturalWidth * imageScale;
      const imageHeight = viewfinderImage.naturalHeight * imageScale;
      const imageLeft = (window.innerWidth - imageWidth) * 0.5;
      const imageTop = (window.innerHeight - imageHeight) * 0.62;
      const cropLeft = window.innerWidth / 2 - size / 2;
      const cropTop = window.innerHeight / 2 - size / 2;
      sceneContext.drawImage(viewfinderImage, imageLeft - cropLeft, imageTop - cropTop, imageWidth, imageHeight);

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
          scene,
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
      prismError = error;
      if (!prismFrame) prismFrame = window.requestAnimationFrame(renderMicroprism);
    }

    function unlockExperience() {
      if (isExperienceUnlocked) return;
      isExperienceUnlocked = true;
      isFocusTransitionActive = true;
      document.body.classList.remove('is-focus-locked');
      page.classList.add('is-unlocked');
      focusGuide.textContent = ABOUT_FOCUS_CONTENT.lockedPrompt;
      // 對焦完成後立即準備 3D 場景，避免使用者開始滑動時入口照片尚未載入。
      loadArchiveScene();
      gsap.fromTo('.obscura-flash', { autoAlpha: 0.95 }, {
        autoAlpha: 0,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: () => { isFocusTransitionActive = false; }
      });
    }

    function setFocus(value: number) {
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

    let lastTouchY: number | null = null;

    function handleTouchStart(event: TouchEvent) {
      if (!isExperienceUnlocked) lastTouchY = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      if (isExperienceUnlocked || lastTouchY === null) return;
      event.preventDefault();
      const currentTouchY = event.touches[0]?.clientY ?? lastTouchY;
      const movement = lastTouchY - currentTouchY;
      adjustFocus(movement * 0.18);
      lastTouchY = currentTouchY;
    }

    function handleTouchEnd() {
      lastTouchY = null;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (isExperienceUnlocked || !['ArrowDown', 'PageDown', ' ', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      adjustFocus(direction * 4);
    }

    function handleResize() {
      afterwordLayout = null;
      scheduleMicroprism(prismError);
    }

    function handleBeforeUnload() {
      archiveScene?.destroy();
    }

    function handleContextLost(event: Event) {
      event.preventDefault();
      showDomFallback();
    }

    function handleViewfinderLoad() {
      renderMicroprism();
    }

    document.body.classList.add('is-focus-locked');
    window.scrollTo(0, 0);
    updateVisitorCoordinate();

    if (viewfinderImage.complete) renderMicroprism();
    else viewfinderImage.addEventListener('load', handleViewfinderLoad, { once: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('beforeunload', handleBeforeUnload, { once: true });
    archiveCanvas.addEventListener('webglcontextlost', handleContextLost);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
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
          // 出口舞台使用原生 sticky；ScrollTrigger 只提供進度，不再以 pin 與 DOM transform 互相抵消。
          end: '+=220%',
          scrub: true,
          invalidateOnRefresh: true,
          onLeave: () => setArchiveExitProgress(1),
          onEnterBack: () => setArchiveExitProgress(0)
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
      if (prismFrame !== null) window.cancelAnimationFrame(prismFrame);
      viewfinderImage.removeEventListener('load', handleViewfinderLoad);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      archiveCanvas.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeydown);
      archiveScene?.destroy();
      archiveScene = null;
      document.body.classList.remove('is-focus-locked');
    };
  }, []);

  return null;
}
