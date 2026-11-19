/**
 * Peças reutilizadas pelos casos: gatilhos de perguntas frequentes e itens
 * de checklist da abordagem inicial (apresentação, identificação, consentimento,
 * higiene, explicação e dúvidas), conforme o resumo de OSCE HAM V.
 */
import type { CasoEntrada } from "@/lib/caso/schema";

type Fato = CasoEntrada["fatos"][number];
type Item = CasoEntrada["checklist"][number];
type Manobra = CasoEntrada["manobras"][number];

export const G = {
  inicio: ["quando comec", "comecou quando", "ha quanto tempo", "faz quanto tempo", "desde quando", "quanto tempo", "inicio", "quando iniciou", "quando foi que", "comecou"],
  modoInicio: ["subit", "de repente", "gradual", "aos poucos", "progressiv", "de uma vez", "foi piorando", "como comecou"],
  local: ["onde", "local", "lugar", "localiza", "regiao", "aponta", "em que parte", "qual articulacao"],
  intensidade: ["intensidade", "nota", "0 a 10", "zero a dez", "de 0", "de zero", "escala", "quanto doi", "quao forte", "muito forte"],
  continua: ["continua", "intermitente", "o tempo todo", "vai e volta", "constante", "direto", "toda hora"],
  carater: ["pontada", "queimacao", "queima", "peso", "como e a dor", "tipo de dor", "tipo da dor", "como e essa dor", "latej", "aperto", "fisgada", "descreva"],
  fatores: ["melhora", "piora", "alivi", "agrava", "fator", "alguma coisa melhora", "algo melhora"],
  irradia: ["irradi", "espalha", "vai para", "vai pra", "desce", "outro lugar", "outra regiao", "outra parte"],
  trauma: ["trauma", "queda", "caiu", "bateu", "pancada", "acidente", "machuc", "torceu", "torcao", "esforco", "desencadeante"],
  febre: ["febre", "febril", "temperatura", "calafrio"],
  perdaPeso: ["perda de peso", "perdeu peso", "emagrec", "peso"],
  cancer: ["cancer", "tumor", "neoplasia", "caroco"],
  esfincter: ["urina", "xixi", "fezes", "evacu", "incontin", "controle", "bexiga", "escapa"],
  sela: ["genital", "regiao intima", "sela", "perineo", "anus", "partes intimas"],
  formigamento: ["formig", "dorm", "adormec", "choque", "sensibilidade"],
  fraqueza: ["fraqueza", "fraca", "fraco", "forca", "perdeu forca"],
  rigidez: ["rigidez", "rigido", "duro", "travad", "matinal", "de manha", "ao acordar"],
  alergias: ["alergi", "alergic", "tem alergia", "alergia a algum", "alergia a remedio", "alergia a medicamento", "alergico a", "alergica a"],
  medicamentos: ["remedio", "medicamento", "medicacao", "toma algum", "usa algum", "faz uso", "tratamento", "tomando algo"],
  comorbidades: ["doenca", "comorbidade", "problema de saude", "pressao alta", "hipertens", "diabet", "colesterol"],
  tabagismo: ["fuma", "fumo", "fumante", "fumou", "cigarro", "tabag"],
  etilismo: ["bebe ", "bebida", "alcool", "cerveja", "cachaca", "etilis"],
  drogas: ["droga", "maconha", "cocaina", "crack", "anfetamina", "substancia"],
  familia: ["famili", "pai ", "mae ", "irmao", "irma ", "parentes", "hereditar"],
  idade: ["idade", "quantos anos", "data de nascimento", "nasceu"],
  profissao: ["trabalha", "profiss", "ocupacao", "emprego", "o que o senhor faz", "o que a senhora faz", "o que voce faz", "servico"],
  funcional: ["dia a dia", "atividades", "limita", "consegue fazer", "trabalhar", "impacto", "atrapalha", "rotina", "qualidade de vida", "sozinho", "sozinha", "banho", "vestir"],
};

export function fato(id: string, tema: string, categoria: Fato["categoria"], gatilhos: string[], resposta: string): Fato {
  return { id, tema, categoria, gatilhos, resposta };
}

/** Fatos de identificação e hábitos comuns a quase todas as estações. */
export function fatosBasicos(p: { idade: string; profissao: string; alergias?: string; tabagismo?: string; etilismo?: string; drogas?: string; familia?: string }): Fato[] {
  return [
    fato("idade", "Idade", "identificacao", G.idade, p.idade),
    fato("profissao", "Profissão", "identificacao", G.profissao, p.profissao),
    fato("alergias", "Alergias", "medicamentos", G.alergias, p.alergias ?? "Não tenho alergia a nenhum remédio."),
    fato("tabagismo", "Tabagismo", "habitos", G.tabagismo, p.tabagismo ?? "Não fumo."),
    fato("etilismo", "Etilismo", "habitos", G.etilismo, p.etilismo ?? "Bebo pouco, só de vez em quando."),
    fato("drogas", "Drogas", "habitos", G.drogas, p.drogas ?? "Não uso nenhuma droga."),
    fato("familia", "História familiar", "familia", G.familia, p.familia ?? "Ninguém da família tem algo parecido, que eu saiba."),
  ];
}

/** Abordagem inicial: apresentação, identificação (nome completo e data de nascimento) e consentimento. */
export function itensAbertura(opts: { consentimento?: boolean } = {}): Item[] {
  const itens: Item[] = [
    { id: "c_apresenta", texto: "Apresenta-se (nome e função)", pontos: 0.5, competencia: "comunicacao", etapa: "abertura", criterio: { tipo: "intencao", intencao: "apresentacao" } },
    { id: "c_identifica", texto: "Confirma a identidade do paciente (nome completo)", pontos: 0.5, competencia: "seguranca", etapa: "abertura", criterio: { tipo: "intencao", intencao: "identificacao" } },
  ];
  if (opts.consentimento !== false)
    itens.push({ id: "c_consentimento", texto: "Explica o exame/procedimento e pede consentimento", pontos: 0.5, competencia: "comunicacao", etapa: "exame_fisico", criterio: { tipo: "intencao", intencao: "consentimento" } });
  return itens;
}

export function itemHigiene(): Item {
  return { id: "s_higiene", texto: "Higieniza as mãos antes de tocar o paciente", pontos: 0.5, competencia: "seguranca", etapa: "exame_fisico", criterio: { tipo: "sequencia", antes: "higiene", depois: "ef:" }, comoFazer: "Use a pia ou o álcool em gel antes da primeira manobra." };
}

export function itensFechamento(pontosExplica = 1): Item[] {
  return [
    { id: "o_explica", texto: "Explica o diagnóstico e o plano em linguagem acessível", pontos: pontosExplica, competencia: "orientacoes", etapa: "orientacoes", criterio: { tipo: "intencao", intencao: "explicacao" } },
    { id: "o_duvidas", texto: "Verifica se há dúvidas", pontos: 0.5, competencia: "comunicacao", etapa: "orientacoes", criterio: { tipo: "intencao", intencao: "duvidas" } },
    { id: "c_empatia", texto: "Escuta ativa, contato visual e linguagem empática", pontos: 0.5, competencia: "comunicacao", etapa: "orientacoes", criterio: { tipo: "manual" }, comoFazer: "Avaliado na revisão (por você ou por um colega)." },
  ];
}

/** Item de checklist ligado a fatos da anamnese. */
export function itemFatos(id: string, texto: string, fatos: string[], pontos = 1, minimo?: number, competencia: Item["competencia"] = "anamnese", comoFazer?: string): Item {
  return { id, texto, pontos, competencia, etapa: "anamnese", criterio: { tipo: "fatos", fatos, minimo }, comoFazer };
}

/** Item de checklist ligado a manobras do exame físico. */
export function itemManobras(id: string, texto: string, acoes: string[], pontos = 1, minimo?: number, comoFazer?: string): Item {
  return { id, texto, pontos, competencia: "exame_fisico", etapa: "exame_fisico", criterio: { tipo: "acao", acoes, minimo }, comoFazer };
}

export function itemDecisao(id: string, texto: string, campo: "hipotese" | "diferenciais" | "conduta" | "orientacoes", opcoes: string[], pontos = 1, minimo?: number, competencia?: Item["competencia"]): Item {
  const comp = competencia ?? (campo === "hipotese" || campo === "diferenciais" ? "raciocinio" : campo === "orientacoes" ? "orientacoes" : "conduta");
  return { id, texto, pontos, competencia: comp, etapa: campo === "orientacoes" ? "orientacoes" : "decisao", criterio: { tipo: "decisao", campo, opcoes, minimo } };
}

/** Manobra com uma técnica correta e, opcionalmente, uma inadequada. */
export function manobra(
  id: string,
  sistema: string,
  nome: string,
  correta: string,
  achado: string,
  extra: Partial<Manobra> & { errada?: string; explicacaoErro?: string } = {},
): Manobra {
  const { errada, explicacaoErro, ...resto } = extra;
  const tecnicas: Manobra["tecnicas"] = [{ id: "correta", descricao: correta, correta: true }];
  if (errada) tecnicas.push({ id: "inadequada", descricao: errada, correta: false, explicacao: explicacaoErro });
  return { id, sistema, nome, equipamento: "mao", tecnicas, achado, ...resto };
}

export const RESPOSTAS_DESCONHECIDAS = ["Isso eu não sei dizer, doutor(a).", "Não sei responder isso...", "Como assim? Não entendi a pergunta."];

export const AVISO_DEMONSTRATIVO = "Caso demonstrativo criado a partir do resumo de estudo do aluno. Não é uma estação oficial da instituição.";
