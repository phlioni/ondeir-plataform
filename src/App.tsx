import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import VenueDetail from "./pages/VenueDetail";
import NotFound from "./pages/NotFound";
import AccessControl from "./pages/AccessControl";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />

          {/* Rota Raiz é o Dashboard. A própria página Dashboard verifica o login */}
          <Route path="/" element={<Dashboard />} />

          <Route path="/place/:id" element={<VenueDetail />} />
          <Route path="/access-control" element={<AccessControl />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;