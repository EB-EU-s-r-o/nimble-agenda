import { motion } from "framer-motion";
import { User, Shield, Crown, Copy, Check, Calendar, Users, BarChart3, Bell, Smartphone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const demoAccounts = [
  {
    role: "Zákazník",
    icon: User,
    email: "demo@papihairdesign.sk",
    password: "PapiDemo2025!",
    badge: "bg-primary/20 text-primary border-primary/30",
    description: "Vidíte booking flow, históriu rezervácií a profil zákazníka",
    redirect: "/booking",
  },
  {
    role: "Majiteľ / Admin",
    icon: Shield,
    email: "owner@papihairdesign.sk",
    password: "PapiDemo2025!",
    badge: "bg-accent text-accent-foreground border-border",
    description: "Spravujete kalendár, zamestnancov, služby a štatistiky",
    redirect: "/admin",
  },
  {
    role: "Superadmin",
    icon: Crown,
    email: "larsenevans@proton.me",
    password: null,
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 p-1 rounded hover:bg-primary/10 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function DemoPage() {
  const navigate = useNavigate();

  return (
    <div className="liquid-glass-bg min-h-screen text-foreground relative overflow-hidden">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:py-20">

        {/* HERO */}
        <motion.section variants={container} initial="hidden" animate="show" className="text-center mb-20">
          <motion.div variants={item} className="flex justify-center mb-6">
            <LogoIcon size="lg" />
          </motion.div>
          <motion.h1 variants={item} className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
            Rezervačný systém<br />
            <span className="text-primary">pre moderné salóny</span>
          </motion.h1>
          <motion.p variants={item} className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Vyskúšajte PAPI booking system naživo – žiadna registrácia
          </motion.p>
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => document.getElementById("demo-accounts")?.scrollIntoView({ behavior: "smooth" })}>
              Vyskúšať demo
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/booking")}>
              Rezervovať termín →
            </Button>
          </motion.div>
        </motion.section>

        {/* DEMO ACCOUNTS */}
        <motion.section id="demo-accounts" variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-24">
          <motion.h2 variants={item} className="text-2xl sm:text-3xl font-bold text-center mb-10">Demo účty</motion.h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {demoAccounts.map((acc) => (
              <motion.div
                key={acc.email}
                variants={item}
                className="liquid-window !relative !left-auto !top-auto"
                style={{ position: 'relative' }}
              >
                <div className="liquid-window__content !p-6 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <acc.icon className="w-6 h-6 text-primary" />
                    <Badge variant="outline" className={acc.badge}>{acc.role}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{acc.description}</p>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center">
                      <span className="text-muted-foreground w-14">Email:</span>
                      <code className="text-foreground/80 text-xs">{acc.email}</code>
                      <CopyButton text={acc.email} />
                    </div>
                    <div className="flex items-center">
                      <span className="text-muted-foreground w-14">Heslo:</span>
                      {acc.password ? (
                        <>
                          <code className="text-foreground/80 text-xs">{acc.password}</code>
                          <CopyButton text={acc.password} />
                        </>
                      ) : (
                        <span className="text-primary text-xs">Kontaktujte nás</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/auth?redirect=${acc.redirect}`)}
                  >
                    Prihlásiť sa
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* HOW IT WORKS */}
        <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-24">
          <motion.h2 variants={item} className="text-2xl sm:text-3xl font-bold text-center mb-12">Ako to funguje</motion.h2>
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-0 relative">
            <div className="hidden sm:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-primary/50 via-primary/20 to-primary/50" />
            {steps.map((s) => (
              <motion.div key={s.num} variants={item} className="flex-1 text-center relative">
                <div className="w-16 h-16 mx-auto rounded-full border border-primary/30 bg-card/50 backdrop-blur-md flex items-center justify-center text-xl font-bold text-primary mb-4 relative z-10">
                  {s.num}
                </div>
                <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* FEATURES */}
        <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-24">
          <motion.h2 variants={item} className="text-2xl sm:text-3xl font-bold text-center mb-10">Funkcie</motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="rounded-xl border border-border bg-card/40 backdrop-blur-xl p-5 flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* QR CODE */}
        <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-24 text-center">
          <motion.div variants={item} className="inline-block rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-8">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + "/booking")}&bgcolor=transparent&color=c8a864&format=svg`}
              alt="QR kód pre rezerváciu"
              className="w-32 h-32 mx-auto mb-4 rounded-lg"
              loading="lazy"
            />
            <h3 className="font-semibold text-lg mb-2">QR kód na stole</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Fyzický QR kód na stole – zákazník si rezervuje kým sedí v kresle</p>
          </motion.div>
        </motion.section>

        {/* FOOTER */}
        <motion.footer variants={item} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-muted-foreground text-sm pb-8">
          Vyvinuté s ❤️ pre slovenské salóny
        </motion.footer>
      </div>
    </div>
  );
}
