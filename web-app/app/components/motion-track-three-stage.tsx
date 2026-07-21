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
const CAR_WHEEL_RADIUS_M = 0.34;
const CAR_WHEEL_RADIUS_WORLD = CAR_WHEEL_RADIUS_M * WORLD_UNITS_PER_METER;
const CAR_FRONT_OFFSET_M = 2.17;
const CAR_FRONT_OFFSET_WORLD = CAR_FRONT_OFFSET_M * WORLD_UNITS_PER_METER;
const DEFAULT_CAMERA_ZOOM_RATIO = 1.28;
const MIN_CAMERA_ZOOM_RATIO = 0.82;
const MAX_CAMERA_ZOOM_RATIO = 1.92;
const CAMERA_WHEEL_STEP = 0.0012;

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
      camera.position.set(-10.6, 5.5, 12.4);

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

      hostElement.addEventListener("wheel", handleWheel, { passive: false });

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
          velocityArrow.position.set(carCenterX - 0.2, 1.85, 0);
          velocityArrow.setDirection(new THREE.Vector3(1, 0, 0));
          velocityArrow.setLength(
            clamp(state.velocity * 1.35, 1.5, 8.6),
            0.58,
            0.32,
          );
          velocityArrow.setColor(new THREE.Color(0x67c6ff));
        }

        const accelerationMagnitude = Math.abs(state.acceleration);
        accelerationArrow.visible =
          state.showAccelerationArrow && accelerationMagnitude > 0.02;
        if (accelerationArrow.visible) {
          accelerationArrow.position.set(carCenterX - 0.2, 2.45, 0);
          const isAcceleratingForward = state.acceleration >= 0;
          accelerationArrow.setDirection(
            new THREE.Vector3(isAcceleratingForward ? 1 : -1, 0, 0),
          );
          accelerationArrow.setLength(
            clamp(accelerationMagnitude * 3.2, 1.1, 6.4),
            0.5,
            0.26,
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
        const zoomRatio = cameraZoomRef.current;
        const desiredCameraX =
          carCenterX -
          (10 * zoomRatio + speedRatio * 2.4 + clamp(accelerationBias * 0.4, -0.4, 0.4));
        const desiredCameraY =
          5 +
          (zoomRatio - 1) * 2.15 +
          clamp(accelerationMagnitude * 0.12, 0, 0.45) -
          accelerationBias * 0.3 +
          Math.abs(accelerationKick) * 0.08;
        const desiredCameraZ =
          10.9 * zoomRatio + speedRatio * 1.15 + Math.abs(accelerationBias) * 0.35;
        camera.position.x += (desiredCameraX - camera.position.x) * 0.08;
        camera.position.y += (desiredCameraY - camera.position.y) * 0.08;
        camera.position.z += (desiredCameraZ - camera.position.z) * 0.08;

        const desiredLookAhead = 5.2 + speedRatio * 2 + accelerationBias * 0.32;
        const desiredLookAtY =
          1.34 + accelerationBias * 0.24 - Math.abs(accelerationKick) * 0.05;
        lookAtTarget.x += (carCenterX + desiredLookAhead - lookAtTarget.x) * 0.11;
        lookAtTarget.y += (desiredLookAtY - lookAtTarget.y) * 0.11;
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
    new THREE.BoxGeometry(TRACK_LENGTH_WORLD, 0.16, ROAD_WIDTH),
    new THREE.MeshStandardMaterial({
      color: 0x101c2c,
      roughness: 0.78,
      metalness: 0.08,
    }),
  );
  roadBase.position.set(TRACK_LENGTH_WORLD / 2, 0.08, 0);
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
  leftEdge.position.set(TRACK_LENGTH_WORLD / 2, 0.17, ROAD_WIDTH / 2 - 0.12);
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
    dash.position.set(index * WORLD_UNITS_PER_METER * 2 + 0.6, 0.17, 0);
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

function buildMotionCartRig(THREE: ThreeModule) {
  const carGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const wheelRotors: Array<any> = [];

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.body),
    roughness: 0.42,
    metalness: 0.18,
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.roof),
    roughness: 0.5,
    metalness: 0.22,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.window),
    roughness: 0.1,
    metalness: 0.08,
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
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.wheel),
    roughness: 0.88,
    metalness: 0.08,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOTION_CART_COLORS.rim),
    roughness: 0.38,
    metalness: 0.44,
  });

  const lowerBody = new THREE.Mesh(
    new THREE.BoxGeometry(4.06 * WORLD_UNITS_PER_METER, 0.58 * WORLD_UNITS_PER_METER, 1.76 * WORLD_UNITS_PER_METER),
    bodyMaterial,
  );
  lowerBody.position.set(-0.18 * WORLD_UNITS_PER_METER, 0.94, 0);
  lowerBody.scale.z = 0.92;
  bodyGroup.add(lowerBody);

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.18 * WORLD_UNITS_PER_METER, 0.18 * WORLD_UNITS_PER_METER, 1.62 * WORLD_UNITS_PER_METER),
    bodyMaterial,
  );
  hood.position.set(1.28 * WORLD_UNITS_PER_METER, 1.26, 0);
  hood.rotation.z = -0.12;
  hood.scale.z = 0.94;
  bodyGroup.add(hood);

  const rearDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.92 * WORLD_UNITS_PER_METER, 0.16 * WORLD_UNITS_PER_METER, 1.48 * WORLD_UNITS_PER_METER),
    bodyMaterial,
  );
  rearDeck.position.set(-1.78 * WORLD_UNITS_PER_METER, 1.28, 0);
  rearDeck.rotation.z = 0.12;
  rearDeck.scale.z = 0.92;
  bodyGroup.add(rearDeck);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.28 * WORLD_UNITS_PER_METER, 0.76 * WORLD_UNITS_PER_METER, 1.58 * WORLD_UNITS_PER_METER),
    roofMaterial,
  );
  cabin.position.set(-0.18 * WORLD_UNITS_PER_METER, 1.72, 0);
  cabin.scale.z = 0.88;
  bodyGroup.add(cabin);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.04 * WORLD_UNITS_PER_METER, 0.54 * WORLD_UNITS_PER_METER, 1.42 * WORLD_UNITS_PER_METER),
    glassMaterial,
  );
  glass.position.set(-0.12 * WORLD_UNITS_PER_METER, 1.76, 0);
  glass.scale.z = 0.84;
  bodyGroup.add(glass);

  const accentStrip = new THREE.Mesh(
    new THREE.BoxGeometry(2.36 * WORLD_UNITS_PER_METER, 0.05, 0.08),
    accentMaterial,
  );
  accentStrip.position.set(
    -0.04 * WORLD_UNITS_PER_METER,
    1.28,
    0.82 * WORLD_UNITS_PER_METER,
  );
  bodyGroup.add(accentStrip);

  const accentStripMirror = accentStrip.clone();
  accentStripMirror.position.z *= -1;
  bodyGroup.add(accentStripMirror);

  const headLamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.18, 0.42),
    lampMaterial,
  );
  headLamp.position.set(
    2.08 * WORLD_UNITS_PER_METER,
    1.08,
    0.62 * WORLD_UNITS_PER_METER,
  );
  bodyGroup.add(headLamp);

  const headLampMirror = headLamp.clone();
  headLampMirror.position.z *= -1;
  bodyGroup.add(headLampMirror);

  const wheelXOffsets = [1.39, -1.39] as const;
  const wheelZOffsets = [0.74, -0.74] as const;

  wheelXOffsets.forEach((wheelX) => {
    wheelZOffsets.forEach((wheelZ) => {
      const wheelRotor = new THREE.Group();
      wheelRotor.position.set(
        wheelX * WORLD_UNITS_PER_METER,
        CAR_WHEEL_RADIUS_WORLD,
        wheelZ * WORLD_UNITS_PER_METER,
      );

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD,
          CAR_WHEEL_RADIUS_WORLD,
          0.22 * WORLD_UNITS_PER_METER,
          24,
        ),
        wheelMaterial,
      );
      tire.rotation.x = Math.PI / 2;
      wheelRotor.add(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(
          CAR_WHEEL_RADIUS_WORLD * 0.58,
          CAR_WHEEL_RADIUS_WORLD * 0.58,
          0.24 * WORLD_UNITS_PER_METER,
          16,
        ),
        rimMaterial,
      );
      rim.rotation.x = Math.PI / 2;
      wheelRotor.add(rim);

      const spokeA = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_WHEEL_RADIUS_WORLD * 1.2, 0.06, 0.05),
        wheelMaterial,
      );
      wheelRotor.add(spokeA);

      const spokeB = spokeA.clone();
      spokeB.rotation.z = Math.PI / 2;
      wheelRotor.add(spokeB);

      bodyGroup.add(wheelRotor);
      wheelRotors.push(wheelRotor);
    });
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.42 * WORLD_UNITS_PER_METER, 32),
    new THREE.MeshBasicMaterial({
      color: 0x04070d,
      transparent: true,
      opacity: 0.28,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(-0.14 * WORLD_UNITS_PER_METER, 0.03, 0);
  shadow.scale.set(1.06, 0.7, 1);
  carGroup.add(shadow);
  carGroup.add(bodyGroup);

  return {
    group: carGroup,
    bodyGroup,
    wheelRotors,
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
