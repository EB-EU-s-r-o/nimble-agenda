import { useEffect, useState } from "react";
import { LogoIcon } from "@/components/LogoIcon";
import { Button } from "@/components/ui/button";
import { Download, Share, CheckCircle2, Smartphone, Monitor, Wifi, WifiOff, Bell, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const features = [
    { icon: Zap, title: "Bleskovo rýchla", desc: "Natívny výkon bez čakania" },
    { icon: WifiOff, title: "Funguje offline", desc: "Recepcia aj bez internetu" },
    { icon: Bell, title: "Notifikácie", desc: "Upozornenia na nové rezervácie" },
    { icon: Smartphone, title: "Na domovskej obrazovke", desc: "Ako natívna aplikácia" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-primary/20 blur-2xl scale-125" />
            <div className="relative w-28 h-28 rounded-[2rem] border-2 border-primary/40 bg-card flex items-center justify-center shadow-2xl">
              <LogoIcon size="lg" />
            </div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-3xl font-bold text-center mb-2"
        >
          PAPI HAIR DESIGN
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-muted-foreground text-center max-w-xs mb-8"
        >
          Nainštaluj si aplikáciu pre najlepší zážitok z rezervácie
        </motion.p>

        {/* Install Button / Status */}
        <AnimatePresence mode="wait">
          {isInstalled ? (
            <motion.div
              key="installed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <p className="text-primary font-semibold text-lg">Aplikácia je nainštalovaná!</p>
              <a
                href="/"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Otvoriť aplikáciu
              </a>
            </motion.div>
          ) : deferredPrompt ? (
            <motion.div key="prompt" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Button
                size="lg"
                onClick={handleInstall}
                disabled={installing}
                className="gap-2 text-base px-8 py-6 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                <Download className={`w-5 h-5 ${installing ? "animate-bounce" : ""}`} />
                {installing ? "Inštalujem…" : "Nainštalovať aplikáciu"}
              </Button>
            </motion.div>
          ) : isIOS ? (
            <motion.div
              key="ios"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-4 max-w-xs"
            >
              <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
                <Share className="w-6 h-6 mx-auto text-primary" />
                <p className="text-sm font-medium">Návod pre iPhone / iPad:</p>
                <ol className="text-sm text-muted-foreground text-left space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    Klikni na tlačidlo <Share className="w-4 h-4 inline text-primary" /> <strong>Zdieľať</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    Vyber <strong>"Pridať na plochu"</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    Potvrď kliknutím na <strong>"Pridať"</strong>
                  </li>
                </ol>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="desktop"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2">
                <Monitor className="w-6 h-6 mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Otvor stránku v <strong>Chrome</strong> alebo <strong>Edge</strong> na mobile pre inštaláciu
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Grid */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3 mt-12 max-w-sm w-full"
        >
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-card/60 border border-border/50 rounded-xl p-4 text-center space-y-2"
            >
              <f.icon className="w-5 h-5 mx-auto text-primary" />
              <p className="text-sm font-medium">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        <a href="/booking" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Pokračovať bez inštalácie →
        </a>
      </div>
    </div>
  );
}
