import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Bike, Truck, DollarSign, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DispatchModalProps {
    order: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function DispatchModal({ order, isOpen, onClose, onSuccess }: DispatchModalProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<'choose' | 'internal' | 'external'>('choose');
    const [loading, setLoading] = useState(false);

    // Dados
    const [couriers, setCouriers] = useState<any[]>([]);
    const [selectedCourierId, setSelectedCourierId] = useState<string>("");
    const [integrations, setIntegrations] = useState<any[]>([]);

    // Cotação Simulada (No futuro, viria da Edge Function)
    const [quotes, setQuotes] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && order?.market_id) {
            fetchData();
        }
    }, [isOpen, order]);

    const fetchData = async () => {
        // 1. Busca Motoboys Próprios
        const { data: couriersData } = await supabase
            .from('couriers')
            .select('*')
            .eq('market_id', order.market_id)
            .eq('is_active', true);
        setCouriers(couriersData || []);

        // 2. Busca Integrações Ativas
        const { data: intData } = await supabase
            .from('market_integrations')
            .select('*')
            .eq('market_id', order.market_id)
            .eq('is_active', true);
        setIntegrations(intData || []);

        // 3. Simula Cotação se tiver integração
        if (intData && intData.length > 0) {
            // MOCK: Em produção, chamaríamos supabase.functions.invoke('quote-delivery')
            setQuotes(intData.map(i => ({
                provider: i.provider,
                price: 12.50 + Math.random() * 5, // Preço fake
                eta: 10 + Math.floor(Math.random() * 15) // Tempo fake
            })));
        }
    };

    const handleInternalDispatch = async () => {
        if (!selectedCourierId) return toast({ title: "Selecione um motoboy", variant: "destructive" });
        setLoading(true);

        await supabase.from('orders').update({
            status: 'ready',
            courier_id: selectedCourierId,
            delivery_provider: 'own_fleet'
        }).eq('id', order.id);

        toast({ title: "Despachado para Frota Própria" });
        setLoading(false);
        onSuccess();
    };

    const handleExternalDispatch = async (provider: string) => {
        setLoading(true);
        // MOCK: Em produção, chamaríamos supabase.functions.invoke('request-delivery')
        // Aqui simulamos que a Mottu aceitou

        const fakeTrackingUrl = `https://tracking.${provider}.com/${order.id}`;
        const fakeExternalId = `ext_${Math.floor(Math.random() * 10000)}`;

        await supabase.from('orders').update({
            status: 'ready',
            delivery_provider: provider,
            external_delivery_id: fakeExternalId,
            external_tracking_url: fakeTrackingUrl,
            // O courier_id fica NULL pois não é nosso funcionário
            courier_id: null
        }).eq('id', order.id);

        toast({ title: `Solicitação enviada para ${provider.toUpperCase()}` });
        setLoading(false);
        onSuccess();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Despachar Pedido #{order?.display_id}</DialogTitle>
                    <DialogDescription>Escolha como deseja realizar esta entrega.</DialogDescription>
                </DialogHeader>

                {step === 'choose' && (
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Card
                            className="cursor-pointer hover:border-primary hover:bg-blue-50 transition-all flex flex-col items-center justify-center p-6 gap-2"
                            onClick={() => setStep('internal')}
                        >
                            <div className="bg-blue-100 p-3 rounded-full"><Bike className="w-6 h-6 text-blue-600" /></div>
                            <h3 className="font-bold text-gray-900">Frota Própria</h3>
                            <p className="text-xs text-center text-gray-500">{couriers.length} motoboys disponíveis</p>
                        </Card>

                        <Card
                            className={`cursor-pointer hover:border-primary hover:bg-orange-50 transition-all flex flex-col items-center justify-center p-6 gap-2 ${integrations.length === 0 ? 'opacity-50 grayscale' : ''}`}
                            onClick={() => integrations.length > 0 ? setStep('external') : toast({ title: "Nenhuma integração ativa", description: "Configure em Ajustes." })}
                        >
                            <div className="bg-orange-100 p-3 rounded-full"><Truck className="w-6 h-6 text-orange-600" /></div>
                            <h3 className="font-bold text-gray-900">Parceiros</h3>
                            <p className="text-xs text-center text-gray-500">{integrations.length > 0 ? `${integrations.length} opções` : 'Não configurado'}</p>
                        </Card>
                    </div>
                )}

                {step === 'internal' && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Selecione o Entregador</label>
                            <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                                <SelectTrigger><SelectValue placeholder="Escolher motoboy..." /></SelectTrigger>
                                <SelectContent>
                                    {couriers.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} {c.is_busy ? '(Ocupado)' : '(Livre)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" className="flex-1" onClick={() => setStep('choose')}>Voltar</Button>
                            <Button className="flex-1" onClick={handleInternalDispatch} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : "Confirmar Envio"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'external' && (
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-500 mb-2">Cotações em tempo real (Simulado):</p>
                        {quotes.map(quote => (
                            <Card key={quote.provider} className="flex justify-between items-center p-3 hover:bg-gray-50 cursor-pointer border-l-4 border-l-orange-500" onClick={() => handleExternalDispatch(quote.provider)}>
                                <div>
                                    <h4 className="font-bold capitalize">{quote.provider}</h4>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quote.eta} min</span>
                                        <span className="flex items-center gap-1 font-bold text-green-600"><DollarSign className="w-3 h-3" /> R$ {quote.price.toFixed(2)}</span>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline">Solicitar</Button>
                            </Card>
                        ))}
                        <Button variant="ghost" className="w-full mt-2" onClick={() => setStep('choose')}>Voltar</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}