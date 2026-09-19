
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AccessGate } from "./components/AccessGate";
import { MobileBottomNav } from "./components/MobileBottomNav";
import Admin from "./pages/Admin";
import AdminAuth from "./pages/AdminAuth";
import Forum from "./pages/Forum";
import TurfCoaching from "./pages/TurfCoaching";
import NotFound from "./pages/NotFound";
import WagueTurf from "./pages/WagueTurf";
import CoverGate from "./pages/CoverGate";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="pb-16 md:pb-0">
          <Routes>
            {/* Admin auth page */}
            <Route path="/admin/auth" element={<AdminAuth />} />
            {/* Admin page - protected by admin auth */}
            <Route path="/admin" element={<Admin />} />
            {/* Forum - protected by AccessGate */}
            <Route path="/forum" element={<AccessGate><Forum /></AccessGate>} />
            {/* Turf-Coaching - protected by AccessGate */}
            <Route path="/turf-coaching" element={<AccessGate><TurfCoaching /></AccessGate>} />
            {/* WAGUE-TURF - protected by AccessGate */}
            <Route path="/wague-turf" element={<AccessGate><WagueTurf /></AccessGate>} />
            {/* Main app - protected by AccessGate */}
            <Route path="/" element={<CoverGate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <MobileBottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


