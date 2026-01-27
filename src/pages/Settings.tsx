import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Loader2, Save, Upload, MapPin, Image as ImageIcon, Copy, ExternalLink, QrCode } from "lucide-react";

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '0.75rem' };
const defaultCenter = { lat: -23.550520, lng: -46.633308 };
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

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

    const [form, setForm] = useState({
        name: "", category: "", description: "", address: "", amenities: "", cover_image: "", latitude: 0, longitude: 0
    });

    // URL do Menu Digital
    const menuLink = market ? `${window.location.origin}/menu/${market.id}` : "";

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: m } = await supabase.from("markets").select("*").eq("owner_id", user.id).single();
                if (m) {
                    setMarket(m);
                    setForm({
                        name: m.name, category: m.category, description: m.description || "", address: m.address || "",
                        amenities: m.amenities?.join(", ") || "", cover_image: m.cover_image || "", latitude: m.latitude || 0, longitude: m.longitude || 0
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
                cover_image: form.cover_image, latitude: form.latitude, longitude: form.longitude, owner_id: user.id
            };
            if (market) await supabase.from("markets").update(payload).eq("id", market.id);
            else await supabase.from("markets").insert(payload);
            toast({ title: "Configurações salvas!" });
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        }
    };

    const copyToClipboard = () => {
        if (!menuLink) return;
        navigator.clipboard.writeText(menuLink);
        toast({ title: "Link copiado!", className: "bg-green-600 text-white" });
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Configurações</h1><Button onClick={handleSave}><Save className="mr-2 w-4 h-4" /> Salvar</Button></div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-0 shadow-md">
                    <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle>Dados Gerais</CardTitle></CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        {/* CAMPO NOVO: MENU DIGITAL */}
                        {market && (
                            <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                    <QrCode className="w-4 h-4" /> Menu Digital (Link Público)
                                </label>
                                <div className="flex gap-2">
                                    <Input value={menuLink} readOnly className="bg-white text-gray-600 font-mono text-sm border-blue-200" />
                                    <Button variant="outline" className="shrink-0 border-blue-200 hover:bg-blue-100 text-blue-700" onClick={copyToClipboard} title="Copiar Link">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" className="shrink-0 border-blue-200 hover:bg-blue-100 text-blue-700" onClick={() => window.open(menuLink, '_blank')} title="Abrir">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-blue-600">Envie este link para seus clientes ou gere um QR Code.</p>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-5">
                            <div className="space-y-2"><label className="text-sm font-medium">Nome</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="space-y-2"><label className="text-sm font-medium">Categoria</label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Bar">Bar</SelectItem><SelectItem value="Restaurante">Restaurante</SelectItem></SelectContent></Select></div>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium">Descrição</label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Foto de Capa</label><div className="flex gap-4 items-center border p-4 rounded-lg bg-gray-50"><div className="w-24 h-16 bg-white border rounded bg-cover bg-center" style={{ backgroundImage: `url(${form.cover_image})` }} /><input type="file" id="cover" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} /><Button variant="outline" size="sm" onClick={() => document.getElementById('cover')?.click()}>{uploadingCover ? <Loader2 className="animate-spin" /> : <Upload />} Alterar</Button></div></div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md h-fit">
                    <CardHeader className="bg-gray-50/80 border-b pb-4"><CardTitle>Localização</CardTitle></CardHeader>
                    <CardContent className="space-y-4 pt-6"><LocationPicker lat={form.latitude} lng={form.longitude} isLoaded={isLoaded} onLocationSelect={(lat: number, lng: number, add: string) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng, address: add }))} /><Input value={form.address} readOnly className="bg-gray-100" /></CardContent>
                </Card>
            </div>
        </div>
    );
}