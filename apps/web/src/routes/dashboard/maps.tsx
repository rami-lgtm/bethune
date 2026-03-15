import { createFileRoute } from "@tanstack/react-router";
import { Bot, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  RoundedBox,
  Environment,
  ContactShadows,
  Float,
} from "@react-three/drei";
import * as THREE from "three";

export const Route = createFileRoute("/dashboard/maps")({
  component: MapsPage,
});

/* ─── Data ─── */

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

interface FloorData {
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

const floors: FloorData[] = [
  {
    id: "ground",
    name: "Ground Floor",
    label: "1F",
    rooms: [
      { id: "living", name: "Living Room", x: 0, z: 0, w: 6, d: 4, type: "living" },
      { id: "kitchen", name: "Kitchen", x: 6.5, z: 0, w: 4.5, d: 4, type: "kitchen" },
      { id: "dining", name: "Dining", x: 11.5, z: 0, w: 4, d: 4, type: "living" },
      { id: "hall1", name: "Hallway", x: 0, z: 4.5, w: 15.5, d: 1.2, type: "hall" },
      { id: "garage", name: "Garage", x: 0, z: 6.2, w: 4.5, d: 3.5, type: "garage" },
      { id: "laundry", name: "Laundry", x: 5, z: 6.2, w: 3.2, d: 3.5, type: "utility" },
      { id: "bath1", name: "Bathroom", x: 8.7, z: 6.2, w: 2.8, d: 3.5, type: "bath" },
      { id: "study", name: "Study", x: 12, z: 6.2, w: 3.5, d: 3.5, type: "living" },
    ],
    robots: [
      { id: "vacuum", name: "Vacuum V3", status: "active", x: 3, z: 2 },
      { id: "kitchen-bot", name: "Kitchen K2", status: "charging", x: 8.5, z: 2 },
    ],
  },
  {
    id: "first",
    name: "First Floor",
    label: "2F",
    rooms: [
      { id: "master", name: "Master Bedroom", x: 0, z: 0, w: 6.5, d: 5, type: "bed" },
      { id: "ensuite", name: "En-suite", x: 0, z: 5.5, w: 3, d: 2.8, type: "bath" },
      { id: "closet", name: "Walk-in Closet", x: 3.5, z: 5.5, w: 3, d: 2.8, type: "utility" },
      { id: "hall2", name: "Hallway", x: 7, z: 0, w: 1.2, d: 8.3, type: "hall" },
      { id: "bed2", name: "Bedroom 2", x: 8.7, z: 0, w: 4.5, d: 3.8, type: "bed" },
      { id: "bed3", name: "Bedroom 3", x: 8.7, z: 4.3, w: 4.5, d: 4, type: "bed" },
      { id: "bath2", name: "Bathroom", x: 13.7, z: 0, w: 2.5, d: 3.8, type: "bath" },
    ],
    robots: [
      { id: "window", name: "Window W1", status: "offline", x: 11, z: 2 },
    ],
  },
  {
    id: "ext",
    name: "Exterior",
    label: "EXT",
    rooms: [
      { id: "front", name: "Front Yard", x: 0, z: 0, w: 7.5, d: 4.5, type: "outdoor" },
      { id: "drive", name: "Driveway", x: 8, z: 0, w: 2.8, d: 4.5, type: "garage" },
      { id: "back", name: "Backyard", x: 0, z: 5, w: 10.8, d: 4.5, type: "outdoor" },
      { id: "patio", name: "Patio", x: 11.3, z: 5, w: 3.5, d: 4.5, type: "hall" },
      { id: "side", name: "Side Path", x: 11.3, z: 0, w: 3.5, d: 4.5, type: "hall" },
    ],
    robots: [
      { id: "mower", name: "Mower X1", status: "active", x: 4, z: 2.5 },
      { id: "drone", name: "Drone S1", status: "idle", x: 13, z: 7 },
    ],
  },
];

/* ─── Page ─── */

function MapsPage() {
  const [current, setCurrent] = useState(0);

  const goNext = () => setCurrent((i) => (i + 1) % floors.length);
  const goPrev = () => setCurrent((i) => (i - 1 + floors.length) % floors.length);

  const floor = floors[current];
  const onlineCount = floor.robots.filter((r) => r.status !== "offline").length;

  return (
    <div className="flex h-full flex-col">
      {/* 3D viewport — full area */}
      <div className="relative flex-1 overflow-hidden" style={{ background: "linear-gradient(180deg, #f9fafb 0%, #f1f2f4 50%, #e8eaed 100%)" }}>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 animate-spin rounded-full border-2 border-bethune-black/10 border-t-bethune-warm" />
                <span className="text-sm text-bethune-muted">Loading 3D view...</span>
              </div>
            </div>
          }
        >
          <Canvas
            shadows
            camera={{ position: [14, 12, 16], fov: 35 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
            dpr={[1, 2]}
          >
            <Scene floor={floor} />
          </Canvas>
        </Suspense>

        {/* Top bar overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/80 px-5 py-3 shadow-lg shadow-black/5 backdrop-blur-xl border border-white/50">
            <h1 className="text-base font-semibold tracking-tight text-bethune-black">
              {floor.name}
            </h1>
            <div className="h-4 w-px bg-bethune-black/10" />
            <span className="text-xs text-bethune-muted">
              {floor.rooms.length} rooms
            </span>
            <div className="h-4 w-px bg-bethune-black/10" />
            <span className="text-xs text-bethune-muted">
              {onlineCount} robot{onlineCount !== 1 ? "s" : ""} online
            </span>
          </div>

          <div className="pointer-events-auto">
            <LiveIndicator />
          </div>
        </div>

        {/* Bottom controls overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-6">
          {/* Floor carousel */}
          <div className="flex flex-col items-center gap-4">
            {/* Robot status cards */}
            {floor.robots.length > 0 && (
              <div className="pointer-events-auto flex gap-2">
                {floor.robots.map((robot) => (
                  <RobotCard key={robot.id} robot={robot} />
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/80 p-1.5 shadow-lg shadow-black/5 backdrop-blur-xl border border-white/50">
              <button
                onClick={goPrev}
                className="flex size-9 items-center justify-center rounded-xl text-bethune-muted transition-all hover:bg-bethune-black/5 hover:text-bethune-black active:scale-95"
              >
                <ChevronLeft className="size-4" />
              </button>

              {floors.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setCurrent(i)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                    i === current
                      ? "bg-bethune-black text-white shadow-sm"
                      : "text-bethune-muted hover:text-bethune-black"
                  }`}
                >
                  <Layers className="size-3" />
                  {f.name}
                </button>
              ))}

              <button
                onClick={goNext}
                className="flex size-9 items-center justify-center rounded-xl text-bethune-muted transition-all hover:bg-bethune-black/5 hover:text-bethune-black active:scale-95"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Interaction hint */}
        <div className="pointer-events-none absolute left-6 bottom-6 rounded-xl bg-white/70 px-3 py-2 text-[10px] text-bethune-muted/60 backdrop-blur-sm">
          Drag to rotate · Scroll to zoom
        </div>
      </div>
    </div>
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
      {/* Environment for realistic reflections */}
      <Environment preset="city" />
      <fog attach="fog" args={["#f1f2f4", 25, 55]} />

      {/* Lighting */}
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

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#edeef0" roughness={0.95} />
      </mesh>

      {/* Soft contact shadows */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.25}
        scale={30}
        blur={2.5}
        far={10}
      />

      {/* Base platform */}
      <RoundedBox
        args={[maxX + 1.6, 0.15, maxZ + 1.6]}
        radius={0.06}
        position={[0, -0.1, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#f5f6f7" roughness={0.8} />
      </RoundedBox>

      {/* Rooms */}
      {floor.rooms.map((room) => (
        <Room key={room.id} room={room} offsetX={offsetX} offsetZ={offsetZ} />
      ))}

      {/* Robots */}
      {floor.robots.map((robot) => (
        <RobotMarker3D key={robot.id} robot={robot} offsetX={offsetX} offsetZ={offsetZ} />
      ))}

      {/* Controls */}
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
      {/* Floor tile — slightly raised */}
      <RoundedBox
        args={[room.w - 0.04, 0.06, room.d - 0.04]}
        radius={0.02}
        position={[cx, 0.03, cz]}
        receiveShadow
      >
        <meshStandardMaterial color={colors.floor} roughness={0.6} metalness={0.01} />
      </RoundedBox>

      {/* Walls */}
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

      {/* Room label */}
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
      {/* Ground glow for active */}
      {isActive && (
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      )}

      {/* Stem line */}
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.55, 8]} />
        <meshBasicMaterial color="#ccc" transparent opacity={0.4} />
      </mesh>

      {/* Floating pin */}
      <Float speed={0} floatIntensity={0}>
        <group ref={markerRef} position={[0, 0.65, 0]}>
          {/* Outer shell */}
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

          {/* Inner status glow */}
          <mesh>
            <sphereGeometry args={[0.12, 24, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>

          {/* Outer glow halo */}
          <mesh>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.08} />
          </mesh>

          {/* Name tag */}
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

/* ─── 2D Overlays ─── */

function RobotCard({ robot }: { robot: RobotData }) {
  const cfg = {
    active:   { dot: "bg-green-500", bg: "bg-green-500/10", label: "Active", text: "text-green-700" },
    idle:     { dot: "bg-neutral-400", bg: "bg-neutral-400/10", label: "Idle", text: "text-neutral-600" },
    charging: { dot: "bg-amber-400", bg: "bg-amber-400/10", label: "Charging", text: "text-amber-700" },
    offline:  { dot: "bg-red-400", bg: "bg-red-400/10", label: "Offline", text: "text-red-600" },
  }[robot.status];

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-xl border border-white/50">
      <div className="flex size-9 items-center justify-center rounded-xl bg-bethune-cream/80">
        <Bot className="size-4 text-bethune-gray" />
      </div>
      <div>
        <p className="text-xs font-semibold text-bethune-black">{robot.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <div className={`size-1.5 rounded-full ${cfg.dot}`} />
          <span className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</span>
        </div>
      </div>
    </div>
  );
}

function LiveIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl border border-white/50">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      </span>
      <span className="text-xs font-medium text-green-700">Live</span>
    </div>
  );
}
