import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { LogoIcon } from "@/components/LogoIcon";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-4">
        <LogoIcon size="lg" className="mx-auto" />
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">Stránka nebola nájdená</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Späť na úvod
        </a>
      </div>
    </div>
  );
};

export default NotFound;
