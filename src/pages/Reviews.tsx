import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Reply, Filter, ThumbsUp, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function Reviews() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ average: 0, total: 0, pending: 0 });
    const [filter, setFilter] = useState("all");
    const [replyText, setReplyText] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    useEffect(() => {
        fetchReviews();
    }, [filter]);

    const fetchReviews = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Busca ID do Restaurante
        const { data: market } = await supabase.from('markets').select('id').eq('owner_id', user.id).single();
        if (!market) return;

        // 2. Query Base com JOIN na nova tabela de respostas
        let query = supabase
            .from('reviews')
            .select(`
                *,
                profiles:user_id (display_name, avatar_url),
                replies:review_replies (
                    id, content, created_at, user_id
                )
            `)
            .eq('target_type', 'restaurant')
            .eq('target_id', market.id)
            .order('created_at', { ascending: false });

        const { data } = await query;

        if (data) {
            // Filtragem Client-Side para flexibilidade com a nova estrutura de replies array
            let filteredData = data;

            if (filter === 'pending') {
                filteredData = data.filter((r: any) => (!r.replies || r.replies.length === 0));
            } else if (filter === '5star') {
                filteredData = data.filter((r: any) => r.rating === 5);
            } else if (filter === '1star') {
                filteredData = data.filter((r: any) => r.rating === 1);
            }

            setReviews(filteredData);

            // Recalcula Stats
            const total = data.length;
            const sum = data.reduce((acc: number, r: any) => acc + r.rating, 0);
            const pending = data.filter((r: any) => (!r.replies || r.replies.length === 0)).length;

            setStats({
                average: total > 0 ? sum / total : 0,
                total,
                pending
            });
        }
        setLoading(false);
    };

    const handleReply = async (reviewId: string) => {
        if (!replyText.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // INSERE NA NOVA TABELA
        const { data: newReply, error } = await supabase
            .from('review_replies')
            .insert({
                review_id: reviewId,
                user_id: user.id,
                content: replyText
            })
            .select()
            .single();

        if (!error && newReply) {
            toast.success("Resposta enviada!");

            // ATUALIZAÇÃO LOCAL OTIMISTA (Para aparecer na tela imediatamente)
            setReviews(prev => prev.map(r => {
                if (r.id === reviewId) {
                    const updatedReplies = r.replies ? [...r.replies, newReply] : [newReply];
                    return { ...r, replies: updatedReplies };
                }
                return r;
            }));

            // Atualiza estatísticas locais se estava pendente
            setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));

            setReplyingTo(null);
            setReplyText("");
        } else {
            toast.error("Erro ao responder.");
            console.error(error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Avaliações</h1>
                    <p className="text-gray-500">Gerencie a reputação do seu restaurante</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <Filter className="w-4 h-4 text-gray-400 ml-2" />
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px] border-0 shadow-none focus:ring-0">
                            <SelectValue placeholder="Filtrar por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as avaliações</SelectItem>
                            <SelectItem value="pending">Sem resposta (Pendentes)</SelectItem>
                            <SelectItem value="5star">5 Estrelas</SelectItem>
                            <SelectItem value="1star">1 Estrela</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Nota Média</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                            <span className="text-4xl font-bold">{stats.average.toFixed(1)}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total de Avaliações</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-8 h-8 text-blue-500" />
                            <span className="text-4xl font-bold">{stats.total}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Pendentes de Resposta</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Reply className="w-8 h-8 text-orange-500" />
                            <span className="text-4xl font-bold">{stats.pending}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Reviews */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <Card key={review.id} className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex gap-4">
                                <Avatar>
                                    <AvatarImage src={review.profiles?.avatar_url} />
                                    <AvatarFallback>{review.profiles?.display_name?.substring(0, 2) || "U"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-3">
                                    {/* Cabeçalho da Review */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{review.profiles?.display_name || "Cliente"}</h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <div className="flex text-yellow-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current" : "text-gray-200"}`} />
                                                    ))}
                                                </div>
                                                <span>• {new Date(review.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {review.rating >= 4 && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                                                <ThumbsUp className="w-3 h-3" /> Recomendado
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {review.tags && review.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {review.tags.map((tag: string, i: number) => (
                                                <Badge key={i} variant="outline" className="text-xs text-gray-600 bg-gray-50">{tag}</Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Comentário do Cliente */}
                                    {review.comment && (
                                        <div className="bg-gray-50 p-4 rounded-r-xl rounded-bl-xl text-gray-700 text-sm italic border-l-4 border-gray-300">
                                            "{review.comment}"
                                        </div>
                                    )}

                                    {/* THREAD DE RESPOSTAS (Chat) */}
                                    {review.replies && review.replies.length > 0 && (
                                        <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                                            {review.replies.map((reply: any) => (
                                                <div key={reply.id} className="flex gap-3 justify-end">
                                                    <div className="bg-blue-50 p-3 rounded-l-xl rounded-tr-xl text-sm text-gray-700 border-r-4 border-blue-400 max-w-[80%]">
                                                        <p className="text-xs font-bold text-blue-600 mb-1">
                                                            Sua resposta • {new Date(reply.created_at).toLocaleDateString()}
                                                        </p>
                                                        {reply.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Caixa de Resposta */}
                                    <div className="mt-4">
                                        {replyingTo === review.id ? (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <Textarea
                                                    placeholder="Escreva sua resposta..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    className="min-h-[80px]"
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancelar</Button>
                                                    <Button size="sm" onClick={() => handleReply(review.id)} className="gap-2">
                                                        <Send className="w-3 h-3" /> Enviar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-gray-500"
                                                onClick={() => setReplyingTo(review.id)}
                                            >
                                                <Reply className="w-4 h-4" /> Responder
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {reviews.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma avaliação encontrada com este filtro.</p>
                    </div>
                )}
            </div>
        </div>
    );
}