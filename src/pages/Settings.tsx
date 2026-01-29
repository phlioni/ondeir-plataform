import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // Importante: Componente Switch
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Loader2, Save, Upload, Copy, ExternalLink, QrCode, Settings as SettingsIcon, Truck, DollarSign, Clock, Wallet, CalendarClock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationsTab } from "@/components/IntegrationsTab";
import { CoinsWallet } from "@/components/CoinsWallet";

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '0.75rem' };
const defaultCenter = { lat: -23.550520, lng: -46.633308 };
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

// Dias da semana para iteração
const DAYS = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
];

function LocationPicker({ lat, lng, onLocationSelect, isLoaded }: any) {
    const [marker, setMarker] = useState(defaultCenter);
    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        if (lat && lng) setMarker({ lat, lng });
        else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMarker(p); mapRef.current?.panTo(p);
            });
        }
    }, [lat, lng]);

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setMarker({ lat: newLat, lng: newLng });
            if (window.google && window.google.maps) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results) => {
                    onLocationSelect(newLat, newLng, results?.[0]?.formatted_address || "");
                });
            }
        }
    };

    if (!isLoaded) return <div className="h-[350px] bg-gray-100 rounded-xl animate-pulse">Carregando Mapa...</div>;

    return (
        <GoogleMap mapContainerStyle={mapContainerStyle} center={marker} zoom={15} onClick={handleMapClick} onLoad={map => mapRef.current = map} options={{ disableDefaultUI: true, zoomControl: true }}>
            <Marker position={marker} draggable={true} onDragEnd={handleMapClick} />
        </GoogleMap>
    );
}

export default function Settings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [market, setMarket] = useState<any>(null);
    const [uploadingCover, setUploadingCover] = useState(false);

    const { isLoaded } = useJsApiLoader({ id: 'google-map-s', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || "", libraries: GOOGLE_MAPS_LIBRARIES });

    // Estado do formulário incluindo opening_hours
    const [form, setForm] = useState({
        name: "", category: "", description: "", address: "", amenities: "", cover_image: "", latitude: 0, longitude: 0,
        delivery_fee: 0, delivery_time_min: 30, delivery_time_max: 45,
        opening_hours: {} as Record<string, { open: string, close: string, closed: boolean }>
    });

    const menuLink = market ? `${window.location.origin}/menu/${market.id}` : "";

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: m } = await supabase.from("markets").select("*").eq("owner_id", user.id).single();
                if (m) {
                    setMarket(m);

                    // Inicializa horários padrão caso venha vazio do banco
                    const defaultHours: any = {};
                    DAYS.forEach(d => defaultHours[d.key] = { open: "08:00", close: "18:00", closed: false });

                    setForm({
                        name: m.name, category: m.category, description: m.description || "", address: m.address || "",
                        amenities: m.amenities?.join(", ") || "", cover_image: m.cover_image || "", latitude: m.latitude || 0, longitude: m.longitude || 0,
                        delivery_fee: m.delivery_fee || 0,
                        delivery_time_min: m.delivery_time_min || 30,
                        delivery_time_max: m.delivery_time_max || 45,
                        opening_hours: m.opening_hours || defaultHours
                    });
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    const handleUpload = async (file: File) => {
        try {
            setUploadingCover(true);
            const fileName = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('images').upload(fileName, file);
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            setForm(prev => ({ ...prev, cover_image: data.publicUrl }));
        } catch (e: any) {
            toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: form.name, category: form.category, description: form.description, address: form.address,
                amenities: form.amenities.split(",").map(s => s.trim()).filter(Boolean),
                cover_image: form.cover_image, latitude: form.latitude, longitude: form.longitude, owner_id: user.id,
                delivery_fee: Number(form.delivery_fee),
                delivery_time_min: Number(form.delivery_time_min),
                delivery_time_max: Number(form.delivery_time_max),
                opening_hours: form.opening_hours // Salva o JSON de horários
            };
            if (market) await supabase.from("markets").update(payload).eq("id", market.id);
            else await supabase.from("markets").insert(payload);
            toast({ title: "Configurações salvas!" });
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        }
    };

    // Função para atualizar um dia específico
    const updateDay = (dayKey: string, field: string, value: any) => {
        setForm(prev => ({
            ...prev,
            opening_hours: {
                ...prev.opening_hours,
                [dayKey]: {
                    ...prev.opening_hours[dayKey],
                    [field]: value
                }
            }
        }));
    };

    const copyToClipboard = () => {
        if (!menuLink) return;
        navigator.clipboard.writeText(menuLink);
        toast({ title: "Link copiado!", className: "bg-green-600 text-white" });
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
                    <TabsTrigger value="general" className="gap-2"><SettingsIcon className="w-4 h-4" /> Geral</TabsTrigger>
                    <TabsTrigger value="coins" className="gap-2"><Wallet className="w-4 h-4" /> Carteira Coins</TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2"><Truck className="w-4 h-4" /> Integrações</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <div className="flex justify-end">
                        <Button onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-200"><Save className="w-4 h-4" /> Salvar Alterações</Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* COLUNA ESQUERDA - DADOS PRINCIPAIS */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-0 shadow-md">
                                <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle>Dados Gerais</CardTitle></CardHeader>
                                <CardContent className="space-y-5 pt-6">
                                    {market && (
                                        <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                                <QrCode className="w-4 h-4" /> Menu Digital (Link Público)
                                            </label>
                                            <div className="flex gap-2">
                                                <Input value={menuLink} readOnly className="bg-white text-gray-600 font-mono text-sm border-blue-200" />
                                                <Button variant="outline" className="shrink-0 border-blue-200 hover:bg-blue-100 text-blue-700" onClick={copyToClipboard} title="Copiar Link"><Copy className="w-4 h-4" /></Button>
                                                <Button variant="outline" className="shrink-0 border-blue-200 hover:bg-blue-100 text-blue-700" onClick={() => window.open(menuLink, '_blank')} title="Abrir"><ExternalLink className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div className="space-y-2"><label className="text-sm font-medium">Nome</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                        <div className="space-y-2"><label className="text-sm font-medium">Categoria</label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Bar">Bar</SelectItem><SelectItem value="Restaurante">Restaurante</SelectItem></SelectContent></Select></div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-600" /> Taxa de Entrega (R$)</label>
                                            <Input type="number" step="0.50" value={form.delivery_fee} onChange={e => setForm({ ...form, delivery_fee: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> Tempo de Entrega (Min - Máx)</label>
                                            <div className="flex gap-2 items-center">
                                                <Input type="number" placeholder="Min" value={form.delivery_time_min} onChange={e => setForm({ ...form, delivery_time_min: e.target.value })} />
                                                <span className="text-gray-400">-</span>
                                                <Input type="number" placeholder="Máx" value={form.delivery_time_max} onChange={e => setForm({ ...form, delivery_time_max: e.target.value })} />
                                                <span className="text-sm text-gray-500">min</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2"><label className="text-sm font-medium">Descrição</label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                    <div className="space-y-2"><label className="text-sm font-medium">Foto de Capa</label><div className="flex gap-4 items-center border p-4 rounded-lg bg-gray-50"><div className="w-24 h-16 bg-white border rounded bg-cover bg-center" style={{ backgroundImage: `url(${form.cover_image})` }} /><input type="file" id="cover" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} /><Button variant="outline" size="sm" onClick={() => document.getElementById('cover')?.click()}>{uploadingCover ? <Loader2 className="animate-spin" /> : <Upload />} Alterar</Button></div></div>
                                </CardContent>
                            </Card>

                            {/* CARD DE HORÁRIOS - NOVO */}
                            <Card className="border-0 shadow-md">
                                <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-purple-600" /> Horário de Funcionamento</CardTitle></CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {DAYS.map(day => {
                                        const dayData = form.opening_hours[day.key] || { open: "08:00", close: "18:00", closed: false };
                                        return (
                                            <div key={day.key} className={`flex items-center justify-between p-3 rounded-lg border ${dayData.closed ? 'bg-gray-50 border-dashed' : 'bg-white border-solid'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <span className={`font-medium ${dayData.closed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{day.label}</span>
                                                        {dayData.closed && <span className="text-[10px] text-red-400 font-bold uppercase">Fechado</span>}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {!dayData.closed ? (
                                                        <>
                                                            <Input type="time" className="w-24 h-8 text-xs" value={dayData.open} onChange={e => updateDay(day.key, 'open', e.target.value)} />
                                                            <span className="text-gray-400">-</span>
                                                            <Input type="time" className="w-24 h-8 text-xs" value={dayData.close} onChange={e => updateDay(day.key, 'close', e.target.value)} />
                                                        </>
                                                    ) : (
                                                        <div className="w-[210px] h-8 flex items-center justify-center text-xs text-gray-400 bg-gray-100 rounded">
                                                            Não abre
                                                        </div>
                                                    )}

                                                    <div className="ml-2 border-l pl-2">
                                                        <Switch
                                                            checked={!dayData.closed}
                                                            onCheckedChange={(checked) => updateDay(day.key, 'closed', !checked)}
                                                            className="data-[state=checked]:bg-green-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>

                        {/* COLUNA DIREITA - MAPA */}
                        <div className="space-y-6">
                            <Card className="border-0 shadow-md h-fit sticky top-6">
                                <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle>Localização</CardTitle></CardHeader>
                                <CardContent className="space-y-4 pt-6"><LocationPicker lat={form.latitude} lng={form.longitude} isLoaded={isLoaded} onLocationSelect={(lat: number, lng: number, add: string) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng, address: add }))} /><Input value={form.address} readOnly className="bg-gray-100" /></CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="coins" className="mt-6">
                    <CoinsWallet />
                </TabsContent>

                <TabsContent value="integrations" className="mt-6">
                    {market?.id && <IntegrationsTab marketId={market.id} />}
                </TabsContent>
            </Tabs>
        </div>
    );
}