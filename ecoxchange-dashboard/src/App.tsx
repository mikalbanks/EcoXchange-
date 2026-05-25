import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header.js";
import { Portfolio } from "./pages/Portfolio.js";
import { ProjectDetail } from "./pages/ProjectDetail.js";
import { VerificationDetail } from "./pages/VerificationDetail.js";

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route
              path="/project/:id/verification/:period"
              element={<VerificationDetail />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
