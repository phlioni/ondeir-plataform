import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Loader2, Save, Upload, Copy, ExternalLink, QrCode, Settings as SettingsIcon, Truck, DollarSign, Clock, Wallet, CalendarClock, Sparkles, Share2, Globe, Store, Check, RefreshCw, CreditCard, AlertTriangle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationsTab } from "@/components/IntegrationsTab";
import { CoinsWallet } from "@/components/CoinsWallet";

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '0.75rem' };
const defaultCenter = { lat: -23.550520, lng: -46.633308 };
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

const DAYS = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
];

const establishmentCategories = [
    { value: "Restaurante", label: "Restaurante" },
    { value: "Bar", label: "Bar" },
    { value: "Cafeteria", label: "Cafeteria" },
    { value: "Lanchonete", label: "Lanchonete & Hamburgueria" },
    { value: "Pizzaria", label: "Pizzaria" },
    { value: "Doceria", label: "Doceria & Confeitaria" },
    { value: "Sorveteria", label: "Sorveteria & Açaí" },
    { value: "Adega", label: "Adega & Bebidas" },
    { value: "Quiosque", label: "Quiosque" },
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

// Função auxiliar para sanitizar Slug
const sanitizeSlug = (text: string) => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

export default function Settings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [market, setMarket] = useState<any>(null);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Estados para Auto-Save do Slug
    const [isSavingSlug, setIsSavingSlug] = useState(false);
    const [slugSaved, setSlugSaved] = useState(false);
    // Flag para saber se o slug foi editado manualmente pelo usuário
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    const { isLoaded } = useJsApiLoader({ id: 'google-map-s', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || "", libraries: GOOGLE_MAPS_LIBRARIES });

    const [form, setForm] = useState({
        name: "", category: "", description: "", address: "", amenities: "", cover_image: "", latitude: 0, longitude: 0,
        slug: "",
        delivery_fee: 0, delivery_time_min: 30, delivery_time_max: 45,
        opening_hours: {} as Record<string, { open: string, close: string, closed: boolean }>,
        // Novo estado para métodos de pagamento
        payment_methods: {
            credit_card: false,
            debit_card: false,
            pix: false,
            cash: false
        }
    });

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const appBaseUrl = isLocalhost ? 'http://localhost:8080' : 'https://flippi.app';

    // Link dinâmico: Só gera se tivermos o ID da loja
    const menuLink = (market && market.id) ? `${window.location.origin}/menu/${market.id}` : "";
    const deliveryLink = (market && market.id) ? `${appBaseUrl}/place/${form.slug || market.id}` : "";

    // Verifica se a loja ainda tem o nome padrão ou está incompleta
    const isDefaultSetup = form.name === "Minha Loja Nova" || !form.name || !form.category;

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);

                const { data: m, error } = await supabase
                    .from("markets")
                    .select("*")
                    .eq("owner_id", user.id)
                    .maybeSingle();

                if (error) {
                    console.error("Erro ao buscar dados da loja:", error);
                }

                if (m) {
                    setMarket(m);
                    const defaultHours: any = {};
                    DAYS.forEach(d => defaultHours[d.key] = { open: "08:00", close: "18:00", closed: false });

                    // Parse do payment_methods com fallback seguro
                    let payments = { credit_card: false, debit_card: false, pix: false, cash: false };
                    if (m.payment_methods && typeof m.payment_methods === 'object') {
                        payments = { ...payments, ...m.payment_methods as any };
                    }

                    setForm({
                        name: m.name,
                        category: m.category || "",
                        description: m.description || "",
                        address: m.address || "",
                        amenities: m.amenities?.join(", ") || "",
                        cover_image: m.cover_image || "",
                        latitude: m.latitude || 0,
                        longitude: m.longitude || 0,
                        slug: m.slug || "",
                        delivery_fee: m.delivery_fee || 0,
                        delivery_time_min: m.delivery_time_min || 30,
                        delivery_time_max: m.delivery_time_max || 45,
                        opening_hours: m.opening_hours || defaultHours,
                        payment_methods: payments
                    });
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    // --- AUTO-UPDATE SLUG FROM NAME ---
    useEffect(() => {
        if (!slugManuallyEdited && form.name && form.name !== "Minha Loja Nova") {
            const autoSlug = sanitizeSlug(form.name);
            // Só atualiza se o slug atual for diferente e parecer um ID (padrão) ou estiver vazio
            const isUuidSlug = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(form.slug);
            if (isUuidSlug || !form.slug || form.slug === "minha-loja-nova") {
                setForm(prev => ({ ...prev, slug: autoSlug }));
            }
        }
    }, [form.name]);

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
            // Garante que o slug esteja sanitizado antes de salvar
            const finalSlug = sanitizeSlug(form.slug);

            const payload = {
                name: form.name,
                category: form.category,
                description: form.description,
                address: form.address,
                amenities: form.amenities.split(",").map(s => s.trim()).filter(Boolean),
                cover_image: form.cover_image,
                latitude: form.latitude,
                longitude: form.longitude,
                owner_id: user.id,
                slug: finalSlug,
                delivery_fee: Number(form.delivery_fee),
                delivery_time_min: Number(form.delivery_time_min),
                delivery_time_max: Number(form.delivery_time_max),
                opening_hours: form.opening_hours,
                payment_methods: form.payment_methods
            };

            let response;
            if (market?.id) {
                // UPDATE: Retorna os dados atualizados
                response = await supabase.from("markets").update(payload).eq("id", market.id).select().single();
            } else {
                // INSERT: Retorna os dados criados (incluindo o ID)
                response = await supabase.from("markets").insert(payload).select().single();
            }

            if (response.error) throw response.error;

            // Atualiza o estado local COMPLETO com os dados do banco (trazendo o ID e Slug oficial)
            setMarket(response.data);
            setForm(prev => ({ ...prev, slug: response.data.slug }));

            toast({ title: "Configurações salvas!", description: "Sua loja foi atualizada." });

        } catch (e: any) {
            console.error("Erro ao salvar:", e);
            if (e.code === "23505" || e.message?.includes("markets_slug_unique")) {
                toast({
                    title: "Link Indisponível",
                    description: `O link "${form.slug}" já está em uso. Tente adicionar um número ou cidade.`,
                    variant: "destructive",
                    duration: 5000
                });
            } else {
                toast({ title: "Erro ao salvar", description: e.message || "Tente novamente.", variant: "destructive" });
            }
        }
    };

    const handleGenerateMarketAI = async () => {
        if (!market?.id) return;
        setIsGeneratingAI(true);
        toast({ title: "Otimizando busca...", description: "A IA está lendo sua descrição." });
        try {
            await handleSave();
            const { error } = await supabase.functions.invoke('generate-embedding', {
                body: { id: market.id, name: form.name, description: form.description, category: form.category, type: 'market' }
            });
            if (error) throw error;
            toast({ title: "Sucesso!", description: "Loja otimizada para busca com IA.", className: "bg-green-600 text-white" });
        } catch (error: any) {
            console.error(error);
            toast({ title: "Erro na IA", description: error.message, variant: "destructive" });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const updateDay = (dayKey: string, field: string, value: any) => {
        setForm(prev => ({
            ...prev,
            opening_hours: { ...prev.opening_hours, [dayKey]: { ...prev.opening_hours[dayKey], [field]: value } }
        }));
    };

    const togglePayment = (key: keyof typeof form.payment_methods) => {
        setForm(prev => ({
            ...prev,
            payment_methods: { ...prev.payment_methods, [key]: !prev.payment_methods[key] }
        }));
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast({ title: "Link copiado!", className: "bg-green-600 text-white" });
    };

    const shareOnWhatsApp = () => {
        const text = `Olá! Peça pelo nosso App de Delivery: ${deliveryLink}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlugManuallyEdited(true);
        setForm({ ...form, slug: e.target.value });
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 md:w-[800px]">
                    <TabsTrigger value="general" className="gap-2"><SettingsIcon className="w-4 h-4" /> Geral</TabsTrigger>
                    <TabsTrigger value="payments" className="gap-2"><CreditCard className="w-4 h-4" /> Pagamentos</TabsTrigger>
                    <TabsTrigger value="coins" className="gap-2"><Wallet className="w-4 h-4" /> Carteira Coins</TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2"><Truck className="w-4 h-4" /> Integrações</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <div className="flex justify-end">
                        <Button onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-200"><Save className="w-4 h-4" /> Salvar Alterações</Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-0 shadow-md">
                                <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle>Dados Gerais</CardTitle></CardHeader>
                                <CardContent className="space-y-5 pt-6">

                                    {/* --- AVISO DE CONFIGURAÇÃO (Desaparece automaticamente ao preencher) --- */}
                                    {isDefaultSetup && (
                                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg animate-in slide-in-from-top-2 transition-all">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-bold text-amber-800">Atenção: Configure sua Loja</h4>
                                                    <p className="text-sm text-amber-700 leading-relaxed">
                                                        Preencha o <strong>Nome</strong> e a <strong>Categoria</strong> da sua loja abaixo para liberar e personalizar seus links de compartilhamento oficiais.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Exibe os links apenas se o market existir e tiver ID carregado */}
                                    {market && market.id && (
                                        <div className="space-y-4">
                                            {/* Link Menu Digital */}
                                            <div className="space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                                <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                                    <QrCode className="w-4 h-4" /> Menu Digital (Uso Interno/Mesa)
                                                </label>
                                                <div className="flex gap-2">
                                                    <Input value={menuLink} readOnly className="bg-white text-gray-600 font-mono text-xs border-blue-200" />
                                                    <Button variant="outline" className="shrink-0 border-blue-200 hover:bg-blue-100 text-blue-700 h-9 w-9 p-0" onClick={() => copyToClipboard(menuLink)} title="Copiar"><Copy className="w-4 h-4" /></Button>
                                                    <Button variant="outline" className="shrink-0 border-blue-200 hover:bg-blue-100 text-blue-700 h-9 w-9 p-0" onClick={() => window.open(menuLink, '_blank')} title="Abrir"><ExternalLink className="w-4 h-4" /></Button>
                                                </div>
                                            </div>

                                            {/* Link Delivery - LIBERAÇÃO INSTANTÂNEA */}
                                            <div className={`space-y-4 p-4 rounded-xl border relative overflow-hidden transition-all duration-300 ${isDefaultSetup ? 'bg-gray-50 border-gray-200 opacity-90' : 'bg-green-50 border-green-100'}`}>
                                                {/* Indicador de carregamento ou sucesso */}

                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <label className={`text-sm font-bold flex items-center gap-2 ${isDefaultSetup ? 'text-gray-700' : 'text-green-900'}`}>
                                                            <Store className="w-4 h-4" /> Link da Loja Delivery (Divulgação)
                                                        </label>
                                                        {isDefaultSetup && (
                                                            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Requer Nome & Categoria</span>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2 mb-3">
                                                        <Input value={deliveryLink} readOnly className={`bg-white text-gray-600 font-mono text-xs ${isDefaultSetup ? 'border-gray-200' : 'border-green-200'}`} />
                                                        <Button variant="outline" className={`shrink-0 h-9 w-9 p-0 ${isDefaultSetup ? 'border-gray-200 text-gray-400' : 'border-green-200 hover:bg-green-100 text-green-700'}`} onClick={() => copyToClipboard(deliveryLink)} title="Copiar" disabled={isDefaultSetup}><Copy className="w-4 h-4" /></Button>
                                                        <Button variant="outline" className={`shrink-0 h-9 w-9 p-0 ${isDefaultSetup ? 'border-gray-200 text-gray-400' : 'border-green-200 hover:bg-green-100 text-green-700'}`} onClick={() => window.open(deliveryLink, '_blank')} title="Abrir" disabled={isDefaultSetup}><ExternalLink className="w-4 h-4" /></Button>
                                                    </div>

                                                    {/* Botão WhatsApp libera assim que isDefaultSetup for false */}
                                                    <div className={`transition-all duration-300 overflow-hidden ${isDefaultSetup ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
                                                        <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold gap-2 shadow-sm border-0" onClick={shareOnWhatsApp}>
                                                            <Share2 className="w-4 h-4" /> Enviar Link no WhatsApp
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className={`pt-3 border-t ${isDefaultSetup ? 'border-gray-200' : 'border-green-200/50'}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className={`text-xs font-semibold flex items-center gap-1 ${isDefaultSetup ? 'text-gray-500' : 'text-green-800'}`}><Globe className="w-3 h-3" /> Personalizar Link (Slug)</label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-500 font-mono hidden sm:inline whitespace-nowrap">{appBaseUrl}/place/</span>
                                                        <Input
                                                            placeholder="ex: hamburgueria-do-ze"
                                                            value={form.slug}
                                                            onChange={handleSlugChange}
                                                            className={`h-8 text-sm bg-white border-green-200 focus-visible:ring-green-500`}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1">Este é o nome que aparece no final do seu link.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-5 mt-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-1">
                                                Nome do Estabelecimento <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                placeholder="Ex: Pizzaria do João"
                                                className={isDefaultSetup && form.name === "Minha Loja Nova" ? "border-amber-400 bg-amber-50" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-1">
                                                Categoria <span className="text-red-500">*</span>
                                            </label>
                                            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                                                <SelectTrigger className={isDefaultSetup && !form.category ? "border-amber-400 bg-amber-50" : ""}>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>{establishmentCategories.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
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

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Descrição (Fale sobre o ambiente, música, estilo)</label>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-purple-600 hover:bg-purple-50 gap-1" onClick={handleGenerateMarketAI} disabled={isGeneratingAI}>
                                                {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Otimizar Busca
                                            </Button>
                                        </div>
                                        <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Ambiente familiar com música ao vivo toda sexta. Ótimo para casais..." className="min-h-[100px]" />
                                    </div>

                                    <div className="space-y-2"><label className="text-sm font-medium">Foto de Capa</label><div className="flex gap-4 items-center border p-4 rounded-lg bg-gray-50"><div className="w-24 h-16 bg-white border rounded bg-cover bg-center" style={{ backgroundImage: `url(${form.cover_image})` }} /><input type="file" id="cover" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} /><Button variant="outline" size="sm" onClick={() => document.getElementById('cover')?.click()}>{uploadingCover ? <Loader2 className="animate-spin" /> : <Upload />} Alterar</Button></div></div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md">
                                <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-purple-600" /> Horário de Funcionamento</CardTitle></CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {DAYS.map(day => {
                                        const dayData = form.opening_hours[day.key] || { open: "08:00", close: "18:00", closed: false };
                                        return (
                                            <div key={day.key} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3 sm:gap-0 ${dayData.closed ? 'bg-gray-50 border-dashed' : 'bg-white border-solid'}`}>
                                                <div className="flex items-center justify-between w-full sm:w-auto">
                                                    <div className="flex flex-col"><span className={`font-medium ${dayData.closed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{day.label}</span>{dayData.closed && <span className="text-[10px] text-red-400 font-bold uppercase">Fechado</span>}</div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                                    {!dayData.closed ? (
                                                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                                            <Input type="time" className="flex-1 sm:w-24 h-8 text-xs" value={dayData.open} onChange={e => updateDay(day.key, 'open', e.target.value)} />
                                                            <span className="text-gray-400">-</span>
                                                            <Input type="time" className="flex-1 sm:w-24 h-8 text-xs" value={dayData.close} onChange={e => updateDay(day.key, 'close', e.target.value)} />
                                                        </div>
                                                    ) : (<div className="flex-1 sm:flex-none flex items-center justify-center h-8 text-xs text-gray-400 bg-gray-100 rounded px-2 w-full sm:w-[210px]">Fechado</div>)}
                                                    <div className="ml-2 border-l pl-2 shrink-0"><Switch checked={!dayData.closed} onCheckedChange={(checked) => updateDay(day.key, 'closed', !checked)} className="data-[state=checked]:bg-green-600" /></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            <Card className="border-0 shadow-md h-fit sticky top-6">
                                <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle>Localização</CardTitle></CardHeader>
                                <CardContent className="space-y-4 pt-6"><LocationPicker lat={form.latitude} lng={form.longitude} isLoaded={isLoaded} onLocationSelect={(lat: number, lng: number, add: string) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng, address: add }))} /><Input value={form.address} readOnly className="bg-gray-100" /></CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- NOVA ABA DE PAGAMENTOS --- */}
                <TabsContent value="payments" className="space-y-6 mt-6">
                    <div className="flex justify-end">
                        <Button onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-200"><Save className="w-4 h-4" /> Salvar Alterações</Button>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Formas de Pagamento</CardTitle>
                            <CardDescription>Selecione quais métodos de pagamento você aceita na entrega ou retirada.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between border p-4 rounded-xl">
                                <div className="space-y-0.5">
                                    <label className="text-base font-medium text-gray-900">Cartão de Crédito</label>
                                    <p className="text-sm text-gray-500">Aceitar cartões de crédito na maquininha.</p>
                                </div>
                                <Switch checked={form.payment_methods.credit_card} onCheckedChange={() => togglePayment('credit_card')} />
                            </div>
                            <div className="flex items-center justify-between border p-4 rounded-xl">
                                <div className="space-y-0.5">
                                    <label className="text-base font-medium text-gray-900">Cartão de Débito</label>
                                    <p className="text-sm text-gray-500">Aceitar cartões de débito na maquininha.</p>
                                </div>
                                <Switch checked={form.payment_methods.debit_card} onCheckedChange={() => togglePayment('debit_card')} />
                            </div>
                            <div className="flex items-center justify-between border p-4 rounded-xl">
                                <div className="space-y-0.5">
                                    <label className="text-base font-medium text-gray-900">PIX</label>
                                    <p className="text-sm text-gray-500">Aceitar pagamentos via PIX no ato.</p>
                                </div>
                                <Switch checked={form.payment_methods.pix} onCheckedChange={() => togglePayment('pix')} />
                            </div>
                            <div className="flex items-center justify-between border p-4 rounded-xl">
                                <div className="space-y-0.5">
                                    <label className="text-base font-medium text-gray-900">Dinheiro</label>
                                    <p className="text-sm text-gray-500">Aceitar pagamentos em espécie.</p>
                                </div>
                                <Switch checked={form.payment_methods.cash} onCheckedChange={() => togglePayment('cash')} />
                            </div>
                        </CardContent>
                    </Card>
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