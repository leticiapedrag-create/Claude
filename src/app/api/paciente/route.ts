/**
 * IA conversacional opcional para o paciente virtual.
 * Só funciona com ANTHROPIC_API_KEY configurada no servidor. Sem ela, responde 503
 * e o aplicativo usa o motor determinístico (ficha do caso).
 *
 * A IA recebe apenas a ficha estruturada e deve citar os ids dos fatos que revelou.
 * Esses fatos entram na avaliação como "interpretação incerta" (exigem revisão manual).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const Entrada = z.object({
  paciente: z.object({
    nome: z.string(),
    idade: z.number(),
    profissao: z.string(),
    personalidade: z.string(),
    limitacoes: z.array(z.string()),
  }),
  fatos: z.array(z.object({ id: z.string(), tema: z.string(), resposta: z.string() })).max(200),
  historico: z.array(z.object({ quem: z.enum(["aluno", "paciente"]), texto: z.string().max(2000) })).max(60),
  pergunta: z.string().min(1).max(1000),
});

const Saida = z.object({
  resposta: z.string(),
  fatos_revelados: z.array(z.string()),
  fora_da_ficha: z.boolean(),
});

const MODELO = process.env.OSCE_MODELO_IA || "claude-opus-5-5";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ erro: "IA não configurada no servidor" }, { status: 503 });
  }
  const parsed = Entrada.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "Requisição inválida" }, { status: 400 });
  const { paciente, fatos, historico, pergunta } = parsed.data;

  const ficha = fatos.map((f) => `- [${f.id}] ${f.tema}: ${f.resposta}`).join("\n");
  const system = `Você interpreta ${paciente.nome}, ${paciente.idade} anos, paciente em uma estação de treinamento OSCE para estudantes de Medicina. ${paciente.profissao} Personalidade: ${paciente.personalidade}

Regras obrigatórias:
1. Use SOMENTE as informações da ficha abaixo. Não invente sintomas, antecedentes, exames, valores ou diagnósticos.
2. Revele apenas o que a pergunta pede. Não antecipe informações não perguntadas.
3. Se a pergunta pedir algo que não está na ficha, diga que não sabe ou peça esclarecimento, e marque fora_da_ficha = true.
4. Fale como um paciente leigo, em português do Brasil, frases curtas, sem termos técnicos e sem dar diagnósticos.
5. Em fatos_revelados, liste os ids (entre colchetes) de cada item da ficha que sua resposta usou.
6. Limitações do paciente: ${paciente.limitacoes.join("; ") || "nenhuma"}.

Ficha:
${ficha}`;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historico.map((h) => ({ role: h.quem === "aluno" ? ("user" as const) : ("assistant" as const), content: h.texto })),
    { role: "user", content: pergunta },
  ];
  // A conversa precisa começar pelo usuário.
  while (messages.length && messages[0].role !== "user") messages.shift();

  try {
    const client = new Anthropic();
    // Fallback do servidor: se o modelo recusar, a API refaz a chamada em outro modelo.
    const r = await client.beta.messages.parse({
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      model: MODELO,
      max_tokens: 2000,
      system,
      messages,
      output_config: { effort: "low", format: zodOutputFormat(Saida) },
    });
    if (r.stop_reason === "refusal" || !r.parsed_output) {
      return Response.json({ erro: "Sem resposta utilizável da IA" }, { status: 502 });
    }
    const ids = new Set(fatos.map((f) => f.id));
    const out = r.parsed_output;
    return Response.json({ ...out, fatos_revelados: out.fatos_revelados.filter((f) => ids.has(f)), modelo: r.model });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ erro: "Limite de uso da IA atingido" }, { status: 429 });
    if (e instanceof Anthropic.APIError) return Response.json({ erro: `Erro da IA (${e.status})` }, { status: 502 });
    return Response.json({ erro: "Falha ao contatar a IA" }, { status: 502 });
  }
}

export async function GET() {
  return Response.json({ disponivel: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN), modelo: MODELO });
}
