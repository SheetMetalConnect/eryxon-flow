import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { unregisterAppServiceWorker } from "./lib/pwa";

if (import.meta.env.VITE_ENABLE_PWA !== "true") {
  void unregisterAppServiceWorker().catch((error: unknown) => {
    console.warn("Could not unregister the app service worker", error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
