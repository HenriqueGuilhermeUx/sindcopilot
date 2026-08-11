import { trpc } from "@/lib/trpc";
import { apiUrl } from "@/lib/runtime";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Bot, Loader2, MessageSquare, RefreshCw, Send, Sparkles, Trash2, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  degraded?: boolean;
};

type AssistantResponse = {
  content?: string;
  degraded?: boolean;
  error?: string;
};

const suggestions = [
  "Como aplicar uma multa por infração?",
  "Quais são as regras sobre barulho?",
  "Como organizar uma assembleia?",
  "O que acompanhar para renovar o AVCB?",
];

export default function Assistente() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedCondo, setSelectedCondo] = useState("all");
  const [pending, setPending] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: condos, isLoading: condosLoading } = trpc.condominium.list.useQuery();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending, lastError]);

  const condoName = useMemo(() => {
    if (selectedCondo === "all" || !condos) return null;
    return condos.find((c: any) => c.id === Number(selectedCondo))?.name || null;
  }, [selectedCondo, condos]);

  const sendQuestion = async (rawQuestion?: string) => {
    const question = String(rawQuestion ?? input).trim();
    if (!question || pending) return;
    if (!session?.access_token) {
      toast.error("Sua sessão expirou. Entre novamente.");
      return;
    }

    setPending(true);
    setLastQuestion(question);
    setLastError(null);
    setMessages(current => [...current, { role: "user", content: question, timestamp: new Date() }]);
    setInput("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 50_000);

    try {
      const response = await fetch(apiUrl("/api/assistant/chat"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: question,
          condominiumId: selectedCondo !== "all" ? Number(selectedCondo) : undefined,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => ({}))) as AssistantResponse;
      if (!response.ok) throw new Error(payload.error || `Não foi possível consultar o assistente (${response.status}).`);
      if (!payload.content?.trim()) throw new Error("O assistente não retornou uma resposta.");

      setMessages(current => [
        ...current,
        {
          role: "assistant",
          content: payload.content!.trim(),
          timestamp: new Date(),
          degraded: Boolean(payload.degraded),
        },
      ]);

      if (payload.degraded) toast.info("Resposta em modo de contingência. Você pode tentar novamente em alguns segundos.");
    } catch (error: any) {
      const message = error?.name === "AbortError"
        ? "A consulta demorou mais que o esperado. Verifique sua conexão e tente novamente."
        : error?.message || "Não foi possível concluir a consulta agora.";
      setLastError(message);
      toast.error(message);
    } finally {
      window.clearTimeout(timeout);
      setPending(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setLastError(null);
    setLastQuestion(null);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col md:h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" /> Assistente IA
          </h1>
          <p className="text-sm text-muted-foreground">Consulte regras, convenções e orientações para a gestão do condomínio.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedCondo} onValueChange={setSelectedCondo} disabled={condosLoading || pending}>
            <SelectTrigger className="w-56" aria-label="Selecionar condomínio para contexto">
              <SelectValue placeholder="Contexto: Todos os condomínios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os condomínios</SelectItem>
              {condos?.map((condo: any) => (
                <SelectItem key={condo.id} value={condo.id.toString()}>{condo.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearConversation}
              className="text-muted-foreground"
              aria-label="Limpar conversa"
              title="Limpar conversa"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden border-0 shadow-sm">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 && !lastError ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Como posso ajudar?</h3>
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                Pergunte sobre a rotina condominial ou selecione um condomínio para usar Convenção, Regimento e outros documentos indexados como contexto.
              </p>
              <div className="grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map(suggestion => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal px-4 py-3 text-left text-xs"
                    onClick={() => void sendQuestion(suggestion)}
                    disabled={pending}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={`${message.timestamp.getTime()}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center text-primary" aria-hidden="true">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div className={`max-w-[84%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {message.role === "assistant" ? (
                      <>
                        {message.degraded && (
                          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Modo de contingência
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {pending && (
                <div className="flex gap-3" role="status" aria-live="polite">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center text-primary" aria-hidden="true"><Bot className="h-4 w-4" /></div>
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Consultando…
                  </div>
                </div>
              )}

              {lastError && !pending && (
                <div className="ml-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" role="alert">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-medium">A consulta não foi concluída.</p>
                      <p className="mt-1 text-xs opacity-80">{lastError}</p>
                      {lastQuestion && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => void sendQuestion(lastQuestion)}>
                          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> Tentar novamente
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          {condoName && (
            <p className="mb-2 text-xs text-muted-foreground">Contexto: <span className="font-medium">{condoName}</span></p>
          )}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta…"
              disabled={pending}
              className="flex-1"
              aria-label="Pergunta para o Assistente IA"
            />
            <Button
              onClick={() => void sendQuestion()}
              disabled={!input.trim() || pending}
              size="icon"
              aria-label="Enviar pergunta"
              title="Enviar pergunta"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
