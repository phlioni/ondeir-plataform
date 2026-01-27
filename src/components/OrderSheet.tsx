import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, ShoppingBasket, Send } from "lucide-react";

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

    useEffect(() => {
        if (isOpen && table) {
            fetchMenu();
            fetchActiveOrder();
            setCart([]);
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
        setLoading(false);
    };

    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            return existing ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === itemId);
            return existing && existing.quantity > 1 ? prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i) : prev.filter(i => i.id !== itemId);
        });
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleSendOrder = async () => {
        if (cart.length === 0) return;
        setSending(true);
        try {
            let orderId = activeOrder?.id;
            if (!orderId) {
                const { data: newOrder, error: orderError } = await supabase.from("orders").insert({
                    market_id: table.market_id, table_id: table.id, status: 'pending', order_type: 'table', total_amount: 0
                }).select().single();
                if (orderError) throw orderError;
                orderId = newOrder.id;
                await supabase.from("restaurant_tables").update({ is_occupied: true }).eq("id", table.id);
            }

            const itemsToInsert = cart.map(item => ({
                order_id: orderId, menu_item_id: item.id, market_id: table.market_id,
                name: item.name, unit_price: item.price, quantity: item.quantity, total_price: item.price * item.quantity
            }));

            const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
            if (itemsError) throw itemsError;

            const currentTotal = Number(activeOrder?.total_amount || 0);
            await supabase.from("orders").update({ total_amount: currentTotal + cartTotal, status: 'pending' }).eq("id", orderId);

            toast({ title: "Enviado!", className: "bg-green-600 text-white" });
            onOrderSent(); onClose();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const groupedMenu = menuItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 bg-gray-50">
                <SheetHeader className="p-4 bg-white border-b sticky top-0 z-10">
                    <SheetTitle className="flex justify-between items-center">
                        <span>{table?.table_number}</span>
                        {activeOrder && <Badge variant="secondary">Aberta</Badge>}
                    </SheetTitle>
                    <SheetDescription>{activeOrder ? `Total: R$ ${Number(activeOrder.total_amount).toFixed(2)}` : "Mesa livre"}</SheetDescription>
                </SheetHeader>
                <Tabs defaultValue="menu" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 pt-2 bg-white border-b"><TabsList className="w-full grid grid-cols-2"><TabsTrigger value="menu">Cardápio</TabsTrigger><TabsTrigger value="details">Consumo</TabsTrigger></TabsList></div>
                    <TabsContent value="menu" className="flex-1 overflow-hidden flex flex-col m-0">
                        <ScrollArea className="flex-1 p-4">
                            {Object.entries(groupedMenu).map(([category, items]) => (
                                <div key={category} className="mb-6"><h3 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-wider">{category}</h3><div className="space-y-2">{items.map(item => { const inCart = cart.find(c => c.id === item.id); return (<div key={item.id} className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm"><div className="flex-1"><div className="font-medium text-gray-800">{item.name}</div><div className="text-primary font-bold text-sm">R$ {item.price.toFixed(2)}</div></div>{inCart ? (<div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1"><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCart(item.id)}><Minus className="h-3 w-3" /></Button><span className="text-sm font-bold w-4 text-center">{inCart.quantity}</span><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addToCart(item)}><Plus className="h-3 w-3" /></Button></div>) : (<Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => addToCart(item)}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>)}</div>) })}</div></div>
                            ))}
                        </ScrollArea>
                        {cart.length > 0 && (
                            <div className="p-4 bg-white border-t shadow-lg"><div className="flex justify-between items-center mb-3 text-sm"><span className="text-gray-500">{cart.reduce((a, b) => a + b.quantity, 0)} itens</span><span className="font-bold text-lg">R$ {cartTotal.toFixed(2)}</span></div><Button className="w-full h-12 text-lg gap-2" onClick={handleSendOrder} disabled={sending}>{sending ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />} Enviar</Button></div>
                        )}
                    </TabsContent>
                    <TabsContent value="details" className="flex-1 overflow-y-auto p-4 m-0">
                        {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div> : !activeOrder || !activeOrder.order_items?.length ? <div className="text-center py-10 text-gray-400"><ShoppingBasket className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>Vazio.</p></div> : (
                            <div className="space-y-4"><div className="bg-white rounded-xl border overflow-hidden"><div className="bg-gray-50 p-3 border-b text-xs font-bold text-gray-500 uppercase">Já pedidos</div>{activeOrder.order_items.map((item: any) => (<div key={item.id} className="p-3 border-b flex justify-between items-center"><div className="flex gap-3 items-center"><Badge variant="outline" className="bg-gray-50">{item.quantity}x</Badge><span className="text-gray-700">{item.name}</span></div><span className="font-medium text-gray-900">R$ {Number(item.total_price).toFixed(2)}</span></div>))}</div><Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">Fechar Conta</Button></div>
                        )}
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}