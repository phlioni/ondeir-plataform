import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform', // <--- O SEGREDO ESTÁ AQUI
}

Deno.serve(async (req) => {
    // 1. Tratamento do Preflight (OPTIONS) - Necessário para CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { id, name, description, category, type } = await req.json()

        if (!id || !name) throw new Error('Dados incompletos.')

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const supabase = createClient(supabaseUrl!, supabaseKey!)

        // 2. Monta o texto dependendo se é Produto ou Restaurante
        let textToEmbed = '';

        if (type === 'market') {
            // Contexto para Restaurante (Local)
            textToEmbed = `Restaurante Local: ${name}. Categoria: ${category || 'Geral'}. Ambiente e Detalhes: ${description || ''}`;
        } else {
            // Contexto para Produto (Comida)
            textToEmbed = `Prato/Item: ${name}. Categoria: ${category || 'Geral'}. Ingredientes e Detalhes: ${description || ''}`;
        }

        // 3. Gera o Vetor na OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: textToEmbed.trim(),
            }),
        })

        const embeddingData = await embeddingResponse.json()

        if (embeddingData.error) {
            throw new Error(`Erro OpenAI: ${embeddingData.error.message}`)
        }

        const embedding = embeddingData.data[0].embedding

        // 4. Salva na tabela correta
        const table = type === 'market' ? 'markets' : 'menu_items';

        const { error } = await supabase
            .from(table)
            .update({ embedding })
            .eq('id', id)

        if (error) throw error

        return new Response(JSON.stringify({ success: true, table, type }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})