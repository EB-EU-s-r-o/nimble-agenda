import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Clock, Euro, Calendar, Phone,
  MapPin, Mail, Star, Check, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBusinessInfo } from "@/hooks/useBusinessInfo";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/expanding-cards.css";

import cardBgHero from "@/assets/card-bg-hero.jpg";
import cardBgHow from "@/assets/card-bg-how.jpg";
import cardBgFeatures from "@/assets/card-bg-features.jpg";
import cardBgQr from "@/assets/card-bg-qr.jpg";
import cardBgAccounts from "@/assets/card-bg-accounts.jpg";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const DAY_LABELS: Record<string, string> = {
  monday: "Po", tuesday: "Ut", wednesday: "St",
  thursday: "Št", friday: "Pi", saturday: "So", sunday: "Ne",
};
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const CATEGORIES: { label: string; icon: string; match: (name: string) => boolean }[] = [
  { label: "Dámsky – Strih & Styling", icon: "✂️", match: (n) => /dámsky strih|fúkaná|finálny styling/i.test(n) },
  { label: "Dámsky – Farbenie", icon: "🎨", match: (n) => /farben|kompletné farb/i.test(n) },
  { label: "Dámsky – Balayage & Melír", icon: "🌟", match: (n) => /balayage|melír/i.test(n) },
  { label: "Dámsky – Regenerácia", icon: "💎", match: (n) => /gumovanie|sťahovanie|methamorphyc|keratín/i.test(n) },
  { label: "Dámsky – Predlžovanie", icon: "👑", match: (n) => /tape-in|vrkôč|spoločenský/i.test(n) },
  { label: "Pánsky – Vlasy", icon: "💈", match: (n) => /junior|pánsky strih/i.test(n) },
  { label: "Pánsky – Brada", icon: "🧔", match: (n) => /brad[ay]|kombinácia|špeciál/i.test(n) },
  { label: "Pánsky – Farbenie", icon: "🖌️", match: (n) => /trvalá|zosvetlenie|farbenie brady|tónovanie/i.test(n) },
  { label: "Doplnkové služby", icon: "✨", match: (n) => /depilác|sviečk|maska/i.test(n) },
];

function categorizeServices(services: any[]) {
  const groups: { label: string; icon: string; items: any[] }[] = [];
  for (const cat of CATEGORIES) {
    const items = services.filter((s) => cat.match(s.name_sk));
    if (items.length) groups.push({ label: cat.label, icon: cat.icon, items });
  }
  const matched = groups.flatMap((g) => g.items.map((i) => i.id));
  const rest = services.filter((s) => !matched.includes(s.id));
  if (rest.length) groups.push({ label: "Ostatné", icon: "📋", items: rest });
  return groups;
}

const cardBgs: Record<string, string> = {
  brand: cardBgHero,
  hours: cardBgHow,
  prices: cardBgFeatures,
  booking: cardBgQr,
  contact: cardBgAccounts,
};

const cards = [
  { id: "brand",   label: "PAPI",       sub: "Hair Design", Icon: Sparkles },
  { id: "hours",   label: "Hodiny",     sub: "Prevádzky",   Icon: Clock    },
  { id: "prices",  label: "Cenník",     sub: "Služieb",     Icon: Euro     },
  { id: "booking", label: "Rezervácia", sub: "Online",      Icon: Calendar },
  { id: "contact", label: "Kontakt",    sub: "Košice",      Icon: Phone    },
];

const contentAnim = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.35, ease: "easeIn" } },
};

/* ── Card content components ── */

function BrandContent({ openStatus, navigate }: { openStatus: any; navigate: ReturnType<typeof useNavigate> }) {
  const modeColors: Record<string, string> = {
    open:       "bg-green-500/15 text-green-400 border-green-500/30",
    closed:     "bg-red-500/15 text-red-400 border-red-500/30",
    on_request: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const modeLabels: Record<string, string> = {
    open: "Otvorené", closed: "Zatvorené", on_request: "Podľa objednávok",
  };
  const dotColors: Record<string, string> = {
    open: "bg-green-500", closed: "bg-red-500", on_request: "bg-amber-500",
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
      <LogoIcon size="lg" />
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          PAPI <span className="italic font-light">Hair</span> DESIGN
        </h1>
        <p className="text-xs mt-1 text-muted-foreground tracking-widest uppercase">
          est. 2018 · Košice
        </p>
        <p className="text-sm mt-2 text-amber-400 font-medium">
          Ambasádor GOLD Haircare Slovakia
        </p>
      </div>
      {openStatus && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${modeColors[openStatus.mode] ?? modeColors.closed}`}>
          <span className={`w-2 h-2 rounded-full ${dotColors[openStatus.mode] ?? dotColors.closed}`} />
          {modeLabels[openStatus.mode] ?? "Zatvorené"}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
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

function HoursContent({ info, openStatus, nextOpening }: { info: any; openStatus: any; nextOpening: any }) {
  if (!info) return <p className="text-sm text-muted-foreground">Načítavam...</p>;

  const hoursByDay = DAY_ORDER.map((day) => {
    const entries = info.hours.filter((h: any) => h.day_of_week === day);
    if (!entries.length) return { day, mode: "closed", time: "" };
    const mode = entries[0].mode;
    return {
      day, mode,
      time: mode === "open"
        ? entries.map((e: any) => `${e.start_time.slice(0, 5)} – ${e.end_time.slice(0, 5)}`).join(", ")
        : "",
    };
  });

  return (
    <div className="flex flex-col justify-center h-full gap-2">
      <h2 className="text-xl font-bold mb-2">Otváracie hodiny</h2>
      {hoursByDay.map(({ day, mode, time }) => (
        <div key={day} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
          <span className="font-medium text-muted-foreground w-8">{DAY_LABELS[day]}</span>
          <span className={
            mode === "closed"     ? "text-red-400"   :
            mode === "on_request" ? "text-amber-400" : "text-foreground"
          }>
            {mode === "closed"     ? "Zatvorené"            :
             mode === "on_request" ? "Podľa objednávok"     : time}
          </span>
        </div>
      ))}
      {openStatus && !openStatus.is_open && nextOpening && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Najbližšie otvárame: <span className="text-amber-400 font-medium">{nextOpening.time?.slice(0, 5)}</span>
        </p>
      )}
    </div>
  );
}

function PricesContent({ services }: { services: any[] }) {
  const groups = categorizeServices(services);
  if (!groups.length) return <p className="text-sm text-muted-foreground">Načítavam cenník...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Cenník služieb</h2>
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-amber-400">
            <span>{g.icon}</span> {g.label}
          </h3>
          <div className="space-y-1">
            {g.items.map((svc) => (
              <div key={svc.id} className="flex items-center justify-between text-xs px-1">
                <span className="text-muted-foreground">{svc.name_sk}</span>
                <span className="font-semibold tabular-nums">
                  {svc.price != null ? `${Number(svc.price).toFixed(0)} €` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[10px] italic text-center text-muted-foreground mt-2">
        Ceny sú orientačné – závisia od dĺžky a hustoty vlasov.
      </p>
    </div>
  );
}

function BookingContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
      <Calendar className="w-12 h-12 text-amber-400" />
      <div>
        <h2 className="text-2xl font-bold">Online rezervácia</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Rezervujte si termín kedykoľvek – vyberte službu, zamestnanca a čas.
        </p>
      </div>
      <Link
        to="/booking"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-black shadow-lg transition-all hover:scale-105 hover:shadow-amber-500/30"
        style={{ background: "linear-gradient(135deg, #b8860b, #daa520)" }}
      >
        <Calendar className="w-4 h-4" />
        Rezervovať termín
      </Link>
      <div className="mt-2">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.origin + "/booking")}&bgcolor=transparent&color=daa520&format=svg`}
          alt="QR kód"
          className="w-28 h-28 rounded-lg opacity-80"
          loading="lazy"
        />
        <p className="text-xs text-muted-foreground mt-2">Naskenujte a rezervujte</p>
      </div>
    </div>
  );
}

function ContactContent() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col justify-center h-full gap-5">
      <h2 className="text-xl font-bold">Kontakt</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Trieda SNP 61</p>
            <p className="text-xs text-muted-foreground">Spoločenský pavilón, Košice</p>
          </div>
        </div>
        <button
          onClick={() => copy("+421949459624", "phone")}
          className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
        >
          <Phone className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">+421 949 459 624</p>
            <p className="text-xs text-muted-foreground">Volajte alebo WhatsApp</p>
          </div>
          {copied === "phone" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground/50" />}
        </button>
        <button
          onClick={() => copy("papihairdesign@gmail.com", "email")}
          className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
        >
          <Mail className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">papihairdesign@gmail.com</p>
            <p className="text-xs text-muted-foreground">Napíšte nám</p>
          </div>
          {copied === "email" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground/50" />}
        </button>
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium">Gold Haircare Slovakia</p>
            <p className="text-xs text-muted-foreground">Prémiové produkty</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */

export default function LiquidPlayground() {
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();
  const { info, openStatus, nextOpening } = useBusinessInfo(DEMO_BUSINESS_ID);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("services")
      .select("*")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("is_active", true)
      .order("name_sk")
      .then(({ data }) => setServices(data ?? []));
  }, []);

  const contentMap: Record<string, React.ReactNode> = {
    brand:   <BrandContent openStatus={openStatus} navigate={navigate} />,
    hours:   <HoursContent info={info} openStatus={openStatus} nextOpening={nextOpening} />,
    prices:  <PricesContent services={services} />,
    booking: <BookingContent />,
    contact: <ContactContent />,
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden">
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
              <div
                className="expanding-cards__bg"
                style={{ backgroundImage: `url(${cardBgs[card.id]})` }}
              />

              {!isActive && (
                <span className="expanding-cards__collapsed-label">{card.label}</span>
              )}

              <div className="expanding-cards__shadow" />

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

      <div className="fixed bottom-4 left-0 right-0 text-center text-muted-foreground text-xs opacity-40 pointer-events-none">
        © 2026 PAPI HAIR DESIGN · Košice
      </div>
    </div>
  );
}
