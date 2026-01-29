import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth"; // <--- IMPORTANTE: Importar o AuthProvider

// Componente de Proteção
import { ProtectedRoute } from "./components/ProtectedRoute";

// Páginas Públicas
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AccessControl from "./pages/AccessControl";
import VenueDetail from "./pages/VenueDetail";
import PublicMenu from "./pages/public/PublicMenu";
import CourierApp from "./pages/public/CourierApp";

// Páginas Protegidas (Painel)
import RestaurantLayout from "./components/RestaurantLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import KDS from "./pages/KDS";
import Cashier from "./pages/Cashier";
import Inventory from "./pages/Inventory";
import Couriers from "./pages/Couriers";
import Operations from "./pages/Operations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* O AuthProvider deve envolver toda a aplicação para que o useAuth funcione */}
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* --- ROTAS PÚBLICAS (Acessíveis sem login) --- */}
            <Route path="/auth" element={<Auth />} />
            
            <Route path="/place/:id" element={<VenueDetail />} />

            {/* Menu e Tracking são públicos para o cliente final */}
            <Route path="/menu/:id" element={<PublicMenu />} />

            {/* App do Motoboy (Login separado interno) */}
            <Route path="/driver/:id" element={<CourierApp />} />


            {/* --- ROTAS PROTEGIDAS (Exigem Login) --- */}
            <Route element={<ProtectedRoute />}>

              {/* Estrutura do Painel Administrativo (Dono do Restaurante) */}
              <Route path="/" element={<RestaurantLayout />}>
                <Route index element={<Operations />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="kds" element={<KDS />} />
                <Route path="tables" element={<Tables />} />
                <Route path="menu" element={<Menu />} />
                <Route path="settings" element={<Settings />} />
                <Route path="cashier" element={<Cashier />} />
                <Route path="couriers" element={<Couriers />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="/access-control" element={<AccessControl />} />
              </Route>

            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;