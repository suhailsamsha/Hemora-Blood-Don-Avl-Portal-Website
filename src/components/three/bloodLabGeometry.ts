import * as THREE from 'three';
import type { BloodLabMaterials } from './bloodLabMaterials.ts';

export interface ExplodablePart {
  object: THREE.Object3D;
  baseY: number;
  explodeY: number;
}

export interface RbcInstanceState {
  radius: number;
  angle: number;
  height: number;
  speed: number;
  wobblePhase: number;
  scale: number;
}

export interface BloodLabAssembly {
  root: THREE.Group;
  spinRotorGroup: THREE.Group;
  explodableParts: ExplodablePart[];
  rbcMesh: THREE.InstancedMesh;
  rbcStates: RbcInstanceState[];
  dispose: () => void;
}

const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyEuler = new THREE.Euler();
const _dummyScale = new THREE.Vector3();
const _tintColor = new THREE.Color();

function buildBiconcaveRbcGeometry(): THREE.LatheGeometry {
  // True erythrocyte biconcave disc profile revolved around Y axis
  const pts: THREE.Vector2[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI;
    const r = Math.sin(t) * 0.088;
    const normR = r / 0.088;
    // Evans & Fung biconcave thickness approximation
    const halfThick =
      0.012 + 0.026 * Math.pow(normR, 2) - 0.028 * Math.pow(normR, 4);
    const y = Math.cos(t) >= 0 ? Math.max(0.008, halfThick) : -Math.max(0.008, halfThick);
    pts.push(new THREE.Vector2(Math.max(0.0001, r), y));
  }
  const geo = new THREE.LatheGeometry(pts, 24);
  geo.computeVertexNormals();
  return geo;
}

function buildExtrudedGimbalArm(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, 0);
  shape.lineTo(0.08, 0);
  shape.lineTo(0.11, 0.52);
  shape.lineTo(0.14, 1.38);
  shape.lineTo(0.09, 1.54);
  shape.lineTo(-0.04, 1.54);
  shape.lineTo(-0.04, 1.38);
  shape.lineTo(0.02, 1.32);
  shape.lineTo(-0.02, 0.52);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.018,
    bevelThickness: 0.018,
  });
  geo.translate(0, 0, -0.07);
  geo.computeVertexNormals();
  return geo;
}

export function createBloodLabAssembly(materials: BloodLabMaterials): BloodLabAssembly {
  const geometries: THREE.BufferGeometry[] = [];
  const explodableParts: ExplodablePart[] = [];

  const root = new THREE.Group();
  const spinRotorGroup = new THREE.Group();
  root.add(spinRotorGroup);

  // 1. Machined Centrifuge Rotor Plinth (grounded at y = 0)
  const plinthPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.42, 0.0),
    new THREE.Vector2(1.42, 0.08),
    new THREE.Vector2(1.32, 0.14),
    new THREE.Vector2(1.16, 0.18),
    new THREE.Vector2(1.08, 0.34),
    new THREE.Vector2(0.88, 0.42),
    new THREE.Vector2(0.0, 0.42),
  ];
  const plinthGeo = new THREE.LatheGeometry(plinthPoints, 64);
  plinthGeo.computeVertexNormals();
  geometries.push(plinthGeo);

  const plinthMesh = new THREE.Mesh(plinthGeo, materials.rotorMetal);
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  spinRotorGroup.add(plinthMesh);

  // Matte silicone isolation base ring (y = 0.01) for roughness contrast
  const footRingGeo = new THREE.TorusGeometry(1.36, 0.032, 16, 64);
  footRingGeo.rotateX(Math.PI / 2);
  geometries.push(footRingGeo);
  const footRingMesh = new THREE.Mesh(footRingGeo, materials.siliconeGasket);
  footRingMesh.position.y = 0.032;
  footRingMesh.castShadow = true;
  footRingMesh.receiveShadow = true;
  spinRotorGroup.add(footRingMesh);

  // 2. Stepped Stainless Locking Chuck Collar
  const collarPoints = [
    new THREE.Vector2(0.76, 0.0),
    new THREE.Vector2(0.92, 0.0),
    new THREE.Vector2(0.92, 0.16),
    new THREE.Vector2(0.86, 0.24),
    new THREE.Vector2(0.82, 0.32),
    new THREE.Vector2(0.68, 0.32),
    new THREE.Vector2(0.68, 0.06),
    new THREE.Vector2(0.76, 0.0),
  ];
  const collarGeo = new THREE.LatheGeometry(collarPoints, 64);
  collarGeo.computeVertexNormals();
  geometries.push(collarGeo);

  const collarMesh = new THREE.Mesh(collarGeo, materials.stainlessCollar);
  collarMesh.position.y = 0.42;
  collarMesh.castShadow = true;
  collarMesh.receiveShadow = true;
  spinRotorGroup.add(collarMesh);
  explodableParts.push({ object: collarMesh, baseY: 0.42, explodeY: 0.18 });

  // 6 Perimeter Stainless Hex Fasteners around collar flange
  const boltGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.05, 6);
  geometries.push(boltGeo);
  const boltsMesh = new THREE.InstancedMesh(boltGeo, materials.stainlessCollar, 6);
  boltsMesh.castShadow = true;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    _dummyPos.set(Math.cos(angle) * 0.84, 0.58, Math.sin(angle) * 0.84);
    _dummyEuler.set(0, angle, 0);
    _dummyQuat.setFromEuler(_dummyEuler);
    _dummyScale.set(1, 1, 1);
    _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
    boltsMesh.setMatrixAt(i, _dummyMat);
  }
  boltsMesh.instanceMatrix.needsUpdate = true;
  boltsMesh.computeBoundingSphere();
  spinRotorGroup.add(boltsMesh);
  explodableParts.push({ object: boltsMesh, baseY: 0, explodeY: 0.28 });

  // 3. Dual Swing-Bucket Gimbal Yoke Arms
  const gimbalGroup = new THREE.Group();
  const armGeo = buildExtrudedGimbalArm();
  geometries.push(armGeo);

  const leftArm = new THREE.Mesh(armGeo, materials.rotorMetal);
  leftArm.position.set(-0.92, 0.34, 0);
  leftArm.castShadow = true;
  gimbalGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, materials.rotorMetal);
  rightArm.position.set(0.92, 0.34, 0);
  rightArm.rotation.y = Math.PI;
  rightArm.castShadow = true;
  gimbalGroup.add(rightArm);

  spinRotorGroup.add(gimbalGroup);
  explodableParts.push({ object: gimbalGroup, baseY: 0, explodeY: 0.12 });

  // 4. Packed Red Blood Cell Column (~45% volume fraction, lower meniscus)
  const rbcPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.62, 0.08),
    new THREE.Vector2(0.62, 1.12),
    new THREE.Vector2(0.54, 1.135),
    new THREE.Vector2(0.0, 1.125),
  ];
  const rbcColGeo = new THREE.LatheGeometry(rbcPoints, 48);
  rbcColGeo.computeVertexNormals();
  geometries.push(rbcColGeo);

  const rbcColMesh = new THREE.Mesh(rbcColGeo, materials.rbcColumn);
  rbcColMesh.position.y = 0.56;
  rbcColMesh.castShadow = true;
  rbcColMesh.renderOrder = 2;
  spinRotorGroup.add(rbcColMesh);
  explodableParts.push({ object: rbcColMesh, baseY: 0.56, explodeY: 0.55 });

  // 5. Buffy Coat Layer (~1-2% Leukocytes & Platelets interface disc)
  const buffyPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.618, 0.0),
    new THREE.Vector2(0.622, 0.045),
    new THREE.Vector2(0.615, 0.09),
    new THREE.Vector2(0.0, 0.082),
  ];
  const buffyGeo = new THREE.LatheGeometry(buffyPoints, 48);
  buffyGeo.computeVertexNormals();
  geometries.push(buffyGeo);

  const buffyMesh = new THREE.Mesh(buffyGeo, materials.buffyCoat);
  buffyMesh.position.y = 1.69;
  buffyMesh.renderOrder = 3;
  spinRotorGroup.add(buffyMesh);
  explodableParts.push({ object: buffyMesh, baseY: 1.69, explodeY: 1.28 });

  // 6. Amber Fresh Plasma Column (~53% supernatant fraction with concave meniscus)
  const plasmaPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.618, 0.0),
    new THREE.Vector2(0.618, 1.24),
    new THREE.Vector2(0.56, 1.21),
    new THREE.Vector2(0.32, 1.19),
    new THREE.Vector2(0.0, 1.185),
  ];
  const plasmaGeo = new THREE.LatheGeometry(plasmaPoints, 48);
  plasmaGeo.computeVertexNormals();
  geometries.push(plasmaGeo);

  const plasmaMesh = new THREE.Mesh(plasmaGeo, materials.plasmaColumn);
  plasmaMesh.position.y = 1.79;
  plasmaMesh.renderOrder = 4;
  spinRotorGroup.add(plasmaMesh);
  explodableParts.push({ object: plasmaMesh, baseY: 1.79, explodeY: 2.05 });

  // 7. Outer Borosilicate Graduated Optical Glass Vessel
  const glassPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.64, 0.0),
    new THREE.Vector2(0.695, 0.1),
    new THREE.Vector2(0.695, 2.74),
    new THREE.Vector2(0.75, 2.81),
    new THREE.Vector2(0.75, 2.86),
    new THREE.Vector2(0.66, 2.86),
    new THREE.Vector2(0.65, 2.74),
    new THREE.Vector2(0.65, 0.12),
    new THREE.Vector2(0.6, 0.04),
    new THREE.Vector2(0.0, 0.04),
  ];
  const glassGeo = new THREE.LatheGeometry(glassPoints, 64);
  glassGeo.computeVertexNormals();
  geometries.push(glassGeo);

  const glassMesh = new THREE.Mesh(glassGeo, materials.borosilicateGlass);
  glassMesh.position.y = 0.5;
  glassMesh.renderOrder = 10;
  spinRotorGroup.add(glassMesh);
  explodableParts.push({ object: glassMesh, baseY: 0.5, explodeY: 2.85 });

  // 8. Calibration mL Graduation Decal Sleeve (polygonOffset prevents z-fighting)
  const decalGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.45, 64, 1, true);
  geometries.push(decalGeo);
  const decalMesh = new THREE.Mesh(decalGeo, materials.calibrationDecal);
  decalMesh.position.y = 1.88;
  decalMesh.rotation.y = -Math.PI * 0.5;
  decalMesh.renderOrder = 11;
  spinRotorGroup.add(decalMesh);
  explodableParts.push({ object: decalMesh, baseY: 1.88, explodeY: 2.85 });

  // 9. Silicone Septum Stopper & Fluted Stainless Crimp Cap
  const capGroup = new THREE.Group();
  const stopperGeo = new THREE.CylinderGeometry(0.63, 0.59, 0.24, 48);
  geometries.push(stopperGeo);
  const stopperMesh = new THREE.Mesh(stopperGeo, materials.siliconeGasket);
  stopperMesh.position.y = 0.08;
  stopperMesh.castShadow = true;
  capGroup.add(stopperMesh);

  const crimpPoints = [
    new THREE.Vector2(0.0, 0.16),
    new THREE.Vector2(0.74, 0.16),
    new THREE.Vector2(0.74, 0.34),
    new THREE.Vector2(0.68, 0.4),
    new THREE.Vector2(0.28, 0.4),
    new THREE.Vector2(0.24, 0.48),
    new THREE.Vector2(0.0, 0.48),
  ];
  const crimpGeo = new THREE.LatheGeometry(crimpPoints, 48);
  crimpGeo.computeVertexNormals();
  geometries.push(crimpGeo);
  const crimpMesh = new THREE.Mesh(crimpGeo, materials.stainlessCollar);
  crimpMesh.castShadow = true;
  capGroup.add(crimpMesh);

  // Curved Sterile Transfer Tubing on Top Port
  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.46, 0),
    new THREE.Vector3(0.02, 0.86, 0.08),
    new THREE.Vector3(0.32, 1.05, 0.18),
    new THREE.Vector3(0.68, 0.88, 0.14),
    new THREE.Vector3(0.84, 0.54, 0.0),
  ]);
  const tubeGeo = new THREE.TubeGeometry(tubeCurve, 32, 0.042, 16, false);
  geometries.push(tubeGeo);
  const tubeMesh = new THREE.Mesh(tubeGeo, materials.transferTubing);
  tubeMesh.castShadow = true;
  capGroup.add(tubeMesh);

  capGroup.position.y = 3.26;
  spinRotorGroup.add(capGroup);
  explodableParts.push({ object: capGroup, baseY: 3.26, explodeY: 3.72 });

  // 10. InstancedMesh of 48 Procedural Biconcave Red Blood Cells
  const rbcGeo = buildBiconcaveRbcGeometry();
  geometries.push(rbcGeo);
  const rbcCount = 48;
  const rbcMesh = new THREE.InstancedMesh(rbcGeo, materials.rbcInstanceMat, rbcCount);
  rbcMesh.frustumCulled = false;
  rbcMesh.castShadow = true;

  const rbcStates: RbcInstanceState[] = [];
  for (let i = 0; i < rbcCount; i++) {
    const insideChamber = i < 24;
    const radius = insideChamber
      ? 0.12 + ((i * 37) % 100) / 260
      : 1.55 + ((i * 53) % 100) / 85;
    const angle = (i / rbcCount) * Math.PI * 2 * 2.3;
    const height = insideChamber
      ? 0.72 + ((i * 29) % 100) / 115
      : 0.55 + ((i * 41) % 100) / 38;
    const speed = insideChamber ? 0.45 + (i % 5) * 0.08 : 0.18 + (i % 7) * 0.04;
    const scale = 0.85 + ((i * 19) % 31) * 0.01; // ±15% variation
    rbcStates.push({
      radius,
      angle,
      height,
      speed,
      wobblePhase: i * 0.7,
      scale,
    });

    // Oxygenation crimson-to-venous-burgundy tint variation
    const oxyMix = (i % 9) / 8;
    _tintColor.setRGB(
      0.56 + oxyMix * 0.34,
      0.04 + oxyMix * 0.05,
      0.06 + oxyMix * 0.05
    );
    rbcMesh.setColorAt(i, _tintColor);

    _dummyPos.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    _dummyEuler.set(i * 0.4, angle, i * 0.2);
    _dummyQuat.setFromEuler(_dummyEuler);
    _dummyScale.setScalar(scale);
    _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
    rbcMesh.setMatrixAt(i, _dummyMat);
  }
  rbcMesh.instanceMatrix.needsUpdate = true;
  if (rbcMesh.instanceColor) rbcMesh.instanceColor.needsUpdate = true;
  rbcMesh.computeBoundingSphere();
  root.add(rbcMesh);

  return {
    root,
    spinRotorGroup,
    explodableParts,
    rbcMesh,
    rbcStates,
    dispose: () => {
      for (const g of geometries) g.dispose();
    },
  };
}
