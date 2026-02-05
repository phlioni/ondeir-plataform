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
    QrCode
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// --- COMPONENTES VISUAIS (FRAMES) ---

const DesktopFrame = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative rounded-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 bg-white ${className}`}>
        <div className="h-9 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
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
    <div className={`relative rounded-[2.5rem] border-[6px] border-slate-900 overflow-hidden shadow-2xl bg-slate-900 ${className}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-slate-900 rounded-b-xl z-20"></div>
        <div className="relative z-10 bg-white h-full w-full">
            {children}
        </div>
    </div>
);

// --- COMPONENTE TIMELINE (Veja Como Funciona) ---
const TimelineStep = ({ icon: Icon, title, desc, step }: { icon: any, title: string, desc: string, step: string }) => (
    <div className="relative flex gap-6 md:gap-8 group">
        {/* Linha conectora */}
        <div className="absolute left-6 top-14 bottom-[-3rem] w-0.5 bg-slate-200 group-last:hidden md:left-8"></div>

        <div className="relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center group-hover:border-emerald-500 group-hover:shadow-emerald-100 transition-all duration-300">
            <Icon className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm">
                {step}
            </div>
        </div>

        <div className="pb-12 pt-1">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 leading-relaxed max-w-md text-sm md:text-base">{desc}</p>
        </div>
    </div>
);

export default function LandingPage() {
    const navigate = useNavigate();

    const handleWhatsappClick = () => {
        window.open("https://wa.me/5513997977755?text=Quero%20ativar%20o%20meu%20ecossistema%20Flippi", "_blank");
    };

    const scrollToTimeline = () => {
        const element = document.getElementById('como-funciona');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">

            {/* --- HEADER --- */}
            <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                        {/* LOGO PERSONALIZADO */}
                        <img
                            src="/images/logo-flippi-verde.png"
                            alt="Flippi Logo"
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        {/* Ícone de Fallback se a imagem não carregar */}
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
                        <Button onClick={() => navigate('/auth')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 font-semibold shadow-emerald-200 shadow-md">
                            Acessar Plataforma
                        </Button>
                    </div>
                </div>
            </header>

            <main className="pt-16">

                {/* --- HERO SECTION --- */}
                <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-visible bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-white">
                    <div className="container mx-auto px-4 text-center z-10 relative">

                        <div className="max-w-4xl mx-auto mb-16 space-y-8">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1.5 text-sm font-semibold rounded-full mb-4 animate-in fade-in zoom-in duration-500">
                                🚀 A Tecnologia do Seu Negócio
                            </Badge>

                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                Onde a Gestão Encontra <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                                    A Recorrência Real
                                </span>
                            </h1>

                            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                                O ecossistema que fornece a tecnologia para você operar seu delivery próprio, fidelizar clientes e gerenciar sua frota. Você no comando, sem intermediários.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                <Button size="lg" onClick={handleWhatsappClick} className="h-14 px-10 text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1 font-bold">
                                    Começar Agora
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={scrollToTimeline}
                                    className="h-14 px-10 text-lg border-2 rounded-full text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                >
                                    Veja como Funciona
                                </Button>
                            </div>

                            <div className="pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span>Mais de 200 restaurantes ativos</span>
                                </div>
                                <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full"></div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span>Sem taxas por pedido</span>
                                </div>
                            </div>
                        </div>

                        {/* HERO IMAGES */}
                        <div className="relative max-w-6xl mx-auto perspective-1000 mt-12 px-4 sm:px-0">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-400/20 blur-[120px] -z-10 rounded-full pointer-events-none"></div>

                            {/* Hub (Desktop) */}
                            <div className="relative z-10 transform transition-transform hover:scale-[1.01] duration-700">
                                <DesktopFrame className="border-slate-200/80 shadow-2xl">
                                    <img
                                        src="/images/smart-hub.png"
                                        alt="Painel de Controle Flippi"
                                        className="w-full h-auto object-cover"
                                    />
                                    {/* Overlay de gradiente sutil para dar profundidade */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none"></div>
                                </DesktopFrame>
                            </div>

                            {/* App (Mobile) - Flutuante */}
                            <div className="absolute -bottom-12 -right-2 sm:-bottom-16 sm:-right-8 w-[35%] sm:w-[25%] z-20 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.4)] rounded-[2.5rem] transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                                <MobileFrame>
                                    <img
                                        src="/images/hero-app.JPG"
                                        alt="Vitrine Mobile"
                                        className="w-full h-full object-cover"
                                    />
                                </MobileFrame>

                                {/* Card Flutuante de Coins */}
                                <div className="absolute bottom-8 -left-16 bg-white/95 backdrop-blur border border-slate-100 shadow-xl py-3 px-5 rounded-2xl flex items-center gap-3 animate-bounce-slow hidden md:flex z-30">
                                    <div className="bg-yellow-100 p-2 rounded-full"><Coins className="text-yellow-600 h-5 w-5" /></div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cashback</p>
                                        <p className="text-sm font-bold text-slate-900">+33 Coins</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- TIMELINE: COMO FUNCIONA --- */}
                <section id="como-funciona" className="py-24 bg-slate-50 border-y border-slate-100 scroll-mt-20">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-16 items-start">

                            {/* Lado Esquerdo: Sticky */}
                            <div className="lg:sticky lg:top-32 text-center lg:text-left">
                                <Badge variant="outline" className="border-emerald-200 text-emerald-700 mb-6 bg-emerald-50">
                                    Passo a Passo
                                </Badge>
                                <h2 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
                                    Do Pedido à Fidelização: <br />
                                    <span className="text-emerald-600">Um Ciclo Perfeito.</span>
                                </h2>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    O Flippi fornece a infraestrutura digital para sua operação rodar suavemente. Veja como a tecnologia apoia cada etapa da sua venda direta.
                                </p>
                                <Button onClick={handleWhatsappClick} className="h-12 px-8 bg-slate-900 text-white rounded-full hover:bg-slate-800 shadow-lg transition-transform hover:scale-105">
                                    Quero esse fluxo no meu negócio
                                </Button>
                            </div>

                            {/* Lado Direito: A Timeline */}
                            <div className="pl-0 lg:pl-10 relative">
                                <TimelineStep
                                    step="1"
                                    icon={QrCode}
                                    title="O Acesso Instantâneo"
                                    desc="Seu cliente acessa sua Vitrine Digital (Bio/WhatsApp). Sem baixar app de marketplace, ele pede diretamente com a sua marca."
                                />
                                <TimelineStep
                                    step="2"
                                    icon={Utensils}
                                    title="Gestão no Smart Hub"
                                    desc="O pedido chega no seu painel. Sua cozinha visualiza no Kanban e prepara. Você tem controle total do tempo e do status."
                                />
                                <TimelineStep
                                    step="3"
                                    icon={Bike}
                                    title="Logística da Sua Frota"
                                    desc="O sistema organiza a rota para os SEUS entregadores. Eles recebem os dados no App do Entregador e o cliente acompanha o trajeto em tempo real."
                                />
                                <TimelineStep
                                    step="4"
                                    icon={Repeat}
                                    title="Fidelização Automática"
                                    desc="Venda concluída? O cliente ganha Flippi Coins. O saldo fica na carteira dele, incentivando o retorno exclusivo ao seu estabelecimento."
                                />
                            </div>

                        </div>
                    </div>
                </section>

                {/* --- DESTAQUE: COINS (Economia Circular) --- */}
                <section className="py-24 bg-white overflow-hidden">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">

                            <div className="relative flex justify-center lg:justify-end order-2 lg:order-1">
                                <div className="absolute inset-0 bg-yellow-400/20 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="relative z-10 w-[280px] sm:w-[320px] transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                                    <MobileFrame>
                                        <img
                                            src="/images/coins-popup.jpeg"
                                            alt="Tela de Cashback Flippi"
                                            className="w-full h-full object-cover"
                                        />
                                    </MobileFrame>
                                </div>
                            </div>

                            <div className="space-y-8 order-1 lg:order-2">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-bold border border-yellow-200 shadow-sm">
                                    <Coins className="h-4 w-4" />
                                    Economia Circular
                                </div>

                                <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                                    Um Sistema Financeiro <br />
                                    <span className="text-yellow-500">Fechado e Lucrativo.</span>
                                </h2>

                                <p className="text-lg text-slate-600 leading-relaxed">
                                    Os Flippi Coins criam uma economia interna. O valor que você investe em recargas circula entre os clientes e volta para o seu caixa na forma de vendas recorrentes.
                                </p>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                    <li className="flex items-start gap-3 list-none">
                                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                                        <span className="text-slate-700">
                                            <strong>Acumulativo:</strong> O cliente junta saldo a cada pedido, criando um ativo que ele só pode gastar com você.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 list-none">
                                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                                        <span className="text-slate-700">
                                            <strong>Retorno Garantido:</strong> A recarga volta para o seu caixa quando o cliente resgata os Coins em novas compras.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 list-none">
                                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                                        <span className="text-slate-700">
                                            <strong>Padrão Inteligente:</strong> O sistema aplica as regras de cashback automaticamente para maximizar a retenção.
                                        </span>
                                    </li>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- DESTAQUE: GESTÃO & IA --- */}
                <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center mb-20">
                            <h2 className="text-3xl sm:text-5xl font-bold mb-6">Tecnologia de Ponta, Operação Simples</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                                Esqueça anotações manuais. Nossa tecnologia organiza sua produção e potencializa seu cardápio com inteligência artificial.
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">

                            {/* Feature 1 */}
                            <div className="group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/30">
                                        <Zap className="h-6 w-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Smart Hub Kanban</h3>
                                        <p className="text-slate-400">Controle visual de produção em tempo real</p>
                                    </div>
                                </div>
                                <DesktopFrame className="border-slate-700 bg-slate-800/50 shadow-none !rounded-b-xl opacity-90 group-hover:opacity-100 transition-opacity">
                                    <img src="/images/smart-hub.png" alt="Kanban" className="w-full h-auto" />
                                </DesktopFrame>
                            </div>

                            {/* Feature 2 */}
                            <div className="group mt-8 lg:mt-0">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-500/30">
                                        <Rocket className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">IA Geradora de Cardápio</h3>
                                        <p className="text-slate-400">Descrições vendedoras criadas em segundos</p>
                                    </div>
                                </div>
                                <DesktopFrame className="border-slate-700 bg-slate-800/50 shadow-none !rounded-b-xl opacity-90 group-hover:opacity-100 transition-opacity">
                                    <img src="/images/ai-feature.png" alt="AI Menu" className="w-full h-auto" />
                                </DesktopFrame>
                            </div>

                        </div>
                    </div>
                </section>

                {/* --- PROBLEMA X SOLUÇÃO (Cards) --- */}
                <section className="py-24 bg-slate-50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Retome o Controle do Seu Negócio</h2>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                Marketplaces são canais de aquisição, mas o patrimônio real está na sua base de clientes.
                                O Flippi te dá as ferramentas para cultivar essa base diretamente.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: TrendingUp,
                                    title: "Margem Preservada",
                                    desc: "A venda direta elimina comissões por pedido. O Flippi cobra apenas uma mensalidade fixa pelo uso da plataforma.",
                                    color: "text-emerald-600",
                                    bg: "bg-white border-emerald-100"
                                },
                                {
                                    icon: Smartphone,
                                    title: "Sua Marca, Sua Vitrine",
                                    desc: "Sem concorrentes na tela ao lado. Uma vitrine exclusiva para fortalecer sua identidade visual.",
                                    color: "text-blue-600",
                                    bg: "bg-white border-blue-100"
                                },
                                {
                                    icon: ShieldCheck,
                                    title: "Segurança Financeira",
                                    desc: "Não intermediamos pagamentos. O dinheiro entra direto na sua maquininha ou Pix, garantindo seu fluxo de caixa.",
                                    color: "text-purple-600",
                                    bg: "bg-white border-purple-100"
                                }
                            ].map((item, i) => (
                                <Card key={i} className={`border shadow-sm hover:shadow-xl transition-all duration-300 group rounded-2xl overflow-hidden hover:-translate-y-1 ${item.bg}`}>
                                    <CardContent className="p-8">
                                        <div className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                            <item.icon className={`h-7 w-7 ${item.color}`} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                                        <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- PREÇO (Oferta) --- */}
                <section className="py-24 bg-gradient-to-b from-white to-emerald-50/50">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">

                            <div className="p-10 md:p-16 md:w-3/5 flex flex-col justify-center">
                                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Tudo incluso. Sem surpresas.</h2>
                                <p className="text-slate-600 mb-8">Nossa missão é democratizar a tecnologia. O preço não é promocional, é o nosso compromisso com o pequeno e médio negócio.</p>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {[
                                        "Cardápio Digital Premium",
                                        "Venda Direta (Sem Comissões)",
                                        "Smart Hub de Cozinha",
                                        "Carteira de Coins (Fidelidade)",
                                        "Gestão da Sua Frota",
                                        "Suporte via WhatsApp"
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                            <span className="text-slate-700 font-medium">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 p-10 md:p-16 md:w-2/5 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 blur-[60px] rounded-full opacity-40"></div>

                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 py-1 px-3 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    Plano Pro
                                </span>

                                <div className="flex items-baseline justify-center gap-1 mb-2 relative z-10">
                                    <span className="text-5xl font-extrabold text-white">R$ 39,90</span>
                                </div>
                                <span className="text-slate-400 mb-8">mensais</span>

                                <Button onClick={handleWhatsappClick} className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl shadow-lg shadow-emerald-900/50 transition-transform hover:scale-105 text-lg">
                                    Quero Vender Mais
                                </Button>
                                <p className="text-[11px] text-slate-500 mt-4">Cancele quando quiser. Sem multas.</p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* --- FOOTER --- */}
                <footer className="bg-white border-t border-slate-100 py-12">
                    <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <img src="/images/logo-flippi-verde.png" alt="Flippi" className="h-6 w-6 object-contain opacity-80" />
                            <span className="font-bold text-slate-900 text-lg">Flippi</span>
                        </div>

                        <p className="text-slate-400 text-sm">
                            © 2026 Flippi Tecnologia. Feito com ❤️ em Santos, SP.
                        </p>

                        <div className="flex gap-6">
                            <a href="#" className="text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium">Instagram</a>
                            <a href="#" onClick={handleWhatsappClick} className="text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium cursor-pointer">WhatsApp</a>
                        </div>
                    </div>
                </footer>

            </main>
        </div>
    );
}