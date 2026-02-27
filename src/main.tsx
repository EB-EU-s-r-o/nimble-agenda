// App entry point
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/styles/booking-calendar.css";
import { ensureStorageAndServiceWorker } from "@/lib/indexed-db-available";

const rootEl = document.getElementById("root")!;
ensureStorageAndServiceWorker().then(async () => {
  // Dynamic import avoids esbuild dep-scan timeout on the large firebase package
  const { initFirebaseAnalytics } = await import("@/integrations/firebase/config");
  await initFirebaseAnalytics();
  createRoot(rootEl).render(<App />);
});
