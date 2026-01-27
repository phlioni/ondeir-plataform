import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, CheckCircle2, AlertTriangle, ChefHat, Maximize2, Minimize2, RefreshCw, Printer, Volume2 } from "lucide-react";
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [marketId, setMarketId] = useState<string | null>(null);

    // Configurações salvas no navegador
    const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('kds_autoprint') === 'true');
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('kds_sound') === 'true');

    const printedOrdersRef = useRef<Set<string>>(new Set());
    const channelRef = useRef<any>(null);

    // Salva preferência de Impressão
    const toggleAutoPrint = (checked: boolean) => {
        setAutoPrint(checked);
        localStorage.setItem('kds_autoprint', String(checked));
        if (checked) toast({ title: "Auto Impressão Ativada" });
    };

    // Salva preferência de Som
    const toggleSound = (checked: boolean) => {
        setSoundEnabled(checked);
        localStorage.setItem('kds_sound', String(checked));
        if (checked) {
            playNotificationSound();
            toast({ title: "Campainha Ativada (Teste)" });
        }
    };

    // Atualiza relógio
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initKDS = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
            if (!market) {
                if (isMounted) setLoading(false);
                return;
            }

            if (isMounted) {
                setMarketId(market.id);
                fetchOrders(market.id, true);
            }

            if (!channelRef.current) {
                const channel = supabase.channel('kds_global_changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                        fetchOrders(market.id);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
                        fetchOrders(market.id);
                    })
                    .subscribe();
                channelRef.current = channel;
            }
        };

        initKDS();

        return () => {
            isMounted = false;
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, []);

    const fetchOrders = async (id: string, isInitialLoad = false) => {
        const { data, error } = await supabase
            .from('orders')
            .select(`*, restaurant_tables(table_number), order_items(name, quantity, notes)`)
            .eq('market_id', id)
            .in('status', ['pending', 'preparing'])
            .order('created_at', { ascending: true });

        // CORREÇÃO: Se der erro na busca (ex: internet oscilou), NÃO limpa a tela. Mantém o que tinha.
        if (error) {
            console.error("Erro ao buscar pedidos:", error);
            if (isInitialLoad) setLoading(false);
            return;
        }

        const newOrdersList = data || [];
        setOrders(newOrdersList);
        setLoading(false);

        // Lógica de Notificação
        if (!isInitialLoad && newOrdersList.length > 0) {
            let hasNewOrders = false;
            newOrdersList.forEach(order => {
                if (order.status === 'pending' && !printedOrdersRef.current.has(order.id)) {
                    hasNewOrders = true;
                    // Pequeno delay para garantir que a UI atualizou antes de bloquear com o print
                    if (autoPrint) setTimeout(() => handlePrintOrder(order), 500);
                    printedOrdersRef.current.add(order.id);
                }
            });
            if (hasNewOrders && soundEnabled) playNotificationSound();
        } else if (isInitialLoad) {
            newOrdersList.forEach(o => printedOrdersRef.current.add(o.id));
        }
    };

    // NOVO SOM: Campainha de Cozinha ("Ding")
    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Configuração para soar como um sino/campainha
            osc.type = 'triangle'; // Onda triangular é mais suave que a quadrada, mas mais brilhante que a senoidal
            osc.frequency.setValueAtTime(1000, ctx.currentTime); // Frequência aguda (1kHz)

            // Envelope de volume (Ataque rápido, decaimento longo)
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02); // Ataque (impacto)
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5); // Decaimento longo (ressonância)

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.5);
        } catch (e) {
            console.error("Erro ao tocar som:", e);
        }
    };

    const handlePrintOrder = (order: KDSOrder) => {
        // Usa um iframe invisível para imprimir sem quebrar o layout
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const itemsHtml = order.order_items?.map(item => `
            <div style="border-bottom: 1px dashed #000; padding: 5px 0; display: flex; justify-content: space-between;">
                <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <span style="font-weight: 800; font-size: 16px;">${item.quantity}x</span>
                    <div>
                        <span style="font-size: 16px; display: block; font-weight: 600;">${item.name}</span>
                        ${item.notes ? `<div style="font-size: 14px; font-weight: bold; background: #eee; padding: 2px 5px; margin-top: 2px; border-radius: 4px;">OBS: ${item.notes}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('') || '';

        doc.write(`
            <html>
                <head>
                    <title>Pedido #${order.display_id}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; width: 300px; margin: 0; padding: 0; color: #000; font-size: 14px; }
                        .container { padding: 10px; }
                        .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                        h1 { font-size: 28px; margin: 0; font-weight: 900; }
                        h2 { font-size: 20px; margin: 5px 0; font-weight: 700; }
                        .info { font-size: 14px; margin-bottom: 15px; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 1px solid #000; padding-top: 10px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>#${order.display_id}</h1>
                            <h2>${order.order_type === 'table' ? `MESA ${order.restaurant_tables?.table_number}` : 'DELIVERY'}</h2>
                        </div>
                        <div class="info">
                            ${order.customer_name ? `<div>Resp: <b>${order.customer_name}</b></div>` : ''}
                            <div>Hora: ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div class="items">
                            ${itemsHtml}
                        </div>
                        <div class="footer">
                            *** FIM DO PEDIDO ***
                        </div>
                    </div>
                </body>
            </html>
        `);
        doc.close();

        // Aguarda carregamento do conteúdo do iframe
        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                try {
                    iframe.contentWindow.print();
                } catch (e) {
                    console.error("Erro ao chamar print:", e);
                }
            }
            // Remove o iframe com segurança após um tempo maior (1 min) para garantir que a impressão ocorra
            // Remover muito rápido em mobile/tablets antigos pode cancelar a impressão
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 60000);
        }, 500);

        printedOrdersRef.current.add(order.id);
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o).filter(o => newStatus !== 'ready' || o.id === orderId));
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error && marketId) fetchOrders(marketId);
    };

    const getElapsedMinutes = (created_at: string) => {
        const diff = now.getTime() - new Date(created_at).getTime();
        return Math.floor(diff / 60000);
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-12 h-12 text-primary" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* HEADER / BARRA DE CONTROLE */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 bg-white sticky top-0 z-10 p-4 shadow-sm -mx-4 md:mx-0 rounded-b-lg gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-primary" /> KDS Cozinha
                    </h1>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-4 bg-gray-50 p-2 rounded-lg border">
                    <div className="flex items-center gap-2 px-2 border-r pr-4">
                        <Volume2 className={`w-5 h-5 ${soundEnabled ? 'text-primary' : 'text-gray-300'}`} />
                        <label className="text-sm font-medium cursor-pointer flex items-center gap-2 select-none hover:text-primary transition-colors">
                            Som
                            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
                        </label>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <Printer className={`w-5 h-5 ${autoPrint ? 'text-primary' : 'text-gray-300'}`} />
                        <label className="text-sm font-medium cursor-pointer flex items-center gap-2 select-none hover:text-primary transition-colors">
                            Auto Print
                            <Switch checked={autoPrint} onCheckedChange={toggleAutoPrint} />
                        </label>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => marketId && fetchOrders(marketId)} title="Forçar Atualização">
                        <RefreshCw className="w-5 h-5 text-gray-400" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={toggleFullScreen} title="Tela Cheia">
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </Button>
                    <div className="text-right hidden md:block ml-4">
                        <span className="text-2xl font-mono font-bold text-gray-700">
                            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* LISTA DE PEDIDOS */}
            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-green-50 rounded-xl border-2 border-dashed border-green-200">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-green-800">Cozinha em dia!</h2>
                    <p className="text-green-600">Aguardando novos pedidos...</p>
                    {autoPrint && <p className="text-xs text-primary mt-2 animate-pulse font-medium">● Monitorando impressora automática</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2 md:px-0">
                    {orders.map((order) => {
                        const mins = getElapsedMinutes(order.created_at);
                        const isLate = mins > 20;
                        const timerColor = isLate ? "bg-red-100 text-red-700 border-red-200 animate-pulse" : mins > 10 ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-gray-100 text-gray-600 border-gray-200";

                        return (
                            <Card key={order.id} className={`flex flex-col h-full shadow-md border-t-4 ${order.status === 'preparing' ? 'border-t-blue-500' : 'border-t-yellow-500'}`}>
                                <CardHeader className="pb-3 bg-gray-50/50 p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl">#{order.display_id}</CardTitle>
                                            <div className="flex flex-col">
                                                <p className="text-sm font-bold text-gray-800 mt-1">
                                                    {order.order_type === 'table' ? `Mesa ${order.restaurant_tables?.table_number}` : `Delivery`}
                                                </p>
                                                {order.customer_name && (
                                                    <span className="text-xs text-gray-500 truncate max-w-[150px] font-medium">
                                                        {order.customer_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant="outline" className={`flex gap-1 items-center font-mono ${timerColor}`}>
                                                {isLate && <AlertTriangle className="w-3 h-3" />}
                                                <Clock className="w-3 h-3" /> {mins} min
                                            </Badge>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-200" onClick={() => handlePrintOrder(order)} title="Reimprimir">
                                                <Printer className="w-4 h-4 text-gray-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 pt-4 flex flex-col p-4">
                                    <div className="space-y-3 flex-1 mb-4">
                                        {order.order_items?.map((item, idx) => (
                                            <div key={idx} className="border-b last:border-0 pb-2 last:pb-0 border-dashed border-gray-200">
                                                <div className="flex gap-2 items-start">
                                                    <span className="font-bold text-lg min-w-[28px] text-center bg-gray-100 rounded text-gray-800 py-1">{item.quantity}</span>
                                                    <div className="flex-1">
                                                        <span className="font-medium text-gray-800 text-lg leading-tight block">{item.name}</span>
                                                        {item.notes && (
                                                            <span className="bg-red-50 text-red-600 text-sm font-bold px-2 py-1 rounded mt-1 inline-block border border-red-100">
                                                                Obs: {item.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {order.status === 'pending' ? (
                                        <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm" onClick={() => updateStatus(order.id, 'preparing')}>
                                            <ChefHat className="mr-2 w-5 h-5" /> Iniciar
                                        </Button>
                                    ) : (
                                        <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-sm" onClick={() => updateStatus(order.id, 'ready')}>
                                            <CheckCircle2 className="mr-2 w-5 h-5" /> Pronto
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