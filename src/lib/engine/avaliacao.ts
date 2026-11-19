/**
 * Avaliação pelo checklist. Cada item recebe um status e a origem da evidência:
 * - interface: ação confirmada na tela (clique em manobra/exame/decisão);
 * - texto: fala do aluno verificada por regra determinística;
 * - ia: interpretação da IA opcional (não pontua até revisão manual);
 * - manual: depende de avaliador humano (não pontua automaticamente).
 */
import { COMPETENCIAS, ETAPAS, type Caso, type Competencia, type Etapa, type ItemChecklist } from "../caso/schema";
import {
  acoesValidas,
  decisoesFinais,
  fatosLiberados,
  intencoesDetectadas,
  ultimoNihss,
  type RegistroSessao,
} from "./sessao";

export type StatusItem = "cumprido" | "nao_cumprido" | "sequencia_inadequada" | "pendente_revisao";
export type Evidencia = "interface" | "texto" | "ia" | "manual" | "nenhuma";

export interface ResultadoItem {
  item: ItemChecklist;
  status: StatusItem;
  evidencia: Evidencia;
  pontos: number;
  detalhe: string;
  revisado?: RevisaoManual;
}

export interface RevisaoManual {
  itemId: string;
  status: StatusItem;
  pontos: number;
  justificativa: string;
  data: string;
  anterior: { status: StatusItem; pontos: number };
}

export interface ErroCriticoDetectado {
  id: string;
  texto: string;
  explicacao: string;
  competencia: Competencia;
}

export interface MetaTempo {
  id: string;
  nome: string;
  limiteMin: number;
  realizadoEmMin: number | null;
  cumprida: boolean;
}

export interface Avaliacao {
  itens: ResultadoItem[];
  obtido: number;
  maximo: number;
  pct: number;
  porCompetencia: Record<Competencia, { obtido: number; maximo: number }>;
  errosCriticos: ErroCriticoDetectado[];
  decisoesInadequadas: { campo: string; texto: string; explicacao?: string }[];
  temposEtapaSeg: Record<Etapa, number>;
  duracaoSeg: number;
  metasTempo: MetaTempo[];
  tecnicasInadequadas: { manobra: string; tecnica: string }[];
  pendentes: number;
  zeradaPorErroCritico: boolean;
}

function casa(acao: string, padrao: string) {
  return acao === padrao || (padrao.endsWith(":") && acao.startsWith(padrao));
}

export function avaliar(
  caso: Caso,
  r: RegistroSessao,
  opts: { revisoes?: RevisaoManual[]; politicaErroCritico?: "sinalizar" | "zerar" } = {},
): Avaliacao {
  const acoes = acoesValidas(r);
  const todasAcoes = r.eventos.filter((e) => e.tipo === "acao");
  const decisoes = decisoesFinais(r);
  const { texto: fatosTexto, ia: fatosIA } = fatosLiberados(r);
  const intencoes = intencoesDetectadas(r);
  const nihss = ultimoNihss(r);
  const selecionadas = new Set(Object.values(decisoes).flatMap((d) => d?.opcoes ?? []));

  const primeiraAcao = (padrao: string) => acoes.find((a) => casa(a.acao, padrao));

  const itens: ResultadoItem[] = caso.checklist.map((item) => {
    const c = item.criterio;
    const base = { item, pontos: 0 } as const;
    switch (c.tipo) {
      case "fatos": {
        const min = c.minimo ?? c.fatos.length;
        const det = c.fatos.filter((f) => fatosTexto.has(f));
        const incertos = c.fatos.filter((f) => !fatosTexto.has(f) && fatosIA.has(f));
        if (det.length >= min)
          return { ...base, status: "cumprido", evidencia: "texto", pontos: item.pontos, detalhe: `${det.length}/${c.fatos.length} informações obtidas` };
        if (det.length + incertos.length >= min)
          return { ...base, status: "pendente_revisao", evidencia: "ia", detalhe: `Depende de interpretação da IA (${incertos.length} informação(ões)) — confirme na revisão` };
        return { ...base, status: "nao_cumprido", evidencia: "nenhuma", detalhe: `${det.length}/${min} informações necessárias obtidas` };
      }
      case "intencao":
        return intencoes.has(c.intencao)
          ? { ...base, status: "cumprido", evidencia: "texto", pontos: item.pontos, detalhe: "Identificado na fala" }
          : { ...base, status: "nao_cumprido", evidencia: "nenhuma", detalhe: "Não identificado na fala" };
      case "acao": {
        const min = c.minimo ?? c.acoes.length;
        const feitas = c.acoes.filter((a) => primeiraAcao(a));
        const tentadas = c.acoes.filter((a) => !primeiraAcao(a) && todasAcoes.some((x) => x.tipo === "acao" && casa(x.acao, a)));
        if (feitas.length >= min)
          return { ...base, status: "cumprido", evidencia: "interface", pontos: item.pontos, detalhe: `${feitas.length}/${c.acoes.length} realizadas` };
        return {
          ...base,
          status: "nao_cumprido",
          evidencia: "nenhuma",
          detalhe: tentadas.length ? `Realizado com técnica inadequada (${tentadas.length})` : `${feitas.length}/${min} realizadas`,
        };
      }
      case "decisao": {
        const escolhidas = decisoes[c.campo]?.opcoes ?? [];
        const min = c.minimo ?? c.opcoes.length;
        const certas = c.opcoes.filter((o) => escolhidas.includes(o));
        return certas.length >= min
          ? { ...base, status: "cumprido", evidencia: "interface", pontos: item.pontos, detalhe: "Selecionado" }
          : { ...base, status: "nao_cumprido", evidencia: "nenhuma", detalhe: escolhidas.length ? "Seleção incompleta ou incorreta" : "Não selecionado" };
      }
      case "sequencia": {
        const antes = primeiraAcao(c.antes);
        const depois =
          c.depois === "decisao"
            ? r.eventos.find((e) => e.tipo === "decisao")
            : todasAcoes.find((a) => a.tipo === "acao" && casa(a.acao, c.depois));
        if (!antes) return { ...base, status: "nao_cumprido", evidencia: "nenhuma", detalhe: "Etapa não realizada" };
        if (!depois || antes.t <= depois.t)
          return { ...base, status: "cumprido", evidencia: "interface", pontos: item.pontos, detalhe: "Ordem adequada" };
        return { ...base, status: "sequencia_inadequada", evidencia: "interface", detalhe: "Realizado fora da ordem esperada" };
      }
      case "nihss": {
        if (!caso.nihss?.length || !nihss) return { ...base, status: "nao_cumprido", evidencia: "nenhuma", detalhe: "Escala não aplicada" };
        const correto = caso.nihss.reduce((s, i) => s + i.correto, 0);
        const total = caso.nihss.reduce((s, i) => s + (nihss[i.id] ?? 0), 0);
        const completos = caso.nihss.every((i) => i.id in nihss);
        const ok = completos && Math.abs(total - correto) <= 1;
        return ok
          ? { ...base, status: "cumprido", evidencia: "interface", pontos: item.pontos, detalhe: `NIHSS ${total} (esperado ${correto})` }
          : { ...base, status: "nao_cumprido", evidencia: "interface", detalhe: `NIHSS ${completos ? total : "incompleto"} (esperado ${correto})` };
      }
      case "manual":
        return { ...base, status: "pendente_revisao", evidencia: "manual", detalhe: "Requer avaliação humana — não pontuado automaticamente" };
    }
  });

  // Revisões manuais sobrepõem o resultado automático.
  for (const rev of opts.revisoes ?? []) {
    const it = itens.find((i) => i.item.id === rev.itemId);
    if (it) {
      it.status = rev.status;
      it.pontos = Math.min(rev.pontos, it.item.pontos);
      it.evidencia = "manual";
      it.revisado = rev;
    }
  }

  // ---------------------------------------------------------------- erros críticos
  const errosCriticos: ErroCriticoDetectado[] = [];
  const momentoDecisao = (opcao: string) =>
    Object.values(decisoes).find((d) => d?.opcoes.includes(opcao)) ?? null;
  const feito = (req: string, ateT: number) =>
    selecionadas.has(req) || acoes.some((a) => casa(a.acao, req) && a.t <= ateT);
  for (const e of caso.errosCriticos) {
    const g = e.regra;
    let ocorreu = false;
    if (g.tipo === "decisao_proibida") ocorreu = selecionadas.has(g.opcao);
    if (g.tipo === "decisao_sem_requisito") {
      const d = momentoDecisao(g.opcao);
      ocorreu = !!d && g.requer.some((req) => !feito(req, d.t));
    }
    if (g.tipo === "omissao_fatos") ocorreu = !g.fatos.some((f) => fatosTexto.has(f) || fatosIA.has(f));
    if (g.tipo === "sequencia") {
      const a = primeiraAcao(g.antes);
      const d = primeiraAcao(g.depois);
      ocorreu = !!d && (!a || a.t > d.t);
    }
    if (g.tipo === "decisao_apos_tempo" && r.modo === "emergencia") {
      const d = momentoDecisao(g.opcao);
      ocorreu = !!d && d.tc > g.limiteMin;
    }
    if (ocorreu) errosCriticos.push({ id: e.id, texto: e.texto, explicacao: e.explicacao, competencia: e.competencia });
  }

  const decisoesInadequadas = (Object.keys(decisoes) as (keyof typeof decisoes)[]).flatMap((campo) =>
    (decisoes[campo]?.opcoes ?? [])
      .map((id) => caso.decisoes[campo].find((o) => o.id === id))
      .filter((o): o is NonNullable<typeof o> => !!o && !o.correta)
      .map((o) => ({ campo, texto: o.texto, explicacao: o.explicacao })),
  );

  // ---------------------------------------------------------------- pontuação
  const porCompetencia = Object.fromEntries(COMPETENCIAS.map((c) => [c, { obtido: 0, maximo: 0 }])) as Avaliacao["porCompetencia"];
  let obtido = 0;
  let maximo = 0;
  for (const it of itens) {
    maximo += it.item.pontos;
    obtido += it.pontos;
    porCompetencia[it.item.competencia].maximo += it.item.pontos;
    porCompetencia[it.item.competencia].obtido += it.pontos;
  }
  const zerada = opts.politicaErroCritico === "zerar" && errosCriticos.length > 0;
  if (zerada) obtido = 0;
  obtido = Math.round(obtido * 100) / 100;

  // ---------------------------------------------------------------- tempo por etapa
  const temposEtapaSeg = Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<Etapa, number>;
  const evs = r.eventos.filter((e) => e.tipo !== "fala_paciente" && e.tipo !== "sistema");
  let anterior = 0;
  for (const e of evs) {
    temposEtapaSeg[e.etapa] += Math.max(0, e.t - anterior) / 1000;
    anterior = e.t;
  }
  const duracaoSeg = r.fim ? Math.max(0, r.fim - r.inicio - r.pausadoMs) / 1000 : anterior / 1000;
  const resto = Math.max(0, duracaoSeg - anterior / 1000);
  const ultimaEtapa = evs.length ? evs[evs.length - 1].etapa : "abertura";
  temposEtapaSeg[ultimaEtapa] += resto;

  // ---------------------------------------------------------------- metas de tempo (emergência)
  const metasTempo: MetaTempo[] =
    r.modo === "emergencia" && caso.evolucao
      ? caso.evolucao.metas.map((m) => {
          const a = acoes.find((x) => casa(x.acao, m.acao));
          const d = momentoDecisao(m.acao);
          const t = a?.tc ?? d?.tc ?? null;
          return { id: m.id, nome: m.nome, limiteMin: m.limiteMin, realizadoEmMin: t, cumprida: t !== null && t <= m.limiteMin };
        })
      : [];

  const tecnicasInadequadas = todasAcoes
    .filter((a) => a.tipo === "acao" && !a.valida)
    .map((a) => {
      const ev = a as Extract<typeof a, { tipo: "acao" }>;
      const m = caso.manobras.find((x) => `ef:${x.id}` === ev.acao);
      return { manobra: m?.nome ?? ev.acao, tecnica: m?.tecnicas.find((t) => t.id === ev.tecnica)?.descricao ?? "" };
    });

  return {
    itens,
    obtido,
    maximo,
    pct: maximo ? Math.round((obtido / maximo) * 1000) / 10 : 0,
    porCompetencia,
    errosCriticos,
    decisoesInadequadas,
    temposEtapaSeg,
    duracaoSeg,
    metasTempo,
    tecnicasInadequadas,
    pendentes: itens.filter((i) => i.status === "pendente_revisao").length,
    zeradaPorErroCritico: zerada,
  };
}

/** Converte o percentual da estação em pontos da prova, segundo o valor configurado da estação. */
export function projetarNaProva(pct: number, valorEstacao: number) {
  return Math.round(((pct / 100) * valorEstacao) * 100) / 100;
}
