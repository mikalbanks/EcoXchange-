import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { AuthProvider } from "./context/AuthContext.js";
import { DemoProvider } from "./context/DemoContext.js";
import { DataProvider } from "./context/DataContext.js";
import { ComplianceProvider } from "./compliance/ComplianceProvider.js";
import { complianceMode, counselApproved } from "./compliance/config/complianceMode.js";
import "./index.css";

// Startup guard: live compliance mode requires explicit securities-counsel
// sign-off. Refuse to render rather than ship unreviewed offering language.
if (complianceMode === "live" && !counselApproved) {
  throw new Error(
    "FATAL: Cannot start in live compliance mode without VITE_COUNSEL_APPROVED=true. " +
      "Live mode requires securities counsel review of all banner and disclaimer text. " +
      "Set VITE_COMPLIANCE_MODE=demo or VITE_COMPLIANCE_MODE=preview instead.",
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ComplianceProvider>
      <AuthProvider>
        <DemoProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </DemoProvider>
      </AuthProvider>
    </ComplianceProvider>
  </React.StrictMode>,
);
