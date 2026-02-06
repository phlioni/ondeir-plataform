import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

// Substitua pelo seu ID real do Google Analytics
// DICA: Em produção, o ideal é usar variáveis de ambiente (import.meta.env.VITE_GA_ID)
const GA_MEASUREMENT_ID = "G-P9HN4WHTQ6";

// Inicializa o GA apenas uma vez
ReactGA.initialize(GA_MEASUREMENT_ID);

const GoogleAnalytics = () => {
    const location = useLocation();

    useEffect(() => {
        // Envia o pageview com a rota atual
        ReactGA.send({
            hitType: "pageview",
            page: location.pathname + location.search
        });
    }, [location]);

    return null; // Esse componente não renderiza nada visualmente
};

export default GoogleAnalytics;