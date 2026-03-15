import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { LayoutDashboard, CalendarClock, Bot, Map, Radio } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const sidebarLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/dashboard/maps",
    label: "Manage Maps",
    icon: Map,
  },
  {
    to: "/dashboard/robots",
    label: "Manage Robots",
    icon: Bot,
  },
  {
    to: "/dashboard/sensors",
    label: "Manage Sensors",
    icon: Radio,
  },
  {
    to: "/dashboard/tasks",
    label: "Scheduled Tasks",
    icon: CalendarClock,
  },
] as const;

function DashboardLayout() {
  return (
    <div className="flex h-screen bg-bethune-cream">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-bethune-black/5 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center px-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-bethune-black"
          >
            Bethune
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {sidebarLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  activeOptions={{ exact: "exact" in link }}
                >
                  {({ isActive }) => (
                    <span
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-bethune-cream text-bethune-black"
                          : "text-bethune-gray hover:bg-bethune-cream hover:text-bethune-black"
                      }`}
                    >
                      <link.icon className="size-[18px]" />
                      {link.label}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="border-t border-bethune-black/5 p-4">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-bethune-warm/10 text-xs font-semibold text-bethune-warm">
              B
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-bethune-black">
                Bethune Home
              </p>
              <p className="truncate text-xs text-bethune-muted">3 robots online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
