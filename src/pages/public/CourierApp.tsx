import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Bike, MapPin, CheckCircle2, Navigation, DollarSign, LogOut, Phone, Package, CreditCard, Wallet, Lock, Car, Clock, Star, ThumbsUp, AlertCircle, Quote, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CourierApp() {
    const { id: marketId } = useParams();
    const { toast } = useToast();

    // Auth & Data
    const [courier, setCourier] = useState<any>(null);
    const [cpfInput, setCpfInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [readyOrders, setReadyOrders] = useState<any[]>([]);
    const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
    const [myReviews, setMyReviews] = useState<any[]>([]);

    // Modais e Seleções
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
    const [selectedOrderToFinish, setSelectedOrderToFinish] = useState<string | null>(null);
    const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
    const [verifying, setVerifying] = useState(false);

    // Modal de GPS
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [targetLocation, setTargetLocation] = useState<{ address: string, number: string, city: string } | null>(null);

    // GPS
    const [gpsError, setGpsError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // Financeiro
    const [earnings, setEarnings] = useState({
        today: 0,
        month: 0,
        countToday: 0,
        pending: 0,
        paid: 0
    });
    const [financialHistory, setFinancialHistory] = useState<any[]>([]);

    useEffect(() => {
        const savedCourier = localStorage.getItem(`courier_session_${marketId}`);
        if (savedCourier) setCourier(JSON.parse(savedCourier));
    }, [marketId]);

    useEffect(() => {
        if (courier) {
            fetchOrders();
            fetchEarnings();
            fetchReviews();

            const channel = supabase.channel('courier_view')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                    fetchOrders();
                    fetchEarnings();
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [courier]);

    useEffect(() => {
        if (courier && myDeliveries.length > 0) startTracking();
        else stopTracking();
        return () => stopTracking();
    }, [courier, myDeliveries.length]);

    // --- FUNÇÃO DE RESGATE ROBUSTA (AGORA COM PROFILE) ---
    const getCustomerPhone = (order: any): string | null => {
        // 1. Tenta pegar do profile vinculado
        if (order.profiles?.phone_number) return order.profiles.phone_number;

        // 2. Tenta campos diretos (para pedidos sem profile)
        if (order.customer_phone) return order.customer_phone;
        if (order.phone) return order.phone;

        // 3. Tenta dentro do JSON
        if (order.address_data) {
            const data = typeof order.address_data === 'string' ? JSON.parse(order.address_data) : order.address_data;
            if (data.phone) return data.phone;
            if (data.telefone) return data.telefone;
            if (data.whatsapp) return data.whatsapp;
            if (data.celular) return data.celular;
        }
        return null;
    };

    const formatAddress = (order: any) => {
        if (order.address_street) {
            return `${order.address_street}, ${order.address_number || 'S/N'} - ${order.address_neighborhood || ''} ${order.address_complement ? `(${order.address_complement})` : ''}`;
        }
        if (order.address_data) {
            const data = typeof order.address_data === 'string' ? JSON.parse(order.address_data) : order.address_data;
            const street = data.street || data.rua || data.logradouro;
            const number = data.number || data.numero;
            const hood = data.neighborhood || data.bairro;
            const comp = data.complement || data.complemento;

            if (street) {
                return `${street}, ${number || 'S/N'} - ${hood || ''} ${comp ? `(${comp})` : ''}`;
            }
        }
        return "Endereço não informado";
    };

    const startTracking = () => {
        if (!navigator.geolocation) {
            setGpsError("GPS não suportado.");
            return;
        }
        if (watchIdRef.current !== null) return;

        const onSuccess = async (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            setGpsError(null);
            await supabase.from('couriers').update({
                current_lat: latitude,
                current_lng: longitude,
                last_location_update: new Date().toISOString()
            }).eq('id', courier.id);
        };

        const onError = (error: GeolocationPositionError) => {
            if (error.code === 2 || error.code === 3) {
                if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = navigator.geolocation.watchPosition(
                    onSuccess,
                    (errLow) => {
                        console.error("Erro GPS Final:", errLow);
                        setGpsError("Sem sinal GPS.");
                    },
                    { enableHighAccuracy: false, timeout: 30000, maximumAge: 30000 }
                );
            } else {
                setGpsError("Erro no GPS.");
            }
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            onSuccess, onError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
    };

    const stopTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('couriers').select('*').eq('market_id', marketId).eq('cpf', cpfInput).single();
            if (error || !data) {
                toast({ title: "Acesso Negado", description: "CPF não encontrado.", variant: "destructive" });
            } else {
                setCourier(data);
                localStorage.setItem(`courier_session_${marketId}`, JSON.stringify(data));
                toast({ title: `Bem-vindo, ${data.name.split(' ')[0]}! 🏍️` });
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem(`courier_session_${marketId}`);
        setCourier(null);
    };

    const fetchOrders = async () => {
        if (!courier) return;
        // JOIN COM PROFILE USANDO user_id
        const { data: ready } = await supabase.from('orders')
            .select('*, profiles:user_id(phone_number)')
            .eq('market_id', marketId)
            .eq('status', 'confirmed')
            .is('courier_id', null)
            .order('created_at');

        const { data: mine } = await supabase.from('orders')
            .select('*, profiles:user_id(phone_number)')
            .eq('market_id', marketId)
            .eq('courier_id', courier.id)
            .neq('status', 'delivered')
            .neq('status', 'canceled')
            .order('created_at');

        setReadyOrders(ready || []);
        setMyDeliveries(mine || []);
    };

    const fetchEarnings = async () => {
        if (!courier) return;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data } = await supabase
            .from('orders')
            .select('id, display_id, delivery_fee, created_at, courier_paid, address_street, address_number, address_neighborhood, address_data')
            .eq('courier_id', courier.id)
            .eq('status', 'delivered')
            .gte('created_at', startOfMonth)
            .order('created_at', { ascending: false });

        if (data) {
            setFinancialHistory(data);
            let todaySum = 0, monthSum = 0, countToday = 0, pendingSum = 0, paidSum = 0;

            data.forEach(order => {
                const fee = Number(order.delivery_fee || 0);
                monthSum += fee;
                if (order.created_at >= startOfDay) {
                    todaySum += fee;
                    countToday++;
                }
                if (order.courier_paid) paidSum += fee;
                else pendingSum += fee;
            });

            setEarnings({ today: todaySum, month: monthSum, countToday, pending: pendingSum, paid: paidSum });
        }
    };

    const fetchReviews = async () => {
        if (!courier) return;
        const { data } = await supabase
            .from('reviews')
            .select('rating, tags, created_at, comment')
            .eq('target_type', 'driver')
            .eq('target_id', courier.id)
            .order('created_at', { ascending: false })
            .limit(20);

        setMyReviews(data || []);
    };

    const takeOrder = async (orderId: string) => {
        await supabase.from('orders').update({ courier_id: courier.id, status: 'ready' }).eq('id', orderId);
        toast({ title: "Pedido coletado! Saiu para entrega 🏍️" });
        fetchOrders();
    };

    const requestFinishOrder = (orderId: string) => {
        setSelectedOrderToFinish(orderId);
        setDeliveryCodeInput("");
        setIsCodeModalOpen(true);
    };

    const verifyAndFinishOrder = async () => {
        if (!selectedOrderToFinish || deliveryCodeInput.length !== 4) return toast({ title: "Código inválido", variant: "destructive" });
        setVerifying(true);
        try {
            const { data: orderData } = await supabase.from('orders').select('delivery_code').eq('id', selectedOrderToFinish).single();
            if (orderData?.delivery_code !== deliveryCodeInput) {
                setVerifying(false);
                return toast({ title: "Código Incorreto ❌", variant: "destructive" });
            }
            await supabase.from('orders').update({ status: 'delivered', payment_status: 'paid' }).eq('id', selectedOrderToFinish);
            toast({ title: "Entrega Confirmada! ✅", className: "bg-green-600 text-white" });
            setIsCodeModalOpen(false);
            fetchOrders();
            fetchEarnings();
        } catch (e) { toast({ title: "Erro de conexão", variant: "destructive" }); } finally { setVerifying(false); }
    };

    const handleOpenMapSelector = (address: string, number: string, city: string) => {
        setTargetLocation({ address, number, city });
        setIsMapModalOpen(true);
    };

    const openSpecificMap = (app: 'waze' | 'google' | 'apple') => {
        if (!targetLocation) return;
        const query = encodeURIComponent(`${targetLocation.address}, ${targetLocation.number}, ${targetLocation.city || ''}`);
        let url = "";

        if (app === 'waze') url = `https://waze.com/ul?q=${query}`;
        if (app === 'google') url = `https://www.google.com/maps/search/?api=1&query=${query}`;
        if (app === 'apple') url = `http://maps.apple.com/?q=${query}`;

        window.open(url, '_blank');
        setIsMapModalOpen(false);
    };

    const openWhatsApp = (phone: string | null) => {
        if (!phone) return toast({ title: "Telefone não disponível", variant: "destructive" });
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${cleanPhone}?text=Olá, sou seu entregador.`, '_blank');
    };

    const handleCall = (phone: string | null) => {
        if (!phone) return toast({ title: "Telefone não disponível", variant: "destructive" });
        window.open(`tel:${phone.replace(/\D/g, '')}`);
    }

    const getDeadline = (order: any) => {
        if (!order.estimated_max) return null;
        const created = new Date(order.created_at);
        const deadline = new Date(created.getTime() + order.estimated_max * 60000);
        return deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getPaymentInfo = (order: any) => {
        const subtotal = Number(order.subtotal || 0);
        const delivery = Number(order.delivery_fee || 0);
        const discount = Number(order.discount_amount || 0);
        const total = (subtotal + delivery) - discount;

        switch (order.payment_method) {
            case 'credit': return { label: 'Maq. Crédito', icon: CreditCard, color: 'text-blue-600 bg-blue-50' };
            case 'debit': return { label: 'Maq. Débito', icon: CreditCard, color: 'text-blue-600 bg-blue-50' };
            case 'pix': return { label: 'Cobrar PIX', icon: DollarSign, color: 'text-green-600 bg-green-50' };
            case 'cash':
                return {
                    label: order.change_for ? `Dinheiro (Troco p/ ${order.change_for})` : 'Dinheiro',
                    icon: Wallet,
                    color: total > 0 ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
                };
            default: return { label: 'Ver na Entrega', icon: DollarSign, color: 'text-gray-600 bg-gray-50' };
        }
    };

    const FinancialList = ({ items, emptyMessage }: { items: any[], emptyMessage: string }) => (
        <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
                {items.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">{emptyMessage}</div>
                )}
                {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-3 bg-white border rounded-lg shadow-sm">
                        <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900 text-sm">#{item.display_id}</span>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString().slice(0, 5)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                                <MapPin className="w-3 h-3 inline mr-1 text-gray-400" />
                                {formatAddress(item)}
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className={`font-bold ${item.courier_paid ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {Number(item.delivery_fee).toFixed(2)}
                            </span>
                            <span className="text-[9px] text-gray-400 uppercase font-bold">
                                {item.courier_paid ? 'Pago' : 'Pendente'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );

    const ReviewsList = () => {
        const average = myReviews.length > 0
            ? (myReviews.reduce((a, b) => a + b.rating, 0) / myReviews.length).toFixed(1)
            : "5.0";

        return (
            <ScrollArea className="h-[calc(100vh-200px)] px-4 py-2">
                <div className="space-y-4">
                    <Card className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0 shadow-lg">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Sua Nota</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-4xl font-bold">{average}</span>
                                    <div className="flex text-yellow-300">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(average)) ? "fill-current" : "opacity-30"}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">{myReviews.length}</p>
                                <p className="text-blue-100 text-xs">Avaliações</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-800 text-sm">Feedback Recente</h3>
                        {myReviews.length === 0 && <p className="text-gray-400 text-sm text-center py-10">Nenhuma avaliação ainda.</p>}

                        {myReviews.map((review, i) => (
                            <Card key={i} className="border-0 shadow-sm bg-white">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-1 text-yellow-400">
                                            {[...Array(5)].map((_, starI) => (
                                                <Star key={starI} className={`w-3 h-3 ${starI < review.rating ? "fill-current" : "text-gray-200 fill-gray-200"}`} />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {review.comment && (
                                        <div className="mb-3 bg-gray-50 p-2 rounded text-xs text-gray-600 italic flex gap-2">
                                            <Quote className="w-4 h-4 text-gray-300 shrink-0" />
                                            <p>"{review.comment}"</p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {review.tags?.map((tag: string, t: number) => (
                                            <Badge key={t} variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-50 gap-1 font-normal">
                                                <ThumbsUp className="w-3 h-3" /> {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        );
    };

    if (!courier) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-8 animate-pulse"><Bike className="w-12 h-12 text-primary" /></div>
                <Card className="w-full max-w-sm bg-white/95 border-0 shadow-2xl">
                    <CardContent className="p-6 space-y-4">
                        <div className="text-center mb-4"><h1 className="text-2xl font-bold text-gray-900">Acesso Entregador</h1><p className="text-gray-500 text-sm">Digite seu CPF para iniciar</p></div>
                        <Input placeholder="CPF (somente números)" type="tel" className="text-center text-lg h-14 font-bold tracking-widest" value={cpfInput} onChange={e => setCpfInput(e.target.value)} />
                        <Button className="w-full h-14 text-lg font-bold" onClick={handleLogin} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Entrar"}</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans pb-4">
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-full">
                        {courier.vehicle_type === 'car' ? <Car className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                    </div>
                    <div>
                        <h1 className="font-bold text-sm">Olá, {courier.name.split(' ')[0]}</h1>
                        <p className="text-xs text-slate-400">{courier.plate || "N/A"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="bg-green-600/20 text-green-400 hover:bg-green-600/30 hover:text-green-300 border border-green-600/30 gap-1" onClick={() => setIsFinanceModalOpen(true)}>
                        <DollarSign className="w-4 h-4" /> <span className="font-bold">{earnings.today.toFixed(0)}</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white" onClick={handleLogout}>
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="my-list" className="w-full">
                <div className="bg-white p-2 shadow-sm">
                    <TabsList className="w-full grid grid-cols-3 h-12">
                        <TabsTrigger value="my-list" className="h-10 text-xs sm:text-sm">Minhas Entregas</TabsTrigger>
                        <TabsTrigger value="pool" className="h-10 text-xs sm:text-sm">Disponíveis ({readyOrders.length})</TabsTrigger>
                        <TabsTrigger value="reviews" className="h-10 text-xs sm:text-sm">Avaliações</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="my-list" className="p-4 space-y-4 mt-0">
                    {myDeliveries.length > 0 && !gpsError && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                            <Navigation className="w-3 h-3" /> Localização ativa
                        </div>
                    )}

                    {myDeliveries.length === 0 && (<div className="text-center py-20 text-gray-400 flex flex-col items-center"><Package className="w-16 h-16 mb-4 opacity-20" /><p>Você não tem entregas agora.</p><p className="text-sm">Vá na aba "Disponíveis" para pegar pedidos.</p></div>)}

                    {myDeliveries.map(order => {
                        const paymentInfo = getPaymentInfo(order);
                        const deadline = getDeadline(order);
                        const subtotal = Number(order.subtotal || 0);
                        const delivery = Number(order.delivery_fee || 0);
                        const discount = Number(order.discount_amount || 0);
                        const total = (subtotal + delivery) - discount;
                        const originalValue = subtotal + delivery;
                        const fullAddress = formatAddress(order);

                        // Busca telefone
                        const customerPhone = getCustomerPhone(order);

                        return (
                            <Card key={order.id} className="border-l-4 border-l-blue-500 shadow-md overflow-hidden relative">
                                <div className="absolute top-0 right-0 bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-green-200">
                                    Ganho: R$ {Number(order.delivery_fee || 0).toFixed(2)}
                                </div>

                                <CardContent className="p-4 pt-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">#{order.display_id} • {order.customer_name}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {fullAddress}</p>
                                                {deadline && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px] gap-1"><Clock className="w-3 h-3" /> Até {deadline}</Badge>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* CARD DE COBRANÇA */}
                                    <div className={`p-3 rounded-lg border mb-4 flex flex-col gap-2 ${paymentInfo.color} border-current/20`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold uppercase flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cobrar do Cliente:</span>
                                            <div className="text-right">
                                                {discount > 0 && (
                                                    <>
                                                        <span className="block text-[10px] opacity-70 mb-0.5 font-normal line-through">
                                                            De: R$ {originalValue.toFixed(2)}
                                                        </span>
                                                        <span className="block text-[10px] font-bold text-green-700 bg-green-100 px-1 rounded">
                                                            Desconto: -R$ {discount.toFixed(2)}
                                                        </span>
                                                    </>
                                                )}
                                                <span className="font-black text-2xl">R$ {total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-medium border-t border-current/10 pt-2"><paymentInfo.icon className="w-4 h-4" />{paymentInfo.label}</div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        <Button variant="outline" className="col-span-1 h-12 border-green-200 bg-green-50 text-green-700" onClick={() => openWhatsApp(customerPhone)}><Phone className="w-5 h-5" /></Button>
                                        <Button variant="outline" className="col-span-1 h-12 border-blue-200 bg-blue-50 text-blue-700" onClick={() => handleOpenMapSelector(order.address_street, order.address_number, order.address_city)}><Navigation className="w-5 h-5" /></Button>
                                        <Button className="col-span-2 h-12 bg-green-600 hover:bg-green-700 font-bold text-base" onClick={() => requestFinishOrder(order.id)}><CheckCircle2 className="w-5 h-5 mr-2" /> Entregue</Button>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <Button variant="ghost" className="h-8 text-xs text-gray-500" onClick={() => handleCall(customerPhone)}>Ligar para Cliente</Button>
                                    </div>
                                    <div className="mt-3 pt-3 border-t text-xs text-gray-500 line-clamp-1">{fullAddress}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="pool" className="p-4 space-y-4 mt-0">
                    {readyOrders.length === 0 && (<div className="text-center py-20 text-gray-400">Nenhum pedido pronto.</div>)}
                    {readyOrders.map(order => {
                        const fullAddress = formatAddress(order);
                        return (
                            <Card key={order.id} className="opacity-90 hover:opacity-100 transition-opacity">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-900">#{order.display_id} - {order.address_neighborhood || 'Bairro N/A'}</h3>
                                        <p className="text-xs text-gray-500 mb-1">{fullAddress}</p>
                                        <p className="text-xs text-green-600 font-bold mt-1">Ganho: R$ {Number(order.delivery_fee || 0).toFixed(2)}</p>
                                    </div>
                                    <Button onClick={() => takeOrder(order.id)} className="h-10 px-6">Pegar</Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </TabsContent>

                <TabsContent value="reviews" className="mt-0">
                    <ReviewsList />
                </TabsContent>
            </Tabs>

            <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
                <DialogContent className="sm:max-w-xs top-[30%] translate-y-[-30%]">
                    <DialogHeader><div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2"><Lock className="w-6 h-6 text-blue-600" /></div><DialogTitle className="text-center">Código de Entrega</DialogTitle><DialogDescription className="text-center">Solicite ao cliente.</DialogDescription></DialogHeader>
                    <div className="py-4 flex justify-center"><Input type="tel" maxLength={4} className="text-center text-3xl font-bold tracking-[1rem] h-16 w-48 border-2 border-primary/50 focus:border-primary" placeholder="0000" value={deliveryCodeInput} onChange={(e) => setDeliveryCodeInput(e.target.value.replace(/\D/g, ''))} /></div>
                    <DialogFooter><Button className="w-full h-12 text-lg font-bold" onClick={verifyAndFinishOrder} disabled={verifying}>{verifying ? <Loader2 className="animate-spin" /> : "Confirmar"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- NOVO MODAL DE SELEÇÃO DE MAPA --- */}
            <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-center">Escolher GPS</DialogTitle>
                        <DialogDescription className="text-center">Qual aplicativo você quer usar?</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-4">
                        <Button variant="outline" className="h-14 justify-start gap-3 border-2 hover:border-blue-500 hover:bg-blue-50" onClick={() => openSpecificMap('google')}>
                            <Map className="w-6 h-6 text-blue-600" />
                            <div className="text-left">
                                <span className="block font-bold text-gray-900">Google Maps</span>
                                <span className="text-xs text-gray-500">Recomendado</span>
                            </div>
                        </Button>
                        <Button variant="outline" className="h-14 justify-start gap-3 border-2 hover:border-cyan-500 hover:bg-cyan-50" onClick={() => openSpecificMap('waze')}>
                            <Navigation className="w-6 h-6 text-cyan-500" />
                            <div className="text-left">
                                <span className="block font-bold text-gray-900">Waze</span>
                                <span className="text-xs text-gray-500">Trânsito em tempo real</span>
                            </div>
                        </Button>
                        <Button variant="outline" className="h-14 justify-start gap-3 border-2 hover:border-gray-500 hover:bg-gray-50" onClick={() => openSpecificMap('apple')}>
                            <MapPin className="w-6 h-6 text-gray-600" />
                            <div className="text-left">
                                <span className="block font-bold text-gray-900">Apple Maps</span>
                                <span className="text-xs text-gray-500">Padrão iOS</span>
                            </div>
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsMapModalOpen(false)}>Cancelar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isFinanceModalOpen} onOpenChange={setIsFinanceModalOpen}>
                <DialogContent className="sm:max-w-sm max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-green-600" /> Meus Ganhos</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-xl text-white shadow-lg">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-gray-400 font-bold uppercase">Saldo a Receber</p>
                                <div className="p-1.5 bg-white/10 rounded-full"><AlertCircle className="w-4 h-4 text-yellow-400" /></div>
                            </div>
                            <p className="text-3xl font-black text-yellow-400">R$ {earnings.pending.toFixed(2)}</p>
                            <div className="h-px bg-white/10 my-3" />
                            <div className="flex justify-between text-xs text-gray-300">
                                <span>Hoje: <b>R$ {earnings.today.toFixed(2)}</b></span>
                                <span>Já Pago: <b>R$ {earnings.paid.toFixed(2)}</b></span>
                            </div>
                        </div>

                        <Tabs defaultValue="pending" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="pending">A Receber</TabsTrigger>
                                <TabsTrigger value="paid">Recebidos</TabsTrigger>
                            </TabsList>
                            <TabsContent value="pending">
                                <FinancialList
                                    items={financialHistory.filter(f => !f.courier_paid)}
                                    emptyMessage="Tudo pago! Nenhuma pendência."
                                />
                            </TabsContent>
                            <TabsContent value="paid">
                                <FinancialList
                                    items={financialHistory.filter(f => f.courier_paid)}
                                    emptyMessage="Nenhum pagamento recebido ainda."
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="w-full" onClick={() => setIsFinanceModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}