/**
 * Registro de uma simulação: tudo que o aluno fez, com horário real e relógio clínico.
 * A avaliação é calculada a partir deste registro (e pode ser recalculada após revisão manual).
 */
import type { Caso, Etapa } from "../caso/schema";
import { interpretar, responder, type Intencao } from "./conversa";

export type Modo = "aprendizado" | "osce" | "emergencia";

export type Evento =
  | { tipo: "fala_aluno"; t: number; tc: number; etapa: Etapa; texto: string; fatos: string[]; intencoes: Intencao[]; via: "texto" | "voz" }
  | { tipo: "fala_paciente"; t: number; tc: number; etapa: Etapa; texto: string; origem: "ficha" | "ia" | "desconhecido"; fatosIA?: string[] }
  | { tipo: "acao"; t: number; tc: number; etapa: Etapa; acao: string; valida: boolean; tecnica?: string; resultado?: string }
  | { tipo: "decisao"; t: number; tc: number; etapa: Etapa; campo: CampoDecisao; opcoes: string[] }
  | { tipo: "nihss"; t: number; tc: number; etapa: Etapa; valores: Record<string, number> }
  | { tipo: "dica"; t: number; tc: number; etapa: Etapa; texto: string }
  | { tipo: "sistema"; t: number; tc: number; etapa: Etapa; texto: string };

export type CampoDecisao = "hipotese" | "diferenciais" | "conduta" | "orientacoes" | "janela";

export interface RegistroSessao {
  id: string;
  casoId: string;
  casoVersao: number;
  modo: Modo;
  inicio: number; // epoch ms
  fim: number | null;
  tempoEsgotado: boolean;
  foco: string[]; // itens do checklist em foco ("treinar meus erros")
  eventos: Evento[];
  /** Minutos de relógio clínico acumulados por custo de ações (modo emergência). */
  custoClinicoMin: number;
  /** Fator entre tempo real e relógio clínico (1 = tempo real). */
  escalaClinica: number;
  pausadoMs: number;
}

function novoId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export class Sessao {
  r: RegistroSessao;
  private ultimoPausa: number | null = null;
  private desconhecidas = 0;

  constructor(public caso: Caso, modo: Modo, opts: { foco?: string[]; escalaClinica?: number; agora?: number } = {}) {
    this.r = {
      id: novoId(),
      casoId: caso.id,
      casoVersao: caso.versao,
      modo,
      inicio: opts.agora ?? Date.now(),
      fim: null,
      tempoEsgotado: false,
      foco: opts.foco ?? [],
      eventos: [],
      custoClinicoMin: 0,
      escalaClinica: opts.escalaClinica ?? 1,
      pausadoMs: 0,
    };
  }

  static restaurar(caso: Caso, r: RegistroSessao) {
    const s = new Sessao(caso, r.modo);
    s.r = r;
    return s;
  }

  /** Milissegundos de atendimento (sem pausas). */
  decorridoMs(agora = Date.now()) {
    const fim = this.r.fim ?? agora;
    const pausaAtual = this.ultimoPausa ? agora - this.ultimoPausa : 0;
    return Math.max(0, fim - this.r.inicio - this.r.pausadoMs - pausaAtual);
  }

  /** Relógio clínico em minutos desde a chegada do paciente. */
  relogioClinico(agora = Date.now()) {
    return (this.decorridoMs(agora) / 60000) * this.r.escalaClinica + this.r.custoClinicoMin;
  }

  pausar(agora = Date.now()) {
    if (this.r.modo === "osce" || this.ultimoPausa) return;
    this.ultimoPausa = agora;
  }
  retomar(agora = Date.now()) {
    if (!this.ultimoPausa) return;
    this.r.pausadoMs += agora - this.ultimoPausa;
    this.ultimoPausa = null;
  }
  get pausado() {
    return this.ultimoPausa !== null;
  }

  private base(etapa: Etapa, agora: number) {
    return { t: this.decorridoMs(agora), tc: this.relogioClinico(agora), etapa };
  }

  private custo(min: number) {
    if (this.r.modo === "emergencia") this.r.custoClinicoMin += min;
  }

  /**
   * Registra a fala do aluno e a resposta da ficha.
   * Com `adiarResposta`, a resposta não é registrada: quem chama decide entre a ficha
   * (responderComFicha) e a IA opcional (registrarRespostaIA).
   */
  perguntar(texto: string, via: "texto" | "voz" = "texto", agora = Date.now(), opts: { adiarResposta?: boolean } = {}) {
    const interp = interpretar(this.caso, texto);
    const etapa: Etapa = interp.intencoes.includes("explicacao") || interp.intencoes.includes("duvidas")
      ? "orientacoes"
      : interp.fatos.length
        ? "anamnese"
        : "abertura";
    this.r.eventos.push({
      ...this.base(etapa, agora),
      tipo: "fala_aluno",
      texto,
      fatos: interp.fatos.map((f) => f.id),
      intencoes: interp.intencoes,
      via,
    });
    const desconhecido = !interp.fatos.length && !interp.intencoes.length;
    const resposta = responder(this.caso, interp, desconhecido ? this.desconhecidas++ : 0);
    if (!opts.adiarResposta) this.responderComFicha(resposta, desconhecido, agora);
    this.custo(this.caso.evolucao?.custo.pergunta ?? 0.5);
    return { resposta, interp, desconhecido };
  }

  responderComFicha(resposta: string, desconhecido: boolean, agora = Date.now()) {
    const etapa = this.r.eventos.length ? this.r.eventos[this.r.eventos.length - 1].etapa : "abertura";
    this.r.eventos.push({ ...this.base(etapa, agora), tipo: "fala_paciente", texto: resposta, origem: desconhecido ? "desconhecido" : "ficha" });
  }

  /** Resposta produzida pela IA opcional. Os fatos citados ficam como "interpretação incerta". */
  registrarRespostaIA(texto: string, fatosIA: string[], agora = Date.now()) {
    const validos = fatosIA.filter((f) => this.caso.fatos.some((x) => x.id === f));
    this.r.eventos.push({ ...this.base("anamnese", agora), tipo: "fala_paciente", texto, origem: "ia", fatosIA: validos });
  }

  higienizar(agora = Date.now()) {
    this.r.eventos.push({ ...this.base("exame_fisico", agora), tipo: "acao", acao: "higiene", valida: true });
  }

  examinar(manobraId: string, tecnicaId: string, agora = Date.now()) {
    const m = this.caso.manobras.find((x) => x.id === manobraId);
    if (!m) throw new Error("manobra inexistente: " + manobraId);
    const tec = m.tecnicas.find((x) => x.id === tecnicaId) ?? m.tecnicas[0];
    const valida = tec.correta;
    const resultado = valida ? m.achado : m.achadoTecnicaInadequada ?? "Técnica inadequada: o achado obtido não é confiável. Repita a manobra com a técnica correta.";
    this.r.eventos.push({ ...this.base("exame_fisico", agora), tipo: "acao", acao: `ef:${m.id}`, valida, tecnica: tec.id, resultado });
    this.custo(this.caso.evolucao?.custo.manobra ?? 1);
    return { manobra: m, tecnica: tec, valida, resultado };
  }

  solicitar(exameId: string, agora = Date.now()) {
    const e = this.caso.exames.find((x) => x.id === exameId);
    if (!e) throw new Error("exame inexistente: " + exameId);
    const tc = this.relogioClinico(agora);
    this.r.eventos.push({ ...this.base("exames", agora), tipo: "acao", acao: `ex:${e.id}`, valida: true, resultado: e.resultado });
    if (this.r.modo !== "emergencia") return { exame: e, disponivelEm: tc };
    // Emergência: imagem exige levar o paciente (o relógio avança); laboratório roda em paralelo.
    if (e.categoria === "imagem") {
      this.custo(e.tempoMin);
      return { exame: e, disponivelEm: tc + e.tempoMin };
    }
    return { exame: e, disponivelEm: tc + e.tempoMin };
  }

  decidir(campo: CampoDecisao, opcoes: string[], agora = Date.now()) {
    this.r.eventos.push({ ...this.base(campo === "orientacoes" ? "orientacoes" : "decisao", agora), tipo: "decisao", campo, opcoes });
  }

  registrarNihss(valores: Record<string, number>, agora = Date.now()) {
    this.r.eventos.push({ ...this.base("exame_fisico", agora), tipo: "nihss", valores });
  }

  registrarDica(texto: string, etapa: Etapa, agora = Date.now()) {
    this.r.eventos.push({ ...this.base(etapa, agora), tipo: "dica", texto });
  }

  sistema(texto: string, etapa: Etapa = "abertura", agora = Date.now()) {
    this.r.eventos.push({ ...this.base(etapa, agora), tipo: "sistema", texto });
  }

  encerrar(agora = Date.now(), tempoEsgotado = false) {
    this.retomar(agora);
    if (!this.r.fim) this.r.fim = agora;
    this.r.tempoEsgotado = tempoEsgotado;
  }
}

// ---------------------------------------------------------------- consultas ao registro

export function acoesValidas(r: RegistroSessao) {
  return r.eventos.filter((e): e is Extract<Evento, { tipo: "acao" }> => e.tipo === "acao" && e.valida);
}

/** Decisão final (último registro de cada campo) e o momento em que foi tomada. */
export function decisoesFinais(r: RegistroSessao) {
  const out: Partial<Record<CampoDecisao, { opcoes: string[]; tc: number; t: number }>> = {};
  for (const e of r.eventos) if (e.tipo === "decisao") out[e.campo] = { opcoes: e.opcoes, tc: e.tc, t: e.t };
  return out;
}

export function fatosLiberados(r: RegistroSessao) {
  const texto = new Set<string>();
  const ia = new Set<string>();
  for (const e of r.eventos) {
    if (e.tipo === "fala_aluno") e.fatos.forEach((f) => texto.add(f));
    if (e.tipo === "fala_paciente" && e.fatosIA) e.fatosIA.forEach((f) => ia.add(f));
  }
  return { texto, ia };
}

export function intencoesDetectadas(r: RegistroSessao) {
  const s = new Set<Intencao>();
  for (const e of r.eventos) if (e.tipo === "fala_aluno") e.intencoes.forEach((i) => s.add(i));
  return s;
}

export function ultimoNihss(r: RegistroSessao) {
  for (let i = r.eventos.length - 1; i >= 0; i--) {
    const e = r.eventos[i];
    if (e.tipo === "nihss") return e.valores;
  }
  return null;
}
