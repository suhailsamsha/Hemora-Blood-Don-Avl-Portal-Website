import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ArrowLeft, ChevronDown, ChevronUp, Layers, RotateCcw } from 'lucide-react';
import { createBloodLabAssembly } from './bloodLabGeometry.ts';
import { createBloodLabMaterials, type LabFinishPreset } from './bloodLabMaterials.ts';

interface ThreeBloodLabProps {
  onBack: () => void;
}

type CameraPresetKey = 'overview' | 'layers' | 'rbc';

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { label: 'Overview', pos: [4.2, 2.9, 5.2], target: [0, 1.85, 0] },
  layers: { label: 'Component Layers', pos: [0.4, 2.6, 5.8], target: [0, 2.25, 0] },
  rbc: { label: 'Erythrocyte Macro', pos: [2.2, 1.35, 2.45], target: [0, 1.15, 0] },
};

// Pre-allocated scratch math helpers (Zero GC in render loop)
const _mat4 = new THREE.Matrix4();
const _posVec = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scaleVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

export function ThreeBloodLab({ onBack }: ThreeBloodLabProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [explodeTarget, setExplodeTarget] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState<0 | 1 | 3>(1);
  const [finishPreset, setFinishPreset] = useState<LabFinishPreset>('clinical');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>('overview');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Refs synced to animation loop so UI updates never tear down WebGL
  const explodeTargetRef = useRef(0);
  const spinSpeedRef = useRef<0 | 1 | 3>(1);
  const finishPresetRef = useRef<LabFinishPreset>('clinical');
  const activeCameraPresetRef = useRef<{
    pos: [number, number, number];
    target: [number, number, number];
    active: boolean;
  }>({
    pos: CAMERA_PRESETS.overview.pos,
    target: CAMERA_PRESETS.overview.target,
    active: false,
  });
  const applyFinishRef = useRef<((p: LabFinishPreset) => void) | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodeTarget;
  }, [explodeTarget]);

  useEffect(() => {
    spinSpeedRef.current = spinSpeed;
  }, [spinSpeed]);

  useEffect(() => {
    finishPresetRef.current = finishPreset;
    applyFinishRef.current?.(finishPreset);
  }, [finishPreset]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function triggerCameraPreset(preset: CameraPresetKey) {
    setCameraPreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    activeCameraPresetRef.current = {
      pos: cfg.pos,
      target: cfg.target,
      active: true,
    };
  }

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#130f0e');
    scene.fog = new THREE.FogExp2('#130f0e', 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.0;
    controls.maxDistance = 12.0;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    const onControlStart = () => {
      activeCameraPresetRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // 3-Point Warm/Cool Studio Rig
    const hemiLight = new THREE.HemisphereLight('#c8dcff', '#2a1816', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff2e2', 2.4);
    keyLight.position.set(4.8, 7.5, 4.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 5.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#ffb4a8', 1.45);
    rimLight.position.set(-5.0, 4.2, -4.5);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxLeft = new THREE.RectAreaLight('#fff7ed', 3.4, 2.2, 5.0);
      softboxLeft.position.set(-3.6, 2.6, 2.2);
      softboxLeft.lookAt(0, 1.8, 0);
      scene.add(softboxLeft);

      const softboxRight = new THREE.RectAreaLight('#dbeafe', 2.6, 2.0, 4.8);
      softboxRight.position.set(3.8, 2.8, -1.5);
      softboxRight.lookAt(0, 1.8, 0);
      scene.add(softboxRight);
    }

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const materials = createBloodLabMaterials(isSoftwareGl, maxAnisotropy);
    applyFinishRef.current = materials.applyFinishPreset;
    materials.applyFinishPreset(finishPresetRef.current);

    // Grounded Studio Floor & Radial Contact Shadow Plane
    const floorGeo = new THREE.CircleGeometry(18, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, materials.floorMat);
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const shadowPlaneGeo = new THREE.PlaneGeometry(3.9, 3.9);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMesh = new THREE.Mesh(shadowPlaneGeo, materials.contactShadowMat);
    shadowPlaneMesh.position.y = 0.004;
    scene.add(shadowPlaneMesh);

    // Composite Centrifuge Blood Separation Assembly
    const assembly = createBloodLabAssembly(materials);
    scene.add(assembly.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let explodeCurrent = 0;
    let currentSpinRate = 0.32;
    let elapsed = 0;
    let lastTime = performance.now();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += delta;

      // Damped Exploded View separation
      explodeCurrent = THREE.MathUtils.damp(
        explodeCurrent,
        explodeTargetRef.current,
        6.5,
        delta
      );
      for (const part of assembly.explodableParts) {
        part.object.position.y = part.baseY + part.explodeY * explodeCurrent;
      }

      // Damped Rotor Spin
      const targetRate =
        spinSpeedRef.current === 0 ? 0 : spinSpeedRef.current === 1 ? 0.35 : 2.1;
      currentSpinRate = THREE.MathUtils.damp(currentSpinRate, targetRate, 4.5, delta);
      assembly.spinRotorGroup.rotation.y += currentSpinRate * delta;

      // Animate Biconcave Red Blood Cells in InstancedMesh (Zero GC)
      for (let i = 0; i < assembly.rbcStates.length; i++) {
        const st = assembly.rbcStates[i];
        const a = st.angle + elapsed * st.speed * (spinSpeedRef.current === 3 ? 1.8 : 1);
        const radialOffset = st.radius + Math.sin(elapsed * 0.9 + st.wobblePhase) * 0.04;
        const yPos =
          st.height +
          Math.sin(elapsed * 1.1 + st.wobblePhase) * 0.08 +
          (i < 24 ? explodeCurrent * 0.55 : 0);

        _posVec.set(Math.cos(a) * radialOffset, yPos, Math.sin(a) * radialOffset);
        _euler.set(
          st.wobblePhase + elapsed * 0.5,
          a,
          st.wobblePhase * 0.6 + elapsed * 0.35
        );
        _quat.setFromEuler(_euler);
        _scaleVec.setScalar(st.scale);
        _mat4.compose(_posVec, _quat, _scaleVec);
        assembly.rbcMesh.setMatrixAt(i, _mat4);
      }
      assembly.rbcMesh.instanceMatrix.needsUpdate = true;

      // Smooth Damped Camera Preset Transition
      if (activeCameraPresetRef.current.active) {
        _targetCamPos.set(...activeCameraPresetRef.current.pos);
        _targetLookAt.set(...activeCameraPresetRef.current.target);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 5.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 5.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 5.5, delta);

        if (
          camera.position.distanceTo(_targetCamPos) < 0.03 &&
          controls.target.distanceTo(_targetLookAt) < 0.03
        ) {
          activeCameraPresetRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    if (isSoftwareGl) {
      frameId = window.setTimeout(tick, 16);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      assembly.dispose();
      floorGeo.dispose();
      shadowPlaneGeo.dispose();
      materials.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#130f0e] text-[#F5F2EE] select-none">
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0" />

      {/* Minimal Top-Left Badge & Back Action (Zero backdrop-filter, zero pulsating dots) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-white/15 bg-[#1B1615]/90 hover:bg-[#261F1D] text-xs sm:text-sm font-semibold text-[#F5F2EE] inline-flex items-center gap-2 shadow-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-[#F28B82]" aria-hidden="true" />
          <span>Back to Portal</span>
        </button>

        <div className="px-4 py-2 rounded-xl border border-white/12 bg-[#1B1615]/88 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F28B82]">
            Whole Blood Component Lab · 450 mL
          </p>
          <p className="text-xs text-[#D6D0C9]">
            Plasma 55% · Buffy Coat &lt;1% · Packed RBCs 45%
          </p>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Side Panels, Zero backdrop-filter over WebGL) */}
      <div
        style={{
          bottom: '20px',
          left: '50%',
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 28px))'
            : 'translate(-50%, 0)',
          maxWidth: 'min(940px, 94vw)',
        }}
        className="fixed z-20 w-full transition-transform duration-300 ease-out"
      >
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="px-3.5 py-1 rounded-full border border-white/15 bg-[#1B1615]/95 text-[11px] font-semibold text-[#F5F2EE] inline-flex items-center gap-1.5 shadow-md hover:border-[#F28B82]/60"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-[#F28B82]" aria-hidden="true" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-[#F28B82]" aria-hidden="true" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-white/15 bg-[#181413]/92 px-4 py-3.5 shadow-2xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
            {/* Exploded View Slider */}
            <div className="md:col-span-4 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5F2EE] inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#F28B82]" aria-hidden="true" />
                  <span>Exploded Breakdown</span>
                </span>
                <span className="tabular-nums text-[#F28B82] font-semibold">
                  {Math.round(explodeTarget * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Exploded view separation"
                min={0}
                max={1}
                step={0.01}
                value={explodeTarget}
                onChange={(e) => setExplodeTarget(Number(e.target.value))}
                className="w-full accent-[#B3261E] cursor-pointer"
              />
            </div>

            {/* Camera Presets */}
            <div className="md:col-span-4 flex flex-wrap items-center gap-1.5">
              {(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => triggerCameraPreset(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    cameraPreset === key
                      ? 'bg-[#B3261E] text-white'
                      : 'bg-[#26201E] text-[#D6D0C9] hover:text-white border border-white/10'
                  }`}
                >
                  {CAMERA_PRESETS[key].label}
                </button>
              ))}
            </div>

            {/* Finish Swatches & Spin Speed */}
            <div className="md:col-span-4 flex flex-wrap items-center justify-between md:justify-end gap-2">
              <div className="flex items-center gap-1.5" role="group" aria-label="Centrifuge finish">
                {(
                  [
                    { id: 'clinical', label: 'Titanium', color: '#4B5563' },
                    { id: 'cobalt', label: 'Cryo', color: '#2563EB' },
                    { id: 'crimson', label: 'Crimson', color: '#991B1B' },
                  ] as const
                ).map((sw) => (
                  <button
                    key={sw.id}
                    type="button"
                    title={sw.label}
                    aria-label={`${sw.label} finish`}
                    onClick={() => setFinishPreset(sw.id)}
                    style={{ backgroundColor: sw.color }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      finishPreset === sw.id
                        ? 'border-white scale-110'
                        : 'border-white/25 opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 bg-[#241E1C] p-1 rounded-lg border border-white/10">
                {([0, 1, 3] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpinSpeed(spd)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      spinSpeed === spd
                        ? 'bg-[#B3261E] text-white'
                        : 'text-[#A8A29E] hover:text-white'
                    }`}
                  >
                    {spd === 0 ? 'Pause' : `${spd}x`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Reset studio view"
                onClick={() => {
                  setExplodeTarget(0);
                  setSpinSpeed(1);
                  triggerCameraPreset('overview');
                }}
                className="p-1.5 rounded-lg bg-[#26201E] text-[#D6D0C9] hover:text-white border border-white/10"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
