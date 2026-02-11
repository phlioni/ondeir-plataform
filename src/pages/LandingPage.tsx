import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight,
    CheckCircle2,
    Coins,
    Smartphone,
    TrendingUp,
    Zap,
    ShieldCheck,
    Rocket,
    Utensils,
    Bike,
    Repeat,
    QrCode,
    Store,
    LayoutDashboard,
    HeartHandshake,
    Play
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';

// --- CONFIGURAÇÃO DE SEO DE ALTA PERFORMANCE ---
const SEO_DATA = {
    title: "Flippi | O Sistema de Delivery que Potencializa seu Negócio (Grátis)",
    description: "Chega de pagar mensalidades. Tenha Cardápio Digital, Comanda de Mesa e Gestão de Entregadores em uma plataforma única. Comece a crescer hoje.",
    url: "https://appflippi.com",
    image: "/images/smart-hub.png",
    twitterHandle: "@flippiapp"
};

// --- SCHEMA MARKUP ---
const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Flippi",
    "headline": "Acelerador de Negócios Gastronômicos",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, Android, iOS",
    "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "BRL",
        "description": "Acesso Vitalício Gratuito para Empreendedores."
    },
    "description": SEO_DATA.description
};

// --- COMPONENTES VISUAIS (FRAMES) ---
const DesktopFrame = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative rounded-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 bg-white ${className}`}>
        <div className="h-9 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2" aria-hidden="true">
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            </div>
            <div className="mx-auto w-1/3 h-5 bg-slate-100 rounded-md border border-slate-200/50"></div>
        </div>
        <div className="relative">
            {children}
        </div>
    </div>
);

const MobileFrame = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative rounded-[2rem] md:rounded-[2.5rem] border-[6px] border-slate-900 overflow-hidden shadow-2xl bg-slate-900 ${className}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-4 md:h-5 bg-slate-900 rounded-b-xl z-20"></div>
        <div className="relative z-10 bg-white h-full w-full">
            {children}
        </div>
    </div>
);

// --- COMPONENTE TIMELINE ---
const TimelineStep = ({ icon: Icon, title, desc, step }: { icon: any, title: string, desc: string, step: string }) => (
    <div className="relative flex gap-4 md:gap-8 group pl-2 md:pl-0">
        <div className="absolute left-8 top-14 bottom-[-3rem] w-0.5 bg-slate-200 group-last:hidden md:left-8"></div>
        <div className="relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center group-hover:border-emerald-500 group-hover:shadow-emerald-100 transition-all duration-300">
            <Icon className="w-5 h-5 md:w-7 md:h-7 text-emerald-600" aria-hidden="true" />
            <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-900 text-white text-[10px] md:text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm">
                {step}
            </div>
        </div>
        <div className="pb-10 pt-1">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 leading-relaxed max-w-md text-sm md:text-base">{desc}</p>
        </div>
    </div>
);

// --- BARRA DE MISSÃO (NOVO CONCEITO) ---
const MissionBanner = ({ onCtaClick }: { onCtaClick: () => void }) => (
    <div className="bg-slate-900 text-white relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-2/3 h-full bg-emerald-500/10 blur-xl pointer-events-none"></div>
        <div className="container mx-auto px-4 py-3 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
                <div className="flex items-start md:items-center gap-3 text-center md:text-left w-full md:w-auto justify-center md:justify-start">
                    <div className="hidden md:flex bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg shrink-0 animate-pulse">
                        <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm md:text-base font-medium text-slate-200">
                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] md:text-xs block mb-0.5">
                                Movimento Empreendedor
                            </span>
                            Nossa missão é ver você crescer. <span className="text-white font-bold underline decoration-emerald-500 decoration-2 underline-offset-2">Plataforma 100% Gratuita</span> para alavancar seu negócio.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <Button
                        onClick={onCtaClick}
                        size="sm"
                        className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full h-10 md:h-9 px-5 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 whitespace-nowrap animate-bounce-subtle"
                    >
                        Criar Minha Conta Grátis
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
);

export default function LandingPage() {
    const navigate = useNavigate();

    // Redirecionamento Direto para Cadastro
    const handleStartNow = () => {
        navigate("/auth", { state: { intent: 'signup' } });
    };

    const handleWhatsappClick = () => {
        window.open("https://wa.me/5513997977755?text=Olá!%20Tenho%20dúvidas%20sobre%20o%20Flippi%20e%20como%20potencializar%20meu%20negócio.", "_blank", "noopener noreferrer");
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">

            <Helmet>
                <title>{SEO_DATA.title}</title>
                <meta name="description" content={SEO_DATA.description} />
                <link rel="canonical" href={SEO_DATA.url} />
                <meta name="robots" content="index, follow" />
                <script type="application/ld+json">
                    {JSON.stringify(schemaMarkup)}
                </script>
            </Helmet>

            <MissionBanner onCtaClick={handleStartNow} />

            <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
                <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                        <img
                            src="/images/logo-flippi-verde.png"
                            alt="Logo Flippi"
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <div className="bg-emerald-600 p-1.5 rounded-lg shadow-sm hidden">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-emerald-950">Flippi</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/auth" className="hidden sm:block">
                            <Button variant="ghost" className="font-medium text-slate-600 hover:text-emerald-600">
                                Já sou parceiro
                            </Button>
                        </Link>
                        <Button onClick={handleStartNow} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 font-semibold shadow-emerald-200 shadow-md">
                            Começar Agora
                        </Button>
                    </div>
                </nav>
            </header>

            <main>

                {/* --- HERO SECTION DE ALTO IMPACTO --- */}
                <section aria-label="Introdução" className="relative pt-12 pb-16 md:pt-20 lg:pt-32 overflow-visible bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-white">
                    <div className="container mx-auto px-4 text-center z-10 relative">

                        <div className="max-w-5xl mx-auto mb-12 md:mb-16 space-y-6 md:space-y-8">

                            {/* Tagline de Autoridade */}
                            <div className="flex items-center justify-center gap-2 mb-4 animate-in fade-in zoom-in duration-500">
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 uppercase tracking-wide">
                                    <Rocket className="w-3 h-3" />
                                    Tecnologia de Franquia • Custo Zero
                                </Badge>
                            </div>

                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                Potencialize Seu Delivery. <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                                    Elimine Taxas. Cresça Grátis.
                                </span>
                            </h1>

                            <p className="text-base md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto px-2 font-medium">
                                A única plataforma <strong>All-in-One</strong> que te dá Cardápio Digital, Comanda de Mesa e Gestão de Entregadores sem cobrar mensalidade. <br className="hidden md:block" />Feito de empreendedor para empreendedor.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-4 px-4 md:px-0">
                                <Button size="lg" onClick={handleStartNow} className="w-full sm:w-auto h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl shadow-emerald-200 transition-all font-bold transform hover:scale-105 duration-200">
                                    Quero Potencializar Meu Negócio
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>

                            <div className="pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span>Setup em 30 segundos</span>
                                </div>
                                <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full"></div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span>Sem cartão de crédito</span>
                                </div>
                                <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full"></div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span>Acesso Imediato</span>
                                </div>
                            </div>
                        </div>

                        {/* HERO IMAGES - PROVA DO PRODUTO */}
                        <div className="relative max-w-6xl mx-auto perspective-1000 mt-10 md:mt-16 px-2 sm:px-0">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-400/20 blur-[80px] md:blur-[120px] -z-10 rounded-full pointer-events-none"></div>

                            <div className="relative z-10">
                                <DesktopFrame className="border-slate-200/80 shadow-2xl">
                                    <img
                                        src="/images/smart-hub.png"
                                        alt="Dashboard Flippi"
                                        className="w-full h-auto object-cover"
                                        width="1200"
                                        height="675"
                                        loading="eager"
                                    />
                                    {/* Overlay sutil para dar profundidade */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none"></div>
                                </DesktopFrame>
                            </div>

                            {/* Elemento flutuante mobile */}
                            <div className="absolute -bottom-6 -right-2 md:-bottom-12 md:-right-8 w-[28%] md:w-[22%] z-20 shadow-2xl rounded-[2rem] md:rounded-[2.5rem] transform rotate-[-3deg] border-4 border-white transition-transform hover:rotate-0 duration-500">
                                <MobileFrame>
                                    <img
                                        src="/images/hero-app.JPG"
                                        alt="App Mobile Flippi"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </MobileFrame>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- SEÇÃO: POR QUE É DIFERENTE? --- */}
                <section className="py-16 md:py-24 bg-white border-y border-slate-100">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <Badge variant="outline" className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700">Omnicanalidade Real</Badge>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Um Sistema. Todo o Controle.</h2>
                            <p className="text-slate-600 text-lg">
                                Centralize sua operação. O Flippi acaba com a bagunça de ter vários tablets e impressoras. É Delivery, Mesa e Balcão falando a mesma língua.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Card Delivery - Foco em Venda */}
                            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition-all duration-300 group">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Smartphone className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Sua Marca, Seu Lucro</h3>
                                <p className="text-slate-600 mb-6">
                                    Um link de delivery próprio para vender no Instagram e WhatsApp sem pagar comissão por pedido. O cliente é seu, não do marketplace.
                                </p>
                                <ul className="text-sm text-slate-500 space-y-2 text-left w-full max-w-xs mx-auto">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Identidade Visual Personalizada</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Checkout Simplificado</li>
                                </ul>
                            </div>

                            {/* Card Mesa - Foco em Agilidade */}
                            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition-all duration-300 group">
                                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <QrCode className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Autoatendimento na Mesa</h3>
                                <p className="text-slate-600 mb-6">
                                    Agilize o giro de mesas. Seu cliente escaneia o QR Code, pede e o pedido sai direto na cozinha. Menos garçons, mais eficiência.
                                </p>
                                <ul className="text-sm text-slate-500 space-y-2 text-left w-full max-w-xs mx-auto">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Sem custo de implantação</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Zero erros de anotação</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- TIMELINE: COMO FUNCIONA (SIMPLICIDADE) --- */}
                <section id="como-funciona" aria-label="Smart Hub" className="py-16 md:py-24 bg-slate-50 scroll-mt-20">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-10 md:gap-16 items-start">

                            <div className="lg:sticky lg:top-32 text-center lg:text-left">
                                <Badge variant="outline" className="border-purple-200 text-purple-700 mb-4 md:mb-6 bg-purple-50">
                                    Smart Hub
                                </Badge>
                                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 md:mb-6 leading-tight">
                                    Operação Profissional <br />
                                    <span className="text-purple-600">Ao Alcance de Todos.</span>
                                </h2>
                                <p className="text-base md:text-lg text-slate-600 mb-6 md:mb-8 leading-relaxed px-4 md:px-0">
                                    Não importa se você vende 10 ou 1000 pedidos por dia. Nossa tecnologia organiza a jornada do pedido, da cozinha à entrega, garantindo que você escale sem caos.
                                </p>
                                <Button onClick={handleStartNow} className="w-full sm:w-auto h-12 px-8 bg-slate-900 text-white rounded-full hover:bg-slate-800 shadow-lg transition-transform hover:scale-105">
                                    Criar Conta e Testar Agora
                                </Button>
                            </div>

                            <div className="pl-0 lg:pl-10 relative mt-4 md:mt-0">
                                <TimelineStep
                                    step="1"
                                    icon={LayoutDashboard}
                                    title="Tudo numa Tela Só"
                                    desc="Pedidos do Delivery, Mesa e Balcão centralizados. O fim das múltiplas abas abertas."
                                />
                                <TimelineStep
                                    step="2"
                                    icon={Utensils}
                                    title="KDS (Tela de Cozinha)"
                                    desc="Substitua as impressoras de papel por telas organizadas. A cozinha produz mais rápido e sem erros."
                                />
                                <TimelineStep
                                    step="3"
                                    icon={Bike}
                                    title="Logística Descomplicada"
                                    desc="Organize seus entregadores e rotas com um clique. O cliente recebe atualizações em tempo real."
                                />
                                <TimelineStep
                                    step="4"
                                    icon={Repeat}
                                    title="Fidelidade Automática"
                                    desc="O sistema convida seu cliente a voltar. Transforme pedidos pontuais em receita recorrente."
                                />
                            </div>

                        </div>
                    </div>
                </section>

                {/* --- FIDELIDADE (O SEGREDO DO CRESCIMENTO) --- */}
                <section aria-label="Sistema de Fidelidade" className="py-16 md:py-24 bg-white overflow-hidden">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-10 md:gap-16 items-center">

                            <div className="relative flex justify-center lg:justify-end order-first lg:order-1 mb-8 lg:mb-0">
                                <div className="absolute inset-0 bg-yellow-400/20 blur-[60px] md:blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="relative z-10 w-[240px] md:w-[320px] transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                                    <MobileFrame>
                                        <img
                                            src="/images/coins-popup.jpeg"
                                            alt="App de Fidelidade"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </MobileFrame>
                                </div>
                            </div>

                            <div className="space-y-6 md:space-y-8 order-last lg:order-2 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-bold border border-yellow-200 shadow-sm">
                                    <Coins className="h-4 w-4" />
                                    Flippi Coins
                                </div>

                                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight">
                                    Transforme Clientes em <br />
                                    <span className="text-yellow-500">Fãs Recorrentes.</span>
                                </h2>

                                <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                                    Grandes apps viciam os usuários com cashback e pontos. Agora você tem essa mesma arma poderosa no seu negócio. O cliente ganha Coins e volta para gastar com você.
                                </p>

                                <ul className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-100 space-y-4 text-left">
                                    <li className="flex items-start gap-3">
                                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5 min-w-[1.5rem]"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                                        <span className="text-slate-700 text-sm md:text-base">
                                            <strong>Retenção Real:</strong> O cliente prefere pedir de você porque tem saldo acumulado.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5 min-w-[1.5rem]"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                                        <span className="text-slate-700 text-sm md:text-base">
                                            <strong>Controle Total:</strong> Você define as regras do jogo. Invista em quem traz retorno.
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- TRANSPARÊNCIA (O QUE NÃO SOMOS) --- */}
                <section aria-label="Benefícios" className="py-16 md:py-24 bg-slate-50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 md:mb-6">O que o Flippi NÃO é:</h2>
                            <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                                Acreditamos na transparência radical. Somos parceiros, não sócios do seu lucro.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {[
                                {
                                    icon: TrendingUp,
                                    title: "Não somos Sócios",
                                    desc: "Não cobramos comissão sobre seus pedidos. O faturamento é 100% seu.",
                                    color: "text-emerald-600",
                                    bg: "bg-white border-emerald-100"
                                },
                                {
                                    icon: Smartphone,
                                    title: "Não somos Marketplace",
                                    desc: "Não colocamos você numa lista para brigar por preço com o vizinho. Fortalecemos a SUA marca.",
                                    color: "text-blue-600",
                                    bg: "bg-white border-blue-100"
                                },
                                {
                                    icon: ShieldCheck,
                                    title: "Não retemos seu dinheiro",
                                    desc: "Use seu próprio Pix ou maquininha. O dinheiro cai na sua conta na hora, sem intermediários.",
                                    color: "text-purple-600",
                                    bg: "bg-white border-purple-100"
                                }
                            ].map((item, i) => (
                                <Card key={i} className={`border shadow-sm rounded-2xl md:rounded-3xl overflow-hidden ${item.bg} hover:shadow-md transition-shadow`}>
                                    <CardContent className="p-6 md:p-8">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center mb-4 md:mb-6`}>
                                            <item.icon className={`h-6 w-6 md:h-7 md:w-7 ${item.color}`} aria-hidden="true" />
                                        </div>
                                        <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3">{item.title}</h3>
                                        <p className="text-sm md:text-base text-slate-600 leading-relaxed">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- OFERTA DE VALOR (GRATUIDADE) --- */}
                <section aria-label="Preços e Planos" className="py-16 md:py-24 bg-gradient-to-b from-white to-emerald-50/50">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">

                            <div className="p-8 md:p-16 md:w-3/5 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-emerald-100 text-emerald-800 py-1 px-3 rounded-full text-xs font-bold uppercase tracking-wider">
                                        Missão Flippi
                                    </span>
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 md:mb-6">Por que é Grátis?</h2>
                                <p className="text-slate-600 mb-6 md:mb-8 text-sm md:text-base leading-relaxed">
                                    Sabemos como é difícil empreender no Brasil. Taxas altas, sistemas caros e complexos... decidimos mudar isso.<br /><br />
                                    Liberamos nossa tecnologia <strong>gratuitamente</strong> para você tracionar seu negócio sem medo de boleto no fim do mês.
                                </p>

                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8">
                                    {[
                                        "Site de Delivery Próprio",
                                        "Cardápio Digital QR Code",
                                        "Gestor de Pedidos (KDS)",
                                        "Programa de Fidelidade",
                                        "Gestão de Entregadores",
                                        "Suporte da Comunidade"
                                    ].map((feat, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                            <span className="text-slate-700 font-medium text-sm md:text-base">{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button onClick={handleStartNow} className="w-full md:w-fit h-12 bg-slate-900 text-white rounded-xl font-bold px-8 hover:bg-slate-800">
                                    Começar Agora
                                </Button>
                            </div>

                            <div className="bg-slate-900 p-8 md:p-16 md:w-2/5 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                {/* Efeito de brilho de fundo */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500 blur-[80px] rounded-full opacity-30 animate-pulse-slow"></div>

                                <div className="relative z-10">
                                    <span className="text-emerald-400 font-bold mb-2 block text-sm uppercase tracking-wide">Plano Impulso</span>
                                    <div className="flex items-baseline justify-center gap-1 mb-4">
                                        <span className="text-6xl md:text-7xl font-extrabold text-white tracking-tighter">R$0</span>
                                        <span className="text-xl text-slate-400 font-medium">/mês</span>
                                    </div>

                                    <p className="text-slate-300 text-sm mb-8 px-4">
                                        Sem pegadinhas. Sem período de teste. Acesso completo para você começar a faturar hoje.
                                    </p>

                                    <Button onClick={handleStartNow} className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl shadow-lg shadow-emerald-900/50 transition-transform hover:scale-105 text-lg">
                                        Criar Minha Conta
                                    </Button>
                                    <p className="text-[11px] text-slate-500 mt-4">Não pedimos cartão de crédito.</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* --- FOOTER --- */}
                <footer className="bg-white border-t border-slate-100 py-8 md:py-12">
                    <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <img src="/images/logo-flippi-verde.png" alt="Logo Flippi" className="h-6 w-6 object-contain opacity-80" />
                            <span className="font-bold text-slate-900 text-lg">Flippi</span>
                        </div>

                        <p className="text-slate-400 text-xs md:text-sm text-center">
                            © 2026 Flippi Tecnologia. Desenvolvido para impulsionar negócios locais.
                        </p>

                        <nav className="flex gap-6">
                            <a href="#" className="text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium">Instagram</a>
                            <a href="#" onClick={handleWhatsappClick} className="text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium cursor-pointer">Fale Conosco</a>
                        </nav>
                    </div>
                </footer>

            </main>
        </div>
    );
}