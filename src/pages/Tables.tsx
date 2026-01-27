import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Armchair, QrCode } from "lucide-react";
import OrderSheet from "@/components/OrderSheet"; // Importação do componente de pedido

export default function Tables() {
    const { toast } = useToast();
    const [tables, setTables] = useState<any[]>([]);
    const [marketId, setMarketId] = useState<string | null>(null);
    const [newTable, setNewTable] = useState({ number: "", capacity: "4" });
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Estados para o OrderSheet (Comanda Digital)
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (market) {
            setMarketId(market.id);
            const { data } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('market_id', market.id)
                .order('table_number', { ascending: true });
            setTables(data || []);
        }
        setLoading(false);
    };

    const handleAddTable = async () => {
        if (!marketId || !newTable.number) return;
        try {
            const { error } = await supabase.from('restaurant_tables').insert({
                market_id: marketId,
                table_number: newTable.number,
                capacity: parseInt(newTable.capacity)
            });
            if (error) throw error;
            toast({ title: "Mesa criada!" });
            setNewTable({ number: "", capacity: "4" });
            setIsDialogOpen(false);
            fetchTables();
        } catch (error: any) {
            toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteTable = async (id: string) => {
        if (!confirm("Tem certeza? Isso apagará o histórico desta mesa.")) return;
        await supabase.from('restaurant_tables').delete().eq('id', id);
        fetchTables();
    };

    // Função para abrir o OrderSheet ao clicar na mesa
    const handleTableClick = (table: any) => {
        setSelectedTable(table);
        setIsSheetOpen(true);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Salão e Mesas</h1>
                    <p className="text-gray-500">Clique na mesa para abrir o pedido.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-primary/20"><Plus className="w-4 h-4 mr-2" /> Nova Mesa</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Adicionar Mesa</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Mesa</label>
                                <Input placeholder="Ex: 10, Varanda A" value={newTable.number} onChange={e => setNewTable({ ...newTable, number: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Capacidade</label>
                                <Input type="number" value={newTable.capacity} onChange={e => setNewTable({ ...newTable, capacity: e.target.value })} />
                            </div>
                            <Button className="w-full" onClick={handleAddTable}>Salvar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.length === 0 && !loading && (
                    <div className="col-span-full text-center py-20 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50">
                        Nenhuma mesa cadastrada. Adicione sua primeira mesa.
                    </div>
                )}

                {tables.map(table => (
                    <Card
                        key={table.id}
                        className={`border-2 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] group ${table.is_occupied ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-white'}`}
                        onClick={() => handleTableClick(table)}
                    >
                        <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start space-y-0">
                            <div className={`p-2 rounded-lg ${table.is_occupied ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                <Armchair className="w-5 h-5" />
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="QR Code">
                                    <QrCode className="w-3 h-3 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <h3 className="font-bold text-lg text-gray-900">{table.table_number}</h3>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center text-xs text-gray-500">
                                    <Users className="w-3 h-3 mr-1" /> {table.capacity}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${table.is_occupied ? 'bg-orange-200 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                    {table.is_occupied ? 'OCUPADA' : 'LIVRE'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* COMPONENTE DA COMANDA DIGITAL (GAVETA LATERAL) */}
            <OrderSheet
                table={selectedTable}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onOrderSent={fetchTables} // Atualiza status da mesa quando envia pedido
            />
        </div>
    );
}