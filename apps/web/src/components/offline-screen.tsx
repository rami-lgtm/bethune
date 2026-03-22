import { useEffect, useState } from "react";
import { WifiOff, Settings, RefreshCw } from "lucide-react";

export function OfflineGate({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!isOnline) {
    return <OfflineScreen onRetry={() => setIsOnline(navigator.onLine)} />;
  }

  return <>{children}</>;
}

function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const openWifiSettings = () => {
    // Android deep-link to WiFi settings
    window.location.href = "intent:#Intent;action=android.settings.WIFI_SETTINGS;end";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bethune-cream px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-white shadow-sm">
          <WifiOff className="size-7 text-bethune-warm" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-bethune-black">
          No Internet Connection
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-bethune-gray">
          Bethune needs an internet connection to communicate with your robots.
          Please connect to WiFi to get started.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={openWifiSettings}
            className="flex items-center justify-center gap-2 rounded-xl bg-bethune-warm px-6 py-3.5 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Settings className="size-4" />
            Open WiFi Settings
          </button>

          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-xl border border-bethune-black/10 bg-white px-6 py-3.5 text-sm font-medium text-bethune-black transition-all hover:bg-bethune-cream active:scale-[0.98]"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
        </div>

        <p className="mt-6 text-xs text-bethune-muted">
          Make sure your tablet is connected to your home WiFi network.
        </p>
      </div>
    </div>
  );
}
