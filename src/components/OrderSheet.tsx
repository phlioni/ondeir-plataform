import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, ShoppingBasket, Send, Search, ArrowLeft, User, ChefHat } from "lucide-react";

interface OrderSheetProps {
    table: any;
    isOpen: boolean;
    onClose: () => void;
    onOrderSent: () => void;
}

export default function OrderSheet({ table, isOpen, onClose, onOrderSent }: OrderSheetProps) {
    const { toast } = useToast();
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [waiterName, setWaiterName] = useState("");

    // Estado para adição de item com observação
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemNote, setItemNote] = useState("");
    const [itemQty, setItemQty] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen && table) {
            fetchMenu();
            fetchActiveOrder();
            setCart([]);
            setWaiterName("");
        }
    }, [isOpen, table]);

    const fetchMenu = async () => {
        const { data } = await supabase.from("menu_items").select("*").eq("market_id", table.market_id).order("category", { ascending: true });
        setMenuItems(data || []);
    };

    const fetchActiveOrder = async () => {
        setLoading(true);
        const { data } = await supabase.from("orders").select("*, order_items(*)").eq("table_id", table.id).neq("status", "delivered").neq("status", "canceled").maybeSingle();
        setActiveOrder(data);
        if (data?.customer_name) setWaiterName(data.customer_name); // Recupera nome do garçom se já existir
        setLoading(false);
    };

    const openAddItemModal = (item: any) => {
        setSelectedItem(item);
        setItemQty(1);
        setItemNote("");
        setIsAddModalOpen(true);
    };

    const confirmAddItem = () => {
        if (!selectedItem) return;
        setCart(prev => [...prev, {
            ...selectedItem,
            quantity: itemQty,
            notes: itemNote,
            cartId: Math.random().toString(36) // ID único para o carrinho permitir itens iguais com obs diferentes
        }]);
        setIsAddModalOpen(false);
        toast({ title: "Item adicionado!", duration: 1500 });
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(i => i.cartId !== cartId));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleSendOrder = async () => {
        if (cart.length === 0) return;
        if (!waiterName.trim() && !activeOrder) {
            toast({ title: "Identifique-se", description: "Por favor, informe o nome do garçom.", variant: "destructive" });
            return;
        }

        setSending(true);
        try {
            let orderId = activeOrder?.id;

            // Cria pedido se não existir
            if (!orderId) {
                const { data: newOrder, error: orderError } = await supabase.from("orders").insert({
                    market_id: table.market_id,
                    table_id: table.id,
                    status: 'pending',
                    order_type: 'table',
                    total_amount: 0,
                    customer_name: waiterName // Usamos customer_name para guardar o garçom em pedidos de mesa
                }).select().single();

                if (orderError) throw orderError;
                orderId = newOrder.id;
                await supabase.from("restaurant_tables").update({ is_occupied: true }).eq("id", table.id);
            } else if (!activeOrder.customer_name && waiterName) {
                // Atualiza nome do garçom se não tiver
                await supabase.from("orders").update({ customer_name: waiterName }).eq("id", orderId);
            }

            const itemsToInsert = cart.map(item => ({
                order_id: orderId,
                menu_item_id: item.id,
                market_id: table.market_id,
                name: item.name,
                unit_price: item.price,
                quantity: item.quantity,
                total_price: item.price * item.quantity,
                notes: item.notes || null
            }));

            const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // Atualiza total do pedido
            const currentTotal = Number(activeOrder?.total_amount || 0);
            await supabase.from("orders").update({
                total_amount: currentTotal + cartTotal,
                status: 'pending' // Volta para pending para alertar a cozinha de novos itens
            }).eq("id", orderId);

            toast({ title: "Pedido Enviado!", className: "bg-green-600 text-white" });
            onOrderSent();
            onClose();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    // Filtra itens
    const filteredMenu = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedMenu = filteredMenu.reduce((acc, item) => {
        const cat = item.category || "Outros";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full p-0 bg-gray-50 border-l-0">
                {/* Header Fixo */}
                <SheetHeader className="p-4 bg-white border-b sticky top-0 z-10 flex flex-row items-center justify-between space-y-0 text-left">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onClose} className="-ml-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <SheetTitle>{table?.table_number}</SheetTitle>
                            <SheetDescription className="text-xs">{activeOrder ? "Mesa Aberta" : "Nova Comanda"}</SheetDescription>
                        </div>
                    </div>
                    {activeOrder && <Badge variant="secondary" className="bg-green-100 text-green-800">R$ {Number(activeOrder.total_amount).toFixed(2)}</Badge>}
                </SheetHeader>

                <Tabs defaultValue="menu" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-2 bg-white border-b space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input placeholder="Buscar produto..." className="pl-9 bg-gray-100 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="menu">Cardápio</TabsTrigger>
                            <TabsTrigger value="details">Conta Parcial</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="menu" className="flex-1 overflow-hidden flex flex-col m-0 relative">
                        <ScrollArea className="flex-1 p-4 pb-20">
                            {Object.entries(groupedMenu).map(([category, items]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="font-bold text-gray-900 mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                                        <div className="w-1 h-4 bg-primary rounded-full"></div> {category}
                                    </h3>
                                    <div className="space-y-3">
                                        {items.map(item => (
                                            <div key={item.id} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm active:scale-[0.98] transition-transform" onClick={() => openAddItemModal(item)}>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-gray-800 text-lg">{item.name}</div>
                                                    <div className="text-primary font-bold">R$ {item.price.toFixed(2)}</div>
                                                    {item.description && <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>}
                                                </div>
                                                <Button size="icon" className="h-8 w-8 rounded-full shadow-sm bg-primary text-white">
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>

                        {/* Barra de Carrinho Flutuante */}
                        {cart.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 shadow-2xl animate-in slide-in-from-bottom-10 z-20">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-md">{cart.length} itens</div>
                                        <span className="text-sm text-gray-500">Total do pedido</span>
                                    </div>
                                    <span className="font-bold text-xl text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                                </div>

                                {/* Input do Garçom (se ainda não tiver pedido aberto) */}
                                {!activeOrder && (
                                    <div className="mb-3 relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Nome do Garçom"
                                            className="pl-9"
                                            value={waiterName}
                                            onChange={e => setWaiterName(e.target.value)}
                                        />
                                    </div>
                                )}

                                <Button className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" onClick={handleSendOrder} disabled={sending}>
                                    {sending ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                                    Enviar para Cozinha
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="details" className="flex-1 overflow-y-auto p-4 m-0">
                        {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div> : !activeOrder || !activeOrder.order_items?.length ?
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                                <ShoppingBasket className="w-16 h-16 mb-4" />
                                <p>Nenhum pedido enviado.</p>
                            </div>
                            : (
                                <div className="space-y-4">
                                    <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Itens Enviados</span>
                                            {activeOrder.customer_name && <Badge variant="outline" className="text-[10px] h-5"><User className="w-3 h-3 mr-1" /> {activeOrder.customer_name}</Badge>}
                                        </div>
                                        {activeOrder.order_items.map((item: any) => (
                                            <div key={item.id} className="p-4 border-b last:border-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex gap-3 items-center">
                                                        <span className="font-bold text-gray-900">{item.quantity}x</span>
                                                        <span className="text-gray-700 font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-900">R$ {Number(item.total_price).toFixed(2)}</span>
                                                </div>
                                                {item.notes && (
                                                    <div className="text-red-500 text-xs italic bg-red-50 px-2 py-1 rounded inline-block">
                                                        Obs: {item.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                                            <span className="font-bold text-gray-600">Total Parcial</span>
                                            <span className="font-bold text-xl text-primary">R$ {Number(activeOrder.total_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </TabsContent>
                </Tabs>

                {/* Modal para Adicionar Item com Observação */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-sm top-[30%] translate-y-[-30%]">
                        <DialogHeader>
                            <DialogTitle>{selectedItem?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="flex items-center justify-center gap-6">
                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setItemQty(q => Math.max(1, q - 1))}><Minus /></Button>
                                <span className="text-3xl font-bold w-12 text-center">{itemQty}</span>
                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => setItemQty(q => q + 1)}><Plus /></Button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Observações para a cozinha</label>
                                <Textarea
                                    placeholder="Ex: Sem cebola, ponto da carne..."
                                    value={itemNote}
                                    onChange={e => setItemNote(e.target.value)}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button className="w-full h-12 text-lg" onClick={confirmAddItem}>Adicionar R$ {(selectedItem?.price * itemQty).toFixed(2)}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </SheetContent>
        </Sheet>
    );
}