import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useOnboarding } from "@/hooks/useOnboarding";
import OnboardingWizard from "@/components/OnboardingWizard";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Calendar, BookOpen, Users, Briefcase, UserCheck,
  Settings, LogOut, Scissors, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const allNavItems = [
  { title: "Prehľad", url: "/admin", icon: LayoutDashboard, roles: ["owner", "admin", "employee"] },
  { title: "Kalendár", url: "/admin/calendar", icon: Calendar, roles: ["owner", "admin"] },
  { title: "Môj rozvrh", url: "/admin/my", icon: Calendar, roles: ["employee"] },
  { title: "Rezervácie", url: "/admin/appointments", icon: BookOpen, roles: ["owner", "admin", "employee"] },
  { title: "Zamestnanci", url: "/admin/employees", icon: Users, roles: ["owner", "admin"] },
  { title: "Služby", url: "/admin/services", icon: Briefcase, roles: ["owner", "admin"] },
  { title: "Zákazníci", url: "/admin/customers", icon: UserCheck, roles: ["owner", "admin"] },
  { title: "Nastavenia", url: "/admin/settings", icon: Settings, roles: ["owner", "admin"] },
];

export function AdminSidebar() {
  const { profile, signOut } = useAuth();
  const { role } = useBusiness();
  const navigate = useNavigate();

  const navItems = allNavItems.filter((item) => !role || item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    toast.success("Boli ste odhlásení");
    navigate("/auth");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Sidebar className="border-r-0">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Scissors className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">Papi Hair</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{role ?? "hosť"}</p>
        </div>
      </div>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider px-4 py-2">
            Navigácia
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name ?? "Používateľ"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Odhlásiť sa
        </Button>
        <a
          href="/booking"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 mt-1 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors rounded"
        >
          <ChevronRight className="w-3 h-3" />
          Online rezervácia
        </a>
      </div>
    </Sidebar>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { needsOnboarding, loading: onboardingLoading, markComplete } = useOnboarding();

  if (onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingWizard onComplete={markComplete} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 bg-background sticky top-0 z-10">
            <SidebarTrigger className="mr-3" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
