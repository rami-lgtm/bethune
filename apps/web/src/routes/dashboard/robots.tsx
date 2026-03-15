import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  MoreHorizontal,
  Plus,
  Signal,
  SignalZero,
  Wifi,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/robots")({
  component: RobotsPage,
});

const robots = [
  {
    name: "Vacuum V3",
    type: "Floor Cleaning",
    protocol: "WiFi",
    battery: 87,
    status: "idle" as const,
    lastActive: "2 min ago",
  },
  {
    name: "Lawn Mower X1",
    type: "Lawn Care",
    protocol: "BLE",
    battery: 42,
    status: "active" as const,
    lastActive: "Now",
  },
  {
    name: "Kitchen Assist K2",
    type: "Kitchen",
    protocol: "WiFi",
    battery: 100,
    status: "charging" as const,
    lastActive: "1 hour ago",
  },
  {
    name: "Security Drone S1",
    type: "Security",
    protocol: "WiFi",
    battery: 65,
    status: "idle" as const,
    lastActive: "3 hours ago",
  },
  {
    name: "Window Cleaner W1",
    type: "Cleaning",
    protocol: "Zigbee",
    battery: 0,
    status: "offline" as const,
    lastActive: "2 days ago",
  },
];

function RobotsPage() {
  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-bethune-black">
            Manage Robots
          </h1>
          <p className="mt-2 text-sm text-bethune-gray">
            View and manage all connected robots.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-bethune-warm px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95">
          <Plus className="size-4" />
          Add Robot
        </button>
      </div>

      {/* Robot cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {robots.map((robot) => (
          <RobotCard key={robot.name} {...robot} />
        ))}

        {/* Add robot placeholder */}
        <button className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-bethune-black/10 bg-white/50 transition-colors hover:border-bethune-warm/30 hover:bg-white">
          <div className="flex size-12 items-center justify-center rounded-full bg-bethune-cream">
            <Plus className="size-5 text-bethune-muted" />
          </div>
          <span className="text-sm font-medium text-bethune-muted">
            Add new robot
          </span>
        </button>
      </div>
    </div>
  );
}

function RobotCard({
  name,
  type,
  protocol,
  battery,
  status,
  lastActive,
}: (typeof robots)[number]) {
  const statusConfig = {
    active: { color: "bg-green-500", label: "Active" },
    idle: { color: "bg-bethune-muted", label: "Idle" },
    charging: { color: "bg-yellow-400", label: "Charging" },
    offline: { color: "bg-red-400", label: "Offline" },
  };

  const config = statusConfig[status];

  return (
    <div className="rounded-2xl border border-bethune-black/5 bg-white p-6 transition-colors hover:border-bethune-warm/20">
      {/* Top row */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex size-11 items-center justify-center rounded-xl bg-bethune-cream">
          <Bot className="size-5 text-bethune-gray" />
        </div>
        <button className="flex size-8 items-center justify-center rounded-lg text-bethune-muted transition-colors hover:bg-bethune-cream hover:text-bethune-black">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Info */}
      <h3 className="text-base font-semibold text-bethune-black">{name}</h3>
      <p className="mt-0.5 text-xs text-bethune-muted">{type}</p>

      {/* Battery bar */}
      <div className="mt-4 mb-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-bethune-muted">Battery</span>
          <span className="text-xs tabular-nums text-bethune-muted">
            {battery}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bethune-cream">
          <div
            className={`h-full rounded-full transition-all ${
              battery > 20 ? "bg-bethune-warm" : "bg-red-400"
            }`}
            style={{ width: `${battery}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-bethune-black/5 pt-4">
        <div className="flex items-center gap-1.5">
          <div className={`size-2 rounded-full ${config.color}`} />
          <span className="text-xs text-bethune-muted">{config.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="size-3 text-bethune-muted" />
          <span className="text-xs text-bethune-muted">{protocol}</span>
        </div>
        <span className="text-xs text-bethune-muted">{lastActive}</span>
      </div>
    </div>
  );
}
