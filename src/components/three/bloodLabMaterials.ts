import * as THREE from 'three';

export type LabFinishPreset = 'clinical' | 'cobalt' | 'crimson';

export interface BloodLabMaterials {
  rotorMetal: THREE.MeshPhysicalMaterial;
  stainlessCollar: THREE.MeshPhysicalMaterial;
  siliconeGasket: THREE.MeshStandardMaterial;
  rbcColumn: THREE.MeshPhysicalMaterial;
  buffyCoat: THREE.MeshPhysicalMaterial;
  plasmaColumn: THREE.MeshPhysicalMaterial;
  borosilicateGlass: THREE.MeshPhysicalMaterial;
  calibrationDecal: THREE.MeshStandardMaterial;
  transferTubing: THREE.MeshPhysicalMaterial;
  rbcInstanceMat: THREE.MeshPhysicalMaterial;
  floorMat: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  textures: THREE.Texture[];
  applyFinishPreset: (preset: LabFinishPreset) => void;
  dispose: () => void;
}

function createCalibrationScaleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle vertical translucent clinical band on front quadrant
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(360, 70, 304, 884);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '600 26px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'middle';

  const marks = [
    { y: 150, label: '450 mL · WHOLE' },
    { y: 240, label: '400 mL · PLASMA' },
    { y: 360, label: '300 mL' },
    { y: 480, label: '250 mL · BUFFY' },
    { y: 580, label: '200 mL' },
    { y: 710, label: '100 mL · PACKED RBC' },
    { y: 840, label: '50 mL' },
  ];

  // Minor millimeter graduations
  for (let y = 130; y <= 880; y += 20) {
    const isMajor = y % 60 === 10;
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(410, y);
    ctx.lineTo(isMajor ? 475 : 445, y);
    ctx.stroke();
  }

  for (const m of marks) {
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(395, m.y);
    ctx.lineTo(490, m.y);
    ctx.stroke();
    ctx.fillText(m.label, 504, m.y);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createBrushedMetalRoughnessTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#383838';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const v = 46 + ((y * 17) % 34);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 512, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.38)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createBloodLabMaterials(
  isSoftwareGl: boolean,
  maxAnisotropy: number
): BloodLabMaterials {
  const decalTex = createCalibrationScaleTexture(maxAnisotropy);
  const brushedRoughTex = createBrushedMetalRoughnessTexture(maxAnisotropy);
  const contactShadowTex = createContactShadowTexture();

  const rotorMetal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#2c2f36'),
    metalness: 0.92,
    roughness: 0.24,
    roughnessMap: brushedRoughTex,
    anisotropy: 0.82,
    anisotropyRotation: Math.PI * 0.25,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
  });

  const stainlessCollar = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#cbd2d9'),
    metalness: 0.95,
    roughness: 0.18,
    roughnessMap: brushedRoughTex,
    anisotropy: 0.85,
    anisotropyRotation: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.14,
  });

  const siliconeGasket = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#241f1e'),
    metalness: 0.05,
    roughness: 0.82,
  });

  const rbcColumn = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#7f0d13'),
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
    sheen: 0.35,
    sheenColor: new THREE.Color('#d9383a'),
    sheenRoughness: 0.4,
  });

  const buffyCoat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f4e8d4'),
    roughness: 0.48,
    metalness: 0.03,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    sheen: 0.45,
    sheenColor: new THREE.Color('#fff5e6'),
  });

  const plasmaColumn = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eab044'),
    transmission: isSoftwareGl ? 0 : 0.78,
    transparent: true,
    opacity: isSoftwareGl ? 0.66 : 0.95,
    ior: 1.35,
    thickness: 1.1,
    attenuationColor: new THREE.Color('#d98218'),
    attenuationDistance: 1.4,
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    depthWrite: false,
  });

  const borosilicateGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f4f9ff'),
    transmission: isSoftwareGl ? 0 : 0.94,
    transparent: true,
    opacity: isSoftwareGl ? 0.34 : 1,
    ior: 1.52,
    thickness: 1.35,
    attenuationColor: new THREE.Color('#dbeafe'),
    attenuationDistance: 3.2,
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const calibrationDecal = new THREE.MeshStandardMaterial({
    map: decalTex,
    transparent: true,
    depthWrite: false,
    roughness: 0.3,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
  });

  const transferTubing = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f1ece8'),
    transmission: isSoftwareGl ? 0 : 0.48,
    transparent: true,
    opacity: isSoftwareGl ? 0.62 : 0.9,
    ior: 1.42,
    roughness: 0.36,
    metalness: 0.0,
    clearcoat: 0.4,
  });

  const rbcInstanceMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'), // Tinted per instance via setColorAt
    roughness: 0.28,
    metalness: 0.02,
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
    sheen: 0.35,
    sheenColor: new THREE.Color('#ff6b6b'),
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#191413'),
    roughness: 0.72,
    metalness: 0.18,
  });

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.48,
  });

  const textures = [decalTex, brushedRoughTex, contactShadowTex];
  const materials = [
    rotorMetal,
    stainlessCollar,
    siliconeGasket,
    rbcColumn,
    buffyCoat,
    plasmaColumn,
    borosilicateGlass,
    calibrationDecal,
    transferTubing,
    rbcInstanceMat,
    floorMat,
    contactShadowMat,
  ];

  function applyFinishPreset(preset: LabFinishPreset) {
    if (preset === 'clinical') {
      rotorMetal.color.set('#2c2f36');
      stainlessCollar.color.set('#cbd2d9');
    } else if (preset === 'cobalt') {
      rotorMetal.color.set('#1f314d');
      stainlessCollar.color.set('#9ec5f8');
    } else {
      rotorMetal.color.set('#47191c');
      stainlessCollar.color.set('#e5b4b0');
    }
  }

  return {
    rotorMetal,
    stainlessCollar,
    siliconeGasket,
    rbcColumn,
    buffyCoat,
    plasmaColumn,
    borosilicateGlass,
    calibrationDecal,
    transferTubing,
    rbcInstanceMat,
    floorMat,
    contactShadowMat,
    textures,
    applyFinishPreset,
    dispose: () => {
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
