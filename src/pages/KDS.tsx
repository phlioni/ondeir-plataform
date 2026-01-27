import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, AlertTriangle, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type KDSOrder = {
    id: string;
    display_id: number;
    status: string;
    order_type: 'table' | 'delivery';
    customer_name?: string;
    created_at: string;
    restaurant_tables?: { table_number: string };
    order_items?: { name: string; quantity: number; notes?: string }[];
};

export default function KDS() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<KDSOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    // Atualiza o relógio a cada minuto para recalcular o tempo de espera
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchOrders();
        // Escuta pedidos novos ou mudanças de status em tempo real
        const channel = supabase.channel('kds_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchOrders = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (!market) return;

        // A cozinha só se importa com o que precisa ser feito (Pending ou Preparing)
        const { data } = await supabase
            .from('orders')
            .select(`*, restaurant_tables(table_number), order_items(name, quantity, notes)`)
            .eq('market_id', market.id)
            .in('status', ['pending', 'preparing'])
            .order('created_at', { ascending: true }); // Mais antigos primeiro

        setOrders(data || []);
        setLoading(false);
    };

    const markAsReady = async (id: string) => {
        const { error } = await supabase.from('orders').update({ status: 'ready' }).eq('id', id);
        if (error) {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        } else {
            toast({ title: "Pedido pronto!", className: "bg-green-600 text-white" });
            fetchOrders();
        }
    };

    const startPreparing = async (id: string) => {
        await supabase.from('orders').update({ status: 'preparing' }).eq('id', id);
        fetchOrders();
    };

    // Calcula tempo decorrido em minutos
    const getElapsedMinutes = (created_at: string) => {
        const diff = now.getTime() - new Date(created_at).getTime();
        return Math.floor(diff / 60000);
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-12 h-12 text-primary" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-primary" /> KDS Cozinha
                    </h1>
                    <p className="text-gray-500">Fila de produção em tempo real</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-gray-700">
                        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-sm text-gray-400">Hora Atual</p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-green-50 rounded-xl border-2 border-dashed border-green-200">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-green-800">Tudo limpo!</h2>
                    <p className="text-green-600">Nenhum pedido pendente na cozinha.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders.map((order) => {
                        const mins = getElapsedMinutes(order.created_at);
                        // Se passar de 20min fica vermelho (Atrasado), 10min amarelo (Atenção)
                        const timerColor = mins > 20 ? "bg-red-100 text-red-700 border-red-200 animate-pulse" : mins > 10 ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-gray-100 text-gray-600 border-gray-200";

                        return (
                            <Card key={order.id} className={`flex flex-col h-full shadow-md border-t-4 ${order.status === 'preparing' ? 'border-t-blue-500' : 'border-t-yellow-500'}`}>
                                <CardHeader className="pb-3 bg-gray-50/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl">#{order.display_id}</CardTitle>
                                            <p className="text-sm font-medium text-gray-600 mt-1">
                                                {order.order_type === 'table' ? `Mesa ${order.restaurant_tables?.table_number}` : `Delivery: ${order.customer_name?.split(' ')[0]}`}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className={`flex gap-1 items-center font-mono ${timerColor}`}>
                                            {mins > 20 && <AlertTriangle className="w-3 h-3" />}
                                            <Clock className="w-3 h-3" /> {mins} min
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 pt-4 flex flex-col">
                                    <div className="space-y-3 flex-1 mb-4">
                                        {order.order_items?.map((item, idx) => (
                                            <div key={idx} className="border-b last:border-0 pb-2 last:pb-0">
                                                <div className="flex gap-2 items-start">
                                                    <span className="font-bold text-lg min-w-[24px] text-center bg-gray-100 rounded text-gray-800">{item.quantity}</span>
                                                    <div className="flex-1">
                                                        <span className="font-medium text-gray-800 text-lg leading-tight block">{item.name}</span>
                                                        {item.notes && (
                                                            <span className="text-red-500 text-sm font-bold italic mt-1 block">
                                                                Obs: {item.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {order.status === 'pending' ? (
                                        <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" onClick={() => startPreparing(order.id)}>
                                            <ChefHat className="mr-2 w-5 h-5" /> Iniciar Preparo
                                        </Button>
                                    ) : (
                                        <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" onClick={() => markAsReady(order.id)}>
                                            <CheckCircle2 className="mr-2 w-5 h-5" /> Marcar Pronto
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}