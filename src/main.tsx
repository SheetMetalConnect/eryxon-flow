import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { getPlatform, isNative } from "@/lib/native";

// Tag the document up-front so global CSS can branch on the runtime platform
// without waiting for React to mount. This drives the safe-area / overscroll
// rules in `mobile-ios.css`.
const docEl = document.documentElement;
docEl.dataset.platform = getPlatform();
if (isNative()) {
  docEl.dataset.native = "true";
  document.body.dataset.native = "true";
}

createRoot(document.getElementById("root")!).render(<App />);
