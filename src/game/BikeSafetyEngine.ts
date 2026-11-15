import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { soundEngine } from './audio';
import {
  applyBikeStyle,
  createCarRig,
  createDogRig,
  createGravelGroup,
  createKidsGroup,
  createPedestrianRig,
  createPickupGroup,
  createPlayerBikeRig,
  createPoliceCarRig,
  createRoadworkGroup,
  createScooterRig,
  createSignalGantry,
  createTreeGroup,
  createWrongWayBikeRig,
  type CarRig,
  type DogRig,
  type KidsRig,
  type PedestrianRig,
  type PlayerBikeRig,
  type PoliceCarRig,
  type ScooterRig,
  type SignalGantryRig,
  type WrongWayBikeRig,
} from './models';
import {
  createBuildingFacadeTexture,
  createContactShadowTexture,
  createDoorZoneTexture,
  createPotholeTexture,
  createPuddleTexture,
  createRoadNormalMap,
  createRoadRoughnessMap,
  createRoadTexture,
  createSidewalkNormalMap,
  createSidewalkTexture,
  createTrajectoryArrowTexture,
  createWarningChevronTexture,
} from './textures';
import { buildStarterPixelBike } from './pixelBike';
import type {
  BikeType,
  CalloutEvent,
  DifficultyMode,
  ForecastAlert,
  GamePhase,
  HazardType,
  HudSnapshot,
  MobileInputState,
  RunSummary,
} from './types';

// Pre-allocated math helpers outside the render loop (zero GC churn)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

const SEGMENT_LEN = 36;
const NUM_SEGMENTS = 5;
const TOTAL_ROAD_LEN = SEGMENT_LEN * NUM_SEGMENTS;
const ROAD_HALF_WIDTH = 4.65;

interface RoadSegment {
  group: THREE.Group;
  z: number;
  hasCrosswalk: boolean;
}

interface ActiveHazard {
  id: number;
  type: HazardType;
  group: THREE.Group;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  passed: boolean;
  hit: boolean;
  nearMissAwarded: boolean;
  defensiveAwarded: boolean;
  // Type-specific runtime state
  carRig?: CarRig;
  pedRig?: PedestrianRig;
  scooterRig?: ScooterRig;
  signalRig?: SignalGantryRig;
  dogRig?: DogRig;
  kidsRig?: KidsRig;
  wrongBikeRig?: WrongWayBikeRig;
  warningMesh?: THREE.Mesh;
  trajectoryMesh?: THREE.Mesh;
  trajectoryOffsetZ?: number;
  doorZoneMesh?: THREE.Mesh;
  doorOpenProgress: number;
  sideDir: number; // -1 or +1
  startX: number;
  targetX: number;
  alertedByBell: boolean;
  forwardSpeed: number;
  braking: boolean;
  signalState: 'green' | 'yellow' | 'red';
  alwaysGreen?: boolean;
  rearChase?: boolean;
  walkPhase: number;
}

interface ActivePickup {
  kind: 'shield' | 'double' | 'star';
  group: THREE.Group;
  x: number;
  z: number;
  collected: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (summary: RunSummary) => void;
  onPhaseChange: (phase: GamePhase) => void;
  onCrashFlash: () => void;
  onFixieBlocked?: () => void;
}

export class BikeSafetyEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private composerTarget: THREE.WebGLRenderTarget | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private speedGradePass: ShaderPass | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private sunLight!: THREE.DirectionalLight;
  private skyDomeMat!: THREE.ShaderMaterial;
  private skyDomeMesh!: THREE.Mesh;
  private isSoftwareGl = false;

  private frameId = 0;
  private disposed = false;
  private lastTime = 0;
  private elapsed = 0;
  private puddleUniformTime = { value: 0 };

  // Textures & shared resources
  private contactShadowTex!: THREE.CanvasTexture;
  private potholeTex!: THREE.CanvasTexture;
  private puddleTex!: THREE.CanvasTexture;
  private chevronTex!: THREE.CanvasTexture;
  private trajectoryTex!: THREE.CanvasTexture;
  private doorZoneTex!: THREE.CanvasTexture;
  private roadNormalTex!: THREE.CanvasTexture;
  private roadRoughnessTex!: THREE.CanvasTexture;
  private sidewalkTex!: THREE.CanvasTexture;
  private sidewalkNormalTex!: THREE.CanvasTexture;
  private roadTextures: THREE.CanvasTexture[] = [];
  private buildingTextures: THREE.CanvasTexture[] = [];

  // World & Player
  private bikeRig!: PlayerBikeRig;
  private segments: RoadSegment[] = [];
  private hazards: ActiveHazard[] = [];
  private pickups: ActivePickup[] = [];
  private particles: Particle[] = [];
  private speedStreaksGroup!: THREE.Group;
  private speedStreaks: { mesh: THREE.Mesh; speedMul: number }[] = [];
  private bellRingMesh!: THREE.Mesh;
  private bellRingLife = 0;

  // Game State
  private phase: GamePhase = 'title';
  private mode: DifficultyMode = 'city';
  private bikeType: BikeType = 'normal';
  private customPixels: (string | null)[] = buildStarterPixelBike('diamond');
  private titleModalOpen = false;
  private brakeInstallAnim = 1;
  private brakeInstallBurstDone = true;
  private playerX = 3.2; // Start in the red Korean bike lane
  private playerVX = 0;
  private speed = 10.5; // m/s (~38 km/h max, cruising ~22-30 km/h)
  private wheelAngle = 0;
  private crankAngle = 0;
  private leanAngle = 0;
  private steerVisual = 0;

  private distanceM = 0;
  private score = 0;
  private bestScores: Record<DifficultyMode, number> = {
    school: 0,
    city: 0,
    endless: 0,
  };
  private combo = 0;
  private maxCombo = 0;
  private hearts = 3;
  private readonly maxHearts = 3;
  private hasShield = false;
  private doubleScoreTimer = 0;
  private invulnTimer = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;

  private bellCooldown = 0;
  private readonly bellCooldownMax = 1.2;
  private slipTimer = 0;
  private wrongLaneTimer = 0;
  private rearChaseWarned = false;
  private carLaneIntrusionCount = 0;
  private currentIntrusionCounted = false;
  private policePursuitActive = false;
  private policeArrestTimer = 0;
  private policeRig: PoliceCarRig | null = null;
  private policeZ = 14;
  private policeX = 0.8;
  private policeWhistlePlayed = false;
  private arrestedByPolice = false;

  private nextSpawnZ = -48;
  private nextTrafficZ = -26;
  private nextSignalZ = -68;
  private hazardBag: HazardType[] = [];
  private hazardIdSeq = 1;
  private calloutIdSeq = 1;
  private activeCallout: CalloutEvent | null = null;
  private calloutTimer = 0;
  private activeWarning: string | null = null;
  private warningTimer = 0;

  private nearMissCount = 0;
  private defensiveCount = 0;
  private lastFatalHazard: HazardType | null = null;
  private hitCounts: Record<HazardType, number> = this.emptyCounts();
  private encounterCounts: Record<HazardType, number> = this.emptyCounts();
  private lastHudPush = 0;

  // Camera state
  private camPos = new THREE.Vector3(3.2, 2.5, 4.8);
  private camLook = new THREE.Vector3(3.2, 1.0, -8);

  // Input state (separated held vs edge-triggered)
  private heldKeys = new Set<string>();
  private mobileInput: MobileInputState = { left: false, right: false, accel: false, brake: false };
  private brakeSoundCooldown = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.loadBestScores();
    this.initThree();
    this.buildEnvironment();
    this.buildPlayer();
    this.buildParticles();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private emptyCounts(): Record<HazardType, number> {
    return {
      dooring: 0,
      blind_car: 0,
      smombie: 0,
      pothole: 0,
      roadwork: 0,
      scooter: 0,
      red_signal: 0,
      traffic_car: 0,
      pet: 0,
      kids: 0,
      wrong_way_bike: 0,
      puddle: 0,
      gravel: 0,
    };
  }

  private loadBestScores(): void {
    try {
      const raw = localStorage.getItem('riding_safe_best_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.bestScores = { ...this.bestScores, ...parsed };
      }
    } catch {
      // ignore storage errors
    }
  }

  private saveBestScore(mode: DifficultyMode, score: number): number {
    if (score > this.bestScores[mode]) {
      this.bestScores[mode] = score;
      try {
        localStorage.setItem('riding_safe_best_v1', JSON.stringify(this.bestScores));
      } catch {
        // ignore
      }
    }
    return this.bestScores[mode];
  }

  private detectSoftwareGl(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initThree(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const pixelRatio = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);

    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2', {
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });

    this.renderer = gl2
      ? new THREE.WebGLRenderer({
          canvas,
          context: gl2,
          antialias: !this.isSoftwareGl,
          powerPreference: 'high-performance',
        })
      : new THREE.WebGLRenderer({
          antialias: !this.isSoftwareGl,
          powerPreference: 'high-performance',
        });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0xa6c8ea);
    this.scene.background = horizonColor;
    this.scene.fog = new THREE.Fog(horizonColor, 72, 175);

    // WebGL2 GLSL3 Procedural Atmospheric Sky Dome (crisp blue sky + soft drifting clouds)
    this.skyDomeMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.42, 0.65, 0.35).normalize() },
      },
      vertexShader: /* glsl */ `
        out vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        in vec3 vWorldDir;
        uniform float uTime;
        uniform vec3 uSunDir;
        out vec4 fragColor;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise2(p);
            p *= 2.04;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);

          vec3 zenith = vec3(0.12, 0.34, 0.72);
          vec3 midSky = vec3(0.32, 0.58, 0.86);
          vec3 horizon = vec3(0.68, 0.82, 0.94);

          vec3 sky = mix(horizon, midSky, smoothstep(0.0, 0.28, h));
          sky = mix(sky, zenith, smoothstep(0.22, 0.88, h));

          // Soft sun corona without blinding glare
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          sky += vec3(0.95, 0.84, 0.62) * pow(sunDot, 14.0) * 0.14;
          sky += vec3(1.0, 0.96, 0.86) * smoothstep(0.996, 0.9992, sunDot) * 0.42;

          // Drifting cloud layer
          if (dir.y > 0.03) {
            vec2 cloudUv = dir.xz / (dir.y + 0.18) * 1.45;
            cloudUv.y -= uTime * 0.032;
            cloudUv.x += uTime * 0.012;
            float n = fbm(cloudUv);
            float cloudMask = smoothstep(0.50, 0.75, n) * smoothstep(0.03, 0.22, dir.y);
            vec3 cloudCol = mix(vec3(0.84, 0.89, 0.95), vec3(0.95, 0.91, 0.84), pow(sunDot, 4.0) * 0.35);
            sky = mix(sky, cloudCol, cloudMask * 0.68);
          }

          fragColor = vec4(sky, 1.0);
        }
      `,
    });
    this.skyDomeMesh = new THREE.Mesh(new THREE.SphereGeometry(168, 32, 20), this.skyDomeMat);
    this.scene.add(this.skyDomeMesh);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.28;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.1, 200);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // Balanced daylight key + sky/ground fill + subtle rim separation
    const hemi = new THREE.HemisphereLight(0xcbe4ff, 0x475569, 0.52);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xfff3de, 1.3);
    this.sunLight.position.set(16, 28, 14);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    const d = 26;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.32);
    rimLight.position.set(-14, 12, -20);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.contactShadowTex = createContactShadowTexture();
    this.potholeTex = createPotholeTexture(maxAniso);
    this.puddleTex = createPuddleTexture(maxAniso);
    this.chevronTex = createWarningChevronTexture(maxAniso);
    this.trajectoryTex = createTrajectoryArrowTexture(maxAniso);
    this.doorZoneTex = createDoorZoneTexture(maxAniso);
    this.roadNormalTex = createRoadNormalMap(maxAniso);
    this.roadRoughnessTex = createRoadRoughnessMap(maxAniso);
    this.sidewalkTex = createSidewalkTexture(maxAniso);
    this.sidewalkNormalTex = createSidewalkNormalMap(maxAniso);
    this.roadTextures = [
      createRoadTexture(maxAniso, false),
      createRoadTexture(maxAniso, true),
    ];
    for (let i = 0; i < 4; i++) {
      this.buildingTextures.push(createBuildingFacadeTexture(maxAniso, i));
    }

    // WebGL2 MSAA HalfFloat Post-Processing Pipeline (Hardware GPU only)
    // High bloom threshold (1.55) ensures only bright emissive lights (signals, blinkers, brake lights) glow
    if (!this.isSoftwareGl) {
      this.composerTarget = new THREE.WebGLRenderTarget(
        Math.max(1, Math.floor(width * pixelRatio)),
        Math.max(1, Math.floor(height * pixelRatio)),
        {
          type: THREE.HalfFloatType,
          samples: 4,
        }
      );
      this.composer = new EffectComposer(this.renderer, this.composerTarget);
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
      this.composer.addPass(new RenderPass(this.scene, this.camera));

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.16,
        0.25,
        1.55
      );
      this.composer.addPass(this.bloomPass);

      this.speedGradePass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          uSpeedRatio: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          uniform float uSpeedRatio;
          varying vec2 vUv;
          void main() {
            vec2 centered = vUv - 0.5;
            float dist = length(centered);
            // Subtle speed chromatic edge & gentle focus vignette
            float shift = uSpeedRatio * 0.0022 * dist;
            vec2 dir = dist > 0.0001 ? centered / dist : vec2(0.0);
            float r = texture2D(tDiffuse, vUv + dir * shift).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - dir * shift).b;
            vec3 col = vec3(r, g, b);
            float vig = 1.0 - smoothstep(0.48, 0.98, dist) * (0.12 + uSpeedRatio * 0.12);
            col *= vig;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      this.composer.addPass(this.speedGradePass);
      this.composer.addPass(new OutputPass());
    }
  }

  private buildEnvironment(): void {
    // Wide ground plane extending out to horizon so world is never boxed in a void
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x5c7150, roughness: 0.95 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -40);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const roadMatNormal = new THREE.MeshStandardMaterial({
      map: this.roadTextures[0],
      normalMap: this.roadNormalTex,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: this.roadRoughnessTex,
      roughness: 0.94,
      metalness: 0.04,
    });
    const roadMatCross = new THREE.MeshStandardMaterial({
      map: this.roadTextures[1],
      normalMap: this.roadNormalTex,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: this.roadRoughnessTex,
      roughness: 0.94,
      metalness: 0.04,
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xaab4c2,
      map: this.sidewalkTex,
      normalMap: this.sidewalkNormalTex,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.9,
      metalness: 0.02,
    });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x7c8b9e, roughness: 0.85 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.35 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfde68a, emissiveIntensity: 0.65 });
    const fencePostMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.52, metalness: 0.2 });
    const fenceRailMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.5, metalness: 0.15 });

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const segGroup = new THREE.Group();
      const hasCrosswalk = i % 3 === 1;
      const zPos = 18 - i * SEGMENT_LEN;
      segGroup.position.z = zPos;

      // Asphalt surface elevated by 0.025m above base ground
      const roadMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(10.4, SEGMENT_LEN),
        hasCrosswalk ? roadMatCross : roadMatNormal
      );
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.y = 0.025;
      roadMesh.receiveShadow = true;
      segGroup.add(roadMesh);

      // Left & Right sidewalks (raised curb at y=0.14) + pedestrian safety guardrails
      [-8.4, 8.4].forEach((sx) => {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, SEGMENT_LEN), sidewalkMat);
        sw.position.set(sx, 0.07, 0);
        sw.receiveShadow = true;
        segGroup.add(sw);

        const curbX = sx > 0 ? 5.25 : -5.25;
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.17, SEGMENT_LEN), curbMat);
        curb.position.set(curbX, 0.085, 0);
        segGroup.add(curb);

        // Korean school-zone yellow/white pedestrian guardrails (leave openings on crosswalk segments)
        const fenceX = sx > 0 ? 5.42 : -5.42;
        const railRuns = hasCrosswalk ? [-12, 12] : [-12, 0, 12];
        railRuns.forEach((rz) => {
          const railSpan = 9.5;
          const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, railSpan), fenceRailMat);
          topRail.position.set(fenceX, 0.92, rz);
          segGroup.add(topRail);

          const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, railSpan), fencePostMat);
          midRail.position.set(fenceX, 0.56, rz);
          segGroup.add(midRail);

          [-4.2, 0, 4.2].forEach((pz) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.9, 8), fencePostMat);
            post.position.set(fenceX, 0.55, rz + pz);
            segGroup.add(post);
          });
        });
      });

      // Roadside trees & streetlights
      for (let t = -1; t <= 1; t += 2) {
        const localZ = t * 9;
        [-6.6, 6.6].forEach((tx, sideIdx) => {
          if ((i + sideIdx + (t > 0 ? 1 : 0)) % 2 === 0) {
            const tree = createTreeGroup();
            tree.position.set(tx, 0.14, localZ);
            const scale = 0.88 + ((i * 7 + sideIdx * 3) % 5) * 0.06;
            tree.scale.setScalar(scale);
            segGroup.add(tree);
          } else {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.8, 8), poleMat);
            pole.position.set(tx > 0 ? 5.75 : -5.75, 2.54, localZ);
            pole.castShadow = true;
            segGroup.add(pole);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.09), poleMat);
            arm.position.set(tx > 0 ? 5.25 : -5.25, 4.9, localZ);
            segGroup.add(arm);

            const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.2), lampMat);
            lamp.position.set(tx > 0 ? 4.8 : -4.8, 4.85, localZ);
            segGroup.add(lamp);
          }
        });
      }

      // Urban Korean buildings along outer edges (leave alley gaps on crosswalk segments!)
      const bPositions = hasCrosswalk ? [-11, 11] : [-12, 0, 12];
      bPositions.forEach((bz, bIdx) => {
        [-15.2, 15.2].forEach((bx, sideIdx) => {
          const texIdx = (i + bIdx + sideIdx) % this.buildingTextures.length;
          const height = 9 + ((i * 3 + bIdx * 5 + sideIdx) % 4) * 3.2;
          const bMat = new THREE.MeshStandardMaterial({
            map: this.buildingTextures[texIdx],
            roughness: 0.78,
            metalness: 0.06,
          });
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
          const building = new THREE.Mesh(
            new THREE.BoxGeometry(7.2, height, 10.2),
            [bMat, bMat, roofMat, roofMat, bMat, bMat]
          );
          building.position.set(bx, height / 2 + 0.12, bz);
          building.castShadow = true;
          building.receiveShadow = true;
          segGroup.add(building);
        });
      });

      this.scene.add(segGroup);
      this.segments.push({ group: segGroup, z: zPos, hasCrosswalk });
    }
  }

  private buildPlayer(): void {
    this.bikeRig = createPlayerBikeRig(this.contactShadowTex);
    applyBikeStyle(this.bikeRig, this.bikeType);
    this.bikeRig.root.position.set(this.playerX, 0, 0);
    this.scene.add(this.bikeRig.root);

    // Expanding Bell Soundwave Torus
    this.bellRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.95, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.bellRingMesh.rotation.x = -Math.PI / 2;
    this.bellRingMesh.position.set(this.playerX, 0.35, -0.5);
    this.bellRingMesh.visible = false;
    this.scene.add(this.bellRingMesh);
  }

  private buildParticles(): void {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < 42; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.4 });
    }

    // Subtle 3D peripheral wind streaks when cycling fast
    this.speedStreaksGroup = new THREE.Group();
    const streakGeo = new THREE.BoxGeometry(0.025, 0.025, 2.2);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(streakGeo, mat);
      const side = i % 2 === 0 ? -1 : 1;
      mesh.position.set(
        side * (2.6 + Math.random() * 2.8),
        0.9 + Math.random() * 2.1,
        -4 - Math.random() * 24
      );
      this.speedStreaksGroup.add(mesh);
      this.speedStreaks.push({ mesh, speedMul: 1.4 + Math.random() * 0.8 });
    }
    this.scene.add(this.speedStreaksGroup);
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count: number, spread = 4.5): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.life <= 0) {
        p.mesh.visible = true;
        p.mesh.position.set(x, y, z);
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        p.vx = (Math.random() - 0.5) * spread;
        p.vy = 1.5 + Math.random() * spread * 0.9;
        p.vz = (Math.random() - 0.5) * spread;
        p.maxLife = 0.35 + Math.random() * 0.25;
        p.life = p.maxLife;
        spawned++;
      }
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const pixelRatio = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    if (this.composer) {
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.mobileInput = { left: false, right: false, accel: false, brake: false };
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }

    if (this.phase === 'title') {
      if (!this.titleModalOpen && (code === 'Enter' || code === 'Space')) {
        this.startRun(this.mode);
      }
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (this.phase === 'playing') {
        this.pause();
        return;
      }
      if (this.phase === 'paused') {
        this.resume();
        return;
      }
    }

    if (this.phase !== 'playing') return;

    const wasHeld = this.heldKeys.has(code);
    this.heldKeys.add(code);

    // Edge-triggered horn/bell action (E, Space, Shift, F)
    if (!wasHeld) {
      if (
        code === 'Space' ||
        code === 'KeyE' ||
        code === 'ShiftLeft' ||
        code === 'ShiftRight' ||
        code === 'KeyF'
      ) {
        this.triggerBell();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  // Public Controls for React UI / Touch
  public setMobileInput(patch: Partial<MobileInputState>): void {
    this.mobileInput = { ...this.mobileInput, ...patch };
  }

  public triggerBell(): void {
    if (this.phase !== 'playing') return;
    soundEngine.unlock();
    if (this.bellCooldown > 0) return;

    this.bellCooldown = this.bellCooldownMax;
    this.bellRingLife = 0.55;
    this.bellRingMesh.visible = true;
    this.bellRingMesh.position.set(this.playerX, 0.35, -0.5);
    this.bellRingMesh.scale.setScalar(1);
    soundEngine.playBell();

    // Check if any smombie, kids, or pet is within 32m ahead
    let alertedAny = false;
    for (const h of this.hazards) {
      if (!h.alertedByBell && h.z < 1 && h.z > -34) {
        if (h.type === 'smombie') {
          h.alertedByBell = true;
          h.targetX = 4.75;
          if (h.pedRig) {
            h.pedRig.alertMark.visible = true;
            h.pedRig.phoneGlow.visible = false;
          }
          if (h.trajectoryMesh) {
            h.trajectoryMesh.rotation.z = 0;
            (h.trajectoryMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
          }
          if (!h.defensiveAwarded) {
            h.defensiveAwarded = true;
            this.defensiveCount++;
            this.awardBonus('경적 방어운전!', 150, 'good');
          }
          alertedAny = true;
        } else if (h.type === 'kids') {
          h.alertedByBell = true;
          h.targetX = 4.85;
          if (h.kidsRig) h.kidsRig.alertMark.visible = true;
          if (h.trajectoryMesh) {
            h.trajectoryMesh.rotation.z = 0;
            (h.trajectoryMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
          }
          if (!h.defensiveAwarded) {
            h.defensiveAwarded = true;
            this.defensiveCount++;
            this.awardBonus('어린이 보호 경적!', 160, 'good');
          }
          alertedAny = true;
        } else if (h.type === 'pet') {
          h.alertedByBell = true;
          h.targetX = 4.8;
          if (h.dogRig) h.dogRig.alertMark.visible = true;
          if (h.trajectoryMesh) {
            h.trajectoryMesh.rotation.z = 0;
            (h.trajectoryMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
          }
          if (!h.defensiveAwarded) {
            h.defensiveAwarded = true;
            this.defensiveCount++;
            this.awardBonus('반려동물 안전 대응!', 160, 'good');
          }
          alertedAny = true;
        }
      }
    }
    if (!alertedAny) {
      this.pushCallout('따르릉~ 전방 주의 알림', 0, 'warn');
    }
  }

  public setMode(mode: DifficultyMode): void {
    this.mode = mode;
  }

  public setTitleModalOpen(open: boolean): void {
    this.titleModalOpen = open;
  }

  public setBikeType(bikeType: BikeType, pixels?: (string | null)[]): void {
    this.bikeType = bikeType;
    if (pixels) {
      this.customPixels = pixels;
    }

    if (this.bikeRig) {
      applyBikeStyle(this.bikeRig, bikeType, this.customPixels);
      if (bikeType === 'fixie') {
        this.brakeInstallAnim = 0;
        this.brakeInstallBurstDone = false;
        this.bikeRig.brakeGlowMat.emissiveIntensity = 2.6;
        this.bikeRig.frontBrakeGroup.position.set(0, 0.48, -0.14);
        this.bikeRig.rearBrakeGroup.position.set(0, 0.42, 0.12);
      } else {
        this.brakeInstallAnim = 1;
        this.brakeInstallBurstDone = true;
        this.bikeRig.brakeGlowMat.emissiveIntensity = 0.25;
        this.bikeRig.frontBrakeGroup.position.set(0, 0, 0);
        this.bikeRig.rearBrakeGroup.position.set(0, 0, 0);
        this.bikeRig.frontBrakeGroup.scale.setScalar(1);
        this.bikeRig.rearBrakeGroup.scale.setScalar(1);
      }
    }
  }

  public setCustomPixelBike(pixels: (string | null)[]): void {
    this.customPixels = pixels;
    if (this.bikeRig && this.bikeType === 'custom') {
      applyBikeStyle(this.bikeRig, 'custom', pixels);
    }
  }

  public startRun(mode: DifficultyMode, bikeType?: BikeType, pixels?: (string | null)[]): void {
    if (bikeType && (pixels || bikeType !== this.bikeType)) {
      this.setBikeType(bikeType, pixels);
    }
    if (this.bikeType === 'fixie') {
      soundEngine.unlock();
      soundEngine.playCarHorn();
      this.callbacks.onFixieBlocked?.();
      return;
    }

    soundEngine.unlock();
    this.mode = mode;
    this.clearEntities();

    this.phase = 'playing';
    this.callbacks.onPhaseChange('playing');

    this.playerX = 3.2;
    this.playerVX = 0;
    this.speed = mode === 'school' ? 9.5 : 11.2;
    this.distanceM = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hearts = this.maxHearts;
    this.hasShield = false;
    this.doubleScoreTimer = 0;
    this.invulnTimer = 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.bellCooldown = 0;
    this.slipTimer = 0;
    this.wrongLaneTimer = 0;
    this.rearChaseWarned = false;
    this.carLaneIntrusionCount = 0;
    this.currentIntrusionCounted = false;
    this.policePursuitActive = false;
    this.policeArrestTimer = 0;
    this.policeWhistlePlayed = false;
    this.arrestedByPolice = false;
    this.nextSpawnZ = -44;
    this.nextTrafficZ = -24;
    this.nextSignalZ = -68;
    this.hazardBag = [];
    this.activeCallout = null;
    this.activeWarning = null;
    this.nearMissCount = 0;
    this.defensiveCount = 0;
    this.lastFatalHazard = null;
    this.hitCounts = this.emptyCounts();
    this.encounterCounts = this.emptyCounts();
    this.heldKeys.clear();

    this.bikeRig.root.position.set(this.playerX, 0, 0);
    this.bikeRig.root.visible = true;
    this.bikeRig.shieldBubble.visible = false;

    this.pushCallout(
      mode === 'school'
        ? '스쿨존 등굣길 주행 시작!'
        : mode === 'city'
        ? '도심 자전거 도로 안전 챌린지!'
        : '무한 안전 라이딩 챌린지!',
      0,
      'good'
    );
    this.pushHud(true);
  }

  public pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.heldKeys.clear();
    soundEngine.updateRollingSound(0, true, false);
    this.callbacks.onPhaseChange('paused');
  }

  public resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.lastTime = performance.now();
    this.callbacks.onPhaseChange('playing');
  }

  public returnToTitle(): void {
    this.clearEntities();
    this.phase = 'title';
    this.playerX = 3.2;
    this.speed = 9.2;
    this.bikeRig.root.visible = true;
    this.bikeRig.shieldBubble.visible = false;
    soundEngine.updateRollingSound(0, true, false);
    this.callbacks.onPhaseChange('title');
  }

  private clearEntities(): void {
    for (const h of this.hazards) {
      this.scene.remove(h.group);
      if (h.warningMesh) this.scene.remove(h.warningMesh);
      if (h.trajectoryMesh) this.scene.remove(h.trajectoryMesh);
      if (h.doorZoneMesh) this.scene.remove(h.doorZoneMesh);
    }
    this.hazards = [];
    for (const p of this.pickups) {
      this.scene.remove(p.group);
    }
    this.pickups = [];
    if (this.policeRig) {
      this.scene.remove(this.policeRig.root);
      this.policeRig = null;
    }
  }

  private createTrajectoryMesh(
    length: number,
    width: number,
    colorHex: number,
    rotZ: number,
    x: number,
    z: number
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(length, width),
      new THREE.MeshBasicMaterial({
        map: this.trajectoryTex,
        color: colorHex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    mesh.rotation.set(-Math.PI / 2, 0, rotZ);
    mesh.position.set(x, 0.048, z);
    this.scene.add(mesh);
    return mesh;
  }

  private getTargetDistance(): number | null {
    if (this.mode === 'school') return 800;
    if (this.mode === 'city') return 1500;
    return null;
  }

  private getZoneInfo(): { index: number; name: string } {
    if (this.distanceM < 400) return { index: 1, name: '1구간 · 주택가 골목' };
    if (this.distanceM < 900) return { index: 2, name: '2구간 · 스쿨존 교차로' };
    return { index: 3, name: '3구간 · 도심 간선도로' };
  }

  private awardBonus(label: string, basePts: number, tone: 'good' | 'warn' | 'danger'): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const mult = (1 + Math.min(this.combo - 1, 8) * 0.2) * (this.doubleScoreTimer > 0 ? 2 : 1);
    const pts = Math.round(basePts * mult);
    this.score += pts;
    this.pushCallout(label, pts, tone);
  }

  private pushCallout(text: string, points: number, tone: 'good' | 'warn' | 'danger'): void {
    this.activeCallout = {
      id: this.calloutIdSeq++,
      text,
      points,
      tone,
    };
    this.calloutTimer = 1.65;
  }

  private pushWarning(text: string, duration = 1.2): void {
    this.activeWarning = text;
    this.warningTimer = duration;
  }

  private loop = (now: number): void => {
    if (this.disposed) return;

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.update(dt);
    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(() => this.loop(performance.now()));
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    this.elapsed += dt;
    this.puddleUniformTime.value = this.elapsed;
    this.trajectoryTex.offset.x -= dt * 1.9;
    this.skyDomeMat.uniforms.uTime.value = this.elapsed;
    this.skyDomeMesh.position.set(this.playerX, 0, -24);

    if (this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'victory') {
      soundEngine.updateRollingSound(0, true, false);
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.4);
      this.updateCamera(dt);
      return;
    }

    if (this.phase === 'title') {
      this.updateTitleCruise(dt);
      return;
    }

    // Active Playing Loop
    this.updateTimers(dt);
    this.updatePlayer(dt);
    this.scrollWorld(dt);
    this.spawnSystem();
    this.updateHazards(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateCamera(dt);

    // Check Victory on finite routes
    const targetDist = this.getTargetDistance();
    if (targetDist !== null && this.distanceM >= targetDist) {
      this.finishRun(true);
      return;
    }

    if (this.elapsed - this.lastHudPush >= 0.05) {
      this.pushHud(false);
    }
  }

  private updateTitleCruise(dt: number): void {
    const cruiseSpeed = 8.8;
    this.playerX = THREE.MathUtils.damp(this.playerX, 3.2 + Math.sin(this.elapsed * 0.55) * 0.35, 3, dt);
    this.scrollSegmentsOnly(cruiseSpeed * dt);

    this.wheelAngle -= (cruiseSpeed * dt) / 0.34;
    this.crankAngle -= cruiseSpeed * dt * 1.25;
    this.animateBikeRig(0, 0);

    // Animate fixie brake installation motion smoothly onto fork & handlebar
    if (this.brakeInstallAnim < 1) {
      this.brakeInstallAnim = Math.min(1, this.brakeInstallAnim + dt * 0.92);
      const t = this.brakeInstallAnim;
      const ease = 1 - Math.pow(1 - t, 3);
      const lift = (1 - ease) * 0.48;
      const pulseScale = 1 + Math.sin(t * Math.PI) * 0.26;
      this.bikeRig.frontBrakeGroup.position.set(0, lift, -(1 - ease) * 0.14);
      this.bikeRig.rearBrakeGroup.position.set(0, lift * 0.88, (1 - ease) * 0.12);
      this.bikeRig.frontBrakeGroup.scale.setScalar(pulseScale);
      this.bikeRig.rearBrakeGroup.scale.setScalar(pulseScale);
      this.bikeRig.brakeGlowMat.emissiveIntensity = 1.6 + Math.sin(this.elapsed * 18) * 1.2;

      if (t >= 1 && !this.brakeInstallBurstDone) {
        this.brakeInstallBurstDone = true;
        this.bikeRig.frontBrakeGroup.position.set(0, 0, 0);
        this.bikeRig.rearBrakeGroup.position.set(0, 0, 0);
        this.bikeRig.frontBrakeGroup.scale.setScalar(1);
        this.bikeRig.rearBrakeGroup.scale.setScalar(1);
        this.bikeRig.brakeGlowMat.emissiveIntensity = 0.6;
        this.spawnBurst(this.playerX, 0.95, -0.45, 0x38bdf8, 12, 3.4);
        this.spawnBurst(this.playerX, 0.72, 0.45, 0xfacc15, 10, 3.0);
        soundEngine.playPickup();
      }
    }

    this.updateParticles(dt);

    // Sweeping GTA-style camera pan behind and around the cyclist
    const angle = Math.sin(this.elapsed * 0.35) * 0.42;
    _vec3A.set(
      this.playerX + Math.sin(angle) * 3.8,
      2.1 + Math.sin(this.elapsed * 0.4) * 0.25,
      4.5 + Math.cos(angle) * 0.7
    );
    this.camPos.lerp(_vec3A, 1 - Math.exp(-4 * dt));
    _vec3B.set(this.playerX - 0.4, 1.05, -7.5);
    this.camLook.lerp(_vec3B, 1 - Math.exp(-5 * dt));

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.sunLight.position.set(this.playerX + 16, 28, 14);
    this.sunLight.target.position.set(this.playerX, 0, -10);
  }

  private updateTimers(dt: number): void {
    if (this.bellCooldown > 0) this.bellCooldown = Math.max(0, this.bellCooldown - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.doubleScoreTimer > 0) this.doubleScoreTimer = Math.max(0, this.doubleScoreTimer - dt);
    if (this.calloutTimer > 0) {
      this.calloutTimer -= dt;
      if (this.calloutTimer <= 0) this.activeCallout = null;
    }
    if (this.warningTimer > 0) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) this.activeWarning = null;
    }
    if (this.brakeSoundCooldown > 0) this.brakeSoundCooldown -= dt;

    if (this.bellRingLife > 0) {
      this.bellRingLife -= dt;
      const progress = 1 - Math.max(0, this.bellRingLife) / 0.55;
      const scale = 1 + progress * 14;
      this.bellRingMesh.scale.setScalar(scale);
      this.bellRingMesh.position.x = this.playerX;
      (this.bellRingMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.72;
      if (this.bellRingLife <= 0) {
        this.bellRingMesh.visible = false;
      }
    }
  }

  private updatePlayer(dt: number): void {
    if (this.policePursuitActive) {
      this.updatePolicePursuit(dt);
      return;
    }

    const left = this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft') || this.mobileInput.left;
    const right = this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight') || this.mobileInput.right;
    const accel = this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp') || this.mobileInput.accel;
    const brake = this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown') || this.mobileInput.brake;

    // Check if an active yellow/red traffic light stop-line is ahead
    const nearSignalStop = this.hazards.some((h) => {
      if (h.type !== 'red_signal' || h.alwaysGreen || h.defensiveAwarded || h.hit) return false;
      const stopLineWorldZ = h.z + 4.6;
      return stopLineWorldZ > -22 && stopLineWorldZ <= 1.8;
    });

    // Difficulty speed ramp + selected bike handling character
    const bikeSpeedMul = this.bikeType === 'pro' ? 1.07 : this.bikeType === 'ttareungi' ? 0.95 : 1.0;
    const zoneFactor = Math.min(this.distanceM / 1400, 1);
    const baseCruise = ((this.mode === 'school' ? 9.2 : 10.6) + zoneFactor * 3.2) * bikeSpeedMul;
    const maxSpeed = baseCruise + (this.bikeType === 'pro' ? 5.0 : 4.4);
    const minSpeed = nearSignalStop ? 0.35 : 1.2;

    let targetSpeed = baseCruise;
    if (accel) targetSpeed = maxSpeed;
    if (brake) targetSpeed = minSpeed;

    const accelRate = brake ? 13.5 : accel ? (this.bikeType === 'pro' ? 4.9 : 4.2) : 2.8;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, accelRate, dt);

    // Brake light & brake audio
    this.bikeRig.tailLightMat.emissiveIntensity = brake ? 3.2 : 0.65;
    if (brake && this.speed > 5.0 && this.brakeSoundCooldown <= 0) {
      soundEngine.playBrake();
      this.brakeSoundCooldown = 0.25;
      this.spawnBurst(this.playerX, 0.08, 0.6, 0x94a3b8, 2, 1.5);
    }

    if (this.slipTimer > 0) this.slipTimer = Math.max(0, this.slipTimer - dt);

    // Track car-lane encroachments (repeated violations dispatch police; 3s continuous triggers rear-end car)
    if (this.playerX < 1.95) {
      this.wrongLaneTimer += dt;
      if (this.wrongLaneTimer >= 0.65 && !this.currentIntrusionCounted) {
        this.currentIntrusionCounted = true;
        this.carLaneIntrusionCount++;
        if (this.carLaneIntrusionCount === 1) {
          this.pushWarning('차도 침범 주의! (1/3회) 우측 붉은 자전거 도로로 복귀하세요', 1.2);
        } else if (this.carLaneIntrusionCount === 2) {
          soundEngine.playCarHorn();
          this.pushWarning('차도 반복 침범 경고! (2/3회) 재침범 시 경찰이 출동합니다!', 1.5);
        } else if (this.carLaneIntrusionCount >= 3) {
          this.startPolicePursuit();
          return;
        }
      }

      if (this.wrongLaneTimer >= 3.0) {
        const activeChaseExists = this.hazards.some((h) => h.rearChase && h.z > -4 && !h.hit);
        if (!activeChaseExists && this.invulnTimer <= 0) {
          this.spawnRearChaseCar();
        }
        this.wrongLaneTimer = 0;
        this.rearChaseWarned = false;
      } else if (this.wrongLaneTimer >= 2.0) {
        if (!this.rearChaseWarned) {
          this.rearChaseWarned = true;
          soundEngine.playCarHorn();
        }
        const remain = Math.max(0.1, 3.0 - this.wrongLaneTimer).toFixed(1);
        this.pushWarning(
          this.playerX < -1.1
            ? `중앙선 침범! ${remain}초 후 차량 충돌 — 자전거 도로로 복귀!`
            : `후방 차량 접근! ${remain}초 안에 우측 자전거 도로로 피하세요!`,
          0.35
        );
      } else if (this.wrongLaneTimer > 0.45 && !this.activeWarning) {
        this.pushWarning(
          this.playerX < -1.1
            ? '중앙선 침범! 역주행 차량 충돌 위험 (자전거 도로 복귀)'
            : '차도 주행 위험! 3초 이상 달리면 뒤차가 추돌합니다',
          0.9
        );
      }
    } else {
      this.wrongLaneTimer = 0;
      this.rearChaseWarned = false;
      if (this.playerX >= 2.0) {
        this.currentIntrusionCounted = false;
      }
    }

    // Lateral steering (responsive, analog-smooth counter-lean, with wet/gravel slip wobble)
    const steerInput = (right ? 1 : 0) - (left ? 1 : 0);
    const maxLateralSpeed = 6.8;
    const slipWobble = this.slipTimer > 0 ? Math.sin(this.elapsed * 26) * 3.8 : 0;
    const targetVX = steerInput * maxLateralSpeed + slipWobble;
    this.playerVX = THREE.MathUtils.damp(this.playerVX, targetVX, steerInput !== 0 ? 11 : 13, dt);
    this.playerX += this.playerVX * dt;
    this.playerX = THREE.MathUtils.clamp(this.playerX, -ROAD_HALF_WIDTH, ROAD_HALF_WIDTH);

    // Distance & continuous riding score (higher reward for staying inside the dedicated bike lane)
    const deltaDist = this.speed * dt;
    this.distanceM += deltaDist;
    const laneSafetyMult = this.playerX >= 2.0 ? 1.25 : 0.7;
    const scoreMult =
      (this.doubleScoreTimer > 0 ? 2 : 1) *
      (1 + Math.min(this.combo, 8) * 0.1) *
      laneSafetyMult;
    this.score += deltaDist * 4.5 * scoreMult;

    // Bike kinematics & invulnerability blink
    this.wheelAngle -= deltaDist / 0.34;
    this.crankAngle -= deltaDist * 1.25;
    this.leanAngle = THREE.MathUtils.damp(this.leanAngle, -this.playerVX * 0.075, 10, dt);
    this.steerVisual = THREE.MathUtils.damp(this.steerVisual, -this.playerVX * 0.045, 12, dt);

    this.bikeRig.root.position.set(this.playerX, 0, 0);
    this.bikeRig.contactShadow.scale.setScalar(1);
    this.bikeRig.shieldBubble.visible = this.hasShield;
    if (this.hasShield) {
      this.bikeRig.shieldBubble.rotation.y += dt * 1.5;
    }

    if (this.invulnTimer > 0) {
      this.bikeRig.leanGroup.visible = Math.floor(this.invulnTimer * 18) % 2 === 0;
    } else {
      this.bikeRig.leanGroup.visible = true;
    }

    this.animateBikeRig(this.leanAngle, this.steerVisual);

    // Rolling sound
    soundEngine.updateRollingSound((this.speed - 2) / 14, true, true);
  }

  private animateBikeRig(lean: number, steer: number): void {
    this.bikeRig.leanGroup.rotation.z = lean;
    this.bikeRig.forkGroup.rotation.y = steer;
    this.bikeRig.frontWheel.rotation.x = this.wheelAngle;
    this.bikeRig.rearWheel.rotation.x = this.wheelAngle;
    this.bikeRig.crankGroup.rotation.x = this.crankAngle;

    // Pedaling legs alternating with crank phase
    this.bikeRig.leftLegPivot.rotation.x = Math.sin(this.crankAngle) * 0.42 - 0.12;
    this.bikeRig.rightLegPivot.rotation.x = Math.sin(this.crankAngle + Math.PI) * 0.42 - 0.12;
    this.bikeRig.riderTorso.rotation.z = lean * 0.35;
    if (this.bikeType === 'custom') {
      this.bikeRig.customVoxelGroup.position.y = Math.abs(Math.sin(this.crankAngle)) * 0.016;
    } else {
      this.bikeRig.customVoxelGroup.position.y = 0;
    }
  }

  private scrollWorld(dt: number): void {
    const dz = this.speed * dt;
    this.scrollSegmentsOnly(dz);
    this.nextSpawnZ += dz;
    this.nextTrafficZ += dz;
    this.nextSignalZ += dz;
  }

  private scrollSegmentsOnly(dz: number): void {
    for (const seg of this.segments) {
      seg.z += dz;
      if (seg.z > 42) {
        seg.z -= TOTAL_ROAD_LEN;
      }
      seg.group.position.z = seg.z;
    }
  }

  private spawnSystem(): void {
    // Dedicated signalized intersections on the road every 78~98m so traffic lights are a core road rule
    while (this.nextSignalZ > -128) {
      const signalGap = this.mode === 'school' ? 82 + Math.random() * 18 : 92 + Math.random() * 22;
      this.spawnTrafficSignal(this.nextSignalZ);
      this.nextSignalZ -= signalGap;
    }

    while (this.nextSpawnZ > -118) {
      const gap = this.mode === 'school'
        ? 24 + Math.random() * 8
        : Math.max(16.5, 23 - (this.distanceM / 1500) * 5) + Math.random() * 7;
      this.nextSpawnZ -= gap;
      // Leave clear braking approach before/after traffic signal stop lines
      const nearSignal = this.hazards.some(
        (h) => h.type === 'red_signal' && Math.abs(h.z - this.nextSpawnZ) < 14
      );
      if (!nearSignal) {
        this.spawnHazardCluster(this.nextSpawnZ);
        if (Math.random() < 0.4) {
          this.spawnPickup(this.nextSpawnZ - gap * 0.45);
        }
      }
    }

    // Spawn moving road traffic steadily across right-forward, center-forward, and oncoming car lanes
    while (this.nextTrafficZ > -125) {
      const trafficGap = this.mode === 'school'
        ? 19 + Math.random() * 9
        : Math.max(14, 19 - (this.distanceM / 1600) * 4) + Math.random() * 7;
      this.nextTrafficZ -= trafficGap;
      this.spawnTrafficCar(this.nextTrafficZ);
    }
  }

  private spawnTrafficSignal(z: number): void {
    const id = this.hazardIdSeq++;
    const alwaysGreen = Math.random() < 0.28;
    if (!alwaysGreen) {
      this.encounterCounts.red_signal++;
    }

    const signalRig = createSignalGantry();
    signalRig.root.position.set(0, 0, z);
    this.scene.add(signalRig.root);

    // Local zebra crosswalk stripes just under/ahead of gantry (local z = 1.8)
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    for (let sx = -3.8; sx <= 3.85; sx += 0.95) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 2.3), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(sx, 0.036, 1.8);
      signalRig.root.add(stripe);
    }

    // Crisp white stop line 4.6m in front of gantry (local coords!)
    const stopLine = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    );
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(0, 0.042, 4.6);
    signalRig.root.add(stopLine);

    this.hazards.push({
      id,
      type: 'red_signal',
      group: signalRig.root,
      x: 0,
      z,
      width: 10.4,
      depth: 1.0,
      height: 5.0,
      passed: false,
      hit: false,
      nearMissAwarded: false,
      defensiveAwarded: false,
      signalRig,
      doorOpenProgress: 0,
      sideDir: 0,
      startX: 0,
      targetX: 0,
      alertedByBell: false,
      forwardSpeed: 0,
      braking: false,
      signalState: 'green',
      alwaysGreen,
      walkPhase: 0,
    });
  }

  private spawnTrafficCar(z: number): void {
    // Avoid spawning a car right on top of a crosswalk/signal gantry
    const nearSignal = this.hazards.some(
      (h) => h.type === 'red_signal' && Math.abs(h.z - z) < 9
    );
    if (nearSignal) return;

    // 48% right-forward car lane (x = +1.15, directly adjacent to red bike lane x >= 2.15),
    // 24% center-forward car lane (x = -0.38), 28% oncoming lane (x = -2.95)
    const laneRoll = Math.random();
    const candidates: { x: number; oncoming: boolean }[] =
      laneRoll < 0.48
        ? [
            { x: 1.15, oncoming: false },
            { x: -0.38, oncoming: false },
            { x: -2.95, oncoming: true },
          ]
        : laneRoll < 0.72
        ? [
            { x: -0.38, oncoming: false },
            { x: 1.15, oncoming: false },
            { x: -2.95, oncoming: true },
          ]
        : [
            { x: -2.95, oncoming: true },
            { x: 1.15, oncoming: false },
            { x: -0.38, oncoming: false },
          ];

    const chosen = candidates.find(
      (c) =>
        !this.hazards.some(
          (h) => h.type === 'traffic_car' && Math.abs(h.x - c.x) < 1.1 && Math.abs(h.z - z) < 18
        )
    );
    if (!chosen) return;

    const useOncoming = chosen.oncoming;
    const x = chosen.x;
    const carColors = [0x94a3b8, 0x1e293b, 0x3b82f6, 0x0f766e, 0xe2e8f0, 0x7c2d12];
    const id = this.hazardIdSeq++;
    const carRig = createCarRig(carColors[id % carColors.length], this.contactShadowTex);

    carRig.root.position.set(x, 0, z);
    if (useOncoming) {
      carRig.root.rotation.y = Math.PI; // Faces +Z oncoming toward player!
    }
    this.scene.add(carRig.root);
    this.encounterCounts.traffic_car++;

    const trajectoryOffsetZ = useOncoming ? 4.4 : -4.4;
    const trajectoryMesh = this.createTrajectoryMesh(
      4.2,
      1.05,
      useOncoming ? 0xfb7185 : 0x38bdf8,
      useOncoming ? -Math.PI / 2 : Math.PI / 2,
      x,
      z + trajectoryOffsetZ
    );

    this.hazards.push({
      id,
      type: 'traffic_car',
      group: carRig.root,
      x,
      z,
      width: 1.88,
      depth: 4.2,
      height: 1.5,
      passed: false,
      hit: false,
      nearMissAwarded: false,
      defensiveAwarded: false,
      carRig,
      trajectoryMesh,
      trajectoryOffsetZ,
      doorOpenProgress: 0,
      sideDir: useOncoming ? -1 : 1,
      startX: x,
      targetX: x,
      alertedByBell: false,
      forwardSpeed: useOncoming ? -(10.5 + Math.random() * 3.2) : 6.2 + Math.random() * 2.4,
      braking: false,
      signalState: 'green',
      walkPhase: 0,
    });
  }

  private spawnRearChaseCar(): void {
    const id = this.hazardIdSeq++;
    const carRig = createCarRig(0xdc2626, this.contactShadowTex);
    const x = THREE.MathUtils.clamp(this.playerX, -3.6, 1.18);
    const z = 11.5; // Starts behind camera (+4.35) and speeds into rear of bicycle
    carRig.root.position.set(x, 0, z);
    carRig.headlightBeam.visible = true;
    this.scene.add(carRig.root);
    this.encounterCounts.traffic_car++;

    soundEngine.playCarHorn();
    this.pushWarning('뒤에서 차가 달려옵니다! 즉시 붉은 자전거 도로로 피하세요!', 1.6);

    this.hazards.push({
      id,
      type: 'traffic_car',
      group: carRig.root,
      x,
      z,
      width: 1.9,
      depth: 4.2,
      height: 1.5,
      passed: false,
      hit: false,
      nearMissAwarded: false,
      defensiveAwarded: false,
      carRig,
      doorOpenProgress: 0,
      sideDir: 1,
      startX: x,
      targetX: x,
      alertedByBell: false,
      forwardSpeed: this.speed + 16.5,
      braking: true,
      signalState: 'green',
      rearChase: true,
      walkPhase: 0,
    });
  }

  private startPolicePursuit(): void {
    if (this.policePursuitActive) return;
    this.policePursuitActive = true;
    this.policeArrestTimer = 0;
    this.policeWhistlePlayed = false;
    this.policeZ = 10.5;
    this.policeX = THREE.MathUtils.clamp(this.playerX - 0.9, -3.2, 1.35);

    this.policeRig = createPoliceCarRig(this.contactShadowTex);
    this.policeRig.root.position.set(this.policeX, 0, this.policeZ);
    this.scene.add(this.policeRig.root);

    soundEngine.playPoliceSiren();
    this.pushWarning('경찰 단속 출동! 반복된 차도 침범으로 정지 명령!', 1.8);
    this.pushCallout('경찰 단속 적발!', 0, 'danger');
  }

  private updatePolicePursuit(dt: number): void {
    this.policeArrestTimer += dt;
    // Rapidly pull bike over & brake to 0
    this.speed = THREE.MathUtils.damp(this.speed, 0, 4.8, dt);
    this.bikeRig.tailLightMat.emissiveIntensity = 3.2;

    const deltaDist = this.speed * dt;
    this.distanceM += deltaDist;
    this.wheelAngle -= deltaDist / 0.34;
    this.crankAngle -= deltaDist * 1.25;
    this.leanAngle = THREE.MathUtils.damp(this.leanAngle, 0.05, 8, dt);
    this.steerVisual = THREE.MathUtils.damp(this.steerVisual, 0.08, 8, dt);
    this.playerX = THREE.MathUtils.damp(this.playerX, 2.35, 2.8, dt);
    this.bikeRig.root.position.set(this.playerX, 0, 0);
    this.animateBikeRig(this.leanAngle, this.steerVisual);
    soundEngine.updateRollingSound((this.speed - 1) / 14, true, this.speed > 0.6);

    if (this.policeRig) {
      // Police cruiser pulls up alongside & cuts slightly ahead to intercept the cyclist
      this.policeZ = THREE.MathUtils.damp(this.policeZ, -2.5, 4.2, dt);
      const interceptX = this.policeZ > 0.5 ? this.playerX - 1.45 : this.playerX - 0.55;
      this.policeX = THREE.MathUtils.damp(this.policeX, interceptX, 4.6, dt);
      this.policeRig.root.position.set(this.policeX, 0, this.policeZ);
      this.policeRig.root.rotation.y = this.policeZ < 0.2 ? -0.34 : 0.06;

      // Vivid alternating red & blue strobe flash
      const redPhase = Math.floor(this.elapsed * 12) % 2 === 0;
      this.policeRig.redStrobeMat.emissiveIntensity = redPhase ? 3.5 : 0.15;
      this.policeRig.blueStrobeMat.emissiveIntensity = redPhase ? 0.15 : 3.5;
    }

    if (!this.policeWhistlePlayed && this.policeArrestTimer >= 0.85) {
      this.policeWhistlePlayed = true;
      soundEngine.playPoliceWhistle();
      this.pushWarning('단속 완료! 차도 반복 침범으로 주행이 종료됩니다', 1.2);
    }

    if (this.policeArrestTimer >= 1.7) {
      this.arrestedByPolice = true;
      this.finishRun(false);
    }
  }

  private pullNextHazardType(): HazardType {
    const zone = this.getZoneInfo().index;
    if (this.hazardBag.length === 0) {
      const basePool: HazardType[] =
        zone === 1
          ? ['pet', 'kids', 'puddle', 'gravel', 'smombie', 'wrong_way_bike', 'dooring', 'pothole']
          : zone === 2
          ? ['pet', 'kids', 'wrong_way_bike', 'puddle', 'gravel', 'blind_car', 'smombie', 'pothole', 'dooring', 'roadwork']
          : ['pet', 'kids', 'wrong_way_bike', 'puddle', 'gravel', 'blind_car', 'smombie', 'scooter', 'pothole', 'roadwork', 'dooring'];

      // Fisher-Yates shuffle so dooring never repeats back-to-back and all hazards appear evenly
      const bag = [...basePool];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.hazardBag = bag;
    }
    return this.hazardBag.pop()!;
  }

  private spawnHazardCluster(z: number): void {
    const type = this.pullNextHazardType();
    const id = this.hazardIdSeq++;
    this.encounterCounts[type]++;

    if (type === 'dooring') {
      const carColors = [0xe2e8f0, 0x334155, 0x475569, 0x1d4ed8, 0xb91c1c];
      const carRig = createCarRig(carColors[id % carColors.length], this.contactShadowTex);
      const x = 4.55; // Parked tightly along right curb so cyclists can evade inside the bike lane!
      carRig.root.position.set(x, 0, z);
      this.scene.add(carRig.root);

      const doorZoneMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 3.4),
        new THREE.MeshBasicMaterial({
          map: this.doorZoneTex,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      );
      doorZoneMesh.rotation.x = -Math.PI / 2;
      doorZoneMesh.position.set(x - 1.45, 0.042, z);
      this.scene.add(doorZoneMesh);

      const trajectoryMesh = this.createTrajectoryMesh(1.75, 0.65, 0xfbbf24, Math.PI, x - 1.55, z);

      this.hazards.push({
        id,
        type,
        group: carRig.root,
        x,
        z,
        width: 1.85,
        depth: 4.2,
        height: 1.5,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        carRig,
        trajectoryMesh,
        trajectoryOffsetZ: 0,
        doorZoneMesh,
        doorOpenProgress: 0,
        sideDir: -1,
        startX: x,
        targetX: x,
        alertedByBell: false,
        forwardSpeed: 0,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'blind_car') {
      const carRig = createCarRig(0xf8fafc, this.contactShadowTex);
      const fromRight = Math.random() > 0.35;
      const startX = fromRight ? 7.6 : -7.6;
      const targetX = fromRight ? 4.2 : -2.6;
      carRig.root.position.set(startX, 0, z);
      carRig.root.rotation.y = fromRight ? Math.PI / 2 : -Math.PI / 2;
      carRig.headlightBeam.visible = true;
      this.scene.add(carRig.root);

      // Ground warning chevron decal on road ahead of emerging car
      const warningMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshBasicMaterial({
          map: this.chevronTex,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      warningMesh.rotation.x = -Math.PI / 2;
      warningMesh.rotation.z = fromRight ? Math.PI : 0;
      warningMesh.position.set(fromRight ? 3.8 : -3.5, 0.04, z);
      this.scene.add(warningMesh);

      const trajectoryMesh = this.createTrajectoryMesh(
        3.4,
        0.95,
        0xf97316,
        fromRight ? Math.PI : 0,
        fromRight ? 3.4 : -2.8,
        z
      );

      this.hazards.push({
        id,
        type,
        group: carRig.root,
        x: startX,
        z,
        width: 3.4,
        depth: 1.9,
        height: 1.5,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        carRig,
        warningMesh,
        trajectoryMesh,
        trajectoryOffsetZ: 0,
        doorOpenProgress: 0,
        sideDir: fromRight ? -1 : 1,
        startX,
        targetX,
        alertedByBell: false,
        forwardSpeed: 0,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'smombie') {
      const shirtColors = [0xec4899, 0x8b5cf6, 0x06b6d4, 0x10b981];
      const pedRig = createPedestrianRig(shirtColors[id % shirtColors.length], this.contactShadowTex);
      const startX = 4.55;
      const targetX = 3.55 + Math.random() * 0.55; // Walks into right half of bike lane, leaving left half passable
      pedRig.root.position.set(startX, 0, z);
      this.scene.add(pedRig.root);

      const trajectoryMesh = this.createTrajectoryMesh(
        2.1,
        0.65,
        0xfacc15,
        Math.PI,
        (startX + targetX) * 0.5,
        z
      );

      this.hazards.push({
        id,
        type,
        group: pedRig.root,
        x: startX,
        z,
        width: 0.72,
        depth: 0.72,
        height: 1.65,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        pedRig,
        trajectoryMesh,
        trajectoryOffsetZ: 0,
        doorOpenProgress: 0,
        sideDir: -1,
        startX,
        targetX,
        alertedByBell: false,
        forwardSpeed: 1.2,
        braking: false,
        signalState: 'green',
        walkPhase: Math.random() * 6,
      });
    } else if (type === 'pothole') {
      const group = new THREE.Group();
      const x = [4.0, 2.75, 3.85][id % 3];
      const grate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.25, 1.25),
        new THREE.MeshStandardMaterial({
          map: this.potholeTex,
          roughness: 0.7,
          metalness: 0.4,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      );
      grate.rotation.x = -Math.PI / 2;
      grate.position.y = 0.04;
      group.add(grate);
      group.position.set(x, 0, z);
      this.scene.add(group);
      this.hazards.push({
        id,
        type,
        group,
        x,
        z,
        width: 1.15,
        depth: 1.15,
        height: 0.25,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        doorOpenProgress: 0,
        sideDir: 0,
        startX: x,
        targetX: x,
        alertedByBell: false,
        forwardSpeed: 0,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'roadwork') {
      const group = createRoadworkGroup();
      group.scale.set(0.78, 1, 1);
      const x = [4.0, 2.75, 3.9][id % 3];
      group.position.set(x, 0, z);
      this.scene.add(group);
      this.hazards.push({
        id,
        type,
        group,
        x,
        z,
        width: 1.25,
        depth: 0.65,
        height: 0.68,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        doorOpenProgress: 0,
        sideDir: 0,
        startX: x,
        targetX: x,
        alertedByBell: false,
        forwardSpeed: 0,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'scooter') {
      const scooterRig = createScooterRig(this.contactShadowTex);
      const x = Math.random() > 0.45 ? 3.85 : 2.8;
      scooterRig.root.position.set(x, 0, z);
      this.scene.add(scooterRig.root);
      const trajectoryOffsetZ = -2.6;
      const trajectoryMesh = this.createTrajectoryMesh(
        2.6,
        0.65,
        0x38bdf8,
        Math.PI / 2,
        x,
        z + trajectoryOffsetZ
      );
      this.hazards.push({
        id,
        type,
        group: scooterRig.root,
        x,
        z,
        width: 0.9,
        depth: 1.85,
        height: 1.4,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        scooterRig,
        trajectoryMesh,
        trajectoryOffsetZ,
        doorOpenProgress: 0,
        sideDir: 0,
        startX: x,
        targetX: x,
        alertedByBell: false,
        forwardSpeed: 5.5,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'pet') {
      const dogRig = createDogRig(this.contactShadowTex);
      const startX = 5.3;
      const targetX = 3.55 + Math.random() * 0.5;
      dogRig.root.position.set(startX, 0, z);
      this.scene.add(dogRig.root);
      const trajectoryMesh = this.createTrajectoryMesh(
        2.3,
        0.65,
        0xfb7185,
        Math.PI,
        (startX + targetX) * 0.5,
        z
      );
      this.hazards.push({
        id,
        type,
        group: dogRig.root,
        x: startX,
        z,
        width: 0.85,
        depth: 0.65,
        height: 0.72,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        dogRig,
        trajectoryMesh,
        trajectoryOffsetZ: 0,
        doorOpenProgress: 0,
        sideDir: -1,
        startX,
        targetX,
        alertedByBell: false,
        forwardSpeed: 0,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'kids') {
      const kidsRig = createKidsGroup(this.contactShadowTex);
      const startX = 4.55;
      const targetX = 3.55 + Math.random() * 0.5;
      kidsRig.root.position.set(startX, 0, z);
      this.scene.add(kidsRig.root);
      const trajectoryMesh = this.createTrajectoryMesh(
        2.0,
        0.65,
        0xfacc15,
        Math.PI,
        (startX + targetX) * 0.5,
        z
      );
      this.hazards.push({
        id,
        type,
        group: kidsRig.root,
        x: startX,
        z,
        width: 1.05,
        depth: 0.85,
        height: 1.35,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        kidsRig,
        trajectoryMesh,
        trajectoryOffsetZ: 0,
        doorOpenProgress: 0,
        sideDir: -1,
        startX,
        targetX,
        alertedByBell: false,
        forwardSpeed: 1.1,
        braking: false,
        signalState: 'green',
        walkPhase: Math.random() * 5,
      });
    } else if (type === 'wrong_way_bike') {
      const wrongBikeRig = createWrongWayBikeRig(this.contactShadowTex);
      const x = id % 2 === 0 ? 3.85 : 2.85;
      wrongBikeRig.root.position.set(x, 0, z);
      this.scene.add(wrongBikeRig.root);
      const trajectoryOffsetZ = 2.9;
      const trajectoryMesh = this.createTrajectoryMesh(
        3.6,
        0.75,
        0xf43f5e,
        -Math.PI / 2,
        x,
        z + trajectoryOffsetZ
      );
      this.hazards.push({
        id,
        type,
        group: wrongBikeRig.root,
        x,
        z,
        width: 0.7,
        depth: 1.7,
        height: 1.5,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        wrongBikeRig,
        trajectoryMesh,
        trajectoryOffsetZ,
        doorOpenProgress: 0,
        sideDir: 0,
        startX: x,
        targetX: x,
        alertedByBell: false,
        forwardSpeed: -5.2, // Rides directly toward the player!
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'puddle') {
      const group = new THREE.Group();
      const x = [3.95, 2.75, 3.85][id % 3];
      const puddleMat = new THREE.MeshPhysicalMaterial({
        map: this.puddleTex,
        transparent: true,
        roughness: 0.06,
        metalness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      puddleMat.onBeforeCompile = (shader) => {
        shader.uniforms.uRippleTime = this.puddleUniformTime;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec2 vPuddleUv;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
           vPuddleUv = uv;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           uniform float uRippleTime;
           varying vec2 vPuddleUv;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `float dCenter = length(vPuddleUv - vec2(0.5));
           float ripple = sin(dCenter * 42.0 - uRippleTime * 5.2) * 0.5 + 0.5;
           gl_FragColor.rgb += vec3(0.08, 0.16, 0.22) * ripple * smoothstep(0.45, 0.05, dCenter);
           #include <dithering_fragment>`
        );
      };
      const puddleMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.45, 1.9),
        puddleMat
      );
      puddleMesh.rotation.x = -Math.PI / 2;
      puddleMesh.position.y = 0.04;
      group.add(puddleMesh);
      group.position.set(x, 0, z);
      this.scene.add(group);
      this.hazards.push({
        id,
        type,
        group,
        x,
        z,
        width: 1.2,
        depth: 1.6,
        height: 0.22,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        doorOpenProgress: 0,
        sideDir: 0,
        startX: x,
        targetX: x,
        alertedByBell: false,
        forwardSpeed: 0,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    } else if (type === 'gravel') {
      const group = createGravelGroup();
      group.scale.set(0.82, 1, 0.9);
      const x = [3.95, 2.7, 3.8][id % 3];
      group.position.set(x, 0, z);
      this.scene.add(group);
      this.hazards.push({
        id,
        type,
        group,
        x,
        z,
        width: 1.15,
        depth: 1.25,
        height: 0.24,
        passed: false,
        hit: false,
        nearMissAwarded: false,
        defensiveAwarded: false,
        doorOpenProgress: 0,
        sideDir: 0,
        startX: x,
        targetX: x,
        alertedByBell: false,
        forwardSpeed: 0,
        braking: false,
        signalState: 'green',
        walkPhase: 0,
      });
    }
  }

  private spawnPickup(z: number): void {
    const roll = Math.random();
    const kind: 'shield' | 'double' | 'star' = roll < 0.25 ? 'shield' : roll < 0.5 ? 'double' : 'star';
    const group = createPickupGroup(kind);
    const lanes = [2.55, 3.35, 4.15];
    const x = lanes[Math.floor(Math.random() * lanes.length)];
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.pickups.push({ kind, group, x, z, collected: false });
  }

  private updateHazards(dt: number): void {
    const dzWorld = this.speed * dt;
    const blinkOn = Math.floor(this.elapsed * 8) % 2 === 0;

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.z += dzWorld - h.forwardSpeed * dt;
      h.group.position.z = h.z;
      if (h.warningMesh) {
        h.warningMesh.position.z = h.z;
        (h.warningMesh.material as THREE.MeshBasicMaterial).opacity = blinkOn ? 0.92 : 0.35;
      }
      if (h.trajectoryMesh) {
        h.trajectoryMesh.position.z = h.z + (h.trajectoryOffsetZ ?? 0);
        const pulse = 0.65 + 0.28 * Math.sin(this.elapsed * 8 + h.id);
        (h.trajectoryMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
      if (h.doorZoneMesh) {
        h.doorZoneMesh.position.z = h.z;
        (h.doorZoneMesh.material as THREE.MeshBasicMaterial).opacity = blinkOn ? 0.92 : 0.55;
      }

      // 1. Update hazard-specific telegraphs & kinematics
      if (h.type === 'dooring' && h.carRig) {
        if (h.z > -42 && h.z < 4) {
          h.carRig.hazardLeftMat.emissiveIntensity = blinkOn ? 2.4 : 0.2;
          h.carRig.hazardRightMat.emissiveIntensity = blinkOn ? 2.4 : 0.2;
        }
        if (h.z > -24) {
          h.doorOpenProgress = Math.min(1, h.doorOpenProgress + dt * 3.8);
          h.carRig.doorPivot.rotation.y = -1.25 * h.doorOpenProgress;
        }
      } else if (h.type === 'blind_car' && h.carRig) {
        if (h.z > -48 && h.z < -30 && Math.abs(h.z + 38) < 0.8) {
          soundEngine.playCarHorn();
        }
        if (h.z > -32) {
          h.x = THREE.MathUtils.damp(h.x, h.targetX, 3.4, dt);
          h.group.position.x = h.x;
        }
        // Check defensive braking near blind car
        if (!h.defensiveAwarded && h.z > -10 && h.z < 2 && this.speed < 5.2 && !h.hit) {
          h.defensiveAwarded = true;
          this.defensiveCount++;
          this.awardBonus('사각지대 감속 방어운전!', 180, 'good');
        }
      } else if (h.type === 'smombie' && h.pedRig) {
        h.walkPhase += dt * 7;
        h.pedRig.leftLeg.rotation.x = Math.sin(h.walkPhase) * 0.45;
        h.pedRig.rightLeg.rotation.x = -Math.sin(h.walkPhase) * 0.45;

        if (h.alertedByBell) {
          h.x = THREE.MathUtils.damp(h.x, h.targetX, 6.0, dt);
        } else if (h.z > -30) {
          h.x = THREE.MathUtils.damp(h.x, h.targetX, 2.2, dt);
        }
        h.group.position.x = h.x;
      } else if (h.type === 'scooter' && h.scooterRig) {
        h.scooterRig.frontWheel.rotation.x -= h.forwardSpeed * dt / 0.24;
        h.scooterRig.rearWheel.rotation.x -= h.forwardSpeed * dt / 0.24;
        if (h.z > -28 && !h.braking) {
          h.braking = true;
          h.forwardSpeed = 1.6; // abrupt brake!
          h.scooterRig.brakeMat.emissiveIntensity = 3.2;
          if (h.trajectoryMesh) {
            (h.trajectoryMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf43f5e);
          }
        }
      } else if (h.type === 'red_signal' && h.signalRig) {
        const stopLineWorldZ = h.z + 4.6;
        const brakeHeld =
          this.heldKeys.has('KeyS') ||
          this.heldKeys.has('ArrowDown') ||
          this.mobileInput.brake;
        if (h.alwaysGreen) {
          h.signalState = 'green';
          h.signalRig.redMat.emissiveIntensity = 0.1;
          h.signalRig.yellowMat.emissiveIntensity = 0.1;
          h.signalRig.greenMat.emissiveIntensity = 2.0;
          if (!h.defensiveAwarded && stopLineWorldZ > 0.6) {
            h.defensiveAwarded = true;
            this.awardBonus('초록 신호 안전 통과!', 80, 'good');
          }
        } else {
          if (stopLineWorldZ > -54 && stopLineWorldZ <= -32 && !h.defensiveAwarded) {
            h.signalState = 'yellow';
            h.signalRig.greenMat.emissiveIntensity = 0.1;
            h.signalRig.yellowMat.emissiveIntensity = 2.2;
          } else if (stopLineWorldZ > -32 && !h.defensiveAwarded) {
            h.signalState = 'red';
            h.signalRig.yellowMat.emissiveIntensity = 0.1;
            h.signalRig.redMat.emissiveIntensity = 2.5;
          }
          // Check if player slowed/stopped before the white stop line (stopLineWorldZ in [-11.0, 1.5])
          const touchBrakeHeld = this.mobileInput.brake;
          const safeStopSpeedLimit = touchBrakeHeld ? 7.5 : brakeHeld ? 6.8 : 5.2;
          if (
            h.signalState === 'red' &&
            !h.defensiveAwarded &&
            stopLineWorldZ > -11.0 &&
            stopLineWorldZ <= 1.5
          ) {
            if (this.speed <= safeStopSpeedLimit) {
              h.defensiveAwarded = true;
              h.signalState = 'green';
              h.signalRig.redMat.emissiveIntensity = 0.1;
              h.signalRig.greenMat.emissiveIntensity = 2.0;
              this.defensiveCount++;
              soundEngine.playPickup();
              this.awardBonus('신호 · 정지선 준수!', 240, 'good');
            }
          }
        }
      } else if (h.type === 'pet' && h.dogRig) {
        h.walkPhase += dt * 16;
        h.dogRig.legs.forEach((leg, idx) => {
          leg.rotation.z = Math.sin(h.walkPhase + (idx % 2 === 0 ? 0 : Math.PI)) * 0.45;
        });
        h.dogRig.tail.rotation.y = Math.sin(this.elapsed * 18) * 0.45;
        if (h.alertedByBell) {
          h.x = THREE.MathUtils.damp(h.x, h.targetX, 6.5, dt);
        } else if (h.z > -32) {
          if (!h.braking) {
            h.braking = true;
            soundEngine.playDogBark();
          }
          h.x = THREE.MathUtils.damp(h.x, h.targetX, 3.8, dt);
        }
        h.group.position.x = h.x;
      } else if (h.type === 'kids' && h.kidsRig) {
        h.walkPhase += dt * 6;
        h.kidsRig.childrenGroups.forEach((kg, idx) => {
          kg.position.y = Math.abs(Math.sin(h.walkPhase + idx)) * 0.08;
        });
        if (h.alertedByBell) {
          h.x = THREE.MathUtils.damp(h.x, h.targetX, 6.0, dt);
        } else if (h.z > -32) {
          h.x = THREE.MathUtils.damp(h.x, h.targetX + Math.sin(this.elapsed * 3.5) * 0.25, 2.4, dt);
        }
        h.group.position.x = h.x;
      } else if (h.type === 'wrong_way_bike' && h.wrongBikeRig) {
        const spin = Math.abs(h.forwardSpeed) * dt / 0.33;
        h.wrongBikeRig.frontWheel.rotation.x -= spin;
        h.wrongBikeRig.rearWheel.rotation.x -= spin;
      } else if (h.type === 'traffic_car') {
        if (h.rearChase && h.carRig) {
          // Rapidly close from behind while staying strictly within car lanes (<= 1.18)
          h.forwardSpeed = this.speed + 16.5;
          if (h.z > 0.4) {
            const targetChaseX = THREE.MathUtils.clamp(this.playerX, -3.6, 1.18);
            h.x = THREE.MathUtils.damp(h.x, targetChaseX, 7.5, dt);
            h.group.position.x = h.x;
          }
          h.carRig.hazardLeftMat.emissiveIntensity = blinkOn ? 2.8 : 0.2;
          h.carRig.hazardRightMat.emissiveIntensity = blinkOn ? 2.8 : 0.2;
        } else if (
          h.sideDir < 0 &&
          h.z > -32 &&
          h.z < -16 &&
          Math.abs(this.playerX - h.x) < 1.35 &&
          !h.braking
        ) {
          // Sound horn if oncoming car is close and player is in its lane
          h.braking = true;
          soundEngine.playCarHorn();
        }
      }

      // 2. Collision & Near-Miss Detection around z ≈ 0 (bike length -0.8 to +0.8)
      if (!h.hit) {
        if (h.type === 'red_signal') {
          const stopLineWorldZ = h.z + 4.6;
          const brakeHeld =
            this.heldKeys.has('KeyS') ||
            this.heldKeys.has('ArrowDown') ||
            this.mobileInput.brake;
          if (
            !h.alwaysGreen &&
            h.signalState === 'red' &&
            stopLineWorldZ > 1.6 &&
            stopLineWorldZ < 3.0 &&
            !h.defensiveAwarded &&
            (!brakeHeld || this.speed > 7.5)
          ) {
            h.hit = true;
            this.onHazardHit(h, '적색 신호 위반! 흰색 정지선 앞에서 정지하세요');
          }
        } else {
          // Determine effective hazard X bounds
          let hazMinX = h.x - h.width * 0.5;
          let hazMaxX = h.x + h.width * 0.5;
          let hazMinZ = h.z - h.depth * 0.5;
          let hazMaxZ = h.z + h.depth * 0.5;

          if (h.type === 'dooring') {
            // Check both car body AND opened driver door (leaves x ∈ [2.15, 2.65] clear inside bike lane)
            const doorReach = h.doorOpenProgress * 0.95;
            hazMinX = h.x - 0.92 - doorReach;
            hazMaxX = h.x + 0.92;
          }

          const bikeHalfW = 0.28;
          const bikeHalfD = 0.72;
          const overlapX = this.playerX + bikeHalfW > hazMinX && this.playerX - bikeHalfW < hazMaxX;
          const overlapZ = bikeHalfD > hazMinZ && -bikeHalfD < hazMaxZ;

          if (overlapX && overlapZ) {
            h.hit = true;
            const msgMap: Record<HazardType, string> = {
              dooring: '개문 사고 충돌! 주차 차량과 1m 거리를 두세요',
              blind_car: '사각지대 차량 충돌! 교차로 감속이 필요합니다',
              smombie: '보행자 충돌! 벨(E/Space)로 미리 알리고 서행하세요',
              pothole: '노면 배수구 전복! 감속(S) 후 조향으로 우회하세요',
              roadwork: '공사 장애물 충돌! 전방을 살피고 미리 차선 변경하세요',
              scooter: '전방 급정거 추돌! 충분한 안전거리를 유지하세요',
              red_signal: '적색 신호 위반!',
              traffic_car: h.rearChase
                ? '차도 3초 이상 주행 후방 추돌! 자전거 전용도로를 이용하세요'
                : '차도 주행 차량과 충돌! 자전거 도로를 이용하세요',
              pet: '애완동물과 충돌! 인도 근처에선 서행·경적 필수입니다',
              kids: '어린이 보행자와 충돌! 스쿨존에서는 반드시 서행하세요',
              wrong_way_bike: '역주행 자전거와 정면 충돌! 전방 주시 및 감속 필수',
              puddle: '물웅덩이 수막현상 미끄러짐! 감속(S) 및 우회가 필요합니다',
              gravel: '돌맹이·자갈 밟아 핸들 흔들림! 감속 후 안전하게 피하세요',
            };
            this.onHazardHit(h, msgMap[h.type]);
          } else if (
            !h.nearMissAwarded &&
            (h.rearChase ? h.z < -0.5 && h.z > -2.8 : h.z > 0.3 && h.z < 2.2)
          ) {
            // Near-miss or safe defensive braking reward
            const distToEdge = Math.min(
              Math.abs(this.playerX - hazMinX),
              Math.abs(this.playerX - hazMaxX)
            );
            if (
              !overlapX &&
              distToEdge < 1.1 &&
              this.speed < 6.8 &&
              (h.type === 'pothole' || h.type === 'roadwork' || h.type === 'puddle' || h.type === 'gravel')
            ) {
              h.nearMissAwarded = true;
              this.defensiveCount++;
              soundEngine.playNearMiss(this.combo);
              this.awardBonus('감속 안전 통과!', 150, 'good');
            } else if (!overlapX && distToEdge < 0.78) {
              h.nearMissAwarded = true;
              this.nearMissCount++;
              soundEngine.playNearMiss(this.combo);
              this.awardBonus(
                h.rearChase ? '후방 추돌 아슬아슬 회피!' : '아슬아슬 회피!',
                180,
                'good'
              );
            }
          }
        }
      }

      if (!h.passed && h.z > 2.5) {
        h.passed = true;
      }

      // Cleanup behind camera or far ahead
      if (h.z > 14 || h.z < -170) {
        this.scene.remove(h.group);
        if (h.warningMesh) this.scene.remove(h.warningMesh);
        if (h.trajectoryMesh) this.scene.remove(h.trajectoryMesh);
        if (h.doorZoneMesh) this.scene.remove(h.doorZoneMesh);
        this.hazards.splice(i, 1);
      }
    }
  }

  private onHazardHit(h: ActiveHazard, reasonText: string): void {
    if (this.invulnTimer > 0) return;

    this.hitCounts[h.type]++;
    this.lastFatalHazard = h.type;

    if (this.hasShield) {
      this.hasShield = false;
      this.invulnTimer = 1.5;
      this.hitstopTimer = 0.045;
      this.shakeIntensity = 0.32;
      soundEngine.playCrash(true);
      this.spawnBurst(this.playerX, 0.9, 0, 0x38bdf8, 18, 6.5);
      this.pushCallout('안전모 보호막이 충격을 막았습니다!', 100, 'warn');
      return;
    }

    this.hearts = Math.max(0, this.hearts - 1);
    this.combo = 0;
    this.invulnTimer = 1.65;
    this.hitstopTimer = 0.06;
    this.shakeIntensity = 0.55;
    this.speed = Math.max(4.5, this.speed * 0.48);

    if (h.type === 'puddle') {
      this.slipTimer = 0.85;
      soundEngine.playSplash();
      this.spawnBurst(this.playerX, 0.35, 0, 0x38bdf8, 22, 7.2);
    } else if (h.type === 'gravel') {
      this.slipTimer = 0.65;
      soundEngine.playGravelCrunch();
      this.spawnBurst(this.playerX, 0.3, 0, 0xa8a29e, 18, 6.5);
    } else {
      soundEngine.playCrash(false);
      this.spawnBurst(this.playerX, 0.7, 0, 0xef4444, 20, 7.5);
    }
    this.callbacks.onCrashFlash();
    this.pushCallout(reasonText, 0, 'danger');

    if (this.hearts <= 0) {
      this.finishRun(false);
    } else {
      this.pushHud(true);
    }
  }

  private updatePickups(dt: number): void {
    const dzWorld = this.speed * dt;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.z += dzWorld;
      p.group.position.z = p.z;
      p.group.rotation.y += dt * 2.4;
      p.group.position.y = Math.sin(this.elapsed * 4 + i) * 0.1;

      if (!p.collected && Math.abs(p.z) < 1.15 && Math.abs(this.playerX - p.x) < 0.9) {
        p.collected = true;
        soundEngine.playPickup();
        this.spawnBurst(p.x, 0.8, 0, 0x22c55e, 10, 4.2);

        if (p.kind === 'shield') {
          this.hasShield = true;
          this.awardBonus('안전모 보호막 장착!', 100, 'good');
        } else if (p.kind === 'double') {
          this.doubleScoreTimer = 8.0;
          this.awardBonus('전조등 안전 점멸 (점수 2배!)', 100, 'good');
        } else {
          this.awardBonus('안전 주행 포인트!', 120, 'good');
        }
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
        continue;
      }

      if (p.z > 10) {
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 5;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.maxLife);
    }

    // Animate peripheral speed streaks at higher speeds
    const fastRatio = THREE.MathUtils.clamp((this.speed - 11.2) / 5.5, 0, 1);
    for (const s of this.speedStreaks) {
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = fastRatio * 0.34;
      s.mesh.visible = fastRatio > 0.02;
      if (s.mesh.visible) {
        s.mesh.position.z += this.speed * s.speedMul * dt;
        if (s.mesh.position.z > 4) {
          s.mesh.position.z = -26 - Math.random() * 10;
        }
      }
    }
  }

  private updateCamera(dt: number): void {
    // GTA-style dynamic 3rd-person chase camera with FOV speed expansion + shake
    const speedRatio = THREE.MathUtils.clamp((this.speed - 4) / 12, 0, 1);
    if (this.speedGradePass) {
      this.speedGradePass.uniforms.uSpeedRatio.value = speedRatio;
    }

    const portraitBoost =
      this.camera.aspect < 1 ? Math.min(18, (1 - this.camera.aspect) * 32) : 0;
    const targetFov = 61 + portraitBoost + speedRatio * 10;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    const camTrackFactor = this.camera.aspect < 1 ? 0.82 : 0.88;
    const camDistOffset = this.camera.aspect < 1 ? 0.55 : 0;
    _vec3A.set(this.playerX * camTrackFactor, 2.35, 4.35 + camDistOffset + speedRatio * 0.35);
    this.camPos.lerp(_vec3A, 1 - Math.exp(-9 * dt));

    if (this.shakeIntensity > 0.005) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.1);
      this.camera.position.set(
        this.camPos.x + (Math.random() - 0.5) * this.shakeIntensity,
        this.camPos.y + (Math.random() - 0.5) * this.shakeIntensity * 0.7,
        this.camPos.z
      );
    } else {
      this.camera.position.copy(this.camPos);
    }

    _vec3B.set(this.playerX * 0.72, 1.05, -9.5);
    this.camLook.lerp(_vec3B, 1 - Math.exp(-11 * dt));
    this.camera.lookAt(this.camLook);
    this.camera.rotation.z = -this.leanAngle * 0.14;

    // Keep shadow frustum centered near cyclist
    this.sunLight.position.set(this.playerX + 16, 28, 12);
    this.sunLight.target.position.set(this.playerX, 0, -14);
  }

  private finishRun(cleared: boolean): void {
    this.phase = cleared ? 'victory' : 'gameover';
    soundEngine.updateRollingSound(0, true, false);
    if (cleared) {
      soundEngine.playVictory();
    }

    const finalScore = Math.round(this.score + (cleared ? this.hearts * 300 : 0));
    const bestScore = this.saveBestScore(this.mode, finalScore);
    const totalHits = Object.values(this.hitCounts).reduce((a, b) => a + b, 0);

    let grade: 'S' | 'A' | 'B' | 'C' = 'C';
    if (!this.arrestedByPolice) {
      if (cleared && totalHits === 0) grade = 'S';
      else if ((cleared && totalHits <= 1) || this.distanceM >= 1000) grade = 'A';
      else if (this.distanceM >= 450 || this.defensiveCount + this.nearMissCount >= 4) grade = 'B';
    }

    this.pushHud(true);
    this.callbacks.onPhaseChange(this.phase);
    this.callbacks.onGameOver({
      mode: this.mode,
      cleared,
      score: finalScore,
      bestScore,
      distanceM: Math.round(this.distanceM),
      maxCombo: this.maxCombo,
      nearMissCount: this.nearMissCount,
      defensiveCount: this.defensiveCount,
      totalHits,
      grade,
      hitCounts: { ...this.hitCounts },
      encounterCounts: { ...this.encounterCounts },
      lastFatalHazard: this.lastFatalHazard,
      arrestedByPolice: this.arrestedByPolice,
    });
  }

  private computeActiveForecast(): ForecastAlert | null {
    if (this.phase !== 'playing') return null;

    let bestHazard: ActiveHazard | null = null;
    let bestScore = Infinity;

    for (const h of this.hazards) {
      if (h.hit || h.z > -4 || h.z < -76) continue;
      // Ignore already-satisfied red signals
      if (h.type === 'red_signal' && h.defensiveAwarded) continue;

      const dist = -h.z;
      // Prioritize bike-lane / crossing hazards unless player actually enters a car's lane
      const isCarTraffic = h.type === 'traffic_car';
      const inCarPath = Math.abs(this.playerX - h.x) < 1.35;
      const priorityBias = isCarTraffic && !inCarPath ? 24 : 0;
      const score = dist + priorityBias;

      if (score < bestScore) {
        bestScore = score;
        bestHazard = h;
      }
    }

    if (!bestHazard) return null;

    const distanceM = Math.max(1, Math.round(-bestHazard.z));
    switch (bestHazard.type) {
      case 'traffic_car':
        return bestHazard.sideDir < 0
          ? {
              id: bestHazard.id,
              title: '전방 맞은편 자동차 출현',
              detail: '좌측 차로에서 정면으로 다가오는 중 ↓ · 자전거 전용도로 유지',
              dir: 'down',
              distanceM,
              tone: 'rose',
            }
          : {
              id: bestHazard.id,
              title: bestHazard.x > 0.4 ? '우측 차도 주행 자동차 출현' : '전방 차도 주행 자동차 출현',
              detail: '차도 차량 주행 중 ↑ · 붉은 자전거 전용도로 내에서 주행하세요',
              dir: 'up',
              distanceM,
              tone: 'sky',
            };
      case 'blind_car':
        return {
          id: bestHazard.id,
          title: '전방 골목 자동차 출현',
          detail:
            bestHazard.sideDir < 0
              ? '우측 골목에서 차도로 진입 중 ← · S키 감속'
              : '좌측 골목에서 차도로 진입 중 → · S키 감속',
          dir: bestHazard.sideDir < 0 ? 'left' : 'right',
          distanceM,
          tone: 'rose',
        };
      case 'dooring':
        return {
          id: bestHazard.id,
          title: '전방 주차 자동차 출현',
          detail: '운전석 문 열림(←) 위험 · 좌측으로 1m 안전거리 확보',
          dir: 'left',
          distanceM,
          tone: 'amber',
        };
      case 'smombie':
        return {
          id: bestHazard.id,
          title: '전방 사람(보행자) 출현',
          detail: bestHazard.alertedByBell
            ? '인도 쪽(→)으로 안전 이동 완료'
            : '자전거 도로 쪽으로 진입 중 ← · 경적(E/Space) 또는 우회',
          dir: bestHazard.alertedByBell ? 'right' : 'left',
          distanceM,
          tone: bestHazard.alertedByBell ? 'sky' : 'amber',
        };
      case 'kids':
        return {
          id: bestHazard.id,
          title: '전방 어린이 보행자 출현',
          detail: bestHazard.alertedByBell
            ? '인도 쪽(→)에서 대기 중 · 서행 통과'
            : '도로 쪽(←) 돌발 이동 주의 · 서행 및 경적(E/Space)',
          dir: bestHazard.alertedByBell ? 'right' : 'left',
          distanceM,
          tone: bestHazard.alertedByBell ? 'sky' : 'amber',
        };
      case 'pet':
        return {
          id: bestHazard.id,
          title: '전방 애완동물 출현',
          detail: bestHazard.alertedByBell
            ? '인도 쪽(→)으로 멈춤 · 안전 통과'
            : '인도에서 도로 쪽(←)으로 돌진 · 감속(S) 및 경적',
          dir: bestHazard.alertedByBell ? 'right' : 'left',
          distanceM,
          tone: bestHazard.alertedByBell ? 'sky' : 'rose',
        };
      case 'wrong_way_bike':
        return {
          id: bestHazard.id,
          title: '전방 역주행 자전거 출현',
          detail: '정면에서 마주 다가오는 중 ↓ · 감속 후 좌측 우회',
          dir: 'down',
          distanceM,
          tone: 'rose',
        };
      case 'scooter':
        return {
          id: bestHazard.id,
          title: '전방 배달 오토바이 출현',
          detail: bestHazard.braking
            ? '급정거 중! 브레이크(S) 또는 안전 우회'
            : '앞으로 주행 중 ↑ · 갑작스러운 급정거 주의',
          dir: bestHazard.braking ? 'stop' : 'up',
          distanceM,
          tone: bestHazard.braking ? 'rose' : 'amber',
        };
      case 'red_signal':
        return {
          id: bestHazard.id,
          title: '전방 횡단보도 신호등',
          detail: bestHazard.alwaysGreen
            ? '초록 신호 · 좌우 살피며 안전 통과'
            : bestHazard.signalState === 'red'
            ? '적색 신호! 흰색 정지선 앞에서 감속 정지(S/브레이크)'
            : bestHazard.signalState === 'yellow'
            ? '황색 신호! 정지선 앞 감속 준비(S/브레이크)'
            : '교차로 신호등 색상을 확인하세요',
          dir: bestHazard.alwaysGreen ? 'up' : 'stop',
          distanceM: bestHazard.alwaysGreen
            ? distanceM
            : Math.max(1, Math.round(-(bestHazard.z + 4.6))),
          tone: bestHazard.alwaysGreen
            ? 'sky'
            : bestHazard.signalState === 'red'
            ? 'rose'
            : 'amber',
        };
      case 'pothole':
        return {
          id: bestHazard.id,
          title: '전방 배수구·포트홀 주의',
          detail: '노면 함몰 위험 · 감속(S) 후 좌우로 우회',
          dir: 'left',
          distanceM,
          tone: 'amber',
        };
      case 'puddle':
        return {
          id: bestHazard.id,
          title: '전방 물웅덩이 출현',
          detail: '수막현상 미끄럼 주의 · 감속 후 우회',
          dir: 'left',
          distanceM,
          tone: 'sky',
        };
      case 'gravel':
        return {
          id: bestHazard.id,
          title: '전방 돌맹이·자갈 노면',
          detail: '핸들 흔들림 위험 · 감속 후 안전 우회',
          dir: 'left',
          distanceM,
          tone: 'amber',
        };
      case 'roadwork':
        return {
          id: bestHazard.id,
          title: '전방 도로 공사 구간',
          detail: '라바콘 장애물 · 전방 확인 후 차로 변경',
          dir: 'left',
          distanceM,
          tone: 'amber',
        };
    }
  }

  private pushHud(force: boolean): void {
    if (!force && this.elapsed - this.lastHudPush < 0.05) return;
    this.lastHudPush = this.elapsed;

    const zone = this.getZoneInfo();
    const brakeHeld = this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown') || this.mobileInput.brake;

    this.callbacks.onHudUpdate({
      speedKmh: Math.round(this.speed * 2.4),
      distanceM: Math.round(this.distanceM),
      targetDistanceM: this.getTargetDistance(),
      score: Math.round(this.score),
      combo: this.combo,
      maxCombo: this.maxCombo,
      hearts: this.hearts,
      maxHearts: this.maxHearts,
      hasShield: this.hasShield,
      doubleScoreTimer: Number(this.doubleScoreTimer.toFixed(1)),
      bellCooldownRatio: this.bellCooldown / this.bellCooldownMax,
      brakeActive: brakeHeld,
      zoneName: zone.name,
      zoneIndex: zone.index,
      activeCallout: this.activeCallout,
      activeWarning: this.activeWarning,
      activeForecast: this.computeActiveForecast(),
      nearMissCount: this.nearMissCount,
      defensiveCount: this.defensiveCount,
      hitCounts: { ...this.hitCounts },
      encounterCounts: { ...this.encounterCounts },
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    soundEngine.updateRollingSound(0, true, false);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.contactShadowTex?.dispose();
    this.potholeTex?.dispose();
    this.puddleTex?.dispose();
    this.chevronTex?.dispose();
    this.trajectoryTex?.dispose();
    this.doorZoneTex?.dispose();
    this.roadNormalTex?.dispose();
    this.roadRoughnessTex?.dispose();
    this.sidewalkTex?.dispose();
    this.sidewalkNormalTex?.dispose();
    this.roadTextures.forEach((t) => t.dispose());
    this.buildingTextures.forEach((t) => t.dispose());
    this.composer?.dispose();
    this.composerTarget?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
