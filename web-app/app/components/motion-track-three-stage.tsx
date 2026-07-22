import { useEffect, useRef } from "react";

import { MOTION_CART_COLORS } from "./motion-cart-colors";

type ThreeModule = typeof import("three");

type MotionTrackThreeStageProps = {
  currentMotion: {
    position: number;
    velocity: number;
    acceleration: number;
  };
  distanceDomain: number;
  accentColor: string;
  accentSoftColor: string;
  showTrail: boolean;
  showVelocityArrow: boolean;
  showAccelerationArrow: boolean;
};

type MotionStateRef = {
  position: number;
  velocity: number;
  acceleration: number;
  distanceDomain: number;
  showTrail: boolean;
  showVelocityArrow: boolean;
  showAccelerationArrow: boolean;
};

const WORLD_UNITS_PER_METER = 1.8;
const TRACK_LENGTH_METERS = 230;
const TRACK_LENGTH_WORLD = TRACK_LENGTH_METERS * WORLD_UNITS_PER_METER;
const ROAD_WIDTH = 7.2;
const ROAD_THICKNESS = 0.16;
const ROAD_SURFACE_Y = ROAD_THICKNESS;
const CAR_LENGTH_M = 4.69;
const CAR_WHEEL_RADIUS_M = 0.34;
const CAR_WHEEL_RADIUS_WORLD = CAR_WHEEL_RADIUS_M * WORLD_UNITS_PER_METER;
const CAR_WHEEL_CENTER_Y =
  ROAD_SURFACE_Y + CAR_WHEEL_RADIUS_WORLD + WORLD_UNITS_PER_METER * 0.01;
const CAR_FRONT_OFFSET_M = 2.35;
const CAR_FRONT_OFFSET_WORLD = CAR_FRONT_OFFSET_M * WORLD_UNITS_PER_METER;
const CAR_BODY_WIDTH_M = 1.72;
const CAR_CABIN_WIDTH_M = 1.38;
const CAR_GLASS_WIDTH_M = 1.06;
const CAR_WHEEL_X_OFFSETS_M = [1.44, -1.44] as const;
const CAR_WHEEL_Z_OFFSETS_M = [0.79, -0.79] as const;
const DEFAULT_CAMERA_ZOOM_RATIO = 1.28;
const MIN_CAMERA_ZOOM_RATIO = 0.82;
const MAX_CAMERA_ZOOM_RATIO = 1.92;
const CAMERA_WHEEL_STEP = 0.0012;
const CAMERA_DRAG_ROTATION_STEP = 0.0052;
const CAMERA_ORBIT_DAMPING = 0.14;
const MIN_CAMERA_PITCH_OFFSET = -0.26;
const MAX_CAMERA_PITCH_OFFSET = 0.34;
const MIN_CAMERA_ELEVATION = -0.06;
const MAX_CAMERA_ELEVATION = 0.78;

export function MotionTrackThreeStage({
  currentMotion,
  distanceDomain,
  accentColor,
  accentSoftColor,
  showTrail,
  showVelocityArrow,
  showAccelerationArrow,
}: MotionTrackThreeStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cameraZoomRef = useRef(DEFAULT_CAMERA_ZOOM_RATIO);
  const cameraDynamicsRef = useRef({
    speedRatio: 0,
    accelerationBias: 0,
    accelerationKick: 0,
    roll: 0,
  });
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
    position: currentMotion.position,
    velocity: currentMotion.velocity,
    acceleration: currentMotion.acceleration,
    distanceDomain,
    showTrail,
    showVelocityArrow,
    showAccelerationArrow,
  });

  useEffect(() => {
    motionStateRef.current = {
      position: currentMotion.position,
      velocity: currentMotion.velocity,
      acceleration: currentMotion.acceleration,
      distanceDomain,
      showTrail,
      showVelocityArrow,
      showAccelerationArrow,
    };
  }, [
    currentMotion.acceleration,
    currentMotion.position,
    currentMotion.velocity,
    distanceDomain,
    showAccelerationArrow,
    showTrail,
    showVelocityArrow,
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
      renderer.shadowMap.enabled = false;
      const rendererCanvasElement = renderer.domElement;
      rendererCanvas = rendererCanvasElement;
      hostElement.appendChild(rendererCanvasElement);

      const scene = new THREE.Scene();
      sceneInstance = scene;
      scene.fog = new THREE.FogExp2(0x07111f, 0.02);

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
      camera.position.set(-12.8, 5.8, 14.4);

      const ambientLight = new THREE.HemisphereLight(0xb7dcff, 0x09111d, 2.4);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(10, 18, 12);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x5ab7ff, 1.4);
      rimLight.position.set(-12, 10, -18);
      scene.add(rimLight);

      const ground = buildGround(THREE);
      scene.add(ground);

      const road = buildRoad(THREE);
      scene.add(road);

      const markers = buildTrackMarkers(THREE, accentColor);
      scene.add(markers);

      const roadsideEnvironment = buildRoadsideEnvironment(
        THREE,
        accentColor,
        accentSoftColor,
      );
      scene.add(roadsideEnvironment);

      const finishGate = buildFinishGate(THREE, accentColor);
      scene.add(finishGate);

      const originBeacon = buildOriginBeacon(THREE);
      scene.add(originBeacon);

      const trailMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(accentColor),
        transparent: true,
        opacity: 0.82,
      });
      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(6);
      trailGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(trailPositions, 3),
      );
      const trailLine = new THREE.Line(trailGeometry, trailMaterial);
      trailLine.position.y = 0.12;
      scene.add(trailLine);

      const carRig = buildMotionCartRig(THREE);
      scene.add(carRig.group);

      const velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1.8, 0),
        2,
        0x67c6ff,
        0.5,
        0.28,
      );
      scene.add(velocityArrow);

      const accelerationArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 2.4, 0),
        1,
        0x5de2b1,
        0.42,
        0.22,
      );
      scene.add(accelerationArrow);

      const lookAtTarget = new THREE.Vector3(0, 1.35, 0);
      const desiredCameraPosition = new THREE.Vector3();
      const orbitOffset = new THREE.Vector3();

      hostElement.addEventListener("wheel", handleWheel, { passive: false });
      hostElement.addEventListener("pointerdown", handlePointerDown);
      hostElement.addEventListener("pointermove", handlePointerMove);
      hostElement.addEventListener("pointerup", handlePointerUp);
      hostElement.addEventListener("pointercancel", handlePointerUp);
      hostElement.addEventListener("lostpointercapture", stopDragging);

      function resizeRendererToDisplaySize() {
        if (!hostElement) {
          return;
        }

        const width = hostElement.clientWidth;
        const height = hostElement.clientHeight;
        const needResize =
          renderer.domElement.width !==
            Math.floor(width * Math.min(window.devicePixelRatio, 2)) ||
          renderer.domElement.height !==
            Math.floor(height * Math.min(window.devicePixelRatio, 2));

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
        const carFrontX = clamp(
          state.position * WORLD_UNITS_PER_METER,
          0,
          TRACK_LENGTH_WORLD - 8,
        );
        const carCenterX = carFrontX - CAR_FRONT_OFFSET_WORLD;
        const wheelAngle = state.position / CAR_WHEEL_RADIUS_M;

        carRig.group.position.x = carCenterX;
        carRig.wheelRotors.forEach((wheelRotor) => {
          wheelRotor.rotation.z = -wheelAngle;
        });

        const finishX = clamp(
          state.distanceDomain * WORLD_UNITS_PER_METER,
          8,
          TRACK_LENGTH_WORLD - 4,
        );
        finishGate.position.x = finishX;

        trailLine.visible = state.showTrail && carFrontX > 0.04;
        trailPositions[0] = 0;
        trailPositions[1] = 0;
        trailPositions[2] = 0;
        trailPositions[3] = carFrontX;
        trailPositions[4] = 0;
        trailPositions[5] = 0;
        trailGeometry.attributes.position.needsUpdate = true;

        velocityArrow.visible = state.showVelocityArrow && state.velocity > 0.04;
        if (velocityArrow.visible) {
          velocityArrow.position.set(
            carCenterX + CAR_FRONT_OFFSET_WORLD - 0.8,
            0.84,
            -(ROAD_WIDTH / 2 - 1.1),
          );
          velocityArrow.setDirection(new THREE.Vector3(1, 0, 0));
          velocityArrow.setLength(
            clamp(state.velocity * 1.05, 1, 4.8),
            0.34,
            0.2,
          );
          velocityArrow.setColor(new THREE.Color(0x67c6ff));
        }

        const accelerationMagnitude = Math.abs(state.acceleration);
        accelerationArrow.visible =
          state.showAccelerationArrow && accelerationMagnitude > 0.02;
        if (accelerationArrow.visible) {
          accelerationArrow.position.set(
            carCenterX + CAR_FRONT_OFFSET_WORLD - 0.8,
            1.34,
            -(ROAD_WIDTH / 2 - 1.1),
          );
          const isAcceleratingForward = state.acceleration >= 0;
          accelerationArrow.setDirection(
            new THREE.Vector3(isAcceleratingForward ? 1 : -1, 0, 0),
          );
          accelerationArrow.setLength(
            clamp(accelerationMagnitude * 2.4, 0.8, 3.8),
            0.32,
            0.18,
          );
          accelerationArrow.setColor(
            new THREE.Color(isAcceleratingForward ? 0x5de2b1 : 0xffbf67),
          );
        }

        const speedRatioTarget = clamp(state.velocity / 6.4, 0, 1);
        const accelerationBiasTarget = clamp(state.acceleration / 1.6, -1, 1);
        const accelerationKickTarget = clamp(
          state.acceleration - cameraDynamicsRef.current.accelerationBias * 1.6,
          -1,
          1,
        );

        cameraDynamicsRef.current.speedRatio +=
          (speedRatioTarget - cameraDynamicsRef.current.speedRatio) * 0.06;
        cameraDynamicsRef.current.accelerationBias +=
          (accelerationBiasTarget - cameraDynamicsRef.current.accelerationBias) * 0.08;
        cameraDynamicsRef.current.accelerationKick +=
          (accelerationKickTarget - cameraDynamicsRef.current.accelerationKick) * 0.16;
        cameraDynamicsRef.current.roll +=
          ((-cameraDynamicsRef.current.accelerationBias * 0.05) -
            cameraDynamicsRef.current.roll) *
          0.08;

        const speedRatio = cameraDynamicsRef.current.speedRatio;
        const accelerationBias = cameraDynamicsRef.current.accelerationBias;
        const accelerationKick = cameraDynamicsRef.current.accelerationKick;
        const bodyPitch =
          clamp(accelerationBias * 0.042 + accelerationKick * 0.022, -0.082, 0.068);
        const bodyFloat =
          0.02 + Math.abs(accelerationKick) * 0.06 + speedRatio * 0.02;
        carRig.bodyGroup.rotation.z +=
          (bodyPitch - carRig.bodyGroup.rotation.z) * 0.12;
        carRig.bodyGroup.position.y +=
          (bodyFloat - carRig.bodyGroup.position.y) * 0.12;
        carRig.shadow.material.opacity =
          0.22 + speedRatio * 0.04 + Math.abs(accelerationBias) * 0.05;
        const shadowScaleX = 1.06 - speedRatio * 0.03;
        const shadowScaleY = 0.7 - Math.abs(accelerationBias) * 0.04;
        carRig.shadow.scale.x += (shadowScaleX - carRig.shadow.scale.x) * 0.1;
        carRig.shadow.scale.y += (shadowScaleY - carRig.shadow.scale.y) * 0.1;

        if (state.acceleration < -0.02) {
          trailMaterial.color.set(0xffb766);
          trailMaterial.opacity = 0.92;
        } else if (state.acceleration > 0.02) {
          trailMaterial.color.set(0x5de2b1);
          trailMaterial.opacity = 0.86;
        } else {
          trailMaterial.color.set(new THREE.Color(accentColor));
          trailMaterial.opacity = 0.8;
        }
        const desiredRearLampIntensity =
          state.acceleration < -0.02 ? 1.38 : state.velocity > 0.04 ? 0.72 : 0.56;
        carRig.rearLampMaterial.emissiveIntensity +=
          (desiredRearLampIntensity - carRig.rearLampMaterial.emissiveIntensity) * 0.18;
        carRig.rearLampMaterial.opacity =
          state.acceleration < -0.02 ? 1 : 0.92;
        const orbitState = cameraOrbitRef.current;
        orbitState.yawOffset +=
          (orbitState.targetYawOffset - orbitState.yawOffset) * CAMERA_ORBIT_DAMPING;
        orbitState.pitchOffset +=
          (orbitState.targetPitchOffset - orbitState.pitchOffset) *
          CAMERA_ORBIT_DAMPING;
        const zoomRatio = cameraZoomRef.current;
        const desiredCameraY =
          5.35 +
          (zoomRatio - 1) * 2.25 +
          clamp(accelerationMagnitude * 0.12, 0, 0.45) -
          accelerationBias * 0.3 +
          Math.abs(accelerationKick) * 0.08;
        const desiredCameraSideOffset =
          12.4 * zoomRatio + speedRatio * 1.4 + Math.abs(accelerationBias) * 0.42;
        const desiredLookAhead = 5.8 + speedRatio * 2.2 + accelerationBias * 0.34;
        const desiredLookAtY =
          1.34 + accelerationBias * 0.24 - Math.abs(accelerationKick) * 0.05;
        lookAtTarget.x += (carCenterX + desiredLookAhead - lookAtTarget.x) * 0.11;
        lookAtTarget.y += (desiredLookAtY - lookAtTarget.y) * 0.11;

        const desiredRearOffset =
          11.4 * zoomRatio +
          speedRatio * 2.85 +
          clamp(accelerationBias * 0.46, -0.46, 0.46) +
          desiredLookAhead;
        const baseCameraOffsetX = -desiredRearOffset;
        const baseCameraOffsetY = desiredCameraY - desiredLookAtY;
        const baseCameraElevation = Math.atan2(
          baseCameraOffsetY,
          Math.hypot(baseCameraOffsetX, desiredCameraSideOffset),
        );
        const baseCameraAzimuth = Math.atan2(
          desiredCameraSideOffset,
          baseCameraOffsetX,
        );
        const cameraRadius = Math.hypot(
          baseCameraOffsetX,
          baseCameraOffsetY,
          desiredCameraSideOffset,
        );
        const orbitElevation = clamp(
          baseCameraElevation + orbitState.pitchOffset,
          MIN_CAMERA_ELEVATION,
          MAX_CAMERA_ELEVATION,
        );
        const orbitAzimuth = baseCameraAzimuth + orbitState.yawOffset;
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

        camera.up.set(cameraDynamicsRef.current.roll, 1, 0).normalize();
        const desiredFov = 38 + speedRatio * 2.6 + Math.abs(accelerationBias) * 1.2;
        camera.fov += (desiredFov - camera.fov) * 0.08;
        camera.updateProjectionMatrix();
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
  }, [accentColor, accentSoftColor]);

  return <div ref={hostRef} className="motion-stage-3d-layer" aria-hidden="true" />;
}

function buildGround(THREE: ThreeModule) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_LENGTH_WORLD + 80, 54),
    new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.96,
      metalness: 0.08,
    }),
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.set(TRACK_LENGTH_WORLD / 2 - 10, -0.02, 0);
  return ground;
}

function buildRoad(THREE: ThreeModule) {
  const roadGroup = new THREE.Group();
  const roadBase = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_LENGTH_WORLD, ROAD_THICKNESS, ROAD_WIDTH),
    new THREE.MeshStandardMaterial({
      color: 0x101c2c,
      roughness: 0.78,
      metalness: 0.08,
    }),
  );
  roadBase.position.set(TRACK_LENGTH_WORLD / 2, ROAD_THICKNESS / 2, 0);
  roadGroup.add(roadBase);

  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4e9fe8,
    emissive: 0x1a4f82,
    emissiveIntensity: 0.74,
    roughness: 0.36,
    metalness: 0.18,
  });

  const leftEdge = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_LENGTH_WORLD, 0.03, 0.12),
    edgeMaterial,
  );
  leftEdge.position.set(
    TRACK_LENGTH_WORLD / 2,
    ROAD_SURFACE_Y + 0.01,
    ROAD_WIDTH / 2 - 0.12,
  );
  roadGroup.add(leftEdge);

  const rightEdge = leftEdge.clone();
  rightEdge.position.z = -ROAD_WIDTH / 2 + 0.12;
  roadGroup.add(rightEdge);

  const dashMaterial = new THREE.MeshStandardMaterial({
    color: 0xc7e9ff,
    emissive: 0x6fb8ff,
    emissiveIntensity: 0.84,
    roughness: 0.42,
    metalness: 0.2,
  });

  for (let index = 0; index < TRACK_LENGTH_METERS / 2; index += 1) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 0.02, 0.12),
      dashMaterial,
    );
    dash.position.set(
      index * WORLD_UNITS_PER_METER * 2 + 0.6,
      ROAD_SURFACE_Y + 0.01,
      0,
    );
    roadGroup.add(dash);
  }

  return roadGroup;
}

function buildTrackMarkers(THREE: ThreeModule, accentColor: string) {
  const markerGroup = new THREE.Group();
  const minorMarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8dcfff,
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.72,
    roughness: 0.44,
    metalness: 0.12,
    transparent: true,
    opacity: 0.78,
  });
  const majorMarkMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6f1ff,
    emissive: 0x67c6ff,
    emissiveIntensity: 0.86,
    roughness: 0.38,
    metalness: 0.18,
    transparent: true,
    opacity: 0.84,
  });

  for (let meter = 2; meter <= TRACK_LENGTH_METERS; meter += 2) {
    const isMajor = meter % 10 === 0;
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(isMajor ? 0.12 : 0.08, 0.02, isMajor ? 5.9 : 1.3),
      isMajor ? majorMarkMaterial : minorMarkMaterial,
    );
    marker.position.set(meter * WORLD_UNITS_PER_METER, 0.16, 0);
    markerGroup.add(marker);

    if (isMajor) {
      const leftPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.1, 0.08),
        majorMarkMaterial,
      );
      leftPost.position.set(
        meter * WORLD_UNITS_PER_METER,
        0.62,
        ROAD_WIDTH / 2 + 0.8,
      );
      markerGroup.add(leftPost);

      const rightPost = leftPost.clone();
      rightPost.position.z = -ROAD_WIDTH / 2 - 0.8;
      markerGroup.add(rightPost);
    }
  }

  return markerGroup;
}

function buildRoadsideEnvironment(
  THREE: ThreeModule,
  accentColor: string,
  accentSoftColor: string,
) {
  const environmentGroup = new THREE.Group();
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: 0x16324c,
    emissive: new THREE.Color(accentSoftColor),
    emissiveIntensity: 0.26,
    roughness: 0.46,
    metalness: 0.18,
  });
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.34,
    roughness: 0.32,
    metalness: 0.18,
    transparent: true,
    opacity: 0.72,
  });
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f2537,
    emissive: new THREE.Color(accentSoftColor),
    emissiveIntensity: 0.18,
    roughness: 0.58,
    metalness: 0.12,
  });

  const leftRail = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_LENGTH_WORLD, 0.05, 0.08),
    railMaterial,
  );
  leftRail.position.set(TRACK_LENGTH_WORLD / 2, 0.56, ROAD_WIDTH / 2 + 1.48);
  environmentGroup.add(leftRail);

  const rightRail = leftRail.clone();
  rightRail.position.z = -ROAD_WIDTH / 2 - 1.48;
  environmentGroup.add(rightRail);

  for (let index = 0; index < 13; index += 1) {
    const x = 14 + index * 28 + (index % 2) * 4;
    const towerHeight = index % 3 === 0 ? 3.8 : 2.9;
    const zOffset = ROAD_WIDTH / 2 + 2.5 + (index % 2) * 0.55;

    addRoadsideTower({
      THREE,
      group: environmentGroup,
      material: towerMaterial,
      panelMaterial,
      x,
      y: towerHeight / 2,
      z: zOffset,
      height: towerHeight,
      tilt: index % 2 === 0 ? -0.08 : 0.08,
    });

    addRoadsideTower({
      THREE,
      group: environmentGroup,
      material: towerMaterial,
      panelMaterial,
      x,
      y: towerHeight / 2,
      z: -zOffset,
      height: towerHeight,
      tilt: index % 2 === 0 ? 0.08 : -0.08,
    });
  }

  return environmentGroup;
}

function addRoadsideTower({
  THREE,
  group,
  material,
  panelMaterial,
  x,
  y,
  z,
  height,
  tilt,
}: {
  THREE: ThreeModule;
  group: any;
  material: any;
  panelMaterial: any;
  x: number;
  y: number;
  z: number;
  height: number;
  tilt: number;
}) {
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, height, 0.14),
    material,
  );
  post.position.set(x, y, z);
  group.add(post);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.1, 1.2),
    panelMaterial,
  );
  panel.position.set(x + 0.12, y + height * 0.18, z);
  panel.rotation.y = tilt;
  group.add(panel);
}

function buildFinishGate(THREE: ThreeModule, accentColor: string) {
  const gateGroup = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.54,
    roughness: 0.34,
    metalness: 0.24,
  });

  const leftPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2, 0.12),
    material,
  );
  leftPost.position.set(0, 1.02, ROAD_WIDTH / 2 + 0.18);
  gateGroup.add(leftPost);

  const rightPost = leftPost.clone();
  rightPost.position.z = -ROAD_WIDTH / 2 - 0.18;
  gateGroup.add(rightPost);

  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, ROAD_WIDTH + 0.48),
    material,
  );
  topBar.position.set(0, 1.98, 0);
  gateGroup.add(topBar);

  return gateGroup;
}

function buildOriginBeacon(THREE: ThreeModule) {
  const originGroup = new THREE.Group();
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x67c6ff,
    emissive: 0x67c6ff,
    emissiveIntensity: 0.92,
    transparent: true,
    opacity: 0.88,
  });

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.2, ROAD_WIDTH + 0.56),
    glowMaterial,
  );
  bar.position.set(0, 0.62, 0);
  originGroup.add(bar);

  return originGroup;
}

function createCenteredExtrudedGeometry(
  THREE: ThreeModule,
  shape: InstanceType<ThreeModule["Shape"]>,
  depthMeters: number,
  options: Partial<ConstructorParameters<ThreeModule["ExtrudeGeometry"]>[1]> = {},
) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: toWorldUnits(depthMeters),
    steps: 1,
    curveSegments: 20,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: toWorldUnits(0.035),
    bevelThickness: toWorldUnits(0.03),
    ...options,
  });
  geometry.translate(0, 0, -toWorldUnits(depthMeters) / 2);
  return geometry;
}

function createModel3BodyShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toWorldUnits(-2.24), toWorldUnits(0.4));
  shape.quadraticCurveTo(
    toWorldUnits(-2.38),
    toWorldUnits(0.48),
    toWorldUnits(-2.32),
    toWorldUnits(0.64),
  );
  shape.quadraticCurveTo(
    toWorldUnits(-2.06),
    toWorldUnits(0.92),
    toWorldUnits(-1.78),
    toWorldUnits(1),
  );
  shape.quadraticCurveTo(
    toWorldUnits(-1.04),
    toWorldUnits(1.08),
    toWorldUnits(-0.16),
    toWorldUnits(1.1),
  );
  shape.quadraticCurveTo(
    toWorldUnits(0.56),
    toWorldUnits(1.12),
    toWorldUnits(1.16),
    toWorldUnits(1.04),
  );
  shape.quadraticCurveTo(
    toWorldUnits(1.78),
    toWorldUnits(0.96),
    toWorldUnits(2.08),
    toWorldUnits(0.84),
  );
  shape.quadraticCurveTo(
    toWorldUnits(2.28),
    toWorldUnits(0.76),
    toWorldUnits(2.34),
    toWorldUnits(0.58),
  );
  shape.quadraticCurveTo(
    toWorldUnits(2.28),
    toWorldUnits(0.44),
    toWorldUnits(2.04),
    toWorldUnits(0.38),
  );
  shape.lineTo(toWorldUnits(-2.08), toWorldUnits(0.38));
  shape.quadraticCurveTo(
    toWorldUnits(-2.18),
    toWorldUnits(0.38),
    toWorldUnits(-2.24),
    toWorldUnits(0.4),
  );

  shape.holes.push(createWheelWellPath(THREE, CAR_WHEEL_X_OFFSETS_M[0]));
  shape.holes.push(createWheelWellPath(THREE, CAR_WHEEL_X_OFFSETS_M[1]));

  return shape;
}

function createWheelWellPath(THREE: ThreeModule, centerX: number) {
  const path = new THREE.Path();
  const halfArchWidth = 0.54;
  const rockerY = 0.38;

  path.moveTo(
    toWorldUnits(centerX - halfArchWidth),
    toWorldUnits(rockerY),
  );
  path.quadraticCurveTo(
    toWorldUnits(centerX - 0.46),
    toWorldUnits(0.83),
    toWorldUnits(centerX),
    toWorldUnits(0.9),
  );
  path.quadraticCurveTo(
    toWorldUnits(centerX + 0.46),
    toWorldUnits(0.83),
    toWorldUnits(centerX + halfArchWidth),
    toWorldUnits(rockerY),
  );
  path.lineTo(
    toWorldUnits(centerX - halfArchWidth),
    toWorldUnits(rockerY),
  );
  return path;
}

function createModel3CabinShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toWorldUnits(-1.18), toWorldUnits(1.02));
  shape.quadraticCurveTo(
    toWorldUnits(-0.84),
    toWorldUnits(1.18),
    toWorldUnits(-0.18),
    toWorldUnits(1.36),
  );
  shape.quadraticCurveTo(
    toWorldUnits(0.4),
    toWorldUnits(1.44),
    toWorldUnits(0.88),
    toWorldUnits(1.34),
  );
  shape.quadraticCurveTo(
    toWorldUnits(1.16),
    toWorldUnits(1.26),
    toWorldUnits(1.34),
    toWorldUnits(1.06),
  );
  shape.lineTo(toWorldUnits(-1.04), toWorldUnits(1.06));
  shape.quadraticCurveTo(
    toWorldUnits(-1.1),
    toWorldUnits(1.04),
    toWorldUnits(-1.18),
    toWorldUnits(1.02),
  );
  return shape;
}

function createModel3GlassShape(THREE: ThreeModule) {
  const shape = new THREE.Shape();
  shape.moveTo(toWorldUnits(-1.02), toWorldUnits(1.08));
  shape.quadraticCurveTo(
    toWorldUnits(-0.7),
    toWorldUnits(1.2),
    toWorldUnits(-0.06),
    toWorldUnits(1.34),
  );
  shape.quadraticCurveTo(
    toWorldUnits(0.34),
    toWorldUnits(1.4),
    toWorldUnits(0.8),
    toWorldUnits(1.3),
  );
  shape.quadraticCurveTo(
    toWorldUnits(1.04),
    toWorldUnits(1.22),
    toWorldUnits(1.14),
    toWorldUnits(1.1),
  );
  shape.lineTo(toWorldUnits(-0.9), toWorldUnits(1.1));
  shape.quadraticCurveTo(
    toWorldUnits(-0.96),
    toWorldUnits(1.1),
    toWorldUnits(-1.02),
    toWorldUnits(1.08),
  );
  return shape;
}

function buildMotionCartRig(THREE: ThreeModule) {
  const carGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const wheelRotors: Array<any> = [];

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.body),
    roughness: 0.42,
    metalness: 0.18,
  });
  const bodyHighlightMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.body).offsetHSL(0, 0.04, 0.08),
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
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.trim),
    roughness: 0.34,
    metalness: 0.28,
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
      bevelSize: toWorldUnits(0.04),
      bevelThickness: toWorldUnits(0.04),
    }),
    bodyMaterial,
  );
  bodyGroup.add(bodyShell);

  const hoodNose = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.42),
      toWorldUnits(0.16),
      toWorldUnits(1.18),
    ),
    bodyMaterial,
  );
  hoodNose.position.set(toWorldUnits(1.98), toWorldUnits(0.92), 0);
  hoodNose.rotation.z = -0.12;
  bodyGroup.add(hoodNose);

  const hoodSurface = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(1.48),
      toWorldUnits(0.05),
      toWorldUnits(0.94),
    ),
    bodyHighlightMaterial,
  );
  hoodSurface.position.set(toWorldUnits(1.16), toWorldUnits(1.02), 0);
  hoodSurface.rotation.z = -0.08;
  bodyGroup.add(hoodSurface);

  const frunkSeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.7),
      toWorldUnits(0.016),
      toWorldUnits(0.02),
    ),
    trimMaterial,
  );
  frunkSeam.position.set(toWorldUnits(1.26), toWorldUnits(0.97), 0);
  frunkSeam.rotation.z = -0.08;
  bodyGroup.add(frunkSeam);

  const rearDeck = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.6),
      toWorldUnits(0.16),
      toWorldUnits(1.16),
    ),
    bodyMaterial,
  );
  rearDeck.position.set(toWorldUnits(-1.72), toWorldUnits(0.96), 0);
  rearDeck.rotation.z = 0.12;
  bodyGroup.add(rearDeck);

  const trunkSurface = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.96),
      toWorldUnits(0.05),
      toWorldUnits(0.9),
    ),
    bodyHighlightMaterial,
  );
  trunkSurface.position.set(toWorldUnits(-1.34), toWorldUnits(1.01), 0);
  trunkSurface.rotation.z = 0.04;
  bodyGroup.add(trunkSurface);

  const cabinShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createModel3CabinShape(THREE), CAR_CABIN_WIDTH_M, {
      bevelSize: toWorldUnits(0.025),
      bevelThickness: toWorldUnits(0.025),
    }),
    roofMaterial,
  );
  bodyGroup.add(cabinShell);

  const glassShell = new THREE.Mesh(
    createCenteredExtrudedGeometry(THREE, createModel3GlassShape(THREE), CAR_GLASS_WIDTH_M, {
      bevelSize: toWorldUnits(0.02),
      bevelThickness: toWorldUnits(0.02),
    }),
    glassMaterial,
  );
  glassShell.position.y = toWorldUnits(0.02);
  bodyGroup.add(glassShell);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.12),
      toWorldUnits(0.52),
      toWorldUnits(0.94),
    ),
    glassTintMaterial,
  );
  windshield.position.set(toWorldUnits(0.96), toWorldUnits(1.18), 0);
  windshield.rotation.z = -0.72;
  bodyGroup.add(windshield);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.12),
      toWorldUnits(0.48),
      toWorldUnits(0.86),
    ),
    glassTintMaterial,
  );
  rearGlass.position.set(toWorldUnits(-0.78), toWorldUnits(1.15), 0);
  rearGlass.rotation.z = 0.64;
  bodyGroup.add(rearGlass);

  const panoramicRoof = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(1.08),
      toWorldUnits(0.035),
      toWorldUnits(0.78),
    ),
    mirrorMaterial,
  );
  panoramicRoof.position.set(toWorldUnits(0.02), toWorldUnits(1.34), 0);
  panoramicRoof.rotation.z = -0.06;
  bodyGroup.add(panoramicRoof);

  const bPillar = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.06),
      toWorldUnits(0.42),
      toWorldUnits(CAR_GLASS_WIDTH_M * 0.9),
    ),
    darkTrimMaterial,
  );
  bPillar.position.set(toWorldUnits(-0.14), toWorldUnits(1.22), 0);
  bodyGroup.add(bPillar);

  const sideFeatureZ = toWorldUnits(CAR_BODY_WIDTH_M / 2 - 0.025);

  const accentStrip = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(2.48),
      toWorldUnits(0.04),
      toWorldUnits(0.02),
    ),
    accentMaterial,
  );
  accentStrip.position.set(toWorldUnits(0), toWorldUnits(0.98), sideFeatureZ);
  bodyGroup.add(accentStrip);

  const accentStripMirror = accentStrip.clone();
  accentStripMirror.position.z *= -1;
  bodyGroup.add(accentStripMirror);

  const frontDoorSeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.025),
      toWorldUnits(0.44),
      toWorldUnits(0.02),
    ),
    trimMaterial,
  );
  frontDoorSeam.position.set(toWorldUnits(0.4), toWorldUnits(0.88), sideFeatureZ);
  bodyGroup.add(frontDoorSeam);

  const frontDoorSeamMirror = frontDoorSeam.clone();
  frontDoorSeamMirror.position.z *= -1;
  bodyGroup.add(frontDoorSeamMirror);

  const rearDoorSeam = frontDoorSeam.clone();
  rearDoorSeam.position.x = toWorldUnits(-0.62);
  bodyGroup.add(rearDoorSeam);

  const rearDoorSeamMirror = rearDoorSeam.clone();
  rearDoorSeamMirror.position.z *= -1;
  bodyGroup.add(rearDoorSeamMirror);

  const doorHandleGeometry = new THREE.BoxGeometry(
    toWorldUnits(0.14),
    toWorldUnits(0.025),
    toWorldUnits(0.02),
  );
  [
    { x: 0.62, y: 0.94 },
    { x: -0.32, y: 0.94 },
  ].forEach(({ x, y }) => {
    const doorHandle = new THREE.Mesh(doorHandleGeometry, accentMaterial);
    doorHandle.position.set(toWorldUnits(x), toWorldUnits(y), sideFeatureZ);
    bodyGroup.add(doorHandle);

    const doorHandleMirror = doorHandle.clone();
    doorHandleMirror.position.z *= -1;
    bodyGroup.add(doorHandleMirror);
  });

  const cameraRepeater = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.09),
      toWorldUnits(0.045),
      toWorldUnits(0.02),
    ),
    mirrorMaterial,
  );
  cameraRepeater.position.set(toWorldUnits(1.04), toWorldUnits(0.99), sideFeatureZ);
  bodyGroup.add(cameraRepeater);

  const cameraRepeaterMirror = cameraRepeater.clone();
  cameraRepeaterMirror.position.z *= -1;
  bodyGroup.add(cameraRepeaterMirror);

  const sideSkirt = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(1.72),
      toWorldUnits(0.08),
      toWorldUnits(0.08),
    ),
    darkTrimMaterial,
  );
  sideSkirt.position.set(toWorldUnits(-0.04), toWorldUnits(0.42), toWorldUnits(0.92));
  bodyGroup.add(sideSkirt);

  const sideSkirtMirror = sideSkirt.clone();
  sideSkirtMirror.position.z *= -1;
  bodyGroup.add(sideSkirtMirror);

  const frontLowerFascia = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.18),
      toWorldUnits(0.18),
      toWorldUnits(1.06),
    ),
    darkTrimMaterial,
  );
  frontLowerFascia.position.set(toWorldUnits(2.16), toWorldUnits(0.52), 0);
  bodyGroup.add(frontLowerFascia);

  const frontIntake = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.08),
      toWorldUnits(0.12),
      toWorldUnits(0.76),
    ),
    mirrorMaterial,
  );
  frontIntake.position.set(toWorldUnits(2.25), toWorldUnits(0.56), 0);
  bodyGroup.add(frontIntake);

  const frontAperture = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.06),
      toWorldUnits(0.08),
      toWorldUnits(0.46),
    ),
    mirrorMaterial,
  );
  frontAperture.position.set(toWorldUnits(2.28), toWorldUnits(0.84), 0);
  bodyGroup.add(frontAperture);

  const frontBadge = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.03),
      toWorldUnits(0.12),
      toWorldUnits(0.04),
    ),
    windowTrimMaterial,
  );
  frontBadge.position.set(toWorldUnits(2.17), toWorldUnits(0.98), 0);
  frontBadge.rotation.z = 0.08;
  bodyGroup.add(frontBadge);

  const rearDiffuser = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.2),
      toWorldUnits(0.18),
      toWorldUnits(0.98),
    ),
    darkTrimMaterial,
  );
  rearDiffuser.position.set(toWorldUnits(-2.16), toWorldUnits(0.54), 0);
  bodyGroup.add(rearDiffuser);

  const trunkLip = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.16),
      toWorldUnits(0.04),
      toWorldUnits(0.88),
    ),
    bodyHighlightMaterial,
  );
  trunkLip.position.set(toWorldUnits(-2.05), toWorldUnits(1), 0);
  bodyGroup.add(trunkLip);

  const headLamp = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.22),
      toWorldUnits(0.07),
      toWorldUnits(0.28),
    ),
    lampMaterial,
  );
  headLamp.position.set(toWorldUnits(2.04), toWorldUnits(0.92), toWorldUnits(0.54));
  headLamp.rotation.y = -0.36;
  bodyGroup.add(headLamp);

  const headLampMirror = headLamp.clone();
  headLampMirror.position.z *= -1;
  headLampMirror.rotation.y *= -1;
  bodyGroup.add(headLampMirror);

  const headLampSide = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.08),
      toWorldUnits(0.07),
      toWorldUnits(0.22),
    ),
    lampMaterial,
  );
  headLampSide.position.set(toWorldUnits(1.9), toWorldUnits(0.9), toWorldUnits(0.71));
  bodyGroup.add(headLampSide);

  const headLampSideMirror = headLampSide.clone();
  headLampSideMirror.position.z *= -1;
  bodyGroup.add(headLampSideMirror);

  const headLampBrow = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.24),
      toWorldUnits(0.022),
      toWorldUnits(0.16),
    ),
    lampLensMaterial,
  );
  headLampBrow.position.set(toWorldUnits(2.02), toWorldUnits(0.99), toWorldUnits(0.58));
  headLampBrow.rotation.y = -0.24;
  bodyGroup.add(headLampBrow);

  const headLampBrowMirror = headLampBrow.clone();
  headLampBrowMirror.position.z *= -1;
  headLampBrowMirror.rotation.y *= -1;
  bodyGroup.add(headLampBrowMirror);

  const rearLamp = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.14),
      toWorldUnits(0.16),
      toWorldUnits(0.3),
    ),
    rearLampMaterial,
  );
  rearLamp.position.set(toWorldUnits(-2.12), toWorldUnits(0.96), toWorldUnits(0.54));
  rearLamp.rotation.y = 0.2;
  bodyGroup.add(rearLamp);

  const rearLampMirror = rearLamp.clone();
  rearLampMirror.position.z *= -1;
  rearLampMirror.rotation.y *= -1;
  bodyGroup.add(rearLampMirror);

  const rearLampWing = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.26),
      toWorldUnits(0.06),
      toWorldUnits(0.12),
    ),
    rearLampMaterial,
  );
  rearLampWing.position.set(toWorldUnits(-1.92), toWorldUnits(0.97), toWorldUnits(0.74));
  bodyGroup.add(rearLampWing);

  const rearLampWingMirror = rearLampWing.clone();
  rearLampWingMirror.position.z *= -1;
  bodyGroup.add(rearLampWingMirror);

  const rearLampBridge = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.08),
      toWorldUnits(0.05),
      toWorldUnits(0.96),
    ),
    rearLampMaterial,
  );
  rearLampBridge.position.set(toWorldUnits(-2.02), toWorldUnits(0.98), 0);
  bodyGroup.add(rearLampBridge);

  const rearReflector = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.08),
      toWorldUnits(0.035),
      toWorldUnits(0.12),
    ),
    lampMaterial,
  );
  rearReflector.position.set(toWorldUnits(-2.08), toWorldUnits(0.68), toWorldUnits(0.62));
  bodyGroup.add(rearReflector);

  const rearReflectorMirror = rearReflector.clone();
  rearReflectorMirror.position.z *= -1;
  bodyGroup.add(rearReflectorMirror);

  const mirrorArm = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.12),
      toWorldUnits(0.04),
      toWorldUnits(0.1),
    ),
    mirrorMaterial,
  );
  mirrorArm.position.set(toWorldUnits(1.02), toWorldUnits(1.18), toWorldUnits(0.84));
  mirrorArm.rotation.z = -0.18;
  bodyGroup.add(mirrorArm);

  const mirrorArmMirror = mirrorArm.clone();
  mirrorArmMirror.position.z *= -1;
  mirrorArmMirror.rotation.z *= -1;
  bodyGroup.add(mirrorArmMirror);

  const mirrorPod = new THREE.Mesh(
    new THREE.BoxGeometry(
      toWorldUnits(0.18),
      toWorldUnits(0.12),
      toWorldUnits(0.22),
    ),
    mirrorMaterial,
  );
  mirrorPod.position.set(toWorldUnits(1.14), toWorldUnits(1.18), toWorldUnits(0.98));
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
        toWorldUnits(wheelX),
        CAR_WHEEL_CENTER_Y,
        toWorldUnits(wheelZ),
      );
      const wheelRotor = new THREE.Group();
      wheelAssembly.add(wheelRotor);
      const tireWidth = toWorldUnits(0.24);
      const rimWidth = toWorldUnits(0.18);
      const rimFaceOffset = wheelSide * toWorldUnits(0.045);
      const lugRingRadius = CAR_WHEEL_RADIUS_WORLD * 0.18;
      const treadRingRadius = CAR_WHEEL_RADIUS_WORLD * 0.92;
      const treadRowOffsets = [-toWorldUnits(0.054), 0, toWorldUnits(0.054)];

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
              toWorldUnits(0.17),
              toWorldUnits(0.05),
              toWorldUnits(0.026),
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
          toWorldUnits(0.08),
          30,
        ),
        brakeDiscMaterial,
      );
      brakeDisc.rotation.x = Math.PI / 2;
      brakeDisc.position.z = -wheelSide * toWorldUnits(0.02);
      wheelRotor.add(brakeDisc);

      const brakeDiscHat = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.24,
          CAR_WHEEL_RADIUS_WORLD * 0.24,
          toWorldUnits(0.06),
          24,
        ),
        rimShadowMaterial,
      );
      brakeDiscHat.rotation.x = Math.PI / 2;
      brakeDiscHat.position.z = -wheelSide * toWorldUnits(0.014);
      wheelRotor.add(brakeDiscHat);

      const brakeDiscRing = new THREE.Mesh(
        new THREE.TorusGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.42,
          toWorldUnits(0.012),
          10,
          28,
        ),
        rimShadowMaterial,
      );
      brakeDiscRing.rotation.x = Math.PI / 2;
      brakeDiscRing.position.z = -wheelSide * toWorldUnits(0.056);
      wheelRotor.add(brakeDiscRing);

      for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
        const slotAngle = (Math.PI * 2 * slotIndex) / 6 + 0.18;
        const brakeSlot = new THREE.Mesh(
          new THREE.BoxGeometry(
            toWorldUnits(0.1),
            toWorldUnits(0.022),
            toWorldUnits(0.018),
          ),
          wheelInnerMaterial,
        );
        brakeSlot.position.set(
          Math.cos(slotAngle) * CAR_WHEEL_RADIUS_WORLD * 0.34,
          Math.sin(slotAngle) * CAR_WHEEL_RADIUS_WORLD * 0.34,
          -wheelSide * toWorldUnits(0.058),
        );
        brakeSlot.rotation.z = slotAngle + 0.44;
        wheelRotor.add(brakeSlot);
      }

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.72,
          CAR_WHEEL_RADIUS_WORLD * 0.72,
          toWorldUnits(0.1),
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
          toWorldUnits(0.05),
          30,
        ),
        rimMaterial,
      );
      rimDish.rotation.x = Math.PI / 2;
      rimDish.position.z = rimFaceOffset + wheelSide * toWorldUnits(0.035);
      wheelRotor.add(rimDish);

      const rimRing = new THREE.Mesh(
        new THREE.TorusGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.62,
          toWorldUnits(0.024),
          12,
          36,
        ),
        windowTrimMaterial,
      );
      rimRing.rotation.x = Math.PI / 2;
      rimRing.position.z = rimFaceOffset + wheelSide * toWorldUnits(0.024);
      wheelRotor.add(rimRing);

      const aeroCover = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.66,
          CAR_WHEEL_RADIUS_WORLD * 0.66,
          toWorldUnits(0.03),
          28,
        ),
        rimMaterial,
      );
      aeroCover.rotation.x = Math.PI / 2;
      aeroCover.position.z = rimFaceOffset + wheelSide * toWorldUnits(0.048);
      wheelRotor.add(aeroCover);

      for (let spokeIndex = 0; spokeIndex < 5; spokeIndex += 1) {
        const spokeAngle = (Math.PI * 2 * spokeIndex) / 5;
        const spokeLeft = new THREE.Mesh(
          new THREE.BoxGeometry(
            CAR_WHEEL_RADIUS_WORLD * 0.48,
            toWorldUnits(0.04),
            toWorldUnits(0.026),
          ),
          trimMaterial,
        );
        spokeLeft.position.set(
          CAR_WHEEL_RADIUS_WORLD * 0.14,
          -toWorldUnits(0.04),
          rimFaceOffset + wheelSide * toWorldUnits(0.016),
        );
        spokeLeft.rotation.z = spokeAngle + 0.12;
        wheelRotor.add(spokeLeft);

        const spokeRight = spokeLeft.clone();
        spokeRight.position.y *= -1;
        spokeRight.rotation.z -= 0.24;
        wheelRotor.add(spokeRight);

        const aeroBlade = new THREE.Mesh(
          new THREE.BoxGeometry(
            CAR_WHEEL_RADIUS_WORLD * 0.24,
            toWorldUnits(0.05),
            toWorldUnits(0.02),
          ),
          rimMaterial,
        );
        aeroBlade.position.set(
          CAR_WHEEL_RADIUS_WORLD * 0.26,
          0,
          rimFaceOffset + wheelSide * toWorldUnits(0.04),
        );
        aeroBlade.rotation.z = spokeAngle + 0.2;
        wheelRotor.add(aeroBlade);

        const lug = new THREE.Mesh(
          new THREE.CylinderGeometry(
            toWorldUnits(0.018),
            toWorldUnits(0.018),
            toWorldUnits(0.028),
            12,
          ),
          lugMaterial,
        );
        lug.rotation.x = Math.PI / 2;
        lug.position.set(
          Math.cos(spokeAngle + 0.18) * lugRingRadius,
          Math.sin(spokeAngle + 0.18) * lugRingRadius,
          rimFaceOffset + wheelSide * toWorldUnits(0.07),
        );
        wheelRotor.add(lug);
      }

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.16,
          CAR_WHEEL_RADIUS_WORLD * 0.16,
          toWorldUnits(0.08),
          18,
        ),
        mirrorMaterial,
      );
      hub.rotation.x = Math.PI / 2;
      hub.position.z = rimFaceOffset + wheelSide * toWorldUnits(0.072);
      wheelRotor.add(hub);

      const centerCap = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.1,
          CAR_WHEEL_RADIUS_WORLD * 0.1,
          toWorldUnits(0.036),
          18,
        ),
        centerCapMaterial,
      );
      centerCap.rotation.x = Math.PI / 2;
      centerCap.position.z = rimFaceOffset + wheelSide * toWorldUnits(0.094);
      wheelRotor.add(centerCap);

      const brakeCaliper = new THREE.Mesh(
        new THREE.BoxGeometry(
          toWorldUnits(0.12),
          toWorldUnits(0.19),
          toWorldUnits(0.06),
        ),
        brakeCaliperMaterial,
      );
      brakeCaliper.position.set(
        CAR_WHEEL_RADIUS_WORLD * 0.44,
        CAR_WHEEL_RADIUS_WORLD * 0.1,
        wheelSide * toWorldUnits(0.12),
      );
      brakeCaliper.rotation.z = -0.18 * wheelSide;
      wheelAssembly.add(brakeCaliper);

      carGroup.add(wheelAssembly);
      wheelRotors.push(wheelRotor);
    });
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(toWorldUnits(2.6), 40),
    new THREE.MeshBasicMaterial({
      color: 0x04070d,
      transparent: true,
      opacity: 0.28,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(toWorldUnits(-0.05), ROAD_SURFACE_Y + 0.02, 0);
  shadow.scale.set(1.04, 0.56, 1);
  carGroup.add(shadow);
  carGroup.add(bodyGroup);

  return {
    group: carGroup,
    bodyGroup,
    wheelRotors,
    rearLampMaterial,
    shadow,
  };
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function toWorldUnits(value: number) {
  return value * WORLD_UNITS_PER_METER;
}
