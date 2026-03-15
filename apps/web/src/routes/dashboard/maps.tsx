import { createFileRoute } from "@tanstack/react-router";
import { Bot, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { lazy, Suspense, useState, useEffect } from "react";
import type { FloorData } from "@/components/floor-plan-3d";

// Lazy-load the 3D canvas — only runs on the client (no SSR)
const FloorPlanCanvas = lazy(() =>
  import("@/components/floor-plan-3d").then((m) => ({ default: m.FloorPlanCanvas }))
);

export const Route = createFileRoute("/dashboard/maps")({
  component: MapsPage,
});

/* ─── Floor data ─── */

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const goNext = () => setCurrent((i) => (i + 1) % floors.length);
  const goPrev = () => setCurrent((i) => (i - 1 + floors.length) % floors.length);

  const floor = floors[current];
  const onlineCount = floor.robots.filter((r) => r.status !== "offline").length;

  const loadingFallback = (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-bethune-black/10 border-t-bethune-warm" />
        <span className="text-sm text-bethune-muted">Loading 3D view...</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* 3D viewport — full area */}
      <div className="relative flex-1 overflow-hidden" style={{ background: "linear-gradient(180deg, #f9fafb 0%, #f1f2f4 50%, #e8eaed 100%)" }}>
        {isClient ? (
          <Suspense fallback={loadingFallback}>
            <FloorPlanCanvas floor={floor} />
          </Suspense>
        ) : (
          loadingFallback
        )}

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

/* ─── 2D Overlays ─── */

function RobotCard({ robot }: { robot: FloorData["robots"][number] }) {
  const cfg = {
    active:   { dot: "bg-green-500", label: "Active", text: "text-green-700" },
    idle:     { dot: "bg-neutral-400", label: "Idle", text: "text-neutral-600" },
    charging: { dot: "bg-amber-400", label: "Charging", text: "text-amber-700" },
    offline:  { dot: "bg-red-400", label: "Offline", text: "text-red-600" },
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
