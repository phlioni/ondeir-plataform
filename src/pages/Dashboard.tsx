import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Loader2, Plus, Trash, Store, Save, LogOut, Upload, MapPin, Image as ImageIcon, LayoutGrid, Utensils } from "lucide-react";

// --- CONSTANTES ---
const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '0.75rem' };
const defaultCenter = { lat: -23.550520, lng: -46.633308 };
const GOOGLE_MAPS_LIBRARIES: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

// --- COMPONENTE DE SELEÇÃO DE LOCALIZAÇÃO ---
interface LocationPickerProps {
    lat?: number;
    lng?: number;
    onLocationSelect: (lat: number, lng: number, address: string) => void;
    isLoaded: boolean;
}

function LocationPicker({ lat, lng, onLocationSelect, isLoaded }: LocationPickerProps) {
    const [marker, setMarker] = useState(defaultCenter);
    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        if (navigator.geolocation && (!lat || lat === 0)) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setMarker(pos);
                    mapRef.current?.panTo(pos);
                    geocodePosition(pos.lat, pos.lng);
                },
                (error) => console.log("Erro GPS:", error)
            );
        } else if (lat && lng) {
            setMarker({ lat, lng });
        }
    }, [lat, lng]);

    const geocodePosition = (lat: number, lng: number) => {
        if (!window.google || !window.google.maps) return;

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
                onLocationSelect(lat, lng, results[0].formatted_address);
            } else {
                onLocationSelect(lat, lng, "");
            }
        });
    };

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setMarker({ lat: newLat, lng: newLng });
            geocodePosition(newLat, newLng);
        }
    };

    const handleDragEnd = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            handleMapClick(e);
        }
    };

    if (!isLoaded) return <div className="h-[350px] bg-gray-100 rounded-xl flex items-center justify-center animate-pulse text-gray-400">Carregando Mapa...</div>;

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={marker}
            zoom={15}
            onClick={handleMapClick}
            onLoad={(map) => { mapRef.current = map; }}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false
            }}
        >
            <Marker
                position={marker}
                draggable={true}
                onDragEnd={handleDragEnd}
                animation={window.google?.maps?.Animation?.DROP}
            />
        </GoogleMap>
    );
}

// --- PÁGINA DASHBOARD ---
export default function Dashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || "",
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const [market, setMarket] = useState<any>(null);
    const [marketForm, setMarketForm] = useState({
        name: "",
        category: "",
        description: "",
        address: "",
        amenities: "",
        cover_image: "",
        latitude: 0,
        longitude: 0
    });
    const [uploadingCover, setUploadingCover] = useState(false);

    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ name: "", price: "", description: "", category: "Comida", image_url: "" });
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [uploadingProduct, setUploadingProduct] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate("/auth");
        setUser(user);

        const { data: userMarket } = await supabase
            .from("markets")
            .select("*")
            .eq("owner_id", user.id)
            .single();

        if (userMarket) {
            setMarket(userMarket);
            setMarketForm({
                name: userMarket.name,
                category: userMarket.category,
                description: userMarket.description || "",
                address: userMarket.address || "",
                amenities: userMarket.amenities ? userMarket.amenities.join(", ") : "",
                cover_image: userMarket.cover_image || "",
                latitude: userMarket.latitude || 0,
                longitude: userMarket.longitude || 0
            });
            fetchMenu(userMarket.id);
        }
        setLoading(false);
    };

    const fetchMenu = async (marketId: string) => {
        const { data } = await supabase
            .from("menu_items")
            .select("*")
            .eq("market_id", marketId)
            .order("created_at", { ascending: false });
        setMenuItems(data || []);
    };

    const handleUpload = async (file: File, bucket: string = 'images'): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error: any) {
            toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
            return null;
        }
    };

    const handleSaveMarket = async () => {
        setLoading(true);
        try {
            if (marketForm.latitude === 0 || marketForm.longitude === 0) {
                toast({ title: "Localização Obrigatória", description: "Selecione seu estabelecimento no mapa.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const payload = {
                name: marketForm.name,
                category: marketForm.category,
                description: marketForm.description,
                address: marketForm.address,
                amenities: marketForm.amenities.split(",").map(s => s.trim()).filter(Boolean),
                cover_image: marketForm.cover_image,
                latitude: marketForm.latitude,
                longitude: marketForm.longitude,
                owner_id: user.id,
            };

            if (market) {
                await supabase.from("markets").update(payload).eq("id", market.id);
                toast({ title: "Estabelecimento atualizado!" });
            } else {
                const { data, error } = await supabase.from("markets").insert(payload).select().single();
                if (error) throw error;
                setMarket(data);
                toast({ title: "Estabelecimento criado!" });
            }
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!market) return;
        setIsAddingItem(true);
        try {
            const { error } = await supabase.from("menu_items").insert({
                market_id: market.id,
                name: newItem.name,
                description: newItem.description,
                price: parseFloat(newItem.price),
                category: newItem.category,
                image_url: newItem.image_url
            });

            if (error) throw error;

            setNewItem({ name: "", price: "", description: "", category: "Comida", image_url: "" });
            fetchMenu(market.id);
            toast({ title: "Item adicionado!" });
        } catch (error) {
            console.error(error);
        } finally {
            setIsAddingItem(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        await supabase.from("menu_items").delete().eq("id", id);
        fetchMenu(market!.id);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* --- HEADER --- */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="container mx-auto max-w-6xl px-4 h-16 flex justify-between items-center">
                    <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-primary truncate">
                        <Store className="w-5 h-5" />
                        <span className="hidden md:inline">Gestão do Parceiro</span>
                        <span className="md:hidden">Gestão</span>
                    </h1>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4 mr-2" /> Sair
                    </Button>
                </div>
            </header>

            <main className="container mx-auto max-w-6xl p-4">
                <Tabs defaultValue="info" className="w-full">

                    {/* --- ABAS CORRIGIDAS (GRID 50/50) --- */}
                    <div className="mb-6 sticky top-16 z-10 bg-gray-50 pt-2 pb-2">
                        <TabsList className="grid w-full grid-cols-2 bg-white border rounded-xl shadow-sm h-12 p-1">
                            <TabsTrigger
                                value="info"
                                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-gray-500 font-medium text-sm md:text-base"
                            >
                                <LayoutGrid className="w-4 h-4 shrink-0" />
                                <span className="truncate">Local</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="menu"
                                disabled={!market}
                                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-gray-500 font-medium text-sm md:text-base"
                            >
                                <Utensils className="w-4 h-4 shrink-0" />
                                <span className="truncate">Cardápio</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="info" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Coluna Esquerda: Informações */}
                            <Card className="lg:col-span-2 border-0 shadow-md overflow-hidden">
                                <CardHeader className="bg-gray-50/80 border-b pb-4">
                                    <CardTitle className="text-base font-semibold text-gray-800">Dados do Estabelecimento</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5 pt-6">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Nome do Local</label>
                                            <Input
                                                value={marketForm.name}
                                                onChange={e => setMarketForm({ ...marketForm, name: e.target.value })}
                                                placeholder="Ex: Bar do Zé"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Categoria</label>
                                            <Select
                                                value={marketForm.category}
                                                onValueChange={v => setMarketForm({ ...marketForm, category: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Bar">Bar</SelectItem>
                                                    <SelectItem value="Restaurante">Restaurante</SelectItem>
                                                    <SelectItem value="Balada">Balada</SelectItem>
                                                    <SelectItem value="Café">Café</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Descrição (Para a IA)</label>
                                        <Textarea
                                            value={marketForm.description}
                                            onChange={e => setMarketForm({ ...marketForm, description: e.target.value })}
                                            placeholder="Ex: Música ao vivo, chopp artesanal..."
                                            rows={3}
                                            className="resize-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Comodidades</label>
                                        <Input
                                            value={marketForm.amenities}
                                            onChange={e => setMarketForm({ ...marketForm, amenities: e.target.value })}
                                            placeholder="Ex: wifi, pet friendly, área kids"
                                        />
                                    </div>

                                    {/* Upload de Capa */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Foto de Capa</label>
                                        <div className="flex items-center gap-4 p-4 border rounded-xl bg-gray-50 border-dashed hover:bg-gray-100 transition-colors">
                                            <div className="w-24 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center bg-cover bg-center shadow-sm border"
                                                style={{ backgroundImage: marketForm.cover_image ? `url(${marketForm.cover_image})` : 'none' }}>
                                                {!marketForm.cover_image && <ImageIcon className="text-gray-300" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 mb-2">Recomendado: 1200x600px</p>
                                                <input
                                                    type="file"
                                                    id="cover-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setUploadingCover(true);
                                                            const url = await handleUpload(file);
                                                            if (url) setMarketForm({ ...marketForm, cover_image: url });
                                                            setUploadingCover(false);
                                                        }
                                                    }}
                                                />
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={uploadingCover} onClick={() => document.getElementById('cover-upload')?.click()}>
                                                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                    {marketForm.cover_image ? "Trocar Foto" : "Enviar Foto"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Coluna Direita: Mapa e Endereço */}
                            <Card className="border-0 shadow-md h-fit overflow-hidden">
                                <CardHeader className="bg-gray-50/80 border-b pb-4">
                                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2"><MapPin className="w-4 h-4" /> Localização</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ponto no Mapa</label>
                                        <LocationPicker
                                            lat={marketForm.latitude}
                                            lng={marketForm.longitude}
                                            isLoaded={isLoaded}
                                            onLocationSelect={(lat, lng, address) => {
                                                setMarketForm(prev => ({
                                                    ...prev,
                                                    latitude: lat,
                                                    longitude: lng,
                                                    address: address
                                                }));
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Endereço (Automático)</label>
                                        <Input
                                            value={marketForm.address}
                                            readOnly
                                            placeholder="Selecione no mapa acima..."
                                            className="bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                    </div>

                                    <Button className="w-full h-12 text-base font-semibold mt-2 shadow-lg shadow-primary/20" onClick={handleSaveMarket} disabled={loading}>
                                        <Save className="w-5 h-5 mr-2" /> Salvar Tudo
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="menu" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Form de Cadastro */}
                            <Card className="lg:col-span-1 h-fit shadow-md border-0">
                                <CardHeader className="bg-gray-50/80 border-b pb-4">
                                    <CardTitle className="text-base font-semibold">Novo Produto</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">

                                    <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                                        onClick={() => document.getElementById('prod-upload')?.click()}>
                                        <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center bg-cover bg-center shadow-sm border group-hover:scale-105 transition-transform"
                                            style={{ backgroundImage: newItem.image_url ? `url(${newItem.image_url})` : 'none' }}>
                                            {!newItem.image_url && <ImageIcon className="text-gray-300 w-8 h-8" />}
                                        </div>
                                        <div className="text-center">
                                            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                                                {uploadingProduct ? "Enviando..." : (newItem.image_url ? "Trocar Foto" : "Carregar Foto")}
                                            </span>
                                        </div>
                                        <input
                                            type="file"
                                            id="prod-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setUploadingProduct(true);
                                                    const url = await handleUpload(file);
                                                    if (url) setNewItem({ ...newItem, image_url: url });
                                                    setUploadingProduct(false);
                                                }
                                            }}
                                        />
                                    </div>

                                    <Input
                                        placeholder="Nome do produto"
                                        value={newItem.name}
                                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                        className="bg-white"
                                    />
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">R$</span>
                                            <Input
                                                placeholder="0.00"
                                                type="number"
                                                className="pl-8 bg-white"
                                                value={newItem.price}
                                                onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                            />
                                        </div>
                                        <Select
                                            value={newItem.category}
                                            onValueChange={v => setNewItem({ ...newItem, category: v })}
                                        >
                                            <SelectTrigger className="w-[130px] bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Comida">Comida</SelectItem>
                                                <SelectItem value="Bebida">Bebida</SelectItem>
                                                <SelectItem value="Sobremesa">Sobremesa</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Textarea
                                        placeholder="Ingredientes, porção..."
                                        value={newItem.description}
                                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                        rows={3}
                                        className="bg-white resize-none"
                                    />
                                    <Button className="w-full" onClick={handleAddItem} disabled={isAddingItem || !newItem.name}>
                                        <Plus className="w-4 h-4 mr-2" /> Adicionar
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Lista de Produtos */}
                            <div className="lg:col-span-2 space-y-4">
                                {menuItems.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl bg-gray-50 text-gray-400">
                                        <Utensils className="w-8 h-8 mb-2 opacity-50" />
                                        <p className="text-sm">Cardápio vazio.</p>
                                    </div>
                                )}

                                {menuItems.map(item => (
                                    <div key={item.id} className="bg-white p-3 rounded-xl border shadow-sm flex gap-4 items-center hover:shadow-md transition-shadow group">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 bg-cover bg-center border"
                                            style={{ backgroundImage: `url(${item.image_url || '/placeholder.svg'})` }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-base text-gray-800 leading-tight">{item.name}</h4>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{item.category}</span>
                                                </div>
                                                <span className="text-primary font-bold text-base">R$ {item.price.toFixed(2)}</span>
                                            </div>
                                            <p className="text-gray-500 text-xs mt-1 line-clamp-1">{item.description}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => handleDeleteItem(item.id)}>
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}