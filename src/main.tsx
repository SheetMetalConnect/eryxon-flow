import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initNativeShell } from "./native";
import { registerServiceWorker } from "./registerServiceWorker";

void initNativeShell();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
