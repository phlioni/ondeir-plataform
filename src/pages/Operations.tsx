import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2, Utensils, Bike, Clock, DollarSign, Plus,
    ShoppingBag, CreditCard, User, MapPin, Phone,
    AlertCircle, CheckCircle2, ChevronRight
} from "lucide-react";

export default function Operations() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    // Dados
    const [tables, setTables] = useState<any[]>([]);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);

    // UI States
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);

    // Forms
    const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", type: "delivery" });

    useEffect(() => {
        fetchData();
        // Listener Realtime Unificado
        const channel = supabase.channel('operations_cockpit')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchData();
                // Opcional: Tocar som aqui se for um INSERT (novo pedido)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => fetchData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (!market) return;

        // 1. Busca Mesas
        const { data: tablesData } = await supabase.from('restaurant_tables')
            .select('*').eq('market_id', market.id).order('table_number', { ascending: true });

        // 2. Busca TODOS os Pedidos Ativos
        const { data: ordersData } = await supabase.from('orders')
            .select('*, order_items(*)')
            .eq('market_id', market.id)
            .neq('status', 'canceled')
            .neq('payment_status', 'paid')
            .order('created_at', { ascending: true }); // Mais antigos no topo (fila)

        setTables(tablesData || []);
        setActiveOrders(ordersData || []);

        // Mantém o painel lateral sincronizado se estiver aberto
        if (selectedOrder) {
            const updated = ordersData?.find(o => o.id === selectedOrder.id);
            if (updated) setSelectedOrder(updated);
            else {
                setIsDetailsOpen(false);
                setSelectedOrder(null);
            }
        }
        setLoading(false);
    };

    // --- INTERAÇÕES ---
    const handleSelectTable = (table: any) => {
        const order = activeOrders.find(o => o.table_id === table.id);
        if (!order) {
            // Se a mesa está livre, apenas avisa (ou poderia abrir modal para criar pedido)
            return toast({ title: `Mesa ${table.table_number} Livre`, description: "Aguardando cliente." });
        }
        setSelectedOrder(order);
        setIsDetailsOpen(true);
    };

    const handleSelectDelivery = (order: any) => {
        setSelectedOrder(order);
        setIsDetailsOpen(true);
    };

    const handleQuickPay = async () => {
        if (!selectedOrder) return;
        if (!confirm(`Receber R$ ${selectedOrder.total_amount?.toFixed(2)} e encerrar?`)) return;

        await supabase.from('orders').update({ payment_status: 'paid', status: 'delivered' }).eq('id', selectedOrder.id);

        if (selectedOrder.table_id) {
            await supabase.from('restaurant_tables').update({ is_occupied: false }).eq('id', selectedOrder.table_id);
        }

        toast({ title: "Pago!", className: "bg-green-600 text-white" });
        setIsDetailsOpen(false);
        fetchData();
    };

    const handleCreateDelivery = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user!.id).single();

        await supabase.from('orders').insert({
            market_id: market.id,
            customer_name: newCustomer.name,
            customer_phone: newCustomer.phone,
            order_type: newCustomer.type,
            status: 'pending',
            payment_status: 'pending',
            total_amount: 0
        });

        toast({ title: "Pedido Criado!" });
        setIsNewOrderOpen(false);
        setNewCustomer({ name: "", phone: "", type: "delivery" });
        fetchData();
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    // Filtros
    const deliveries = activeOrders.filter(o => o.order_type === 'delivery' || o.order_type === 'pickup');

    // Estatísticas Rápidas
    const countKitchen = activeOrders.filter(o => o.status === 'preparing').length;
    const countReady = activeOrders.filter(o => o.status === 'ready').length;

    return (
        <div className="h-[calc(100vh-4rem)] bg-gray-100 flex flex-col overflow-hidden">

            {/* 1. TOP BAR: Resumo Operacional */}
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Operação
                    </h1>
                    <div className="flex gap-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 px-3 py-1">
                            <Utensils className="w-3 h-3" /> Cozinha: <b>{countKitchen}</b>
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                            <CheckCircle2 className="w-3 h-3" /> Prontos: <b>{countReady}</b>
                        </Badge>
                    </div>
                </div>
                <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>

                    <DialogContent>
                        <DialogHeader><DialogTitle>Abrir Novo Pedido</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Cliente</label>
                                <Input placeholder="Nome" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Telefone</label>
                                <Input placeholder="(00) 00000-0000" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Tipo</label>
                                <Select value={newCustomer.type} onValueChange={v => setNewCustomer({ ...newCustomer, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="delivery">Entrega</SelectItem><SelectItem value="pickup">Retirada (Balcão)</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full h-12" onClick={handleCreateDelivery}>Confirmar Abertura</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 2. ÁREA PRINCIPAL (SPLIT VIEW) */}
            <div className="flex-1 flex overflow-hidden">

                {/* ESQUERDA: SALÃO (GRID DE MESAS) */}
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Mapa de Mesas
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {tables.map(table => {
                            const order = activeOrders.find(o => o.table_id === table.id);
                            const isReady = order?.status === 'ready';

                            return (
                                <button
                                    key={table.id}
                                    onClick={() => handleSelectTable(table)}
                                    className={`
                                        relative group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
                                        ${table.is_occupied
                                            ? (isReady ? 'bg-green-50 border-green-400 shadow-md scale-[1.02]' : 'bg-white border-orange-300 shadow-sm')
                                            : 'bg-gray-50/50 border-dashed border-gray-200 hover:border-gray-300 hover:bg-white'
                                        }
                                        h-32
                                    `}
                                >
                                    <span className={`text-2xl font-bold ${table.is_occupied ? 'text-gray-900' : 'text-gray-300'}`}>
                                        {table.table_number}
                                    </span>

                                    {table.is_occupied ? (
                                        <div className="mt-2 text-center">
                                            <Badge variant="secondary" className="mb-1 text-xs font-normal bg-gray-100">
                                                {order ? `R$ ${order.total_amount?.toFixed(2)}` : 'Abrindo...'}
                                            </Badge>
                                            <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1 justify-center">
                                                <Clock className="w-3 h-3" />
                                                {order ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-300 mt-1 font-medium">LIVRE</span>
                                    )}

                                    {/* Indicador de Status "Pronto" */}
                                    {isReady && (
                                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-bounce">
                                            PRONTO
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* DIREITA: FILA DE DELIVERY (SIDEBAR FIXA) */}
                <div className="w-96 bg-white border-l flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b bg-white">
                        <h2 className="font-bold text-gray-900 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Bike className="w-5 h-5 text-primary" /> Delivery & Balcão</span>
                            <Badge className="bg-gray-900 text-white">{deliveries.length}</Badge>
                        </h2>
                    </div>

                    <ScrollArea className="flex-1 p-4 bg-gray-50">
                        <div className="space-y-3">
                            {deliveries.length === 0 && (
                                <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                                    <Bike className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm">Nenhum pedido na fila.</p>
                                </div>
                            )}

                            {deliveries.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => handleSelectDelivery(order)}
                                    className={`
                                        bg-white p-4 rounded-lg border shadow-sm cursor-pointer hover:border-primary transition-all relative overflow-hidden
                                        ${order.status === 'ready' ? 'border-green-400 ring-1 ring-green-100' : ''}
                                    `}
                                >
                                    {order.status === 'ready' && <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-bl-lg" />}

                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-900">{order.customer_name}</h3>
                                        <span className="text-xs font-mono text-gray-400">#{order.display_id}</span>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline" className="w-fit text-[10px] h-5 px-1 bg-gray-50 text-gray-600 border-gray-200">
                                                {order.order_type === 'delivery' ? 'Moto' : 'Retira'}
                                            </Badge>
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <span className="font-bold text-gray-900">R$ {order.total_amount?.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* SHEET DE AÇÃO (DETALHES DO PEDIDO) */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-white">
                    <SheetHeader className="p-6 border-b bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border shadow-sm text-lg font-bold text-primary">
                                    {selectedOrder?.restaurant_tables?.table_number || selectedOrder?.customer_name?.charAt(0)}
                                </div>
                                <div>
                                    <SheetTitle className="text-base">
                                        {selectedOrder?.restaurant_tables ? `Mesa ${selectedOrder.restaurant_tables.table_number}` : selectedOrder?.customer_name}
                                    </SheetTitle>
                                    <CardDescription className="text-xs">Pedido #{selectedOrder?.display_id}</CardDescription>
                                </div>
                            </div>
                            <Badge className={
                                selectedOrder?.status === 'ready' ? 'bg-green-100 text-green-700' :
                                    selectedOrder?.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }>
                                {selectedOrder?.status === 'pending' && 'Novo'}
                                {selectedOrder?.status === 'preparing' && 'Cozinha'}
                                {selectedOrder?.status === 'ready' && 'Pronto'}
                            </Badge>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {/* Lista de Itens */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Consumo</h4>
                                <div className="space-y-3">
                                    {selectedOrder?.order_items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm border-b border-dashed border-gray-100 pb-2 last:border-0">
                                            <div className="flex gap-3">
                                                <span className="font-bold text-gray-900">{item.quantity}x</span>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-700">{item.name}</span>
                                                    {item.notes && <span className="text-xs text-red-500 italic">{item.notes}</span>}
                                                </div>
                                            </div>
                                            <span className="font-medium text-gray-900">R$ {item.total_price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Info Cliente (Se Delivery) */}
                            {selectedOrder?.order_type !== 'table' && (
                                <div className="bg-blue-50 p-4 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-blue-700 font-bold"><User className="w-4 h-4" /> Dados do Cliente</div>
                                    <div className="text-sm text-blue-900">Nome: {selectedOrder?.customer_name}</div>
                                    <div className="text-sm text-blue-900 flex items-center gap-2"><Phone className="w-3 h-3" /> {selectedOrder?.customer_phone || "Não informado"}</div>
                                </div>
                            )}

                            {/* Totais */}
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between font-bold text-xl text-gray-900">
                                    <span>Total</span>
                                    <span>R$ {selectedOrder?.total_amount?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <SheetFooter className="p-6 border-t bg-gray-50">
                        <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 gap-2 font-bold shadow-sm" onClick={handleQuickPay}>
                            <CreditCard className="w-5 h-5" /> Receber Pagamento
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}