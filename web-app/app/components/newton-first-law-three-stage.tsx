import { useEffect, useRef } from "react";

import { MOTION_CART_COLORS } from "./motion-cart-colors";

type ThreeModule = typeof import("three");

type NewtonObservationState = "idle" | "observing" | "stable";
type SurfaceKey = "towel" | "cotton" | "board" | "ideal";

type NewtonFirstLawThreeStageProps = {
  currentMotion: {
    time: number;
    position: number;
    velocity: number;
  };
  observationState: NewtonObservationState;
  physicalDurationSeconds: number;
  distanceDomain: number;
  stopDistanceMeters: number | null;
  surfaceKey: SurfaceKey;
  accentColor: string;
  resistanceLabel: string;
};

type MotionStateRef = {
  time: number;
  position: number;
  velocity: number;
  observationState: NewtonObservationState;
  physicalDurationSeconds: number;
  distanceDomain: number;
  stopDistanceMeters: number | null;
};

const WORLD_UNITS_PER_METER = 1.8;
const ROAD_THICKNESS = 0.18;
const ROAD_SURFACE_Y = ROAD_THICKNESS;
const ROAD_WIDTH = 5.4;
const TRACK_TRAVEL_WORLD = 13.6;
const RAMP_RUN_WORLD = 5.2;
const RAMP_HEIGHT_WORLD = 2.05;
const RAMP_ENTRY_X = 0.2;
const RAMP_START_X = RAMP_ENTRY_X - RAMP_RUN_WORLD;
const TRACK_END_X = RAMP_ENTRY_X + TRACK_TRAVEL_WORLD;
const TRACK_CENTER_X = (RAMP_ENTRY_X + TRACK_END_X) / 2;
const RELEASE_LEAD_SECONDS = 0.34;
const DEFAULT_CAMERA_ZOOM_RATIO = 1.3;
const MIN_CAMERA_ZOOM_RATIO = 0.92;
const MAX_CAMERA_ZOOM_RATIO = 2.1;
const CAMERA_WHEEL_STEP = 0.0012;
const CAMERA_DRAG_ROTATION_STEP = 0.005;
const CAMERA_ORBIT_DAMPING = 0.14;
const MIN_CAMERA_PITCH_OFFSET = -0.22;
const MAX_CAMERA_PITCH_OFFSET = 0.28;
const MIN_CAMERA_ELEVATION = 0.04;
const MAX_CAMERA_ELEVATION = 0.72;
const CART_MODEL_SCALE = 0.42;
const STAGE_FOCUS_X = RAMP_ENTRY_X + TRACK_TRAVEL_WORLD * 0.42;
const STAGE_FOCUS_Y = 0.96;
const CAMERA_TRACK_MIN_X = STAGE_FOCUS_X - 2.8;
const CAMERA_TRACK_MAX_X = STAGE_FOCUS_X + 3.2;
const RAMP_IDLE_FRONT_X = RAMP_START_X + RAMP_RUN_WORLD * 0.74;
const RAMP_EXIT_FRONT_X = RAMP_ENTRY_X + 0.96;
const CAR_FRONT_OFFSET_M = 2.18;
const CAR_FRONT_OFFSET_WORLD = toCartWorldUnits(CAR_FRONT_OFFSET_M);
const CAR_WHEEL_RADIUS_M = 0.34;
const CAR_WHEEL_RADIUS_WORLD = toCartWorldUnits(CAR_WHEEL_RADIUS_M);
const CAR_WHEEL_CENTER_Y =
  ROAD_SURFACE_Y + CAR_WHEEL_RADIUS_WORLD + toCartWorldUnits(0.01);
const CAR_BODY_WIDTH_M = 1.76;
const CAR_CABIN_WIDTH_M = 1.38;
const CAR_GLASS_WIDTH_M = 1.02;
const CAR_WHEEL_X_OFFSETS_M = [1.42, -1.38] as const;
const CAR_WHEEL_Z_OFFSETS_M = [0.85, -0.85] as const;
const RAMP_ANGLE = Math.atan2(RAMP_HEIGHT_WORLD, RAMP_RUN_WORLD);

export function NewtonFirstLawThreeStage({
  currentMotion,
  observationState,
  physicalDurationSeconds,
  distanceDomain,
  stopDistanceMeters,
  surfaceKey,
  accentColor,
  resistanceLabel,
}: NewtonFirstLawThreeStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cameraZoomRef = useRef(DEFAULT_CAMERA_ZOOM_RATIO);
  const cameraOrbitRef = useRef({
    yawOffset: 0,
    pitchOffset: 0,
    targetYawOffset: 0,
    targetPitchOffset: 0,
    isDragging: false,
    pointerId: -1,
    lastPointerX: 0,
    lastPointerY: 0,
  });
  const motionStateRef = useRef<MotionStateRef>({
    time: currentMotion.time,
    position: currentMotion.position,
    velocity: currentMotion.velocity,
    observationState,
    physicalDurationSeconds,
    distanceDomain,
    stopDistanceMeters,
  });

  useEffect(() => {
    motionStateRef.current = {
      time: currentMotion.time,
      position: currentMotion.position,
      velocity: currentMotion.velocity,
      observationState,
      physicalDurationSeconds,
      distanceDomain,
      stopDistanceMeters,
    };
  }, [
    currentMotion.position,
    currentMotion.time,
    currentMotion.velocity,
    distanceDomain,
    observationState,
    physicalDurationSeconds,
    stopDistanceMeters,
  ]);

  useEffect(() => {
    let isDisposed = false;
    let animationFrameId = 0;
    let hostElement: HTMLDivElement | null = null;
    let rendererCanvas: HTMLCanvasElement | null = null;
    let rendererInstance: any = null;
    let sceneInstance: any = null;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      cameraZoomRef.current = clamp(
        cameraZoomRef.current + event.deltaY * CAMERA_WHEEL_STEP,
        MIN_CAMERA_ZOOM_RATIO,
        MAX_CAMERA_ZOOM_RATIO,
      );
    }

    function stopDragging() {
      const orbitState = cameraOrbitRef.current;
      orbitState.isDragging = false;
      orbitState.pointerId = -1;
      if (hostElement) {
        hostElement.classList.remove("is-dragging");
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0 || !hostElement) {
        return;
      }

      event.preventDefault();
      const orbitState = cameraOrbitRef.current;
      orbitState.isDragging = true;
      orbitState.pointerId = event.pointerId;
      orbitState.lastPointerX = event.clientX;
      orbitState.lastPointerY = event.clientY;
      hostElement.classList.add("is-dragging");
      hostElement.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      const orbitState = cameraOrbitRef.current;
      if (!orbitState.isDragging || orbitState.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const deltaX = event.clientX - orbitState.lastPointerX;
      const deltaY = event.clientY - orbitState.lastPointerY;
      orbitState.lastPointerX = event.clientX;
      orbitState.lastPointerY = event.clientY;
      orbitState.targetYawOffset += deltaX * CAMERA_DRAG_ROTATION_STEP;
      orbitState.targetPitchOffset = clamp(
        orbitState.targetPitchOffset + deltaY * CAMERA_DRAG_ROTATION_STEP,
        MIN_CAMERA_PITCH_OFFSET,
        MAX_CAMERA_PITCH_OFFSET,
      );
    }

    function handlePointerUp(event: PointerEvent) {
      if (!hostElement) {
        return;
      }

      const orbitState = cameraOrbitRef.current;
      if (orbitState.pointerId !== event.pointerId) {
        return;
      }

      if (hostElement.hasPointerCapture(event.pointerId)) {
        hostElement.releasePointerCapture(event.pointerId);
      }

      stopDragging();
    }

    async function setupScene() {
      const THREE = await import("three");

      if (isDisposed || !hostRef.current) {
        return;
      }

      hostElement = hostRef.current;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      rendererInstance = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const rendererCanvasElement = renderer.domElement;
      rendererCanvas = rendererCanvasElement;
      hostElement.appendChild(rendererCanvasElement);

      const scene = new THREE.Scene();
      sceneInstance = scene;
      scene.fog = new THREE.FogExp2(0x07111f, 0.018);

      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
      camera.position.set(-8.6, 5.2, 11.4);

      const ambientLight = new THREE.HemisphereLight(0xcbe5ff, 0x08101c, 2.2);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(8, 16, 14);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x67c6ff, 1.2);
      rimLight.position.set(-10, 8, -16);
      scene.add(rimLight);

      scene.add(buildGround(THREE));
      scene.add(buildRamp(THREE));

      const trackSurfaceMaterial = buildSurfaceMaterial(THREE, surfaceKey, accentColor);
      const track = buildFlatTrack(THREE, trackSurfaceMaterial);
      scene.add(track);
      scene.add(buildSurfaceDetailGroup(THREE, surfaceKey, accentColor));
      scene.add(buildTrackSideRails(THREE, accentColor));
      scene.add(buildReferenceBeacons(THREE, accentColor));

      const stopMarker = buildStopMarker(THREE, accentColor);
      scene.add(stopMarker);

      const carRig = buildSedanRig(THREE);
      scene.add(carRig.group);

      const velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1.8, 0),
        2.2,
        0x67c6ff,
        0.42,
        0.24,
      );
      scene.add(velocityArrow);

      const frictionArrow = new THREE.ArrowHelper(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 2.3, 0),
        1.6,
        0xffbf67,
        0.38,
        0.22,
      );
      scene.add(frictionArrow);

      hostElement.addEventListener("wheel", handleWheel, { passive: false });
      hostElement.addEventListener("pointerdown", handlePointerDown);
      hostElement.addEventListener("pointermove", handlePointerMove);
      hostElement.addEventListener("pointerup", handlePointerUp);
      hostElement.addEventListener("pointercancel", handlePointerUp);
      hostElement.addEventListener("lostpointercapture", stopDragging);

      const lookAtTarget = new THREE.Vector3(0, 1.08, 0);
      const desiredCameraPosition = new THREE.Vector3();
      const orbitOffset = new THREE.Vector3();

      function resizeRendererToDisplaySize() {
        if (!hostElement) {
          return;
        }

        const width = hostElement.clientWidth;
        const height = hostElement.clientHeight;
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        const needResize =
          renderer.domElement.width !== Math.floor(width * pixelRatio) ||
          renderer.domElement.height !== Math.floor(height * pixelRatio);

        if (needResize) {
          renderer.setSize(width, height, false);
        }

        if (height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      }

      function render() {
        if (isDisposed) {
          return;
        }

        resizeRendererToDisplaySize();

        const state = motionStateRef.current;
        const leadDuration = Math.min(
          RELEASE_LEAD_SECONDS,
          Math.max(0.22, state.physicalDurationSeconds * 0.16),
        );
        const normalizedFlatProgress = clamp(
          state.distanceDomain <= 0 ? 0 : state.position / state.distanceDomain,
          0,
          1,
        );
        const flatWorldX = RAMP_ENTRY_X + normalizedFlatProgress * TRACK_TRAVEL_WORLD;
        let visualFrontX = flatWorldX;
        let visualY = CAR_WHEEL_CENTER_Y;
        let carTilt = 0;
        let traveledMeters = state.position;

        if (state.observationState === "idle") {
          visualFrontX = RAMP_IDLE_FRONT_X;
          visualY = resolveRampWheelCenterY(visualFrontX);
          carTilt = -RAMP_ANGLE;
          traveledMeters = 0;
        } else if (state.observationState === "observing" && state.time < leadDuration) {
          const rampProgress = clamp(state.time / leadDuration, 0, 1);
          visualFrontX = lerp(RAMP_IDLE_FRONT_X, RAMP_EXIT_FRONT_X, rampProgress);
          visualY = resolveRampWheelCenterY(visualFrontX);
          carTilt = lerp(-RAMP_ANGLE, 0, rampProgress);
          traveledMeters = rampProgress * (RAMP_RUN_WORLD / WORLD_UNITS_PER_METER);
        }

        const carCenterX = visualFrontX - CAR_FRONT_OFFSET_WORLD;
        carRig.group.position.set(carCenterX, visualY, 0);
        carRig.group.rotation.z += (carTilt - carRig.group.rotation.z) * 0.12;
        const wheelAngle = traveledMeters / CAR_WHEEL_RADIUS_M;
        carRig.wheelRotors.forEach((wheelRotor) => {
          wheelRotor.rotation.z = -wheelAngle;
        });

        const suspensionCompression = clamp(state.velocity / 5.2, 0, 1);
        const bodyFloat = 0.12 + suspensionCompression * 0.02 + Math.abs(carTilt) * 0.03;
        carRig.bodyGroup.position.y +=
          (bodyFloat - carRig.bodyGroup.position.y) * 0.12;
        carRig.shadow.material.opacity = 0.24 + suspensionCompression * 0.04;

        const stopX = state.stopDistanceMeters === null
          ? null
          : RAMP_ENTRY_X +
            clamp(
              state.distanceDomain <= 0
                ? 0
                : state.stopDistanceMeters / state.distanceDomain,
              0,
              1,
            ) * TRACK_TRAVEL_WORLD;
        stopMarker.visible = stopX !== null;
        if (stopX !== null) {
          stopMarker.position.x = stopX;
        }

        velocityArrow.visible =
          state.observationState !== "idle" && state.velocity > 0.04;
        if (velocityArrow.visible) {
          velocityArrow.position.set(
            carCenterX + CAR_FRONT_OFFSET_WORLD - 0.46,
            visualY + 0.48,
            -(ROAD_WIDTH / 2 - 0.72),
          );
          velocityArrow.setDirection(new THREE.Vector3(1, 0, 0));
          velocityArrow.setLength(
            clamp(state.velocity * 1.18, 0.9, 4),
            0.32,
            0.18,
          );
        }

        const frictionStrength = parseResistanceStrength(resistanceLabel);
        frictionArrow.visible =
          state.observationState !== "idle" &&
          state.velocity > 0.04 &&
          surfaceKey !== "ideal";
        if (frictionArrow.visible) {
          frictionArrow.position.set(
            carCenterX + CAR_FRONT_OFFSET_WORLD - 0.46,
            visualY + 0.92,
            ROAD_WIDTH / 2 - 0.72,
          );
          frictionArrow.setDirection(new THREE.Vector3(-1, 0, 0));
          frictionArrow.setLength(
            clamp(0.96 + frictionStrength * 1.18, 0.9, 3.6),
            0.3,
            0.18,
          );
        }

        const orbitState = cameraOrbitRef.current;
        orbitState.yawOffset +=
          (orbitState.targetYawOffset - orbitState.yawOffset) * CAMERA_ORBIT_DAMPING;
        orbitState.pitchOffset +=
          (orbitState.targetPitchOffset - orbitState.pitchOffset) * CAMERA_ORBIT_DAMPING;

        const desiredLookAtX = clamp(
          carCenterX + 2.8,
          CAMERA_TRACK_MIN_X,
          CAMERA_TRACK_MAX_X,
        );
        lookAtTarget.x += (desiredLookAtX - lookAtTarget.x) * 0.12;
        lookAtTarget.y +=
          (STAGE_FOCUS_Y + Math.abs(carTilt) * 0.08 - lookAtTarget.y) * 0.12;

        const zoomRatio = cameraZoomRef.current;
        const baseOffsetX = -10.6 * zoomRatio;
        const baseOffsetY = 4.8 + (zoomRatio - 1) * 1.9 + Math.abs(carTilt) * 0.4;
        const baseOffsetZ = 10.4 * zoomRatio;
        const baseElevation = Math.atan2(
          baseOffsetY,
          Math.hypot(baseOffsetX, baseOffsetZ),
        );
        const baseAzimuth = Math.atan2(baseOffsetZ, baseOffsetX);
        const cameraRadius = Math.hypot(baseOffsetX, baseOffsetY, baseOffsetZ);
        const orbitElevation = clamp(
          baseElevation + orbitState.pitchOffset,
          MIN_CAMERA_ELEVATION,
          MAX_CAMERA_ELEVATION,
        );
        const orbitAzimuth = baseAzimuth + orbitState.yawOffset;
        const orbitHorizontalRadius = Math.cos(orbitElevation) * cameraRadius;

        orbitOffset.set(
          Math.cos(orbitAzimuth) * orbitHorizontalRadius,
          Math.sin(orbitElevation) * cameraRadius,
          Math.sin(orbitAzimuth) * orbitHorizontalRadius,
        );
        desiredCameraPosition.copy(lookAtTarget).add(orbitOffset);
        camera.position.x +=
          (desiredCameraPosition.x - camera.position.x) * 0.08;
        camera.position.y +=
          (desiredCameraPosition.y - camera.position.y) * 0.08;
        camera.position.z +=
          (desiredCameraPosition.z - camera.position.z) * 0.08;
        camera.lookAt(lookAtTarget);

        renderer.render(scene, camera);
        animationFrameId = window.requestAnimationFrame(render);
      }

      render();
    }

    void setupScene();

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrameId);

      if (hostElement) {
        hostElement.removeEventListener("wheel", handleWheel);
        hostElement.removeEventListener("pointerdown", handlePointerDown);
        hostElement.removeEventListener("pointermove", handlePointerMove);
        hostElement.removeEventListener("pointerup", handlePointerUp);
        hostElement.removeEventListener("pointercancel", handlePointerUp);
        hostElement.removeEventListener("lostpointercapture", stopDragging);
        hostElement.classList.remove("is-dragging");
      }

      if (rendererInstance) {
        rendererInstance.dispose();
      }

      if (sceneInstance) {
        disposeSceneGraph(sceneInstance);
      }

      if (hostElement && rendererCanvas && rendererCanvas.parentNode === hostElement) {
        hostElement.removeChild(rendererCanvas);
      }
    };
  }, [accentColor, resistanceLabel, surfaceKey]);

  return <div ref={hostRef} className="motion-stage-3d-layer" aria-hidden="true" />;
}

function buildGround(THREE: ThreeModule) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 26),
    new THREE.MeshStandardMaterial({
      color: 0x07111d,
      roughness: 0.96,
      metalness: 0.08,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(TRACK_CENTER_X - 1, -0.02, 0);
  return ground;
}

function buildRamp(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(RAMP_START_X, ROAD_SURFACE_Y + RAMP_HEIGHT_WORLD);
  shape.lineTo(RAMP_ENTRY_X, ROAD_SURFACE_Y);
  shape.lineTo(RAMP_ENTRY_X, 0);
  shape.lineTo(RAMP_START_X, 0);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: ROAD_WIDTH,
    steps: 1,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -ROAD_WIDTH / 2);

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x162335,
      roughness: 0.72,
      metalness: 0.12,
    }),
  );
}

function buildFlatTrack(THREE: ThreeModule, material: InstanceType<ThreeModule["MeshStandardMaterial"]>) {
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_TRAVEL_WORLD + 0.8, ROAD_THICKNESS, ROAD_WIDTH),
    material,
  );
  track.position.set(
    RAMP_ENTRY_X + (TRACK_TRAVEL_WORLD + 0.8) / 2,
    ROAD_THICKNESS / 2,
    0,
  );
  return track;
}

function buildSurfaceMaterial(
  THREE: ThreeModule,
  surfaceKey: SurfaceKey,
  accentColor: string,
) {
  if (surfaceKey === "ideal") {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor).multiplyScalar(0.36),
      emissiveIntensity: 0.44,
      roughness: 0.14,
      metalness: 0.26,
      transparent: true,
      opacity: 0.88,
    });
  }

  const colorMap: Record<Exclude<SurfaceKey, "ideal">, number> = {
    towel: 0x6f4954,
    cotton: 0x857067,
    board: 0x6d5440,
  };

  return new THREE.MeshStandardMaterial({
    color: colorMap[surfaceKey],
    roughness: surfaceKey === "board" ? 0.8 : 0.92,
    metalness: 0.06,
  });
}

function buildSurfaceDetailGroup(
  THREE: ThreeModule,
  surfaceKey: SurfaceKey,
  accentColor: string,
) {
  const group = new THREE.Group();
  group.position.set(0, ROAD_SURFACE_Y + 0.012, 0);

  if (surfaceKey === "ideal") {
    const glowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_TRAVEL_WORLD + 0.4, 0.03, ROAD_WIDTH - 0.6),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(accentColor),
        emissive: new THREE.Color(accentColor).multiplyScalar(0.7),
        emissiveIntensity: 0.7,
        roughness: 0.1,
        metalness: 0.34,
        transparent: true,
        opacity: 0.76,
      }),
    );
    glowStrip.position.x = RAMP_ENTRY_X + TRACK_TRAVEL_WORLD / 2;
    group.add(glowStrip);
    return group;
  }

  if (surfaceKey === "board") {
    for (let index = 0; index < 6; index += 1) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_TRAVEL_WORLD + 0.3, 0.012, 0.68),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? 0x8b674c : 0x78563f,
          roughness: 0.88,
          metalness: 0.02,
        }),
      );
      plank.position.set(
        RAMP_ENTRY_X + TRACK_TRAVEL_WORLD / 2,
        0,
        -1.7 + index * 0.68,
      );
      group.add(plank);
    }
    return group;
  }

  const detailColor = surfaceKey === "towel" ? 0xa87b86 : 0xb39a91;
  const detailHeight = surfaceKey === "towel" ? 0.04 : 0.025;
  const detailSpacing = surfaceKey === "towel" ? 0.34 : 0.28;
  const detailDepth = surfaceKey === "towel" ? 0.12 : 0.08;
  const rows = surfaceKey === "towel" ? 11 : 13;

  for (let row = 0; row < rows; row += 1) {
    const fiber = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_TRAVEL_WORLD + 0.1, detailHeight, detailDepth),
      new THREE.MeshStandardMaterial({
        color: detailColor,
        roughness: 0.96,
        metalness: 0.02,
      }),
    );
    fiber.position.set(
      RAMP_ENTRY_X + TRACK_TRAVEL_WORLD / 2,
      0,
      -((rows - 1) * detailSpacing) / 2 + row * detailSpacing,
    );
    group.add(fiber);
  }

  return group;
}

function buildTrackSideRails(THREE: ThreeModule, accentColor: string) {
  const rails = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor).multiplyScalar(0.45),
    emissiveIntensity: 0.38,
    roughness: 0.34,
    metalness: 0.22,
  });

  [-1, 1].forEach((direction) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_TRAVEL_WORLD + 0.5, 0.03, 0.12),
      material,
    );
    rail.position.set(
      RAMP_ENTRY_X + TRACK_TRAVEL_WORLD / 2,
      ROAD_SURFACE_Y + 0.04,
      direction * (ROAD_WIDTH / 2 - 0.1),
    );
    rails.add(rail);
  });

  return rails;
}

function buildReferenceBeacons(THREE: ThreeModule, accentColor: string) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xb9d9ff,
    emissive: new THREE.Color(accentColor).multiplyScalar(0.4),
    emissiveIntensity: 0.18,
    roughness: 0.46,
    metalness: 0.22,
  });

  for (let index = 0; index < 5; index += 1) {
    const x = RAMP_ENTRY_X + (TRACK_TRAVEL_WORLD * index) / 4;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.72, 8),
      material,
    );
    post.position.set(x, ROAD_SURFACE_Y + 0.34, 0);
    group.add(post);
  }

  return group;
}

function buildStopMarker(THREE: ThreeModule, accentColor: string) {
  const markerGroup = new THREE.Group();
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffd391,
      emissive: 0xffb766,
      emissiveIntensity: 0.22,
      roughness: 0.3,
      metalness: 0.16,
    }),
  );
  mast.position.y = ROAD_SURFACE_Y + 0.56;
  markerGroup.add(mast);

  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.18, 0.04),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor).multiplyScalar(0.32),
      emissiveIntensity: 0.18,
      roughness: 0.26,
      metalness: 0.18,
    }),
  );
  flag.position.set(0.28, ROAD_SURFACE_Y + 1, 0);
  markerGroup.add(flag);
  return markerGroup;
}

function buildSedanRig(THREE: ThreeModule) {
  const carGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const wheelRotors: Array<any> = [];

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.body),
    emissive: new THREE.Color(MOTION_CART_COLORS.body).multiplyScalar(0.08),
    emissiveIntensity: 0.34,
    roughness: 0.42,
    metalness: 0.18,
  });
  const bodyHighlightMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.body).offsetHSL(0, 0.02, 0.08),
    roughness: 0.3,
    metalness: 0.22,
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.roof),
    roughness: 0.2,
    metalness: 0.32,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.window),
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.58,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.trim),
    roughness: 0.34,
    metalness: 0.26,
  });
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.lamp),
    emissive: new THREE.Color(MOTION_CART_COLORS.lamp),
    emissiveIntensity: 0.32,
    roughness: 0.24,
    metalness: 0.08,
  });
  const rearLampMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8a78,
    emissive: 0xff4b3a,
    emissiveIntensity: 0.4,
    roughness: 0.24,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
  });
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.wheel),
    roughness: 0.88,
    metalness: 0.08,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.rim),
    roughness: 0.34,
    metalness: 0.58,
  });

  const bodyShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createSedanBodyShape(THREE), CAR_BODY_WIDTH_M, {
      bevelSize: toCartWorldUnits(0.03),
      bevelThickness: toCartWorldUnits(0.025),
    }),
    bodyMaterial,
  );
  bodyGroup.add(bodyShell);

  const cabinShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createSedanCabinShape(THREE), CAR_CABIN_WIDTH_M, {
      bevelSize: toCartWorldUnits(0.02),
      bevelThickness: toCartWorldUnits(0.02),
    }),
    roofMaterial,
  );
  bodyGroup.add(cabinShell);

  const glassShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createSedanGlassShape(THREE), CAR_GLASS_WIDTH_M, {
      bevelSize: toCartWorldUnits(0.016),
      bevelThickness: toCartWorldUnits(0.016),
    }),
    glassMaterial,
  );
  glassShell.position.y = toCartWorldUnits(0.02);
  bodyGroup.add(glassShell);

  const hoodSurface = new THREE.Mesh(
    new THREE.BoxGeometry(toCartWorldUnits(1.5), toCartWorldUnits(0.05), toCartWorldUnits(0.98)),
    bodyHighlightMaterial,
  );
  hoodSurface.position.set(toCartWorldUnits(1.08), toCartWorldUnits(1.01), 0);
  hoodSurface.rotation.z = -0.08;
  bodyGroup.add(hoodSurface);

  const trunkSurface = new THREE.Mesh(
    new THREE.BoxGeometry(toCartWorldUnits(0.84), toCartWorldUnits(0.05), toCartWorldUnits(0.94)),
    bodyHighlightMaterial,
  );
  trunkSurface.position.set(toCartWorldUnits(-1.28), toCartWorldUnits(0.98), 0);
  trunkSurface.rotation.z = 0.04;
  bodyGroup.add(trunkSurface);

  const accentStrip = new THREE.Mesh(
    new THREE.BoxGeometry(toCartWorldUnits(2.34), toCartWorldUnits(0.035), toCartWorldUnits(0.02)),
    trimMaterial,
  );
  accentStrip.position.set(
    toCartWorldUnits(0),
    toCartWorldUnits(0.92),
    toCartWorldUnits(CAR_BODY_WIDTH_M / 2 - 0.02),
  );
  bodyGroup.add(accentStrip);
  const accentStripMirror = accentStrip.clone();
  accentStripMirror.position.z *= -1;
  bodyGroup.add(accentStripMirror);

  const headLamp = new THREE.Mesh(
    new THREE.BoxGeometry(toCartWorldUnits(0.22), toCartWorldUnits(0.07), toCartWorldUnits(0.26)),
    lampMaterial,
  );
  headLamp.position.set(toCartWorldUnits(2.04), toCartWorldUnits(0.9), toCartWorldUnits(0.54));
  headLamp.rotation.y = -0.28;
  bodyGroup.add(headLamp);
  const headLampMirror = headLamp.clone();
  headLampMirror.position.z *= -1;
  headLampMirror.rotation.y *= -1;
  bodyGroup.add(headLampMirror);

  const rearLamp = new THREE.Mesh(
    new THREE.BoxGeometry(toCartWorldUnits(0.16), toCartWorldUnits(0.16), toCartWorldUnits(0.28)),
    rearLampMaterial,
  );
  rearLamp.position.set(toCartWorldUnits(-2.02), toCartWorldUnits(0.95), toCartWorldUnits(0.52));
  rearLamp.rotation.y = 0.18;
  bodyGroup.add(rearLamp);
  const rearLampMirror = rearLamp.clone();
  rearLampMirror.position.z *= -1;
  rearLampMirror.rotation.y *= -1;
  bodyGroup.add(rearLampMirror);

  CAR_WHEEL_X_OFFSETS_M.forEach((wheelX) => {
    CAR_WHEEL_Z_OFFSETS_M.forEach((wheelZ) => {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(
        toCartWorldUnits(wheelX),
        CAR_WHEEL_CENTER_Y,
        toCartWorldUnits(wheelZ),
      );
      const wheelRotor = new THREE.Group();
      wheelAssembly.add(wheelRotor);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD,
          CAR_WHEEL_RADIUS_WORLD,
          toCartWorldUnits(0.24),
          28,
        ),
        wheelMaterial,
      );
      tire.rotation.x = Math.PI / 2;
      wheelRotor.add(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.72,
          CAR_WHEEL_RADIUS_WORLD * 0.72,
          toCartWorldUnits(0.14),
          24,
        ),
        rimMaterial,
      );
      rim.rotation.x = Math.PI / 2;
      wheelRotor.add(rim);

      for (let spokeIndex = 0; spokeIndex < 5; spokeIndex += 1) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(
            CAR_WHEEL_RADIUS_WORLD * 0.48,
            toCartWorldUnits(0.03),
            toCartWorldUnits(0.02),
          ),
          rimMaterial,
        );
        spoke.position.x = CAR_WHEEL_RADIUS_WORLD * 0.14;
        spoke.rotation.z = (Math.PI * 2 * spokeIndex) / 5;
        wheelRotor.add(spoke);
      }

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.16,
          CAR_WHEEL_RADIUS_WORLD * 0.16,
          toCartWorldUnits(0.18),
          18,
        ),
        bodyHighlightMaterial,
      );
      hub.rotation.x = Math.PI / 2;
      wheelRotor.add(hub);

      carGroup.add(wheelAssembly);
      wheelRotors.push(wheelRotor);
    });
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(toCartWorldUnits(2.5), 36),
    new THREE.MeshBasicMaterial({
      color: 0x04070d,
      transparent: true,
      opacity: 0.28,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(toCartWorldUnits(-0.04), ROAD_SURFACE_Y + 0.02, 0);
  shadow.scale.set(1.02, 0.56, 1);
  carGroup.add(shadow);
  carGroup.add(bodyGroup);

  return {
    group: carGroup,
    bodyGroup,
    wheelRotors,
    shadow,
  };
}

function createCenteredExtrudedGeometry(
  THREE: ThreeModule,
  shape: InstanceType<ThreeModule["Shape"]>,
  depthMeters: number,
  options: Partial<ConstructorParameters<ThreeModule["ExtrudeGeometry"]>[1]> = {},
) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: toCartWorldUnits(depthMeters),
    steps: 1,
    curveSegments: 20,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: toCartWorldUnits(0.03),
    bevelThickness: toCartWorldUnits(0.025),
    ...options,
  });
  geometry.translate(0, 0, -toCartWorldUnits(depthMeters) / 2);
  return geometry;
}

function createSedanBodyShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toCartWorldUnits(-2.16), toCartWorldUnits(0.4));
  shape.quadraticCurveTo(toCartWorldUnits(-2.3), toCartWorldUnits(0.48), toCartWorldUnits(-2.24), toCartWorldUnits(0.64));
  shape.quadraticCurveTo(toCartWorldUnits(-2.02), toCartWorldUnits(0.9), toCartWorldUnits(-1.68), toCartWorldUnits(0.99));
  shape.quadraticCurveTo(toCartWorldUnits(-0.92), toCartWorldUnits(1.08), toCartWorldUnits(-0.04), toCartWorldUnits(1.1));
  shape.quadraticCurveTo(toCartWorldUnits(0.62), toCartWorldUnits(1.12), toCartWorldUnits(1.18), toCartWorldUnits(1.03));
  shape.quadraticCurveTo(toCartWorldUnits(1.72), toCartWorldUnits(0.94), toCartWorldUnits(2.06), toCartWorldUnits(0.82));
  shape.quadraticCurveTo(toCartWorldUnits(2.24), toCartWorldUnits(0.74), toCartWorldUnits(2.28), toCartWorldUnits(0.58));
  shape.quadraticCurveTo(toCartWorldUnits(2.22), toCartWorldUnits(0.44), toCartWorldUnits(1.98), toCartWorldUnits(0.38));
  shape.lineTo(toCartWorldUnits(-2.02), toCartWorldUnits(0.38));
  shape.quadraticCurveTo(toCartWorldUnits(-2.1), toCartWorldUnits(0.38), toCartWorldUnits(-2.16), toCartWorldUnits(0.4));
  shape.holes.push(createWheelWellPath(THREE, CAR_WHEEL_X_OFFSETS_M[0]));
  shape.holes.push(createWheelWellPath(THREE, CAR_WHEEL_X_OFFSETS_M[1]));
  return shape;
}

function createSedanCabinShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toCartWorldUnits(-1.16), toCartWorldUnits(1.01));
  shape.quadraticCurveTo(toCartWorldUnits(-0.82), toCartWorldUnits(1.18), toCartWorldUnits(-0.14), toCartWorldUnits(1.34));
  shape.quadraticCurveTo(toCartWorldUnits(0.42), toCartWorldUnits(1.42), toCartWorldUnits(0.9), toCartWorldUnits(1.32));
  shape.quadraticCurveTo(toCartWorldUnits(1.14), toCartWorldUnits(1.24), toCartWorldUnits(1.32), toCartWorldUnits(1.04));
  shape.lineTo(toCartWorldUnits(-1.02), toCartWorldUnits(1.05));
  shape.quadraticCurveTo(toCartWorldUnits(-1.08), toCartWorldUnits(1.03), toCartWorldUnits(-1.16), toCartWorldUnits(1.01));
  return shape;
}

function createSedanGlassShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toCartWorldUnits(-1.02), toCartWorldUnits(1.08));
  shape.quadraticCurveTo(toCartWorldUnits(-0.72), toCartWorldUnits(1.2), toCartWorldUnits(-0.08), toCartWorldUnits(1.32));
  shape.quadraticCurveTo(toCartWorldUnits(0.34), toCartWorldUnits(1.38), toCartWorldUnits(0.8), toCartWorldUnits(1.28));
  shape.quadraticCurveTo(toCartWorldUnits(1.02), toCartWorldUnits(1.22), toCartWorldUnits(1.12), toCartWorldUnits(1.1));
  shape.lineTo(toCartWorldUnits(-0.92), toCartWorldUnits(1.1));
  shape.quadraticCurveTo(toCartWorldUnits(-0.96), toCartWorldUnits(1.1), toCartWorldUnits(-1.02), toCartWorldUnits(1.08));
  return shape;
}

function createWheelWellPath(THREE: ThreeModule, centerX: number) {
  const path = new THREE.Path();
  const archRadius = 0.5;
  const rockerY = 0.38;

  path.moveTo(
    toCartWorldUnits(centerX - archRadius),
    toCartWorldUnits(rockerY),
  );
  path.absarc(
    toCartWorldUnits(centerX),
    toCartWorldUnits(rockerY),
    toCartWorldUnits(archRadius),
    Math.PI,
    0,
    true,
  );
  path.lineTo(
    toCartWorldUnits(centerX - archRadius),
    toCartWorldUnits(rockerY),
  );
  return path;
}

function disposeSceneGraph(scene: any) {
  scene.traverse((node: any) => {
    if (node.geometry) {
      node.geometry.dispose();
    }

    if (!node.material) {
      return;
    }

    if (Array.isArray(node.material)) {
      node.material.forEach((material: any) => material.dispose());
      return;
    }

    node.material.dispose();
  });
}

function parseResistanceStrength(label: string) {
  if (label.includes("大")) {
    return 1;
  }
  if (label.includes("小")) {
    return 0.42;
  }
  if (label.includes("0")) {
    return 0;
  }
  return 0.68;
}

function lerp(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveRampSurfaceY(frontX: number) {
  const normalizedRampX = clamp((frontX - RAMP_START_X) / RAMP_RUN_WORLD, 0, 1);
  return ROAD_SURFACE_Y + RAMP_HEIGHT_WORLD * (1 - normalizedRampX);
}

function resolveRampWheelCenterY(frontX: number) {
  return resolveRampSurfaceY(frontX) + CAR_WHEEL_RADIUS_WORLD + 0.02;
}

function toWorldUnits(value: number) {
  return value * WORLD_UNITS_PER_METER;
}

function toCartWorldUnits(value: number) {
  return value * WORLD_UNITS_PER_METER * CART_MODEL_SCALE;
}
