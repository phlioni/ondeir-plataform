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
    Ticket,
    Store,
    LayoutDashboard
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';

// --- CONFIGURAÇÃO DE SEO ---
const SEO_DATA = {
    title: "Flippi | Parceiro Fundador - Sistema para Delivery e Mesa",
    description: "Transforme pedidos pontuais em clientes recorrentes. Sistema completo para Delivery e Cardápio Digital na Mesa. Acesso gratuito vitalício para fundadores.",
    url: "https://appflippi.com",
    image: "/images/smart-hub.png",
    twitterHandle: "@flippiapp"
};

// --- SCHEMA MARKUP (JSON-LD) ---
const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Flippi",
    "headline": "Ecossistema de Gestão e Fidelização Omnicanal",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, Android, iOS",
    "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "BRL",
        "description": "Oferta exclusiva para os 50 primeiros parceiros fundadores."
    },
    "description": SEO_DATA.description
};

// --- COMPONENTES VISUAIS ---

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

// --- BARRA DE URGÊNCIA ---
const UrgencyBanner = ({ onCtaClick }: { onCtaClick: () => void }) => (
    <div className="bg-slate-900 text-white relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-2/3 h-full bg-emerald-500/10 blur-xl pointer-events-none"></div>
        <div className="container mx-auto px-4 py-3 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
                <div className="flex items-start md:items-center gap-3 text-center md:text-left w-full md:w-auto justify-center md:justify-start">
                    <div className="hidden md:flex bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg animate-pulse shrink-0">
                        <Rocket className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm md:text-base font-medium text-slate-200">
                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] md:text-xs block mb-0.5">
                                Programa de Lançamento
                            </span>
                            Seja um <strong>Parceiro Fundador</strong> e ganhe <span className="text-white font-bold underline decoration-emerald-500 decoration-2 underline-offset-2">Acesso Vitalício Gratuito</span>.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="w-full md:w-auto text-center md:text-right bg-slate-800/50 md:bg-transparent p-2 md:p-0 rounded-lg md:rounded-none flex items-center justify-center md:justify-end gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-300 border border-slate-700 rounded-full px-3 py-1">
                            <Ticket className="w-3 h-3 text-emerald-400" />
                            <span>Lote Único: <strong>50 Vagas</strong></span>
                        </div>
                    </div>
                    <Button
                        onClick={onCtaClick}
                        size="sm"
                        className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full h-10 md:h-9 px-5 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 whitespace-nowrap animate-bounce-subtle"
                    >
                        Quero minha vaga grátis
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
);

export default function LandingPage() {
    const navigate = useNavigate();

    const handleWhatsappClick = () => {
        window.open("https://wa.me/5513997977755?text=Olá!%20Quero%20ser%20um%20dos%2050%20Parceiros%20Fundadores%20do%20Flippi%20e%20garantir%20acesso%20gratuito.", "_blank", "noopener noreferrer");
    };

    const scrollToTimeline = () => {
        const element = document.getElementById('como-funciona');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
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

            <UrgencyBanner onCtaClick={handleWhatsappClick} />

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
                                Login Parceiro
                            </Button>
                        </Link>
                        <Button onClick={() => navigate('/auth')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 font-semibold shadow-emerald-200 shadow-md">
                            Acessar
                        </Button>
                    </div>
                </nav>
            </header>

            <main>

                {/* --- HERO SECTION --- */}
                <section aria-label="Introdução" className="relative pt-12 pb-16 md:pt-20 lg:pt-32 overflow-visible bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-white">
                    <div className="container mx-auto px-4 text-center z-10 relative">

                        <div className="max-w-4xl mx-auto mb-12 md:mb-16 space-y-6 md:space-y-8">

                            {/* Tagline Híbrida */}
                            <div className="flex items-center justify-center gap-2 mb-4 animate-in fade-in zoom-in duration-500">
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1">
                                    <Store className="w-3 h-3" />
                                    Omnicanal: Delivery + Mesa
                                </Badge>
                                <span className="text-slate-400 text-xs font-medium">Lançamento Oficial</span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                Seu Negócio <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                                    Num Estalo.
                                </span>
                            </h1>

                            <p className="text-base md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto px-2">
                                Um acelerador de negócios que une <strong>Página de Delivery</strong>, <strong>Cardápio Digital na Mesa</strong> e <strong>Fidelidade</strong>. Tudo numa plataforma única.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 px-4 md:px-0">
                                <Button size="lg" onClick={handleWhatsappClick} className="w-full sm:w-auto h-12 md:h-14 px-8 text-base md:text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl shadow-emerald-200 transition-all font-bold">
                                    Quero ser Membro Fundador
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>

                            <div className="pt-6 md:pt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs md:text-sm text-slate-500 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Venda no Instagram</span>
                                </div>
                                <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full"></div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>QR Code na Mesa</span>
                                </div>
                            </div>
                        </div>

                        {/* HERO IMAGES */}
                        <div className="relative max-w-6xl mx-auto perspective-1000 mt-8 md:mt-12 px-2 sm:px-0">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-400/20 blur-[80px] md:blur-[120px] -z-10 rounded-full pointer-events-none"></div>

                            <div className="relative z-10">
                                <DesktopFrame className="border-slate-200/80 shadow-xl md:shadow-2xl">
                                    <img
                                        src="/images/smart-hub.png"
                                        alt="Smart Hub Flippi"
                                        className="w-full h-auto object-cover"
                                        width="1200"
                                        height="675"
                                        loading="eager"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none"></div>
                                </DesktopFrame>
                            </div>

                            <div className="absolute -bottom-8 -right-1 md:-bottom-16 md:-right-8 w-[30%] md:w-[25%] z-20 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] md:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.4)] rounded-[2rem] md:rounded-[2.5rem] transform rotate-[-3deg] border-2 border-white/20">
                                <MobileFrame>
                                    <img
                                        src="/images/hero-app.JPG"
                                        alt="Aplicativo Flippi"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </MobileFrame>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- SEÇÃO: HÍBRIDO (MESA & DELIVERY) --- */}
                <section className="py-16 md:py-24 bg-white border-y border-slate-100">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Um Sistema, Múltiplos Canais</h2>
                            <p className="text-slate-600 text-lg">
                                O Flippi centraliza sua operação. Não importa de onde vem o pedido, tudo cai no mesmo lugar.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Card Delivery */}
                            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Smartphone className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Sua Página de Delivery</h3>
                                <p className="text-slate-600 mb-6">
                                    O link perfeito para a bio do Instagram e WhatsApp. Seu cliente vê fotos, escolhe variações e fecha o pedido sozinho.
                                </p>
                                <ul className="text-sm text-slate-500 space-y-2 text-left w-full max-w-xs mx-auto">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Identidade própria (Sua Marca)</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Sem concorrência na tela</li>
                                </ul>
                            </div>

                            {/* Card Mesa */}
                            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
                                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                                    <QrCode className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Cardápio Digital na Mesa</h3>
                                <p className="text-slate-600 mb-6">
                                    Agilize o atendimento no salão. O cliente escaneia o QR Code na mesa e faz o pedido sem precisar baixar nenhum aplicativo.
                                </p>
                                <ul className="text-sm text-slate-500 space-y-2 text-left w-full max-w-xs mx-auto">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Sem custos extras</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Reduz erros de anotação</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- TIMELINE: SMART HUB --- */}
                <section id="como-funciona" aria-label="Smart Hub" className="py-16 md:py-24 bg-slate-50 scroll-mt-20">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-10 md:gap-16 items-start">

                            <div className="lg:sticky lg:top-32 text-center lg:text-left">
                                <Badge variant="outline" className="border-purple-200 text-purple-700 mb-4 md:mb-6 bg-purple-50">
                                    Smart Hub
                                </Badge>
                                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 md:mb-6 leading-tight">
                                    Operação Centralizada: <br />
                                    <span className="text-purple-600">Fim do Caos.</span>
                                </h2>
                                <p className="text-base md:text-lg text-slate-600 mb-6 md:mb-8 leading-relaxed px-4 md:px-0">
                                    Receba, prepare e despache numa interface simples. O Smart Hub organiza a jornada do pedido e garante que a cozinha e o balcão falem a mesma língua.
                                </p>
                                <Button onClick={handleWhatsappClick} className="w-full sm:w-auto h-12 px-8 bg-slate-900 text-white rounded-full hover:bg-slate-800 shadow-lg transition-transform hover:scale-105">
                                    Quero testar no meu negócio
                                </Button>
                            </div>

                            <div className="pl-0 lg:pl-10 relative mt-4 md:mt-0">
                                <TimelineStep
                                    step="1"
                                    icon={LayoutDashboard}
                                    title="Fluxo Unificado"
                                    desc="Pedidos do Delivery e da Mesa chegam na mesma tela. Sua operação não para."
                                />
                                <TimelineStep
                                    step="2"
                                    icon={Utensils}
                                    title="KDS de Cozinha"
                                    desc="Controle visual de produção em tempo real. A cozinha sabe exatamente o que fazer."
                                />
                                <TimelineStep
                                    step="3"
                                    icon={Bike}
                                    title="Despacho em 1 Clique"
                                    desc="Conecte-se com seus entregadores. O sistema organiza a rota e informa o pagamento."
                                />
                                <TimelineStep
                                    step="4"
                                    icon={Repeat}
                                    title="Fidelização Automática"
                                    desc="Venda concluída? O cliente ganha Flippi Coins para voltar na próxima."
                                />
                            </div>

                        </div>
                    </div>
                </section>

                {/* --- DESTAQUE: COINS --- */}
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
                                    Economia Circular
                                </div>

                                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight">
                                    Transforme Pedidos em <br />
                                    <span className="text-yellow-500">Clientes Recorrentes.</span>
                                </h2>

                                <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                                    O cliente ganha Coins ao comprar e usa como desconto na próxima. Você define a regra, o sistema faz a mágica.
                                </p>

                                <ul className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-100 space-y-4 text-left">
                                    <li className="flex items-start gap-3">
                                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5 min-w-[1.5rem]"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                                        <span className="text-slate-700 text-sm md:text-base">
                                            <strong>Retenção Real:</strong> O cliente volta porque tem saldo acumulado.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5 min-w-[1.5rem]"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                                        <span className="text-slate-700 text-sm md:text-base">
                                            <strong>Controle Total:</strong> Você faz recargas e define quanto quer investir na fidelidade.
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- PROBLEMA X SOLUÇÃO (O que não somos) --- */}
                <section aria-label="Benefícios" className="py-16 md:py-24 bg-slate-50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 md:mb-6">O que o Flippi NÃO é:</h2>
                            <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                                Transparência total para nossos Parceiros Fundadores.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {[
                                {
                                    icon: TrendingUp,
                                    title: "Não somos Intermediadores",
                                    desc: "Não tocamos no seu dinheiro. O pagamento vai direto para você (Pix ou Maquininha).",
                                    color: "text-emerald-600",
                                    bg: "bg-white border-emerald-100"
                                },
                                {
                                    icon: Smartphone,
                                    title: "Não somos Marketplace",
                                    desc: "Não colocamos você numa lista para brigar por preço. O foco é fortalecer SUA marca.",
                                    color: "text-blue-600",
                                    bg: "bg-white border-blue-100"
                                },
                                {
                                    icon: ShieldCheck,
                                    title: "Não somos Franquia de Motoboys",
                                    desc: "Nós damos a tecnologia para você gerenciar sua frota ou seus parceiros de entrega.",
                                    color: "text-purple-600",
                                    bg: "bg-white border-purple-100"
                                }
                            ].map((item, i) => (
                                <Card key={i} className={`border shadow-sm rounded-2xl md:rounded-3xl overflow-hidden ${item.bg}`}>
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

                {/* --- PREÇO (Oferta Fundador) --- */}
                <section aria-label="Preços e Planos" className="py-16 md:py-24 bg-gradient-to-b from-white to-emerald-50/50">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">

                            <div className="p-8 md:p-16 md:w-3/5 flex flex-col justify-center">
                                <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4 md:mb-6">Oportunidade Única.</h2>
                                <p className="text-slate-600 mb-6 md:mb-8 text-sm md:text-base">
                                    Para lançar o Flippi com força total, estamos isentando os 50 primeiros parceiros de qualquer mensalidade. <strong>Para sempre.</strong>
                                </p>

                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    {[
                                        "Página de Delivery Própria",
                                        "Cardápio Digital (Mesa)",
                                        "Smart Hub (Gestor)",
                                        "Sistema de Coins",
                                        "Gestão de Entregadores",
                                        "Suporte VIP"
                                    ].map((feat, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                            <span className="text-slate-700 font-medium text-sm md:text-base">{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-slate-900 p-8 md:p-16 md:w-2/5 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 blur-[60px] rounded-full opacity-40"></div>

                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 py-1 px-3 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    Parceiro Fundador
                                </span>

                                <div className="flex items-baseline justify-center gap-1 mb-2 relative z-10">
                                    <span className="text-4xl md:text-5xl font-extrabold text-white">R$ 0,00</span>
                                </div>
                                <span className="text-emerald-400 font-bold mb-6 md:mb-8 text-sm uppercase tracking-wide">Vitalício</span>

                                <Button onClick={handleWhatsappClick} className="w-full h-12 md:h-14 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl shadow-lg shadow-emerald-900/50 transition-transform hover:scale-105 text-base md:text-lg">
                                    Quero minha vaga
                                </Button>
                                <p className="text-[10px] md:text-[11px] text-slate-500 mt-4">Restrito aos 50 primeiros CNPJs.</p>
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
                            © 2026 Flippi Tecnologia. Feito com ❤️ em Santos, SP.
                        </p>

                        <nav className="flex gap-6">
                            <a href="#" className="text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium">Instagram</a>
                            <a href="#" onClick={handleWhatsappClick} className="text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium cursor-pointer">WhatsApp</a>
                        </nav>
                    </div>
                </footer>

            </main>
        </div>
    );
}