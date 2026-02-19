import { Link } from "react-router-dom";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Scissors className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-foreground">Papi Hair Studio</h1>
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
