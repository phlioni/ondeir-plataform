import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

// Substitua pelo seu ID real do Google Analytics
const GA_MEASUREMENT_ID = "G-P9HN4WHTQ6";

// Inicializa o GA apenas uma vez (evita duplicidade em dev/strict mode)
// @ts-ignore
if (!window.ga_initialized) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    // @ts-ignore
    window.ga_initialized = true;
}

const GoogleAnalytics = () => {
    const location = useLocation();

    // 1. Rastreamento de Visualização de Página (Page Views)
    useEffect(() => {
        ReactGA.send({
            hitType: "pageview",
            page: location.pathname + location.search,
            title: document.title // Envia também o título da aba
        });
    }, [location]);

    // 2. Rastreamento Automático de Cliques (Botões e Links)
    useEffect(() => {
        const handleGlobalClick = (event: MouseEvent) => {
            // Verifica se o elemento clicado (ou o pai dele) é um botão ou link
            const target = (event.target as HTMLElement).closest('button, a');

            if (target) {
                const element = target as HTMLElement;

                // Tenta pegar o nome do botão (texto, aria-label ou ID)
                // Se não tiver nada, marca como 'elemento_sem_nome'
                const actionLabel =
                    element.innerText?.trim() ||
                    element.getAttribute('aria-label') ||
                    element.id ||
                    'elemento_sem_nome';

                const elementType = element.tagName.toLowerCase(); // 'button' ou 'a'

                // Envia o evento personalizado para o GA
                ReactGA.event({
                    category: "Interação do Usuário",
                    action: `clique_${elementType}`, // Ex: clique_button
                    label: actionLabel,              // Ex: "Salvar Pedido"
                    nonInteraction: false
                });

                // Console log para depuração (opcional - ajuda a ver se está funcionando)
                // console.log(`[GA4] Clique rastreado: ${elementType} - ${actionLabel}`);
            }
        };

        // Ativa o escutador no documento todo
        document.addEventListener('click', handleGlobalClick);

        // Limpa o escutador quando o componente desmontar
        return () => {
            document.removeEventListener('click', handleGlobalClick);
        };
    }, []);

    return null; // Componente invisível
};

export default GoogleAnalytics;