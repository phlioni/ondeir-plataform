import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Plus, Minus, MapPin, User, Clock, CheckCircle2, ChefHat, Receipt, Utensils, RefreshCw, AlertCircle, ChevronDown, ChevronUp, MapPinOff, Lock, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Adicionado Dialog
import { Textarea } from "@/components/ui/textarea"; // Adicionado Textarea
import { Progress } from "@/components/ui/progress";

// --- UTILITÁRIOS (GPS) ---
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
}
function deg2rad(deg: number) { return deg * (Math.PI / 180); }

// --- CONFIGURAÇÃO DE STATUS ---
const STATUS_STEPS = {
    pending: { label: "Enviado", step: 1, icon: Receipt, color: "text-gray-600", bg: "bg-gray-100" },
    preparing: { label: "Preparando", step: 2, icon: ChefHat, color: "text-blue-600", bg: "bg-blue-100" },
    ready: { label: "Saindo / Pronto", step: 3, icon: Utensils, color: "text-orange-600", bg: "bg-orange-100" },
    delivered: { label: "Entregue", step: 4, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
    canceled: { label: "Cancelado", step: 0, icon: Clock, color: "text-red-600", bg: "bg-red-100" }
};

export default function PublicMenu() {
    const { id: marketId } = useParams();
    const { toast } = useToast();

    // --- ESTADOS ---
    const [market, setMarket] = useState<any>(null);
    const [menu, setMenu] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(""); // Estado para busca

    // GPS
    const [isLocationChecked, setIsLocationChecked] = useState(false);
    const [isWithinRange, setIsWithinRange] = useState(false);
    const [userDistance, setUserDistance] = useState<number>(0);
    const [geoError, setGeoError] = useState<string | null>(null);

    // Pedido
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customer, setCustomer] = useState({ name: "", tableNumber: "" });
    const [sending, setSending] = useState(false);

    // Modal de Item (Compacto)
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemQty, setItemQty] = useState(1);
    const [itemNote, setItemNote] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Tracking
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [trackedOrder, setTrackedOrder] = useState<any>(null);
    const [isTrackingOpen, setIsTrackingOpen] = useState(false);
    const [showOrderDetails, setShowOrderDetails] = useState(false);

    useEffect(() => {
        if (marketId) loadInitialData();
    }, [marketId]);

    // --- REALTIME (ATUALIZAÇÃO AO VIVO) ---
    useEffect(() => {
        if (!activeOrderId) return;
        const channel = supabase.channel(`tracking_${activeOrderId}`)
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}`
            }, (payload: any) => {
                const newOrder = payload.new;
                setTrackedOrder((prev: any) => ({ ...prev, ...newOrder }));

                // SE A CONTA FOI PAGA: AVISA E LIMPA
                if (newOrder.payment_status === 'paid') {
                    toast({
                        title: "✅ Conta Paga!",
                        description: "Seu pedido foi encerrado. Obrigado!",
                        className: "bg-green-600 text-white",
                        duration: 5000
                    });
                    setTimeout(() => handleNewOrder(), 3000);
                    return;
                }

                if (newOrder.status === 'preparing') toast({ title: "🔥 A cozinha começou o preparo!" });
                if (newOrder.status === 'ready') toast({ title: "🍽️ Pedido pronto/saindo!" });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeOrderId]);

    // --- LÓGICA DE GEOLOCALIZAÇÃO ---
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

                if (dist <= 100) setIsWithinRange(true);
                else setIsWithinRange(false);
                setIsLocationChecked(true);
            },
            (error) => {
                console.error(error);
                setGeoError("Ative a localização para pedir.");
                setIsLocationChecked(true);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // --- RESETAR PEDIDO (DESTROCA) ---
    const handleNewOrder = () => {
        localStorage.removeItem(`last_order_${marketId}`);
        setActiveOrderId(null);
        setTrackedOrder(null);
        setIsTrackingOpen(false);
        setCart([]);
        setCustomer({ name: "", tableNumber: "" });
        toast({ title: "Pronto para um novo pedido!" });
    };

    // --- CARREGAMENTO INICIAL ---
    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Loja
            const { data: mData } = await supabase.from('markets').select('*').eq('id', marketId).single();
            setMarket(mData);

            if (mData.latitude && mData.longitude) checkLocation(mData.latitude, mData.longitude);
            else { setIsWithinRange(true); setIsLocationChecked(true); }

            // 2. Menu
            const { data: menuData } = await supabase.from('menu_items').select('*').eq('market_id', marketId).order('category');
            if (menuData) {
                setMenu(menuData);
                const uniqueCats = Array.from(new Set(menuData.map(i => i.category))).filter(Boolean) as string[];
                setCategories(["Todos", ...uniqueCats]);
            }

            // 3. Mesas (Apenas livres)
            const { data: tablesData } = await supabase.from('restaurant_tables')
                .select('*')
                .eq('market_id', marketId)
                .eq('is_occupied', false) // FILTRO DE MESAS LIVRES
                .order('table_number', { ascending: true });

            setAvailableTables(tablesData || []);

            // 4. Recuperar Pedido (E LIMPAR SE NECESSÁRIO)
            const savedOrderId = localStorage.getItem(`last_order_${marketId}`);
            if (savedOrderId) {
                const { data: order } = await supabase.from('orders').select('*, order_items(*), restaurant_tables(table_number)').eq('id', savedOrderId).single();

                if (order) {
                    // LIMPEZA AUTOMÁTICA: Se já foi pago, cancelado ou entregue há muito tempo
                    const isFinished = ['delivered', 'canceled'].includes(order.status) || order.payment_status === 'paid';

                    if (isFinished) {
                        localStorage.removeItem(`last_order_${marketId}`);
                    } else {
                        setActiveOrderId(order.id);
                        setTrackedOrder(order);
                        setCustomer({
                            name: order.customer_name || "",
                            tableNumber: order.restaurant_tables?.table_number ? String(order.restaurant_tables.table_number) : ""
                        });
                    }
                } else {
                    localStorage.removeItem(`last_order_${marketId}`);
                }
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // --- CARRINHO & MODAL ---
    const openAddItemModal = (item: any) => {
        setSelectedItem(item);
        setItemQty(1);
        setItemNote("");
        setIsAddModalOpen(true);
    };

    const confirmAddItem = () => {
        if (!selectedItem) return;
        setCart(prev => [...prev, {
            ...selectedItem,
            quantity: itemQty,
            notes: itemNote,
            cartId: Math.random().toString(36)
        }]);
        setIsAddModalOpen(false);
        toast({ title: "Adicionado!" });
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(i => i.cartId !== cartId));
    };

    // --- CÁLCULO DE TOTAIS ---
    // Total APENAS do carrinho atual (novos itens)
    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const formatTableLabel = (rawName: string) => {
        const cleanName = String(rawName).replace(/mesa/gi, "").trim();
        return `Mesa ${cleanName}`;
    };

    // Filtro de Menu
    const filteredMenu = menu.filter(item => {
        const matchesCategory = selectedCategory === "Todos" || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // --- CHECKOUT (CRIAR OU ATUALIZAR) ---
    const handleCheckout = async () => {
        if (!customer.name.trim()) return toast({ title: "Informe seu nome", variant: "destructive" });
        if (!customer.tableNumber) return toast({ title: "Selecione sua mesa", variant: "destructive" });

        const table = availableTables.find(t => String(t.table_number) === String(customer.tableNumber));
        if (!table && !activeOrderId) return toast({ title: "Mesa inválida", variant: "destructive" });

        setSending(true);

        try {
            let orderId = activeOrderId;

            // --- CENÁRIO A: NOVO PEDIDO ---
            if (!orderId) {
                // Cálculo inicial correto do total
                const { data: order, error: orderError } = await supabase.from('orders').insert({
                    market_id: marketId,
                    table_id: table?.id, // Usa table?.id pois se já tem orderId, table pode ser undefined aqui
                    status: 'pending',
                    payment_status: 'pending', // Garante visibilidade no caixa
                    order_type: 'table',
                    customer_name: customer.name,
                    total_amount: cartTotal // ENVIA O TOTAL JÁ CALCULADO
                }).select().single();

                if (orderError) throw orderError;
                orderId = order.id;
                if (table) await supabase.from('restaurant_tables').update({ is_occupied: true }).eq('id', table.id);
            }

            // --- INSERIR ITENS ---
            const items = cart.map(item => ({
                order_id: orderId,
                market_id: marketId,
                menu_item_id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: item.price * item.quantity,
                notes: item.notes // Salva a observação
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(items);
            if (itemsError) throw itemsError;

            // --- ATUALIZAR TOTAL E STATUS (Se for adição) ---
            if (activeOrderId && trackedOrder) {
                // Soma o total antigo com o novo carrinho para garantir o valor correto
                const currentTotal = Number(trackedOrder.total_amount) || 0;
                const newTotal = currentTotal + cartTotal;

                await supabase.from('orders').update({
                    total_amount: newTotal, // Atualiza o total
                    status: 'pending', // Reabre para a cozinha
                    payment_status: 'pending'
                }).eq('id', orderId);
            }

            // Salva estado local
            localStorage.setItem(`last_order_${marketId}`, orderId!);
            setActiveOrderId(orderId);

            // Recarrega dados completos para a UI (incluindo soma feita pelo banco se houver trigger)
            const { data: updatedOrder } = await supabase.from('orders').select('*, order_items(*), restaurant_tables(table_number)').eq('id', orderId).single();
            setTrackedOrder(updatedOrder);

            setCart([]);
            setIsCartOpen(false);
            setIsTrackingOpen(true);
            toast({ title: activeOrderId ? "Novos itens enviados!" : "Pedido Aberto!", className: "bg-green-600 text-white" });

        } catch (e: any) {
            console.error(e);
            toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    // --- RENDERIZAÇÃO ---

    if (loading || !isLocationChecked) return <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-8 text-center"><Loader2 className="animate-spin text-primary w-12 h-12" /><p className="text-gray-500">Verificando localização...</p></div>;

    if (!isWithinRange) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center"><MapPinOff className="w-12 h-12 text-red-500" /></div>
            <div><h1 className="text-2xl font-bold text-gray-900">Você está longe</h1><p className="text-gray-500 mt-2">Este cardápio só funciona dentro do restaurante.<br />Sua distância atual: <strong>{userDistance > 1000 ? (userDistance / 1000).toFixed(1) + 'km' : userDistance + 'm'}</strong></p></div>
            <Button onClick={() => window.location.reload()} variant="outline">Tentar Novamente</Button>
        </div>
    );

    if (!market) return <div className="h-screen flex items-center justify-center">Restaurante não encontrado.</div>;

    const currentStatusKey = trackedOrder?.status as keyof typeof STATUS_STEPS || 'pending';
    const statusInfo = STATUS_STEPS[currentStatusKey];

    // Configuração da Timeline
    const timelineSteps = [
        { key: 'pending', label: 'Enviado', desc: 'Aguardando restaurante' },
        { key: 'preparing', label: 'Cozinha', desc: 'Sendo preparado' },
        { key: 'ready', label: 'Pronto', desc: 'A caminho da mesa' },
    ];
    const currentStepIndex = timelineSteps.findIndex(s => s.key === currentStatusKey);

    // Ordenação Numérica das Mesas
    const sortedTables = [...availableTables].sort((a, b) => {
        const numA = parseInt(String(a.table_number).replace(/\D/g, '')) || 0;
        const numB = parseInt(String(b.table_number).replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-32 font-sans relative selection:bg-primary/20">
            {/* --- HEADER --- */}
            <div className="h-48 bg-gray-900 relative">
                {market.cover_image && <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${market.cover_image})` }} />}
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-16 bg-gradient-to-t from-black/90 to-transparent text-white">
                    <h1 className="text-3xl font-bold">{market.name}</h1>
                    <div className="mt-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input className="pl-9 h-9 bg-white/10 border-white/20 text-white placeholder:text-gray-300 rounded-full" placeholder="O que você procura?" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></div>
                </div>
            </div>

            {/* --- CATEGORIAS --- */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm border-b px-2 py-3 overflow-x-auto hide-scrollbar">
                <div className="flex gap-2 px-2">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${selectedCategory === cat ? 'bg-primary text-white shadow-md ring-2 ring-primary/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
                    ))}
                </div>
            </div>

            {/* --- LISTA DE PRODUTOS --- */}
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
                {filteredMenu.length === 0 && <div className="text-center py-10 text-gray-400">Nenhum item encontrado.</div>}
                {filteredMenu.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 hover:border-primary/30 transition-colors group" onClick={() => openAddItemModal(item)}>
                        <div className="w-28 h-28 bg-gray-100 rounded-lg bg-cover bg-center shrink-0 shadow-inner" style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }} />
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div><h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-primary transition-colors">{item.name}</h3><p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{item.description}</p></div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="font-bold text-lg text-gray-900">R$ {item.price.toFixed(2)}</span>
                                <Button size="sm" className="h-9 rounded-full px-5 shadow-sm active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); openAddItemModal(item); }}>Adicionar</Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- BOTÕES FLUTUANTES --- */}
            <div className="fixed bottom-6 left-0 right-0 px-4 flex flex-col items-center gap-3 z-30 pointer-events-none">
                {activeOrderId && (
                    <div className="pointer-events-auto w-full max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <Button onClick={() => setIsTrackingOpen(true)} className="w-full h-14 rounded-full shadow-xl flex items-center justify-between px-6 bg-white border border-blue-100 text-blue-700 hover:bg-blue-50">
                            <div className="flex items-center gap-3"><div className="relative"><span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" /><Clock className="w-5 h-5" /></div><div className="flex flex-col items-start text-xs"><span className="font-bold text-sm">Conta Aberta</span><span>Mesa {trackedOrder?.restaurant_tables?.table_number || customer.tableNumber || '?'}</span></div></div>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">Ver</Badge>
                        </Button>
                    </div>
                )}
                {cart.length > 0 && (
                    <Button onClick={() => setIsCartOpen(true)} className="pointer-events-auto w-full max-w-md h-14 rounded-full shadow-2xl text-lg flex justify-between px-6 animate-in slide-in-from-bottom-10 bg-primary hover:bg-primary/90 text-white transition-all hover:scale-[1.02]">
                        <div className="flex items-center gap-3"><span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm font-bold backdrop-blur-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</span><span className="font-medium">Ver Carrinho</span></div><span className="font-bold tracking-wide">R$ {cartTotal.toFixed(2)}</span>
                    </Button>
                )}
            </div>

            {/* --- SHEET CARRINHO / CHECKOUT --- */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col bg-white">
                    <SheetHeader className="p-6 border-b shadow-sm sticky top-0 z-10 rounded-t-3xl bg-white">
                        <SheetTitle className="text-xl flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-primary" />
                            {activeOrderId ? "Adicionar ao Pedido" : "Seu Pedido"}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base">{item.name}</span>
                                        <span className="text-sm text-gray-500">R$ {item.price.toFixed(2)} un</span>
                                        {item.notes && <span className="text-xs text-red-500 italic">Obs: {item.notes}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white rounded-full" onClick={() => removeFromCart(item.cartId)}><Minus className="h-4 w-4 text-gray-600" /></Button>
                                        <span className="font-bold w-6 text-center text-gray-800">{item.quantity}</span>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white rounded-full" onClick={() => openAddItemModal(item)}><Plus className="h-4 w-4 text-primary" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Dados de Identificação (Travados se já tem pedido) */}
                        <div className="space-y-4 pt-2">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg"><Utensils className="w-5 h-5 text-gray-500" /> Identificação</h3>
                            <div className="grid grid-cols-10 gap-4">
                                <div className="col-span-4 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mesa</label>
                                    <Select value={customer.tableNumber} onValueChange={(val) => setCustomer({ ...customer, tableNumber: val })} disabled={!!activeOrderId}>
                                        <SelectTrigger className="h-14 bg-white border-2 border-gray-200 text-lg font-bold rounded-xl focus:ring-0"><SelectValue placeholder="Escolha" /></SelectTrigger>
                                        <SelectContent className="max-h-[220px]">
                                            {sortedTables.length === 0 ? <SelectItem value="none" disabled>Nenhuma vaga</SelectItem> : sortedTables.map(t => (<SelectItem key={t.id} value={String(t.table_number)} className="text-lg py-3">{formatTableLabel(t.table_number)}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-6 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Seu Nome</label>
                                    <div className="relative"><User className="absolute left-4 top-4 h-6 w-6 text-gray-400" /><Input disabled={!!activeOrderId} className="pl-12 bg-white border-2 border-gray-200 h-14 text-lg focus:border-primary focus:ring-0 rounded-xl shadow-sm text-gray-900" placeholder="Ex: Carlos" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /></div>
                                </div>
                            </div>
                            {activeOrderId && <div className="bg-green-50 p-3 rounded-lg flex gap-3 items-start border border-green-100"><Lock className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /><p className="text-xs text-green-800 leading-tight">Adicionando à comanda aberta.</p></div>}
                        </div>
                    </div>

                    <div className="p-6 bg-white border-t mt-auto shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-medium">Total (Novos)</span><span className="text-3xl font-bold text-gray-900">R$ {cartTotal.toFixed(2)}</span></div>
                        <Button className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" onClick={handleCheckout} disabled={sending}>
                            {sending ? <><Loader2 className="animate-spin mr-2" /> Enviando...</> : (activeOrderId ? "Adicionar ao Pedido" : "Confirmar Pedido")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* --- SHEET ACOMPANHAMENTO (TRACKING) --- */}
            <Sheet open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
                <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col bg-white overflow-hidden">
                    <SheetHeader className="p-6 bg-gray-50/50 border-b rounded-t-3xl backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                            <div><SheetTitle className="text-left text-xl font-bold">Acompanhamento</SheetTitle><p className="text-sm text-gray-500 mt-0.5 font-medium">Mesa {trackedOrder?.restaurant_tables?.table_number || customer.tableNumber}</p></div>
                            <div className="text-right"><span className="text-xs text-gray-400 uppercase tracking-wider font-bold block mb-1">Pedido</span><span className="font-mono text-lg font-bold text-gray-900">#{trackedOrder?.display_id || '...'}</span></div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-8 pb-4 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                {currentStatusKey === 'preparing' && <div className={`absolute inset-0 rounded-full opacity-30 animate-ping ${statusInfo.bg}`} />}
                                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${statusInfo.bg} shadow-xl transition-all duration-500 ring-4 ring-white`}>
                                    <statusInfo.icon className={`w-16 h-16 ${statusInfo.color}`} />
                                </div>
                            </div>
                            <div className="text-center space-y-1"><h2 className={`text-2xl font-black ${statusInfo.color} tracking-tight uppercase`}>{statusInfo.label}</h2><p className="text-gray-400 text-sm font-medium">Status atual do seu pedido</p></div>
                        </div>

                        {/* TIMELINE */}
                        <div className="px-8 py-4">
                            <div className="space-y-0 relative border-l-2 border-gray-100 ml-3">
                                {timelineSteps.map((step, idx) => {
                                    const isActive = idx <= currentStepIndex;
                                    return (
                                        <div key={step.key} className="relative pl-8 pb-8 last:pb-0 group">
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-all duration-300 ${isActive ? 'bg-primary border-primary scale-110' : 'bg-white border-gray-300'}`}>
                                                {isActive && <div className="w-full h-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                                            </div>
                                            <h4 className={`text-sm font-bold transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</h4>
                                            <p className={`text-xs transition-colors ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>{step.desc}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ITENS CONSUMIDOS */}
                        <div className="mt-4 border-t border-gray-100">
                            <button onClick={() => setShowOrderDetails(!showOrderDetails)} className="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"><span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Ver Itens Consumidos</span>{showOrderDetails ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}</button>
                            {showOrderDetails && (
                                <div className="p-4 bg-gray-50/50 space-y-3 animate-in slide-in-from-top-2">
                                    {trackedOrder?.order_items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm"><span className="text-gray-600"><span className="font-bold text-gray-900">{item.quantity}x</span> {item.name}</span><span className="font-medium text-gray-900">R$ {(item.unit_price * item.quantity).toFixed(2)}</span></div>
                                    ))}
                                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold"><span>Total da Conta</span><span>R$ {trackedOrder?.total_amount?.toFixed(2)}</span></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-white border-t space-y-3 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
                        <Button onClick={() => setIsTrackingOpen(false)} variant="outline" className="w-full h-14 border-2 border-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:text-gray-700">Voltar ao Cardápio (Pedir Mais)</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Modal de Item Compacto */}
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
                            <Textarea placeholder="Ex: Sem cebola..." value={itemNote} onChange={e => setItemNote(e.target.value)} className="resize-none h-20 text-sm" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={confirmAddItem}>Adicionar R$ {(selectedItem?.price * itemQty).toFixed(2)}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}