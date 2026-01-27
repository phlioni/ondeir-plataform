import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, ChefHat, Bike, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Order = {
    id: string;
    display_id: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'canceled';
    order_type: 'table' | 'delivery';
    customer_name?: string;
    total_amount: number;
    created_at: string;
    restaurant_tables?: { table_number: string };
    order_items?: { name: string; quantity: number; notes?: string }[];
};

export default function Orders() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
        const channel = supabase.channel('orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchOrders = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (!market) return;

        const { data } = await supabase.from('orders')
            .select(`*, restaurant_tables(table_number), order_items(name, quantity, notes)`)
            .eq('market_id', market.id)
            .neq('status', 'delivered')
            .neq('status', 'canceled')
            .order('created_at', { ascending: true });

        setOrders(data || []);
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        if (error) toast({ title: "Erro ao atualizar", variant: "destructive" });
        else { toast({ title: "Status atualizado!" }); fetchOrders(); }
    };

    const OrderCard = ({ order }: { order: Order }) => (
        <Card className="mb-3 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
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
                </div>
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <span className="font-bold text-sm">R$ {order.total_amount}</span>
                    <div className="flex gap-2">
                        {order.status === 'pending' && <Button size="sm" onClick={() => updateStatus(order.id, 'preparing')} className="bg-blue-600 h-8"><ChefHat className="w-4 h-4 mr-1" /> Preparar</Button>}
                        {(order.status === 'preparing' || order.status === 'confirmed') && <Button size="sm" onClick={() => updateStatus(order.id, 'ready')} className="bg-green-600 h-8"><CheckCircle2 className="w-4 h-4 mr-1" /> Pronto</Button>}
                        {order.status === 'ready' && <Button size="sm" onClick={() => updateStatus(order.id, 'delivered')} variant="outline" className="h-8">Concluir</Button>}
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
                <Button variant="outline" onClick={fetchOrders}><Clock className="w-4 h-4 mr-2" /> Atualizar</Button>
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
                    <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full bg-green-500" /><h2 className="font-semibold text-green-900">Pronto</h2><Badge className="ml-auto bg-white text-green-700">{orders.filter(o => o.status === 'ready').length}</Badge></div>
                    <div className="overflow-y-auto flex-1 pr-2 space-y-2">{orders.filter(o => o.status === 'ready').map(order => <OrderCard key={order.id} order={order} />)}</div>
                </div>
            </div>
        </div>
    );
}