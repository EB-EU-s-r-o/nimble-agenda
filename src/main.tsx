// App entry point
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/styles/booking-calendar.css";
import { initFirebaseAnalytics } from "@/integrations/firebase/config";
import { ensureStorageAndServiceWorker } from "@/lib/indexed-db-available";

const rootEl = document.getElementById("root")!;
ensureStorageAndServiceWorker().then(async () => {
  await initFirebaseAnalytics();
  createRoot(rootEl).render(<App />);
});
