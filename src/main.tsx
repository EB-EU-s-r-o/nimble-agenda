// App entry point
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/styles/booking-calendar.css";
import { initFirebaseAnalytics } from "@/integrations/firebase/config";

initFirebaseAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
