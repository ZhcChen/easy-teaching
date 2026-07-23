import { useEffect, useRef } from "react";

type ThreeModule = typeof import("three");

type ForceKey = "gravity" | "normal" | "pull" | "friction" | "net";
type ContactAreaKey = "flat" | "side" | "upright";
type ExperimentPhase = "idle" | "ramping" | "breakaway" | "uniform" | "complete";

type BasicForceThreeStageProps = {
  activeForce: ForceKey;
  contactArea: {
    key: ContactAreaKey;
    label: string;
    blockWidth: number;
    blockHeight: number;
  };
  isExperimentRunning: boolean;
  pressure: number;
  scene: {
    frictionForce: number;
    kineticFriction: number;
    netForce: number;
    normal: number;
    phase: ExperimentPhase;
    pullForce: number;
    readingRatio: number;
    travelProgress: number;
    weight: number;
  };
  surface: {
    accent: string;
    label: string;
    roughness: number;
  };
  visibleForces: Record<ForceKey, boolean>;
};

type ForceSceneState = {
  activeForce: ForceKey;
  contactAreaKey: ContactAreaKey;
  blockWidth: number;
  blockHeight: number;
  isExperimentRunning: boolean;
  pressure: number;
  frictionForce: number;
  kineticFriction: number;
  netForce: number;
  normal: number;
  phase: ExperimentPhase;
  pullForce: number;
  readingRatio: number;
  roughness: number;
  travelProgress: number;
  visibleForces: Record<ForceKey, boolean>;
  weight: number;
  accent: string;
};

type ForceArrowRuntime = {
  group: any;
  shaft: any;
  head: any;
  material: any;
};

const FORCE_COLORS: Record<ForceKey, string> = {
  gravity: "#ff6b6b",
  normal: "#34d399",
  pull: "#60a5fa",
  friction: "#f59e0b",
  net: "#c084fc",
};

const GROUND_WIDTH = 21.5;
const GROUND_DEPTH = 8.6;
const GROUND_THICKNESS = 0.34;
const BOARD_START_X = -6.2;
const BOARD_TRAVEL_X = 5.1;
const SCALE_CENTER_X = 6.8;
const SCALE_HOOK_X = 5.72;
const SCALE_CENTER_Y = 1.36;
const DEFAULT_CAMERA_DISTANCE = 11.8;
const MIN_CAMERA_DISTANCE = 8.2;
const MAX_CAMERA_DISTANCE = 17.2;
const CAMERA_WHEEL_STEP = 0.006;
const CAMERA_DRAG_STEP = 0.0056;
const CAMERA_DAMPING = 0.14;
const MIN_CAMERA_PITCH = -0.2;
const MAX_CAMERA_PITCH = 0.42;
const ARROW_HEAD_LENGTH = 0.3;

export function BasicForceThreeStage({
  activeForce,
  contactArea,
  isExperimentRunning,
  pressure,
  scene,
  surface,
  visibleForces,
}: BasicForceThreeStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cameraDistanceRef = useRef(DEFAULT_CAMERA_DISTANCE);
  const orbitRef = useRef({
    yaw: -0.82,
    pitch: 0.16,
    targetYaw: -0.82,
    targetPitch: 0.16,
    isDragging: false,
    pointerId: -1,
    lastPointerX: 0,
    lastPointerY: 0,
  });
  const stateRef = useRef<ForceSceneState>({
    activeForce,
    contactAreaKey: contactArea.key,
    blockWidth: contactArea.blockWidth,
    blockHeight: contactArea.blockHeight,
    isExperimentRunning,
    pressure,
    frictionForce: scene.frictionForce,
    kineticFriction: scene.kineticFriction,
    netForce: scene.netForce,
    normal: scene.normal,
    phase: scene.phase,
    pullForce: scene.pullForce,
    readingRatio: scene.readingRatio,
    roughness: surface.roughness,
    travelProgress: scene.travelProgress,
    visibleForces,
    weight: scene.weight,
    accent: surface.accent,
  });

  useEffect(() => {
    stateRef.current = {
      activeForce,
      contactAreaKey: contactArea.key,
      blockWidth: contactArea.blockWidth,
      blockHeight: contactArea.blockHeight,
      isExperimentRunning,
      pressure,
      frictionForce: scene.frictionForce,
      kineticFriction: scene.kineticFriction,
      netForce: scene.netForce,
      normal: scene.normal,
      phase: scene.phase,
      pullForce: scene.pullForce,
      readingRatio: scene.readingRatio,
      roughness: surface.roughness,
      travelProgress: scene.travelProgress,
      visibleForces,
      weight: scene.weight,
      accent: surface.accent,
    };
  }, [
    activeForce,
    contactArea.blockHeight,
    contactArea.blockWidth,
    contactArea.key,
    isExperimentRunning,
    pressure,
    scene.frictionForce,
    scene.kineticFriction,
    scene.netForce,
    scene.normal,
    scene.phase,
    scene.pullForce,
    scene.readingRatio,
    scene.travelProgress,
    scene.weight,
    surface.accent,
    surface.roughness,
    visibleForces,
  ]);

  useEffect(() => {
    let disposed = false;
    let animationFrameId = 0;
    let hostElement: HTMLDivElement | null = null;
    let renderer: any = null;

    function stopDragging() {
      const orbit = orbitRef.current;
      orbit.isDragging = false;
      orbit.pointerId = -1;
      if (hostElement) {
        hostElement.classList.remove("is-dragging");
      }
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      cameraDistanceRef.current = clamp(
        cameraDistanceRef.current + event.deltaY * CAMERA_WHEEL_STEP,
        MIN_CAMERA_DISTANCE,
        MAX_CAMERA_DISTANCE,
      );
    }

    function handlePointerDown(event: PointerEvent) {
      if (!hostElement || event.button !== 0) {
        return;
      }

      event.preventDefault();
      const orbit = orbitRef.current;
      orbit.isDragging = true;
      orbit.pointerId = event.pointerId;
      orbit.lastPointerX = event.clientX;
      orbit.lastPointerY = event.clientY;
      hostElement.classList.add("is-dragging");
      hostElement.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      const orbit = orbitRef.current;
      if (!orbit.isDragging || orbit.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const deltaX = event.clientX - orbit.lastPointerX;
      const deltaY = event.clientY - orbit.lastPointerY;
      orbit.lastPointerX = event.clientX;
      orbit.lastPointerY = event.clientY;
      orbit.targetYaw += deltaX * CAMERA_DRAG_STEP;
      orbit.targetPitch = clamp(
        orbit.targetPitch + deltaY * CAMERA_DRAG_STEP,
        MIN_CAMERA_PITCH,
        MAX_CAMERA_PITCH,
      );
    }

    function handlePointerUp(event: PointerEvent) {
      if (!hostElement) {
        return;
      }

      const orbit = orbitRef.current;
      if (orbit.pointerId !== event.pointerId) {
        return;
      }

      if (hostElement.hasPointerCapture(event.pointerId)) {
        hostElement.releasePointerCapture(event.pointerId);
      }

      stopDragging();
    }

    async function setupScene() {
      const THREE = await import("three");

      if (disposed || !hostRef.current) {
        return;
      }

      hostElement = hostRef.current;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      hostElement.appendChild(renderer.domElement);

      const sceneRoot = new THREE.Scene();
      sceneRoot.fog = new THREE.FogExp2(0x07111f, 0.035);

      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(-8.4, 4.2, 9.6);

      sceneRoot.add(new THREE.HemisphereLight(0xc8e4ff, 0x0a111c, 2.3));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(8, 14, 11);
      sceneRoot.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x59b5ff, 1.25);
      fillLight.position.set(-10, 8, -10);
      sceneRoot.add(fillLight);

      const backLight = new THREE.PointLight(0x46d7a7, 1.4, 28, 2.1);
      backLight.position.set(-6, 5, 0);
      sceneRoot.add(backLight);

      const boardMaterial = new THREE.MeshStandardMaterial({
        color: 0x142437,
        roughness: 0.86,
        metalness: 0.12,
      });
      const boardTopMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e354c,
        roughness: 0.76,
        metalness: 0.08,
      });
      const boardMesh = new THREE.Mesh(
        new THREE.BoxGeometry(GROUND_WIDTH, GROUND_THICKNESS, GROUND_DEPTH),
        boardMaterial,
      );
      boardMesh.position.set(0, -GROUND_THICKNESS / 2, 0);
      sceneRoot.add(boardMesh);

      const boardTopMesh = new THREE.Mesh(
        new THREE.BoxGeometry(GROUND_WIDTH - 0.16, 0.08, GROUND_DEPTH - 0.22),
        boardTopMaterial,
      );
      boardTopMesh.position.set(0, 0.04, 0);
      sceneRoot.add(boardTopMesh);

      const boardGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(GROUND_WIDTH - 0.4, GROUND_DEPTH - 0.42),
        new THREE.MeshBasicMaterial({
          color: 0x2bb7ff,
          transparent: true,
          opacity: 0.12,
        }),
      );
      boardGlow.rotation.x = -Math.PI / 2;
      boardGlow.position.set(0, 0.085, 0);
      sceneRoot.add(boardGlow);

      const ridgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a7fb0,
        roughness: 0.72,
        metalness: 0.18,
      });
      const ridgeMeshes = Array.from({ length: 12 }, (_, index) => {
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.04, 0.05),
          ridgeMaterial,
        );
        ridge.position.set(-5.4 + index * 0.95, 0.08, index % 2 === 0 ? -0.48 : 0.48);
        ridge.rotation.y = index % 2 === 0 ? 0.3 : -0.3;
        sceneRoot.add(ridge);
        return ridge;
      });

      const trailMaterial = new THREE.MeshStandardMaterial({
        color: 0x2bb7ff,
        emissive: 0x2bb7ff,
        emissiveIntensity: 0.32,
        roughness: 0.32,
        metalness: 0.18,
        transparent: true,
        opacity: 0.74,
      });
      const trailMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.04, 0.24),
        trailMaterial,
      );
      trailMesh.position.set(BOARD_START_X, 0.07, 0);
      sceneRoot.add(trailMesh);

      const originBeacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.06, 24),
        new THREE.MeshStandardMaterial({
          color: 0xc7e4ff,
          emissive: 0x7ac9ff,
          emissiveIntensity: 0.56,
          roughness: 0.24,
          metalness: 0.08,
        }),
      );
      originBeacon.position.set(BOARD_START_X, 0.05, 0);
      sceneRoot.add(originBeacon);

      const blockGroup = new THREE.Group();
      const blockOuter = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
          color: 0x15325a,
          roughness: 0.48,
          metalness: 0.08,
        }),
      );
      const blockInner = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
          color: 0x2b4f7d,
          roughness: 0.54,
          metalness: 0.04,
          transparent: true,
          opacity: 0.92,
        }),
      );
      const blockHighlight = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({
          color: 0x7bc1ff,
          transparent: true,
          opacity: 0.08,
        }),
      );
      blockGroup.add(blockOuter);
      blockInner.scale.set(0.84, 0.82, 0.84);
      blockGroup.add(blockInner);
      blockGroup.add(blockHighlight);
      sceneRoot.add(blockGroup);

      const blockShadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.8, 24),
        new THREE.MeshBasicMaterial({
          color: 0x07111f,
          transparent: true,
          opacity: 0.34,
        }),
      );
      blockShadow.rotation.x = -Math.PI / 2;
      blockShadow.position.set(BOARD_START_X, 0.012, 0);
      sceneRoot.add(blockShadow);

      const weightGroups = Array.from({ length: 4 }, () => {
        const weightGroup = new THREE.Group();
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.24, 0.32),
          new THREE.MeshStandardMaterial({
            color: 0x10243f,
            roughness: 0.38,
            metalness: 0.18,
          }),
        );
        const top = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.08, 0.16),
          new THREE.MeshStandardMaterial({
            color: 0x6f93bf,
            roughness: 0.24,
            metalness: 0.22,
          }),
        );
        top.position.y = 0.16;
        weightGroup.add(base);
        weightGroup.add(top);
        blockGroup.add(weightGroup);
        return weightGroup;
      });

      const scaleGroup = new THREE.Group();
      scaleGroup.position.set(SCALE_CENTER_X, SCALE_CENTER_Y, 0);
      const scaleBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.92, 0.88, 0.86),
        new THREE.MeshStandardMaterial({
          color: 0x10233f,
          roughness: 0.34,
          metalness: 0.2,
        }),
      );
      const scaleScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.16, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x08131f,
          roughness: 0.12,
          metalness: 0.24,
        }),
      );
      scaleScreen.position.set(-0.12, 0.1, 0.44);
      const scaleFill = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.08, 0.04),
        new THREE.MeshStandardMaterial({
          color: 0x7bc1ff,
          emissive: 0x7bc1ff,
          emissiveIntensity: 0.86,
          roughness: 0.14,
          metalness: 0.18,
        }),
      );
      scaleFill.position.set(-0.56, 0.1, 0.49);
      const scaleHead = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16, 0.18, 6, 12),
        new THREE.MeshStandardMaterial({
          color: 0x18395f,
          roughness: 0.28,
          metalness: 0.22,
        }),
      );
      scaleHead.rotation.z = Math.PI / 2;
      scaleHead.position.set(0.92, 0.06, 0);
      const scaleHook = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.025, 10, 26, Math.PI * 1.2),
        new THREE.MeshStandardMaterial({
          color: 0xdce9f8,
          roughness: 0.22,
          metalness: 0.32,
        }),
      );
      scaleHook.rotation.z = Math.PI * 0.18;
      scaleHook.position.set(-1.04, 0.02, 0);
      scaleGroup.add(scaleBody);
      scaleGroup.add(scaleScreen);
      scaleGroup.add(scaleFill);
      scaleGroup.add(scaleHead);
      scaleGroup.add(scaleHook);
      sceneRoot.add(scaleGroup);

      const ropeMaterial = new THREE.LineBasicMaterial({
        color: 0xf0f6ff,
        transparent: true,
        opacity: 0.92,
      });
      const ropeGeometry = new THREE.BufferGeometry();
      ropeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      const ropeLine = new THREE.Line(ropeGeometry, ropeMaterial);
      sceneRoot.add(ropeLine);

      const forceArrows = {
        gravity: buildForceArrow(THREE, FORCE_COLORS.gravity),
        normal: buildForceArrow(THREE, FORCE_COLORS.normal),
        pull: buildForceArrow(THREE, FORCE_COLORS.pull),
        friction: buildForceArrow(THREE, FORCE_COLORS.friction),
        net: buildForceArrow(THREE, FORCE_COLORS.net),
      };

      Object.values(forceArrows).forEach((arrow) => {
        sceneRoot.add(arrow.group);
      });

      function resizeRenderer() {
        if (!hostElement || !renderer) {
          return;
        }

        const width = hostElement.clientWidth;
        const height = hostElement.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      }

      resizeRenderer();
      const resizeObserver = new ResizeObserver(() => resizeRenderer());
      resizeObserver.observe(hostElement);

      hostElement.addEventListener("wheel", handleWheel, { passive: false });
      hostElement.addEventListener("pointerdown", handlePointerDown);
      hostElement.addEventListener("pointermove", handlePointerMove);
      hostElement.addEventListener("pointerup", handlePointerUp);
      hostElement.addEventListener("pointercancel", handlePointerUp);
      hostElement.addEventListener("pointerleave", handlePointerUp);

      const target = new THREE.Vector3();
      const cameraLookAt = new THREE.Vector3();
      const boardTopColor = new THREE.Color();
      const boardGlowColor = new THREE.Color();
      const accentColor = new THREE.Color();
      const highlightColor = new THREE.Color(0x7bc1ff);
      const workingVector = new THREE.Vector3();
      const ropePositions = ropeGeometry.getAttribute("position") as any;

      const animate = () => {
        if (disposed) {
          return;
        }

        const nextState = stateRef.current;
        const blockDimensions = resolveBlockDimensions(
          nextState.contactAreaKey,
          nextState.blockWidth,
          nextState.blockHeight,
        );
        const weightCount = Math.max(0, Math.round((nextState.pressure - 2) / 2));
        const blockX = BOARD_START_X + BOARD_TRAVEL_X * nextState.travelProgress;
        const blockY = blockDimensions.y / 2 + 0.02;
        const breakawayRatio =
          nextState.phase === "breakaway"
            ? clamp(nextState.netForce / Math.max(nextState.pullForce, 0.01), 0, 1)
            : 0;
        const tilt = nextState.isExperimentRunning ? 0.02 + breakawayRatio * 0.05 : 0;

        blockGroup.position.set(blockX, blockY, 0);
        blockGroup.rotation.z = tilt;
        blockOuter.scale.set(blockDimensions.x, blockDimensions.y, blockDimensions.z);
        blockInner.scale.set(
          Math.max(0.6, blockDimensions.x - 0.18),
          Math.max(0.6, blockDimensions.y - 0.14),
          Math.max(0.6, blockDimensions.z - 0.16),
        );
        blockHighlight.scale.set(
          blockDimensions.x + 0.03,
          blockDimensions.y + 0.03,
          blockDimensions.z + 0.03,
        );
        blockShadow.position.x = blockX;
        blockShadow.scale.set(blockDimensions.x * 0.72, blockDimensions.z * 0.56, 1);

        const surfaceColor = tintHex(nextState.accent, 0x10233b, 0.62, THREE);
        const surfaceGlow = tintHex(nextState.accent, 0x5ab7ff, 0.52, THREE);
        boardTopColor.set(surfaceColor);
        boardGlowColor.set(surfaceGlow);
        accentColor.set(nextState.accent);
        boardTopMaterial.color.copy(boardTopColor);
        boardTopMaterial.roughness = clamp(0.38 + nextState.roughness * 0.18, 0.34, 0.95);
        (boardGlow.material as any).color.copy(boardGlowColor);
        (boardGlow.material as any).opacity = 0.08 + nextState.roughness * 0.02;
        ridgeMaterial.color.copy(accentColor);

        ridgeMeshes.forEach((ridge, index) => {
          ridge.scale.y = 1 + nextState.roughness * 0.55 + (index % 3) * 0.08;
          ridge.position.z = index % 2 === 0 ? -0.58 : 0.58;
        });

        const travelLength = Math.max(0.001, blockX - BOARD_START_X);
        trailMesh.position.x = BOARD_START_X + travelLength / 2;
        trailMesh.scale.set(travelLength, 1, 1);
        trailMesh.visible = nextState.travelProgress > 0;

        const perRow = blockDimensions.x >= 2.8 ? 2 : 1;
        weightGroups.forEach((weightGroup, index) => {
          const visible = index < weightCount;
          weightGroup.visible = visible;
          if (!visible) {
            return;
          }

          const row = Math.floor(index / perRow);
          const col = index % perRow;
          const totalRowWidth = perRow * 0.56 - 0.14;
          const x = -totalRowWidth / 2 + col * 0.56;
          const y = blockDimensions.y / 2 + 0.18 + row * 0.3;
          weightGroup.position.set(x, y, 0);
        });

        scaleFill.scale.x = Math.max(0.02, nextState.readingRatio);
        scaleFill.position.x = -0.56 + ((0.92 * scaleFill.scale.x) - 0.92) / 2;

        const ropeStart = new THREE.Vector3(
          blockX + blockDimensions.x / 2,
          blockY + 0.05,
          0,
        );
        const ropeEnd = new THREE.Vector3(SCALE_HOOK_X, SCALE_CENTER_Y + 0.02, 0);
        ropePositions.setXYZ(0, ropeStart.x, ropeStart.y, ropeStart.z);
        ropePositions.setXYZ(1, ropeEnd.x, ropeEnd.y, ropeEnd.z);
        ropePositions.needsUpdate = true;

        updateForceArrow({
          THREE,
          arrow: forceArrows.gravity,
          active: nextState.activeForce === "gravity",
          visible: nextState.visibleForces.gravity,
          direction: workingVector.set(0, -1, 0),
          anchor: new THREE.Vector3(blockX, blockY + 0.12, 0),
          length: mapArrowLength(nextState.weight, Math.max(nextState.weight, nextState.normal, 1)),
          color: FORCE_COLORS.gravity,
        });

        updateForceArrow({
          THREE,
          arrow: forceArrows.normal,
          active: nextState.activeForce === "normal",
          visible: nextState.visibleForces.normal,
          direction: workingVector.set(0, 1, 0),
          anchor: new THREE.Vector3(blockX, blockY - 0.12, 0),
          length: mapArrowLength(nextState.normal, Math.max(nextState.weight, nextState.normal, 1)),
          color: FORCE_COLORS.normal,
        });

        updateForceArrow({
          THREE,
          arrow: forceArrows.pull,
          active: nextState.activeForce === "pull",
          visible: nextState.visibleForces.pull,
          direction: workingVector.set(1, 0, 0),
          anchor: new THREE.Vector3(blockX + blockDimensions.x / 2, blockY + 0.04, 0),
          length: mapArrowLength(
            nextState.pullForce,
            Math.max(nextState.pullForce, nextState.frictionForce, Math.abs(nextState.netForce), 1),
          ),
          color: FORCE_COLORS.pull,
        });

        updateForceArrow({
          THREE,
          arrow: forceArrows.friction,
          active: nextState.activeForce === "friction",
          visible: nextState.visibleForces.friction,
          direction: workingVector.set(-1, 0, 0),
          anchor: new THREE.Vector3(blockX - blockDimensions.x / 2, blockY - 0.04, 0),
          length: mapArrowLength(
            nextState.frictionForce,
            Math.max(nextState.pullForce, nextState.frictionForce, Math.abs(nextState.netForce), 1),
          ),
          color: FORCE_COLORS.friction,
        });

        updateForceArrow({
          THREE,
          arrow: forceArrows.net,
          active: nextState.activeForce === "net",
          visible: nextState.visibleForces.net && Math.abs(nextState.netForce) > 0.01,
          direction: workingVector.set(1, 0, 0),
          anchor: new THREE.Vector3(blockX + blockDimensions.x / 2, blockY + blockDimensions.y / 2 + 0.18, 0),
          length: mapArrowLength(
            Math.abs(nextState.netForce),
            Math.max(nextState.pullForce, nextState.frictionForce, Math.abs(nextState.netForce), 1),
            0.8,
            1.4,
          ),
          color: FORCE_COLORS.net,
        });

        const orbit = orbitRef.current;
        orbit.yaw = lerp(orbit.yaw, orbit.targetYaw, CAMERA_DAMPING);
        orbit.pitch = lerp(orbit.pitch, orbit.targetPitch, CAMERA_DAMPING);

        const focusX = blockX + (SCALE_HOOK_X - blockX) * 0.36;
        target.set(focusX, blockY + 0.56, 0);
        const cameraDistance = cameraDistanceRef.current;
        const horizontalDistance = Math.cos(orbit.pitch) * cameraDistance;

        camera.position.set(
          target.x + Math.cos(orbit.yaw) * horizontalDistance,
          target.y + Math.sin(orbit.pitch) * cameraDistance + 1.2,
          target.z + Math.sin(orbit.yaw) * horizontalDistance,
        );
        cameraLookAt.set(target.x + 1.05, target.y - 0.36, 0);
        camera.lookAt(cameraLookAt);

        const blockMaterial = blockOuter.material as any;
        const innerMaterial = blockInner.material as any;
        const highlightMaterial = blockHighlight.material as any;
        if (nextState.isExperimentRunning) {
          blockMaterial.emissive = highlightColor;
          blockMaterial.emissiveIntensity = 0.2 + breakawayRatio * 0.28;
          innerMaterial.opacity = 0.98;
          highlightMaterial.opacity = 0.12 + breakawayRatio * 0.08;
        } else {
          blockMaterial.emissive = highlightColor;
          blockMaterial.emissiveIntensity = 0.06;
          innerMaterial.opacity = 0.92;
          highlightMaterial.opacity = 0.08;
        }

        renderer.render(sceneRoot, camera);
        animationFrameId = window.requestAnimationFrame(animate);
      };

      animationFrameId = window.requestAnimationFrame(animate);

      return () => {
        resizeObserver.disconnect();
      };
    }

    let cleanupScene: (() => void) | undefined;
    void setupScene().then((cleanup) => {
      cleanupScene = cleanup;
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameId);
      cleanupScene?.();
      stopDragging();

      if (hostElement) {
        hostElement.removeEventListener("wheel", handleWheel);
        hostElement.removeEventListener("pointerdown", handlePointerDown);
        hostElement.removeEventListener("pointermove", handlePointerMove);
        hostElement.removeEventListener("pointerup", handlePointerUp);
        hostElement.removeEventListener("pointercancel", handlePointerUp);
        hostElement.removeEventListener("pointerleave", handlePointerUp);
      }

      if (renderer) {
        disposeSceneGraph(renderer);
      }
    };
  }, []);

  return <div ref={hostRef} className="force-stage-3d-layer" aria-label="滑动摩擦实验 3D 场景" />;
}

function buildForceArrow(THREE: ThreeModule, color: string): ForceArrowRuntime {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.65,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.58,
  });

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1, 10),
    material,
  );
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, ARROW_HEAD_LENGTH, 14),
    material,
  );

  const group = new THREE.Group();
  group.add(shaft);
  group.add(head);

  return { group, shaft, head, material };
}

function updateForceArrow({
  THREE,
  arrow,
  active,
  visible,
  direction,
  anchor,
  length,
  color,
}: {
  THREE: ThreeModule;
  arrow: ForceArrowRuntime;
  active: boolean;
  visible: boolean;
  direction: any;
  anchor: any;
  length: number;
  color: string;
}) {
  arrow.group.visible = visible;
  if (!visible) {
    return;
  }

  const shaftLength = Math.max(0.12, length - ARROW_HEAD_LENGTH);
  arrow.shaft.scale.set(1, shaftLength, 1);
  arrow.shaft.position.set(0, shaftLength / 2, 0);
  arrow.head.position.set(0, shaftLength + ARROW_HEAD_LENGTH / 2, 0);

  arrow.group.position.copy(anchor);
  arrow.group.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  arrow.material.color.set(color);
  arrow.material.emissive.set(color);
  arrow.material.opacity = active ? 1 : 0.44;
  arrow.material.emissiveIntensity = active ? 1.22 : 0.52;
}

function resolveBlockDimensions(
  contactAreaKey: ContactAreaKey,
  blockWidth: number,
  blockHeight: number,
) {
  const x = blockWidth / 54;
  const y = blockHeight / 60;

  if (contactAreaKey === "flat") {
    return { x, y, z: 1.94 };
  }

  if (contactAreaKey === "side") {
    return { x, y, z: 1.46 };
  }

  return { x, y, z: 1.18 };
}

function mapArrowLength(value: number, maxValue: number, base = 1.05, extra = 1.85) {
  if (value <= 0) {
    return 0.12;
  }

  return base + (value / Math.max(maxValue, 0.01)) * extra;
}

function tintHex(
  accent: string,
  fallbackHex: number,
  mixRatio: number,
  THREE: ThreeModule,
) {
  const accentColor = new THREE.Color(accent);
  const fallback = new THREE.Color(fallbackHex);
  return fallback.lerp(accentColor, mixRatio).getHex();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function disposeSceneGraph(renderer: any) {
  const scene = renderer.info ? renderer.domElement.parentElement : null;
  if (scene) {
    while (scene.firstChild) {
      scene.removeChild(scene.firstChild);
    }
  }

  renderer.dispose?.();
}
