import { useEffect, useState } from "react";
import { installAutoSync, runSync } from "@/lib/offline/sync";
import { getDB } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

interface OfflineBannerProps {
  onConflictsClick?: () => void;
}

export function OfflineBanner({ onConflictsClick }: OfflineBannerProps = {}) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const update = async () => {
      setOnline(navigator.onLine);
      try {
        const db = await getDB();
        const allQueue = await db.getAllFromIndex("queue", "status");
        const p = allQueue.filter((i: any) => ["pending", "failed", "processing"].includes(i.status)).length;
        const c = allQueue.filter((i: any) => i.status === "conflict").length;
        setPending(p);
        setConflicts(c);
      } catch {
        setPending(0);
        setConflicts(0);
      }
    };

    update();
    const handler = () => update();
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);

    const unsub = installAutoSync();
    const t = setInterval(update, 2000);

    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
      unsub?.();
      clearInterval(t);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm">
      {online ? (
        <Wifi className="w-4 h-4 text-primary" />
      ) : (
        <WifiOff className="w-4 h-4 text-destructive" />
      )}

      <span className="font-medium">
        {online ? "Online" : "Offline"}
      </span>

      {pending > 0 && (
        <Badge variant="secondary" className="text-xs">
          {pending} čaká
        </Badge>
      )}

      {conflicts > 0 && (
        <Badge
          variant="destructive"
          className="text-xs gap-1 cursor-pointer"
          onClick={onConflictsClick}
        >
          <AlertTriangle className="w-3 h-3" />
          {conflicts} konflikt{conflicts > 1 ? "y" : ""}
        </Badge>
      )}

      {pending === 0 && conflicts === 0 && online && (
        <span className="text-xs text-muted-foreground">Synchronizované</span>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 ml-auto"
        onClick={handleSync}
        disabled={syncing || !online}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
