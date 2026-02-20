import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Briefcase, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { sk } from "date-fns/locale";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Čaká", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Potvrdená", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Zrušená", className: "bg-red-100 text-red-800" },
  completed: { label: "Dokončená", className: "bg-slate-100 text-slate-700" },
};

export default function DashboardPage() {
  const { businessId } = useBusiness();
  const [stats, setStats] = useState({ today: 0, total: 0, employees: 0, services: 0 });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const today = new Date();
      const [apptRes, empRes, svcRes, todayRes] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact" }).eq("business_id", businessId).neq("status", "cancelled"),
        supabase.from("employees").select("id", { count: "exact" }).eq("business_id", businessId).eq("is_active", true),
        supabase.from("services").select("id", { count: "exact" }).eq("business_id", businessId).eq("is_active", true),
        supabase.from("appointments")
          .select("*, customers(full_name, email), services(name_sk), employees(display_name)")
          .eq("business_id", businessId)
          .gte("start_at", startOfDay(today).toISOString())
          .lte("start_at", endOfDay(today).toISOString())
          .order("start_at"),
      ]);

      setStats({
        today: todayRes.data?.length ?? 0,
        total: apptRes.count ?? 0,
        employees: empRes.count ?? 0,
        services: svcRes.count ?? 0,
      });
      setTodayAppointments(todayRes.data ?? []);
    };

    loadStats();
  }, [businessId]);

  const statCards = [
    { title: "Dnes", value: stats.today, icon: Calendar, color: "text-gold", bg: "bg-gold/10" },
    { title: "Celkovo rezervácií", value: stats.total, icon: TrendingUp, color: "text-gold", bg: "bg-gold/10" },
    { title: "Zamestnanci", value: stats.employees, icon: Users, color: "text-gold", bg: "bg-gold/10" },
    { title: "Služby", value: stats.services, icon: Briefcase, color: "text-gold", bg: "bg-gold/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prehľad</h1>
        <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: sk })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Dnešné rezervácie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Dnes nie sú žiadne rezervácie</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((appt) => {
                const status = STATUS_LABELS[appt.status] ?? STATUS_LABELS.pending;
                return (
                  <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="text-sm font-mono font-semibold text-foreground w-12 flex-shrink-0">
                      {format(new Date(appt.start_at), "HH:mm")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{appt.customers?.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{appt.services?.name_sk} · {appt.employees?.display_name}</p>
                    </div>
                    <Badge className={`text-xs ${status.className} border-0`}>{status.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
