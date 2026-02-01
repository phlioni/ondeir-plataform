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
    // Verifica sessão existente ao carregar
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        checkRoleAndRedirect(session.user.id);
      }
    };
    checkUser();

    // Escuta mudanças de estado (ex: login concluído)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await checkRoleAndRedirect(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkRoleAndRedirect = async (userId: string) => {
    const storedPath = localStorage.getItem('auth_return_path');
    const returnPath = storedPath || fromState || "/";
    localStorage.removeItem('auth_return_path');

    if (returnPath !== "/" && returnPath !== "/auth") {
      navigate(returnPath, { replace: true });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role === "partner" || profile?.role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/");
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
      // O listener do useEffect cuidará do redirecionamento
    } catch (error: any) {
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
        variant: "destructive",
      });
    } finally {
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
          <CardTitle className="text-2xl font-bold text-primary">Flippi</CardTitle>
          <CardDescription>
            {isLogin
              ? "Acesse sua conta de parceiro"
              : "Torne-se um parceiro exclusivo"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {isLogin ? (
            /* --- TELA DE LOGIN (EMAIL/SENHA APENAS) --- */
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
                {loading ? <Loader2 className="animate-spin" /> : "Acessar Plataforma"}
              </Button>
            </form>
          ) : (
            /* --- TELA DE SOLICITAÇÃO (WHATSAPP) --- */
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