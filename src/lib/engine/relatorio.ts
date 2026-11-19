/** Conteúdo didático derivado da avaliação: linha do tempo do aluno e plano de revisão. */
import { COMPETENCIAS, NOME_COMPETENCIA, type Caso, type Competencia } from "../caso/schema";
import type { Avaliacao } from "./avaliacao";
import type { RegistroSessao } from "./sessao";

const SUGESTOES: Record<Competencia, string> = {
  comunicacao: "Treine a abertura padrão (cumprimento, nome, função, confirmação do nome do paciente) e o fechamento (explicar, checar entendimento, perguntar dúvidas).",
  anamnese: "Use um roteiro mental fixo: queixa → início/tempo → caracterização → sintomas associados → antecedentes → medicações/alergias → hábitos → família.",
  exame_fisico: "Revise a sequência do exame dirigido e a técnica de cada manobra; diga em voz alta o que está avaliando.",
  raciocinio: "Treine justificar a hipótese principal e dois diferenciais que mudam a conduta, com o achado que afasta cada um.",
  conduta: "Memorize a conduta inicial por prioridade (o que fazer nos primeiros minutos) e as metas de tempo.",
  orientacoes: "Feche sempre com orientação em linguagem simples, sinais de alerta e plano de retorno.",
  seguranca: "Revise as barreiras de segurança: higiene das mãos, confirmação de contraindicações e exames obrigatórios antes de intervenções.",
};

export interface PassoLinha { t: number; texto: string; tipo: "fala" | "acao" | "decisao" | "sistema" }

/** Primeiras ocorrências relevantes, para comparar com a sequência ideal. */
export function linhaDoTempo(caso: Caso, r: RegistroSessao): PassoLinha[] {
  const vistos = new Set<string>();
  const out: PassoLinha[] = [];
  for (const e of r.eventos) {
    if (e.tipo === "fala_aluno") {
      for (const i of e.intencoes) {
        if (i === "saudacao" || vistos.has(i)) continue;
        vistos.add(i);
        out.push({ t: e.t, tipo: "fala", texto: { apresentacao: "Apresentou-se", identificacao: "Identificou o paciente", consentimento: "Pediu consentimento", explicacao: "Explicou o diagnóstico/conduta", duvidas: "Verificou dúvidas" }[i] });
      }
      for (const f of e.fatos) {
        if (vistos.has("f:" + f)) continue;
        vistos.add("f:" + f);
        out.push({ t: e.t, tipo: "fala", texto: "Perguntou: " + (caso.fatos.find((x) => x.id === f)?.tema ?? f) });
      }
    }
    if (e.tipo === "acao") {
      const nome = e.acao === "higiene" ? "Higienizou as mãos" : e.acao.startsWith("ef:") ? caso.manobras.find((m) => `ef:${m.id}` === e.acao)?.nome : caso.exames.find((x) => `ex:${x.id}` === e.acao)?.nome;
      if (!vistos.has(e.acao)) {
        vistos.add(e.acao);
        out.push({ t: e.t, tipo: "acao", texto: (e.acao.startsWith("ex:") ? "Solicitou: " : e.acao.startsWith("ef:") ? "Examinou: " : "") + (nome ?? e.acao) + (e.valida ? "" : " (técnica inadequada)") });
      }
    }
    if (e.tipo === "nihss") out.push({ t: e.t, tipo: "acao", texto: "Registrou a NIHSS" });
    if (e.tipo === "decisao") out.push({ t: e.t, tipo: "decisao", texto: `Registrou ${{ hipotese: "hipótese", diferenciais: "diferenciais", janela: "janela terapêutica", conduta: "conduta", orientacoes: "orientações" }[e.campo]}` });
  }
  return out;
}

export interface ItemPlano { competencia: Competencia; nome: string; pct: number; sugestao: string; itens: { texto: string; comoFazer?: string }[] }

export function planoDeRevisao(caso: Caso, a: Avaliacao): ItemPlano[] {
  return COMPETENCIAS.map((c) => {
    const p = a.porCompetencia[c];
    const pct = p.maximo ? Math.round((p.obtido / p.maximo) * 100) : 100;
    const itens = a.itens
      .filter((i) => i.item.competencia === c && i.status !== "cumprido" && i.status !== "pendente_revisao")
      .map((i) => ({ texto: i.item.texto, comoFazer: i.item.comoFazer }));
    const errosCriticos = a.errosCriticos.filter((e) => e.competencia === c).map((e) => ({ texto: "Erro crítico: " + e.texto, comoFazer: e.explicacao }));
    return { competencia: c, nome: NOME_COMPETENCIA[c], pct, sugestao: SUGESTOES[c], itens: [...errosCriticos, ...itens], maximo: p.maximo };
  })
    .filter((x) => x.maximo > 0 && (x.pct < 80 || x.itens.length))
    .sort((x, y) => x.pct - y.pct)
    .map((x) => ({ competencia: x.competencia, nome: x.nome, pct: x.pct, sugestao: x.sugestao, itens: x.itens }));
}

/** Itens a treinar em "Treinar apenas meus erros". */
export function itensParaTreinar(a: Avaliacao) {
  return a.itens.filter((i) => i.status === "nao_cumprido" || i.status === "sequencia_inadequada").map((i) => i.item.id);
}
