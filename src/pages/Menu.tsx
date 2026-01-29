import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash, Image as ImageIcon, ScrollText, X, Coins, Edit2, Save } from "lucide-react";

export default function Menu() {
    const { toast } = useToast();
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [marketId, setMarketId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Novo Produto
    const [newItem, setNewItem] = useState({ name: "", price: "", description: "", category: "Comida", image_url: "" });
    const [uploading, setUploading] = useState(false);

    // Edição de Produto
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Ficha Técnica (Receita)
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [recipe, setRecipe] = useState<any[]>([]);
    const [isRecipeOpen, setIsRecipeOpen] = useState(false);
    const [newRecipeItem, setNewRecipeItem] = useState({ ingredient_id: "", quantity: "" });

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: m } = await supabase.from("markets").select("id").eq("owner_id", user.id).single();
            if (m) {
                setMarketId(m.id);
                fetchMenu(m.id);
                fetchIngredients(m.id);
            }
            setLoading(false);
        };
        init();
    }, []);

    const fetchMenu = async (id: string) => {
        const { data } = await supabase.from("menu_items").select("*").eq("market_id", id).order("created_at", { ascending: false });
        setMenuItems(data || []);
    };

    const fetchIngredients = async (id: string) => {
        const { data } = await supabase.from("ingredients").select("*").eq("market_id", id).order("name");
        setIngredients(data || []);
    };

    // --- LÓGICA DE UPLOAD (Genérica para Novo e Edit) ---
    const handleUpload = async (file: File, isEdit = false) => {
        setUploading(true);
        try {
            const fileName = `menu/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('images').upload(fileName, file);
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);

            if (isEdit) {
                setEditingItem((prev: any) => ({ ...prev, image_url: data.publicUrl }));
            } else {
                setNewItem(prev => ({ ...prev, image_url: data.publicUrl }));
            }
        } catch (e) { toast({ title: "Erro upload", variant: "destructive" }); } finally { setUploading(false); }
    };

    const handleAdd = async () => {
        if (!marketId || !newItem.name) return;
        const { error } = await supabase.from("menu_items").insert({
            market_id: marketId, name: newItem.name, description: newItem.description, price: parseFloat(newItem.price), category: newItem.category, image_url: newItem.image_url
        });
        if (!error) {
            setNewItem({ name: "", price: "", description: "", category: "Comida", image_url: "" });
            if (marketId) fetchMenu(marketId);
            toast({ title: "Item adicionado!" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este item?")) return;
        await supabase.from("menu_items").delete().eq("id", id);
        if (marketId) fetchMenu(marketId);
    };

    // --- NOVA LÓGICA: EDIÇÃO ---
    const openEditModal = (item: any) => {
        setEditingItem({ ...item }); // Clona o objeto para edição
        setIsEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem || !editingItem.name) return;

        const { error } = await supabase.from("menu_items").update({
            name: editingItem.name,
            description: editingItem.description,
            price: parseFloat(editingItem.price),
            category: editingItem.category,
            image_url: editingItem.image_url
        }).eq("id", editingItem.id);

        if (!error) {
            toast({ title: "Item atualizado!" });
            setIsEditOpen(false);
            if (marketId) fetchMenu(marketId);
        } else {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    };


    // --- LÓGICA: FICHA TÉCNICA ---
    const openRecipe = async (product: any) => {
        setSelectedProduct(product);
        const { data } = await supabase
            .from("product_recipes")
            .select("*, ingredients(name, unit)")
            .eq("menu_item_id", product.id);
        setRecipe(data || []);
        setIsRecipeOpen(true);
    };

    const addIngredientToRecipe = async () => {
        if (!selectedProduct || !newRecipeItem.ingredient_id || !newRecipeItem.quantity) return;

        const { error } = await supabase.from("product_recipes").insert({
            menu_item_id: selectedProduct.id,
            ingredient_id: newRecipeItem.ingredient_id,
            quantity_needed: parseFloat(newRecipeItem.quantity)
        });

        if (error) {
            toast({ title: "Erro ao adicionar", description: "Talvez já exista na receita?", variant: "destructive" });
        } else {
            openRecipe(selectedProduct);
            setNewRecipeItem({ ingredient_id: "", quantity: "" });
        }
    };

    const removeIngredientFromRecipe = async (id: string) => {
        await supabase.from("product_recipes").delete().eq("id", id);
        if (selectedProduct) openRecipe(selectedProduct);
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Cardápio</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* FORMULÁRIO NOVO PRODUTO */}
                <Card className="h-fit border-0 shadow-md">
                    <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle className="text-base">Novo Item</CardTitle></CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById('prod-up')?.click()}>
                            {newItem.image_url ? <div className="w-24 h-24 bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${newItem.image_url})` }} /> : <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2 w-8 h-8" /><span className="text-xs">Foto</span></div>}
                            <input type="file" id="prod-up" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                        </div>
                        <Input placeholder="Nome" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        <div className="flex gap-2">
                            <Input placeholder="Preço" type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                            <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Comida">Comida</SelectItem><SelectItem value="Bebida">Bebida</SelectItem></SelectContent></Select>
                        </div>
                        <Textarea placeholder="Descrição" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                        <Button className="w-full" onClick={handleAdd} disabled={uploading || !newItem.name}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                    </CardContent>
                </Card>

                {/* LISTA DE PRODUTOS */}
                <div className="lg:col-span-2 space-y-3">
                    {menuItems.map(item => {
                        const coinsReward = Math.floor(item.price);
                        const coinsPrice = Math.ceil(item.price * 20);

                        return (
                            <div key={item.id} className="bg-white p-3 rounded-xl border shadow-sm flex gap-4 items-center group">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold">{item.name}</h4>
                                        <div className="text-right">
                                            <span className="text-primary font-bold block">R$ {item.price.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 text-xs mt-1 mb-2">
                                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100" title="Quanto o cliente ganha ao comprar">
                                            <Coins className="w-3 h-3" />
                                            <span className="font-semibold">Ganha: {coinsReward}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100" title="Quanto custa para comprar com moedas">
                                            <Coins className="w-3 h-3" />
                                            <span className="font-semibold">Compra: {coinsPrice}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-1">
                                        <p className="text-xs text-gray-500 truncate flex-1">{item.description}</p>
                                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => openRecipe(item)}>
                                            <ScrollText className="w-3 h-3" /> Ficha Técnica
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => openEditModal(item)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* MODAL DE EDIÇÃO */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Item</DialogTitle>
                    </DialogHeader>
                    {editingItem && (
                        <div className="space-y-4 py-2">
                            <div className="flex justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById('prod-edit-up')?.click()}>
                                {editingItem.image_url ? <div className="w-32 h-32 bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${editingItem.image_url})` }} /> : <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2 w-8 h-8" /><span className="text-xs">Alterar Foto</span></div>}
                                <input type="file" id="prod-edit-up" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], true)} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome</label>
                                <Input value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Preço</label>
                                    <Input type="number" value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Categoria</label>
                                    <Select value={editingItem.category} onValueChange={v => setEditingItem({ ...editingItem, category: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="Comida">Comida</SelectItem><SelectItem value="Bebida">Bebida</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição</label>
                                <Textarea value={editingItem.description} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUpdate} disabled={uploading} className="gap-2"><Save className="w-4 h-4" /> Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL FICHA TÉCNICA */}
            <Dialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Ficha Técnica: {selectedProduct?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-700">
                            Defina quais ingredientes são consumidos ao vender este produto. O estoque será atualizado automaticamente.
                        </div>

                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <label className="text-xs font-medium">Ingrediente</label>
                                <Select value={newRecipeItem.ingredient_id} onValueChange={v => setNewRecipeItem({ ...newRecipeItem, ingredient_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {ingredients.map(ing => (
                                            <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-xs font-medium">Qtd</label>
                                <Input type="number" placeholder="0.00" value={newRecipeItem.quantity} onChange={e => setNewRecipeItem({ ...newRecipeItem, quantity: e.target.value })} />
                            </div>
                            <Button onClick={addIngredientToRecipe} disabled={!newRecipeItem.ingredient_id}><Plus className="w-4 h-4" /></Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden mt-4">
                            <div className="bg-gray-50 p-2 text-xs font-bold text-gray-500 flex justify-between px-4"><span>Ingrediente</span><span>Qtd na Receita</span></div>
                            {recipe.length === 0 ? <div className="p-4 text-center text-sm text-gray-400">Nenhum ingrediente vinculado.</div> :
                                recipe.map(r => (
                                    <div key={r.id} className="p-3 border-b last:border-0 flex justify-between items-center text-sm">
                                        <span>{r.ingredients?.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium">{r.quantity_needed} {r.ingredients?.unit}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => removeIngredientFromRecipe(r.id)}><X className="w-3 h-3" /></Button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}