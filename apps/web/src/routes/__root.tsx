import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProvider } from "convex/react";
import { useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { OfflineGate } from "@/components/offline-screen";
import appCss from "@/app.css?url";

interface RouterContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bethune — Home Robot Orchestration" },
      {
        name: "description",
        content:
          "The command center for your home robots. Orchestrate, automate, and control — from anywhere.",
      },
      { name: "theme-color", content: "#3D3127" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.svg" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <ConvexProvider client={context.convexQueryClient.convexClient}>
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body>
          <OfflineGate>
            <Outlet />
          </OfflineGate>
          <Scripts />
        </body>
      </html>
    </ConvexProvider>
  );
}
