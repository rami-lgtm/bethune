import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksPage,
});

const tasks = [
  {
    name: "Vacuum living room",
    robot: "Vacuum V3",
    schedule: "Every day at 9:00 AM",
    nextRun: "Tomorrow, 9:00 AM",
    status: "active" as const,
    lastRun: "Completed — 2 min ago",
  },
  {
    name: "Mow front lawn",
    robot: "Lawn Mower X1",
    schedule: "Every Tuesday & Friday, 7:00 AM",
    nextRun: "Friday, 7:00 AM",
    status: "running" as const,
    lastRun: "Running now...",
  },
  {
    name: "Evening security sweep",
    robot: "Security Drone S1",
    schedule: "Every day at 10:00 PM",
    nextRun: "Today, 10:00 PM",
    status: "active" as const,
    lastRun: "Completed — 14 hours ago",
  },
  {
    name: "Clean kitchen counters",
    robot: "Kitchen Assist K2",
    schedule: "Every day at 8:00 PM",
    nextRun: "Today, 8:00 PM",
    status: "paused" as const,
    lastRun: "Completed — 1 day ago",
  },
  {
    name: "Window wash — exterior",
    robot: "Window Cleaner W1",
    schedule: "Every Sunday, 11:00 AM",
    nextRun: "—",
    status: "disabled" as const,
    lastRun: "Failed — robot offline",
  },
];

function TasksPage() {
  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-bethune-black">
            Scheduled Tasks
          </h1>
          <p className="mt-2 text-sm text-bethune-gray">
            Automate recurring jobs across your robots.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-bethune-warm px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95">
          <Plus className="size-4" />
          New Task
        </button>
      </div>

      {/* Task list */}
      <div className="overflow-hidden rounded-2xl border border-bethune-black/5 bg-white">
        {/* Table header */}
        <div className="hidden border-b border-bethune-black/5 bg-bethune-cream/50 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-bethune-muted lg:grid lg:grid-cols-[1fr_140px_180px_140px_48px]">
          <span>Task</span>
          <span>Status</span>
          <span>Next Run</span>
          <span>Last Run</span>
          <span />
        </div>

        {tasks.map((task, i) => (
          <TaskRow key={task.name} task={task} isLast={i === tasks.length - 1} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  isLast,
}: {
  task: (typeof tasks)[number];
  isLast: boolean;
}) {
  const statusConfig = {
    active: {
      icon: CheckCircle2,
      color: "text-green-500 bg-green-50",
      label: "Active",
    },
    running: {
      icon: RotateCcw,
      color: "text-bethune-warm bg-bethune-warm/10",
      label: "Running",
    },
    paused: {
      icon: Pause,
      color: "text-yellow-600 bg-yellow-50",
      label: "Paused",
    },
    disabled: {
      icon: Clock,
      color: "text-bethune-muted bg-bethune-cream",
      label: "Disabled",
    },
  };

  const config = statusConfig[task.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-bethune-cream/30 lg:grid lg:grid-cols-[1fr_140px_180px_140px_48px] lg:items-center lg:gap-4 ${
        !isLast ? "border-b border-bethune-black/5" : ""
      }`}
    >
      {/* Task info */}
      <div>
        <p className="text-sm font-semibold text-bethune-black">{task.name}</p>
        <p className="mt-0.5 text-xs text-bethune-muted">
          {task.robot} · {task.schedule}
        </p>
      </div>

      {/* Status */}
      <div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
        >
          <StatusIcon
            className={`size-3 ${task.status === "running" ? "animate-spin" : ""}`}
          />
          {config.label}
        </span>
      </div>

      {/* Next run */}
      <p className="text-sm text-bethune-gray">{task.nextRun}</p>

      {/* Last run */}
      <p className="text-xs text-bethune-muted">{task.lastRun}</p>

      {/* Actions */}
      <button className="flex size-8 items-center justify-center rounded-lg text-bethune-muted transition-colors hover:bg-bethune-cream hover:text-bethune-black">
        <MoreHorizontal className="size-4" />
      </button>
    </div>
  );
}
