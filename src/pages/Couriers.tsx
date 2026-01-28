import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Bike, Trash2, Phone, User, Car, MapPin, Copy, ExternalLink, QrCode, IdCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Couriers() {
    const { toast } = useToast();
    const [couriers, setCouriers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketId, setMarketId] = useState<string | null>(null);

    // Modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    // ADICIONADO: novos campos cpf, birth_date, plate
    const [newCourier, setNewCourier] = useState({
        name: "",
        phone: "",
        cpf: "",
        birth_date: "",
        plate: "",
        vehicle_type: "motorcycle"
    });

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
        if (!marketId || !newCourier.name || !newCourier.cpf) {
            return toast({ title: "Nome e CPF são obrigatórios", variant: "destructive" });
        }
        try {
            const { error } = await supabase.from('couriers').insert({
                market_id: marketId,
                name: newCourier.name,
                phone: newCourier.phone,
                cpf: newCourier.cpf,              // NOVO
                birth_date: newCourier.birth_date,// NOVO
                plate: newCourier.plate,          // NOVO
                vehicle_type: newCourier.vehicle_type
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

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('couriers').update({ is_active: !currentStatus }).eq('id', id);
        fetchCouriers();
    };

    // Link para o App do Motoboy
    const driverLink = `${window.location.origin}/driver/${marketId}`;

    const copyLink = () => {
        navigator.clipboard.writeText(driverLink);
        toast({ title: "Link copiado!", description: "Envie para o motoboy acessar." });
    };

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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome Completo</label>
                                <Input placeholder="Ex: João da Silva" value={newCourier.name} onChange={e => setNewCourier({ ...newCourier, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">CPF (Login)</label>
                                    <Input placeholder="Apenas números" value={newCourier.cpf} onChange={e => setNewCourier({ ...newCourier, cpf: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Data Nasc.</label>
                                    <Input type="date" value={newCourier.birth_date} onChange={e => setNewCourier({ ...newCourier, birth_date: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Telefone</label>
                                    <Input placeholder="(11) 99999-9999" value={newCourier.phone} onChange={e => setNewCourier({ ...newCourier, phone: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Placa</label>
                                    <Input placeholder="ABC-1234" value={newCourier.plate} onChange={e => setNewCourier({ ...newCourier, plate: e.target.value })} />
                                </div>
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
                            <Button className="w-full" onClick={handleAdd}>Salvar Cadastro</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Link de Acesso do App (NOVO) */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-full"><QrCode className="w-6 h-6 text-blue-600" /></div>
                        <div>
                            <h3 className="font-bold text-blue-900">App do Entregador</h3>
                            <p className="text-sm text-blue-700">Envie este link para seus entregadores acessarem com o CPF.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" className="bg-white flex-1 md:flex-none" onClick={copyLink}><Copy className="w-4 h-4 mr-2" /> Copiar Link</Button>
                        <Button variant="outline" className="bg-white flex-1 md:flex-none" onClick={() => window.open(driverLink, '_blank')}><ExternalLink className="w-4 h-4 mr-2" /> Testar</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Entregadores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {couriers.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 border-2 border-dashed rounded-xl">
                        Nenhum entregador cadastrado.
                    </div>
                ) : (
                    couriers.map(courier => (
                        <Card key={courier.id} className="hover:shadow-md transition-all group">
                            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 rounded-full text-gray-600 border border-gray-200">
                                        {courier.vehicle_type === 'car' ? <Car className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900">{courier.name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[10px] font-normal text-gray-500 border-gray-300">
                                                {courier.plate || "Sem placa"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={courier.is_active ? "default" : "secondary"} className={courier.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                    {courier.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <IdCard className="w-4 h-4 text-gray-400" />
                                        <span>CPF: {courier.cpf}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span>{courier.phone || "--"}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-4 border-t pt-3">
                                    <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                        {/* Status simples por enquanto */}
                                        <span className="text-green-600 flex items-center gap-1"><User className="w-3 h-3" /> Disponível</span>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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