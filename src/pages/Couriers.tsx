import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox"; // Certifique-se de ter este componente
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Bike, Trash2, Phone, Car, Copy, ExternalLink, QrCode, IdCard, DollarSign, AlertCircle, CheckCircle2, Calendar, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Couriers() {
    const { toast } = useToast();
    const [couriers, setCouriers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketId, setMarketId] = useState<string | null>(null);

    // Modal Add
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCourier, setNewCourier] = useState({ name: "", phone: "", cpf: "", birth_date: "", plate: "", vehicle_type: "motorcycle" });

    // Modal Financeiro & Confirmação
    const [selectedCourier, setSelectedCourier] = useState<any>(null);
    const [financials, setFinancials] = useState<any[]>([]);
    const [isFinanceOpen, setIsFinanceOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Novo estado para o modal de confirmação
    const [loadingFinance, setLoadingFinance] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false); // Estado de loading do botão de pagar

    // Seleção de Pagamento
    const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

    useEffect(() => {
        fetchCouriers();
    }, []);

    const fetchCouriers = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();

        if (market) {
            setMarketId(market.id);
            const { data } = await supabase.from('couriers').select('*').eq('market_id', market.id).order('name', { ascending: true });
            setCouriers(data || []);
        }
        setLoading(false);
    };

    // --- LÓGICA DE SELEÇÃO ---
    const togglePaymentSelection = (orderId: string) => {
        setSelectedPayments(prev =>
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const toggleAllPayments = () => {
        const pendingIds = financials.filter(f => !f.courier_paid).map(f => f.id);
        if (selectedPayments.length === pendingIds.length) {
            setSelectedPayments([]); // Desmarca tudo
        } else {
            setSelectedPayments(pendingIds); // Marca tudo
        }
    };

    // --- FUNÇÕES FINANCEIRAS ---
    const openFinance = async (courier: any) => {
        setSelectedCourier(courier);
        setIsFinanceOpen(true);
        setLoadingFinance(true);
        setSelectedPayments([]); // Limpa seleção ao abrir

        // Busca entregas finalizadas
        const { data } = await supabase
            .from('orders')
            .select('id, display_id, created_at, delivery_fee, courier_paid, total_amount')
            .eq('courier_id', courier.id)
            .eq('status', 'delivered')
            .order('created_at', { ascending: false });

        setFinancials(data || []);
        setLoadingFinance(false);
    };

    // Passo 1: Abrir modal de confirmação
    const handleRequestPayment = () => {
        if (selectedPayments.length === 0) {
            return toast({ title: "Selecione pelo menos uma entrega", variant: "destructive" });
        }
        setIsConfirmOpen(true);
    };

    // Passo 2: Executar pagamento no banco
    const executePayment = async () => {
        setProcessingPayment(true);

        const { error } = await supabase
            .from('orders')
            .update({ courier_paid: true })
            .in('id', selectedPayments);

        if (error) {
            toast({ title: "Erro ao processar", variant: "destructive" });
        } else {
            toast({ title: "Pagamento Registrado!", className: "bg-green-600 text-white" });
            setIsConfirmOpen(false); // Fecha confirmação
            openFinance(selectedCourier); // Recarrega dados e fecha modal de confirmação implicitamente
        }
        setProcessingPayment(false);
    };

    // --- CADASTRO E DELEÇÃO ---
    const handleAdd = async () => {
        if (!marketId || !newCourier.name || !newCourier.cpf) {
            return toast({ title: "Nome e CPF são obrigatórios", variant: "destructive" });
        }
        try {
            const { error } = await supabase.from('couriers').insert({
                market_id: marketId, ...newCourier
            });
            if (error) throw error;
            toast({ title: "Entregador cadastrado!" });
            setNewCourier({ name: "", phone: "", cpf: "", birth_date: "", plate: "", vehicle_type: "motorcycle" });
            setIsAddOpen(false);
            fetchCouriers();
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover este entregador?")) return;
        await supabase.from('couriers').delete().eq('id', id);
        fetchCouriers();
    };

    const copyLink = () => {
        const link = `${window.location.origin}/driver/${marketId}`;
        navigator.clipboard.writeText(link);
        toast({ title: "Link copiado!", description: "Envie para o motoboy acessar." });
    };

    // Cálculos
    const totalPending = financials.filter(f => !f.courier_paid).reduce((acc, curr) => acc + (Number(curr.delivery_fee) || 0), 0);
    const totalPaid = financials.filter(f => f.courier_paid).reduce((acc, curr) => acc + (Number(curr.delivery_fee) || 0), 0);

    // Cálculo da Seleção Atual (Para o Modal de Confirmação)
    const selectedTotalValue = financials
        .filter(f => selectedPayments.includes(f.id))
        .reduce((acc, curr) => acc + (Number(curr.delivery_fee) || 0), 0);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Entregadores</h1>
                    <p className="text-gray-500">Gerencie sua frota própria.</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-primary/20 gap-2">
                            <Plus className="w-4 h-4" /> Novo Entregador
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>Cadastrar Entregador</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2"><label className="text-sm font-medium">Nome Completo</label><Input placeholder="Ex: João da Silva" value={newCourier.name} onChange={e => setNewCourier({ ...newCourier, name: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-sm font-medium">CPF (Login)</label><Input placeholder="Apenas números" value={newCourier.cpf} onChange={e => setNewCourier({ ...newCourier, cpf: e.target.value })} /></div>
                                <div className="space-y-2"><label className="text-sm font-medium">Data Nasc.</label><Input type="date" value={newCourier.birth_date} onChange={e => setNewCourier({ ...newCourier, birth_date: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-sm font-medium">Telefone</label><Input placeholder="(11) 99999-9999" value={newCourier.phone} onChange={e => setNewCourier({ ...newCourier, phone: e.target.value })} /></div>
                                <div className="space-y-2"><label className="text-sm font-medium">Placa</label><Input placeholder="ABC-1234" value={newCourier.plate} onChange={e => setNewCourier({ ...newCourier, plate: e.target.value })} /></div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Veículo</label>
                                <Select value={newCourier.vehicle_type} onValueChange={v => setNewCourier({ ...newCourier, vehicle_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="motorcycle">Moto</SelectItem><SelectItem value="bike">Bicicleta</SelectItem><SelectItem value="car">Carro</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full" onClick={handleAdd}>Salvar Cadastro</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-full"><QrCode className="w-6 h-6 text-blue-600" /></div>
                        <div><h3 className="font-bold text-blue-900">App do Entregador</h3><p className="text-sm text-blue-700">Envie o link para seus entregadores.</p></div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" className="bg-white flex-1 md:flex-none" onClick={copyLink}><Copy className="w-4 h-4 mr-2" /> Copiar Link</Button>
                        <Button variant="outline" className="bg-white flex-1 md:flex-none" onClick={() => window.open(`${window.location.origin}/driver/${marketId}`, '_blank')}><ExternalLink className="w-4 h-4 mr-2" /> Testar</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {couriers.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 border-2 border-dashed rounded-xl">Nenhum entregador cadastrado.</div>
                ) : (
                    couriers.map(courier => (
                        <Card key={courier.id} className="hover:shadow-md transition-all group border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 rounded-full text-gray-600 border border-gray-200">
                                        {courier.vehicle_type === 'car' ? <Car className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900">{courier.name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[10px] font-normal text-gray-500 border-gray-300">{courier.plate || "Sem placa"}</Badge></div>
                                    </div>
                                </div>
                                <Badge variant={courier.is_active ? "default" : "secondary"} className={courier.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>{courier.is_active ? "Ativo" : "Inativo"}</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                    <div className="flex items-center gap-2"><IdCard className="w-4 h-4 text-gray-400" /><span>CPF: {courier.cpf}</span></div>
                                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{courier.phone || "--"}</span></div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border border-green-200" onClick={() => openFinance(courier)}>
                                        <DollarSign className="w-4 h-4 mr-2" /> Financeiro
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-red-600" onClick={() => handleDelete(courier.id)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* MODAL FINANCEIRO PRINCIPAL */}
            <Dialog open={isFinanceOpen} onOpenChange={setIsFinanceOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Financeiro: {selectedCourier?.name}
                        </DialogTitle>
                        <DialogDescription>Controle de repasse de taxas de entrega.</DialogDescription>
                    </DialogHeader>

                    {loadingFinance ? (
                        <div className="py-10 flex justify-center"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col items-center">
                                    <span className="text-sm font-bold text-red-600 uppercase flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Pendente (A Pagar)</span>
                                    <span className="text-3xl font-black text-red-700">R$ {totalPending.toFixed(2)}</span>
                                </div>
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center">
                                    <span className="text-sm font-bold text-green-600 uppercase flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Já Pago</span>
                                    <span className="text-3xl font-black text-green-700">R$ {totalPaid.toFixed(2)}</span>
                                </div>
                            </div>

                            <Tabs defaultValue="pending" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="pending">Pendentes ({financials.filter(f => !f.courier_paid).length})</TabsTrigger>
                                    <TabsTrigger value="paid">Histórico Pago</TabsTrigger>
                                </TabsList>

                                <TabsContent value="pending" className="mt-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">
                                                    <Checkbox
                                                        checked={selectedPayments.length > 0 && selectedPayments.length === financials.filter(f => !f.courier_paid).length}
                                                        onCheckedChange={toggleAllPayments}
                                                    />
                                                </TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Pedido</TableHead>
                                                <TableHead className="text-right">Taxa (R$)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {financials.filter(f => !f.courier_paid).map(item => (
                                                <TableRow key={item.id} className={selectedPayments.includes(item.id) ? "bg-green-50" : ""}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedPayments.includes(item.id)}
                                                            onCheckedChange={() => togglePaymentSelection(item.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString().slice(0, 5)}</TableCell>
                                                    <TableCell className="font-bold">#{item.display_id}</TableCell>
                                                    <TableCell className="text-right font-medium text-gray-900">R$ {item.delivery_fee.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {financials.filter(f => !f.courier_paid).length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-gray-500">Tudo pago!</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="paid" className="mt-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Pedido</TableHead>
                                                <TableHead className="text-right">Taxa (R$)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {financials.filter(f => f.courier_paid).slice(0, 10).map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-gray-500">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell>#{item.display_id}</TableCell>
                                                    <TableCell className="text-right text-gray-500 line-through">R$ {item.delivery_fee.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    <DialogFooter>
                        {selectedPayments.length > 0 && (
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-lg h-12 shadow-xl shadow-green-100" onClick={handleRequestPayment}>
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Pagar Selecionados (R$ {selectedTotalValue.toFixed(2)})
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL DE CONFIRMAÇÃO (SUBSTITUI O POPUP DO NAVEGADOR) */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex flex-col items-center gap-2 text-center pb-2 border-b">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            Confirmar Pagamento
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4 text-center">
                        <p className="text-gray-600">Você está prestes a registrar o pagamento para <b>{selectedCourier?.name}</b>.</p>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500">Entregas selecionadas:</span>
                                <span className="font-bold">{selectedPayments.length}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
                                <span>Total:</span>
                                <span className="text-green-600">R$ {selectedTotalValue.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg text-left">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Essa ação marcará as entregas como "Pagas" e não poderá ser desfeita facilmente.
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="w-full">Cancelar</Button>
                        <Button onClick={executePayment} className="w-full bg-green-600 hover:bg-green-700" disabled={processingPayment}>
                            {processingPayment ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Pagamento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}