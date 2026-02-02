import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, ArrowLeft, MessageCircle } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // True = Login, False = Solicitar Acesso
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const fromState = location.state?.from?.pathname;

  // Link do WhatsApp para solicitar acesso
  const whatsappUrl = "https://wa.me/5513997977755?text=Olá!%20Gostaria%20de%20solicitar%20acesso%20ao%20Flippi%20como%20parceiro%20Founder.";

  // Salva a rota de retorno se houver
  useEffect(() => {
    if (fromState) {
      localStorage.setItem('auth_return_path', fromState);
    }
  }, [fromState]);

  useEffect(() => {
    // 1. Verifica sessão existente COM PROTEÇÃO ANTI-CRASH
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // Se o token estiver inválido, joga erro para limpar
        if (error) throw error;

        if (session) {
          await checkRoleAndRedirect(session.user.id);
        }
      } catch (error) {
        console.error("Sessão inválida. Resetando...", error);
        await supabase.auth.signOut();
        localStorage.clear();
      }
    };
    checkUser();

    // 2. Escuta login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await checkRoleAndRedirect(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- O SEGREDO ESTÁ AQUI ---
  const checkRoleAndRedirect = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", userId)
        .single();

      // REGRA: Apenas Parceiros e Admins
      if (profile?.role === "partner" || profile?.role === "admin") {

        // --- AUTO-INICIALIZAÇÃO DA LOJA ---
        // 1. Verifica se a loja já existe
        const { data: existingMarket } = await supabase
          .from('markets')
          .select('id')
          .eq('owner_id', userId)
          .maybeSingle();

        // 2. Se NÃO existe, cria agora mesmo (Automático)
        if (!existingMarket) {
          console.log("Usuário novo detectado. Criando loja padrão...");

          // Usamos o ID do usuário como slug inicial para garantir 100% de unicidade
          const initialSlug = userId;

          // CORREÇÃO: Adicionadas latitude e longitude padrão para evitar erro 23502
          const { error: createError } = await supabase.from('markets').insert({
            owner_id: userId,
            name: "Minha Loja Nova", // Nome padrão
            slug: initialSlug,       // Slug garantido único
            category: "Restaurante", // Categoria padrão
            delivery_fee: 5.00,
            delivery_time_min: 30,
            delivery_time_max: 45,
            latitude: -23.550520,    // Valor padrão (SP) para não quebrar o banco
            longitude: -46.633308
          });

          if (createError) {
            console.error("Erro ao criar loja automática:", createError);
            toast({ title: "Erro na inicialização", description: "Contate o suporte.", variant: "destructive" });
            return; // Não redireciona se falhar
          }

          toast({ title: "Bem-vindo!", description: "Sua loja foi criada automaticamente." });
        }
        // ----------------------------------

        const storedPath = localStorage.getItem('auth_return_path');
        const returnPath = storedPath || fromState || "/dashboard";
        localStorage.removeItem('auth_return_path');

        if (returnPath !== "/auth") {
          navigate(returnPath, { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        // Bloqueia usuário comum
        await supabase.auth.signOut();
        toast({
          title: "Acesso Restrito",
          description: "Esta área é exclusiva para parceiros. Utilize o App do Cliente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // O listener cuidará do resto
    } catch (error: any) {
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Falha ao autenticar.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-start w-full mb-2">
            <Button variant="ghost" size="sm" className="-ml-4 h-8 text-gray-500" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Flippi Partners</CardTitle>
          <CardDescription>
            {isLogin
              ? "Acesse sua conta de gestão"
              : "Torne-se um parceiro exclusivo"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Seu email corporativo"
                    className="pl-10 h-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Sua senha"
                    className="pl-10 h-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Acessar Painel"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 py-4 animate-in fade-in">
              <div className="text-center space-y-2">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900">Seja um Parceiro Founder</h3>
                <p className="text-sm text-gray-500">
                  Estamos selecionando os 10 primeiros parceiros em Santos para acesso gratuito e exclusivo.
                </p>
              </div>

              <Button
                className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 gap-2"
                onClick={() => window.open(whatsappUrl, '_blank')}
              >
                <MessageCircle className="w-5 h-5" />
                Solicitar Acesso no Zap
              </Button>

              <p className="text-xs text-center text-gray-400">
                Você será redirecionado para o WhatsApp do nosso time de onboarding.
              </p>
            </div>
          )}

          <div className="mt-6 text-center border-t pt-4">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary"
            >
              {isLogin ? "Não é parceiro ainda? Solicite acesso" : "Já tem conta? Fazer Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}