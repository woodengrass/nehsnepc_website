import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FOCUS_POINT = 62;
const STATION_SNAP_POINTS = [0.325, 0.595, 0.855];

export function initAboutPage() {
  const page = document.querySelector('.obscura');
  const focusReading = document.getElementById('focusReading');
  const microprismCanvas = document.getElementById('microprismCanvas');
  const viewfinderImage = document.querySelector('.obscura-image');
  const imageWrap = document.querySelector('.obscura-image-wrap');
  const archiveCanvas = document.getElementById('archiveCanvas');
  const focusGuide = document.getElementById('focusGuide');
  const afterword = document.querySelector('.obscura-afterword');

  if (!page || !focusReading || !microprismCanvas || !viewfinderImage || !imageWrap || !archiveCanvas || !focusGuide || !afterword) return;

  let prismFrame = null;
  let prismError = 1;
  let currentFocusValue = 8;
  let archiveProgress = 0;
  let archiveExitProgress = 0;
  let archiveScene = null;
  let archiveLoadPromise = null;
  let isExperienceUnlocked = false;
  let isStoryViewActive = false;
  let afterwordLayout = null;

  function resetAfterwordProjection() {
    afterword.classList.remove('is-projecting', 'is-projection-interactive');
    afterword.style.removeProperty('opacity');
    afterword.style.removeProperty('transform');
  }

  function projectAfterword({ left, top, width, height, opacity, progress }) {
    if (opacity <= 0 || progress <= 0) {
      resetAfterwordProjection();
      return;
    }

    if (!afterwordLayout) {
      afterwordLayout = {
        left: afterword.offsetLeft,
        top: afterword.offsetTop,
        width: afterword.offsetWidth,
        height: afterword.offsetHeight
      };
    }
    const naturalLeft = afterwordLayout.left - window.scrollX;
    const naturalTop = afterwordLayout.top - window.scrollY;
    const scaleX = width / afterwordLayout.width;
    const scaleY = height / afterwordLayout.height;
    afterword.classList.add('is-projecting');
    afterword.classList.toggle('is-projection-interactive', progress >= 0.99);
    afterword.style.opacity = String(opacity);
    afterword.style.transform = `translate3d(${left - naturalLeft}px, ${top - naturalTop}px, 0) scale(${scaleX}, ${scaleY})`;
  }

  document.body.classList.add('is-focus-locked');
  page.classList.add('is-archive-3d');
  window.scrollTo(0, 0);

  function unlockExperience() {
    if (isExperienceUnlocked) return;
    isExperienceUnlocked = true;
    document.body.classList.remove('is-focus-locked');
    page.classList.add('is-unlocked');
    focusGuide.textContent = 'Focus locked. Keep scrolling to enter the frame.';
    // 對焦完成後立即準備 3D 場景，避免使用者開始滑動時入口照片尚未載入。
    loadArchiveScene();
    gsap.fromTo('.obscura-flash', { autoAlpha: 0.95 }, { autoAlpha: 0, duration: 0.55, ease: 'power2.out' });
  }

  function loadArchiveScene() {
    if (archiveLoadPromise) return archiveLoadPromise;
    archiveLoadPromise = import('./archive_scene.js')
      .then(({ createArchiveScene }) => createArchiveScene(archiveCanvas, projectAfterword))
      .then((scene) => {
        archiveScene = scene;
        archiveScene.setProgress(archiveProgress, page.classList.contains('reduced-motion'));
        archiveScene.setExitProgress(archiveExitProgress);
      })
      .catch((error) => {
        console.error('Unable to initialize the archive scene.', error);
      });
    return archiveLoadPromise;
  }

  function setArchiveProgress(progress, immediate = false) {
    archiveProgress = progress;
    page.classList.toggle('is-in-story', progress > 0.04);
    if (progress > 0.01) loadArchiveScene();
    archiveScene?.setProgress(progress, immediate);
  }

  function setArchiveExitProgress(progress) {
    archiveExitProgress = progress;
    archiveScene?.setExitProgress(progress);

    // 僅在故事視圖接管畫面時控制顯露比例。進度回到 0 或返回頁首後不再寫入，
    // 避免退出 ScrollTrigger 的尾端更新覆蓋 setStoryViewActive(false)。
    if (progress <= 0 || !isStoryViewActive) return;
    const rawRevealProgress = Math.max(0, Math.min(1, (progress - 0.99) / 0.01));
    const revealProgress = rawRevealProgress * rawRevealProgress * (3 - 2 * rawRevealProgress);
    gsap.set(archiveCanvas, { autoAlpha: 1 - revealProgress });
  }

  function focusDistanceValue(value) {
    const normalizedValue = value / 100;
    if (normalizedValue >= 0.97) return Number.POSITIVE_INFINITY;
    return 0.45 / Math.pow(1 - normalizedValue, 1.54);
  }

  function focusDistance(value) {
    const distance = focusDistanceValue(value);
    if (!Number.isFinite(distance)) return '\u221e';
    if (distance < 1) return distance.toFixed(2);
    return distance < 10 ? distance.toFixed(1) : String(Math.round(distance));
  }

  function focusSensitivity(value) {
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
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, size, size);

    const scene = document.createElement('canvas');
    scene.width = size * pixelRatio;
    scene.height = size * pixelRatio;
    const sceneContext = scene.getContext('2d');
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

  function scheduleMicroprism(error) {
    prismError = error;
    if (!prismFrame) prismFrame = window.requestAnimationFrame(renderMicroprism);
  }

  function setFocus(value) {
    const valueInRange = Math.max(0, Math.min(100, Number(value)));
    currentFocusValue = valueInRange;
    const sideRange = valueInRange < FOCUS_POINT ? FOCUS_POINT : 100 - FOCUS_POINT;
    const signedError = (valueInRange - FOCUS_POINT) / sideRange;
    const focusError = Math.min(1, Math.abs(signedError));
    const opticalFocus = 1 - focusError;
    const distance = focusDistance(valueInRange);
    const isFocused = Math.abs(valueInRange - FOCUS_POINT) <= 0.8;

    page.style.setProperty('--focus', opticalFocus);
    page.style.setProperty('--focus-error', focusError);
    page.style.setProperty('--split-offset', `${signedError * 18}px`);
    focusReading.textContent = distance === '\u221e' ? distance : `${distance}m`;
    page.classList.toggle('is-focused', isFocused);
    if (isFocused) unlockExperience();
    scheduleMicroprism(focusError);
  }

  function adjustFocus(amount) {
    const nextValue = currentFocusValue + amount * focusSensitivity(currentFocusValue);
    const crossesFocus = (currentFocusValue - FOCUS_POINT) * (nextValue - FOCUS_POINT) <= 0;
    if (crossesFocus || Math.abs(nextValue - FOCUS_POINT) <= 1.1) {
      setFocus(FOCUS_POINT);
      return;
    }
    setFocus(nextValue);
  }

  function snapToNearestStation(progress) {
    const nearest = STATION_SNAP_POINTS.reduce((closest, point) => (
      Math.abs(point - progress) < Math.abs(closest - progress) ? point : closest
    ));
    return Math.abs(nearest - progress) <= 0.055 ? nearest : progress;
  }

  function setStoryViewActive(isActive) {
    // 3D canvas 不可放在 timeline 的時間 0 使用 .set()：GSAP 建立時間軸時會立即
    // 套用零時刻狀態，導致使用者尚未捲動，載入完成的 canvas 就蓋掉對焦畫面。
    // 改由 ScrollTrigger 的進出事件切換，讓初始、進入故事及返回頂部都有明確狀態。
    isStoryViewActive = isActive;
    gsap.set(archiveCanvas, { autoAlpha: isActive ? 1 : 0 });
    gsap.set(imageWrap, { autoAlpha: isActive ? 0 : 1 });
    if (!isActive) resetAfterwordProjection();
  }

  if (viewfinderImage.complete) renderMicroprism();
  else viewfinderImage.addEventListener('load', renderMicroprism, { once: true });
  window.addEventListener('resize', () => {
    afterwordLayout = null;
    scheduleMicroprism(prismError);
  });
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadArchiveScene, { timeout: 1500 });
  else window.setTimeout(loadArchiveScene, 500);
  window.addEventListener('beforeunload', () => archiveScene?.destroy(), { once: true });

  setFocus(8);
  window.addEventListener('wheel', (event) => {
    if (isExperienceUnlocked) return;
    event.preventDefault();
    adjustFocus(event.deltaY * 0.03);
  }, { passive: false });
  let lastTouchY = null;
  window.addEventListener('touchstart', (event) => {
    if (!isExperienceUnlocked) lastTouchY = event.touches[0]?.clientY ?? null;
  }, { passive: true });
  window.addEventListener('touchmove', (event) => {
    if (isExperienceUnlocked || lastTouchY === null) return;
    event.preventDefault();
    const currentTouchY = event.touches[0]?.clientY ?? lastTouchY;
    const movement = lastTouchY - currentTouchY;
    adjustFocus(movement * 0.14);
    lastTouchY = currentTouchY;
  }, { passive: false });
  window.addEventListener('touchend', () => { lastTouchY = null; }, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (isExperienceUnlocked || !['ArrowDown', 'PageDown', ' ', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    adjustFocus(direction * 3);
  });

  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    // 每次媒體條件建立或重建動畫時，都先保證頁首仍由對焦畫面接管。
    setStoryViewActive(false);
    const progression = gsap.timeline({
      scrollTrigger: {
        trigger: '.obscura-story',
        start: 'top top',
        end: '+=650%',
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
        trigger: '.obscura-afterword',
        start: 'top bottom',
        // 總出口距離為 220% 視窗高度，讓碎片增加、匯聚與相機推進都有完整節奏。
        end: 'top -120%',
        scrub: 0.55
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
    page.style.setProperty('--story-defocus', 0.7);
    archiveCanvas.style.opacity = '0.38';
    setArchiveProgress(0.42, true);
    document.querySelectorAll('.obscura-panel').forEach((panel) => panel.classList.add('is-visible'));
  });
}
