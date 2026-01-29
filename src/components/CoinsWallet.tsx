import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard, Copy } from "lucide-react";
import { toast } from "sonner";
// Se você não criou o arquivo de types, pode remover a linha abaixo e usar 'any' no useState
// import { CoinTransaction, CoinRequest } from "@/types/coins"; 

export function CoinsWallet() {
    const { user } = useAuth();
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<any[]>([]); // Usando any para evitar erros de tipo se o arquivo types faltar
    const [requests, setRequests] = useState<any[]>([]);
    const [marketId, setMarketId] = useState<string | null>(null);

    // Estado para o Modal de Compra
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const [purchaseAmount, setPurchaseAmount] = useState<string>("50"); // Valor em Reais
    const coinsRate = 20; // 1 Real = 20 Coins

    useEffect(() => {
        if (user) {
            fetchMarketData();
        }
    }, [user]);

    const fetchMarketData = async () => {
        try {
            // 1. Buscar o ID do market e o saldo diretamente onde o user é o owner
            const { data: marketData, error: marketError } = await supabase
                .from('markets')
                .select('id, coin_balance')
                .eq('owner_id', user?.id)
                .single();

            if (marketError || !marketData) {
                console.error("Market not found for user owner_id:", user?.id);
                return;
            }

            setMarketId(marketData.id);
            setBalance(marketData.coin_balance || 0);

            // 2. Buscar Histórico de Transações usando o ID do mercado encontrado
            const { data: txData } = await supabase
                .from('coin_transactions')
                .select('*')
                .eq('market_id', marketData.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (txData) setTransactions(txData);

            // 3. Buscar Solicitações de Recarga
            const { data: reqData } = await supabase
                .from('coin_requests')
                .select('*')
                .eq('market_id', marketData.id)
                .order('created_at', { ascending: false });

            if (reqData) setRequests(reqData);

        } catch (error) {
            console.error("Error fetching coins data:", error);
        }
    };

    const handlePurchaseRequest = async () => {
        if (!marketId) return;

        const brlValue = parseFloat(purchaseAmount);
        const coinsValue = brlValue * coinsRate;

        try {
            const { error } = await supabase
                .from('coin_requests')
                .insert({
                    market_id: marketId,
                    amount_brl: brlValue,
                    amount_coins: coinsValue,
                    status: 'pending'
                });

            if (error) throw error;

            toast.success("Solicitação de recarga enviada!", {
                description: "Aguarde a liberação do administrador após o pagamento."
            });
            setIsPurchaseOpen(false);
            fetchMarketData(); // Atualiza a lista de solicitações
        } catch (error) {
            toast.error("Erro ao solicitar recarga");
            console.error(error);
        }
    };

    const copyPixKey = () => {
        navigator.clipboard.writeText("00.000.000/0001-00"); // Sua chave PIX real aqui
        toast.success("Chave Pix copiada!");
    };

    return (
        <div className="space-y-6">
            {/* Cards de Topo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                        <Coins className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{balance} Coins</div>
                        <p className="text-xs text-muted-foreground">
                            Equivalente a R$ {(balance * 0.05).toFixed(2)} em descontos
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary-foreground/90">Recarregar</CardTitle>
                        <CreditCard className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full">Comprar Coins</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Recarregar Coins</DialogTitle>
                                    <DialogDescription>
                                        Adquira pacotes de moedas para fidelizar seus clientes.
                                        <br />Taxa de conversão: <strong>R$ 1,00 = 20 Coins</strong>.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="amount" className="text-right">Valor (R$)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            value={purchaseAmount}
                                            onChange={(e) => setPurchaseAmount(e.target.value)}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Você Recebe</Label>
                                        <div className="col-span-3 font-bold text-lg text-green-600">
                                            {(parseFloat(purchaseAmount || "0") * coinsRate).toFixed(0)} Coins
                                        </div>
                                    </div>

                                    <div className="bg-muted p-4 rounded-md space-y-2">
                                        <p className="text-sm font-medium">Dados para Pagamento (Pix)</p>
                                        <div className="flex items-center justify-between bg-background p-2 rounded border">
                                            <code className="text-xs">00.000.000/0001-00</code>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyPixKey}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">O saldo será liberado mediante comprovante.</p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>Cancelar</Button>
                                    <Button onClick={handlePurchaseRequest}>Confirmar Pedido</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>

            {/* Abas de Histórico */}
            <Tabs defaultValue="transactions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="transactions">Histórico de Uso</TabsTrigger>
                    <TabsTrigger value="requests">Minhas Recargas</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Últimas Movimentações</CardTitle>
                            <CardDescription>Entradas e saídas de moedas do seu estabelecimento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Nenhuma movimentação encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactions.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell>{new Date(tx.created_at).toLocaleDateString('pt-BR')}</TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.transaction_type === 'redemption' || tx.transaction_type === 'bonus' ? 'secondary' : 'default'}>
                                                        {tx.transaction_type === 'purchase' && 'Compra'}
                                                        {tx.transaction_type === 'bonus' && 'Cashback Cliente'}
                                                        {tx.transaction_type === 'redemption' && 'Recebido de Cliente'}
                                                        {tx.transaction_type === 'manual_adjustment' && 'Ajuste'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{tx.description || '-'}</TableCell>
                                                <TableCell className={`text-right font-medium ${(tx.amount || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {(tx.amount || 0) > 0 ? '+' : ''}{tx.amount || 0}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="requests" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Solicitações de Compra</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Valor (R$)</TableHead>
                                        <TableHead>Coins Solicitados</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Nenhuma solicitação encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell>{new Date(req.created_at).toLocaleDateString('pt-BR')}</TableCell>

                                                {/* AQUI ESTAVA O ERRO: Blindagem adicionada com ( || 0 ) */}
                                                <TableCell>R$ {(req.amount_brl || 0).toFixed(2)}</TableCell>
                                                <TableCell>{req.amount_coins || 0}</TableCell>

                                                <TableCell>
                                                    <Badge variant={
                                                        req.status === 'approved' ? 'default' :
                                                            req.status === 'rejected' ? 'destructive' : 'outline'
                                                    }>
                                                        {req.status === 'approved' && 'Aprovado'}
                                                        {req.status === 'pending' && 'Pendente'}
                                                        {req.status === 'rejected' && 'Rejeitado'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}