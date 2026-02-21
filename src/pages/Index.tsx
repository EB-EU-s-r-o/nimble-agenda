import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MapPin, Phone, Mail } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background p-4 relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-3">
          <LogoIcon size="lg" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">PAPI HAIR DESIGN</h1>
        <p className="text-muted-foreground text-lg">Hair studio & Barber | Predaj vlasovej kozmetiky</p>
        <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Trieda SNP 61 (Spoločenský pavilón), Košice</span>
          <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> +421 949 459 624</span>
          <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> papihairdesign@gmail.com</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/booking">Rezervovať termín</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Prihlásiť sa</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
