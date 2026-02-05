import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash, Image as ImageIcon, ScrollText, X, Coins, Edit2, Save, Sparkles, Layers, Settings2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

export default function Menu() {
    const { toast } = useToast();
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [marketId, setMarketId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Novo Produto
    const [newItem, setNewItem] = useState({ name: "", price: "", description: "", category: "Comida", image_url: "" });
    // NOVO ESTADO: Armazena os IDs dos grupos selecionados para o novo item
    const [newItemAddons, setNewItemAddons] = useState<string[]>([]); 
    
    const [uploading, setUploading] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // Edição de Produto
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    
    // Gestão de Adicionais (Globais)
    const [globalAddonGroups, setGlobalAddonGroups] = useState<any[]>([]);
    const [isAddonManagerOpen, setIsAddonManagerOpen] = useState(false);
    
    // Vínculo Produto <-> Adicional (Edição)
    const [linkedAddonGroupIds, setLinkedAddonGroupIds] = useState<string[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);

    // Ficha Técnica (Receita)
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [recipe, setRecipe] = useState<any[]>([]);
    const [isRecipeOpen, setIsRecipeOpen] = useState(false);
    const [newRecipeItem, setNewRecipeItem] = useState({ ingredient_id: "", quantity: "" });

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: m } = await supabase.from("markets").select("id").eq("owner_id", user.id).maybeSingle();

            if (m) {
                setMarketId(m.id);
                fetchMenu(m.id);
                fetchIngredients(m.id);
                fetchGlobalAddons(m.id);
            }
            setLoading(false);
        };
        init();
    }, []);

    const fetchMenu = async (id: string) => {
        const { data } = await supabase
            .from("menu_items")
            .select("*, embedding")
            .eq("market_id", id)
            .eq("active", true)
            .order("created_at", { ascending: false });

        setMenuItems(data || []);
    };

    const fetchIngredients = async (id: string) => {
        const { data } = await supabase.from("ingredients").select("*").eq("market_id", id).order("name");
        setIngredients(data || []);
    };

    const fetchGlobalAddons = async (mId: string) => {
        const { data: groups, error } = await supabase
            .from('addon_groups')
            .select('*, addon_items(*)')
            .eq('market_id', mId)
            .eq('active', true)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error fetching global addons:", error);
        } else {
             const sortedGroups = groups?.map(g => ({
                ...g,
                addon_items: g.addon_items?.filter((i: any) => i.active).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
            })) || [];
            setGlobalAddonGroups(sortedGroups);
        }
    };

    const fetchLinkedAddonsForProduct = async (menuItemId: string) => {
        setLoadingLinks(true);
        const { data, error } = await supabase
            .from('menu_item_addons')
            .select('addon_group_id')
            .eq('menu_item_id', menuItemId);
        
        if (!error && data) {
            setLinkedAddonGroupIds(data.map(d => d.addon_group_id));
        }
        setLoadingLinks(false);
    };

    const generateEmbeddingForItem = async (item: any) => {
        try {
            const { error } = await supabase.functions.invoke('generate-embedding', {
                body: { id: item.id, name: item.name, description: item.description }
            });
            if (error) throw error;
            return true;
        } catch (e) {
            console.error("Falha ao gerar embedding:", e);
            return false;
        }
    };

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

    const handleGenerateDescription = async (isEdit = false) => {
        const targetName = isEdit ? editingItem?.name : newItem.name;
        const targetCategory = isEdit ? editingItem?.category : newItem.category;
        const targetImage = isEdit ? editingItem?.image_url : newItem.image_url;

        if (!targetName) {
            toast({ title: "Digite o nome do prato primeiro", variant: "destructive" });
            return;
        }

        setIsGeneratingAi(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-description', {
                body: { name: targetName, category: targetCategory, image_url: targetImage }
            });

            if (error) throw error;

            if (data?.description) {
                if (isEdit) {
                    setEditingItem((prev: any) => ({ ...prev, description: data.description }));
                } else {
                    setNewItem(prev => ({ ...prev, description: data.description }));
                }
                toast({ title: "Descrição gerada com sucesso! ✨", className: "bg-purple-600 text-white" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao gerar descrição", description: "Verifique sua chave OpenAI.", variant: "destructive" });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // --- FUNÇÃO DE ADICIONAR ATUALIZADA ---
    const handleAdd = async () => {
        if (!marketId || !newItem.name) return;

        // 1. Criar o item no menu
        const { data, error } = await supabase.from("menu_items").insert({
            market_id: marketId,
            name: newItem.name,
            description: newItem.description,
            price: parseFloat(newItem.price),
            category: newItem.category,
            image_url: newItem.image_url,
            active: true
        }).select().single();

        if (!error && data) {
            // 2. Vincular os grupos selecionados (se houver)
            if (newItemAddons.length > 0) {
                const links = newItemAddons.map(groupId => ({
                    menu_item_id: data.id,
                    addon_group_id: groupId
                }));
                
                const { error: addonError } = await supabase.from('menu_item_addons').insert(links);
                if (addonError) {
                    console.error("Erro ao vincular adicionais:", addonError);
                    toast({ title: "Item criado", description: "Porém houve um erro ao vincular os adicionais.", variant: "warning" });
                }
            }

            // 3. Resetar estados
            setNewItem({ name: "", price: "", description: "", category: "Comida", image_url: "" });
            setNewItemAddons([]); // Limpa a seleção
            
            toast({ title: "Item adicionado com sucesso!" });
            setMenuItems(prev => [data, ...prev]);
            generateEmbeddingForItem(data);
        } else {
            toast({ title: "Erro ao criar item", description: error?.message, variant: "destructive" });
        }
    };

    // Toggle para o formulário de NOVO item
    const toggleNewItemAddon = (groupId: string, checked: boolean) => {
        if (checked) {
            setNewItemAddons(prev => [...prev, groupId]);
        } else {
            setNewItemAddons(prev => prev.filter(id => id !== groupId));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este item?")) return;
        try {
            const { count } = await supabase.from("order_items").select("*", { count: 'exact', head: true }).eq("menu_item_id", id);
            if (count && count > 0) {
                await supabase.from("menu_items").update({ active: false }).eq("id", id);
                toast({ title: "Item Arquivado", description: "Ocultado pois já possui vendas.", className: "bg-blue-600 text-white" });
            } else {
                await supabase.from("menu_items").delete().eq("id", id);
                toast({ title: "Item excluído permanentemente." });
            }
            setMenuItems(prev => prev.filter(i => i.id !== id));
        } catch (error: any) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); }
    };

    const openEditModal = (item: any) => {
        setEditingItem({ ...item });
        setIsEditOpen(true);
        fetchLinkedAddonsForProduct(item.id);
    };

    // --- LOGICA DE ADICIONAIS GLOBAIS ---
    const createGlobalGroup = async () => {
        if (!marketId) return;
        const newGroup = {
            market_id: marketId,
            name: "Novo Grupo (Ex: Molhos)",
            min_quantity: 0,
            max_quantity: 1,
            required: false,
            active: true
        };
        const { data, error } = await supabase.from('addon_groups').insert(newGroup).select().single();
        if (!error) setGlobalAddonGroups(prev => [...prev, { ...data, addon_items: [] }]);
    };

    const updateGlobalGroup = async (groupId: string, field: string, value: any) => {
        setGlobalAddonGroups(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g));
        await supabase.from('addon_groups').update({ [field]: value }).eq('id', groupId);
    };

    const deleteGlobalGroup = async (groupId: string) => {
        if (!confirm("Excluir este grupo? Ele será removido de todos os produtos.")) return;
        const { error } = await supabase.from('addon_groups').delete().eq('id', groupId);
        if (!error) setGlobalAddonGroups(prev => prev.filter(g => g.id !== groupId));
    };

    const addGlobalItem = async (groupId: string) => {
        const newItem = { group_id: groupId, name: "Novo Item", price: 0, active: true };
        const { data, error } = await supabase.from('addon_items').insert(newItem).select().single();
        if (!error) {
            setGlobalAddonGroups(prev => prev.map(g => {
                if (g.id === groupId) return { ...g, addon_items: [...(g.addon_items || []), data] };
                return g;
            }));
        }
    };

    const updateGlobalItem = async (groupId: string, itemId: string, field: string, value: any) => {
        setGlobalAddonGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return { ...g, addon_items: g.addon_items.map((i: any) => i.id === itemId ? { ...i, [field]: value } : i) };
            }
            return g;
        }));
        await supabase.from('addon_items').update({ [field]: value }).eq('id', itemId);
    };

    const deleteGlobalItem = async (groupId: string, itemId: string) => {
        const { error } = await supabase.from('addon_items').delete().eq('id', itemId);
        if (!error) {
            setGlobalAddonGroups(prev => prev.map(g => {
                if (g.id === groupId) return { ...g, addon_items: g.addon_items.filter((i: any) => i.id !== itemId) };
                return g;
            }));
        }
    };

    // --- LOGICA DE VINCULO (EDIÇÃO) ---
    const toggleGroupLink = async (groupId: string, isLinked: boolean) => {
        if (!editingItem) return;

        if (isLinked) {
            const { error } = await supabase.from('menu_item_addons').insert({
                menu_item_id: editingItem.id,
                addon_group_id: groupId
            });
            if (!error) setLinkedAddonGroupIds(prev => [...prev, groupId]);
        } else {
            const { error } = await supabase.from('menu_item_addons').delete().match({
                menu_item_id: editingItem.id,
                addon_group_id: groupId
            });
            if (!error) setLinkedAddonGroupIds(prev => prev.filter(id => id !== groupId));
        }
    };

    // --- SALVAR PRODUTO ---
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
            toast({ title: "Produto atualizado!" });
            setIsEditOpen(false);
            setMenuItems(prev => prev.map(i => i.id === editingItem.id ? editingItem : i));
            generateEmbeddingForItem(editingItem);
        } else {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    };

    const openRecipe = async (product: any) => {
        setSelectedProduct(product);
        const { data } = await supabase.from("product_recipes").select("*, ingredients(name, unit)").eq("menu_item_id", product.id);
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
        if (!error) {
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
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-gray-900">Gestão de Cardápio</h1>
                    <p className="text-gray-500 text-sm">Gerencie produtos e complementos.</p>
                </div>
                <Button variant="outline" className="gap-2 bg-white text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setIsAddonManagerOpen(true)}>
                    <Layers className="w-4 h-4" /> Gerenciar Complementos
                </Button>
            </div>

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
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-medium text-gray-500">Descrição</label>
                                <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1 px-2" onClick={() => handleGenerateDescription(false)} disabled={isGeneratingAi || !newItem.name}>
                                    {isGeneratingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} IA
                                </Button>
                            </div>
                            <Textarea placeholder="Descrição" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                        </div>

                        {/* --- NOVA SEÇÃO: VINCULAR ADICIONAIS NA CRIAÇÃO --- */}
                        <div className="space-y-2 border-t pt-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-700">Vincular Grupos de Adicionais</label>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-blue-600" onClick={() => setIsAddonManagerOpen(true)}>Criar</Button>
                            </div>
                            <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-md p-2 bg-gray-50/50">
                                {globalAddonGroups.length === 0 ? <p className="text-center text-[10px] text-gray-400">Nenhum grupo disponível.</p> : 
                                    globalAddonGroups.map(group => (
                                        <div key={group.id} className="flex items-center justify-between bg-white p-2 rounded border shadow-sm">
                                            <span className="text-xs font-medium truncate max-w-[140px]" title={group.name}>{group.name}</span>
                                            <Switch 
                                                className="scale-75 origin-right" 
                                                checked={newItemAddons.includes(group.id)} 
                                                onCheckedChange={(c) => toggleNewItemAddon(group.id, c)} 
                                            />
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleAdd} disabled={uploading || !newItem.name}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                    </CardContent>
                </Card>

                {/* LISTA DE PRODUTOS */}
                <div className="lg:col-span-2 space-y-3">
                    {menuItems.map(item => {
                        const coinsReward = Math.floor(item.price);
                        const coinsPrice = Math.ceil(item.price * 20);
                        return (
                            <div key={item.id} className="bg-white p-3 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center group relative">
                                <div className="flex gap-3 w-full">
                                    {!item.embedding && (<div className="absolute top-2 left-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse z-10" title="Aguardando inteligência artificial..." />)}
                                    <div className="w-20 h-20 sm:w-16 sm:h-16 bg-gray-100 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-sm sm:text-base line-clamp-2">{item.name}</h4>
                                            <div className="text-right ml-2 shrink-0"><span className="text-primary font-bold block text-sm sm:text-base">R$ {item.price.toFixed(2)}</span></div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs mt-1 mb-2">
                                            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100"><Coins className="w-3 h-3" /><span className="font-semibold">+{coinsReward}</span></div>
                                            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100"><Coins className="w-3 h-3" /><span className="font-semibold">-{coinsPrice}</span></div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                            <p className="text-xs text-gray-500 line-clamp-2 sm:truncate flex-1">{item.description}</p>
                                            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 w-fit hidden sm:flex" onClick={() => openRecipe(item)}><ScrollText className="w-3 h-3" /> Ficha Técnica</Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex sm:flex-col gap-2 sm:gap-1 mt-2 sm:mt-0 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end">
                                    <Button variant="ghost" size="sm" className="h-8 flex-1 sm:flex-none text-gray-500 hover:text-primary justify-center sm:justify-start bg-gray-50 sm:bg-transparent" onClick={() => openEditModal(item)}><Edit2 className="w-4 h-4 mr-2 sm:mr-0" /> <span className="sm:hidden text-xs">Editar</span></Button>
                                    <Button variant="ghost" size="sm" className="h-8 flex-1 sm:flex-none text-gray-500 hover:text-red-600 justify-center sm:justify-start bg-gray-50 sm:bg-transparent" onClick={() => handleDelete(item.id)}><Trash className="w-4 h-4 mr-2 sm:mr-0" /> <span className="sm:hidden text-xs">Excluir</span></Button>
                                    <Button variant="outline" size="sm" className="h-8 flex-1 text-gray-500 sm:hidden justify-center bg-white text-xs" onClick={() => openRecipe(item)}><ScrollText className="w-4 h-4 mr-2" /> Ficha</Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* MODAL DE EDIÇÃO */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Editar Item</DialogTitle></DialogHeader>
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Dados do Produto</TabsTrigger>
                            <TabsTrigger value="addons">Vincular Complementos</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 py-4">
                            {editingItem && (
                                <div className="space-y-4">
                                    <div className="flex justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById('prod-edit-up')?.click()}>
                                        {editingItem.image_url ? <div className="w-32 h-32 bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${editingItem.image_url})` }} /> : <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2 w-8 h-8" /><span className="text-xs">Alterar Foto</span></div>}
                                        <input type="file" id="prod-edit-up" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], true)} />
                                    </div>
                                    <div className="space-y-2"><label className="text-sm font-medium">Nome</label><Input value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><label className="text-sm font-medium">Preço</label><Input type="number" value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: e.target.value })} /></div>
                                        <div className="space-y-2"><label className="text-sm font-medium">Categoria</label><Select value={editingItem.category} onValueChange={v => setEditingItem({ ...editingItem, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Comida">Comida</SelectItem><SelectItem value="Bebida">Bebida</SelectItem></SelectContent></Select></div>
                                    </div>
                                    <div className="space-y-2"><div className="flex justify-between items-center"><label className="text-sm font-medium">Descrição</label><Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1 px-2" onClick={() => handleGenerateDescription(true)} disabled={isGeneratingAi}>{isGeneratingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Melhorar com IA</Button></div><Textarea value={editingItem.description} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} /></div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="addons" className="py-4 space-y-4">
                            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                                <span className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Selecione os grupos que aparecem neste produto.</span>
                            </div>
                            
                            {loadingLinks ? <Loader2 className="animate-spin mx-auto text-gray-400" /> : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {globalAddonGroups.length === 0 ? <p className="text-center text-sm text-gray-400 py-4">Nenhum grupo cadastrado.</p> : 
                                        globalAddonGroups.map(group => {
                                            const isLinked = linkedAddonGroupIds.includes(group.id);
                                            return (
                                                <div key={group.id} className={`flex items-center justify-between p-3 rounded-lg border ${isLinked ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                                                    <div>
                                                        <p className="font-semibold text-sm">{group.name}</p>
                                                        <p className="text-xs text-gray-500">{group.addon_items.length} itens • {group.required ? 'Obrigatório' : 'Opcional'}</p>
                                                    </div>
                                                    <Switch checked={isLinked} onCheckedChange={(checked) => toggleGroupLink(group.id, checked)} />
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            )}
                            <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => setIsAddonManagerOpen(true)}>Gerenciar / Criar Grupos</Button>
                        </TabsContent>
                    </Tabs>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUpdate} disabled={uploading} className="gap-2"><Save className="w-4 h-4" /> Salvar Produto</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL GLOBAL MANAGER */}
            <Dialog open={isAddonManagerOpen} onOpenChange={setIsAddonManagerOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Gerenciar Complementos</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-500">Crie grupos de adicionais para reutilizar em vários produtos.</p>
                        <Button size="sm" onClick={createGlobalGroup} className="gap-2"><Plus className="w-4 h-4" /> Novo Grupo</Button>
                    </div>

                    <div className="space-y-3">
                        {globalAddonGroups.length === 0 ? <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">Crie seu primeiro grupo de adicionais (Ex: Adicionais de Pizza)</div> : (
                            <Accordion type="multiple" className="w-full space-y-2">
                                {globalAddonGroups.map((group) => (
                                    <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-4 bg-gray-50/50">
                                        <div className="flex justify-between items-center py-2">
                                            <AccordionTrigger className="hover:no-underline py-2 flex-1 gap-2">
                                                <Input 
                                                    value={group.name} 
                                                    onClick={(e) => e.stopPropagation()} 
                                                    onChange={(e) => updateGlobalGroup(group.id, 'name', e.target.value)} 
                                                    className="h-8 font-semibold w-full md:w-64 bg-transparent border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-primary transition-all"
                                                />
                                            </AccordionTrigger>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteGlobalGroup(group.id)}><Trash className="w-4 h-4" /></Button>
                                        </div>

                                        <AccordionContent className="pt-0 pb-4">
                                            <div className="flex gap-4 mb-4 items-center bg-white p-2 rounded-md border text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span>Obrigatório?</span>
                                                    <Switch checked={group.required} onCheckedChange={(c) => updateGlobalGroup(group.id, 'required', c)} className="scale-75" />
                                                </div>
                                                <div className="flex items-center gap-2"><span>Min:</span><Input type="number" className="w-12 h-6 text-xs" value={group.min_quantity} onChange={(e) => updateGlobalGroup(group.id, 'min_quantity', parseInt(e.target.value))} /></div>
                                                <div className="flex items-center gap-2"><span>Max:</span><Input type="number" className="w-12 h-6 text-xs" value={group.max_quantity} onChange={(e) => updateGlobalGroup(group.id, 'max_quantity', parseInt(e.target.value))} /></div>
                                            </div>

                                            <div className="space-y-2 pl-2 border-l-2 border-gray-200 ml-2">
                                                {group.addon_items?.map((item: any) => (
                                                    <div key={item.id} className="flex gap-2 items-center">
                                                        <Input className="h-8 text-sm flex-1 bg-white" value={item.name} placeholder="Nome do item" onChange={(e) => updateGlobalItem(group.id, item.id, 'name', e.target.value)} />
                                                        <div className="relative w-24">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">R$</span>
                                                            <Input type="number" className="h-8 text-sm pl-6 bg-white" value={item.price} placeholder="0.00" onChange={(e) => updateGlobalItem(group.id, item.id, 'price', parseFloat(e.target.value))} />
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => deleteGlobalItem(group.id, item.id)}><X className="w-4 h-4" /></Button>
                                                    </div>
                                                ))}
                                                <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500 border-dashed border hover:bg-white hover:text-primary mt-2" onClick={() => addGlobalItem(group.id)}><Plus className="w-3 h-3 mr-1" /> Adicionar Opção</Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsAddonManagerOpen(false)}>Concluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL FICHA TÉCNICA (MANTIDO) */}
            <Dialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Ficha Técnica: {selectedProduct?.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-700">Defina quais ingredientes são consumidos ao vender este produto. O estoque será atualizado automaticamente.</div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1"><label className="text-xs font-medium">Ingrediente</label><Select value={newRecipeItem.ingredient_id} onValueChange={v => setNewRecipeItem({ ...newRecipeItem, ingredient_id: v })}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{ingredients.map(ing => (<SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>))}</SelectContent></Select></div>
                            <div className="w-24 space-y-1"><label className="text-xs font-medium">Qtd</label><Input type="number" placeholder="0.00" value={newRecipeItem.quantity} onChange={e => setNewRecipeItem({ ...newRecipeItem, quantity: e.target.value })} /></div>
                            <Button onClick={addIngredientToRecipe} disabled={!newRecipeItem.ingredient_id}><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden mt-4">
                            <div className="bg-gray-50 p-2 text-xs font-bold text-gray-500 flex justify-between px-4"><span>Ingrediente</span><span>Qtd na Receita</span></div>
                            {recipe.length === 0 ? <div className="p-4 text-center text-sm text-gray-400">Nenhum ingrediente vinculado.</div> : recipe.map(r => (<div key={r.id} className="p-3 border-b last:border-0 flex justify-between items-center text-sm"><span>{r.ingredients?.name}</span><div className="flex items-center gap-3"><span className="font-medium">{r.quantity_needed} {r.ingredients?.unit}</span><Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => removeIngredientFromRecipe(r.id)}><X className="w-3 h-3" /></Button></div></div>))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}