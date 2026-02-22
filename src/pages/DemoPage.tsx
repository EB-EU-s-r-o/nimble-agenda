import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  User, Shield, Crown, Copy, Check, Calendar, Users,
  BarChart3, Bell, Smartphone, Lock, Sparkles, QrCode, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import "@/styles/expanding-cards.css";

/* ── Data ── */

const demoAccounts = [
  {
    role: "Zákazník", icon: User,
    email: "demo@papihairdesign.sk", password: "PapiDemo2025!",
    badge: "bg-primary/20 text-primary border-primary/30",
    description: "Vidíte booking flow, históriu rezervácií a profil zákazníka",
    redirect: "/booking",
  },
  {
    role: "Majiteľ / Admin", icon: Shield,
    email: "owner@papihairdesign.sk", password: "PapiDemo2025!",
    badge: "bg-accent text-accent-foreground border-border",
    description: "Spravujete kalendár, zamestnancov, služby a štatistiky",
    redirect: "/admin",
  },
  {
    role: "Superadmin", icon: Crown,
    email: "larsenevans@proton.me", password: null,
    badge: "bg-primary/15 text-primary border-primary/25",
    description: "Plný prístup k systému, multi-business správa",
    redirect: "/admin",
  },
];

const steps = [
  { num: "1", title: "Rezervácia", desc: "Zákazník si otvorí /booking a vyberie termín" },
  { num: "2", title: "Notifikácia", desc: "Salón dostane notifikáciu, termín sa zapíše do kalendára" },
  { num: "3", title: "Správa", desc: "Admin spravuje všetko z dashboardu v reálnom čase" },
];

const features = [
  { icon: Calendar, title: "Online rezervácie 24/7", desc: "Zákazníci si rezervujú kedykoľvek" },
  { icon: Users, title: "Správa zamestnancov", desc: "Rozvrhy, služby, profily" },
  { icon: BarChart3, title: "Štatistiky a prehľady", desc: "Dáta o výkonnosti salónu" },
  { icon: Bell, title: "Automatické notifikácie", desc: "E-mail pripomienky pre zákazníkov" },
  { icon: Smartphone, title: "PWA – funguje ako app", desc: "Inštalácia na telefón jedným kliknutím" },
  { icon: Lock, title: "Bezpečné a spoľahlivé", desc: "RLS politiky, šifrované dáta" },
];

const cards = [
  { id: "hero", label: "PAPI", sub: "Hair Design", Icon: Sparkles },
  { id: "accounts", label: "Demo", sub: "Účty", Icon: User },
  { id: "how", label: "Ako", sub: "Funguje", Icon: Zap },
  { id: "features", label: "Funkcie", sub: "Systému", Icon: Calendar },
  { id: "qr", label: "QR", sub: "Kód", Icon: QrCode },
];

/* ── Helpers ── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 p-1 rounded hover:bg-primary/10 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

const contentAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.15 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* ── Card Content Components ── */

function HeroContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <LogoIcon size="lg" />
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        Rezervačný systém<br />
        <span className="text-primary">pre moderné salóny</span>
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Vyskúšajte PAPI booking system naživo – žiadna registrácia
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={() => navigate("/booking")}>
          Rezervovať termín →
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
          Prihlásiť sa
        </Button>
      </div>
    </div>
  );
}

function AccountsContent({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Demo účty</h2>
      {demoAccounts.map((acc) => (
        <div key={acc.email} className="rounded-xl border border-border/30 bg-card/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <acc.icon className="w-5 h-5 text-primary" />
            <Badge variant="outline" className={acc.badge}>{acc.role}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{acc.description}</p>
          <div className="text-xs space-y-1">
            <div className="flex items-center">
              <span className="text-muted-foreground w-12">Email:</span>
              <code className="text-foreground/80">{acc.email}</code>
              <CopyButton text={acc.email} />
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground w-12">Heslo:</span>
              {acc.password ? (
                <>
                  <code className="text-foreground/80">{acc.password}</code>
                  <CopyButton text={acc.password} />
                </>
              ) : (
                <span className="text-primary text-xs">Kontaktujte nás</span>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); navigate(`/auth?redirect=${acc.redirect}`); }}>
            Prihlásiť sa
          </Button>
        </div>
      ))}
    </div>
  );
}

function HowContent() {
  return (
    <div className="flex flex-col justify-center h-full gap-8">
      <h2 className="text-xl font-bold">Ako to funguje</h2>
      {steps.map((s) => (
        <div key={s.num} className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full border border-primary/30 bg-card/30 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {s.num}
          </div>
          <div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturesContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Funkcie</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f) => (
          <div key={f.title} className="flex gap-3 items-start rounded-lg border border-border/20 bg-card/20 p-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <f.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QrContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + "/booking")}&bgcolor=transparent&color=c8a864&format=svg`}
        alt="QR kód pre rezerváciu"
        className="w-32 h-32 rounded-lg"
        loading="lazy"
      />
      <h3 className="font-semibold text-lg">QR kód na stole</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Fyzický QR kód na stole – zákazník si rezervuje kým sedí v kresle
      </p>
    </div>
  );
}

/* ── Main Component ── */

export default function DemoPage() {
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();

  const contentMap: Record<string, React.ReactNode> = {
    hero: <HeroContent navigate={navigate} />,
    accounts: <AccountsContent navigate={navigate} />,
    how: <HowContent />,
    features: <FeaturesContent />,
    qr: <QrContent />,
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="expanding-cards">
        {cards.map((card, i) => {
          const isActive = activeCard === i;
          return (
            <div
              key={card.id}
              className={`expanding-cards__option ${isActive ? "expanding-cards__option--active" : ""}`}
              onClick={() => setActiveCard(i)}
            >
              {/* Collapsed label */}
              {!isActive && (
                <span className="expanding-cards__collapsed-label">{card.label}</span>
              )}

              {/* Shadow overlay */}
              <div className="expanding-cards__shadow" />

              {/* Bottom label */}
              <div className="expanding-cards__label">
                <div className="expanding-cards__label-icon">
                  <card.Icon className="w-5 h-5" />
                </div>
                <div className="expanding-cards__label-info">
                  <div className="expanding-cards__label-text expanding-cards__label-main">
                    {card.label}
                  </div>
                  <div className="expanding-cards__label-text expanding-cards__label-sub">
                    {card.sub}
                  </div>
                </div>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={card.id}
                    className="expanding-cards__content"
                    {...contentAnim}
                  >
                    {contentMap[card.id]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center text-muted-foreground text-xs opacity-50">
        Vyvinuté s ❤️ pre slovenské salóny
      </div>
    </div>
  );
}
