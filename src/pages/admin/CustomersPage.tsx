import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("customers")
        .select("*, appointments(id, start_at, status)")
        .eq("business_id", businessId)
        .order("full_name");
      setCustomers(data ?? []);
      setLoading(false);
    };
    load();
  }, [businessId]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Zákazníci</h1>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 w-52" placeholder="Hľadať..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Žiadni zákazníci</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const appointments = c.appointments ?? [];
            const lastVisit = appointments.sort((a: any, b: any) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0];
            return (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-secondary-foreground font-semibold text-sm">
                    {c.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{appointments.length} návšt.</p>
                  {lastVisit && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(lastVisit.start_at), "d. M. yyyy", { locale: sk })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
