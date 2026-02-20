import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-3">
          <LogoIcon size="lg" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">PAPI HAIR DESIGN</h1>
        <p className="text-muted-foreground text-lg">Profesionálny rezervačný systém pre salóny krásy</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/auth">Prihlásiť sa</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
