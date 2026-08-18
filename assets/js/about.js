import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FOCUS_POINT = 62;
const STATION_SNAP_POINTS = [0.31, 0.58, 0.84];

export function initAboutPage() {
  const page = document.querySelector('.obscura');
  const focusReading = document.getElementById('focusReading');
  const microprismCanvas = document.getElementById('microprismCanvas');
  const viewfinderImage = document.querySelector('.obscura-image');
  const archiveCanvas = document.getElementById('archiveCanvas');
  const focusGuide = document.getElementById('focusGuide');

  if (!page || !focusReading || !microprismCanvas || !viewfinderImage || !archiveCanvas || !focusGuide) return;

  let prismFrame = null;
  let prismError = 1;
  let currentFocusValue = 8;
  let archiveProgress = 0;
  let archiveScene = null;
  let archiveLoadPromise = null;
  let isExperienceUnlocked = false;

  document.body.classList.add('is-focus-locked');
  page.classList.add('is-archive-3d');
  window.scrollTo(0, 0);

  function unlockExperience() {
    if (isExperienceUnlocked) return;
    isExperienceUnlocked = true;
    document.body.classList.remove('is-focus-locked');
    page.classList.add('is-unlocked');
    focusGuide.textContent = 'Focus locked. Keep scrolling to enter the frame.';
    gsap.fromTo('.obscura-flash', { autoAlpha: 0.95 }, { autoAlpha: 0, duration: 0.55, ease: 'power2.out' });
  }

  function loadArchiveScene() {
    if (archiveLoadPromise) return archiveLoadPromise;
    archiveLoadPromise = import('./archive_scene.js')
      .then(({ createArchiveScene }) => createArchiveScene(archiveCanvas))
      .then((scene) => {
        archiveScene = scene;
        archiveScene.setProgress(archiveProgress);
      })
      .catch((error) => {
        console.error('Unable to initialize the archive scene.', error);
      });
    return archiveLoadPromise;
  }

  function setArchiveProgress(progress) {
    archiveProgress = progress;
    page.classList.toggle('is-in-story', progress > 0.04);
    if (progress > 0.01) loadArchiveScene();
    archiveScene?.setProgress(progress);
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

  if (viewfinderImage.complete) renderMicroprism();
  else viewfinderImage.addEventListener('load', renderMicroprism, { once: true });
  window.addEventListener('resize', () => scheduleMicroprism(prismError));
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
    const progression = gsap.timeline({
      scrollTrigger: {
        trigger: '.obscura-story',
        start: 'top top',
        end: '+=650%',
        pin: true,
        scrub: 0.45,
        snap: {
          snapTo: snapToNearestStation,
          delay: 0.08,
          duration: { min: 0.2, max: 0.55 },
          ease: 'power2.out',
          inertia: false
        },
        onUpdate: ({ progress }) => setArchiveProgress(progress)
      }
    });

    progression
      .addLabel('enter-frame', 0)
      .to('.obscura-intro', { autoAlpha: 0, y: -24, ease: 'none', duration: 0.05 }, 0)
      .to('.obscura-hud', { opacity: 0, ease: 'none', duration: 0.05 }, 0)
      .set(archiveCanvas, { autoAlpha: 1 }, 0.01)
      .set('.obscura-image-wrap', { autoAlpha: 0 }, 0.02);
  });

  media.add('(prefers-reduced-motion: reduce)', () => {
    page.classList.add('reduced-motion');
    setFocus(FOCUS_POINT);
    page.style.setProperty('--story-defocus', 0.7);
    archiveCanvas.style.opacity = '0.38';
    setArchiveProgress(0.42);
    document.querySelectorAll('.obscura-panel').forEach((panel) => panel.classList.add('is-visible'));
  });
}
