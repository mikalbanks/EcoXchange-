import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("A new version of EcoXchange is available. Reload to update?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("EcoXchange is ready for offline use.");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
