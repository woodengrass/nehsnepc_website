import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  FrontSide,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer
} from 'three';

const HERO_TEXTURE_URL = new URL('../images/generated/hero-1280.webp', import.meta.url).href;
const CONTACT_TEXTURE_URL = new URL('../images/generated/contact-800.webp', import.meta.url).href;

const CAMERA_STOPS = [
  { progress: 0, x: 0, y: 0, z: 8, roll: 0, targetX: 0, targetY: 0 },
  { progress: 0.16, x: 0.08, y: -0.04, z: 0.25, roll: -0.018, targetX: 0, targetY: 0 },
  { progress: 0.275, x: 0.16, y: 0.08, z: -3.7, roll: 0.018, targetX: 0.08, targetY: 0 },
  { progress: 0.31, x: 0, y: 0.04, z: -4.1, roll: 0.008, targetX: 0, targetY: 0 },
  { progress: 0.345, x: -0.12, y: 0, z: -4.5, roll: -0.012, targetX: -0.05, targetY: 0 },
  { progress: 0.45, x: -0.38, y: -0.12, z: -9.4, roll: -0.035, targetX: -0.1, targetY: 0.04 },
  { progress: 0.545, x: -0.12, y: 0.08, z: -11.4, roll: -0.014, targetX: -0.04, targetY: 0 },
  { progress: 0.58, x: 0, y: 0.04, z: -11.8, roll: -0.008, targetX: 0, targetY: 0 },
  { progress: 0.615, x: 0.14, y: 0, z: -12.2, roll: 0.014, targetX: 0.05, targetY: 0 },
  { progress: 0.72, x: 0.42, y: 0.14, z: -17.2, roll: 0.04, targetX: 0.12, targetY: -0.04 },
  { progress: 0.805, x: 0.12, y: -0.06, z: -19.45, roll: 0.014, targetX: 0.04, targetY: 0 },
  { progress: 0.84, x: 0, y: -0.04, z: -19.8, roll: 0.008, targetX: 0, targetY: 0 },
  { progress: 0.875, x: -0.12, y: 0, z: -20.2, roll: -0.014, targetX: -0.04, targetY: 0 },
  { progress: 1, x: -0.25, y: 0.04, z: -27.2, roll: -0.025, targetX: 0, targetY: 0 }
];

const STATION_LAYOUTS = [
  {
    z: -8.1,
    textX: -1.08,
    photoX: 1.45,
    eyebrow: '01 / OBSERVE',
    heading: ['Before every frame,', 'there is a moment', 'worth noticing.'],
    body: ['We learn to notice light, timing, and the small stories', 'that would otherwise pass unnoticed.'],
    textureIndex: 0
  },
  {
    z: -15.8,
    textX: 1.24,
    photoX: -1.45,
    eyebrow: '02 / PRACTICE',
    heading: ['WE SHOOT', 'THE ORDINARY', 'TO MAKE IT NEW.'],
    body: ['EVENTS / PORTRAITS / THE ORDINARY'],
    textureIndex: 1
  },
  {
    z: -23.8,
    textX: -1.08,
    photoX: 1.45,
    eyebrow: '03 / MAKE A FRAME',
    heading: ['Come closer.', 'There is room', 'in the picture.'],
    body: ['NEHS PHOTOGRAPHY CLUB / EST. 2024'],
    textureIndex: 0
  }
];

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function interpolateCamera(progress) {
  let endIndex = CAMERA_STOPS.findIndex((stop) => stop.progress >= progress);
  if (endIndex <= 0) endIndex = 1;
  const start = CAMERA_STOPS[endIndex - 1];
  const end = CAMERA_STOPS[Math.min(endIndex, CAMERA_STOPS.length - 1)];
  const range = end.progress - start.progress || 1;
  const amount = smoothStep(MathUtils.clamp((progress - start.progress) / range, 0, 1));
  const value = (property) => MathUtils.lerp(start[property], end[property], amount);
  return {
    x: value('x'),
    y: value('y'),
    z: value('z'),
    roll: value('roll'),
    targetX: value('targetX'),
    targetY: value('targetY')
  };
}

function createPortalTexture(image) {
  const canvas = document.createElement('canvas');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.userData.image = image;
  texture.userData.canvas = canvas;
  return texture;
}

function updatePortalTexture(texture, width, height) {
  const canvas = texture.userData.canvas;
  const image = texture.userData.image;
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = (width - drawWidth) * 0.5;
  const drawY = (height - drawHeight) * 0.62;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  texture.needsUpdate = true;
}

function createPortal(texture) {
  const portal = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: texture, side: FrontSide })
  );
  portal.position.z = 1.5;
  return portal;
}

function createCropTexture(texture, cropIndex) {
  const crop = texture.clone();
  const cropWidth = cropIndex % 2 === 0 ? 0.68 : 0.55;
  const cropHeight = cropIndex % 3 === 0 ? 0.72 : 0.6;
  crop.repeat.set(cropWidth, cropHeight);
  crop.offset.set(
    MathUtils.clamp(0.08 + (cropIndex % 4) * 0.075, 0, 1 - cropWidth),
    MathUtils.clamp(0.08 + (cropIndex % 3) * 0.11, 0, 1 - cropHeight)
  );
  crop.needsUpdate = true;
  return crop;
}

function createLabelTexture(frameNumber) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 112;
  const context = canvas.getContext('2d');
  context.fillStyle = '#dedbd2';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#151515';
  context.font = '24px Arial, sans-serif';
  context.letterSpacing = '6px';
  context.fillText(`NEPC / FRAME ${String(frameNumber).padStart(2, '0')}`, 36, 70);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createPhotoCard(texture, frameNumber, width, height) {
  const group = new Group();
  const border = 0.16;
  const labelHeight = 0.42;
  const paper = new Mesh(
    new PlaneGeometry(width + border * 2, height + border + labelHeight),
    new MeshBasicMaterial({ color: 0xdedbd2, transparent: true, side: DoubleSide })
  );
  group.add(paper);

  const photo = new Mesh(
    new PlaneGeometry(width, height),
    new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide })
  );
  photo.position.set(0, labelHeight * 0.35, 0.018);
  group.add(photo);

  const labelTexture = createLabelTexture(frameNumber);
  const label = new Mesh(
    new PlaneGeometry(width, 0.24),
    new MeshBasicMaterial({ map: labelTexture, transparent: true, side: DoubleSide })
  );
  label.position.set(0, -height / 2 - 0.19, 0.02);
  group.add(label);
  group.userData.disposableTextures = [texture, labelTexture];
  return group;
}

function createTunnelPhotoCard(sourceTexture, frameNumber, width, height, cropIndex) {
  const frameWidth = width + 0.24;
  const frameHeight = height + 0.42;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.max(160, Math.round(canvas.width * frameHeight / frameWidth));
  const context = canvas.getContext('2d');
  context.fillStyle = '#dedbd2';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const inset = 16;
  const labelHeight = Math.max(34, Math.round(canvas.height * 0.18));
  const photoWidth = canvas.width - inset * 2;
  const photoHeight = canvas.height - inset * 2 - labelHeight;
  const image = sourceTexture.image;
  const cropWidth = cropIndex % 2 === 0 ? 0.68 : 0.55;
  const cropHeight = cropIndex % 3 === 0 ? 0.72 : 0.6;
  let sourceX = Math.min(0.08 + (cropIndex % 4) * 0.075, 1 - cropWidth) * image.width;
  let sourceY = Math.min(0.08 + (cropIndex % 3) * 0.11, 1 - cropHeight) * image.height;
  let sourceWidth = cropWidth * image.width;
  let sourceHeight = cropHeight * image.height;
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = photoWidth / photoHeight;
  if (sourceAspect > targetAspect) {
    const nextWidth = sourceHeight * targetAspect;
    sourceX += (sourceWidth - nextWidth) * 0.5;
    sourceWidth = nextWidth;
  } else {
    const nextHeight = sourceWidth / targetAspect;
    sourceY += (sourceHeight - nextHeight) * 0.5;
    sourceHeight = nextHeight;
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, inset, inset, photoWidth, photoHeight);
  context.fillStyle = '#171717';
  context.font = '10px Arial, sans-serif';
  context.letterSpacing = '2px';
  context.fillText(`NEPC / FRAME ${String(frameNumber).padStart(2, '0')}`, inset, canvas.height - 15);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const card = new Mesh(
    new PlaneGeometry(frameWidth, frameHeight),
    new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide })
  );
  card.userData.disposableTextures = [texture];
  return card;
}

function createTextPanel(layout) {
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = 1100;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(255, 255, 255, 0.58)';
  context.font = '30px Arial, sans-serif';
  context.letterSpacing = '9px';
  context.fillText(layout.eyebrow, 90, 110);
  context.fillStyle = '#f5f3ed';
  context.font = '104px Georgia, serif';
  layout.heading.forEach((line, index) => context.fillText(line, 90, 285 + index * 122));
  context.fillStyle = 'rgba(255, 255, 255, 0.68)';
  context.font = '27px Arial, sans-serif';
  context.letterSpacing = '2px';
  layout.body.forEach((line, index) => context.fillText(line, 94, 800 + index * 48));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const panel = new Mesh(
    new PlaneGeometry(2.82, 1.723),
    new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: DoubleSide })
  );
  panel.position.set(layout.textX, 0.05, 0);
  panel.userData.disposableTextures = [texture];
  return panel;
}

function setObjectOpacity(object, opacity) {
  if (Math.abs((object.userData.renderOpacity ?? -1) - opacity) < 0.004) return;
  object.userData.renderOpacity = opacity;
  object.traverse((child) => {
    if (!child.material) return;
    child.material.opacity = opacity;
    child.material.depthWrite = opacity > 0.9;
  });
}

function createStation(layout, textures, stationIndex, isMobile) {
  const station = new Group();
  station.position.z = layout.z;
  const textPanel = createTextPanel(layout);
  const mainTexture = createCropTexture(textures[layout.textureIndex], stationIndex + 1);
  const mainPhoto = createPhotoCard(mainTexture, stationIndex * 5 + 1, 1.58, 1.22);
  mainPhoto.position.set(layout.photoX, -0.02, 0);
  mainPhoto.rotation.y = layout.photoX > 0 ? -0.08 : 0.08;
  station.add(textPanel, mainPhoto);

  const satellites = [
    { x: -2.75, y: 1.45, z: -0.65, width: 0.72, height: 0.52, rotation: -0.12 },
    { x: 2.72, y: 1.35, z: -0.9, width: 0.62, height: 0.82, rotation: 0.1 },
    { x: -2.62, y: -1.42, z: 0.3, width: 0.55, height: 0.72, rotation: 0.08 },
    { x: 2.68, y: -1.38, z: -0.35, width: 0.75, height: 0.5, rotation: -0.08 }
  ];
  satellites.slice(0, isMobile ? 2 : satellites.length).forEach((item, index) => {
    const textureIndex = (layout.textureIndex + index + 1) % textures.length;
    const cropTexture = createCropTexture(textures[textureIndex], stationIndex * 4 + index + 3);
    const photo = createPhotoCard(cropTexture, stationIndex * 5 + index + 2, item.width, item.height);
    photo.position.set(item.x, item.y, item.z);
    photo.rotation.z = item.rotation;
    photo.userData.driftSeed = stationIndex * 7 + index;
    station.add(photo);
  });

  station.userData.baseChildren = station.children.map((child) => ({
    object: child,
    x: child.position.x,
    y: child.position.y,
    rotationZ: child.rotation.z
  }));
  return station;
}

function createTunnelGallery(textures, isMobile) {
  const gallery = new Group();
  const photoCount = isMobile ? 18 : 36;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < photoCount; index += 1) {
    const width = 0.32 + seededRandom(index + 101) * 0.46;
    const height = 0.38 + seededRandom(index + 111) * 0.5;
    const texture = textures[index % textures.length];
    const photo = createTunnelPhotoCard(texture, index + 16, width, height, index + 17);
    const angle = index * goldenAngle + (seededRandom(index + 121) - 0.5) * 0.42;
    const radius = (isMobile ? 1.35 : 2.45) + seededRandom(index + 131) * (isMobile ? 0.65 : 1.25);
    const verticalScale = isMobile ? 0.92 : 0.76;
    const baseX = Math.cos(angle) * radius;
    const baseY = Math.sin(angle) * radius * verticalScale;
    const baseZ = -2.3 - index * (28 / photoCount) - seededRandom(index + 141) * 0.45;
    photo.position.set(baseX, baseY, baseZ);
    photo.rotation.set(
      Math.sin(angle) * 0.16 + (seededRandom(index + 151) - 0.5) * 0.08,
      -Math.cos(angle) * 0.22 + (seededRandom(index + 161) - 0.5) * 0.08,
      Math.sin(angle + 0.7) * 0.18 + (seededRandom(index + 171) - 0.5) * 0.12
    );
    photo.userData.tunnelBase = {
      angle,
      radius,
      verticalScale,
      rotationX: photo.rotation.x,
      rotationY: photo.rotation.y,
      rotationZ: photo.rotation.z,
      speed: 0.16 + seededRandom(index + 181) * 0.22
    };
    gallery.add(photo);
  }
  return gallery;
}

function createDustField(isMobile) {
  const pointCount = isMobile ? 120 : 320;
  const positions = [];
  for (let index = 0; index < pointCount; index += 1) {
    positions.push(
      (seededRandom(index + 201) - 0.5) * (isMobile ? 5.5 : 9),
      (seededRandom(index + 211) - 0.5) * 6,
      -1 - seededRandom(index + 221) * 31
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return new Points(
    geometry,
    new PointsMaterial({
      color: 0xd9d4c8,
      size: isMobile ? 0.022 : 0.018,
      opacity: 0.28,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true
    })
  );
}

function seededRandom(seed) {
  const value = Math.sin(seed * 9283.17) * 43758.5453;
  return value - Math.floor(value);
}

export async function createArchiveScene(canvas) {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const renderer = new WebGLRenderer({
    canvas,
    alpha: false,
    antialias: !isMobile,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.2 : 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x070808, 1);

  const scene = new Scene();
  scene.fog = new FogExp2(0x070808, isMobile ? 0.082 : 0.068);
  const camera = new PerspectiveCamera(isMobile ? 55 : 46, 1, 0.1, 70);
  camera.position.set(0, 0, 8);

  const textureLoader = new TextureLoader();
  const textures = await Promise.all([
    textureLoader.loadAsync(HERO_TEXTURE_URL),
    textureLoader.loadAsync(CONTACT_TEXTURE_URL)
  ]);
  textures.forEach((texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  });

  const portalTexture = createPortalTexture(textures[0].image);
  const portal = createPortal(portalTexture);
  scene.add(portal);

  const stations = STATION_LAYOUTS.map((layout, index) => {
    const responsiveLayout = {
      ...layout,
      textX: isMobile ? layout.textX * 0.56 : layout.textX,
      photoX: isMobile ? layout.photoX * 0.56 : layout.photoX
    };
    const station = createStation(responsiveLayout, textures, index, isMobile);
    if (isMobile) {
      station.scale.setScalar(0.68);
      station.children[0].position.set(0, 0.82, 0);
      station.children[1].position.set(0, -0.72, 0);
      station.children.slice(2).forEach((photo, photoIndex) => {
        const direction = photoIndex % 2 === 0 ? -1 : 1;
        photo.position.set(direction * 1.38, -1.52, -0.65);
      });
      station.userData.baseChildren = station.children.map((child) => ({
        object: child,
        x: child.position.x,
        y: child.position.y,
        rotationZ: child.rotation.z
      }));
    }
    scene.add(station);
    return station;
  });

  const tunnelGallery = createTunnelGallery(textures, isMobile);
  const dustField = createDustField(isMobile);
  scene.add(tunnelGallery, dustField);

  const fragmentCount = isMobile ? 22 : 84;
  const fragments = new InstancedMesh(
    new PlaneGeometry(0.09, 0.065),
    new MeshBasicMaterial({
      color: 0xc8c4ba,
      opacity: 0.18,
      transparent: true,
      wireframe: true,
      depthWrite: false,
      side: DoubleSide
    }),
    fragmentCount
  );
  const fragmentTransform = new Object3D();
  const fragmentStates = [];
  for (let index = 0; index < fragmentCount; index += 1) {
    const state = {
      x: (seededRandom(index + 1) - 0.5) * (isMobile ? 5 : 8),
      y: (seededRandom(index + 11) - 0.5) * 5,
      z: -1 - seededRandom(index + 21) * 29,
      rotationX: seededRandom(index + 31) * Math.PI,
      rotationY: seededRandom(index + 41) * Math.PI,
      rotationZ: seededRandom(index + 51) * Math.PI,
      speed: 0.2 + seededRandom(index + 61) * 0.35
    };
    fragmentStates.push(state);
  }
  scene.add(fragments);

  let progress = 0;
  let disposed = false;
  let animationFrame = null;

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updatePortalTexture(portalTexture, width, height);
    const portalHeight = 2 * (8 - portal.position.z) * Math.tan(MathUtils.degToRad(camera.fov / 2));
    portal.scale.set(portalHeight * camera.aspect, portalHeight, 1);
  }

  function render(time = performance.now()) {
    if (disposed) return;
    const seconds = time * 0.001;
    const cameraState = interpolateCamera(progress);
    camera.position.set(cameraState.x, cameraState.y, cameraState.z);
    camera.lookAt(cameraState.targetX, cameraState.targetY, cameraState.z - 6);
    camera.rotation.z += cameraState.roll;
    portal.visible = camera.position.z > portal.position.z + 0.03;

    stations.forEach((station, stationIndex) => {
      const idealCameraZ = station.position.z + 4;
      const distance = Math.abs(camera.position.z - idealCameraZ);
      const opacity = smoothStep(1 - MathUtils.clamp((distance - 0.6) / 5.5, 0, 1));
      setObjectOpacity(station, opacity);
      station.userData.baseChildren.forEach((item, childIndex) => {
        const amplitude = childIndex < 2 ? 0.012 : 0.035;
        item.object.position.x = item.x + Math.sin(seconds * 0.32 + stationIndex + childIndex) * amplitude;
        item.object.position.y = item.y + Math.cos(seconds * 0.27 + stationIndex * 1.7 + childIndex) * amplitude;
        item.object.rotation.z = item.rotationZ + Math.sin(seconds * 0.2 + childIndex) * amplitude * 0.22;
      });
    });

    tunnelGallery.children.forEach((photo, index) => {
      const base = photo.userData.tunnelBase;
      const angle = base.angle + Math.sin(seconds * base.speed + index) * 0.026;
      photo.position.x = Math.cos(angle) * base.radius;
      photo.position.y = Math.sin(angle) * base.radius * base.verticalScale;
      photo.rotation.x = base.rotationX + Math.sin(seconds * base.speed * 0.62 + index) * 0.012;
      photo.rotation.y = base.rotationY + Math.cos(seconds * base.speed * 0.55 + index) * 0.016;
      photo.rotation.z = base.rotationZ + Math.sin(seconds * base.speed * 0.48 + index) * 0.01;
    });
    const nearestStationDistance = Math.min(...stations.map((station) => (
      Math.abs(camera.position.z - (station.position.z + 4))
    )));
    const tunnelOpacity = smoothStep(MathUtils.clamp((nearestStationDistance - 0.65) / 2.6, 0, 1));
    setObjectOpacity(tunnelGallery, tunnelOpacity);
    dustField.rotation.z = Math.sin(seconds * 0.055) * 0.035;
    dustField.position.y = Math.sin(seconds * 0.11) * 0.05;

    fragmentStates.forEach((state, index) => {
      fragmentTransform.position.set(
        state.x + Math.sin(seconds * state.speed + index) * 0.12,
        state.y + Math.cos(seconds * state.speed * 0.8 + index) * 0.1,
        state.z
      );
      fragmentTransform.rotation.set(
        state.rotationX + seconds * state.speed * 0.2,
        state.rotationY + seconds * state.speed * 0.28,
        state.rotationZ + seconds * state.speed * 0.16
      );
      fragmentTransform.updateMatrix();
      fragments.setMatrixAt(index, fragmentTransform.matrix);
    });
    fragments.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function animate(time) {
    if (disposed) return;
    render(time);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function setProgress(nextProgress) {
    progress = MathUtils.clamp(nextProgress, 0, 1);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  animationFrame = window.requestAnimationFrame(animate);

  return {
    setProgress,
    destroy() {
      disposed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
        object.userData.disposableTextures?.forEach((texture) => texture.dispose());
      });
      portalTexture.dispose();
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    }
  };
}
