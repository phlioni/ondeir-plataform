import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Unlock, DollarSign, CreditCard, Banknote, ArrowRight, Wallet, ShoppingBag } from "lucide-react";

export default function Cashier() {
    const { toast } = useToast();
    const [shift, setShift] = useState<any>(null);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados de Pagamento
    const [startAmount, setStartAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("credit");
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);

    useEffect(() => {
        checkActiveShift();

        // Real-time para novos pedidos chegando no caixa
        const channel = supabase.channel('cashier_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                if (shift) fetchPendingOrders(shift.market_id);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [shift?.id]);

    const checkActiveShift = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: activeShift } = await supabase
            .from('cashier_shifts')
            .select('*')
            .eq('user_id', user.id)
            .is('closed_at', null)
            .maybeSingle();

        setShift(activeShift);

        if (activeShift) {
            fetchPendingOrders(activeShift.market_id);
        }
        setLoading(false);
    };

    const fetchPendingOrders = async (marketId: string) => {
        // CORREÇÃO AQUI: Em vez de buscar só 'pending', buscamos tudo que NÃO é 'paid'
        // Isso garante que pedidos antigos ou com status null apareçam
        const { data } = await supabase
            .from('orders')
            .select('*, restaurant_tables(table_number)')
            .eq('market_id', marketId)
            .neq('status', 'canceled')
            .neq('payment_status', 'paid') // <--- MUDANÇA CRÍTICA
            .gt('total_amount', 0) // Garante que não mostre pedidos vazios (R$ 0.00)
            .order('created_at', { ascending: false });

        setPendingOrders(data || []);
    };

    const handleSelectOrder = async (order: any) => {
        setSelectedOrder(order);
        setIsPaymentOpen(true);
        setLoadingItems(true);

        // Busca os itens do pedido para conferência
        const { data } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

        setSelectedOrderItems(data || []);
        setLoadingItems(false);
    };

    const handleOpenShift = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();

        const { error } = await supabase.from('cashier_shifts').insert({
            market_id: market?.id,
            user_id: user.id,
            start_amount: parseFloat(startAmount || "0"),
        });

        if (error) {
            toast({ title: "Erro ao abrir caixa", variant: "destructive" });
        } else {
            toast({ title: "Caixa Aberto!", className: "bg-green-600 text-white" });
            checkActiveShift();
        }
    };

    const handleCloseShift = async () => {
        if (!shift) return;
        if (!confirm("Deseja realmente fechar o caixa?")) return;
        await supabase.from('cashier_shifts').update({ closed_at: new Date().toISOString() }).eq('id', shift.id);
        toast({ title: "Caixa Fechado com Sucesso!" });
        setShift(null);
        setPendingOrders([]);
    };

    const processPayment = async () => {
        if (!selectedOrder || !shift) return;

        try {
            // 1. Registra Pagamento
            const { error: payError } = await supabase.from('payments').insert({
                order_id: selectedOrder.id,
                market_id: shift.market_id,
                shift_id: shift.id,
                amount: selectedOrder.total_amount,
                method: paymentMethod
            });
            if (payError) throw payError;

            // 2. Atualiza Status do Pedido
            await supabase.from('orders').update({
                payment_status: 'paid',
                status: 'delivered' // Finaliza o fluxo operacional também
            }).eq('id', selectedOrder.id);

            // 3. Libera Mesa
            if (selectedOrder.table_id) {
                await supabase.from('restaurant_tables').update({ is_occupied: false }).eq('id', selectedOrder.table_id);
            }

            toast({ title: "Pagamento Confirmado!", className: "bg-green-600 text-white" });
            setIsPaymentOpen(false);
            fetchPendingOrders(shift.market_id);

        } catch (error: any) {
            toast({ title: "Erro no pagamento", description: error.message, variant: "destructive" });
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    // --- TELA DE ABERTURA DE CAIXA ---
    if (!shift) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] animate-in zoom-in-95 duration-300">
                <div className="bg-white p-8 rounded-2xl shadow-xl border w-full max-w-md text-center space-y-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Caixa Fechado</h1>
                        <p className="text-gray-500">Informe o fundo de troco.</p>
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-sm font-medium">Valor Inicial (R$)</label>
                        <Input type="number" className="text-lg h-12" placeholder="0.00" value={startAmount} onChange={(e) => setStartAmount(e.target.value)} />
                    </div>
                    <Button size="lg" className="w-full h-12 gap-2" onClick={handleOpenShift}><Unlock className="w-5 h-5" /> Abrir Caixa</Button>
                </div>
            </div>
        );
    }

    // --- TELA DO CAIXA ABERTO ---
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-start bg-white p-6 rounded-xl border shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-green-100 text-green-700 border-green-200">Aberto</Badge>
                        <span className="text-xs text-gray-400">Desde {new Date(shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Frente de Caixa</h1>
                </div>
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={handleCloseShift}>Fechar Caixa</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COLUNA ESQUERDA: PEDIDOS PENDENTES */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" /> Aguardando Pagamento ({pendingOrders.length})
                    </h2>
                    {pendingOrders.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-xl text-gray-400 bg-gray-50">Nenhuma conta em aberto.</div>
                    ) : (
                        pendingOrders.map(order => (
                            <Card key={order.id} className="group hover:border-primary/50 transition-all cursor-pointer" onClick={() => handleSelectOrder(order)}>
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100">
                                            {order.restaurant_tables ? order.restaurant_tables.table_number : 'DLV'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{order.order_type === 'table' ? `Mesa ${order.restaurant_tables?.table_number}` : order.customer_name}</h3>
                                            <p className="text-sm text-gray-500">#{order.display_id} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-lg text-gray-900">R$ {order.total_amount.toFixed(2)}</span>
                                        <span className="text-xs text-primary font-medium flex items-center justify-end gap-1">Receber <ArrowRight className="w-3 h-3" /></span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* COLUNA DIREITA: RESUMO */}
                <div className="space-y-4">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader><CardTitle className="text-primary flex items-center gap-2"><DollarSign className="w-5 h-5" /> Fundo de Caixa</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-bold text-gray-900">R$ {Number(shift.start_amount).toFixed(2)}</div></CardContent>
                    </Card>
                </div>
            </div>

            {/* MODAL DE PAGAMENTO */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Finalizar Pedido #{selectedOrder?.display_id}</DialogTitle>
                        <CardDescription>Confira os itens antes de receber.</CardDescription>
                    </DialogHeader>

                    {/* Resumo do Pedido */}
                    <div className="bg-gray-50 p-4 rounded-lg border space-y-3 mb-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <ShoppingBag className="w-4 h-4" /> Resumo do Consumo
                        </div>
                        {loadingItems ? (
                            <div className="py-4 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto text-primary" /></div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                {selectedOrderItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <span className="font-bold mr-2">{item.quantity}x</span>
                                            <span className="text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="font-medium">R$ {item.total_price.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="border-t pt-2 mt-2 flex justify-between items-center">
                            <span className="text-gray-500">Total a Pagar</span>
                            <span className="text-2xl font-bold text-gray-900">R$ {selectedOrder?.total_amount?.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button variant={paymentMethod === 'credit' ? 'default' : 'outline'} onClick={() => setPaymentMethod('credit')} className="h-14 flex flex-col gap-1"><CreditCard className="w-5 h-5" /> Crédito</Button>
                        <Button variant={paymentMethod === 'debit' ? 'default' : 'outline'} onClick={() => setPaymentMethod('debit')} className="h-14 flex flex-col gap-1"><CreditCard className="w-5 h-5" /> Débito</Button>
                        <Button variant={paymentMethod === 'pix' ? 'default' : 'outline'} onClick={() => setPaymentMethod('pix')} className="h-14 flex flex-col gap-1"><div className="font-bold text-xs">PIX</div> Pix</Button>
                        <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className="h-14 flex flex-col gap-1"><Banknote className="w-5 h-5" /> Dinheiro</Button>
                    </div>

                    <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" onClick={processPayment}>Confirmar Pagamento</Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}