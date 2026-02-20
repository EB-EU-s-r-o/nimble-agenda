import { useEffect, useState } from "react";
import LiquidWindow from "@/components/LiquidWindow";
import { useWindowManager } from "@/lib/useWindowManager";
import { useBusinessInfo } from "@/hooks/useBusinessInfo";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, Clock, Phone, MapPin, Mail, Calendar, Star } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import "@/styles/liquid-glass.css";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const DAY_LABELS: Record<string, string> = {
  monday: "Pondelok", tuesday: "Utorok", wednesday: "Streda",
  thursday: "Štvrtok", friday: "Piatok", saturday: "Sobota", sunday: "Nedeľa",
};
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const MODE_LABELS: Record<string, string> = {
  open: "Otvorené", closed: "Zatvorené", on_request: "Podľa objednávok",
};

// Service category mapping
const CATEGORIES: { label: string; icon: string; match: (name: string) => boolean }[] = [
  { label: "Dámsky – Strih & Styling", icon: "✂️", match: (n) => /dámsky strih|fúkaná|finálny styling/i.test(n) },
  { label: "Dámsky – Farbenie", icon: "🎨", match: (n) => /farben|kompletné farb/i.test(n) },
  { label: "Dámsky – Balayage & Melír", icon: "🌟", match: (n) => /balayage|melír/i.test(n) },
  { label: "Dámsky – Regenerácia", icon: "💎", match: (n) => /gumovanie|sťahovanie|methamorphyc|keratín/i.test(n) },
  { label: "Dámsky – Predlžovanie & Účesy", icon: "👑", match: (n) => /tape-in|vrkôč|spoločenský/i.test(n) },
  { label: "Pánsky – Vlasy", icon: "💈", match: (n) => /junior|pánsky strih/i.test(n) },
  { label: "Pánsky – Brada & Kombinácie", icon: "🧔", match: (n) => /brad[ay]|kombinácia|špeciál/i.test(n) },
  { label: "Pánsky – Farbenie", icon: "🖌️", match: (n) => /trvalá|zosvetlenie|farbenie brady|tónovanie/i.test(n) },
  { label: "Doplnkové služby", icon: "✨", match: (n) => /depilác|sviečk|maska/i.test(n) },
];

function categorizeServices(services: any[]) {
  const groups: { label: string; icon: string; items: any[] }[] = [];
  for (const cat of CATEGORIES) {
    const items = services.filter((s) => cat.match(s.name_sk));
    if (items.length) groups.push({ label: cat.label, icon: cat.icon, items });
  }
  // uncategorized
  const matched = groups.flatMap((g) => g.items.map((i) => i.id));
  const rest = services.filter((s) => !matched.includes(s.id));
  if (rest.length) groups.push({ label: "Ostatné", icon: "📋", items: rest });
  return groups;
}

const DEFAULTS: Record<string, { x: number; y: number }> = {
  hero: { x: 40, y: 30 },
  hours: { x: 40, y: 280 },
  prices: { x: 380, y: 30 },
  booking: { x: 380, y: 500 },
  contact: { x: 40, y: 540 },
};

const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  hero: { w: 320, h: 220 },
  hours: { w: 300, h: 240 },
  prices: { w: 420, h: 450 },
  booking: { w: 320, h: 200 },
  contact: { w: 320, h: 200 },
};

export default function LiquidPlayground() {
  const { positions, bringToFront, updatePosition, updateSize, getSiblingRects } =
    useWindowManager(DEFAULTS);
  const { info, openStatus, nextOpening } = useBusinessInfo(DEMO_BUSINESS_ID);
  const [services, setServices] = useState<any[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase
      .from("services")
      .select("*")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("is_active", true)
      .order("name_sk")
      .then(({ data }) => setServices(data ?? []));
  }, []);

  const groups = categorizeServices(services);
  const hoursByDay = info
    ? DAY_ORDER.map((day) => {
        const entries = info.hours.filter((h) => h.day_of_week === day);
        if (!entries.length) return { day, mode: "closed" as const, time: "" };
        const mode = entries[0].mode;
        return {
          day,
          mode,
          time: mode === "open" ? entries.map((e) => `${e.start_time.slice(0, 5)} – ${e.end_time.slice(0, 5)}`).join(", ") : "",
        };
      })
    : [];

  return (
    <div className={`liquid-glass-bg relative overflow-hidden${isMobile ? " liquid-glass-bg--mobile flex flex-col" : ""}`}>
      {/* ── Hero / Brand ── */}
      <LiquidWindow
        id="hero"
        title="PAPI HAIR DESIGN"
        width={DEFAULT_SIZES.hero.w}
        {...positions.hero}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
        onResizeEnd={updateSize}
        siblings={getSiblingRects("hero", DEFAULT_SIZES)}
      >
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="text-center">
            <h1 className="text-lg font-bold tracking-widest glass-text-strong">
              PAPI <span className="italic font-light tracking-normal">Hair</span> DESIGN
            </h1>
            <p className="text-[10px] mt-1 glass-text-faint tracking-wider uppercase">
              est. 2018 · Košice
            </p>
            <p className="text-xs mt-2 text-gold font-medium">
              Ambasádor GOLD Haircare Slovakia
            </p>
          </div>
          {openStatus && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              openStatus.is_open
                ? "bg-green-900/40 text-green-400"
                : openStatus.mode === "on_request"
                  ? "bg-amber-900/40 text-amber-400"
                  : "bg-red-900/40 text-red-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                openStatus.is_open ? "bg-green-500" : openStatus.mode === "on_request" ? "bg-amber-500" : "bg-red-500"
              }`} />
              {MODE_LABELS[openStatus.mode]}
            </div>
          )}
        </div>
      </LiquidWindow>

      {/* ── Otváracie hodiny ── */}
      <LiquidWindow
        id="hours"
        title="🕐 Otváracie hodiny"
        width={DEFAULT_SIZES.hours.w}
        {...positions.hours}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
        onResizeEnd={updateSize}
        siblings={getSiblingRects("hours", DEFAULT_SIZES)}
      >
        {info ? (
          <div className="space-y-1.5">
            {hoursByDay.map(({ day, mode, time }) => (
              <div key={day} className="flex items-center justify-between text-xs">
                <span className="font-medium glass-text-muted">
                  {DAY_LABELS[day]}
                </span>
                <span
                  className="font-medium"
                  style={{
                    color: mode === "closed" ? "var(--glass-closed, rgba(255,100,100,0.7))" : mode === "on_request" ? "var(--glass-request, rgba(218,165,32,0.8))" : "inherit",
                  }}
                >
                  {mode === "closed" ? "Zatvorené" : mode === "on_request" ? "Podľa objednávok" : time}
                </span>
              </div>
            ))}
            {!openStatus?.is_open && nextOpening && (
              <p className="text-[10px] mt-2 text-center glass-text-faint">
                Najbližšie otvárame: {nextOpening.time.slice(0, 5)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs glass-text-faint">Načítavam...</p>
        )}
      </LiquidWindow>

      {/* ── Cenník ── */}
      <LiquidWindow
        id="prices"
        title="💰 Cenník služieb"
        width={DEFAULT_SIZES.prices.w}
        height={DEFAULT_SIZES.prices.h}
        {...positions.prices}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
        onResizeEnd={updateSize}
        siblings={getSiblingRects("prices", DEFAULT_SIZES)}
      >
        {groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.label}>
                <h3 className="text-xs font-bold mb-1 flex items-center gap-1 text-gold">
                  <span>{g.icon}</span> {g.label}
                </h3>
                <div className="space-y-0.5">
                  {g.items.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between text-xs px-1">
                      <span className="glass-text-muted">{svc.name_sk}</span>
                      <span className="font-semibold tabular-nums glass-text-strong">
                        {svc.price != null ? `${Number(svc.price).toFixed(0)} €` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[10px] italic text-center mt-2 glass-text-faint">
              Ceny sú orientačné – závisia od dĺžky a hustoty vlasov.
            </p>
          </div>
        ) : (
          <p className="text-xs glass-text-faint">Načítavam cenník...</p>
        )}
      </LiquidWindow>

      {/* ── Rezervácia ── */}
      <LiquidWindow
        id="booking"
        title="📅 Rezervácia"
        width={DEFAULT_SIZES.booking.w}
        {...positions.booking}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
        onResizeEnd={updateSize}
        siblings={getSiblingRects("booking", DEFAULT_SIZES)}
      >
        <div className="flex flex-col items-center gap-3 py-2">
          <Calendar className="w-8 h-8 text-gold" />
          <p className="text-xs text-center glass-text-muted">
            Rezervujte si termín online – vyberte službu, zamestnanca a čas.
          </p>
          <Link
            to="/booking"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
            style={{ background: "linear-gradient(135deg, #b8860b, #daa520)" }}
          >
            <Calendar className="w-4 h-4" />
            Rezervovať termín
          </Link>
          <p className="text-[10px] italic text-center glass-text-faint">
            Rezervácie k Róbertovi "PAPI" – konzultácia na tel. č. nižšie
          </p>
        </div>
      </LiquidWindow>

      {/* ── Kontakt ── */}
      <LiquidWindow
        id="contact"
        title="📞 Kontakt"
        width={DEFAULT_SIZES.contact.w}
        {...positions.contact}
        onDragStart={bringToFront}
        onDragEnd={updatePosition}
        onResizeEnd={updateSize}
        siblings={getSiblingRects("contact", DEFAULT_SIZES)}
      >
        <div className="space-y-2 py-1">
          <div className="flex items-center gap-2 text-xs glass-text-muted">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gold" />
            <span>Trieda SNP 61 (Spoločenský pavilón), Košice</span>
          </div>
          <a href="tel:+421949459624" className="flex items-center gap-2 text-xs glass-text-muted hover:opacity-100 hover:underline">
            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gold" />
            <span>+421 949 459 624</span>
          </a>
          <a href="mailto:papihairdesign@gmail.com" className="flex items-center gap-2 text-xs glass-text-muted hover:opacity-100 hover:underline">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gold" />
            <span>papihairdesign@gmail.com</span>
          </a>
          <div className="flex items-center gap-2 text-xs glass-text-muted">
            <Star className="w-3.5 h-3.5 flex-shrink-0 text-gold" />
            <span>Prémiové produkty Gold Haircare</span>
          </div>
        </div>
      </LiquidWindow>

      <div className="liquid-attr flex items-center gap-3">
        <ThemeToggle />
        <span>© 2026 PAPI HAIR DESIGN</span>
      </div>
    </div>
  );
}
