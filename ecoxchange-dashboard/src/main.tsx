import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { AuthProvider } from "./context/AuthContext.js";
import { DemoProvider } from "./context/DemoContext.js";
import { DataProvider } from "./context/DataContext.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <DemoProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </DemoProvider>
    </AuthProvider>
  </React.StrictMode>,
);
