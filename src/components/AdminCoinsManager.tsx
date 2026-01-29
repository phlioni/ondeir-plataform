import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

export function AdminCoinsManager() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Busca solicitações pendentes e inclui o nome do restaurante (market)
            const { data, error } = await supabase
                .from('coin_requests')
                .select(`
          *,
          markets (
            name,
            owner_id
          )
        `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar solicitações");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            // Chama a função RPC segura que criamos no SQL
            const { error } = await supabase.rpc('approve_coin_request', { request_id: id });

            if (error) throw error;

            toast.success("Recarga aprovada e saldo liberado!");
            fetchRequests(); // Recarrega a lista
        } catch (error: any) {
            toast.error("Erro ao aprovar: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Tem certeza que deseja rejeitar esta solicitação?")) return;

        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('coin_requests')
                .update({ status: 'rejected' })
                .eq('id', id);

            if (error) throw error;

            toast.info("Solicitação rejeitada.");
            fetchRequests();
        } catch (error) {
            toast.error("Erro ao rejeitar");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Solicitações de Recarga (Pix)</CardTitle>
                        <CardDescription>Libere o saldo apenas após confirmar o recebimento no banco.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchRequests} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Restaurante</TableHead>
                            <TableHead>Valor (R$)</TableHead>
                            <TableHead>Coins</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhuma solicitação pendente no momento.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell>{new Date(req.created_at).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="font-medium">
                                        {req.markets?.name || "Restaurante Desconhecido"}
                                    </TableCell>
                                    <TableCell className="text-green-600 font-bold">
                                        R$ {(req.amount_brl || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                            {req.amount_coins} Coins
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">Pendente</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleReject(req.id)}
                                                disabled={!!processingId}
                                            >
                                                {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleApprove(req.id)}
                                                disabled={!!processingId}
                                            >
                                                {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                Liberar Saldo
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}