import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AccessControl from "./pages/AccessControl";
import VenueDetail from "./pages/VenueDetail";

// --- NOVOS IMPORTS DO PAINEL ---
import RestaurantLayout from "./components/RestaurantLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import KDS from "./pages/KDS";
import Cashier from "./pages/Cashier";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/access-control" element={<AccessControl />} />
          <Route path="/place/:id" element={<VenueDetail />} />

          {/* ESTRUTURA DO PAINEL ADMINISTRATIVO */}
          <Route path="/" element={<RestaurantLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="kds" element={<KDS />} />
            <Route path="tables" element={<Tables />} />
            <Route path="menu" element={<Menu />} />
            <Route path="settings" element={<Settings />} />
            <Route path="cashier" element={<Cashier />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;