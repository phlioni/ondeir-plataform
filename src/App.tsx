import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async"; // <--- 1. IMPORTAÇÃO NOVA

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
import Tables from "./pages/Tables"; // Mantive importado caso use depois
import KDS from "./pages/KDS";
import Cashier from "./pages/Cashier"; // Mantive importado
import Inventory from "./pages/Inventory";
import Couriers from "./pages/Couriers";
import Operations from "./pages/Operations"; // Mantive importado
import Reviews from "./pages/Reviews";
import CounterHub from "./pages/CounterHub";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* 2. ENVOLVENDO A APLICAÇÃO COM O PROVEDOR DE SEO */}
      <HelmetProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* --- ROTAS PÚBLICAS (Acessíveis sem login) --- */}
              <Route path="/auth" element={<Auth />} />

              {/* DICA DE ESTRATEGISTA: Se quiser que a Landing Page seja a página principal do site (www.seusite.com.br), 
                  mude o path abaixo de "/landingpage" para "/" e mova a rota do painel para "/app" ou "/admin" */}
              <Route path="/landingpage" element={<LandingPage />} />

              <Route path="/place/:id" element={<VenueDetail />} />

              {/* Menu e Tracking são públicos para o cliente final */}
              <Route path="/menu/:id" element={<PublicMenu />} />

              {/* App do Motoboy (Login separado interno) */}
              <Route path="/driver/:id" element={<CourierApp />} />


              {/* --- ROTAS PROTEGIDAS (Exigem Login) --- */}
              <Route element={<ProtectedRoute />}>

                {/* Estrutura do Painel Administrativo (Dono do Restaurante) */}
                <Route path="/" element={<RestaurantLayout />}>

                  <Route path="dashboard" element={<Dashboard />} />
                  {/* <Route index element={<Orders />} /> */}
                  <Route path="kds" element={<KDS />} />
                  {/* <Route path="tables" element={<Tables />} /> */}
                  <Route path="menu" element={<Menu />} />
                  <Route index element={<CounterHub />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="settings" element={<Settings />} />
                  {/* <Route path="cashier" element={<Cashier />} /> */}
                  <Route path="couriers" element={<Couriers />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="/access-control" element={<AccessControl />} />
                </Route>

              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;