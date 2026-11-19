/**
 * Interpretação determinística das falas do aluno.
 * O paciente só responde com fatos da ficha do caso; o que não estiver
 * na ficha recebe uma resposta de "não sei", nunca um dado inventado.
 */
import type { Caso, Fato } from "../caso/schema";

export type Intencao = "saudacao" | "apresentacao" | "identificacao" | "consentimento" | "explicacao" | "duvidas";

export function normalizar(texto: string): string {
  return (
    " " +
    String(texto ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim() +
    " "
  );
}

/** Palavra-chave terminada em espaço exige palavra inteira ("oi " não casa com "oito"). */
function prepararGatilho(g: string): string {
  return normalizar(g).trim() + (/\s$/.test(g) ? " " : "");
}

function pontuar(gatilhos: string[], textoNorm: string): number {
  let s = 0;
  for (const g of gatilhos) {
    if (g && textoNorm.includes(" " + g)) s += g.trim().length;
  }
  return s;
}

export const GATILHOS_INTENCAO: Record<Intencao, string[]> = {
  saudacao: ["bom dia", "boa tarde", "boa noite", "ola ", "oi ", "tudo bem", "como vai"],
  apresentacao: [
    "meu nome", "me chamo", "sou o dr", "sou a dr", "sou o doutor", "sou a doutora", "sou doutor", "sou doutora",
    "sou o medico", "sou a medica", "sou medico", "sou medica", "sou o estudante", "sou a estudante", "sou estudante",
    "estudante de medicina", "sou o interno", "sou a interna", "sou interno", "sou interna", "sou academic",
    "sou o academico", "sou a academica", "sou o residente", "sou a residente", "vou te atender", "vou atender o senhor",
    "vou atender a senhora", "vou fazer o seu atendimento", "vou fazer seu atendimento", "responsavel pelo seu atendimento",
  ],
  identificacao: [
    "seu nome", "qual o nome", "qual e o nome", "como se chama", "como o senhor se chama", "como a senhora se chama",
    "como voce se chama", "nome do senhor", "nome da senhora", "nome completo", "como posso te chamar",
    "como posso chamar", "como prefere ser chamad", "confirmar seu nome", "confirmar o nome", "confirmar o seu nome",
  ],
  consentimento: [
    "posso examinar", "posso te examinar", "posso fazer o exame", "vou examinar", "vou te examinar", "vou fazer o exame",
    "vou fazer um exame", "permissao", "com licenca", "me permite", "o senhor permite", "a senhora permite", "autoriza",
  ],
  explicacao: [
    "diagnostico", "suspeit", "hipotese", "provavelmente", "vou explicar", "vou te explicar", "deixa eu explicar",
    "explicar o que", "o que o senhor tem", "o que a senhora tem", "o que voce tem", "o seu quadro", "seu quadro",
    "isso se chama", "o senhor teve um", "a senhora teve um", "o senhor esta tendo", "a senhora esta tendo",
    "vamos tratar", "o tratamento", "vamos fazer o", "vamos precisar", "vai precisar", "remedio para desentupir",
    "derrame", "acidente vascular",
  ],
  duvidas: [
    "alguma duvida", "tem duvida", "ficou duvida", "ficou com duvida", "ficou alguma", "duvidas", "alguma pergunta",
    "quer perguntar", "deseja perguntar", "gostaria de perguntar", "ficou claro", "conseguiu entender", "quer saber mais",
  ],
};

const INTENCOES_PREP = Object.fromEntries(
  Object.entries(GATILHOS_INTENCAO).map(([k, v]) => [k, v.map(prepararGatilho)]),
) as Record<Intencao, string[]>;

const cacheFatos = new WeakMap<Caso, { fato: Fato; gatilhos: string[] }[]>();
function fatosPreparados(caso: Caso) {
  let p = cacheFatos.get(caso);
  if (!p) {
    p = caso.fatos.map((fato) => ({ fato, gatilhos: fato.gatilhos.map(prepararGatilho) }));
    cacheFatos.set(caso, p);
  }
  return p;
}

export interface Interpretacao {
  fatos: Fato[];
  intencoes: Intencao[];
}

function melhoresFatos(caso: Caso, trecho: string): Fato[] {
  const t = normalizar(trecho);
  const candidatos = fatosPreparados(caso)
    .map((p) => ({ fato: p.fato, score: pontuar(p.gatilhos, t) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!candidatos.length) return [];
  const melhor = candidatos[0].score;
  return candidatos.filter((c) => c.score >= melhor * 0.75).slice(0, 3).map((c) => c.fato);
}

/**
 * Perguntas compostas ("Teve dor de cabeça, vômito ou convulsão?") são divididas em
 * trechos; cada trecho libera o fato que melhor responde a ele.
 */
export function dividirPergunta(pergunta: string): string[] {
  const partes = pergunta
    .split(/[?;!]|,|\s(?:ou|e|nem)\s/i)
    .map((p) => p.trim())
    .filter((p) => normalizar(p).trim().length >= 3);
  return partes.length ? partes : [pergunta];
}

export function interpretar(caso: Caso, pergunta: string): Interpretacao {
  const fatos: Fato[] = [];
  const adicionar = (f: Fato) => {
    if (fatos.length < 4 && !fatos.some((x) => x.id === f.id || x.resposta === f.resposta)) fatos.push(f);
  };
  // A pergunta inteira primeiro (expressões longas têm prioridade), depois cada trecho.
  melhoresFatos(caso, pergunta).forEach(adicionar);
  const trechos = dividirPergunta(pergunta);
  if (trechos.length > 1) for (const tr of trechos) melhoresFatos(caso, tr).slice(0, 1).forEach(adicionar);

  const t = normalizar(pergunta);
  const intencoes = (Object.keys(INTENCOES_PREP) as Intencao[]).filter((i) => pontuar(INTENCOES_PREP[i], t) > 0);
  // "explicação" só vale se o aluno não está fazendo uma pergunta de anamnese sobre o mesmo tema.
  const filtradas = intencoes.filter((i) => !(i === "explicacao" && fatos.length > 0 && /\?\s*$/.test(pergunta.trim())));
  return { fatos, intencoes: filtradas };
}

/** Monta a resposta do paciente estritamente a partir da ficha. */
export function responder(caso: Caso, interp: Interpretacao, indiceDesconhecida = 0): string {
  const partes: string[] = [];
  const p = caso.paciente;
  if (interp.intencoes.includes("saudacao") || interp.intencoes.includes("apresentacao")) {
    partes.push(interp.intencoes.includes("apresentacao") ? "Muito prazer, doutor(a)." : "Oi, doutor(a).");
  }
  if (interp.intencoes.includes("identificacao") && !interp.fatos.some((f) => f.categoria === "identificacao")) {
    partes.push(`Meu nome é ${p.nome}.`);
  }
  for (const f of interp.fatos) partes.push(f.resposta);
  if (interp.intencoes.includes("consentimento")) partes.push(p.reacaoConsentimento);
  if (interp.intencoes.includes("explicacao")) partes.push(p.reacaoExplicacao);
  if (interp.intencoes.includes("duvidas")) partes.push(p.reacaoDuvidas);
  if (!partes.length) return p.respostaDesconhecida[indiceDesconhecida % p.respostaDesconhecida.length];
  return partes.join(" ");
}
