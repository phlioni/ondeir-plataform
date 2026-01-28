import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Bike, MapPin, CheckCircle2, Navigation, DollarSign, LogOut, Phone, Package, CreditCard, Wallet, Lock, Car, AlertTriangle, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function CourierApp() {
    const { id: marketId } = useParams();
    const { toast } = useToast();

    // Auth & Data
    const [courier, setCourier] = useState<any>(null);
    const [cpfInput, setCpfInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [readyOrders, setReadyOrders] = useState<any[]>([]);
    const [myDeliveries, setMyDeliveries] = useState<any[]>([]);

    // Modais
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false); // NOVO
    const [selectedOrderToFinish, setSelectedOrderToFinish] = useState<string | null>(null);
    const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
    const [verifying, setVerifying] = useState(false);

    // GPS
    const [gpsError, setGpsError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // Financeiro (Local)
    const [earnings, setEarnings] = useState({ today: 0, month: 0, countToday: 0 });

    useEffect(() => {
        const savedCourier = localStorage.getItem(`courier_session_${marketId}`);
        if (savedCourier) setCourier(JSON.parse(savedCourier));
    }, [marketId]);

    useEffect(() => {
        if (courier) {
            fetchOrders();
            fetchEarnings();
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

    const startTracking = () => {
        if (!navigator.geolocation) {
            setGpsError("GPS não suportado.");
            return;
        }
        if (watchIdRef.current !== null) return;

        console.log("📍 Iniciando GPS...");
        setGpsError(null);

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
        const { data: ready } = await supabase.from('orders').select('*').eq('market_id', marketId).eq('status', 'ready').is('courier_id', null).order('created_at');
        const { data: mine } = await supabase.from('orders').select('*').eq('market_id', marketId).eq('courier_id', courier.id).neq('status', 'delivered').neq('status', 'canceled').order('created_at');
        setReadyOrders(ready || []);
        setMyDeliveries(mine || []);
    };

    // Cálculo Financeiro
    const fetchEarnings = async () => {
        if (!courier) return;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data } = await supabase
            .from('orders')
            .select('delivery_fee, created_at')
            .eq('courier_id', courier.id)
            .eq('status', 'delivered')
            .gte('created_at', startOfMonth);

        if (data) {
            let todaySum = 0;
            let monthSum = 0;
            let countToday = 0;

            data.forEach(order => {
                const fee = Number(order.delivery_fee || 0);
                monthSum += fee;
                if (order.created_at >= startOfDay) {
                    todaySum += fee;
                    countToday++;
                }
            });
            setEarnings({ today: todaySum, month: monthSum, countToday });
        }
    };

    const takeOrder = async (orderId: string) => {
        await supabase.from('orders').update({ courier_id: courier.id, status: 'ready' }).eq('id', orderId);
        toast({ title: "Pedido coletado!" });
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

    const openWaze = (address: string, number: string, city: string) => {
        const query = encodeURIComponent(`${address}, ${number}, ${city}`);
        window.open(`https://waze.com/ul?q=${query}`, '_blank');
    };

    const openWhatsApp = (phone: string) => {
        window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
    };

    const getDeadline = (order: any) => {
        if (!order.estimated_max) return null;
        const created = new Date(order.created_at);
        const deadline = new Date(created.getTime() + order.estimated_max * 60000);
        return deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getPaymentInfo = (order: any) => {
        switch (order.payment_method) {
            case 'credit': return { label: 'Maq. Crédito', icon: CreditCard, color: 'text-blue-600 bg-blue-50' };
            case 'debit': return { label: 'Maq. Débito', icon: CreditCard, color: 'text-blue-600 bg-blue-50' };
            case 'pix': return { label: 'Cobrar PIX', icon: DollarSign, color: 'text-green-600 bg-green-50' };
            case 'cash': return { label: order.change_for ? `Dinheiro (Troco p/ ${order.change_for})` : 'Dinheiro', icon: Wallet, color: 'text-green-600 bg-green-50' };
            default: return { label: 'Ver na Entrega', icon: DollarSign, color: 'text-gray-600 bg-gray-50' };
        }
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
                    {/* Botão Carteira */}
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
                    <TabsList className="w-full grid grid-cols-2 h-12">
                        <TabsTrigger value="my-list" className="h-10 text-base">Minhas Entregas ({myDeliveries.length})</TabsTrigger>
                        <TabsTrigger value="pool" className="h-10 text-base">Disponíveis ({readyOrders.length})</TabsTrigger>
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
                                                <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.address_neighborhood}</p>
                                                {deadline && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px] gap-1"><Clock className="w-3 h-3" /> Até {deadline}</Badge>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`p-3 rounded-lg border mb-4 flex flex-col gap-2 ${paymentInfo.color} border-current/20`}>
                                        <div className="flex justify-between items-center"><span className="text-sm font-bold uppercase flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cobrar do Cliente:</span><span className="font-black text-xl">R$ {order.total_amount.toFixed(2)}</span></div>
                                        <div className="flex items-center gap-2 text-sm font-medium border-t border-current/10 pt-2"><paymentInfo.icon className="w-4 h-4" />{paymentInfo.label}</div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        <Button variant="outline" className="col-span-1 h-12 border-green-200 bg-green-50 text-green-700" onClick={() => openWhatsApp(order.customer_phone)}><Phone className="w-5 h-5" /></Button>
                                        <Button variant="outline" className="col-span-1 h-12 border-blue-200 bg-blue-50 text-blue-700" onClick={() => openWaze(order.address_street, order.address_number, order.address_city)}><Navigation className="w-5 h-5" /></Button>
                                        <Button className="col-span-2 h-12 bg-green-600 hover:bg-green-700 font-bold text-base" onClick={() => requestFinishOrder(order.id)}><CheckCircle2 className="w-5 h-5 mr-2" /> Entregue</Button>
                                    </div>
                                    <div className="mt-3 pt-3 border-t text-xs text-gray-500 line-clamp-1">{order.address_street}, {order.address_number}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="pool" className="p-4 space-y-4 mt-0">
                    {readyOrders.length === 0 && (<div className="text-center py-20 text-gray-400">Nenhum pedido pronto.</div>)}
                    {readyOrders.map(order => (
                        <Card key={order.id} className="opacity-90 hover:opacity-100 transition-opacity">
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-900">#{order.display_id} - {order.address_neighborhood}</h3>
                                    <p className="text-xs text-green-600 font-bold mt-1">Ganho: R$ {Number(order.delivery_fee || 0).toFixed(2)}</p>
                                </div>
                                <Button onClick={() => takeOrder(order.id)} className="h-10 px-6">Pegar</Button>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>

            <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
                <DialogContent className="sm:max-w-xs top-[30%] translate-y-[-30%]">
                    <DialogHeader><div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2"><Lock className="w-6 h-6 text-blue-600" /></div><DialogTitle className="text-center">Código de Entrega</DialogTitle><DialogDescription className="text-center">Solicite ao cliente.</DialogDescription></DialogHeader>
                    <div className="py-4 flex justify-center"><Input type="tel" maxLength={4} className="text-center text-3xl font-bold tracking-[1rem] h-16 w-48 border-2 border-primary/50 focus:border-primary" placeholder="0000" value={deliveryCodeInput} onChange={(e) => setDeliveryCodeInput(e.target.value.replace(/\D/g, ''))} /></div>
                    <DialogFooter><Button className="w-full h-12 text-lg font-bold" onClick={verifyAndFinishOrder} disabled={verifying}>{verifying ? <Loader2 className="animate-spin" /> : "Confirmar"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isFinanceModalOpen} onOpenChange={setIsFinanceModalOpen}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-green-600" /> Meus Ganhos</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                            <p className="text-xs text-green-600 font-bold uppercase tracking-wide">Hoje ({earnings.countToday} entregas)</p>
                            <p className="text-3xl font-black text-green-700 mt-1">R$ {earnings.today.toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-600 flex items-center gap-2"><Calendar className="w-4 h-4" /> Acumulado Mês</span>
                            <span className="font-bold text-gray-900">R$ {earnings.month.toFixed(2)}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="w-full" onClick={() => setIsFinanceModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}