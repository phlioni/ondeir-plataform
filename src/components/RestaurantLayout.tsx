import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard, ShoppingBag, UtensilsCrossed, Settings, Activity,
    LogOut, Store, Armchair, ChefHat, DollarSign, Package, Bike, Menu as MenuIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

export default function AppMenu() { // Renomeie para RestaurantLayout se for o caso
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);

    const menuItems = [
        { label: "Operação", icon: Activity, path: "/" },
        { label: "Visão Geral", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Caixa (PDV)", icon: DollarSign, path: "/cashier" },
        { label: "Pedidos", icon: ShoppingBag, path: "/orders" },
        { label: "Entregadores", icon: Bike, path: "/couriers" },
        { label: "Cozinha (KDS)", icon: ChefHat, path: "/kds" },
        { label: "Mesas", icon: Armchair, path: "/tables" },
        { label: "Estoque", icon: Package, path: "/inventory" },
        { label: "Cardápio", icon: UtensilsCrossed, path: "/menu" },
        { label: "Configurações", icon: Settings, path: "/settings" },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    const NavContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                    <Store className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-gray-800 tracking-tight">Gestor Pro</span>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Button
                            key={item.path}
                            variant={isActive ? "secondary" : "ghost"}
                            className={`w-full justify-start gap-3 h-12 font-medium ${isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-gray-500 hover:text-gray-900"
                                }`}
                            onClick={() => {
                                navigate(item.path);
                                setOpen(false); // Fecha o menu mobile ao clicar
                            }}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-400"}`} />
                            {item.label}
                        </Button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 mt-auto">
                <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="w-5 h-5" /> Sair
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* Sidebar Desktop (Oculto em Mobile) */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-full fixed left-0 top-0 bottom-0 z-30">
                <NavContent />
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 flex flex-col md:ml-64 h-full min-w-0 transition-all duration-300">

                {/* Header Mobile (Visível apenas em telas pequenas) */}
                <header className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                            <Store className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg text-gray-800">Gestor Pro</span>
                    </div>

                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MenuIcon className="h-6 w-6 text-gray-600" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <NavContent />
                        </SheetContent>
                    </Sheet>
                </header>

                {/* Área de Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 md:pb-0">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}