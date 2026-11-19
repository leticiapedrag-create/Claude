/** Verificações aplicadas a TODOS os casos da biblioteca. */
import { describe, expect, it } from "vitest";
import { CASOS_EMBUTIDOS } from "@/data/casos";
import { verificarReferencias } from "@/lib/caso/schema";
import { interpretar, normalizar } from "@/lib/engine/conversa";
import { Sessao } from "@/lib/engine/sessao";
import { avaliar } from "@/lib/engine/avaliacao";

/** Uma pergunta que libera o fato: a primeira expressão-gatilho que o motor associa a ele. */
function perguntaPara(caso: (typeof CASOS_EMBUTIDOS)[number], fatoId: string) {
  const f = caso.fatos.find((x) => x.id === fatoId)!;
  return f.gatilhos.find((g) => interpretar(caso, normalizar(g).trim() + "?").fatos.some((x) => x.id === fatoId));
}

describe.each(CASOS_EMBUTIDOS.map((c) => [c.id, c] as const))("%s", (_, caso) => {
  it("tem referências internas válidas", () => {
    expect(verificarReferencias(caso)).toEqual([]);
  });

  it("cada informação da ficha pode ser obtida por alguma pergunta", () => {
    const inalcancaveis = caso.fatos.filter((f) => !perguntaPara(caso, f.id)).map((f) => f.id);
    expect(inalcancaveis).toEqual([]);
  });

  it("ids de fatos, manobras e exames são únicos", () => {
    for (const lista of [caso.fatos, caso.manobras, caso.exames, caso.checklist]) {
      const ids = lista.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("um atendimento completo cumpre todos os itens verificáveis, sem erros críticos", () => {
    const s = new Sessao(caso, "osce", { agora: 0 });
    let t = 0;
    const p = (txt: string) => s.perguntar(txt, "texto", (t += 1000));
    p("Bom dia, meu nome é Letícia, sou estudante de medicina. Qual o seu nome completo?");
    for (const f of caso.fatos) p(perguntaPara(caso, f.id)! + "?");
    p("Vou te examinar, posso?");
    s.higienizar((t += 1000));
    for (const m of caso.manobras) s.examinar(m.id, m.tecnicas.find((x) => x.correta)!.id, (t += 1000));
    for (const e of caso.exames.filter((x) => x.indicado)) s.solicitar(e.id, (t += 1000));
    if (caso.nihss) s.registrarNihss(Object.fromEntries(caso.nihss.map((i) => [i.id, i.correto])), (t += 1000));
    for (const campo of ["hipotese", "diferenciais", "janela", "conduta", "orientacoes"] as const) {
      const certas = caso.decisoes[campo].filter((o) => o.correta).map((o) => o.id);
      if (certas.length) s.decidir(campo, campo === "hipotese" || campo === "janela" ? certas.slice(0, 1) : certas, (t += 1000));
    }
    p("Vou explicar o diagnóstico e o tratamento.");
    p("Ficou alguma dúvida?");
    s.encerrar((t += 1000));
    const a = avaliar(caso, s.r);
    const falhas = a.itens.filter((i) => i.status !== "cumprido" && i.item.criterio.tipo !== "manual").map((i) => i.item.id);
    expect(falhas).toEqual([]);
    expect(a.errosCriticos.map((e) => e.id)).toEqual([]);
  });
});

it("a biblioteca cobre os temas do resumo de HAM V", () => {
  const temas = CASOS_EMBUTIDOS.map((c) => c.tema);
  for (const t of ["Psicose", "Segurança do paciente", "Lombalgia", "Cervicalgia", "Joelho", "Ombro", "Cotovelo", "Transtorno neurológico funcional", "AVC", "Crise convulsiva", "Parkinson e cuidados paliativos", "Manejo do paciente com tendência suicida", "Meningite e punção lombar", "Otoscopia", "Vertigem", "Fundoscopia e diabetes", "Distúrbios tireoidianos"])
    expect(temas).toContain(t);
});
