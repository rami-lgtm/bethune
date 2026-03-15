import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Droplets,
  Eye,
  MoreHorizontal,
  Plus,
  Radio,
  Thermometer,
  Volume2,
  Wifi,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/sensors")({
  component: SensorsPage,
});

const sensors = [
  {
    name: "Living Room Thermostat",
    type: "Temperature",
    icon: Thermometer,
    value: "72°F",
    location: "Living Room",
    battery: 94,
    protocol: "Zigbee",
    status: "online" as const,
    lastReading: "Just now",
  },
  {
    name: "Front Door Camera",
    type: "Motion",
    icon: Eye,
    value: "No motion",
    location: "Front Door",
    battery: 78,
    protocol: "WiFi",
    status: "online" as const,
    lastReading: "2 min ago",
  },
  {
    name: "Kitchen Humidity",
    type: "Humidity",
    icon: Droplets,
    value: "45%",
    location: "Kitchen",
    battery: 62,
    protocol: "Z-Wave",
    status: "online" as const,
    lastReading: "1 min ago",
  },
  {
    name: "Garage Noise Monitor",
    type: "Sound",
    icon: Volume2,
    value: "32 dB",
    location: "Garage",
    battery: 88,
    protocol: "BLE",
    status: "online" as const,
    lastReading: "Just now",
  },
  {
    name: "Backyard Motion",
    type: "Motion",
    icon: Activity,
    value: "Motion detected",
    location: "Backyard",
    battery: 15,
    protocol: "WiFi",
    status: "online" as const,
    lastReading: "30 sec ago",
  },
  {
    name: "Bedroom 2 Temp",
    type: "Temperature",
    icon: Thermometer,
    value: "—",
    location: "Bedroom 2",
    battery: 0,
    protocol: "Zigbee",
    status: "offline" as const,
    lastReading: "2 days ago",
  },
];

function SensorsPage() {
  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-bethune-black">
            Manage Sensors
          </h1>
          <p className="mt-2 text-sm text-bethune-gray">
            Monitor and configure all connected sensors.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-bethune-warm px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95">
          <Plus className="size-4" />
          Add Sensor
        </button>
      </div>

      {/* Sensor cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sensors.map((sensor) => (
          <SensorCard key={sensor.name} {...sensor} />
        ))}

        {/* Add sensor placeholder */}
        <button className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-bethune-black/10 bg-white/50 transition-colors hover:border-bethune-warm/30 hover:bg-white">
          <div className="flex size-12 items-center justify-center rounded-full bg-bethune-cream">
            <Plus className="size-5 text-bethune-muted" />
          </div>
          <span className="text-sm font-medium text-bethune-muted">
            Add new sensor
          </span>
        </button>
      </div>
    </div>
  );
}

function SensorCard({
  name,
  type,
  icon: Icon,
  value,
  location,
  battery,
  protocol,
  status,
  lastReading,
}: (typeof sensors)[number]) {
  const isOffline = status === "offline";

  return (
    <div className={`rounded-2xl border bg-white p-6 transition-colors ${isOffline ? "border-red-200/50 opacity-70" : "border-bethune-black/5 hover:border-bethune-warm/20"}`}>
      {/* Top row */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex size-11 items-center justify-center rounded-xl bg-bethune-cream">
          <Icon className={`size-5 ${isOffline ? "text-red-400" : "text-bethune-gray"}`} />
        </div>
        <button className="flex size-8 items-center justify-center rounded-lg text-bethune-muted transition-colors hover:bg-bethune-cream hover:text-bethune-black">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Info */}
      <h3 className="text-base font-semibold text-bethune-black">{name}</h3>
      <p className="mt-0.5 text-xs text-bethune-muted">{location} · {type}</p>

      {/* Current value */}
      <div className="mt-4 mb-4 rounded-xl bg-bethune-cream/50 px-4 py-3">
        <p className="text-xs text-bethune-muted">Current reading</p>
        <p className={`mt-1 text-lg font-bold tracking-tight ${isOffline ? "text-bethune-muted" : "text-bethune-black"}`}>
          {value}
        </p>
      </div>

      {/* Battery bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-bethune-muted">Battery</span>
          <span className="text-xs tabular-nums text-bethune-muted">{battery}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bethune-cream">
          <div
            className={`h-full rounded-full transition-all ${battery > 20 ? "bg-bethune-warm" : "bg-red-400"}`}
            style={{ width: `${battery}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-bethune-black/5 pt-4">
        <div className="flex items-center gap-1.5">
          <div className={`size-2 rounded-full ${isOffline ? "bg-red-400" : "bg-green-500"}`} />
          <span className="text-xs text-bethune-muted">{isOffline ? "Offline" : "Online"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="size-3 text-bethune-muted" />
          <span className="text-xs text-bethune-muted">{protocol}</span>
        </div>
        <span className="text-xs text-bethune-muted">{lastReading}</span>
      </div>
    </div>
  );
}
