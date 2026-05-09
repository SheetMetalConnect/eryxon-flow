import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initNativeShell } from "./native";

void initNativeShell();

createRoot(document.getElementById("root")!).render(<App />);
