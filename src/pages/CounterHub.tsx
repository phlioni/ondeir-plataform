import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChefHat, Bike, Receipt, CheckCircle2, DollarSign, Clock, MapPin, User, XCircle, AlertTriangle, Send, PackageCheck, Plus, Store, CreditCard, Banknote, Wallet, StickyNote, Volume2, VolumeX } from "lucide-react";
import { DispatchModal } from "@/components/DispatchModal";
import OrderSheet from "@/components/OrderSheet";

// Tipo de Pedido
type Order = {
    id: string;
    display_id: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'canceled';
    order_type: 'table' | 'delivery';
    customer_name?: string;
    address_street?: string;
    address_number?: string;
    address_neighborhood?: string;
    address_complement?: string;
    address_data?: any;
    total_amount: number;
    created_at: string;
    payment_status: 'pending' | 'paid';
    payment_method?: string;
    restaurant_tables?: { table_number: string };
    order_items?: { name: string; quantity: number; notes?: string }[];
    couriers?: { name: string };
    courier_id?: string;
};

// URL do som de telefone antigo (Hospedado externamente para garantir que toque)
// Você pode substituir por um arquivo local em /public/sounds/ring.mp3 depois
const ALERT_SOUND_URL = "https://cdn.freesound.org/previews/337/337049_3232293-lq.mp3";

export default function CounterHub() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [marketId, setMarketId] = useState<string | null>(null);
    const [shiftId, setShiftId] = useState<string | null>(null);

    // Listas do Kanban
    const [entryOrders, setEntryOrders] = useState<Order[]>([]);
    const [prepOrders, setPrepOrders] = useState<Order[]>([]);
    const [routeOrders, setRouteOrders] = useState<Order[]>([]);

    // Controle de Áudio
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isSoundEnabled, setIsSoundEnabled] = useState(false); // Estado para controlar permissão do navegador
    const [isPlaying, setIsPlaying] = useState(false);

    // Modais Operacionais
    const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);

    // Estado do Modal de Pagamento
    const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<Order | null>(null);
    const [paymentMethod, setPaymentMethod] = useState("credit");
    const [changeFor, setChangeFor] = useState("");

    // Modal de Cancelamento
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [canceling, setCanceling] = useState(false);

    // Modal de Criar Pedido (Balcão)
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
    const [creatingOrder, setCreatingOrder] = useState(false);
    const [newOrderType, setNewOrderType] = useState<'table' | 'delivery'>('table');
    const [newOrderData, setNewOrderData] = useState({
        name: "",
        table_number: "",
        phone: "",
        address: ""
    });

    // OrderSheet
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetOrderId, setSheetOrderId] = useState<string | undefined>(undefined);

    // --- INICIALIZAÇÃO DO ÁUDIO ---
    useEffect(() => {
        audioRef.current = new Audio(ALERT_SOUND_URL);
        audioRef.current.loop = true; // Loop infinito até alguém atender

        // Tenta habilitar áudio na primeira interação
        const enableAudio = () => {
            setIsSoundEnabled(true);
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
        window.addEventListener('click', enableAudio);
        window.addEventListener('keydown', enableAudio);

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
    }, []);

    // --- CONTROLE DE TOCAR/PARAR O SOM ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Regra: Toca se tiver pedidos em 'entryOrders' (Pendente) e o som estiver habilitado
        const shouldPlay = entryOrders.length > 0;

        if (shouldPlay && !isPlaying) {
            // Tenta tocar
            audio.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.warn("Autoplay bloqueado pelo navegador:", err);
                setIsPlaying(false); // Mantém false para mostrar botão de ativar som se precisar
            });
        } else if (!shouldPlay && isPlaying) {
            // Para de tocar
            audio.pause();
            audio.currentTime = 0;
            setIsPlaying(false);
        }
    }, [entryOrders, isPlaying]); // Reage a mudanças na lista de entrada

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();

            if (market) {
                setMarketId(market.id);
                const shift = await ensureShiftOpen(market.id, user.id);
                setShiftId(shift.id);
                fetchOrders(market.id);
            } else {
                setLoading(false);
            }
        };

        init();

        const channel = supabase.channel('counter_hub_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                if (marketId && payload.new && (payload.new as any).market_id === marketId) {
                    fetchOrders(marketId);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
                if (marketId) fetchOrders(marketId);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [marketId]);

    const ensureShiftOpen = async (marketId: string, userId: string) => {
        const { data: activeShift } = await supabase
            .from('cashier_shifts')
            .select('*')
            .eq('user_id', userId)
            .is('closed_at', null)
            .maybeSingle();

        if (activeShift) return activeShift;

        const { data: newShift, error } = await supabase
            .from('cashier_shifts')
            .insert({ market_id: marketId, user_id: userId, start_amount: 0 })
            .select()
            .single();

        if (error) console.error("Erro turno auto:", error);
        return newShift || { id: 'fallback' };
    };

    const fetchOrders = async (mId: string) => {
        const { data: rawData, error } = await supabase
            .from('orders')
            .select(`
                *, 
                restaurant_tables(table_number), 
                order_items(name, quantity, notes), 
                couriers(name)
            `)
            .eq('market_id', mId)
            .neq('status', 'canceled')
            .neq('status', 'delivered')
            .order('created_at', { ascending: true });

        if (error) { console.error("Erro fetch:", error); return; }

        const data = rawData as unknown as Order[];

        if (data) {
            setEntryOrders(data.filter(o => o.status === 'pending'));
            setPrepOrders(data.filter(o => o.status === 'preparing'));
            setRouteOrders(data.filter(o => o.status === 'confirmed' || o.status === 'ready'));
        }
        setLoading(false);
    };

    const updateStatus = async (orderId: string, status: string) => {
        const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
        if (error) toast({ title: "Erro ao atualizar", variant: "destructive" });
        else {
            toast({ title: "Status atualizado!" });
            if (marketId) fetchOrders(marketId);
        }
    };

    // --- PAGAMENTO E FINALIZAÇÃO ---
    const handlePaymentClick = (order: Order) => {
        setSelectedPaymentOrder(order);
        setPaymentMethod("credit");
        setChangeFor("");
    };

    const confirmPayment = async () => {
        if (!selectedPaymentOrder || !shiftId) return;

        try {
            const { error: payError } = await supabase.from('payments').insert({
                order_id: selectedPaymentOrder.id,
                market_id: marketId,
                shift_id: shiftId,
                amount: selectedPaymentOrder.total_amount,
                method: paymentMethod
            });
            if (payError) throw payError;

            await supabase.from('orders').update({
                status: 'delivered',
                payment_status: 'paid',
                payment_method: paymentMethod
            }).eq('id', selectedPaymentOrder.id);

            toast({ title: "Pagamento Confirmado!", className: "bg-green-600 text-white" });
            setSelectedPaymentOrder(null);
            if (marketId) fetchOrders(marketId);

        } catch (error: any) {
            toast({ title: "Erro no pagamento", description: error.message, variant: "destructive" });
        }
    };

    // --- CRIAR PEDIDO BALCÃO ---
    const handleCreateOrder = async () => {
        if (!marketId || !newOrderData.name) {
            toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
            return;
        }

        setCreatingOrder(true);
        try {
            let tableId = null;
            if (newOrderType === 'table' && newOrderData.table_number) {
                const { data: table } = await supabase
                    .from('restaurant_tables')
                    .select('id')
                    .eq('market_id', marketId)
                    .eq('table_number', newOrderData.table_number)
                    .single();
                if (table) tableId = table.id;
            }

            const { data, error } = await supabase.from('orders').insert({
                market_id: marketId,
                order_type: newOrderType,
                status: 'pending',
                customer_name: newOrderData.name,
                customer_phone: newOrderData.phone,
                address_street: newOrderData.address,
                table_id: tableId,
                total_amount: 0,
                payment_status: 'pending'
            }).select().single();

            if (error) throw error;

            toast({ title: "Pedido Iniciado!", description: "Adicione os itens agora." });
            setIsNewOrderOpen(false);
            setNewOrderData({ name: "", table_number: "", phone: "", address: "" });
            setSheetOrderId(data.id);
            setIsSheetOpen(true);
            fetchOrders(marketId);

        } catch (error: any) {
            toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        } finally {
            setCreatingOrder(false);
        }
    };

    const handleReject = (orderId: string) => {
        setOrderToCancel(orderId);
        setCancelReason("");
        setIsCancelDialogOpen(true);
    };

    const confirmCancel = async () => {
        if (!orderToCancel) return;
        setCanceling(true);
        try {
            await supabase.from('orders').update({ status: 'canceled', cancellation_reason: cancelReason }).eq('id', orderToCancel);
            toast({ title: "Pedido Recusado" });
            setIsCancelDialogOpen(false);
            if (marketId) fetchOrders(marketId);
        } catch (e) {
            toast({ title: "Erro", variant: "destructive" });
        } finally {
            setCanceling(false);
        }
    };

    const handleSheetClose = () => {
        setIsSheetOpen(false);
        if (marketId) fetchOrders(marketId);
    };

    const formatAddress = (order: Order) => {
        if (order.order_type !== 'delivery') return `Mesa ${order.restaurant_tables?.table_number || 'Balcão'}`;

        let fullAddress = order.address_street || "";
        if (order.address_number) fullAddress += `, ${order.address_number}`;
        if (order.address_neighborhood) fullAddress += ` - ${order.address_neighborhood}`;
        if (order.address_complement) fullAddress += ` (${order.address_complement})`;

        return fullAddress || "Retirada no Local";
    };

    const translatePayment = (method?: string) => {
        switch (method) {
            case 'credit': return 'Crédito';
            case 'debit': return 'Débito';
            case 'pix': return 'Pix';
            case 'cash': return 'Dinheiro';
            default: return 'A Definir';
        }
    };

    const OrderCard = ({ order, actionButton, secondaryButton, footerInfo }: { order: Order, actionButton?: React.ReactNode, secondaryButton?: React.ReactNode, footerInfo?: React.ReactNode }) => (
        <div
            className={`bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${order.status === 'confirmed' ? 'border-blue-300 bg-blue-50/20' : 'border-gray-200'}`}
            onClick={() => { setSheetOrderId(order.id); setIsSheetOpen(true); }}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-800 text-sm">#{order.display_id}</span>
                <Badge variant={order.order_type === 'delivery' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
                    {order.order_type === 'delivery' ? <Bike className="w-3 h-3 mr-1" /> : <Receipt className="w-3 h-3 mr-1" />}
                    {order.order_type === 'delivery' ? 'Delivery' : 'Balcão'}
                </Badge>
            </div>

            <div className="mb-2 space-y-1">
                <p className="font-semibold text-sm truncate flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" /> {order.customer_name || "Cliente"}
                </p>
                <p className="text-xs text-gray-500 flex items-start gap-1 leading-snug">
                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                    <span>{formatAddress(order)}</span>
                </p>

                {order.payment_method && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-1">
                        <Wallet className="w-3 h-3" />
                        <span>{translatePayment(order.payment_method)}</span>
                    </div>
                )}

                <div className="bg-gray-50 rounded p-1.5 mt-2 space-y-2 min-h-[40px]">
                    {order.order_items && order.order_items.length > 0 ? (
                        <>
                            {order.order_items.slice(0, 4).map((item, i) => (
                                <div key={i} className="flex flex-col border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                    <div className="flex justify-between text-xs text-gray-700">
                                        <span><span className="font-bold">{item.quantity}x</span> {item.name}</span>
                                    </div>
                                    {item.notes && (
                                        <div className="text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 w-fit mt-0.5 flex items-center gap-1">
                                            <StickyNote className="w-3 h-3" />
                                            <span className="italic font-medium">{item.notes}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {order.order_items.length > 4 && <span className="text-[10px] text-gray-400 block pt-1">...mais {order.order_items.length - 4} itens</span>}
                        </>
                    ) : <span className="text-[10px] text-gray-400 block pt-1 italic text-center">Nenhum item adicionado</span>}
                </div>
            </div>

            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                <span className="font-bold text-sm text-gray-900">R$ {order.total_amount.toFixed(2)}</span>
                <div className="flex gap-1">{secondaryButton}{actionButton}</div>
            </div>

            {footerInfo ? (
                <div className="flex justify-between items-center mt-2 pt-1" onClick={e => e.stopPropagation()}>
                    {footerInfo}
                </div>
            ) : (
                <div className="flex justify-between items-center mt-1">
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {order.status === 'confirmed' && <Badge className="text-[10px] h-4 bg-blue-100 text-blue-700 border-0 hover:bg-blue-100">No Balcão</Badge>}
                </div>
            )}
        </div>
    );

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-4 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-2 rounded-lg"><CheckCircle2 className="text-purple-600 w-6 h-6" /></div>
                    <div><h1 className="text-xl font-bold text-gray-900">Visão Balcão</h1><p className="text-xs text-gray-500">Fluxo: Entrada → Preparo → Despacho</p></div>
                </div>
                <div className="flex gap-2 items-center">

                    {/* INDICADOR DE ÁUDIO - SÓ APARECE SE ESTIVER TOCANDO OU BLOQUEADO */}
                    {entryOrders.length > 0 && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isPlaying ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                            {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            {isPlaying ? "Chamando..." : "Som Desativado"}
                        </div>
                    )}

                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsNewOrderOpen(true)}><Plus className="w-4 h-4" /> Novo Pedido</Button>
                    <Button variant="outline" size="icon" onClick={() => marketId && fetchOrders(marketId)} title="Atualizar"><Clock className="w-4 h-4" /></Button>
                </div>
            </div>

            {/* Grid Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
                <Card className={`flex flex-col border-dashed h-full transition-colors ${entryOrders.length > 0 ? 'bg-red-50/50 border-red-300' : 'bg-gray-50/50 border-gray-300'}`}>
                    <CardHeader className="pb-2 py-3 bg-gray-100/50 rounded-t-lg">
                        <CardTitle className={`text-sm font-bold flex items-center gap-2 uppercase ${entryOrders.length > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                            <div className={`w-2 h-2 rounded-full ${entryOrders.length > 0 ? 'bg-red-500 animate-ping' : 'bg-gray-400'}`} />
                            Entrada ({entryOrders.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 p-2 bg-gray-50/30"><ScrollArea className="h-full pr-3"><div className="space-y-3">{entryOrders.map(order => <OrderCard key={order.id} order={order} secondaryButton={<Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleReject(order.id)} title="Recusar"><XCircle className="w-4 h-4" /></Button>} actionButton={<Button size="sm" className="bg-blue-600 h-8 text-xs w-24 animate-pulse" onClick={() => updateStatus(order.id, 'preparing')}>Aceitar</Button>} />)}{entryOrders.length === 0 && <div className="text-center text-gray-400 text-xs py-10">Sem novos pedidos.</div>}</div></ScrollArea></CardContent>
                </Card>

                <Card className="flex flex-col bg-orange-50/30 border-orange-100 h-full">
                    <CardHeader className="pb-2 py-3 bg-orange-100/30 rounded-t-lg"><CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800 uppercase"><ChefHat className="w-4 h-4" /> Preparo ({prepOrders.length})</CardTitle></CardHeader>
                    <CardContent className="flex-1 min-h-0 p-2"><ScrollArea className="h-full pr-3"><div className="space-y-3">{prepOrders.map(order => <OrderCard key={order.id} order={order} actionButton={<Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs w-full gap-2" onClick={() => updateStatus(order.id, 'confirmed')}><PackageCheck className="w-4 h-4" /> Pronto</Button>} />)}{prepOrders.length === 0 && <div className="text-center text-gray-400 text-xs py-10">Cozinha livre.</div>}</div></ScrollArea></CardContent>
                </Card>

                <Card className="flex flex-col bg-green-50/30 border-green-100 h-full">
                    <CardHeader className="pb-2 py-3 bg-green-100/30 rounded-t-lg"><CardTitle className="text-sm font-bold flex items-center gap-2 text-green-800 uppercase"><DollarSign className="w-4 h-4" /> Caixa / Rota ({routeOrders.length})</CardTitle></CardHeader>
                    <CardContent className="flex-1 min-h-0 p-2"><ScrollArea className="h-full pr-3"><div className="space-y-3">{routeOrders.map(order => <OrderCard key={order.id} order={order} footerInfo={order.couriers && <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200 w-full justify-center"><Bike className="w-3 h-3 mr-1" /> {order.couriers.name}</Badge>} actionButton={order.status === 'confirmed' ? (order.order_type === 'delivery' ? <Button size="sm" className="bg-orange-500 hover:bg-orange-600 h-8 text-xs w-full gap-2" onClick={() => setDispatchOrder(order)}><Send className="w-4 h-4" /> Despachar</Button> : <Button size="sm" className="bg-gray-900 text-white h-8 text-xs w-full" onClick={() => handlePaymentClick(order)}>Receber</Button>) : <Button size="sm" disabled variant="outline" className="h-8 text-xs w-full bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"><Clock className="w-3 h-3 mr-1" /> Aguardando Entrega...</Button>} />)}{routeOrders.length === 0 && <div className="text-center text-gray-400 text-xs py-10">Nenhum pedido em rota/caixa.</div>}</div></ScrollArea></CardContent>
                </Card>
            </div>

            {dispatchOrder && <DispatchModal isOpen={!!dispatchOrder} order={dispatchOrder} onClose={() => setDispatchOrder(null)} onSuccess={() => { setDispatchOrder(null); if (marketId) fetchOrders(marketId); }} />}

            <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Novo Pedido</DialogTitle><DialogDescription>Inicie um pedido rápido.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Tipo</Label><RadioGroup defaultValue="table" value={newOrderType} onValueChange={(v: any) => setNewOrderType(v)} className="flex gap-4"><div className="flex items-center space-x-2 border rounded-lg p-3 w-full cursor-pointer hover:bg-gray-50 [&:has(:checked)]:bg-blue-50"><RadioGroupItem value="table" id="r-table" /><Label htmlFor="r-table" className="cursor-pointer">Mesa / Balcão</Label></div><div className="flex items-center space-x-2 border rounded-lg p-3 w-full cursor-pointer hover:bg-gray-50 [&:has(:checked)]:bg-blue-50"><RadioGroupItem value="delivery" id="r-delivery" /><Label htmlFor="r-delivery" className="cursor-pointer">Delivery</Label></div></RadioGroup></div>
                        <div className="space-y-2"><Label>Cliente *</Label><Input placeholder="Nome" value={newOrderData.name} onChange={(e) => setNewOrderData({ ...newOrderData, name: e.target.value })} /></div>
                        {newOrderType === 'table' ? <div className="space-y-2"><Label>Mesa</Label><Input placeholder="Nº (Opcional)" value={newOrderData.table_number} onChange={(e) => setNewOrderData({ ...newOrderData, table_number: e.target.value })} /></div> : <div className="space-y-2"><Label>Endereço</Label><Input placeholder="Rua, Nº, Bairro" value={newOrderData.address} onChange={(e) => setNewOrderData({ ...newOrderData, address: e.target.value })} /></div>}
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsNewOrderOpen(false)}>Cancelar</Button><Button onClick={handleCreateOrder} disabled={creatingOrder || !newOrderData.name}>{creatingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar e Adicionar Itens"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL DE PAGAMENTO (Para finalizar pedido) */}
            <Dialog open={!!selectedPaymentOrder} onOpenChange={(open) => !open && setSelectedPaymentOrder(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pagamento e Finalização</DialogTitle>
                        <CardDescription>Confirme o recebimento do valor.</CardDescription>
                    </DialogHeader>

                    <div className="bg-gray-50 p-4 rounded-lg mb-2 flex justify-between items-center border">
                        <span className="font-medium text-gray-600">Total a Receber</span>
                        <span className="text-2xl font-bold text-gray-900">R$ {selectedPaymentOrder?.total_amount.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button variant={paymentMethod === 'credit' ? 'default' : 'outline'} onClick={() => setPaymentMethod('credit')} className="h-12 justify-start gap-2"><CreditCard className="w-4 h-4" /> Crédito</Button>
                        <Button variant={paymentMethod === 'debit' ? 'default' : 'outline'} onClick={() => setPaymentMethod('debit')} className="h-12 justify-start gap-2"><CreditCard className="w-4 h-4" /> Débito</Button>
                        <Button variant={paymentMethod === 'pix' ? 'default' : 'outline'} onClick={() => setPaymentMethod('pix')} className="h-12 justify-start gap-2"><div className="font-bold text-[10px] border border-current rounded px-1">PIX</div> Pix</Button>
                        <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className="h-12 justify-start gap-2"><Banknote className="w-4 h-4" /> Dinheiro</Button>
                    </div>

                    {/* SELEÇÃO DE TROCO SE FOR DINHEIRO */}
                    {paymentMethod === 'cash' && (
                        <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label>Valor Entregue</Label>
                                <Input
                                    type="number"
                                    placeholder="R$ 0,00"
                                    value={changeFor}
                                    onChange={(e) => setChangeFor(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Troco</Label>
                                <div className="flex h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm ring-offset-background items-center font-bold text-gray-700">
                                    {changeFor && selectedPaymentOrder
                                        ? `R$ ${Math.max(0, parseFloat(changeFor) - selectedPaymentOrder.total_amount).toFixed(2)}`
                                        : "R$ 0.00"}
                                </div>
                            </div>
                        </div>
                    )}

                    <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg" onClick={confirmPayment}>
                        Confirmar Pagamento
                    </Button>
                </DialogContent>
            </Dialog>

            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle className="text-red-600">Recusar Pedido</DialogTitle></DialogHeader>
                    <Textarea placeholder="Motivo..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="min-h-[100px]" />
                    <DialogFooter><Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Voltar</Button><Button variant="destructive" onClick={confirmCancel} disabled={canceling}>Confirmar Recusa</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <OrderSheet isOpen={isSheetOpen} onClose={handleSheetClose} onOrderSent={() => marketId && fetchOrders(marketId)} orderId={sheetOrderId} marketId={marketId} />
        </div>
    );
}