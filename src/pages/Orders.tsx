import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Clock, CheckCircle2, ChefHat, Bike, Receipt, Send, User, Phone, MapPin, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrderSheet from "@/components/OrderSheet";
import { DispatchModal } from "@/components/DispatchModal"; // <--- NOVO COMPONENTE

type Order = {
    id: string;
    display_id: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'canceled';
    order_type: 'table' | 'delivery';
    customer_name?: string;
    total_amount: number;
    created_at: string;
    courier_id?: string;
    market_id: string; // Importante para o DispatchModal
    couriers?: { name: string };
    restaurant_tables?: { table_number: string };
    order_items?: { name: string; quantity: number; notes?: string }[];
};

export default function Orders() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketId, setMarketId] = useState<string | null>(null);

    // Controle do Dispatch (Agora usa o objeto do pedido diretamente)
    const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);

    // Novo Delivery Manual
    const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
    const [newDelivery, setNewDelivery] = useState({ name: "", phone: "", address: "" });

    // OrderSheet (Adicionar Itens)
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetOrderId, setSheetOrderId] = useState<string | undefined>(undefined);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (!market) return;

        setMarketId(market.id);

        const { data: ords } = await supabase.from('orders')
            .select(`*, restaurant_tables(table_number), order_items(name, quantity, notes), couriers(name)`)
            .eq('market_id', market.id)
            .neq('status', 'delivered')
            .neq('status', 'canceled')
            .order('created_at', { ascending: true });
        setOrders(ords || []);
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        if (error) toast({ title: "Erro", variant: "destructive" });
        else { toast({ title: "Atualizado!" }); fetchData(); }
    };

    const handleCreateDelivery = async () => {
        if (!marketId || !newDelivery.name) return;
        try {
            const { data, error } = await supabase.from('orders').insert({
                market_id: marketId,
                order_type: 'delivery',
                status: 'pending',
                customer_name: newDelivery.name,
                customer_phone: newDelivery.phone,
                delivery_address: newDelivery.address,
                total_amount: 0
            }).select().single();

            if (error) throw error;

            toast({ title: "Pedido criado!", description: "Agora adicione os itens." });
            setIsNewDeliveryOpen(false);
            setNewDelivery({ name: "", phone: "", address: "" });

            setSheetOrderId(data.id);
            setIsSheetOpen(true);

        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        }
    };

    const openOrderSheet = (orderId: string) => {
        setSheetOrderId(orderId);
        setIsSheetOpen(true);
    };

    const OrderCard = ({ order }: { order: Order }) => (
        <Card className="mb-3 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openOrderSheet(order.id)}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="font-bold text-lg">#{order.display_id}</span>
                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <Badge variant={order.order_type === 'delivery' ? 'secondary' : 'outline'}>
                        {order.order_type === 'delivery' ? <Bike className="w-3 h-3 mr-1" /> : <Receipt className="w-3 h-3 mr-1" />}
                        {order.order_type === 'delivery' ? 'Delivery' : `Mesa ${order.restaurant_tables?.table_number}`}
                    </Badge>
                </div>
                <div className="space-y-1 mb-3">
                    {order.customer_name && <p className="text-sm font-medium">{order.customer_name}</p>}
                    {order.order_items?.map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-600"><span className="font-bold">{item.quantity}x</span> {item.name}</p>
                    ))}
                    {order.courier_id && <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-2 bg-blue-50 p-1 rounded w-fit"><Bike className="w-3 h-3" /> {order.couriers?.name}</p>}
                </div>
                <div className="flex justify-between items-center pt-2 border-t mt-2" onClick={e => e.stopPropagation()}>
                    <span className="font-bold text-sm">R$ {order.total_amount}</span>
                    <div className="flex gap-2">
                        {order.status === 'pending' && <Button size="sm" onClick={() => updateStatus(order.id, 'preparing')} className="bg-blue-600 h-8"><ChefHat className="w-4 h-4 mr-1" /> Preparar</Button>}
                        {(order.status === 'preparing' || order.status === 'confirmed') && <Button size="sm" onClick={() => updateStatus(order.id, 'ready')} className="bg-green-600 h-8"><CheckCircle2 className="w-4 h-4 mr-1" /> Pronto</Button>}

                        {/* Lógica do Botão de Despacho */}
                        {order.status === 'ready' && (
                            order.order_type === 'delivery' && !order.courier_id ? (
                                <Button
                                    size="sm"
                                    onClick={() => setDispatchOrder(order)} // <--- Abre o novo Modal
                                    className="bg-orange-500 hover:bg-orange-600 h-8"
                                >
                                    <Send className="w-4 h-4 mr-1" /> Despachar
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => updateStatus(order.id, 'delivered')} variant="outline" className="h-8">Concluir</Button>
                            )
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Gestão de Pedidos</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData}><Clock className="w-4 h-4 mr-2" /> Atualizar</Button>
                    <Dialog open={isNewDeliveryOpen} onOpenChange={setIsNewDeliveryOpen}>
                        {/* Botão Novo Pedido (Trigger removido para usar controle de estado, ou adicione Trigger aqui se preferir) */}
                        <Button onClick={() => setIsNewDeliveryOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Novo Pedido</Button>

                        <DialogContent>
                            <DialogHeader><DialogTitle>Novo Pedido Delivery</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><label className="text-sm font-medium flex gap-2"><User className="w-4 h-4" /> Nome do Cliente</label><Input value={newDelivery.name} onChange={e => setNewDelivery({ ...newDelivery, name: e.target.value })} placeholder="Ex: Maria Souza" /></div>
                                <div className="space-y-2"><label className="text-sm font-medium flex gap-2"><Phone className="w-4 h-4" /> Telefone</label><Input value={newDelivery.phone} onChange={e => setNewDelivery({ ...newDelivery, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
                                <div className="space-y-2"><label className="text-sm font-medium flex gap-2"><MapPin className="w-4 h-4" /> Endereço</label><Input value={newDelivery.address} onChange={e => setNewDelivery({ ...newDelivery, address: e.target.value })} placeholder="Rua, Número, Bairro" /></div>
                                <Button className="w-full" onClick={handleCreateDelivery}>Criar e Adicionar Itens</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                <div className="flex flex-col bg-gray-100/50 p-4 rounded-xl border border-gray-200/60 h-full">
                    <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full bg-yellow-500" /><h2 className="font-semibold text-gray-700">Novos</h2><Badge className="ml-auto bg-white text-gray-700">{orders.filter(o => o.status === 'pending').length}</Badge></div>
                    <div className="overflow-y-auto flex-1 pr-2 space-y-2">{orders.filter(o => o.status === 'pending').map(order => <OrderCard key={order.id} order={order} />)}</div>
                </div>
                <div className="flex flex-col bg-blue-50/50 p-4 rounded-xl border border-blue-100 h-full">
                    <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" /><h2 className="font-semibold text-blue-900">Na Cozinha</h2><Badge className="ml-auto bg-white text-blue-700">{orders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length}</Badge></div>
                    <div className="overflow-y-auto flex-1 pr-2 space-y-2">{orders.filter(o => o.status === 'preparing' || o.status === 'confirmed').map(order => <OrderCard key={order.id} order={order} />)}</div>
                </div>
                <div className="flex flex-col bg-green-50/50 p-4 rounded-xl border border-green-100 h-full">
                    <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full bg-green-500" /><h2 className="font-semibold text-green-900">Pronto / Despacho</h2><Badge className="ml-auto bg-white text-green-700">{orders.filter(o => o.status === 'ready').length}</Badge></div>
                    <div className="overflow-y-auto flex-1 pr-2 space-y-2">{orders.filter(o => o.status === 'ready').map(order => <OrderCard key={order.id} order={order} />)}</div>
                </div>
            </div>

            {/* --- NOVO MODAL DE DESPACHO --- */}
            {dispatchOrder && (
                <DispatchModal
                    isOpen={!!dispatchOrder}
                    order={dispatchOrder}
                    onClose={() => setDispatchOrder(null)}
                    onSuccess={() => {
                        setDispatchOrder(null);
                        fetchData();
                    }}
                />
            )}

            {/* Sheet para adicionar itens */}
            <OrderSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onOrderSent={fetchData}
                orderId={sheetOrderId}
            />
        </div>
    );
}