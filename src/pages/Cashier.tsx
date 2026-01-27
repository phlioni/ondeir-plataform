import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Unlock, DollarSign, CreditCard, Wallet, Banknote, ArrowRight } from "lucide-react";

export default function Cashier() {
    const { toast } = useToast();
    const [shift, setShift] = useState<any>(null); // Turno atual
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados de Ação
    const [startAmount, setStartAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("credit");
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    useEffect(() => {
        checkActiveShift();
    }, []);

    // 1. Verifica se tem caixa aberto
    const checkActiveShift = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Busca turno aberto (closed_at is null)
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

    // 2. Busca pedidos que precisam ser pagos
    const fetchPendingOrders = async (marketId: string) => {
        const { data } = await supabase
            .from('orders')
            .select('*, restaurant_tables(table_number)')
            .eq('market_id', marketId)
            .neq('status', 'canceled')
            .eq('payment_status', 'pending')
            .gt('total_amount', 0) // Só pedidos com valor
            .order('created_at', { ascending: false });

        setPendingOrders(data || []);
    };

    // Ação: Abrir Caixa
    const handleOpenShift = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Pega o ID do mercado (simplificado)
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

    // Ação: Fechar Caixa
    const handleCloseShift = async () => {
        if (!shift) return;
        // Aqui poderia ter uma conferência de valores, vamos fazer fechamento simples por enquanto
        await supabase.from('cashier_shifts').update({ closed_at: new Date().toISOString() }).eq('id', shift.id);
        toast({ title: "Caixa Fechado com Sucesso!" });
        setShift(null);
        setPendingOrders([]);
    };

    // Ação: Receber Pagamento
    const processPayment = async () => {
        if (!selectedOrder || !shift) return;

        try {
            // 1. Registra o Pagamento
            const { error: payError } = await supabase.from('payments').insert({
                order_id: selectedOrder.id,
                market_id: shift.market_id,
                shift_id: shift.id,
                amount: selectedOrder.total_amount,
                method: paymentMethod
            });
            if (payError) throw payError;

            // 2. Atualiza o Pedido para Pago e Finalizado
            await supabase.from('orders').update({
                payment_status: 'paid',
                status: 'delivered' // Garante que sai do KDS/Kanban se ainda não tiver saído
            }).eq('id', selectedOrder.id);

            // 3. Libera a mesa (se for mesa)
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

    // --- TELA 1: CAIXA FECHADO ---
    if (!shift) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] animate-in zoom-in-95 duration-300">
                <div className="bg-white p-8 rounded-2xl shadow-xl border w-full max-w-md text-center space-y-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Caixa Fechado</h1>
                        <p className="text-gray-500">Informe o fundo de troco para iniciar as vendas.</p>
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-sm font-medium">Fundo de Troco (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500 font-bold">R$</span>
                            <Input
                                type="number"
                                className="pl-10 text-lg h-12"
                                placeholder="0.00"
                                value={startAmount}
                                onChange={(e) => setStartAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button size="lg" className="w-full h-12 text-lg gap-2" onClick={handleOpenShift}>
                        <Unlock className="w-5 h-5" /> Abrir Caixa
                    </Button>
                </div>
            </div>
        );
    }

    // --- TELA 2: CAIXA ABERTO (LISTA DE COBRANÇA) ---
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER DO CAIXA */}
            <div className="flex justify-between items-start bg-white p-6 rounded-xl border shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Caixa Aberto</Badge>
                        <span className="text-sm text-gray-400 text-xs">Iniciado às {new Date(shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Frente de Caixa</h1>
                </div>
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={handleCloseShift}>
                    Fechar Caixa
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LISTA DE PEDIDOS A PAGAR */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" /> Aguardando Pagamento ({pendingOrders.length})
                    </h2>

                    {pendingOrders.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-xl text-gray-400 bg-gray-50">
                            Nenhuma conta em aberto no momento.
                        </div>
                    ) : (
                        pendingOrders.map(order => (
                            <Card key={order.id} className="group hover:border-primary/50 transition-all cursor-pointer" onClick={() => { setSelectedOrder(order); setIsPaymentOpen(true); }}>
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100">
                                            {order.restaurant_tables ? order.restaurant_tables.table_number : 'DLV'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {order.order_type === 'table' ? `Mesa ${order.restaurant_tables?.table_number}` : order.customer_name}
                                            </h3>
                                            <p className="text-sm text-gray-500">Pedido #{order.display_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-lg text-gray-900">R$ {order.total_amount.toFixed(2)}</span>
                                        <span className="text-xs text-primary font-medium flex items-center justify-end gap-1">
                                            Receber <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* RESUMO DO TURNO (Lateral) */}
                <div className="space-y-4">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-primary flex items-center gap-2"><DollarSign className="w-5 h-5" /> Fundo de Caixa</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">R$ {Number(shift.start_amount).toFixed(2)}</div>
                            <p className="text-sm text-gray-500">Saldo inicial</p>
                        </CardContent>
                    </Card>

                    {/* Placeholder para parciais - Implementaremos soma real na próxima etapa */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Vendas neste turno</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm"><span>Dinheiro</span><span className="font-bold">R$ 0,00</span></div>
                                <div className="flex justify-between text-sm"><span>Cartão</span><span className="font-bold">R$ 0,00</span></div>
                                <div className="flex justify-between text-sm"><span>Pix</span><span className="font-bold">R$ 0,00</span></div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold"><span>Total</span><span>R$ 0,00</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* MODAL DE PAGAMENTO */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Finalizar Pagamento</DialogTitle>
                        <CardDescription>
                            Confirmar recebimento do Pedido #{selectedOrder?.display_id}
                        </CardDescription>
                    </DialogHeader>

                    <div className="py-4 text-center">
                        <span className="text-sm text-gray-500">Valor Total</span>
                        <div className="text-4xl font-bold text-gray-900 my-2">
                            R$ {selectedOrder?.total_amount?.toFixed(2)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button variant={paymentMethod === 'credit' ? 'default' : 'outline'} onClick={() => setPaymentMethod('credit')} className="h-14 flex flex-col gap-1">
                            <CreditCard className="w-5 h-5" /> Crédito
                        </Button>
                        <Button variant={paymentMethod === 'debit' ? 'default' : 'outline'} onClick={() => setPaymentMethod('debit')} className="h-14 flex flex-col gap-1">
                            <CreditCard className="w-5 h-5" /> Débito
                        </Button>
                        <Button variant={paymentMethod === 'pix' ? 'default' : 'outline'} onClick={() => setPaymentMethod('pix')} className="h-14 flex flex-col gap-1">
                            <div className="font-bold text-xs">PIX</div> Pix
                        </Button>
                        <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className="h-14 flex flex-col gap-1">
                            <Banknote className="w-5 h-5" /> Dinheiro
                        </Button>
                    </div>

                    <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" onClick={processPayment}>
                        Confirmar Pagamento
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}