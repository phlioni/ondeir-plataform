import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, ShoppingBag, Users, TrendingUp, ArrowUpRight, Utensils, Clock, Sparkles, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        todayRevenue: 0,
        todayOrders: 0,
        avgTicket: 0,
        occupiedTables: 0,
        totalTables: 0,
        iaSatisfaction: 0
    });
    const [topItems, setTopItems] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();

        // Atualiza a cada 30 segundos para manter o dono informado
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Busca Loja
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (!market) return;

        // 2. Métricas Financeiras (Hoje)
        const { data: ordersToday } = await supabase
            .from('orders')
            .select('total_amount, status, payment_status')
            .eq('market_id', market.id)
            .neq('status', 'canceled')
            .gte('created_at', `${today}T00:00:00`);

        const revenue = ordersToday?.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0) || 0;
        const count = ordersToday?.length || 0;
        const avg = count > 0 ? revenue / count : 0;

        // 3. Mesas
        const { data: tables } = await supabase.from('restaurant_tables').select('is_occupied').eq('market_id', market.id);
        const occupied = tables?.filter(t => t.is_occupied).length || 0;
        const totalT = tables?.length || 0;

        // 4. Satisfação IA (Baseada em sentimentos)
        const { data: sentimentReviews } = await supabase
            .from('reviews')
            .select('sentiment')
            .eq('target_id', market.id)
            .not('sentiment', 'is', null);

        let iaScore = 0;
        if (sentimentReviews && sentimentReviews.length > 0) {
            const positives = sentimentReviews.filter(r => r.sentiment === 'positivo').length;
            iaScore = Math.round((positives / sentimentReviews.length) * 100);
        }

        setMetrics({
            todayRevenue: revenue,
            todayOrders: count,
            avgTicket: avg,
            occupiedTables: occupied,
            totalTables: totalT,
            iaSatisfaction: iaScore
        });

        // 5. Top Itens (Mais Vendidos Hoje)
        const { data: items } = await supabase
            .from('order_items')
            .select('name, quantity, total_price')
            .eq('market_id', market.id)
            .gte('created_at', `${today}T00:00:00`);

        const itemMap: Record<string, { qtd: number, total: number }> = {};
        items?.forEach(item => {
            if (!itemMap[item.name]) itemMap[item.name] = { qtd: 0, total: 0 };
            itemMap[item.name].qtd += item.quantity;
            itemMap[item.name].total += item.total_price;
        });

        const sortedItems = Object.entries(itemMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 5); // Top 5

        setTopItems(sortedItems);

        // 6. Atividade Recente
        const { data: recent } = await supabase
            .from('orders')
            .select('id, display_id, customer_name, status, total_amount, created_at, restaurant_tables(table_number)')
            .eq('market_id', market.id)
            .order('created_at', { ascending: false })
            .limit(6);

        setRecentOrders(recent || []);
        setLoading(false);
    };

    // --- FUNÇÃO DE BENCHMARK DO ÍNDICE DE SATISFAÇÃO ---
    const getSatisfactionLevel = (score: number) => {
        if (score >= 90) return { label: "Excelente", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2, desc: "Acima da média do setor." };
        if (score >= 70) return { label: "Bom", color: "text-blue-600", bg: "bg-blue-50", icon: Sparkles, desc: "Clientes satisfeitos." };
        if (score >= 50) return { label: "Regular", color: "text-orange-600", bg: "bg-orange-50", icon: AlertTriangle, desc: "Atenção necessária." };
        return { label: "Crítico", color: "text-red-600", bg: "bg-red-50", icon: XCircle, desc: "Risco alto de perda." };
    };

    const level = getSatisfactionLevel(metrics.iaSatisfaction);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Visão Geral</h1>
                    <p className="text-gray-500">Resumo da operação de hoje ({new Date().toLocaleDateString()})</p>
                </div>
                <Button onClick={fetchDashboardData} variant="outline" className="gap-2">
                    <Clock className="w-4 h-4" /> Atualizado agora
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <DollarSign className="w-4 h-4 text-green-600" /> Faturamento Hoje
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-gray-900">R$ {metrics.todayRevenue.toFixed(2)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-500 font-medium">Receita bruta do dia</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <ShoppingBag className="w-4 h-4 text-blue-600" /> Pedidos Realizados
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-gray-900">{metrics.todayOrders}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-500">Volume total de vendas</p>
                    </CardContent>
                </Card>

                {/* CARD DE SATISFAÇÃO COM BENCHMARK */}
                <Card className="border-l-4 border-l-purple-500 shadow-sm bg-gradient-to-br from-purple-50/50 to-white hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardDescription className="flex items-center gap-2 font-bold text-purple-700">
                                <Sparkles className="w-4 h-4" /> Satisfação IA
                            </CardDescription>
                            <Badge className={`${level.bg} ${level.color} border-none text-[10px]`}>{level.label}</Badge>
                        </div>
                        <CardTitle className="text-3xl font-bold text-gray-900">{metrics.iaSatisfaction}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Progress value={metrics.iaSatisfaction} className="h-2 bg-purple-100 mb-2" />
                        <div className="flex items-start gap-1.5 mt-2">
                            <level.icon className={`w-3.5 h-3.5 ${level.color} shrink-0 mt-0.5`} />
                            <p className="text-[10px] text-gray-500 leading-tight">{level.desc}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <Users className="w-4 h-4 text-orange-600" /> Ocupação Mesas
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-gray-900">{metrics.occupiedTables}/{metrics.totalTables}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Progress value={(metrics.occupiedTables / (metrics.totalTables || 1)) * 100} className="h-2 mt-2" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ranking de Produtos */}
                <Card className="lg:col-span-2 shadow-sm border-0 bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Utensils className="w-5 h-5 text-gray-400" /> Campeões de Venda (Hoje)</CardTitle>
                        <CardDescription>Itens com maior saída na cozinha</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {topItems.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">Nenhuma venda registrada hoje.</p>
                            ) : (
                                topItems.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm">
                                            {i + 1}º
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-medium text-gray-900">{item.name}</span>
                                                <span className="text-sm font-bold text-gray-700">{item.qtd} vendas</span>
                                            </div>
                                            <Progress value={(item.qtd / topItems[0].qtd) * 100} className="h-2 bg-gray-100" />
                                        </div>
                                        <div className="text-right min-w-[80px]">
                                            <span className="text-xs text-gray-400 block">Total</span>
                                            <span className="text-sm font-medium text-green-600">R$ {item.total.toFixed(0)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Feed de Atividade Recente */}
                <Card className="shadow-sm border-0 bg-gray-50/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Últimos Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className="space-y-4">
                            {recentOrders.map(order => (
                                <div key={order.id} className="bg-white p-3 rounded-lg border shadow-sm flex justify-between items-center hover:scale-[1.02] transition-transform">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900">
                                            #{order.display_id} • {order.restaurant_tables ? `Mesa ${order.restaurant_tables.table_number}` : order.customer_name}
                                        </span>
                                        <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'} className={order.status === 'delivered' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                            {order.status === 'pending' && 'Recebido'}
                                            {order.status === 'preparing' && 'Preparando'}
                                            {order.status === 'ready' && 'Pronto'}
                                            {order.status === 'delivered' && 'Entregue'}
                                            {order.status === 'canceled' && 'Cancelado'}
                                        </Badge>
                                        <div className="text-xs font-bold mt-1 text-gray-700">R$ {order.total_amount?.toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full text-primary hover:text-primary/80" onClick={() => window.location.href = '/orders'}>
                                Ver todos os pedidos <ArrowUpRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}