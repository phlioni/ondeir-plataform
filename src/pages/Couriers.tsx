import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Bike, Trash2, Phone, User, Car, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Couriers() {
    const { toast } = useToast();
    const [couriers, setCouriers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketId, setMarketId] = useState<string | null>(null);

    // Modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCourier, setNewCourier] = useState({ name: "", phone: "", vehicle_type: "motorcycle" });

    useEffect(() => {
        fetchCouriers();
    }, []);

    const fetchCouriers = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();

        if (market) {
            setMarketId(market.id);
            const { data } = await supabase
                .from('couriers')
                .select('*')
                .eq('market_id', market.id)
                .order('name', { ascending: true });
            setCouriers(data || []);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!marketId || !newCourier.name) return;
        try {
            const { error } = await supabase.from('couriers').insert({
                market_id: marketId,
                name: newCourier.name,
                phone: newCourier.phone,
                vehicle_type: newCourier.vehicle_type
            });
            if (error) throw error;

            toast({ title: "Entregador cadastrado!" });
            setNewCourier({ name: "", phone: "", vehicle_type: "motorcycle" });
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

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('couriers').update({ is_active: !currentStatus }).eq('id', id);
        fetchCouriers();
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Entregadores</h1>
                    <p className="text-gray-500">Gerencie sua frota de entrega.</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-primary/20 gap-2">
                            <Plus className="w-4 h-4" /> Novo Entregador
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Cadastrar Entregador</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome Completo</label>
                                <Input placeholder="Ex: João da Silva" value={newCourier.name} onChange={e => setNewCourier({ ...newCourier, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Telefone / WhatsApp</label>
                                <Input placeholder="(11) 99999-9999" value={newCourier.phone} onChange={e => setNewCourier({ ...newCourier, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Veículo</label>
                                <Select value={newCourier.vehicle_type} onValueChange={v => setNewCourier({ ...newCourier, vehicle_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="motorcycle">Moto</SelectItem>
                                        <SelectItem value="bike">Bicicleta</SelectItem>
                                        <SelectItem value="car">Carro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full" onClick={handleAdd}>Salvar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {couriers.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 border-2 border-dashed rounded-xl">
                        Nenhum entregador cadastrado.
                    </div>
                ) : (
                    couriers.map(courier => (
                        <Card key={courier.id} className="hover:shadow-md transition-all">
                            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-full text-blue-600 border border-blue-100">
                                        {courier.vehicle_type === 'car' ? <Car className="w-5 h-5" /> : courier.vehicle_type === 'bike' ? <Bike className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900">{courier.name}</CardTitle>
                                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {courier.phone || "Sem telefone"}</p>
                                    </div>
                                </div>
                                <Badge variant={courier.is_active ? "default" : "secondary"} className={courier.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                    {courier.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center mt-2 border-t pt-3">
                                    <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                        {courier.is_busy ? <span className="text-orange-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Em entrega</span> : <span className="text-green-600 flex items-center gap-1"><User className="w-3 h-3" /> Disponível</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toggleStatus(courier.id, courier.is_active)}>
                                            {courier.is_active ? "Desativar" : "Ativar"}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDelete(courier.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}