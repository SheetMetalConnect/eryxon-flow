import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { getPlatform, initNativeShell, isNativeApp } from "@/native";

// Tag the document up-front so global CSS can branch on the runtime platform
// without waiting for React to mount. This drives the safe-area / overscroll
// rules in `mobile-ios.css` + `mobile.css`.
const docEl = document.documentElement;
docEl.dataset.platform = getPlatform();
if (isNativeApp()) {
  docEl.dataset.native = "true";
  document.body.dataset.native = "true";
}

// Boot the native shell (status bar, splash, keyboard, hardware back).
// No-op on the web, so it's safe to call unconditionally.
void initNativeShell();

createRoot(document.getElementById("root")!).render(<App />);
