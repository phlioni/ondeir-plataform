import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Plus, Minus, MapPin, User, Search, Bike, Store, MapPinOff, Utensils } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// --- FUNÇÕES GEO ---
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Raio da terra em km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Distância em metros
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export default function PublicMenu() {
    const { id: marketId } = useParams();
    const { toast } = useToast();

    // Estados de Dados
    const [market, setMarket] = useState<any>(null);
    const [menu, setMenu] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Estados de Geo
    const [isLocationChecked, setIsLocationChecked] = useState(false);
    const [isWithinRange, setIsWithinRange] = useState(false);
    const [userDistance, setUserDistance] = useState<number>(0);
    const [geoError, setGeoError] = useState<string | null>(null);

    // Estados do Carrinho
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customer, setCustomer] = useState({ name: "", tableNumber: "" });
    const [sending, setSending] = useState(false);

    // Estados de Adição de Item
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemQty, setItemQty] = useState(1);
    const [itemNote, setItemNote] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (marketId) loadInitialData();
    }, [marketId]);

    const checkLocation = (marketLat: number, marketLng: number) => {
        if (!navigator.geolocation) {
            setGeoError("Seu dispositivo não suporta GPS.");
            setIsLocationChecked(true);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const dist = getDistanceFromLatLonInMeters(userLat, userLng, marketLat, marketLng);
                setUserDistance(Math.round(dist));

                // Validação de Raio (Ex: 100 metros)
                if (dist <= 100) {
                    setIsWithinRange(true);
                } else {
                    setIsWithinRange(false);
                }
                setIsLocationChecked(true);
            },
            (error) => {
                console.error("Erro GPS:", error);
                setGeoError("Ative a localização para pedir na mesa.");
                setIsLocationChecked(true);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Busca Restaurante
            const { data: mData, error: mError } = await supabase
                .from('markets')
                .select('*')
                .eq('id', marketId)
                .single();

            if (mError || !mData) throw new Error("Restaurante não encontrado");
            setMarket(mData);

            // 2. Verifica Localização (Se o restaurante tiver coordenadas cadastradas)
            if (mData.latitude && mData.longitude) {
                checkLocation(mData.latitude, mData.longitude);
            } else {
                // Se não tiver GPS cadastrado, libera o acesso
                setIsWithinRange(true);
                setIsLocationChecked(true);
            }

            // 3. Busca Cardápio
            const { data: menuData } = await supabase
                .from('menu_items')
                .select('*')
                .eq('market_id', marketId)
                .order('category', { ascending: true });

            if (menuData) {
                setMenu(menuData);
                // Extrai categorias únicas
                const uniqueCats = Array.from(new Set(menuData.map(i => i.category))).filter(Boolean) as string[];
                setCategories(["Todos", ...uniqueCats]);
            }

            // 4. Busca Mesas
            const { data: tablesData } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('market_id', marketId)
                .order('table_number', { ascending: true });

            setAvailableTables(tablesData || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openAddItemModal = (item: any) => {
        setSelectedItem(item);
        setItemQty(1);
        setItemNote("");
        setIsAddModalOpen(true);
    };

    const confirmAddItem = () => {
        if (!selectedItem) return;
        const newItem = {
            ...selectedItem,
            quantity: itemQty,
            notes: itemNote,
            cartId: Math.random().toString(36) // ID temporário único para o carrinho
        };
        setCart(prev => [...prev, newItem]);
        setIsAddModalOpen(false);
        toast({ title: "Item adicionado!", duration: 1500 });
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(i => i.cartId !== cartId));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const formatTableLabel = (rawName: string) => {
        const cleanName = String(rawName).replace(/mesa/gi, "").trim();
        return `Mesa ${cleanName}`;
    };

    const filteredMenu = menu.filter(item => {
        const matchesCategory = selectedCategory === "Todos" || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleCheckout = async () => {
        if (!customer.name.trim()) {
            toast({ title: "Informe seu nome", variant: "destructive" });
            return;
        }
        if (!customer.tableNumber) {
            toast({ title: "Selecione sua mesa", variant: "destructive" });
            return;
        }

        // Encontra ID da mesa
        const table = availableTables.find(t => String(t.table_number) === String(customer.tableNumber));
        if (!table) {
            toast({ title: "Mesa inválida", variant: "destructive" });
            return;
        }

        setSending(true);
        try {
            // 1. Criar Pedido
            const { data: order, error: orderError } = await supabase.from('orders').insert({
                market_id: marketId,
                table_id: table.id,
                status: 'pending',
                payment_status: 'pending',
                order_type: 'table',
                customer_name: customer.name,
                total_amount: cartTotal,
                subtotal: cartTotal,
                delivery_fee: 0,
                discount_amount: 0,
                coins_used: 0
            }).select().single();

            if (orderError) throw orderError;

            // 2. Inserir Itens
            const itemsToInsert = cart.map(item => ({
                order_id: order.id,
                market_id: marketId,
                menu_item_id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: item.price * item.quantity,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // 3. Atualizar status da mesa
            await supabase.from('restaurant_tables').update({ is_occupied: true }).eq('id', table.id);

            // Sucesso
            toast({ title: "Pedido Enviado!", description: "Aguarde, logo levaremos até você.", className: "bg-green-600 text-white" });

            // Limpa tudo
            setCart([]);
            setIsCartOpen(false);
            setCustomer({ name: "", tableNumber: "" });

        } catch (e: any) {
            console.error(e);
            toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const handleRedirectToDelivery = () => {
        // Redireciona para o App principal
        window.location.href = `https://flippi.app/place/${marketId}`;
    };

    // --- RENDERIZAÇÃO ---

    if (loading || !isLocationChecked) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-8 text-center">
                <Loader2 className="animate-spin text-primary w-12 h-12" />
                <p className="text-gray-500">Verificando localização...</p>
            </div>
        );
    }

    // TELA DE BLOQUEIO GEO (Se estiver longe)
    if (!isWithinRange) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <MapPinOff className="w-12 h-12 text-orange-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Você está longe</h1>
                    <p className="text-gray-500">
                        O pedido na mesa só funciona dentro do restaurante.<br />
                        Sua distância: <strong>{userDistance > 1000 ? (userDistance / 1000).toFixed(1) + 'km' : userDistance + 'm'}</strong>
                    </p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button onClick={handleRedirectToDelivery} className="w-full h-12 text-lg font-bold shadow-lg shadow-orange-200 bg-orange-600 hover:bg-orange-700">
                        <Bike className="w-5 h-5 mr-2" /> Pedir Delivery
                    </Button>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                        Tentar Novamente (GPS)
                    </Button>
                </div>
            </div>
        );
    }

    if (!market) return <div className="h-screen flex items-center justify-center">Restaurante não encontrado.</div>;

    const sortedTables = [...availableTables].sort((a, b) => {
        const numA = parseInt(String(a.table_number).replace(/\D/g, '')) || 0;
        const numB = parseInt(String(b.table_number).replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-32 font-sans relative selection:bg-primary/20">
            {/* Header com Capa */}
            <div className="h-48 bg-gray-900 relative">
                {market.cover_image && (
                    <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${market.cover_image})` }} />
                )}
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-16 bg-gradient-to-t from-black/90 to-transparent text-white">
                    <h1 className="text-3xl font-bold">{market.name}</h1>
                    <div className="mt-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                className="pl-9 h-9 bg-white/10 border-white/20 text-white placeholder:text-gray-300 rounded-full focus:bg-white/20 transition-all"
                                placeholder="O que você procura?"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtro de Categorias */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm border-b px-2 py-3 overflow-x-auto hide-scrollbar">
                <div className="flex gap-2 px-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${selectedCategory === cat ? 'bg-primary text-white shadow-md ring-2 ring-primary/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de Produtos */}
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
                {filteredMenu.length === 0 && (
                    <div className="text-center py-10 text-gray-400">Nenhum item encontrado nesta categoria.</div>
                )}

                {filteredMenu.map(item => (
                    <div
                        key={item.id}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 hover:border-primary/30 transition-colors group cursor-pointer"
                        onClick={() => openAddItemModal(item)}
                    >
                        <div
                            className="w-28 h-28 bg-gray-100 rounded-lg bg-cover bg-center shrink-0 shadow-inner"
                            style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }}
                        />
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-primary transition-colors">{item.name}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="font-bold text-lg text-gray-900">R$ {item.price.toFixed(2)}</span>
                                <Button size="sm" className="h-9 rounded-full px-5 shadow-sm active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); openAddItemModal(item); }}>
                                    Adicionar
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Botão Flutuante do Carrinho */}
            <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-30 pointer-events-none">
                {cart.length > 0 && (
                    <Button
                        onClick={() => setIsCartOpen(true)}
                        className="pointer-events-auto w-full max-w-md h-14 rounded-full shadow-2xl text-lg flex justify-between px-6 animate-in slide-in-from-bottom-10 bg-primary hover:bg-primary/90 text-white transition-all hover:scale-[1.02]"
                    >
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm font-bold backdrop-blur-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                            <span className="font-medium">Ver Pedido</span>
                        </div>
                        <span className="font-bold tracking-wide">R$ {cartTotal.toFixed(2)}</span>
                    </Button>
                )}
            </div>

            {/* Modal de Detalhes do Item */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-xs top-[30%] translate-y-[-30%] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-center">{selectedItem?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center justify-center gap-6">
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => setItemQty(q => Math.max(1, q - 1))}><Minus className="w-4 h-4" /></Button>
                            <span className="text-2xl font-bold w-10 text-center">{itemQty}</span>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => setItemQty(q => q + 1)}><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase">Observações</label>
                            <Textarea
                                placeholder="Ex: Sem cebola, ponto da carne..."
                                value={itemNote}
                                onChange={e => setItemNote(e.target.value)}
                                className="resize-none h-20 text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-12 text-lg" onClick={confirmAddItem}>
                            Adicionar R$ {(selectedItem?.price * itemQty).toFixed(2)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sheet do Carrinho / Checkout */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col bg-white">
                    <SheetHeader className="p-6 border-b shadow-sm sticky top-0 z-10 rounded-t-3xl bg-white">
                        <SheetTitle className="text-xl flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-primary" /> Seu Pedido
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Lista de Itens */}
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base">{item.name}</span>
                                        <span className="text-sm text-gray-500">R$ {item.price.toFixed(2)} un</span>
                                        {item.notes && <span className="text-xs text-red-500 italic">Obs: {item.notes}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white rounded-full" onClick={() => removeFromCart(item.cartId)}>
                                            <Minus className="h-4 w-4 text-gray-600" />
                                        </Button>
                                        <span className="font-bold w-6 text-center text-gray-800">{item.quantity}</span>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white rounded-full" onClick={() => openAddItemModal(item)}>
                                            <Plus className="h-4 w-4 text-primary" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Formulário de Identificação */}
                        <div className="space-y-4 pt-2">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                                <Utensils className="w-5 h-5 text-gray-500" /> Identificação
                            </h3>

                            <div className="grid grid-cols-10 gap-4">
                                <div className="col-span-4 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mesa</label>
                                    <Select value={customer.tableNumber} onValueChange={(val) => setCustomer({ ...customer, tableNumber: val })}>
                                        <SelectTrigger className="h-14 bg-white border-2 border-gray-200 text-lg font-bold rounded-xl focus:ring-0">
                                            <SelectValue placeholder="Escolha" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[220px]">
                                            {sortedTables.length === 0 ? <SelectItem value="none" disabled>Cheia</SelectItem> :
                                                sortedTables.map(t => (
                                                    <SelectItem key={t.id} value={String(t.table_number)} className="text-lg py-3">
                                                        {formatTableLabel(t.table_number)}
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-6 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Seu Nome</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
                                        <Input
                                            className="pl-12 bg-white border-2 border-gray-200 h-14 text-lg focus:border-primary focus:ring-0 rounded-xl shadow-sm text-gray-900"
                                            placeholder="Ex: Carlos"
                                            value={customer.name}
                                            onChange={e => setCustomer({ ...customer, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white border-t mt-auto shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-500 font-medium">Total a Pagar</span>
                            <span className="text-3xl font-bold text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        <Button
                            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                            onClick={handleCheckout}
                            disabled={sending}
                        >
                            {sending ? <><Loader2 className="animate-spin mr-2" /> Enviando...</> : "Confirmar Pedido"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}