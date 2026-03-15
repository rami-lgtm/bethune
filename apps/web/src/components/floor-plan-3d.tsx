"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  RoundedBox,
  Environment,
  ContactShadows,
  Float,
} from "@react-three/drei";
import * as THREE from "three";

/* ─── Types ─── */

interface RoomData {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  type: "living" | "kitchen" | "bed" | "bath" | "hall" | "garage" | "outdoor" | "utility";
}

interface RobotData {
  id: string;
  name: string;
  status: "active" | "idle" | "charging" | "offline";
  x: number;
  z: number;
}

export interface FloorData {
  id: string;
  name: string;
  label: string;
  rooms: RoomData[];
  robots: RobotData[];
}

const ROOM_COLORS: Record<RoomData["type"], { floor: string; wall: string }> = {
  living:  { floor: "#f7f5f2", wall: "#e8e5e0" },
  kitchen: { floor: "#f0eeeb", wall: "#dfdcd7" },
  bed:     { floor: "#f5f3f0", wall: "#e5e2dd" },
  bath:    { floor: "#eef3f1", wall: "#dbe5e1" },
  hall:    { floor: "#edecea", wall: "#dddbd8" },
  garage:  { floor: "#e8e7e5", wall: "#d5d3d0" },
  outdoor: { floor: "#eaf0e7", wall: "#d8e0d5" },
  utility: { floor: "#f0eeeb", wall: "#dfdcd7" },
};

/* ─── Exported Canvas wrapper ─── */

export function FloorPlanCanvas({ floor }: { floor: FloorData }) {
  return (
    <Canvas
      shadows
      camera={{ position: [14, 12, 16], fov: 35 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      dpr={[1, 2]}
    >
      <Scene floor={floor} />
    </Canvas>
  );
}

/* ─── 3D Scene ─── */

function Scene({ floor }: { floor: FloorData }) {
  const maxX = Math.max(...floor.rooms.map((r) => r.x + r.w));
  const maxZ = Math.max(...floor.rooms.map((r) => r.z + r.d));
  const offsetX = -maxX / 2;
  const offsetZ = -maxZ / 2;

  return (
    <>
      <Environment preset="city" />
      <fog attach="fog" args={["#f1f2f4", 25, 55]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[8, 20, 12]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-8, 10, -6]} intensity={0.2} color="#b8c4d8" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#edeef0" roughness={0.95} />
      </mesh>

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.25}
        scale={30}
        blur={2.5}
        far={10}
      />

      <RoundedBox
        args={[maxX + 1.6, 0.15, maxZ + 1.6]}
        radius={0.06}
        position={[0, -0.1, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#f5f6f7" roughness={0.8} />
      </RoundedBox>

      {floor.rooms.map((room) => (
        <Room key={room.id} room={room} offsetX={offsetX} offsetZ={offsetZ} />
      ))}

      {floor.robots.map((robot) => (
        <RobotMarker3D key={robot.id} robot={robot} offsetX={offsetX} offsetZ={offsetZ} />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={Math.PI / 8}
        target={[0, 0, 0]}
        enablePan={false}
      />
    </>
  );
}

/* ─── 3D Room ─── */

const WALL_H = 0.9;
const WALL_T = 0.06;

function Room({
  room,
  offsetX,
  offsetZ,
}: {
  room: RoomData;
  offsetX: number;
  offsetZ: number;
}) {
  const colors = ROOM_COLORS[room.type];
  const cx = room.x + room.w / 2 + offsetX;
  const cz = room.z + room.d / 2 + offsetZ;

  const wallMat = useMemo(
    () => (
      <meshStandardMaterial
        color={colors.wall}
        roughness={0.7}
        metalness={0.02}
      />
    ),
    [colors.wall],
  );

  return (
    <group>
      <RoundedBox
        args={[room.w - 0.04, 0.06, room.d - 0.04]}
        radius={0.02}
        position={[cx, 0.03, cz]}
        receiveShadow
      >
        <meshStandardMaterial color={colors.floor} roughness={0.6} metalness={0.01} />
      </RoundedBox>

      <WallSegment
        position={[cx, WALL_H / 2 + 0.06, room.z + offsetZ + WALL_T / 2]}
        size={[room.w, WALL_H, WALL_T]}
        material={wallMat}
      />
      <WallSegment
        position={[cx, WALL_H / 2 + 0.06, room.z + room.d + offsetZ - WALL_T / 2]}
        size={[room.w, WALL_H, WALL_T]}
        material={wallMat}
      />
      <WallSegment
        position={[room.x + offsetX + WALL_T / 2, WALL_H / 2 + 0.06, cz]}
        size={[WALL_T, WALL_H, room.d]}
        material={wallMat}
      />
      <WallSegment
        position={[room.x + room.w + offsetX - WALL_T / 2, WALL_H / 2 + 0.06, cz]}
        size={[WALL_T, WALL_H, room.d]}
        material={wallMat}
      />

      <Text
        position={[cx, 0.07, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(room.w, room.d) > 2 ? 0.28 : 0.2}
        color="#b0ada8"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        letterSpacing={0.05}
      >
        {room.name}
      </Text>
    </group>
  );
}

function WallSegment({
  position,
  size,
  material,
}: {
  position: [number, number, number];
  size: [number, number, number];
  material: React.ReactNode;
}) {
  return (
    <RoundedBox args={size} radius={0.015} position={position} castShadow receiveShadow>
      {material}
    </RoundedBox>
  );
}

/* ─── 3D Robot Marker ─── */

function RobotMarker3D({
  robot,
  offsetX,
  offsetZ,
}: {
  robot: RobotData;
  offsetX: number;
  offsetZ: number;
}) {
  const markerRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const px = robot.x + offsetX;
  const pz = robot.z + offsetZ;

  const color = {
    active: "#22c55e",
    idle: "#a3a3a3",
    charging: "#f59e0b",
    offline: "#ef4444",
  }[robot.status];

  const isActive = robot.status === "active";

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (markerRef.current) {
      markerRef.current.position.y = 0.65 + Math.sin(t * 1.5) * 0.06;
    }
    if (glowRef.current && isActive) {
      const s = 1 + Math.sin(t * 2.5) * 0.4;
      glowRef.current.scale.set(s, s, s);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.2 - Math.sin(t * 2.5) * 0.1;
    }
  });

  return (
    <group position={[px, 0, pz]}>
      {isActive && (
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      )}

      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.55, 8]} />
        <meshBasicMaterial color="#ccc" transparent opacity={0.4} />
      </mesh>

      <Float speed={0} floatIntensity={0}>
        <group ref={markerRef} position={[0, 0.65, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 32, 32]} />
            <meshPhysicalMaterial
              color="white"
              roughness={0.15}
              metalness={0.05}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>

          <mesh>
            <sphereGeometry args={[0.12, 24, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>

          <mesh>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.08} />
          </mesh>

          <group position={[0, 0.4, 0]}>
            <RoundedBox args={[robot.name.length * 0.13 + 0.3, 0.28, 0.04]} radius={0.06}>
              <meshPhysicalMaterial
                color="white"
                roughness={0.3}
                clearcoat={1}
                transparent
                opacity={0.92}
              />
            </RoundedBox>
            <Text
              position={[0, 0, 0.025]}
              fontSize={0.14}
              color="#3f3f46"
              anchorX="center"
              anchorY="middle"
              font={undefined}
              letterSpacing={0.02}
            >
              {robot.name}
            </Text>
          </group>
        </group>
      </Float>
    </group>
  );
}
