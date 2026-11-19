import { describe, expect, it } from "vitest";
import { CASOS_EMBUTIDOS } from "@/data/casos";
import { verificarReferencias, validarCaso } from "@/lib/caso/schema";
import { interpretar } from "@/lib/engine/conversa";
import { Sessao } from "@/lib/engine/sessao";
import { avaliar } from "@/lib/engine/avaliacao";
import { estadoClinico } from "@/lib/engine/emergencia";

const avc = CASOS_EMBUTIDOS.find((c) => c.id === "avc-isquemico-pa")!;
const ferida = CASOS_EMBUTIDOS.find((c) => c.id === "ferida-sutura")!;

/** Perguntas escritas como uma estudante falaria na estação. */
const ROTEIRO: Record<string, string[]> = {
  [avc.id]: [
    "Bom dia, meu nome é Letícia, sou estudante de Medicina. O que trouxe o senhor ao hospital?",
    "Qual o nome completo do senhor?",
    "Quando começou essa fraqueza?",
    "Qual foi a última vez que o senhor estava bem, normal?",
    "Está sentindo formigamento ou dormência?",
    "Alguém percebeu alteração na sua fala?",
    "Teve dor de cabeça?",
    "Vomitou?",
    "Teve convulsão ou desmaio?",
    "Caiu ou bateu a cabeça?",
    "O senhor tem pressão alta ou diabetes?",
    "Fuma?",
    "Sente o coração disparar, palpitação?",
    "Já teve derrame antes?",
    "Já teve algum sangramento ou fez cirurgia recente?",
    "Toma algum remédio?",
    "Usa algum remédio para afinar o sangue?",
    "Tem alergia a algum medicamento?",
    "Quanto o senhor pesa?",
    "Posso examinar o senhor?",
    "Seu Sebastião, o senhor está tendo um AVC, um derrame, vou explicar o tratamento.",
    "Ficou alguma dúvida?",
  ],
  [ferida.id]: [
    "Boa tarde, sou a estudante Letícia. Como posso ajudar?",
    "Qual é o seu nome?",
    "Com o que você se cortou?",
    "Há quanto tempo aconteceu?",
    "Quando foi sua última vacina antitetânica?",
    "Você tem alergia a anestesia?",
    "Você tem diabetes ou alguma doença?",
    "Está sentindo formigamento ou consegue mexer os dedos?",
    "Vou te examinar e fazer a sutura, posso?",
    "Vou explicar: o diagnóstico é uma ferida simples e vamos dar pontos.",
    "Tem alguma dúvida?",
  ],
};

function sessaoPerfeita(caso = avc) {
  const s = new Sessao(caso, "osce", { agora: 0 });
  let t = 1000;
  for (const p of ROTEIRO[caso.id]) s.perguntar(p, "texto", (t += 1000));
  s.higienizar((t += 1000));
  for (const m of caso.manobras) s.examinar(m.id, m.tecnicas.find((x) => x.correta)!.id, (t += 1000));
  for (const e of caso.exames.filter((x) => x.indicado)) s.solicitar(e.id, (t += 1000));
  if (caso.nihss) s.registrarNihss(Object.fromEntries(caso.nihss.map((i) => [i.id, i.correto])), (t += 1000));
  for (const campo of ["hipotese", "diferenciais", "janela", "conduta", "orientacoes"] as const) {
    s.decidir(campo, caso.decisoes[campo].filter((o) => o.correta).map((o) => o.id), (t += 1000));
  }
  s.encerrar((t += 1000));
  return s;
}

describe("casos embutidos", () => {
  it.each(CASOS_EMBUTIDOS.map((c) => [c.id, c]))("%s é válido e coerente", (_, c) => {
    expect(verificarReferencias(c)).toEqual([]);
    expect(validarCaso(JSON.parse(JSON.stringify(c))).ok).toBe(true);
  });

  it("rejeita caso importado com referência quebrada", () => {
    const quebrado = JSON.parse(JSON.stringify(avc));
    quebrado.checklist[6].criterio.fatos = ["fato_que_nao_existe"];
    const r = validarCaso(quebrado);
    expect(r.ok).toBe(false);
  });
});

describe("conversa", () => {
  it("responde só com fatos da ficha e reconhece a apresentação", () => {
    const i = interpretar(avc, "Bom dia, meu nome é Letícia, sou estudante de Medicina. O que trouxe o senhor ao hospital?");
    expect(i.intencoes).toContain("apresentacao");
    expect(i.fatos.map((f) => f.id)).toContain("queixa");
  });

  it("'Quando começou essa dor?' libera apenas o horário", () => {
    const i = interpretar(avc, "Quando começou essa dor?");
    expect(i.fatos[0].id).toBe("inicio_horario");
  });

  it("pergunta fora da ficha recebe 'não sei' e não pontua", () => {
    const s = new Sessao(avc, "osce");
    const r = s.perguntar("Qual é o seu signo do zodíaco?");
    expect(r.desconhecido).toBe(true);
    expect(avc.paciente.respostaDesconhecida).toContain(r.resposta);
  });

  it("pergunta composta libera cada tema perguntado", () => {
    const ids = interpretar(avc, "Teve dor de cabeça, vômito ou convulsão?").fatos.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["cefaleia", "vomito", "convulsao"]));
    const ids2 = interpretar(avc, "O senhor tem pressão alta, diabetes? Fuma?").fatos.map((f) => f.id);
    expect(ids2).toEqual(expect.arrayContaining(["has", "dm", "tabagismo"]));
  });

  it("'Já teve derrame?' é anamnese, não explicação diagnóstica", () => {
    const i = interpretar(avc, "Já teve derrame antes?");
    expect(i.fatos.map((f) => f.id)).toContain("avc_previo");
    expect(i.intencoes).not.toContain("explicacao");
  });
});

describe("avaliação", () => {
  it.each([avc, ferida].map((c) => [c.id, c]))("%s: roteiro completo marca toda a anamnese e comunicação", (_, caso) => {
    const a = avaliar(caso, sessaoPerfeita(caso).r);
    const falhas = a.itens.filter((i) => i.status !== "cumprido" && i.evidencia !== "manual").map((i) => i.item.id);
    expect(falhas).toEqual([]);
    expect(a.errosCriticos).toEqual([]);
  });

  it("item de avaliação humana nunca pontua sozinho", () => {
    const a = avaliar(avc, sessaoPerfeita().r);
    const empatia = a.itens.find((i) => i.item.id === "c_empatia")!;
    expect(empatia.status).toBe("pendente_revisao");
    expect(empatia.pontos).toBe(0);
    expect(a.pct).toBeLessThan(100);
  });

  it("revisão manual altera a nota e fica registrada", () => {
    const s = sessaoPerfeita();
    const a = avaliar(avc, s.r, {
      revisoes: [{ itemId: "c_empatia", status: "cumprido", pontos: 1, justificativa: "Avaliado pela dupla", data: "2026-11-19", anterior: { status: "pendente_revisao", pontos: 0 } }],
    });
    expect(a.pct).toBe(100);
    expect(a.itens.find((i) => i.item.id === "c_empatia")!.evidencia).toBe("manual");
  });

  it("técnica inadequada não conta como manobra realizada", () => {
    const s = new Sessao(avc, "osce", { agora: 0 });
    s.examinar("pa", "roupa", 1000);
    s.examinar("pulso", "radial10", 2000);
    s.examinar("sat", "oximetro", 3000);
    s.encerrar(4000);
    const a = avaliar(avc, s.r);
    expect(a.itens.find((i) => i.item.id === "e_sinais")!.status).toBe("nao_cumprido");
    expect(a.tecnicasInadequadas).toHaveLength(2);
  });

  it("higiene depois de tocar o paciente é sequência inadequada", () => {
    const s = new Sessao(avc, "osce", { agora: 0 });
    s.examinar("pa", "bilateral", 1000);
    s.higienizar(2000);
    s.encerrar(3000);
    expect(avaliar(avc, s.r).itens.find((i) => i.item.id === "s_higiene")!.status).toBe("sequencia_inadequada");
  });

  it("trombólise sem TC, sem glicemia e sem controle de PA gera erros críticos", () => {
    const s = new Sessao(avc, "osce", { agora: 0 });
    s.decidir("conduta", ["k_trombolise", "k_aas_imediato"], 1000);
    s.encerrar(2000);
    const ids = avaliar(avc, s.r).errosCriticos.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["ec_trombolise_sem_tc", "ec_trombolise_sem_glicemia", "ec_trombolise_pa", "ec_aas"]));
  });

  it("política 'zerar' anula a estação com erro crítico", () => {
    const s = sessaoPerfeita();
    s.decidir("conduta", ["k_anticoag"], Date.now());
    expect(avaliar(avc, s.r, { politicaErroCritico: "zerar" }).obtido).toBe(0);
  });

  it("ferida: anestesiar antes de testar a sensibilidade é erro crítico", () => {
    const s = new Sessao(ferida, "osce", { agora: 0 });
    s.examinar("anestesia", "lidocaina", 1000);
    s.examinar("sensibilidade", "territorios", 2000);
    s.encerrar(3000);
    expect(avaliar(ferida, s.r).errosCriticos.map((e) => e.id)).toContain("ec_anestesia_antes_neuro");
  });

  it("tempo por etapa soma a duração", () => {
    const a = avaliar(avc, sessaoPerfeita().r);
    const soma = Object.values(a.temposEtapaSeg).reduce((x, y) => x + y, 0);
    expect(Math.round(soma)).toBe(Math.round(a.duracaoSeg));
  });
});

describe("modo emergência", () => {
  it("sinais seguem a curva do caso e respondem às decisões", () => {
    const s = new Sessao(avc, "emergencia", { agora: 0 });
    expect(estadoClinico(avc, s.r, 0).sinais.paS).toBe(188);
    expect(estadoClinico(avc, s.r, 30).sinais.paS).toBe(192);
    s.r.eventos.push({ tipo: "decisao", t: 1, tc: 40, etapa: "decisao", campo: "conduta", opcoes: ["k_pa"] });
    const e = estadoClinico(avc, s.r, 55);
    expect(e.sinais.paS).toBe(176);
    expect(e.mensagens.some((m) => m.texto.includes("176"))).toBe(true);
  });

  it("TC consome relógio clínico e conta para a meta porta-TC", () => {
    const s = new Sessao(avc, "emergencia", { agora: 0 });
    s.examinar("glicemia", "lanceta", 60_000);
    s.solicitar("tc", 120_000);
    expect(s.relogioClinico(120_000)).toBeCloseTo(2 + 1 + 15, 5);
    s.encerrar(180_000);
    const metas = avaliar(avc, s.r).metasTempo;
    expect(metas.find((m) => m.id === "porta_tc")!.cumprida).toBe(true);
    expect(metas.find((m) => m.id === "porta_agulha")!.cumprida).toBe(false);
  });

  it("evento por tempo só ocorre se a ação não foi feita antes", () => {
    const s = new Sessao(avc, "emergencia", { agora: 0 });
    expect(estadoClinico(avc, s.r, 30).mensagens.some((m) => m.texto.includes("porta-TC"))).toBe(true);
    s.r.eventos.push({ tipo: "acao", t: 1, tc: 20, etapa: "exames", acao: "ex:tc", valida: true });
    expect(estadoClinico(avc, s.r, 30).mensagens.some((m) => m.texto.includes("porta-TC"))).toBe(false);
  });
});
