import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Lista de provedores suportados (mock)
const PROVIDERS = [
    {
        id: 'mottu',
        name: 'Mottu Delivery',
        logo: 'https://play-lh.googleusercontent.com/yvXg7QhQdKkZqjJqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq=w240-h480-rw', // Placeholder
        desc: 'Entregas rápidas com motos. Ideal para alta demanda.'
    },
    {
        id: 'lalamove',
        name: 'Lalamove',
        logo: '',
        desc: 'Entregas de moto e carro. Cobertura ampla.'
    }
];

export function IntegrationsTab({ marketId }: { marketId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form states
    const [apiKey, setApiKey] = useState("");
    const [apiSecret, setApiSecret] = useState("");

    useEffect(() => {
        fetchIntegrations();
    }, [marketId]);

    const fetchIntegrations = async () => {
        const { data } = await supabase.from('market_integrations').select('*').eq('market_id', marketId);
        setIntegrations(data || []);
        setLoading(false);
    };

    const handleSave = async (providerId: string) => {
        if (!apiKey) return toast({ title: "API Key necessária", variant: "destructive" });

        const payload = {
            market_id: marketId,
            provider: providerId,
            api_key: apiKey,
            api_secret: apiSecret,
            is_active: true
        };

        const { error } = await supabase.from('market_integrations').upsert(payload, { onConflict: 'market_id, provider' });

        if (error) {
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Integração salva com sucesso!" });
            setEditingId(null);
            fetchIntegrations();
        }
    };

    const toggleIntegration = async (integration: any) => {
        await supabase.from('market_integrations').update({ is_active: !integration.is_active }).eq('id', integration.id);
        fetchIntegrations();
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {PROVIDERS.map(provider => {
                const activeConfig = integrations.find(i => i.provider === provider.id);
                const isConfigured = !!activeConfig;
                const isEditing = editingId === provider.id;

                return (
                    <Card key={provider.id} className={`border-2 ${activeConfig?.is_active ? 'border-green-100 bg-green-50/20' : ''}`}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                                        <CardDescription className="line-clamp-1">{provider.desc}</CardDescription>
                                    </div>
                                </div>
                                {isConfigured && (
                                    <Switch
                                        checked={activeConfig.is_active}
                                        onCheckedChange={() => toggleIntegration(activeConfig)}
                                    />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <div className="space-y-3 animate-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">API Key (Chave de Produção)</label>
                                        <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" placeholder="sk_live_..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">API Secret / ID</label>
                                        <Input value={apiSecret} onChange={e => setApiSecret(e.target.value)} type="password" placeholder="Opcional dependendo do parceiro" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {isConfigured ? (
                                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-100 p-2 rounded-md">
                                            <CheckCircle2 className="w-4 h-4" /> Conectado e Pronto
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">Conecte sua conta corporativa para solicitar entregadores automaticamente.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            {isEditing ? (
                                <div className="flex gap-2 w-full">
                                    <Button variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancelar</Button>
                                    <Button className="flex-1" onClick={() => handleSave(provider.id)}>Salvar Conexão</Button>
                                </div>
                            ) : (
                                <Button
                                    variant={isConfigured ? "outline" : "default"}
                                    className="w-full"
                                    onClick={() => {
                                        setApiKey(activeConfig?.api_key || "");
                                        setApiSecret(activeConfig?.api_secret || "");
                                        setEditingId(provider.id);
                                    }}
                                >
                                    {isConfigured ? "Editar Configurações" : "Conectar"}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}