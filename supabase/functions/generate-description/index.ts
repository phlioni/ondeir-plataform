import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { name, category, ingredients } = await req.json()

        if (!name) {
            throw new Error('O nome do prato é obrigatório.')
        }

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('Chave da API OpenAI não configurada.')
        }

        const prompt = `
      Aja como um chef copywriter experiente e criativo.
      Escreva uma descrição curta, suculenta e vendedora (máximo de 160 caracteres) para um cardápio digital.
      
      Prato: ${name}
      Categoria: ${category || 'Geral'}
      ${ingredients ? `Ingredientes destaque: ${ingredients}` : ''}
      
      O tom deve ser apetitoso e direto. Não use hashtags. Não use aspas.
      Responda APENAS com o texto da descrição.
    `

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Você é um assistente especializado em gastronomia.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
            }),
        })

        const data = await response.json()
        const description = data.choices[0].message.content.trim()

        return new Response(JSON.stringify({ description }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})