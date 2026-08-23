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
const CAMERA_PROGRESS_STIFFNESS = 90;
const CAMERA_PROGRESS_DAMPING = 19;
const EXIT_CORNER_Z = -35;
const EXIT_PAGE_X = -12;
const EXIT_TURN_END = 0.48;
const EXIT_PAGE_REVEAL_START = 0.78;
const EXIT_PAGE_REVEAL_END = 0.86;
const EXIT_PAGE_DESKTOP_HEIGHT = 6.6;
const EXIT_PAGE_MOBILE_HEIGHT = 8;
const EXIT_PAGE_DESKTOP_ASPECT = 1.6;
const EXIT_PAGE_MOBILE_ASPECT = 780 / 1600;

const CAMERA_STOPS = [
  { progress: 0, x: 0, y: 0, z: 8, roll: 0, targetX: 0, targetY: 0 },
  { progress: 0.16, x: 0.08, y: -0.04, z: 0.25, roll: -0.018, targetX: 0, targetY: 0 },
  { progress: 0.29, x: 0.16, y: 0.08, z: -4.05, roll: 0.018, targetX: 0.08, targetY: 0 },
  { progress: 0.325, x: 0, y: 0.04, z: -4.45, roll: 0.008, targetX: 0, targetY: 0 },
  { progress: 0.36, x: -0.12, y: 0, z: -4.8, roll: -0.012, targetX: -0.05, targetY: 0 },
  { progress: 0.45, x: -0.38, y: -0.12, z: -9.4, roll: -0.035, targetX: -0.1, targetY: 0.04 },
  { progress: 0.56, x: -0.12, y: 0.08, z: -11.75, roll: -0.014, targetX: -0.04, targetY: 0 },
  { progress: 0.595, x: 0, y: 0.04, z: -12.15, roll: -0.008, targetX: 0, targetY: 0 },
  { progress: 0.63, x: 0.14, y: 0, z: -12.55, roll: 0.014, targetX: 0.05, targetY: 0 },
  { progress: 0.72, x: 0.42, y: 0.14, z: -17.2, roll: 0.04, targetX: 0.12, targetY: -0.04 },
  { progress: 0.82, x: 0.12, y: -0.06, z: -19.8, roll: 0.014, targetX: 0.04, targetY: 0 },
  { progress: 0.855, x: 0, y: -0.04, z: -20.15, roll: 0.008, targetX: 0, targetY: 0 },
  { progress: 0.89, x: -0.12, y: 0, z: -20.55, roll: -0.014, targetX: -0.04, targetY: 0 },
  { progress: 1, x: -0.25, y: 0.04, z: -27.2, roll: -0.025, targetX: 0, targetY: 0 }
];

const STATION_LAYOUTS = [
  {
    z: -8.1,
    textX: -1.24,
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
    textX: -1.24,
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

function createExitPage(isMobile) {
  const canvas = document.createElement('canvas');
  canvas.width = isMobile ? 780 : 1600;
  canvas.height = isMobile ? 1600 : 1000;
  const context = canvas.getContext('2d');
  context.fillStyle = '#d8d3c8';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 3D 牆面使用與 DOM 第四頁相同的紙張、編號與標題，靠近到滿版後才能無縫交接。
  context.strokeStyle = 'rgba(25, 24, 21, 0.09)';
  context.lineWidth = 1;
  for (let y = 0; y < canvas.height; y += 7) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const frameX = isMobile ? 72 : 120;
  const frameY = isMobile ? 100 : 205;
  const frameWidth = isMobile ? 300 : 300;
  const frameHeight = isMobile ? 390 : 500;
  context.strokeStyle = 'rgba(25, 24, 21, 0.55)';
  context.strokeRect(frameX, frameY, frameWidth, frameHeight);
  context.fillStyle = '#191815';
  context.font = `${isMobile ? 124 : 150}px Georgia, serif`;
  context.fillText('04', frameX + 42, frameY + 145);
  context.font = '16px Arial, sans-serif';
  context.letterSpacing = '4px';
  context.fillText('NEPC / OPEN FRAME', frameX + 42, frameY + frameHeight - 42);

  const copyX = isMobile ? 72 : 650;
  const copyY = isMobile ? 650 : 195;
  context.fillStyle = 'rgba(25, 24, 21, 0.58)';
  context.font = '17px Arial, sans-serif';
  context.letterSpacing = '5px';
  context.fillText('04 / STEP INTO THE FRAME', copyX, copyY);
  context.fillStyle = '#191815';
  context.font = `${isMobile ? 140 : 128}px "Cormorant Garamond", Georgia, serif`;
  const titleLines = ['THE NEXT', 'FRAME', 'IS YOURS.'];
  titleLines.forEach((line, index) => {
    context.fillText(line, copyX, copyY + (isMobile ? 165 : 120) + index * (isMobile ? 136 : 95));
  });
  context.font = `${isMobile ? 23 : 21}px Arial, sans-serif`;
  context.letterSpacing = '1px';
  const bodyLines = isMobile
    ? ['Bring your point of view. We will help you', 'turn it into a photograph worth keeping.']
    : ['Bring your point of view. We will help you turn it into a photograph', 'worth keeping.'];
  bodyLines.forEach((line, index) => {
    context.fillText(line, copyX, copyY + (isMobile ? 650 : 380) + index * (isMobile ? 42 : 40));
  });
  context.font = '16px Arial, sans-serif';
  context.letterSpacing = '4px';
  context.fillText('JOIN THE CLUB   /   VIEW OUR WORK', copyX, copyY + (isMobile ? 820 : 505));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const page = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({
      map: texture,
      opacity: 0,
      transparent: true,
      depthWrite: false,
      fog: false,
      side: DoubleSide
    })
  );
  page.position.set(EXIT_PAGE_X, 0, EXIT_CORNER_Z);
  page.rotation.y = Math.PI / 2;
  page.visible = false;
  page.userData.aspect = canvas.width / canvas.height;
  page.userData.disposableTextures = [texture];
  return page;
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
    new MeshBasicMaterial({ color: 0xdedbd2, transparent: true, fog: false, side: DoubleSide })
  );
  group.add(paper);

  const photo = new Mesh(
    new PlaneGeometry(width, height),
    new MeshBasicMaterial({ map: texture, transparent: true, fog: false, side: DoubleSide })
  );
  photo.position.set(0, labelHeight * 0.35, 0.018);
  group.add(photo);

  const labelTexture = createLabelTexture(frameNumber);
  const label = new Mesh(
    new PlaneGeometry(width, 0.24),
    new MeshBasicMaterial({ map: labelTexture, transparent: true, fog: false, side: DoubleSide })
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
    new MeshBasicMaterial({ map: texture, transparent: true, fog: false, side: DoubleSide })
  );
  card.userData.disposableTextures = [texture];
  return card;
}

function createTextPanel(layout, isMobile) {
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = 1100;
  const context = canvas.getContext('2d');
  const leftPadding = 90;
  let textX = leftPadding;

  // 桌面左側文字站的照片位於右方。先量出最長標題，再平移整個左對齊文字塊，
  // 讓標題右緣與照片的距離等同第二站。手機採上下排列，不套用水平間距校正。
  if (!isMobile && layout.photoX > 0) {
    context.font = '104px Georgia, serif';
    const longestHeading = Math.max(...layout.heading.map((line) => context.measureText(line).width));
    textX = canvas.width - leftPadding - longestHeading;
  }
  context.fillStyle = 'rgba(255, 255, 255, 0.58)';
  context.font = '30px Arial, sans-serif';
  context.letterSpacing = '9px';
  context.fillText(layout.eyebrow, textX, 110);
  context.fillStyle = '#f5f3ed';
  context.font = '104px Georgia, serif';
  layout.heading.forEach((line, index) => context.fillText(line, textX, 285 + index * 122));
  context.fillStyle = 'rgba(255, 255, 255, 0.68)';
  context.font = '27px Arial, sans-serif';
  context.letterSpacing = '2px';
  layout.body.forEach((line, index) => context.fillText(line, textX + 4, 800 + index * 48));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const panel = new Mesh(
    new PlaneGeometry(2.82, 1.723),
    new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      side: DoubleSide
    })
  );
  panel.position.set(layout.textX, 0.05, 0);
  panel.renderOrder = 4;
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
  const textPanel = createTextPanel(layout, isMobile);
  const mainTexture = createCropTexture(textures[layout.textureIndex], stationIndex + 1);
  const mainPhoto = createPhotoCard(mainTexture, stationIndex * 5 + 1, 1.58, 1.22);
  mainPhoto.position.set(layout.photoX, -0.02, 0);
  mainPhoto.rotation.y = layout.photoX > 0 ? -0.08 : 0.08;

  // 周邊照片不淡出後可能在透視上穿過主內容，因此主照片停用深度測試並提高繪製順序。
  // 這只改變前後遮擋關係，不會隱藏或降低任何隧道照片與粒子的透明度。
  mainPhoto.traverse((child) => {
    if (!child.material) return;
    child.material.depthTest = false;
    child.renderOrder = 3;
  });
  station.add(textPanel, mainPhoto);

  const satellites = [
    { x: -2.75, y: 1.45, z: -0.65, width: 0.72, height: 0.52, rotation: -0.12 },
    { x: 2.72, y: 1.35, z: -0.9, width: 0.62, height: 0.82, rotation: 0.1 },
    { x: -2.62, y: -1.42, z: 0.3, width: 0.55, height: 0.72, rotation: 0.08 },
    { x: 2.68, y: -1.38, z: -0.35, width: 0.75, height: 0.5, rotation: -0.08 }
  ];
  // 手機畫面較窄，不配置固定衛星照片，避免透視移動時壓到標題與主照片。
  satellites.slice(0, isMobile ? 0 : satellites.length).forEach((item, index) => {
    const textureIndex = (layout.textureIndex + index + 1) % textures.length;
    const cropTexture = createCropTexture(textures[textureIndex], stationIndex * 4 + index + 3);
    const photo = createPhotoCard(cropTexture, stationIndex * 5 + index + 2, item.width, item.height);
    photo.position.set(item.x, item.y, item.z);
    photo.rotation.z = item.rotation;
    // 周邊照片只作為空間線索，縮小後避免在觀看點壓過主標題與主照片。
    photo.scale.setScalar(0.65);
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
  const photoCount = isMobile ? 10 : 28;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < photoCount; index += 1) {
    const mobileScale = isMobile ? 0.75 : 1;
    const width = (0.18 + seededRandom(index + 101) * 0.28) * mobileScale;
    const height = (0.22 + seededRandom(index + 111) * 0.3) * mobileScale;
    const texture = textures[index % textures.length];
    const photo = createTunnelPhotoCard(texture, index + 16, width, height, index + 17);
    const angle = index * goldenAngle + (seededRandom(index + 121) - 0.5) * 0.42;
    // 周邊照片全程維持不透明，因此以較大的環形半徑留出中央閱讀軸，
    // 而不是在每個章節靠淡出清空畫面。手機半徑也獨立放大以避免遮住垂直文字。
    const radius = 3.15 + seededRandom(index + 131) * 1.4;
    const verticalScale = isMobile ? 0.98 : 0.82;
    // 手機使用左右側廊分布，避免圓環的近零 X 分量讓照片穿過中央閱讀軸。
    const baseX = isMobile
      ? (index % 2 === 0 ? -1 : 1) * (3.8 + seededRandom(index + 131) * 1.2)
      : Math.cos(angle) * radius;
    const baseY = isMobile
      ? (seededRandom(index + 136) - 0.5) * 5.5
      : Math.sin(angle) * radius * verticalScale;
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
      x: baseX,
      y: baseY,
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
  const pointCount = isMobile ? 100 : 260;
  const exitPointCount = isMobile ? 70 : 160;
  const positions = [];
  for (let index = 0; index < pointCount; index += 1) {
    positions.push(
      (seededRandom(index + 201) - 0.5) * (isMobile ? 5.5 : 9),
      (seededRandom(index + 211) - 0.5) * 6,
      -1 - seededRandom(index + 221) * 31
    );
  }

  // 隧道末端的粒子沿 Z 軸繼續向前，並隨深度逐步向左彎曲。
  // 相機左轉時，近粒子會比遠粒子移動更快，直接提供轉角後空間仍在延伸的視差。
  for (let index = 0; index < exitPointCount; index += 1) {
    const depth = seededRandom(index + 301);
    const angle = depth * Math.PI / 2;
    const bendRadius = isMobile ? 6.5 : 8;
    positions.push(
      -bendRadius * (1 - Math.cos(angle)) + (seededRandom(index + 311) - 0.5) * (isMobile ? 2.4 : 4.2),
      depth * 0.7 + (seededRandom(index + 321) - 0.5) * (isMobile ? 3.8 : 5.5),
      -27 - bendRadius * Math.sin(angle)
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const points = new Points(
    geometry,
    new PointsMaterial({
      color: 0xd9d4c8,
      size: isMobile ? 0.02 : 0.017,
      opacity: 0.24,
      transparent: true,
      fog: false,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true
    })
  );
  return points;
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
  const exitPage = createExitPage(isMobile);
  scene.add(portal, exitPage);

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

  const baseFragmentCount = isMobile ? 60 : 190;
  const exitFragmentCount = isMobile ? 90 : 220;
  const fragmentCount = baseFragmentCount + exitFragmentCount;
  const exitPageHeight = isMobile ? EXIT_PAGE_MOBILE_HEIGHT : EXIT_PAGE_DESKTOP_HEIGHT;
  const exitPageWidth = exitPageHeight * (isMobile ? EXIT_PAGE_MOBILE_ASPECT : EXIT_PAGE_DESKTOP_ASPECT);
  const fragments = new InstancedMesh(
    new PlaneGeometry(0.09, 0.065),
    new MeshBasicMaterial({
      color: 0xc8c4ba,
      opacity: 0.18,
      transparent: true,
      fog: false,
      wireframe: true,
      depthWrite: false,
      side: DoubleSide
    }),
    fragmentCount
  );
  const fragmentTransform = new Object3D();
  const fragmentStates = [];
  for (let index = 0; index < fragmentCount; index += 1) {
    const isExitFragment = index >= baseFragmentCount;
    const exitIndex = index - baseFragmentCount;
    const exitDepth = isExitFragment ? seededRandom(exitIndex + 401) : 0;
    // 前三站沿深度切成等量區間，每區只加入少量隨機偏移，避免純隨機造成大片空洞。
    const baseDepth = isExitFragment
      ? 0
      : (index + seededRandom(index + 21)) / baseFragmentCount;
    const exitAngle = exitDepth * Math.PI / 2;
    const exitBendRadius = isMobile ? 6.5 : 8;
    const fragmentIndex = isExitFragment ? exitIndex : index;
    const fragmentAngle = fragmentIndex * Math.PI * (3 - Math.sqrt(5))
      + (seededRandom(fragmentIndex + 1) - 0.5) * 0.34;
    const fragmentRadius = isExitFragment
      ? (isMobile ? 2.6 : 5) + seededRandom(fragmentIndex + 11) * (isMobile ? 2.4 : 5)
      : ((isMobile ? 2.2 : 4.4) + seededRandom(fragmentIndex + 11) * (isMobile ? 1.8 : 3.8))
        * (1 + baseDepth * (isMobile ? 0.18 : 0.3));
    // 建立時將碎片固定在隧道軸外圍的橢圓環殼；最小半徑會保留中央閱讀通道。
    // 座標寫入後不再跟隨相機重算，因此前進時仍保有真實近大遠小與穿越感。
    const baseX = isExitFragment
      ? -exitBendRadius * (1 - Math.cos(exitAngle)) + Math.cos(fragmentAngle) * fragmentRadius
      : Math.cos(fragmentAngle) * fragmentRadius;
    const baseY = isExitFragment
      ? exitDepth * 0.7 + Math.sin(fragmentAngle) * fragmentRadius * (isMobile ? 0.88 : 0.72)
      : Math.sin(fragmentAngle) * fragmentRadius * (isMobile ? 0.9 : 0.72);
    const baseZ = isExitFragment
      ? -27 - exitBendRadius * Math.sin(exitAngle)
      : -0.8 - baseDepth * 25.8;
    let normalizedX = seededRandom(exitIndex + 431);
    let normalizedY = seededRandom(exitIndex + 441);
    if (isExitFragment && exitIndex % 3 === 0) {
      const edge = Math.floor(seededRandom(exitIndex + 451) * 4);
      if (edge === 0) normalizedX = 0;
      else if (edge === 1) normalizedX = 1;
      else if (edge === 2) normalizedY = 0;
      else normalizedY = 1;
    }
    const targetLocalX = (normalizedX - 0.5) * exitPageWidth;
    const state = {
      isExitFragment,
      x: baseX,
      y: baseY,
      z: baseZ,
      targetX: EXIT_PAGE_X + 0.11,
      targetY: (0.5 - normalizedY) * exitPageHeight,
      targetZ: EXIT_CORNER_Z - targetLocalX,
      rotationX: seededRandom(index + 31) * Math.PI,
      rotationY: seededRandom(index + 41) * Math.PI,
      rotationZ: seededRandom(index + 51) * Math.PI,
      speed: 0.2 + seededRandom(index + 61) * 0.35,
      scale: 0.8 + seededRandom(index + 71) * 1.5,
      targetScale: 0.9 + seededRandom(index + 81) * 1.4
    };
    fragmentStates.push(state);
  }
  scene.add(fragments);

  let progress = 0;
  let targetProgress = 0;
  let progressVelocity = 0;
  let exitProgress = 0;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerOffsetX = 0;
  let pointerOffsetY = 0;
  let previousRenderTime = null;
  let disposed = false;
  let animationFrame = null;

  function handlePointerMove(event) {
    pointerTargetX = MathUtils.clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1);
    pointerTargetY = MathUtils.clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1);
  }

  function resetPointerOffset() {
    pointerTargetX = 0;
    pointerTargetY = 0;
  }

  // 只有具備精準游標的桌面版註冊事件；手機不建立 listener，也不執行游標視差。
  if (!isMobile) {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', resetPointerOffset, { passive: true });
  }

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
    const exitPageHeight = isMobile ? EXIT_PAGE_MOBILE_HEIGHT : EXIT_PAGE_DESKTOP_HEIGHT;
    exitPage.scale.set(exitPageHeight * exitPage.userData.aspect, exitPageHeight, 1);
  }

  function render(time = performance.now()) {
    if (disposed) return;
    const seconds = time * 0.001;
    const deltaSeconds = previousRenderTime === null
      ? 1 / 60
      : Math.min((time - previousRenderTime) * 0.001, 1 / 30);
    previousRenderTime = time;

    // 游標只提供目標值，相機用與幀率無關的阻尼緩慢追隨，避免直接綁定座標造成抖動。
    // 進入左轉出口時逐步降低游標影響，確保既定相機路徑不被使用者輸入扭曲。
    const pointerBlend = 1 - Math.exp(-deltaSeconds * 3.6);
    pointerOffsetX += (pointerTargetX - pointerOffsetX) * pointerBlend;
    pointerOffsetY += (pointerTargetY - pointerOffsetY) * pointerBlend;

    // 捲動只更新目標進度，相機則以接近臨界阻尼的速度曲線追趕目標。
    // 距離大時彈簧力提高而加速，接近時由阻尼平順煞車；時間差上限可避免
    // 分頁切回前景後因單幀間隔過大而瞬間跳過照片或觀看點。
    const progressDistance = targetProgress - progress;
    const progressAcceleration = progressDistance * CAMERA_PROGRESS_STIFFNESS
      - progressVelocity * CAMERA_PROGRESS_DAMPING;
    progressVelocity += progressAcceleration * deltaSeconds;
    progress += progressVelocity * deltaSeconds;

    // 在極小誤差內直接落在目標，避免浮點尾差讓相機於吸附觀看點持續微動。
    if (Math.abs(progressDistance) < 0.00005 && Math.abs(progressVelocity) < 0.0005) {
      progress = targetProgress;
      progressVelocity = 0;
    }
    progress = MathUtils.clamp(progress, 0, 1);
    if ((progress === 0 && progressVelocity < 0) || (progress === 1 && progressVelocity > 0)) {
      progressVelocity = 0;
    }

    const cameraState = interpolateCamera(progress);
    const turnProgress = MathUtils.clamp(exitProgress / EXIT_TURN_END, 0, 1);
    const turnAmount = smoothStep(turnProgress);
    const approachProgress = MathUtils.clamp((exitProgress - EXIT_TURN_END) / (1 - EXIT_TURN_END), 0, 1);
    const approachAmount = smoothStep(approachProgress);
    const exitPageReveal = smoothStep(MathUtils.clamp(
      (exitProgress - EXIT_PAGE_REVEAL_START) / (EXIT_PAGE_REVEAL_END - EXIT_PAGE_REVEAL_START),
      0,
      1
    ));
    const fragmentGather = smoothStep(MathUtils.clamp(exitProgress / EXIT_PAGE_REVEAL_END, 0, 1));

    // 完成左轉後仍先保留純粒子走廊，直到接近底部才顯現最終頁面。
    // 反向捲動時同一進度會將頁面淡回完全不可見，不會提早洩漏第四頁內容。
    exitPage.visible = exitPageReveal > 0;
    exitPage.material.opacity = exitPageReveal;

    // 第四頁轉場直接改變 PerspectiveCamera 的世界座標與觀看方向。
    // 前 48% 沿彎道持續前進並完成精確 90 度左轉；後 52% 保持面向正左側，
    // 再沿負 X 軸靠近實體第四頁。頁面因透視自然放大，不使用 CSS scale。
    const pointerInfluence = isMobile ? 0 : 1 - turnAmount;
    const exitCameraZ = MathUtils.lerp(cameraState.z, EXIT_CORNER_Z, turnAmount);
    const cornerCameraX = cameraState.x - turnAmount * (isMobile ? 0.5 : 1.2);
    const exitCameraX = cornerCameraX - approachAmount * (isMobile ? 3.5 : 2.8);
    const exitCameraY = MathUtils.lerp(cameraState.y, 0, turnAmount);
    camera.position.set(
      exitCameraX + pointerOffsetX * 0.025 * pointerInfluence,
      exitCameraY - pointerOffsetY * 0.018 * pointerInfluence,
      exitCameraZ
    );
    const turnAngle = turnAmount * Math.PI / 2;
    const lookDirectionX = -Math.sin(turnAngle);
    const lookDirectionZ = -Math.cos(turnAngle);
    const turnPitch = Math.sin(turnProgress * Math.PI) * (isMobile ? 0.16 : 0.24);
    camera.lookAt(
      exitCameraX + lookDirectionX * 6 + pointerOffsetX * 0.04 * pointerInfluence,
      exitCameraY + turnPitch - pointerOffsetY * 0.025 * pointerInfluence,
      exitCameraZ + lookDirectionZ * 6
    );
    camera.rotation.z += cameraState.roll * (1 - turnAmount);
    portal.visible = camera.position.z > portal.position.z + 0.03;

    stations.forEach((station, stationIndex) => {
      const idealCameraZ = station.position.z + 4;
      const distance = Math.abs(camera.position.z - idealCameraZ);
      const opacity = smoothStep(1 - MathUtils.clamp((distance - 0.6) / 5.5, 0, 1));

      // 每站只有主文字與主照片負責章節切換。周邊照片維持完整不透明，
      // 避免滑動時整個空間一起淡出，讓使用者持續感受到相片隧道的深度。
      setObjectOpacity(station.children[0], opacity);
      setObjectOpacity(station.children[1], opacity);
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
      photo.position.x = isMobile
        ? base.x + Math.sin(seconds * base.speed + index) * 0.025
        : Math.cos(angle) * base.radius;
      photo.position.y = isMobile
        ? base.y + Math.cos(seconds * base.speed + index) * 0.025
        : Math.sin(angle) * base.radius * base.verticalScale;
      photo.rotation.x = base.rotationX + Math.sin(seconds * base.speed * 0.62 + index) * 0.012;
      photo.rotation.y = base.rotationY + Math.cos(seconds * base.speed * 0.55 + index) * 0.016;
      photo.rotation.z = base.rotationZ + Math.sin(seconds * base.speed * 0.48 + index) * 0.01;
    });
    // 隧道照片、灰塵與線框碎片只做位置和旋轉變化，不再依捲動進度淡化。
    // 其材質同時停用場景霧化，確保穿越觀看點時亮度保持穩定。
    dustField.rotation.z = Math.sin(seconds * 0.055) * 0.035;
    dustField.position.y = Math.sin(seconds * 0.11) * 0.05;

    fragmentStates.forEach((state, index) => {
      const driftAmount = state.isExitFragment ? 1 - fragmentGather : 1;
      let fragmentX = state.x + Math.sin(seconds * state.speed + index) * 0.12 * driftAmount;
      let fragmentY = state.y + Math.cos(seconds * state.speed * 0.8 + index) * 0.1 * driftAmount;
      let fragmentZ = state.z;
      let rotationX = state.rotationX + seconds * state.speed * 0.2 * driftAmount;
      let rotationY = state.rotationY + seconds * state.speed * 0.28 * driftAmount;
      let rotationZ = state.rotationZ + seconds * state.speed * 0.16 * driftAmount;
      let fragmentScale = state.scale;

      // 使用者所指的粒子是線框長方形。左轉開始後，末端實例會逐步移到頁面表面、
      // 轉成與紙面平行並形成輪廓；小點灰塵不再參與頁面匯聚。
      if (state.isExitFragment) {
        fragmentX = MathUtils.lerp(fragmentX, state.targetX, fragmentGather);
        fragmentY = MathUtils.lerp(fragmentY, state.targetY, fragmentGather);
        fragmentZ = MathUtils.lerp(fragmentZ, state.targetZ, fragmentGather);
        rotationX = MathUtils.lerp(rotationX, 0, fragmentGather);
        rotationY = MathUtils.lerp(rotationY, Math.PI / 2, fragmentGather);
        rotationZ = MathUtils.lerp(rotationZ, 0, fragmentGather);
        fragmentScale = MathUtils.lerp(fragmentScale, state.targetScale, fragmentGather);
      }

      fragmentTransform.position.set(
        fragmentX,
        fragmentY,
        fragmentZ
      );
      fragmentTransform.rotation.set(
        rotationX,
        rotationY,
        rotationZ
      );
      fragmentTransform.scale.setScalar(fragmentScale);
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

  function setProgress(nextProgress, immediate = false) {
    targetProgress = MathUtils.clamp(nextProgress, 0, 1);
    if (!immediate) return;

    // reduced-motion 與初始靜態定位可略過速度曲線，確保不產生非預期移動。
    progress = targetProgress;
    progressVelocity = 0;
  }

  function setExitProgress(nextProgress) {
    exitProgress = MathUtils.clamp(nextProgress, 0, 1);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  animationFrame = window.requestAnimationFrame(animate);

  return {
    setProgress,
    setExitProgress,
    destroy() {
      disposed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      if (!isMobile) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerleave', resetPointerOffset);
      }
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
