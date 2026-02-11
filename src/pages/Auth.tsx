import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, User, Phone, Store } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // True = Login, False = Cadastro
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const fromState = location.state?.from?.pathname;

  // Detecta intenção vinda da Landing Page
  useEffect(() => {
    if (location.state?.intent === 'signup') {
      setIsLogin(false);
    }
  }, [location.state]);

  // Salva a rota de retorno
  useEffect(() => {
    if (fromState) {
      localStorage.setItem('auth_return_path', fromState);
    }
  }, [fromState]);

  useEffect(() => {
    // 1. Verifica sessão existente
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
          await checkRoleAndRedirect(session.user.id);
        }
      } catch (error) {
        console.error("Sessão inválida ou expirada.", error);
        await supabase.auth.signOut();
        localStorage.clear();
      }
    };
    checkUser();

    // 2. Escuta mudanças na autenticação
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

  const checkRoleAndRedirect = async (userId: string) => {
    try {
      // Busca perfil para garantir que existe
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      // --- AUTO-INICIALIZAÇÃO DA LOJA ---
      const { data: existingMarket } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (!existingMarket) {
        console.log("Novo empreendedor. Criando loja padrão...");

        const initialSlug = userId;

        const { error: createError } = await supabase.from('markets').insert({
          owner_id: userId,
          name: fullName ? `Loja de ${fullName.split(' ')[0]}` : "Minha Loja Nova",
          slug: initialSlug,
          category: "Restaurante",
          delivery_fee: 0.00,
          delivery_time_min: 30,
          delivery_time_max: 45,
          latitude: -23.550520, // Default SP
          longitude: -46.633308
        });

        if (createError) {
          console.error("Erro no setup da loja:", createError);
        } else {
          toast({ title: "Loja criada!", description: "Bem-vindo ao Flippi." });
        }
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

    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // --- CADASTRO SIMPLIFICADO ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              display_name: fullName,
              phone_number: phone,
              role: 'partner'
            }
          }
        });

        if (error) throw error;

        // --- CORREÇÃO: FORÇA ATUALIZAÇÃO DO PERFIL ---
        if (data.user) {
          // Aguarda um pequeno delay para garantir que o trigger do banco criou a linha
          // (Às vezes o trigger é assíncrono e muito rápido, mas é bom prevenir)
          // Mas aqui vamos tentar update direto. Se falhar, é porque o trigger não rodou ainda ou RLS bloqueou.

          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              full_name: fullName,
              display_name: fullName,
              phone_number: phone,
              role: 'partner' // Força o role aqui
            })
            .eq("id", data.user.id);

          if (updateError) {
            console.error("Erro ao atualizar perfil:", updateError);
            // Não bloqueamos o fluxo, pois o usuário foi criado
          }
        }
        // ---------------------------------------------

        if (data.session) {
          toast({ title: "Cadastro realizado!", description: "Entrando no sistema..." });
        } else {
          toast({ title: "Verifique seu email", description: "Enviamos um link de confirmação." });
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error(error);
      let msg = "Ocorreu um erro. Tente novamente.";
      if (error.message.includes("Invalid login")) msg = "Email ou senha incorretos.";
      if (error.message.includes("already registered")) msg = "Este email já está cadastrado.";
      if (error.message.includes("Password")) msg = "A senha deve ter pelo menos 6 caracteres.";

      toast({
        title: "Atenção",
        description: msg,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-2xl border-0 animate-in fade-in zoom-in duration-300 bg-white">
        <CardHeader className="text-center pb-6 space-y-2">
          <div className="flex justify-center mb-2">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Store className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {isLogin ? "Acessar Plataforma" : "Crie sua conta grátis"}
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin
              ? "Gerencie seu delivery e mesas em um só lugar."
              : "Junte-se a centenas de empreendedores."}
          </CardDescription>
        </CardHeader>
        <CardContent>

          <form onSubmit={handleAuth} className="space-y-4">

            {!isLogin && (
              <>
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Seu Nome Completo"
                      className="pl-10 h-12 bg-gray-50/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-in slide-in-from-top-2 delay-75">
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="Seu WhatsApp / Telefone"
                      className="pl-10 h-12 bg-gray-50/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  className="pl-10 h-12 bg-gray-50/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
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
                  placeholder={isLogin ? "Sua senha" : "Crie uma senha segura"}
                  className="pl-10 h-12 bg-gray-50/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200/50 transition-all mt-6"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? "Entrar" : "Criar Conta Grátis")}
            </Button>
          </form>

          <div className="mt-8 text-center border-t pt-6">
            <p className="text-sm text-gray-500 mb-2">
              {isLogin ? "Ainda não tem conta?" : "Já tem cadastro?"}
            </p>
            <Button
              variant="outline"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium"
            >
              {isLogin ? "Cadastre-se Gratuitamente" : "Fazer Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}