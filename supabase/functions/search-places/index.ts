import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { query, userLocation } = await req.json();
        const openAiKey = Deno.env.get('OPENAI_API_KEY');
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        console.log("Busca Universal por:", query);

        // 1. O CÉREBRO (Interpretação Expandida)
        const interpretationRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um assistente de turismo e gastronomia. O usuário fará uma busca. Identifique se ele quer COMIDA (ingrediente, prato) ou AMBIENTE (música, romance, kids). Retorne palavras-chave expandidas. Ex: "Música ao vivo" -> "show banda cantor voz violão rock sertanejo". "Ressaca" -> "hambúrguer gordura bacon coca-cola". "Jantar" -> "restaurante prato refeição".'
                    },
                    { role: 'user', content: query }
                ],
                temperature: 0.3,
            }),
        });

        const interpretationData = await interpretationRes.json();
        const searchContext = interpretationData.choices[0].message.content.trim();

        // 2. GERAR EMBEDDING (Da intenção)
        const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: `${query}: ${searchContext}`,
            }),
        });
        const embeddingData = await embeddingRes.json();
        const queryEmbedding = embeddingData.data ? embeddingData.data[0].embedding : null;

        if (!queryEmbedding) throw new Error("Falha ao gerar vetor.");

        // 3. BUSCAS PARALELAS (Produtos vs Mercados)
        const [productResults, marketResults] = await Promise.all([
            // Busca PRODUTOS (Comida)
            supabase.rpc('search_menu_items', {
                query_embedding: queryEmbedding,
                match_threshold: 0.35,
                match_count: 20
            }),
            // Busca MERCADOS (Locais/Ambiente)
            supabase.rpc('search_markets', {
                query_embedding: queryEmbedding,
                match_threshold: 0.35,
                match_count: 10
            })
        ]);

        // 4. UNIFICAÇÃO E ENRIQUECIMENTO
        let allResults = [];

        // Processar Mercados (Eles ganham prioridade se a busca for "Música", "Ambiente")
        if (marketResults.data) {
            marketResults.data.forEach((m: any) => {
                allResults.push({
                    type: 'venue', // Tipo Local
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    image_url: m.cover_image,
                    market: m, // O próprio mercado é o dado principal
                    similarity: m.similarity + 0.05, // Bônus pequeno para locais
                    distance: 0
                });
            });
        }

        // Processar Produtos (Precisam buscar os dados do mercado pai)
        if (productResults.data) {
            const marketIds = [...new Set(productResults.data.map((p: any) => p.market_id))];
            const { data: markets } = await supabase.from('markets').select('*').in('id', marketIds);

            productResults.data.forEach((p: any) => {
                const market = markets?.find(m => m.id === p.market_id);
                allResults.push({
                    type: 'product', // Tipo Produto
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    image_url: null,
                    market: market,
                    similarity: p.similarity,
                    distance: 0
                });
            });
        }

        // 5. CALCULAR DISTÂNCIAS
        allResults = allResults.map(item => {
            if (userLocation && item.market?.latitude && item.market?.longitude) {
                item.distance = calculateDistance(userLocation.lat, userLocation.lng, item.market.latitude, item.market.longitude);
            }
            return item;
        });

        // 6. ORDENAÇÃO FINAL
        if (userLocation) {
            allResults.sort((a, b) => {
                // Se a diferença de relevância for brutal (> 15%), ganha a relevância
                // Ex: Busca "Pizza" -> Pizzaria (0.85) ganha de Farmácia perto (0.2)
                if (Math.abs(a.similarity - b.similarity) > 0.15) {
                    return b.similarity - a.similarity;
                }
                // Se for parecido, ganha a distância
                return a.distance - b.distance;
            });
        } else {
            allResults.sort((a, b) => b.similarity - a.similarity);
        }

        return new Response(JSON.stringify({ results: allResults.slice(0, 50), type: 'mixed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});