import * as THREE from 'three';
import { createVoxelBikeMesh } from './pixelBike';
import type { BikeFrameStyle, BikeType } from './types';

export interface PlayerBikeRig {
  root: THREE.Group;
  leanGroup: THREE.Group;
  standardChassisGroup: THREE.Group;
  customVoxelGroup: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  forkGroup: THREE.Group;
  crankGroup: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  riderTorso: THREE.Group;
  tailLightMat: THREE.MeshStandardMaterial;
  headLightMat: THREE.MeshStandardMaterial;
  frameMat: THREE.MeshPhysicalMaterial;
  rimMat: THREE.MeshStandardMaterial;
  basketGroup: THREE.Group;
  rearRackGroup: THREE.Group;
  frontBrakeGroup: THREE.Group;
  rearBrakeGroup: THREE.Group;
  brakeGlowMat: THREE.MeshStandardMaterial;
  frameVariantGroups: Record<BikeFrameStyle, THREE.Group>;
  shieldBubble: THREE.Mesh;
  contactShadow: THREE.Mesh;
}

export interface CarRig {
  root: THREE.Group;
  doorPivot: THREE.Group;
  hazardLeftMat: THREE.MeshStandardMaterial;
  hazardRightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  headlightBeam: THREE.Mesh;
}

export interface PoliceCarRig {
  root: THREE.Group;
  redStrobeMat: THREE.MeshStandardMaterial;
  blueStrobeMat: THREE.MeshStandardMaterial;
  headlightBeam: THREE.Mesh;
}

export interface PedestrianRig {
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  phoneGlow: THREE.Mesh;
  alertMark: THREE.Group;
}

export interface ScooterRig {
  root: THREE.Group;
  frontWheel: THREE.Mesh;
  rearWheel: THREE.Mesh;
  brakeMat: THREE.MeshStandardMaterial;
}

export interface SignalGantryRig {
  root: THREE.Group;
  redMat: THREE.MeshStandardMaterial;
  yellowMat: THREE.MeshStandardMaterial;
  greenMat: THREE.MeshStandardMaterial;
}

export interface DogRig {
  root: THREE.Group;
  legs: THREE.Mesh[];
  tail: THREE.Mesh;
  alertMark: THREE.Group;
}

export interface KidsRig {
  root: THREE.Group;
  childrenGroups: THREE.Group[];
  alertMark: THREE.Group;
}

export interface WrongWayBikeRig {
  root: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
}

function createWheel(radius: number, tireMat: THREE.Material, rimMat: THREE.Material, spokeMat: THREE.Material): THREE.Group {
  const wheel = new THREE.Group();

  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.042, 10, 24), tireMat);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.032, 0.016, 8, 20), rimMat);
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 10), rimMat);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);

  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, (radius - 0.03) * 2, 6), spokeMat);
    spoke.rotation.x = (i * Math.PI) / 4;
    wheel.add(spoke);
  }

  return wheel;
}

export function createPlayerBikeRig(contactShadowTex: THREE.Texture): PlayerBikeRig {
  const root = new THREE.Group();
  const leanGroup = new THREE.Group();
  root.add(leanGroup);

  // Calibrated PBR materials with >= 0.25 roughness differentiation
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const matteMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.45,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.16,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.2,
  });
  const brakeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.25,
    metalness: 0.6,
    roughness: 0.25,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x14181f,
    metalness: 0.05,
    roughness: 0.88,
  });
  const saddleMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b18,
    metalness: 0.05,
    roughness: 0.75,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  // Contact shadow grounded at y=0.02
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 2.2),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  const standardChassisGroup = new THREE.Group();
  leanGroup.add(standardChassisGroup);

  const customVoxelGroup = new THREE.Group();
  customVoxelGroup.visible = false;
  leanGroup.add(customVoxelGroup);

  const wheelRadius = 0.34;
  // Rear wheel (+Z)
  const rearWheel = createWheel(wheelRadius, tireMat, rimMat, chromeMat);
  rearWheel.position.set(0, wheelRadius, 0.56);
  standardChassisGroup.add(rearWheel);

  // Front Fork & Steering Assembly (-Z)
  const forkGroup = new THREE.Group();
  forkGroup.position.set(0, wheelRadius, -0.56);
  standardChassisGroup.add(forkGroup);

  const frontWheel = createWheel(wheelRadius, tireMat, rimMat, chromeMat);
  forkGroup.add(frontWheel);

  // Fork tubes
  [-0.055, 0.055].forEach((xOffset) => {
    const forkBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.44, 8), frameMat);
    forkBlade.position.set(xOffset, 0.2, 0.04);
    forkBlade.rotation.x = -0.24;
    forkGroup.add(forkBlade);
  });

  // Stem & Handlebar
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8), chromeMat);
  stem.position.set(0, 0.51, 0.1);
  stem.rotation.x = -0.22;
  forkGroup.add(stem);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.56, 10), matteMetalMat);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 0.62, 0.12);
  handlebar.castShadow = true;
  forkGroup.add(handlebar);

  // Grips & Bell
  [-0.25, 0.25].forEach((gx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.11, 8), tireMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0.62, 0.12);
    forkGroup.add(grip);
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 }));
  bell.position.set(0.14, 0.648, 0.11);
  forkGroup.add(bell);

  // Front Headlight
  const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.06, 10), headLightMat);
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 0.57, 0.06);
  forkGroup.add(headlight);

  // Front Basket (for Ttareungi & Commuter bikes)
  const basketGroup = new THREE.Group();
  const basketMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.6,
    roughness: 0.45,
    wireframe: true,
  });
  const basketBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.2), basketMat);
  basketBody.position.set(0, 0.49, -0.09);
  basketGroup.add(basketBody);
  const basketRim = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.02, 0.21), matteMetalMat);
  basketRim.position.set(0, 0.58, -0.09);
  basketGroup.add(basketRim);
  forkGroup.add(basketGroup);

  // Animated Front Brake Assembly (levers on handlebar + caliper on fork)
  const frontBrakeGroup = new THREE.Group();
  [-0.19, 0.19].forEach((bx) => {
    const leverMount = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.04), matteMetalMat);
    leverMount.position.set(bx, 0.615, 0.095);
    frontBrakeGroup.add(leverMount);

    const leverBlade = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.018, 0.022), brakeGlowMat);
    leverBlade.position.set(bx > 0 ? bx + 0.035 : bx - 0.035, 0.61, 0.07);
    leverBlade.rotation.y = bx > 0 ? -0.28 : 0.28;
    frontBrakeGroup.add(leverBlade);
  });
  const frontCaliper = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 8, 16, Math.PI * 1.15), brakeGlowMat);
  frontCaliper.rotation.z = -Math.PI * 0.08;
  frontCaliper.position.set(0, 0.34, 0.02);
  frontBrakeGroup.add(frontCaliper);
  [-0.06, 0.06].forEach((px) => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.032, 0.045), brakeGlowMat);
    pad.position.set(px, 0.32, 0.02);
    frontBrakeGroup.add(pad);
  });
  forkGroup.add(frontBrakeGroup);

  // Selectable 3D Frame Variants (Diamond, Step-Through, Track, Aero)
  const addTubeTo = (
    target: THREE.Group,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    r: number,
    mat: THREE.Material
  ) => {
    const dist = p1.distanceTo(p2);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dist, 10), mat);
    mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    mesh.castShadow = true;
    target.add(mesh);
  };

  const addTube = (p1: THREE.Vector3, p2: THREE.Vector3, r: number, mat: THREE.Material) => {
    addTubeTo(standardChassisGroup, p1, p2, r, mat);
  };

  const bb = new THREE.Vector3(0, 0.3, 0.1); // bottom bracket
  const headTop = new THREE.Vector3(0, 0.78, -0.42);
  const headBot = new THREE.Vector3(0, 0.64, -0.46);
  const seatTop = new THREE.Vector3(0, 0.81, 0.18);

  const addRearStays = (target: THREE.Group, seatAnchor: THREE.Vector3) => {
    addTubeTo(target, new THREE.Vector3(0, 0.3, 0.1), new THREE.Vector3(-0.055, 0.34, 0.56), 0.013, frameMat);
    addTubeTo(target, new THREE.Vector3(0, 0.3, 0.1), new THREE.Vector3(0.055, 0.34, 0.56), 0.013, frameMat);
    addTubeTo(target, seatAnchor, new THREE.Vector3(-0.055, 0.34, 0.56), 0.012, frameMat);
    addTubeTo(target, seatAnchor, new THREE.Vector3(0.055, 0.34, 0.56), 0.012, frameMat);
  };

  // 1) Diamond (Standard commuter triangle)
  const diamondGroup = new THREE.Group();
  addTubeTo(diamondGroup, bb, headBot, 0.024, frameMat);
  addTubeTo(diamondGroup, seatTop, headTop, 0.022, frameMat);
  addTubeTo(diamondGroup, bb, seatTop, 0.022, frameMat);
  addTubeTo(diamondGroup, headBot, headTop, 0.025, frameMat);
  addRearStays(diamondGroup, seatTop);
  standardChassisGroup.add(diamondGroup);

  // 2) Step-Through (Curved low U-downtube, no high top bar)
  const stepthroughGroup = new THREE.Group();
  stepthroughGroup.visible = false;
  const stepCurve = new THREE.QuadraticBezierCurve3(
    headBot.clone(),
    new THREE.Vector3(0, 0.32, -0.18),
    bb.clone()
  );
  const stepTube = new THREE.Mesh(new THREE.TubeGeometry(stepCurve, 18, 0.029, 10, false), frameMat);
  stepTube.castShadow = true;
  stepthroughGroup.add(stepTube);
  addTubeTo(stepthroughGroup, bb, seatTop, 0.023, frameMat);
  addTubeTo(stepthroughGroup, headBot, headTop, 0.025, frameMat);
  addRearStays(stepthroughGroup, seatTop);
  standardChassisGroup.add(stepthroughGroup);

  // 3) Track (Level horizontal pursuit top tube)
  const trackGroup = new THREE.Group();
  trackGroup.visible = false;
  const trackSeatTop = new THREE.Vector3(0, 0.84, 0.17);
  const trackHeadTop = new THREE.Vector3(0, 0.83, -0.41);
  addTubeTo(trackGroup, bb, headBot, 0.023, frameMat);
  addTubeTo(trackGroup, trackSeatTop, trackHeadTop, 0.022, frameMat);
  addTubeTo(trackGroup, bb, trackSeatTop, 0.022, frameMat);
  addTubeTo(trackGroup, headBot, trackHeadTop, 0.025, frameMat);
  addRearStays(trackGroup, trackSeatTop);
  standardChassisGroup.add(trackGroup);

  // 4) Aero (Sloped bladed racing frame)
  const aeroGroup = new THREE.Group();
  aeroGroup.visible = false;
  const aeroSeatTop = new THREE.Vector3(0, 0.77, 0.19);
  addTubeTo(aeroGroup, bb, headBot, 0.032, frameMat);
  addTubeTo(aeroGroup, aeroSeatTop, headTop, 0.025, frameMat);
  addTubeTo(aeroGroup, bb, aeroSeatTop, 0.026, frameMat);
  addTubeTo(aeroGroup, headBot, headTop, 0.027, frameMat);
  addRearStays(aeroGroup, new THREE.Vector3(0, 0.72, 0.21));
  standardChassisGroup.add(aeroGroup);

  const frameVariantGroups: Record<BikeFrameStyle, THREE.Group> = {
    diamond: diamondGroup,
    stepthrough: stepthroughGroup,
    track: trackGroup,
    aero: aeroGroup,
  };

  // Rear Carrier Rack (shown on Normal / Ttareungi)
  const rearRackGroup = new THREE.Group();
  const rackDeck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.36), matteMetalMat);
  rackDeck.position.set(0, 0.73, 0.52);
  rearRackGroup.add(rackDeck);
  [-0.07, 0.07].forEach((rx) => {
    const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6), matteMetalMat);
    stay.position.set(rx, 0.54, 0.56);
    rearRackGroup.add(stay);
  });
  standardChassisGroup.add(rearRackGroup);

  // Animated Rear Brake Assembly (caliper on rear stays)
  const rearBrakeGroup = new THREE.Group();
  const rearCaliper = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 8, 16, Math.PI * 1.15), brakeGlowMat);
  rearCaliper.position.set(0, 0.66, 0.43);
  rearBrakeGroup.add(rearCaliper);
  [-0.06, 0.06].forEach((px) => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.032, 0.045), brakeGlowMat);
    pad.position.set(px, 0.64, 0.43);
    rearBrakeGroup.add(pad);
  });
  standardChassisGroup.add(rearBrakeGroup);

  // Seatpost & Saddle
  addTube(seatTop, new THREE.Vector3(0, 0.94, 0.21), 0.016, chromeMat);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.25), saddleMat);
  saddle.position.set(0, 0.96, 0.22);
  saddle.castShadow = true;
  standardChassisGroup.add(saddle);

  // Rear safety taillight
  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.03), tailLightMat);
  tailLight.position.set(0, 0.87, 0.25);
  standardChassisGroup.add(tailLight);

  // Crankset
  const crankGroup = new THREE.Group();
  crankGroup.position.copy(bb);
  standardChassisGroup.add(crankGroup);
  const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.015, 16), chromeMat);
  chainring.rotation.z = Math.PI / 2;
  chainring.position.x = 0.04;
  crankGroup.add(chainring);

  // Student Rider (Composite character: torso, jacket, backpack, helmet, arms, pedaling legs)
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.72, metalness: 0.04 }); // high-vis orange-amber school windbreaker
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65, metalness: 0.0 });
  const backpackMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.05 });
  const helmetMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1, clearcoat: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7, metalness: 0.0 });

  const riderTorso = new THREE.Group();
  riderTorso.position.set(0, 0.98, 0.2);
  leanGroup.add(riderTorso);

  // Pelvis & Spine leaning forward toward handlebar
  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.32, 6, 12), jacketMat);
  torsoMesh.position.set(0, 0.25, -0.09);
  torsoMesh.rotation.x = -0.45;
  torsoMesh.castShadow = true;
  riderTorso.add(torsoMesh);

  // Reflective safety stripe on jacket back
  const reflectStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.045, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0x854d0e, emissiveIntensity: 0.4, roughness: 0.3 })
  );
  reflectStripe.position.set(0, 0.26, 0.05);
  reflectStripe.rotation.x = -0.45;
  riderTorso.add(reflectStripe);

  // Student Backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.14), backpackMat);
  backpack.position.set(0, 0.29, 0.08);
  backpack.rotation.x = -0.45;
  backpack.castShadow = true;
  riderTorso.add(backpack);

  // Head & Helmet
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), skinMat);
  head.position.set(0, 0.56, -0.22);
  head.castShadow = true;
  riderTorso.add(head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.132, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), helmetMat);
  helmet.position.set(0, 0.57, -0.22);
  helmet.rotation.x = -0.15;
  helmet.castShadow = true;
  riderTorso.add(helmet);

  const helmetVisor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.08), frameMat);
  helmetVisor.position.set(0, 0.59, -0.34);
  riderTorso.add(helmetVisor);

  // Arms reaching to handlebars
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.38, 4, 8), jacketMat);
    arm.position.set(side * 0.19, 0.26, -0.32);
    arm.rotation.x = 1.05;
    arm.rotation.z = side * -0.12;
    arm.castShadow = true;
    riderTorso.add(arm);
  });

  // Articulated legs at hip pivot
  const makeLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.11, 0.94, 0.18);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.34, 4, 8), pantsMat);
    thigh.position.set(0, -0.22, -0.05);
    thigh.rotation.x = -0.25;
    thigh.castShadow = true;
    pivot.add(thigh);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.18), shoeMat);
    shoe.position.set(0, -0.45, -0.07);
    pivot.add(shoe);
    leanGroup.add(pivot);
    return pivot;
  };

  const leftLegPivot = makeLeg(-1);
  const rightLegPivot = makeLeg(1);

  // Protective Helmet Shield Bubble (shown when pickup active)
  const shieldBubble = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 20, 16),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
    })
  );
  shieldBubble.position.set(0, 0.85, 0);
  shieldBubble.visible = false;
  root.add(shieldBubble);

  return {
    root,
    leanGroup,
    standardChassisGroup,
    customVoxelGroup,
    frontWheel,
    rearWheel,
    forkGroup,
    crankGroup,
    leftLegPivot,
    rightLegPivot,
    riderTorso,
    tailLightMat,
    headLightMat,
    frameMat,
    rimMat,
    basketGroup,
    rearRackGroup,
    frontBrakeGroup,
    rearBrakeGroup,
    brakeGlowMat,
    frameVariantGroups,
    shieldBubble,
    contactShadow,
  };
}

export function applyBikeStyle(
  rig: PlayerBikeRig,
  bikeType: BikeType,
  customPixels?: (string | null)[]
): void {
  if (bikeType === 'custom') {
    rig.standardChassisGroup.visible = false;
    rig.customVoxelGroup.visible = true;
    rig.frameMat.color.setHex(0x38bdf8);
    rig.frameMat.map = null;
    rig.frameMat.needsUpdate = true;

    while (rig.customVoxelGroup.children.length > 0) {
      const child = rig.customVoxelGroup.children[0];
      rig.customVoxelGroup.remove(child);
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    }
    const voxelMesh = createVoxelBikeMesh(customPixels ?? []);
    rig.customVoxelGroup.add(voxelMesh);
    return;
  }

  rig.standardChassisGroup.visible = true;
  rig.customVoxelGroup.visible = false;

  const activeFrame: BikeFrameStyle =
    bikeType === 'ttareungi'
      ? 'stepthrough'
      : bikeType === 'fixie'
      ? 'track'
      : bikeType === 'pro'
      ? 'aero'
      : 'diamond';

  (Object.keys(rig.frameVariantGroups) as BikeFrameStyle[]).forEach((key) => {
    rig.frameVariantGroups[key].visible = key === activeFrame;
  });

  if (bikeType === 'ttareungi') {
    rig.frameMat.color.setHex(0x16a34a);
    rig.frameMat.roughness = 0.28;
    rig.rimMat.color.setHex(0xf1f5f9);
    rig.basketGroup.visible = true;
    rig.rearRackGroup.visible = true;
  } else if (bikeType === 'fixie') {
    rig.frameMat.color.setHex(0x0f172a);
    rig.frameMat.roughness = 0.42;
    rig.rimMat.color.setHex(0xe11d48);
    rig.basketGroup.visible = false;
    rig.rearRackGroup.visible = false;
  } else if (bikeType === 'pro') {
    rig.frameMat.color.setHex(0xd97706);
    rig.frameMat.roughness = 0.16;
    rig.rimMat.color.setHex(0xfacc15);
    rig.basketGroup.visible = false;
    rig.rearRackGroup.visible = false;
  } else {
    rig.frameMat.color.setHex(0x0284c7);
    rig.frameMat.roughness = 0.22;
    rig.rimMat.color.setHex(0xe2e8f0);
    rig.basketGroup.visible = true;
    rig.rearRackGroup.visible = true;
  }

  rig.frameMat.map = null;
  rig.frameMat.needsUpdate = true;
}

export function createCarRig(colorHex: number, contactShadowTex: THREE.Texture): CarRig {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    metalness: 0.65,
    roughness: 0.24,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.2,
    roughness: 0.08,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.25,
    roughness: 0.72,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.05,
    roughness: 0.9,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.88,
    roughness: 0.2,
  });

  const hazardLeftMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.15,
    roughness: 0.25,
  });
  const hazardRightMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.15,
    roughness: 0.25,
  });
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xdc2626,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 4.9),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  // Lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.62, 4.2), bodyMat);
  chassis.position.set(0, 0.56, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.22, 0.18), trimMat);
  frontBumper.position.set(0, 0.36, -2.08);
  root.add(frontBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.22, 0.18), trimMat);
  rearBumper.position.set(0, 0.36, 2.08);
  root.add(rearBumper);

  // Cabin roof
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.56, 2.15), bodyMat);
  cabin.position.set(0, 1.13, 0.12);
  cabin.castShadow = true;
  root.add(cabin);

  // Front & Rear windshields
  const fGlass = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.44, 0.08), glassMat);
  fGlass.position.set(0, 1.11, -0.94);
  fGlass.rotation.x = 0.28;
  root.add(fGlass);

  const rGlass = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.44, 0.08), glassMat);
  rGlass.position.set(0, 1.11, 1.18);
  rGlass.rotation.x = -0.32;
  root.add(rGlass);

  // Side windows
  const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.59, 0.38, 1.78), glassMat);
  sideGlass.position.set(0, 1.13, 0.12);
  root.add(sideGlass);

  // 4 Wheels
  const wheelCoords: [number, number][] = [
    [-0.89, -1.28],
    [0.89, -1.28],
    [-0.89, 1.28],
    [0.89, 1.28],
  ];
  wheelCoords.forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.34, wz);
    tire.castShadow = true;
    root.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.23, 12), alloyMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, 0.34, wz);
    root.add(rim);
  });

  // Taillights & Hazard Indicators (+Z rear facing approaching player)
  const brakeL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), brakeMat);
  brakeL.position.set(-0.62, 0.68, 2.11);
  root.add(brakeL);
  const brakeR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), brakeMat);
  brakeR.position.set(0.62, 0.68, 2.11);
  root.add(brakeR);

  const hazL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.07), hazardLeftMat);
  hazL.position.set(-0.82, 0.68, 2.11);
  root.add(hazL);
  const hazR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.07), hazardRightMat);
  hazR.position.set(0.82, 0.68, 2.11);
  root.add(hazR);

  // Front headlights (-Z front bumper)
  const frontHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.5,
    roughness: 0.15,
  });
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), frontHeadMat);
  headL.position.set(-0.64, 0.64, -2.11);
  const headR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), frontHeadMat);
  headR.position.set(0.64, 0.64, -2.11);
  root.add(headL, headR);

  // Side mirror on driver side (left, -X)
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), bodyMat);
  mirror.position.set(-1.0, 0.92, -0.62);
  root.add(mirror);

  // Articulated Driver Door on left side (-X), hinged at front pillar z = -0.58
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.93, 0.62, -0.58);
  root.add(doorPivot);

  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 1.06), bodyMat);
  doorPanel.position.set(0, 0.02, 0.53);
  doorPanel.castShadow = true;
  doorPivot.add(doorPanel);

  const doorWindowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.96), glassMat);
  doorWindowFrame.position.set(0.02, 0.48, 0.54);
  doorPivot.add(doorWindowFrame);

  // Reflective edge strip inside door (visible when door opens!)
  const doorEdgeAlert = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.44, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.7 })
  );
  doorEdgeAlert.position.set(0, 0.05, 1.04);
  doorPivot.add(doorEdgeAlert);

  // Subtle volumetric headlight cone for blind-spot telegraph
  const beamGeo = new THREE.ConeGeometry(1.1, 4.2, 16, 1, true);
  beamGeo.translate(0, -2.1, 0);
  beamGeo.rotateX(Math.PI / 2);
  const headlightBeam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  headlightBeam.position.set(0, 0.55, -2.1);
  headlightBeam.visible = false;
  root.add(headlightBeam);

  return {
    root,
    doorPivot,
    hazardLeftMat,
    hazardRightMat,
    brakeMat,
    headlightBeam,
  };
}

export function createPoliceCarRig(contactShadowTex: THREE.Texture): PoliceCarRig {
  const car = createCarRig(0xf8fafc, contactShadowTex);
  const root = car.root;

  // Korean police navy-blue hood, trunk & side patrol stripes
  const navyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a8a,
    metalness: 0.5,
    roughness: 0.28,
    clearcoat: 0.8,
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 0.25,
    roughness: 0.35,
  });

  const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.06, 1.05), navyMat);
  hoodPanel.position.set(0, 0.87, -1.48);
  root.add(hoodPanel);

  const trunkPanel = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.06, 0.85), navyMat);
  trunkPanel.position.set(0, 0.87, 1.58);
  root.add(trunkPanel);

  [-0.94, 0.94].forEach((sx) => {
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 3.7), navyMat);
    sideStripe.position.set(sx, 0.62, 0);
    root.add(sideStripe);

    const goldLine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 3.5), goldAccentMat);
    goldLine.position.set(sx, 0.74, 0);
    root.add(goldLine);
  });

  // Roof Police Lightbar (Red & Blue Strobes)
  const barBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.08, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
  );
  barBase.position.set(0, 1.44, 0.12);
  root.add(barBase);

  const redStrobeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });
  const blueStrobeMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.2,
    roughness: 0.15,
  });

  const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.24), redStrobeMat);
  redPod.position.set(-0.34, 1.5, 0.12);
  root.add(redPod);

  const centerPod = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.12, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xf8fafc, emissiveIntensity: 0.8 })
  );
  centerPod.position.set(0, 1.5, 0.12);
  root.add(centerPod);

  const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.24), blueStrobeMat);
  bluePod.position.set(0.34, 1.5, 0.12);
  root.add(bluePod);

  car.headlightBeam.visible = true;

  return {
    root,
    redStrobeMat,
    blueStrobeMat,
    headlightBeam: car.headlightBeam,
  };
}

export function createPedestrianRig(shirtColor: number, contactShadowTex: THREE.Texture): PedestrianRig {
  const root = new THREE.Group();

  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.78, metalness: 0.02 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.8 });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.56, 4, 8), pantsMat);
  leftLeg.position.set(-0.1, 0.36, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.56, 4, 8), pantsMat);
  rightLeg.position.set(0.1, 0.36, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.42, 6, 10), shirtMat);
  torso.position.set(0, 0.98, 0);
  torso.castShadow = true;
  root.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), skinMat);
  head.position.set(0, 1.44, -0.04);
  head.rotation.x = 0.35; // looking down at smartphone!
  head.castShadow = true;
  root.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.132, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.set(0, 1.46, -0.04);
  hair.rotation.x = 0.25;
  root.add(hair);

  // Arms holding smartphone in front
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.24), shirtMat);
  arm.position.set(0, 1.04, -0.18);
  root.add(arm);

  const phoneGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.15, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.1,
    })
  );
  phoneGlow.position.set(0, 1.07, -0.32);
  phoneGlow.rotation.x = -0.65;
  root.add(phoneGlow);

  // Floating "!" alert mark when bell is rung
  const alertMark = new THREE.Group();
  alertMark.position.set(0, 1.82, 0);
  const exBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.26, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
  );
  exBar.position.y = 0.14;
  const exDot = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
  );
  alertMark.add(exBar, exDot);
  alertMark.visible = false;
  root.add(alertMark);

  return { root, leftLeg, rightLeg, phoneGlow, alertMark };
}

export function createScooterRig(contactShadowTex: THREE.Texture): ScooterRig {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.3, clearcoat: 0.8 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.05 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 2.1),
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.5 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const frontWheel = new THREE.Mesh(wheelGeo, tireMat);
  frontWheel.position.set(0, 0.24, -0.62);
  frontWheel.castShadow = true;
  root.add(frontWheel);

  const rearWheel = new THREE.Mesh(wheelGeo, tireMat);
  rearWheel.position.set(0, 0.24, 0.6);
  rearWheel.castShadow = true;
  root.add(rearWheel);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 1.3), bodyMat);
  deck.position.set(0, 0.45, 0);
  deck.castShadow = true;
  root.add(deck);

  const frontShield = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.26), bodyMat);
  frontShield.position.set(0, 0.72, -0.52);
  frontShield.rotation.x = 0.16;
  frontShield.castShadow = true;
  root.add(frontShield);

  // Delivery cargo box on back
  const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.52), boxMat);
  cargoBox.position.set(0, 0.88, 0.55);
  cargoBox.castShadow = true;
  root.add(cargoBox);

  const cargoStripe = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.1, 0.53), stripeMat);
  cargoStripe.position.set(0, 0.92, 0.55);
  root.add(cargoStripe);

  // Rider
  const rider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 0.46, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 })
  );
  rider.position.set(0, 1.05, 0.02);
  rider.rotation.x = -0.2;
  rider.castShadow = true;
  root.add(rider);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 10),
    new THREE.MeshPhysicalMaterial({ color: 0xfacc15, roughness: 0.25, clearcoat: 0.8 })
  );
  helmet.position.set(0, 1.46, -0.05);
  root.add(helmet);

  const brakeLight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.05), brakeMat);
  brakeLight.position.set(0, 0.56, 0.68);
  root.add(brakeLight);

  return { root, frontWheel, rearWheel, brakeMat };
}

export function createRoadworkGroup(): THREE.Group {
  const group = new THREE.Group();

  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, metalness: 0.05 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x475569, emissiveIntensity: 0.2, roughness: 0.3 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

  // Two cones + striped safety barrier bar
  [-0.7, 0.7].forEach((cx) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), baseMat);
    base.position.set(cx, 0.03, 0);
    group.add(base);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.68, 12), orangeMat);
    cone.position.set(cx, 0.37, 0);
    cone.castShadow = true;
    group.add(cone);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.14, 12), whiteMat);
    band.position.set(cx, 0.4, 0);
    group.add(band);
  });

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.16, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
  );
  bar.position.set(0, 0.56, 0);
  bar.castShadow = true;
  group.add(bar);

  const flashBeacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
  );
  flashBeacon.position.set(0, 0.7, 0);
  group.add(flashBeacon);

  return group;
}

export function createSignalGantry(): SignalGantryRig {
  const root = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.38 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.3, roughness: 0.55 });

  // Pole on right sidewalk (+5.4) and arm spanning over both bike lane and car lanes
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 5.6, 10), poleMat);
  pole.position.set(5.45, 2.8, 0);
  pole.castShadow = true;
  root.add(pole);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 9.6, 10), poleMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.75, 5.2, 0);
  root.add(arm);

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.15,
    roughness: 0.2,
  });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 0.15,
    roughness: 0.2,
  });
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const lampGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.09, 14);
  lampGeo.rotateX(Math.PI / 2);

  // Two horizontal 3-light overhead housings (center vehicle lane + right bike lane)
  [-0.3, 3.15].forEach((hx) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.64, 0.4), boxMat);
    housing.position.set(hx, 5.15, 0.22);
    root.add(housing);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.08, 0.22), boxMat);
    visor.position.set(hx, 5.44, 0.44);
    root.add(visor);

    const redLamp = new THREE.Mesh(lampGeo, redMat);
    redLamp.position.set(hx - 0.56, 5.15, 0.43);
    const yellowLamp = new THREE.Mesh(lampGeo, yellowMat);
    yellowLamp.position.set(hx, 5.15, 0.43);
    const greenLamp = new THREE.Mesh(lampGeo, greenMat);
    greenLamp.position.set(hx + 0.56, 5.15, 0.43);
    root.add(redLamp, yellowLamp, greenLamp);
  });

  // Eye-level auxiliary vertical signal head on the right pole for cyclists
  const auxBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.25, 0.3), boxMat);
  auxBox.position.set(5.1, 2.75, 0.16);
  root.add(auxBox);

  const auxLampGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12);
  auxLampGeo.rotateX(Math.PI / 2);
  const auxRed = new THREE.Mesh(auxLampGeo, redMat);
  auxRed.position.set(5.1, 3.1, 0.32);
  const auxYellow = new THREE.Mesh(auxLampGeo, yellowMat);
  auxYellow.position.set(5.1, 2.75, 0.32);
  const auxGreen = new THREE.Mesh(auxLampGeo, greenMat);
  auxGreen.position.set(5.1, 2.4, 0.32);
  root.add(auxRed, auxYellow, auxGreen);

  return { root, redMat, yellowMat, greenMat };
}

export function createTreeGroup(): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 })
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.82 });

  const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), leafMat1);
  crown1.position.set(0, 2.8, 0);
  crown1.castShadow = true;
  tree.add(crown1);

  const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), leafMat2);
  crown2.position.set(0.45, 3.3, 0.2);
  crown2.castShadow = true;
  tree.add(crown2);

  return tree;
}

export function createPickupGroup(kind: 'shield' | 'double' | 'star'): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'shield') {
    // Blue safety helmet shield orb
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.5, roughness: 0.2, clearcoat: 1 })
    );
    shell.position.y = 0.72;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0.9 })
    );
    ring.position.y = 0.72;
    ring.rotation.x = Math.PI / 3;
    group.add(shell, ring);
  } else if (kind === 'double') {
    // Safety light / x2 score booster
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.4 })
    );
    core.position.y = 0.75;
    group.add(core);
  } else {
    // Green safe-ride coin
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.2 })
    );
    coin.rotation.x = Math.PI / 2;
    coin.position.y = 0.72;
    group.add(coin);
  }

  return group;
}

export function createDogRig(contactShadowTex: THREE.Texture): DogRig {
  const root = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85, metalness: 0.02 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.85 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 1.05),
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.45 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  // Body facing -X (darting from right sidewalk into bike lane)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 6, 10), furMat);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.38, 0);
  body.castShadow = true;
  root.add(body);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 14), collarMat);
  collar.rotation.y = Math.PI / 2;
  collar.position.set(-0.22, 0.43, 0);
  root.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), furMat);
  head.position.set(-0.32, 0.52, 0);
  head.castShadow = true;
  root.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), bellyMat);
  snout.position.set(-0.44, 0.49, 0);
  root.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), noseMat);
  nose.position.set(-0.51, 0.51, 0);
  root.add(nose);

  [-0.12, 0.12].forEach((ez) => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.05), furMat);
    ear.position.set(-0.3, 0.52, ez);
    ear.rotation.x = ez > 0 ? 0.25 : -0.25;
    root.add(ear);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 6), furMat);
  tail.position.set(0.3, 0.48, 0);
  tail.rotation.z = -0.6;
  root.add(tail);

  const legGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.26, 6);
  const legCoords: [number, number][] = [
    [-0.18, -0.09],
    [-0.18, 0.09],
    [0.18, -0.09],
    [0.18, 0.09],
  ];
  const legs = legCoords.map(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, bellyMat);
    leg.position.set(lx, 0.14, lz);
    leg.castShadow = true;
    root.add(leg);
    return leg;
  });

  const alertMark = new THREE.Group();
  alertMark.position.set(-0.2, 0.92, 0);
  const exBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.24, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
  );
  exBar.position.y = 0.14;
  const exDot = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
  );
  alertMark.add(exBar, exDot);
  alertMark.visible = false;
  root.add(alertMark);

  return { root, legs, tail, alertMark };
}

export function createKidsGroup(contactShadowTex: THREE.Texture): KidsRig {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 }); // Yellow school-zone safety cap!

  const makeKid = (shirtHex: number, packHex: number, offsetX: number, offsetZ: number) => {
    const g = new THREE.Group();
    g.position.set(offsetX, 0, offsetZ);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.7),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.42 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    g.add(shadow);

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.78 });
    const packMat = new THREE.MeshStandardMaterial({ color: packHex, roughness: 0.7 });

    [-0.08, 0.08].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.36, 4, 8), pantsMat);
      leg.position.set(lx, 0.25, 0);
      leg.castShadow = true;
      g.add(leg);
    });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 6, 10), shirtMat);
    torso.position.set(0, 0.68, 0);
    torso.castShadow = true;
    g.add(torso);

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.12), packMat);
    backpack.position.set(0, 0.7, 0.13);
    backpack.castShadow = true;
    g.add(backpack);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), skinMat);
    head.position.set(0, 1.03, 0);
    head.castShadow = true;
    g.add(head);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    cap.position.set(0, 1.05, 0);
    g.add(cap);

    return g;
  };

  const kid1 = makeKid(0xf43f5e, 0xbe123c, -0.32, 0);
  const kid2 = makeKid(0x0ea5e9, 0x0369a1, 0.32, 0.28);
  root.add(kid1, kid2);

  const alertMark = new THREE.Group();
  alertMark.position.set(0, 1.48, 0);
  const exBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.26, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
  );
  exBar.position.y = 0.14;
  const exDot = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
  );
  alertMark.add(exBar, exDot);
  alertMark.visible = false;
  root.add(alertMark);

  return { root, childrenGroups: [kid1, kid2], alertMark };
}

export function createWrongWayBikeRig(contactShadowTex: THREE.Texture): WrongWayBikeRig {
  const root = new THREE.Group();
  const bikeGroup = new THREE.Group();
  bikeGroup.rotation.y = Math.PI; // Facing +Z directly toward the player (wrong-way!)
  root.add(bikeGroup);

  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0xdc2626, metalness: 0.65, roughness: 0.25, clearcoat: 0.85 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
  const riderMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 2.0),
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.48 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  bikeGroup.add(shadow);

  const frontWheel = createWheel(0.33, tireMat, chromeMat, chromeMat);
  frontWheel.position.set(0, 0.33, -0.54);
  const rearWheel = createWheel(0.33, tireMat, chromeMat, chromeMat);
  rearWheel.position.set(0, 0.33, 0.54);
  bikeGroup.add(frontWheel, rearWheel);

  const frameBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.98), frameMat);
  frameBar.position.set(0, 0.66, 0);
  bikeGroup.add(frameBar);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.54, 8), tireMat);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 0.9, -0.42);
  bikeGroup.add(handlebar);

  // Bright warning front headlight facing player
  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 2.2 })
  );
  headlight.position.set(0, 0.86, -0.48);
  bikeGroup.add(headlight);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.38, 6, 10), riderMat);
  torso.position.set(0, 1.12, 0.06);
  torso.rotation.x = -0.38;
  torso.castShadow = true;
  bikeGroup.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), helmetMat);
  head.position.set(0, 1.48, -0.1);
  head.castShadow = true;
  bikeGroup.add(head);

  return { root, frontWheel, rearWheel };
}

export function createGravelGroup(): THREE.Group {
  const group = new THREE.Group();

  // Dusty gravel base decal
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(0.88, 16),
    new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  );
  patch.rotation.x = -Math.PI / 2;
  patch.position.y = 0.035;
  group.add(patch);

  const stoneMat1 = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.92, flatShading: true });
  const stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9, flatShading: true });
  const stoneMat3 = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.88, flatShading: true });
  const mats = [stoneMat1, stoneMat2, stoneMat3];

  const offsets: [number, number, number][] = [
    [-0.38, -0.22, 0.14],
    [0.24, -0.3, 0.16],
    [0.02, 0.06, 0.19],
    [-0.28, 0.32, 0.13],
    [0.36, 0.22, 0.15],
    [-0.08, -0.36, 0.11],
    [0.44, -0.05, 0.12],
    [-0.45, 0.08, 0.12],
  ];

  offsets.forEach(([sx, sz, r], idx) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mats[idx % mats.length]);
    rock.position.set(sx, r * 0.65, sz);
    rock.scale.set(1.2, 0.72, 1.0);
    rock.rotation.set(idx * 0.7, idx * 1.1, 0);
    rock.castShadow = true;
    group.add(rock);
  });

  return group;
}
