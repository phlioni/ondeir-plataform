import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash, Image as ImageIcon } from "lucide-react";

export default function Menu() {
    const { toast } = useToast();
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [marketId, setMarketId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState({ name: "", price: "", description: "", category: "Comida", image_url: "" });
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: m } = await supabase.from("markets").select("id").eq("owner_id", user.id).single();
            if (m) {
                setMarketId(m.id);
                fetchMenu(m.id);
            }
            setLoading(false);
        };
        init();
    }, []);

    const fetchMenu = async (id: string) => {
        const { data } = await supabase.from("menu_items").select("*").eq("market_id", id).order("created_at", { ascending: false });
        setMenuItems(data || []);
    };

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const fileName = `menu/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('images').upload(fileName, file);
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            setNewItem(prev => ({ ...prev, image_url: data.publicUrl }));
        } catch (e) {
            toast({ title: "Erro no upload", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleAdd = async () => {
        if (!marketId || !newItem.name) return;
        const { error } = await supabase.from("menu_items").insert({
            market_id: marketId,
            name: newItem.name,
            description: newItem.description,
            price: parseFloat(newItem.price),
            category: newItem.category,
            image_url: newItem.image_url
        });
        if (!error) {
            setNewItem({ name: "", price: "", description: "", category: "Comida", image_url: "" });
            fetchMenu(marketId);
            toast({ title: "Item adicionado!" });
        }
    };

    const handleDelete = async (id: string) => {
        await supabase.from("menu_items").delete().eq("id", id);
        if (marketId) fetchMenu(marketId);
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;
    if (!marketId) return <div className="text-center p-10">Primeiro configure seu estabelecimento nas Configurações.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Cardápio</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="h-fit border-0 shadow-md">
                    <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle className="text-base">Novo Item</CardTitle></CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById('prod-up')?.click()}>
                            {newItem.image_url ? <div className="w-24 h-24 bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${newItem.image_url})` }} /> : <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2 w-8 h-8" /><span className="text-xs">Foto</span></div>}
                            <input type="file" id="prod-up" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                        </div>
                        {uploading && <p className="text-xs text-center text-primary animate-pulse">Enviando...</p>}
                        <Input placeholder="Nome" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        <div className="flex gap-2">
                            <Input placeholder="Preço" type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                            <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Comida">Comida</SelectItem><SelectItem value="Bebida">Bebida</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <Textarea placeholder="Descrição" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                        <Button className="w-full" onClick={handleAdd} disabled={uploading || !newItem.name}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                    </CardContent>
                </Card>
                <div className="lg:col-span-2 space-y-3">
                    {menuItems.map(item => (
                        <div key={item.id} className="bg-white p-3 rounded-xl border shadow-sm flex gap-4 items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between"><h4 className="font-bold">{item.name}</h4><span className="text-primary font-bold">R$ {item.price.toFixed(2)}</span></div>
                                <p className="text-xs text-gray-500 truncate">{item.description}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash className="w-4 h-4 text-gray-400 hover:text-red-600" /></Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}