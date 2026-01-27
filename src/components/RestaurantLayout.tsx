import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Settings, LogOut, Store, Armchair, ChefHat, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { label: "Visão Geral", icon: LayoutDashboard, path: "/" },
        { label: "Caixa (PDV)", icon: DollarSign, path: "/cashier" }, // NOVO
        { label: "Pedidos", icon: ShoppingBag, path: "/orders" },
        { label: "Cozinha (KDS)", icon: ChefHat, path: "/kds" },
        { label: "Mesas", icon: Armchair, path: "/tables" },
        { label: "Cardápio", icon: UtensilsCrossed, path: "/menu" },
        { label: "Configurações", icon: Settings, path: "/settings" },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-20">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                        <Store className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg text-gray-800 tracking-tight">Gestor Pro</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Button
                                key={item.path}
                                variant={isActive ? "secondary" : "ghost"}
                                className={`w-full justify-start gap-3 h-12 font-medium ${isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-gray-500 hover:text-gray-900"
                                    }`}
                                onClick={() => navigate(item.path)}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-400"}`} />
                                {item.label}
                            </Button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut className="w-5 h-5" /> Sair
                    </Button>
                </div>
            </aside>

            <main className="flex-1 md:ml-64 overflow-y-auto h-full">
                <div className="p-8 max-w-[1600px] mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}