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

type CameraDynamicsRef = {
  speedRatio: number;
  brakeBias: number;
  rampBlend: number;
  markerReveal: number;
  trailReveal: number;
  lastSampleTime: number;
  lastVelocity: number;
  acceleration: number;
};

const WORLD_UNITS_PER_METER = 1.8;
const ROAD_THICKNESS = 0.18;
const ROAD_SURFACE_Y = ROAD_THICKNESS;
const ROAD_WIDTH = 5.4;
const TRACK_TRAVEL_WORLD = 13.6;
const RAMP_RUN_WORLD = 6.8;
const RAMP_HEIGHT_WORLD = 2.42;
const RAMP_ENTRY_X = 0.2;
const RAMP_START_X = RAMP_ENTRY_X - RAMP_RUN_WORLD;
const TRACK_END_X = RAMP_ENTRY_X + TRACK_TRAVEL_WORLD;
const TRACK_CENTER_X = (RAMP_ENTRY_X + TRACK_END_X) / 2;
const RELEASE_LEAD_SECONDS = 0.34;
const DEFAULT_CAMERA_ZOOM_RATIO = 1.14;
const MIN_CAMERA_ZOOM_RATIO = 0.78;
const MAX_CAMERA_ZOOM_RATIO = 1.86;
const CAMERA_WHEEL_STEP = 0.0012;
const CAMERA_DRAG_ROTATION_STEP = 0.005;
const CAMERA_ORBIT_DAMPING = 0.14;
const MIN_CAMERA_PITCH_OFFSET = -0.22;
const MAX_CAMERA_PITCH_OFFSET = 0.28;
const MIN_CAMERA_ELEVATION = 0.04;
const MAX_CAMERA_ELEVATION = 0.72;
const CART_MODEL_SCALE = 0.42;
const STAGE_FOCUS_Y = 0.96;
const CAMERA_TRACK_MIN_X = RAMP_START_X + 0.8;
const CAMERA_TRACK_MAX_X = TRACK_END_X - 1.2;
const RAMP_IDLE_FRONT_X = RAMP_START_X + RAMP_RUN_WORLD * 0.74;
const RAMP_RELEASE_MIN_FRONT_X = RAMP_ENTRY_X + 0.56;
const CAR_FRONT_OFFSET_M = 2.35;
const CAR_FRONT_OFFSET_WORLD = toCartWorldUnits(CAR_FRONT_OFFSET_M);
const CAR_WHEEL_RADIUS_M = 0.36;
const CAR_WHEEL_RADIUS_WORLD = toCartWorldUnits(CAR_WHEEL_RADIUS_M);
const CAR_WHEEL_X_OFFSETS_M = [1.44, -1.44] as const;
const CAR_WHEEL_Z_OFFSETS_M = [0.845, -0.845] as const;
const CAR_WHEEL_CENTER_Y =
  ROAD_SURFACE_Y + CAR_WHEEL_RADIUS_WORLD + toCartWorldUnits(0.01);
const FRONT_AXLE_OFFSET_WORLD = toCartWorldUnits(CAR_WHEEL_X_OFFSETS_M[0]);
const REAR_AXLE_OFFSET_WORLD = toCartWorldUnits(CAR_WHEEL_X_OFFSETS_M[1]);
const CAR_WHEELBASE_WORLD = FRONT_AXLE_OFFSET_WORLD - REAR_AXLE_OFFSET_WORLD;
const CAR_WHEEL_CONTACT_LIFT =
  CAR_WHEEL_CENTER_Y - ROAD_SURFACE_Y - CAR_WHEEL_RADIUS_WORLD;
const CAR_BODY_WIDTH_M = 1.72;
const CAR_CABIN_WIDTH_M = 1.38;
const CAR_GLASS_WIDTH_M = 1.06;
const RAMP_TRAVEL_DISTANCE_METERS =
  Math.hypot(RAMP_RUN_WORLD, RAMP_HEIGHT_WORLD) / WORLD_UNITS_PER_METER;

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
  const cameraDynamicsRef = useRef<CameraDynamicsRef>({
    speedRatio: 0,
    brakeBias: 0,
    rampBlend: 1,
    markerReveal: 0,
    trailReveal: 0,
    lastSampleTime: currentMotion.time,
    lastVelocity: currentMotion.velocity,
    acceleration: 0,
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
      camera.position.set(-6.8, 4.2, 8.8);

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

      const carRig = buildModel3Rig(THREE);
      scene.add(carRig.group);

      const trailMaterial = new THREE.LineBasicMaterial({
        color: 0x67c6ff,
        transparent: true,
        opacity: 0,
      });
      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(12);
      trailGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(trailPositions, 3),
      );
      const trailLine = new THREE.Line(trailGeometry, trailMaterial);
      scene.add(trailLine);

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

      const lookAtTarget = new THREE.Vector3(0, 1.12, 0);
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
        const frameNowSeconds = performance.now() * 0.001;
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
        let carTilt = 0;
        let traveledMeters = RAMP_TRAVEL_DISTANCE_METERS + state.position;
        let rampProgress = 0;

        if (state.observationState === "idle") {
          visualFrontX = RAMP_IDLE_FRONT_X;
          traveledMeters = 0;
        } else if (state.observationState === "observing" && state.time < leadDuration) {
          rampProgress = clamp(state.time / leadDuration, 0, 1);
          const releaseTargetFrontX = Math.max(
            flatWorldX,
            RAMP_RELEASE_MIN_FRONT_X,
          );
          visualFrontX = lerp(RAMP_IDLE_FRONT_X, releaseTargetFrontX, rampProgress);
          traveledMeters = rampProgress * RAMP_TRAVEL_DISTANCE_METERS;
        }

        const dynamics = cameraDynamicsRef.current;
        const sampleDeltaSeconds = state.time - dynamics.lastSampleTime;
        if (sampleDeltaSeconds > 0.0001) {
          const measuredAcceleration =
            (state.velocity - dynamics.lastVelocity) / sampleDeltaSeconds;
          dynamics.acceleration = lerp(dynamics.acceleration, measuredAcceleration, 0.42);
          dynamics.lastSampleTime = state.time;
          dynamics.lastVelocity = state.velocity;
        } else if (sampleDeltaSeconds < 0 || (state.observationState === "observing" && state.time === 0)) {
          dynamics.lastSampleTime = state.time;
          dynamics.lastVelocity = state.velocity;
          dynamics.acceleration = lerp(dynamics.acceleration, 0, 0.2);
        } else if (state.observationState === "idle") {
          dynamics.lastSampleTime = state.time;
          dynamics.lastVelocity = state.velocity;
          dynamics.acceleration = lerp(dynamics.acceleration, 0, 0.18);
        }

        const carCenterX = visualFrontX - CAR_FRONT_OFFSET_WORLD;
        const carPose = resolveCarPose(visualFrontX);
        const carReferenceY = carPose.midWheelCenterY;
        carTilt = carPose.tilt;
        carRig.group.position.set(carCenterX, carPose.groupOffsetY, 0);
        carRig.group.rotation.z += (carTilt - carRig.group.rotation.z) * 0.12;
        const wheelAngle = traveledMeters / CAR_WHEEL_RADIUS_M;
        carRig.wheelRotors.forEach((wheelRotor) => {
          wheelRotor.rotation.z = -wheelAngle;
        });

        const speedRatioTarget = clamp(state.velocity / 2.8, 0, 1);
        const brakeBiasTarget = clamp(-dynamics.acceleration / 4.8, 0, 1);
        const rampBlendTarget = carPose.rampInfluence;
        dynamics.speedRatio += (speedRatioTarget - dynamics.speedRatio) * 0.08;
        dynamics.brakeBias += (brakeBiasTarget - dynamics.brakeBias) * 0.12;
        dynamics.rampBlend += (rampBlendTarget - dynamics.rampBlend) * 0.12;

        const suspensionCompression = dynamics.speedRatio;
        const idleFloat =
          state.observationState === "idle"
            ? Math.sin(frameNowSeconds * 1.2) * 0.01
            : 0;
        const bodyPitchTarget =
          dynamics.rampBlend * 0.035 + dynamics.brakeBias * 0.046;
        const bodyFloat =
          0.112 +
          suspensionCompression * 0.024 +
          Math.abs(carTilt) * 0.032 +
          dynamics.brakeBias * 0.016 +
          idleFloat;
        carRig.bodyGroup.rotation.z +=
          (bodyPitchTarget - carRig.bodyGroup.rotation.z) * 0.12;
        carRig.bodyGroup.position.y +=
          (bodyFloat - carRig.bodyGroup.position.y) * 0.12;
        carRig.shadow.material.opacity =
          0.2 + suspensionCompression * 0.04 + dynamics.brakeBias * 0.06;
        const shadowScaleX = 0.98 - dynamics.speedRatio * 0.02;
        const shadowScaleY = 0.56 - dynamics.brakeBias * 0.04;
        carRig.shadow.scale.x += (shadowScaleX - carRig.shadow.scale.x) * 0.08;
        carRig.shadow.scale.y += (shadowScaleY - carRig.shadow.scale.y) * 0.08;

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
        const stopRevealTarget =
          stopX === null
            ? 0
            : state.observationState === "stable"
              ? 1
              : state.stopDistanceMeters !== null && state.position >= state.stopDistanceMeters * 0.82
                ? 1
                : 0;
        dynamics.markerReveal += (stopRevealTarget - dynamics.markerReveal) * 0.12;
        stopMarker.visible = stopX !== null && dynamics.markerReveal > 0.04;
        if (stopX !== null) {
          stopMarker.position.x = stopX;
          stopMarker.position.y =
            Math.sin(frameNowSeconds * 3.2) * 0.03 * dynamics.markerReveal;
          stopMarker.scale.setScalar(0.76 + dynamics.markerReveal * 0.24);
        }

        const trailRevealTarget =
          state.observationState === "idle"
            ? 0
            : state.position > 0.02 || state.time < leadDuration
              ? 1
              : 0;
        dynamics.trailReveal += (trailRevealTarget - dynamics.trailReveal) * 0.12;
        trailLine.visible = dynamics.trailReveal > 0.03;
        trailMaterial.opacity =
          0.18 + dynamics.trailReveal * 0.42 + dynamics.speedRatio * 0.12;
        trailMaterial.color.set(surfaceKey === "ideal" ? 0x67c6ff : 0x9ed8ff);
        updateTrailLinePositions(trailPositions, {
          frontX: visualFrontX,
          isOnRamp: carPose.rampInfluence > 0.01,
          reveal: dynamics.trailReveal,
        });
        trailGeometry.attributes.position.needsUpdate = true;

        velocityArrow.visible =
          state.observationState !== "idle" && state.velocity > 0.04;
        if (velocityArrow.visible) {
          velocityArrow.position.set(
            carCenterX + CAR_FRONT_OFFSET_WORLD - 0.46,
            carReferenceY + 0.48,
            -(ROAD_WIDTH / 2 - 0.72),
          );
          velocityArrow.setDirection(new THREE.Vector3(1, 0, 0));
          velocityArrow.setLength(
            clamp(state.velocity * 1.18, 0.9, 4),
            0.32,
            0.18,
          );
          velocityArrow.setColor(
            new THREE.Color(surfaceKey === "ideal" ? 0x7fd2ff : 0x67c6ff),
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
            carReferenceY + 0.92,
            ROAD_WIDTH / 2 - 0.72,
          );
          frictionArrow.setDirection(new THREE.Vector3(-1, 0, 0));
          frictionArrow.setLength(
            clamp(0.76 + frictionStrength * 1.26 + dynamics.speedRatio * 0.34, 0.86, 3.8),
            0.3,
            0.18,
          );
          frictionArrow.setColor(
            new THREE.Color(surfaceKey === "towel" ? 0xff9f74 : 0xffbf67),
          );
        }

        const orbitState = cameraOrbitRef.current;
        orbitState.yawOffset +=
          (orbitState.targetYawOffset - orbitState.yawOffset) * CAMERA_ORBIT_DAMPING;
        orbitState.pitchOffset +=
          (orbitState.targetPitchOffset - orbitState.pitchOffset) * CAMERA_ORBIT_DAMPING;

        const desiredLookAhead =
          2.1 +
          dynamics.speedRatio * 1.78 +
          dynamics.rampBlend * 0.18 -
          dynamics.brakeBias * 0.4;
        const desiredLookAtX = clamp(carCenterX + desiredLookAhead, CAMERA_TRACK_MIN_X, CAMERA_TRACK_MAX_X);
        lookAtTarget.x += (desiredLookAtX - lookAtTarget.x) * 0.12;
        lookAtTarget.y +=
          (
            STAGE_FOCUS_Y +
            carPose.groupOffsetY * 0.46 +
            Math.abs(carTilt) * 0.08 +
            dynamics.rampBlend * 0.26 -
            dynamics.brakeBias * 0.06 -
            lookAtTarget.y
          ) * 0.12;

        const zoomRatio = cameraZoomRef.current;
        const baseOffsetX =
          -(9.4 * zoomRatio + dynamics.speedRatio * 1.16 - dynamics.rampBlend * 0.84);
        const baseOffsetY =
          4.18 +
          (zoomRatio - 1) * 1.74 +
          carPose.groupOffsetY * 0.28 +
          Math.abs(carTilt) * 0.24 +
          dynamics.rampBlend * 0.28 -
          dynamics.brakeBias * 0.14;
        const baseOffsetZ =
          8.92 * zoomRatio + dynamics.speedRatio * 0.42 + dynamics.rampBlend * 0.14;
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

function buildModel3Rig(THREE: ThreeModule) {
  const carGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const wheelRotors: Array<any> = [];

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.body),
    emissive: new THREE.Color(MOTION_CART_COLORS.body).multiplyScalar(0.08),
    emissiveIntensity: 0.42,
    roughness: 0.42,
    metalness: 0.18,
  });
  const bodyHighlightMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.body).offsetHSL(0, 0.04, 0.08),
    emissive: new THREE.Color(MOTION_CART_COLORS.body).multiplyScalar(0.1),
    emissiveIntensity: 0.28,
    roughness: 0.3,
    metalness: 0.24,
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
    opacity: 0.56,
  });
  const glassTintMaterial = new THREE.MeshStandardMaterial({
    color: 0x172334,
    roughness: 0.05,
    metalness: 0.18,
    transparent: true,
    opacity: 0.72,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.accent),
    emissive: new THREE.Color(MOTION_CART_COLORS.accent),
    emissiveIntensity: 0.18,
    roughness: 0.34,
    metalness: 0.16,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.trim),
    roughness: 0.34,
    metalness: 0.28,
  });
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.lamp),
    emissive: new THREE.Color(MOTION_CART_COLORS.lamp),
    emissiveIntensity: 0.4,
    roughness: 0.26,
    metalness: 0.08,
  });
  const lampLensMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4fbff,
    emissive: 0xd8f2ff,
    emissiveIntensity: 0.24,
    roughness: 0.18,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.wheel),
    roughness: 0.88,
    metalness: 0.08,
  });
  const tireTreadMaterial = new THREE.MeshStandardMaterial({
    color: 0x515b68,
    roughness: 0.74,
    metalness: 0.12,
  });
  const wheelInnerMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c2430,
    roughness: 0.48,
    metalness: 0.2,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.rim),
    roughness: 0.38,
    metalness: 0.44,
  });
  const rimShadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x8f98a6,
    roughness: 0.42,
    metalness: 0.58,
  });
  const spokeFaceMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9eef7,
    roughness: 0.24,
    metalness: 0.78,
  });
  const windowTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8e1eb,
    roughness: 0.26,
    metalness: 0.52,
  });
  const darkTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0x131b27,
    roughness: 0.54,
    metalness: 0.18,
  });
  const mirrorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2430,
    roughness: 0.38,
    metalness: 0.24,
  });
  const brakeDiscMaterial = new THREE.MeshStandardMaterial({
    color: 0xb6c0c8,
    roughness: 0.32,
    metalness: 0.74,
  });
  const brakeCaliperMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6dce6,
    roughness: 0.26,
    metalness: 0.34,
  });
  const lugMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1f5fb,
    roughness: 0.24,
    metalness: 0.72,
  });
  const centerCapMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8d0db,
    roughness: 0.26,
    metalness: 0.64,
  });
  const rearLampMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8a78,
    emissive: 0xff4b3a,
    emissiveIntensity: 0.56,
    roughness: 0.24,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
  });

  const bodyShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createModel3BodyShape(THREE), CAR_BODY_WIDTH_M, {
      bevelSize: toCartWorldUnits(0.03),
      bevelThickness: toCartWorldUnits(0.024),
    }),
    bodyMaterial,
  );
  bodyGroup.add(bodyShell);

  const hoodNose = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.42),
      toCartWorldUnits(0.16),
      toCartWorldUnits(1.18),
    ),
    bodyMaterial,
  );
  hoodNose.position.set(toCartWorldUnits(1.98), toCartWorldUnits(0.92), 0);
  hoodNose.rotation.z = -0.12;
  bodyGroup.add(hoodNose);

  const hoodSurface = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(1.48),
      toCartWorldUnits(0.05),
      toCartWorldUnits(0.94),
    ),
    bodyHighlightMaterial,
  );
  hoodSurface.position.set(toCartWorldUnits(1.16), toCartWorldUnits(1.02), 0);
  hoodSurface.rotation.z = -0.08;
  bodyGroup.add(hoodSurface);

  const frunkSeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.7),
      toCartWorldUnits(0.016),
      toCartWorldUnits(0.02),
    ),
    trimMaterial,
  );
  frunkSeam.position.set(toCartWorldUnits(1.26), toCartWorldUnits(0.97), 0);
  frunkSeam.rotation.z = -0.08;
  bodyGroup.add(frunkSeam);

  const rearDeck = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.6),
      toCartWorldUnits(0.16),
      toCartWorldUnits(1.16),
    ),
    bodyMaterial,
  );
  rearDeck.position.set(toCartWorldUnits(-1.72), toCartWorldUnits(0.96), 0);
  rearDeck.rotation.z = 0.12;
  bodyGroup.add(rearDeck);

  const trunkSurface = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.96),
      toCartWorldUnits(0.05),
      toCartWorldUnits(0.9),
    ),
    bodyHighlightMaterial,
  );
  trunkSurface.position.set(toCartWorldUnits(-1.34), toCartWorldUnits(1.01), 0);
  trunkSurface.rotation.z = 0.04;
  bodyGroup.add(trunkSurface);

  const cabinShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createModel3CabinShape(THREE), CAR_CABIN_WIDTH_M, {
      bevelSize: toCartWorldUnits(0.025),
      bevelThickness: toCartWorldUnits(0.025),
    }),
    roofMaterial,
  );
  bodyGroup.add(cabinShell);

  const glassShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createModel3GlassShape(THREE), CAR_GLASS_WIDTH_M, {
      bevelSize: toCartWorldUnits(0.02),
      bevelThickness: toCartWorldUnits(0.02),
    }),
    glassMaterial,
  );
  glassShell.position.y = toCartWorldUnits(0.02);
  bodyGroup.add(glassShell);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.12),
      toCartWorldUnits(0.52),
      toCartWorldUnits(0.94),
    ),
    glassTintMaterial,
  );
  windshield.position.set(toCartWorldUnits(0.96), toCartWorldUnits(1.18), 0);
  windshield.rotation.z = -0.72;
  bodyGroup.add(windshield);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.12),
      toCartWorldUnits(0.48),
      toCartWorldUnits(0.86),
    ),
    glassTintMaterial,
  );
  rearGlass.position.set(toCartWorldUnits(-0.78), toCartWorldUnits(1.15), 0);
  rearGlass.rotation.z = 0.64;
  bodyGroup.add(rearGlass);

  const panoramicRoof = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(1.08),
      toCartWorldUnits(0.035),
      toCartWorldUnits(0.78),
    ),
    mirrorMaterial,
  );
  panoramicRoof.position.set(toCartWorldUnits(0.02), toCartWorldUnits(1.34), 0);
  panoramicRoof.rotation.z = -0.06;
  bodyGroup.add(panoramicRoof);

  const bPillar = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.06),
      toCartWorldUnits(0.42),
      toCartWorldUnits(CAR_GLASS_WIDTH_M * 0.9),
    ),
    darkTrimMaterial,
  );
  bPillar.position.set(toCartWorldUnits(-0.14), toCartWorldUnits(1.22), 0);
  bodyGroup.add(bPillar);

  const sideFeatureZ = toCartWorldUnits(CAR_BODY_WIDTH_M / 2 - 0.025);

  const accentStrip = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(2.48),
      toCartWorldUnits(0.04),
      toCartWorldUnits(0.02),
    ),
    accentMaterial,
  );
  accentStrip.position.set(toCartWorldUnits(0), toCartWorldUnits(0.98), sideFeatureZ);
  bodyGroup.add(accentStrip);

  const accentStripMirror = accentStrip.clone();
  accentStripMirror.position.z *= -1;
  bodyGroup.add(accentStripMirror);

  const frontDoorSeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.025),
      toCartWorldUnits(0.44),
      toCartWorldUnits(0.02),
    ),
    trimMaterial,
  );
  frontDoorSeam.position.set(toCartWorldUnits(0.4), toCartWorldUnits(0.88), sideFeatureZ);
  bodyGroup.add(frontDoorSeam);

  const frontDoorSeamMirror = frontDoorSeam.clone();
  frontDoorSeamMirror.position.z *= -1;
  bodyGroup.add(frontDoorSeamMirror);

  const rearDoorSeam = frontDoorSeam.clone();
  rearDoorSeam.position.x = toCartWorldUnits(-0.62);
  bodyGroup.add(rearDoorSeam);

  const rearDoorSeamMirror = rearDoorSeam.clone();
  rearDoorSeamMirror.position.z *= -1;
  bodyGroup.add(rearDoorSeamMirror);

  const doorHandleGeometry = new THREE.BoxGeometry(
    toCartWorldUnits(0.14),
    toCartWorldUnits(0.025),
    toCartWorldUnits(0.02),
  );
  [
    { x: 0.62, y: 0.94 },
    { x: -0.32, y: 0.94 },
  ].forEach(({ x, y }) => {
    const doorHandle = new THREE.Mesh(doorHandleGeometry, accentMaterial);
    doorHandle.position.set(toCartWorldUnits(x), toCartWorldUnits(y), sideFeatureZ);
    bodyGroup.add(doorHandle);

    const doorHandleMirror = doorHandle.clone();
    doorHandleMirror.position.z *= -1;
    bodyGroup.add(doorHandleMirror);
  });

  const cameraRepeater = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.09),
      toCartWorldUnits(0.045),
      toCartWorldUnits(0.02),
    ),
    mirrorMaterial,
  );
  cameraRepeater.position.set(toCartWorldUnits(1.04), toCartWorldUnits(0.99), sideFeatureZ);
  bodyGroup.add(cameraRepeater);

  const cameraRepeaterMirror = cameraRepeater.clone();
  cameraRepeaterMirror.position.z *= -1;
  bodyGroup.add(cameraRepeaterMirror);

  const frontLowerFascia = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.18),
      toCartWorldUnits(0.18),
      toCartWorldUnits(1.06),
    ),
    darkTrimMaterial,
  );
  frontLowerFascia.position.set(toCartWorldUnits(2.16), toCartWorldUnits(0.52), 0);
  bodyGroup.add(frontLowerFascia);

  const frontIntake = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.08),
      toCartWorldUnits(0.12),
      toCartWorldUnits(0.76),
    ),
    mirrorMaterial,
  );
  frontIntake.position.set(toCartWorldUnits(2.25), toCartWorldUnits(0.56), 0);
  bodyGroup.add(frontIntake);

  const frontAperture = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.06),
      toCartWorldUnits(0.08),
      toCartWorldUnits(0.46),
    ),
    mirrorMaterial,
  );
  frontAperture.position.set(toCartWorldUnits(2.28), toCartWorldUnits(0.84), 0);
  bodyGroup.add(frontAperture);

  const frontBadge = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.03),
      toCartWorldUnits(0.12),
      toCartWorldUnits(0.04),
    ),
    windowTrimMaterial,
  );
  frontBadge.position.set(toCartWorldUnits(2.17), toCartWorldUnits(0.98), 0);
  frontBadge.rotation.z = 0.08;
  bodyGroup.add(frontBadge);

  const rearDiffuser = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.2),
      toCartWorldUnits(0.18),
      toCartWorldUnits(0.98),
    ),
    darkTrimMaterial,
  );
  rearDiffuser.position.set(toCartWorldUnits(-2.16), toCartWorldUnits(0.54), 0);
  bodyGroup.add(rearDiffuser);

  const trunkLip = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.16),
      toCartWorldUnits(0.04),
      toCartWorldUnits(0.88),
    ),
    bodyHighlightMaterial,
  );
  trunkLip.position.set(toCartWorldUnits(-2.05), toCartWorldUnits(1), 0);
  bodyGroup.add(trunkLip);

  const headLamp = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.22),
      toCartWorldUnits(0.07),
      toCartWorldUnits(0.28),
    ),
    lampMaterial,
  );
  headLamp.position.set(toCartWorldUnits(2.04), toCartWorldUnits(0.92), toCartWorldUnits(0.54));
  headLamp.rotation.y = -0.36;
  bodyGroup.add(headLamp);

  const headLampMirror = headLamp.clone();
  headLampMirror.position.z *= -1;
  headLampMirror.rotation.y *= -1;
  bodyGroup.add(headLampMirror);

  const headLampSide = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.08),
      toCartWorldUnits(0.07),
      toCartWorldUnits(0.22),
    ),
    lampMaterial,
  );
  headLampSide.position.set(toCartWorldUnits(1.9), toCartWorldUnits(0.9), toCartWorldUnits(0.71));
  bodyGroup.add(headLampSide);

  const headLampSideMirror = headLampSide.clone();
  headLampSideMirror.position.z *= -1;
  bodyGroup.add(headLampSideMirror);

  const headLampBrow = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.24),
      toCartWorldUnits(0.022),
      toCartWorldUnits(0.16),
    ),
    lampLensMaterial,
  );
  headLampBrow.position.set(toCartWorldUnits(2.02), toCartWorldUnits(0.99), toCartWorldUnits(0.58));
  headLampBrow.rotation.y = -0.24;
  bodyGroup.add(headLampBrow);

  const headLampBrowMirror = headLampBrow.clone();
  headLampBrowMirror.position.z *= -1;
  headLampBrowMirror.rotation.y *= -1;
  bodyGroup.add(headLampBrowMirror);

  const rearLamp = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.14),
      toCartWorldUnits(0.16),
      toCartWorldUnits(0.3),
    ),
    rearLampMaterial,
  );
  rearLamp.position.set(toCartWorldUnits(-2.12), toCartWorldUnits(0.96), toCartWorldUnits(0.54));
  rearLamp.rotation.y = 0.2;
  bodyGroup.add(rearLamp);

  const rearLampMirror = rearLamp.clone();
  rearLampMirror.position.z *= -1;
  rearLampMirror.rotation.y *= -1;
  bodyGroup.add(rearLampMirror);

  const rearLampWing = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.26),
      toCartWorldUnits(0.06),
      toCartWorldUnits(0.12),
    ),
    rearLampMaterial,
  );
  rearLampWing.position.set(toCartWorldUnits(-1.92), toCartWorldUnits(0.97), toCartWorldUnits(0.74));
  bodyGroup.add(rearLampWing);

  const rearLampWingMirror = rearLampWing.clone();
  rearLampWingMirror.position.z *= -1;
  bodyGroup.add(rearLampWingMirror);

  const rearLampBridge = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.08),
      toCartWorldUnits(0.05),
      toCartWorldUnits(0.96),
    ),
    rearLampMaterial,
  );
  rearLampBridge.position.set(toCartWorldUnits(-2.02), toCartWorldUnits(0.98), 0);
  bodyGroup.add(rearLampBridge);

  const rearReflector = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.08),
      toCartWorldUnits(0.035),
      toCartWorldUnits(0.12),
    ),
    lampMaterial,
  );
  rearReflector.position.set(toCartWorldUnits(-2.08), toCartWorldUnits(0.68), toCartWorldUnits(0.62));
  bodyGroup.add(rearReflector);

  const rearReflectorMirror = rearReflector.clone();
  rearReflectorMirror.position.z *= -1;
  bodyGroup.add(rearReflectorMirror);

  const mirrorArm = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.12),
      toCartWorldUnits(0.04),
      toCartWorldUnits(0.1),
    ),
    mirrorMaterial,
  );
  mirrorArm.position.set(toCartWorldUnits(1.02), toCartWorldUnits(1.18), toCartWorldUnits(0.84));
  mirrorArm.rotation.z = -0.18;
  bodyGroup.add(mirrorArm);

  const mirrorArmMirror = mirrorArm.clone();
  mirrorArmMirror.position.z *= -1;
  mirrorArmMirror.rotation.z *= -1;
  bodyGroup.add(mirrorArmMirror);

  const mirrorPod = new THREE.Mesh(
    new THREE.BoxGeometry(
      toCartWorldUnits(0.18),
      toCartWorldUnits(0.12),
      toCartWorldUnits(0.22),
    ),
    mirrorMaterial,
  );
  mirrorPod.position.set(toCartWorldUnits(1.14), toCartWorldUnits(1.18), toCartWorldUnits(0.98));
  mirrorPod.rotation.y = 0.28;
  bodyGroup.add(mirrorPod);

  const mirrorPodMirror = mirrorPod.clone();
  mirrorPodMirror.position.z *= -1;
  mirrorPodMirror.rotation.y *= -1;
  bodyGroup.add(mirrorPodMirror);

  CAR_WHEEL_X_OFFSETS_M.forEach((wheelX) => {
    CAR_WHEEL_Z_OFFSETS_M.forEach((wheelZ) => {
      const wheelSide = wheelZ >= 0 ? 1 : -1;
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(
        toCartWorldUnits(wheelX),
        CAR_WHEEL_CENTER_Y,
        toCartWorldUnits(wheelZ),
      );
      const wheelRotor = new THREE.Group();
      wheelAssembly.add(wheelRotor);
      const tireWidth = toCartWorldUnits(0.22);
      const rimWidth = toCartWorldUnits(0.18);
      const rimFaceOffset = wheelSide * toCartWorldUnits(0.045);
      const lugRingRadius = CAR_WHEEL_RADIUS_WORLD * 0.18;
      const treadRingRadius = CAR_WHEEL_RADIUS_WORLD * 0.92;
      const treadRowOffsets = [-toCartWorldUnits(0.054), 0, toCartWorldUnits(0.054)];

      const tire = new THREE.Mesh(
        createTireGeometry(THREE, CAR_WHEEL_RADIUS_WORLD, tireWidth),
        wheelMaterial,
      );
      wheelRotor.add(tire);

      treadRowOffsets.forEach((rowOffset, rowIndex) => {
        for (let treadIndex = 0; treadIndex < 14; treadIndex += 1) {
          const treadAngle =
            (Math.PI * 2 * treadIndex) / 14 +
            (rowIndex === 1 ? Math.PI / 14 : 0) +
            (rowIndex === 2 ? Math.PI / 28 : 0);
          const treadBlock = new THREE.Mesh(
            new THREE.BoxGeometry(
              toCartWorldUnits(0.17),
              toCartWorldUnits(0.05),
              toCartWorldUnits(0.026),
            ),
            tireTreadMaterial,
          );
          treadBlock.position.set(
            Math.cos(treadAngle) * treadRingRadius,
            Math.sin(treadAngle) * treadRingRadius,
            rowOffset,
          );
          treadBlock.rotation.z = treadAngle + Math.PI / 2;
          wheelRotor.add(treadBlock);
        }
      });

      const rimBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.74,
          CAR_WHEEL_RADIUS_WORLD * 0.74,
          rimWidth,
          32,
        ),
        wheelInnerMaterial,
      );
      rimBarrel.rotation.x = Math.PI / 2;
      wheelRotor.add(rimBarrel);

      const brakeDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.54,
          CAR_WHEEL_RADIUS_WORLD * 0.54,
          toCartWorldUnits(0.08),
          30,
        ),
        brakeDiscMaterial,
      );
      brakeDisc.rotation.x = Math.PI / 2;
      brakeDisc.position.z = -wheelSide * toCartWorldUnits(0.02);
      wheelRotor.add(brakeDisc);

      const brakeDiscHat = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.24,
          CAR_WHEEL_RADIUS_WORLD * 0.24,
          toCartWorldUnits(0.06),
          24,
        ),
        rimShadowMaterial,
      );
      brakeDiscHat.rotation.x = Math.PI / 2;
      brakeDiscHat.position.z = -wheelSide * toCartWorldUnits(0.014);
      wheelRotor.add(brakeDiscHat);

      const brakeDiscRing = new THREE.Mesh(
        new THREE.TorusGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.42,
          toCartWorldUnits(0.012),
          10,
          28,
        ),
        rimShadowMaterial,
      );
      brakeDiscRing.rotation.x = Math.PI / 2;
      brakeDiscRing.position.z = -wheelSide * toCartWorldUnits(0.056);
      wheelRotor.add(brakeDiscRing);

      for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
        const slotAngle = (Math.PI * 2 * slotIndex) / 6 + 0.18;
        const brakeSlot = new THREE.Mesh(
          new THREE.BoxGeometry(
            toCartWorldUnits(0.1),
            toCartWorldUnits(0.022),
            toCartWorldUnits(0.018),
          ),
          wheelInnerMaterial,
        );
        brakeSlot.position.set(
          Math.cos(slotAngle) * CAR_WHEEL_RADIUS_WORLD * 0.34,
          Math.sin(slotAngle) * CAR_WHEEL_RADIUS_WORLD * 0.34,
          -wheelSide * toCartWorldUnits(0.058),
        );
        brakeSlot.rotation.z = slotAngle + 0.44;
        wheelRotor.add(brakeSlot);
      }

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.72,
          CAR_WHEEL_RADIUS_WORLD * 0.72,
          toCartWorldUnits(0.1),
          30,
        ),
        rimShadowMaterial,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.z = rimFaceOffset;
      wheelRotor.add(rim);

      const rimDish = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.48,
          CAR_WHEEL_RADIUS_WORLD * 0.6,
          toCartWorldUnits(0.05),
          30,
        ),
        rimMaterial,
      );
      rimDish.rotation.x = Math.PI / 2;
      rimDish.position.z = rimFaceOffset + wheelSide * toCartWorldUnits(0.035);
      wheelRotor.add(rimDish);

      const wheelFaceOccluder = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.82,
          CAR_WHEEL_RADIUS_WORLD * 0.82,
          toCartWorldUnits(0.02),
          30,
        ),
        wheelInnerMaterial,
      );
      wheelFaceOccluder.rotation.x = Math.PI / 2;
      wheelFaceOccluder.position.z = rimFaceOffset + wheelSide * toCartWorldUnits(0.012);
      wheelRotor.add(wheelFaceOccluder);

      const aeroCover = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.62,
          CAR_WHEEL_RADIUS_WORLD * 0.58,
          toCartWorldUnits(0.04),
          32,
        ),
        rimMaterial,
      );
      aeroCover.rotation.x = Math.PI / 2;
      aeroCover.position.z = rimFaceOffset + wheelSide * toCartWorldUnits(0.056);
      wheelRotor.add(aeroCover);

      const spokeFaceZ = rimFaceOffset + wheelSide * toCartWorldUnits(0.083);
      for (let spokeIndex = 0; spokeIndex < 5; spokeIndex += 1) {
        const spokeAngle = (Math.PI * 2 * spokeIndex) / 5 - 0.06;
        const spokeGroup = new THREE.Group();
        spokeGroup.rotation.z = spokeAngle;

        const spokeStem = new THREE.Mesh(
          new THREE.BoxGeometry(
            CAR_WHEEL_RADIUS_WORLD * 0.22,
            toCartWorldUnits(0.024),
            toCartWorldUnits(0.012),
          ),
          spokeFaceMaterial,
        );
        spokeStem.position.set(CAR_WHEEL_RADIUS_WORLD * 0.13, 0, spokeFaceZ);
        spokeGroup.add(spokeStem);

        const spokeLeft = new THREE.Mesh(
          new THREE.BoxGeometry(
            CAR_WHEEL_RADIUS_WORLD * 0.28,
            toCartWorldUnits(0.026),
            toCartWorldUnits(0.012),
          ),
          spokeFaceMaterial,
        );
        spokeLeft.position.set(
          CAR_WHEEL_RADIUS_WORLD * 0.27,
          -toCartWorldUnits(0.028),
          spokeFaceZ,
        );
        spokeLeft.rotation.z = 0.34;
        spokeGroup.add(spokeLeft);

        const spokeRight = spokeLeft.clone();
        spokeRight.position.y *= -1;
        spokeRight.rotation.z *= -1;
        spokeGroup.add(spokeRight);

        const spokeGroove = new THREE.Mesh(
          new THREE.BoxGeometry(
            CAR_WHEEL_RADIUS_WORLD * 0.18,
            toCartWorldUnits(0.008),
            toCartWorldUnits(0.008),
          ),
          rimShadowMaterial,
        );
        spokeGroove.position.set(
          CAR_WHEEL_RADIUS_WORLD * 0.34,
          0,
          spokeFaceZ + wheelSide * toCartWorldUnits(0.004),
        );
        spokeGroup.add(spokeGroove);

        wheelRotor.add(spokeGroup);

        const lug = new THREE.Mesh(
          new THREE.CylinderGeometry(
            toCartWorldUnits(0.018),
            toCartWorldUnits(0.018),
            toCartWorldUnits(0.028),
            12,
          ),
          lugMaterial,
        );
        lug.rotation.x = Math.PI / 2;
        lug.position.set(
          Math.cos(spokeAngle + 0.18) * lugRingRadius,
          Math.sin(spokeAngle + 0.18) * lugRingRadius,
          rimFaceOffset + wheelSide * toCartWorldUnits(0.07),
        );
        wheelRotor.add(lug);
      }

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.16,
          CAR_WHEEL_RADIUS_WORLD * 0.16,
          toCartWorldUnits(0.08),
          18,
        ),
        mirrorMaterial,
      );
      hub.rotation.x = Math.PI / 2;
      hub.position.z = rimFaceOffset + wheelSide * toCartWorldUnits(0.072);
      wheelRotor.add(hub);

      const centerCap = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.1,
          CAR_WHEEL_RADIUS_WORLD * 0.1,
          toCartWorldUnits(0.036),
          18,
        ),
        centerCapMaterial,
      );
      centerCap.rotation.x = Math.PI / 2;
      centerCap.position.z = rimFaceOffset + wheelSide * toCartWorldUnits(0.094);
      wheelRotor.add(centerCap);

      const brakeCaliper = new THREE.Mesh(
        new THREE.BoxGeometry(
          toCartWorldUnits(0.12),
          toCartWorldUnits(0.19),
          toCartWorldUnits(0.06),
        ),
        brakeCaliperMaterial,
      );
      brakeCaliper.position.set(
        CAR_WHEEL_RADIUS_WORLD * 0.44,
        CAR_WHEEL_RADIUS_WORLD * 0.1,
        -wheelSide * toCartWorldUnits(0.1),
      );
      brakeCaliper.rotation.z = -0.18 * wheelSide;
      wheelAssembly.add(brakeCaliper);

      carGroup.add(wheelAssembly);
      wheelRotors.push(wheelRotor);
    });
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(toCartWorldUnits(2.6), 40),
    new THREE.MeshBasicMaterial({
      color: 0x04070d,
      transparent: true,
      opacity: 0.28,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(toCartWorldUnits(-0.05), ROAD_SURFACE_Y + 0.02, 0);
  shadow.scale.set(1.04, 0.56, 1);
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

function createModel3BodyShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toCartWorldUnits(-2.24), toCartWorldUnits(0.4));
  shape.quadraticCurveTo(
    toCartWorldUnits(-2.38),
    toCartWorldUnits(0.48),
    toCartWorldUnits(-2.32),
    toCartWorldUnits(0.64),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(-2.06),
    toCartWorldUnits(0.92),
    toCartWorldUnits(-1.78),
    toCartWorldUnits(1),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(-1.04),
    toCartWorldUnits(1.08),
    toCartWorldUnits(-0.16),
    toCartWorldUnits(1.1),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(0.56),
    toCartWorldUnits(1.12),
    toCartWorldUnits(1.16),
    toCartWorldUnits(1.04),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(1.78),
    toCartWorldUnits(0.96),
    toCartWorldUnits(2.08),
    toCartWorldUnits(0.84),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(2.28),
    toCartWorldUnits(0.76),
    toCartWorldUnits(2.34),
    toCartWorldUnits(0.58),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(2.28),
    toCartWorldUnits(0.44),
    toCartWorldUnits(2.04),
    toCartWorldUnits(0.38),
  );
  shape.lineTo(toCartWorldUnits(-2.08), toCartWorldUnits(0.38));
  shape.quadraticCurveTo(
    toCartWorldUnits(-2.18),
    toCartWorldUnits(0.38),
    toCartWorldUnits(-2.24),
    toCartWorldUnits(0.4),
  );

  shape.holes.push(createModel3WheelWellPath(THREE, CAR_WHEEL_X_OFFSETS_M[0]));
  shape.holes.push(createModel3WheelWellPath(THREE, CAR_WHEEL_X_OFFSETS_M[1]));

  return shape;
}

function createModel3WheelWellPath(THREE: ThreeModule, centerX: number) {
  const path = new THREE.Path();
  const archRadius = 0.52;
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

function createModel3CabinShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toCartWorldUnits(-1.18), toCartWorldUnits(1.02));
  shape.quadraticCurveTo(
    toCartWorldUnits(-0.84),
    toCartWorldUnits(1.18),
    toCartWorldUnits(-0.18),
    toCartWorldUnits(1.36),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(0.4),
    toCartWorldUnits(1.44),
    toCartWorldUnits(0.88),
    toCartWorldUnits(1.34),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(1.16),
    toCartWorldUnits(1.26),
    toCartWorldUnits(1.34),
    toCartWorldUnits(1.06),
  );
  shape.lineTo(toCartWorldUnits(-1.04), toCartWorldUnits(1.06));
  shape.quadraticCurveTo(
    toCartWorldUnits(-1.1),
    toCartWorldUnits(1.04),
    toCartWorldUnits(-1.18),
    toCartWorldUnits(1.02),
  );
  return shape;
}

function createModel3GlassShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toCartWorldUnits(-1.02), toCartWorldUnits(1.08));
  shape.quadraticCurveTo(
    toCartWorldUnits(-0.7),
    toCartWorldUnits(1.2),
    toCartWorldUnits(-0.06),
    toCartWorldUnits(1.34),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(0.34),
    toCartWorldUnits(1.4),
    toCartWorldUnits(0.8),
    toCartWorldUnits(1.3),
  );
  shape.quadraticCurveTo(
    toCartWorldUnits(1.04),
    toCartWorldUnits(1.22),
    toCartWorldUnits(1.14),
    toCartWorldUnits(1.1),
  );
  shape.lineTo(toCartWorldUnits(-0.9), toCartWorldUnits(1.1));
  shape.quadraticCurveTo(
    toCartWorldUnits(-0.96),
    toCartWorldUnits(1.1),
    toCartWorldUnits(-1.02),
    toCartWorldUnits(1.08),
  );
  return shape;
}

function createTireGeometry(
  THREE: ThreeModule,
  outerRadius: number,
  width: number,
) {
  const halfWidth = width / 2;
  const innerHalfWidth = halfWidth * 0.8;
  const sidewallRadius = outerRadius * 0.84;
  const innerRadius = outerRadius * 0.56;
  const profile = [
    new THREE.Vector2(0, -innerHalfWidth),
    new THREE.Vector2(innerRadius, -innerHalfWidth),
    new THREE.Vector2(sidewallRadius, -halfWidth),
    new THREE.Vector2(outerRadius * 0.97, -halfWidth * 0.78),
    new THREE.Vector2(outerRadius, -halfWidth * 0.24),
    new THREE.Vector2(outerRadius, halfWidth * 0.24),
    new THREE.Vector2(outerRadius * 0.97, halfWidth * 0.78),
    new THREE.Vector2(sidewallRadius, halfWidth),
    new THREE.Vector2(innerRadius, innerHalfWidth),
    new THREE.Vector2(0, innerHalfWidth),
  ];
  const geometry = new THREE.LatheGeometry(profile, 40);
  geometry.rotateX(Math.PI / 2);
  return geometry;
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

function updateTrailLinePositions(
  target: Float32Array,
  state: {
    frontX: number;
    isOnRamp: boolean;
    reveal: number;
  },
) {
  const startX = RAMP_IDLE_FRONT_X;
  const startY = resolveStageSurfaceY(startX) + 0.08;
  const exitX = RAMP_ENTRY_X;
  const exitY = ROAD_SURFACE_Y + 0.08;
  const currentY =
    (state.isOnRamp ? resolveStageSurfaceY(state.frontX) : ROAD_SURFACE_Y) + 0.08;

  if (state.isOnRamp) {
    const midX = lerp(startX, state.frontX, 0.5);
    const midY = resolveStageSurfaceY(midX) + 0.08;
    writeTrailPoint(target, 0, startX, startY, 0);
    writeTrailPoint(target, 1, midX, midY, 0);
    writeTrailPoint(target, 2, state.frontX, currentY, 0);
    writeTrailPoint(target, 3, state.frontX, currentY, 0);
    return;
  }

  const flatFrontX = lerp(exitX, state.frontX, clamp(state.reveal, 0, 1));
  writeTrailPoint(target, 0, startX, startY, 0);
  writeTrailPoint(target, 1, exitX, exitY, 0);
  writeTrailPoint(target, 2, flatFrontX, currentY, 0);
  writeTrailPoint(target, 3, state.frontX, currentY, 0);
}

function writeTrailPoint(
  target: Float32Array,
  pointIndex: number,
  x: number,
  y: number,
  z: number,
) {
  const offset = pointIndex * 3;
  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;
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

function resolveStageSurfaceY(x: number) {
  if (x <= RAMP_START_X) {
    return ROAD_SURFACE_Y + RAMP_HEIGHT_WORLD;
  }

  if (x >= RAMP_ENTRY_X) {
    return ROAD_SURFACE_Y;
  }

  const normalizedRampX = (x - RAMP_START_X) / RAMP_RUN_WORLD;
  return ROAD_SURFACE_Y + RAMP_HEIGHT_WORLD * (1 - normalizedRampX);
}

function resolveCarPose(frontX: number) {
  const carCenterX = frontX - CAR_FRONT_OFFSET_WORLD;
  const frontAxleX = carCenterX + FRONT_AXLE_OFFSET_WORLD;
  const rearAxleX = carCenterX + REAR_AXLE_OFFSET_WORLD;
  const frontSurfaceY = resolveStageSurfaceY(frontAxleX);
  const rearSurfaceY = resolveStageSurfaceY(rearAxleX);
  const frontWheelCenterY =
    frontSurfaceY + CAR_WHEEL_RADIUS_WORLD + CAR_WHEEL_CONTACT_LIFT;
  const rearWheelCenterY =
    rearSurfaceY + CAR_WHEEL_RADIUS_WORLD + CAR_WHEEL_CONTACT_LIFT;
  const midWheelCenterY = (frontWheelCenterY + rearWheelCenterY) / 2;

  return {
    frontAxleX,
    rearAxleX,
    frontWheelCenterY,
    rearWheelCenterY,
    midWheelCenterY,
    groupOffsetY: midWheelCenterY - CAR_WHEEL_CENTER_Y,
    tilt: Math.atan2(
      frontWheelCenterY - rearWheelCenterY,
      CAR_WHEELBASE_WORLD,
    ),
    rampInfluence: clamp(
      (Math.max(frontSurfaceY, rearSurfaceY) - ROAD_SURFACE_Y) /
        RAMP_HEIGHT_WORLD,
      0,
      1,
    ),
  };
}

function toCartWorldUnits(value: number) {
  return value * WORLD_UNITS_PER_METER * CART_MODEL_SCALE;
}
