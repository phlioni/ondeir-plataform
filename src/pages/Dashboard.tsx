import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingBag, Clock, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        ordersToday: 0,
        salesToday: 0,
        pendingOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate("/auth");

            const { data: market } = await supabase
                .from('markets')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!market) {
                navigate("/settings");
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            // 1. Pedidos do Dia
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('market_id', market.id)
                .gte('created_at', `${today}T00:00:00`);

            if (error && error.code !== 'PGRST116') throw error;

            const ordersData = orders || [];
            const totalSales = ordersData.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
            const pending = ordersData.filter(o => o.status === 'pending' || o.status === 'preparing').length;

            setStats({
                ordersToday: ordersData.length,
                salesToday: totalSales,
                pendingOrders: pending
            });

            // 2. Últimos Pedidos
            const { data: recent } = await supabase
                .from('orders')
                .select('*, restaurant_tables(table_number)')
                .eq('market_id', market.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentOrders(recent || []);

        } catch (error) {
            console.error("Erro dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'ready': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Pendente', preparing: 'Preparo', ready: 'Pronto', delivered: 'Entregue', canceled: 'Cancelado'
        };
        return labels[status] || status;
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Visão Geral</h1>
                    <p className="text-gray-500">Resumo da operação hoje.</p>
                </div>
                <Button onClick={() => navigate('/orders')}>Gestão de Pedidos</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm bg-white border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Vendas Hoje</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {stats.salesToday.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <TrendingUp className="w-3 h-3 mr-1 text-green-500" /> Atualizado agora
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Pedidos Hoje</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.ordersToday}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total do dia</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white border-l-4 border-l-yellow-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Fila da Cozinha</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                        <p className="text-xs text-muted-foreground mt-1">Aguardando/Preparo</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Últimos Pedidos</CardTitle>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/orders')}>
                        Ver todos <ArrowRight className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentOrders.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                            Nenhum pedido registrado hoje.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors rounded-lg border border-gray-100">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 flex items-center gap-2">
                                            #{order.display_id || order.id.slice(0, 4)}
                                            {order.order_type === 'delivery' && <Badge variant="secondary" className="text-[10px] h-5">Delivery</Badge>}
                                        </span>
                                        <span className="text-sm text-gray-500 mt-0.5">
                                            {order.order_type === 'table'
                                                ? `Mesa ${order.restaurant_tables?.table_number || '?'}`
                                                : `${order.customer_name || 'Cliente'}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium text-gray-900">R$ {Number(order.total_amount).toFixed(2)}</span>
                                        <Badge variant="outline" className={`${getStatusColor(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}