import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const updateSW = registerSW({
  onNeedRefresh() {
    // Always apply fresh assets so production users see latest UI updates.
    updateSW(true);
  },
  onOfflineReady() {
    console.log("EcoXchange is ready for offline use.");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
