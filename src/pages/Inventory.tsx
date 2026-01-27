import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Package, AlertTriangle, ArrowDown, ArrowUp, Search } from "lucide-react";

export default function Inventory() {
    const { toast } = useToast();
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketId, setMarketId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Estados dos Modais
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);

    // Formulários
    const [newIng, setNewIng] = useState({ name: "", unit: "un", min_stock: "10", cost_price: "0" });
    const [adjustData, setAdjustData] = useState<any>({ id: null, amount: "", type: "purchase" });

    useEffect(() => {
        fetchIngredients();
    }, []);

    const fetchIngredients = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (market) {
            setMarketId(market.id);
            const { data } = await supabase
                .from('ingredients')
                .select('*')
                .eq('market_id', market.id)
                .order('name', { ascending: true });
            setIngredients(data || []);
        }
        setLoading(false);
    };

    const handleAddIngredient = async () => {
        if (!marketId || !newIng.name) return;
        try {
            const { error } = await supabase.from('ingredients').insert({
                market_id: marketId,
                name: newIng.name,
                unit: newIng.unit,
                min_stock: parseFloat(newIng.min_stock),
                cost_price: parseFloat(newIng.cost_price),
                current_stock: 0
            });
            if (error) throw error;

            toast({ title: "Ingrediente cadastrado!" });
            setNewIng({ name: "", unit: "un", min_stock: "10", cost_price: "0" });
            setIsAddOpen(false);
            fetchIngredients();
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        }
    };

    const handleStockAdjust = async () => {
        if (!adjustData.id || !adjustData.amount) return;
        try {
            const amount = parseFloat(adjustData.amount);
            const finalAmount = adjustData.type === 'purchase' ? amount : -amount;

            // 1. Log de Auditoria
            await supabase.from('stock_logs').insert({
                market_id: marketId,
                ingredient_id: adjustData.id,
                change_amount: finalAmount,
                reason: adjustData.type,
                user_id: (await supabase.auth.getUser()).data.user?.id
            });

            // 2. Atualização Manual
            const currentItem = ingredients.find(i => i.id === adjustData.id);
            const newStock = (Number(currentItem.current_stock) + finalAmount);

            await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', adjustData.id);

            toast({ title: "Estoque atualizado!" });
            setIsAdjustOpen(false);
            setAdjustData({ id: null, amount: "", type: "purchase" });
            fetchIngredients();
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        }
    };

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Estoque & Insumos</h1>
                    <p className="text-gray-500">Gerencie seus ingredientes e compras.</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Buscar..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-lg shadow-primary/20 gap-2"><Plus className="w-4 h-4" /> Novo Item</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Cadastrar Insumo</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nome</label>
                                    <Input placeholder="Ex: Pão de Hamburguer" value={newIng.name} onChange={e => setNewIng({ ...newIng, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Unidade</label>
                                        <Select value={newIng.unit} onValueChange={v => setNewIng({ ...newIng, unit: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="un">Unidade (un)</SelectItem>
                                                <SelectItem value="kg">Quilo (kg)</SelectItem>
                                                <SelectItem value="g">Grama (g)</SelectItem>
                                                <SelectItem value="l">Litro (l)</SelectItem>
                                                <SelectItem value="ml">Mililitro (ml)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Estoque Mínimo</label>
                                        <Input type="number" value={newIng.min_stock} onChange={e => setNewIng({ ...newIng, min_stock: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Custo Unitário Estimado (R$)</label>
                                    <Input type="number" value={newIng.cost_price} onChange={e => setNewIng({ ...newIng, cost_price: e.target.value })} />
                                </div>
                                <Button className="w-full" onClick={handleAddIngredient}>Salvar</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredIngredients.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 border-2 border-dashed rounded-xl">
                        Nenhum ingrediente encontrado. Cadastre o primeiro item.
                    </div>
                ) : (
                    filteredIngredients.map(item => {
                        const isLowStock = Number(item.current_stock) <= Number(item.min_stock);
                        return (
                            <Card key={item.id} className={`hover:shadow-md transition-all ${isLowStock ? 'border-red-200 bg-red-50/30' : ''}`}>
                                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><Package className="w-5 h-5" /></div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-gray-900 line-clamp-1" title={item.name}>{item.name}</CardTitle>
                                            <p className="text-xs text-gray-500">Min: {item.min_stock} {item.unit}</p>
                                        </div>
                                    </div>
                                    {isLowStock && <AlertTriangle className="w-5 h-5 text-red-500" title="Estoque Baixo" />}
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-end mt-2">
                                        <div>
                                            <span className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                {Number(item.current_stock).toLocaleString()}
                                            </span>
                                            <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { setAdjustData({ ...adjustData, id: item.id }); setIsAdjustOpen(true); }}>
                                            Ajustar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Movimentar Estoque</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant={adjustData.type === 'purchase' ? 'default' : 'outline'}
                                onClick={() => setAdjustData({ ...adjustData, type: 'purchase' })}
                                className={adjustData.type === 'purchase' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                                <ArrowUp className="mr-2 w-4 h-4" /> Entrada / Compra
                            </Button>
                            <Button
                                variant={adjustData.type === 'waste' ? 'default' : 'outline'}
                                onClick={() => setAdjustData({ ...adjustData, type: 'waste' })}
                                className={adjustData.type === 'waste' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                                <ArrowDown className="mr-2 w-4 h-4" /> Perda / Saída
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quantidade</label>
                            <Input type="number" placeholder="0.00" value={adjustData.amount} onChange={e => setAdjustData({ ...adjustData, amount: e.target.value })} />
                        </div>
                        <Button className="w-full" onClick={handleStockAdjust}>Confirmar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}