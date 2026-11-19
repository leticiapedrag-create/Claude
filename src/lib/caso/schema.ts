/**
 * Formato de um caso clínico / estação.
 * O mesmo schema valida os casos embutidos e os roteiros importados pelo aluno.
 */
import { z } from "zod";

export const COMPETENCIAS = [
  "comunicacao",
  "anamnese",
  "exame_fisico",
  "raciocinio",
  "conduta",
  "orientacoes",
  "seguranca",
] as const;
export type Competencia = (typeof COMPETENCIAS)[number];

export const NOME_COMPETENCIA: Record<Competencia, string> = {
  comunicacao: "Comunicação",
  anamnese: "Anamnese",
  exame_fisico: "Exame físico",
  raciocinio: "Raciocínio clínico",
  conduta: "Conduta",
  orientacoes: "Orientações",
  seguranca: "Segurança do paciente",
};

export const ETAPAS = ["abertura", "anamnese", "exame_fisico", "exames", "decisao", "orientacoes"] as const;
export type Etapa = (typeof ETAPAS)[number];
export const NOME_ETAPA: Record<Etapa, string> = {
  abertura: "Abertura",
  anamnese: "Anamnese",
  exame_fisico: "Exame físico",
  exames: "Exames complementares",
  decisao: "Hipóteses e conduta",
  orientacoes: "Orientações",
};

export const CENARIOS = ["consultorio", "pronto_atendimento", "emergencia", "procedimentos", "enfermaria"] as const;
export type Cenario = (typeof CENARIOS)[number];
export const NOME_CENARIO: Record<Cenario, string> = {
  consultorio: "Consultório",
  pronto_atendimento: "Pronto atendimento",
  emergencia: "Sala de emergência",
  procedimentos: "Sala de procedimentos",
  enfermaria: "Enfermaria",
};

/** Achados que o avatar 3D sabe representar visualmente. Os demais são mostrados como texto estruturado. */
export const VISUAIS = [
  "pupilas_reativas",
  "oculomotricidade",
  "sorriso",
  "bracos_estendidos",
  "perna_estendida",
  "ferida",
  "respiracao",
  "tremor",
] as const;
export type Visual = (typeof VISUAIS)[number];

const id = z.string().min(1).regex(/^[a-z0-9_:-]+$/i, "use letras, números, _ : -");

export const FatoSchema = z.object({
  id,
  tema: z.string(),
  categoria: z.enum(["identificacao", "hda", "antecedentes", "medicamentos", "habitos", "familia", "revisao", "contexto"]),
  /** Palavras/expressões que, presentes na pergunta, liberam este fato. Sem acento é opcional. */
  gatilhos: z.array(z.string().min(2)).min(1),
  resposta: z.string(),
});
export type Fato = z.infer<typeof FatoSchema>;

export const TecnicaSchema = z.object({
  id,
  descricao: z.string(),
  correta: z.boolean(),
  explicacao: z.string().optional(),
});

export const ManobraSchema = z.object({
  id,
  sistema: z.string(),
  nome: z.string(),
  /** Equipamento 3D associado (clicável na sala). */
  equipamento: z
    .enum(["mao", "esfigmo", "oximetro", "termometro", "glicosimetro", "lanterna", "martelo", "estetoscopio", "monofilamento", "bandeja"])
    .default("mao"),
  tecnicas: z.array(TecnicaSchema).min(1),
  achado: z.string(),
  /** Achado mostrado se a técnica escolhida for inadequada. */
  achadoTecnicaInadequada: z.string().optional(),
  visual: z.enum(VISUAIS).optional(),
  /** Paciente demonstra dor/desconforto ao realizar. */
  provocaDor: z.boolean().optional(),
});
export type Manobra = z.infer<typeof ManobraSchema>;

export const ExameSchema = z.object({
  id,
  nome: z.string(),
  categoria: z.enum(["laboratorio", "imagem", "cardiologico", "outros"]),
  resultado: z.string(),
  /** Minutos de relógio clínico consumidos no modo emergência até o resultado. */
  tempoMin: z.number().min(0).default(0),
  indicado: z.boolean().default(true),
  comentario: z.string().optional(),
});
export type Exame = z.infer<typeof ExameSchema>;

export const OpcaoSchema = z.object({
  id,
  texto: z.string(),
  correta: z.boolean(),
  explicacao: z.string().optional(),
});
export type Opcao = z.infer<typeof OpcaoSchema>;

export const CriterioSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("fatos"), fatos: z.array(z.string()).min(1), minimo: z.number().int().min(1).optional() }),
  z.object({ tipo: z.literal("intencao"), intencao: z.enum(["apresentacao", "identificacao", "consentimento", "explicacao", "duvidas"]) }),
  z.object({ tipo: z.literal("acao"), acoes: z.array(z.string()).min(1), minimo: z.number().int().min(1).optional() }),
  z.object({
    tipo: z.literal("decisao"),
    campo: z.enum(["hipotese", "diferenciais", "conduta", "orientacoes", "janela"]),
    opcoes: z.array(z.string()).min(1),
    minimo: z.number().int().min(1).optional(),
  }),
  /** Ação "antes" precisa ocorrer antes da primeira ação que case com "depois" (prefixo, ex.: "ef:"). */
  z.object({ tipo: z.literal("sequencia"), antes: z.string(), depois: z.string() }),
  z.object({ tipo: z.literal("nihss") }),
  z.object({ tipo: z.literal("manual") }),
]);
export type Criterio = z.infer<typeof CriterioSchema>;

export const ItemChecklistSchema = z.object({
  id,
  texto: z.string(),
  pontos: z.number().min(0),
  competencia: z.enum(COMPETENCIAS),
  etapa: z.enum(ETAPAS),
  criterio: CriterioSchema,
  /** Explicação mostrada no relatório quando o item não foi cumprido. */
  comoFazer: z.string().optional(),
});
export type ItemChecklist = z.infer<typeof ItemChecklistSchema>;

export const RegraErroCriticoSchema = z.discriminatedUnion("tipo", [
  /** Selecionar esta opção (hipótese/conduta/orientação) é erro crítico. */
  z.object({ tipo: z.literal("decisao_proibida"), opcao: z.string() }),
  /** Selecionar a opção sem ter realizado as ações/decisões pré-requisito. */
  z.object({ tipo: z.literal("decisao_sem_requisito"), opcao: z.string(), requer: z.array(z.string()).min(1) }),
  /** Encerrar sem ter liberado nenhum destes fatos. */
  z.object({ tipo: z.literal("omissao_fatos"), fatos: z.array(z.string()).min(1) }),
  /** Encerrar sem ter realizado nenhuma destas ações (com técnica adequada). */
  z.object({ tipo: z.literal("omissao_acoes"), acoes: z.array(z.string()).min(1) }),
  /** Executar a ação "depois" antes da ação "antes". */
  z.object({ tipo: z.literal("sequencia"), antes: z.string(), depois: z.string() }),
  /** Modo emergência: decisão tomada após o limite do relógio clínico (min desde a chegada). */
  z.object({ tipo: z.literal("decisao_apos_tempo"), opcao: z.string(), limiteMin: z.number() }),
]);

export const ErroCriticoSchema = z.object({
  id,
  texto: z.string(),
  explicacao: z.string(),
  competencia: z.enum(COMPETENCIAS).default("seguranca"),
  regra: RegraErroCriticoSchema,
});
export type ErroCritico = z.infer<typeof ErroCriticoSchema>;

const SinaisSchema = z.object({
  paS: z.number(),
  paD: z.number(),
  fc: z.number(),
  fr: z.number(),
  sat: z.number(),
  temp: z.number(),
  ritmo: z.string().default("regular"),
  glasgow: z.number().optional(),
});
export type Sinais = z.infer<typeof SinaisSchema>;

export const EvolucaoSchema = z.object({
  /** Minutos entre o início dos sintomas e a chegada (negativo = antes da chegada). */
  inicioSintomasMin: z.number(),
  /** Sinais vitais em função do tempo clínico (min desde a chegada), interpolados. */
  curva: z.array(z.object({ t: z.number(), sinais: SinaisSchema.partial() })).min(1),
  /** Efeitos disparados por decisões: alteram a curva a partir do momento da decisão. */
  efeitos: z.array(
    z.object({
      quando: z.string(), // id de ação ou decisão
      atrasoMin: z.number().default(0),
      sinais: SinaisSchema.partial().optional(),
      mensagem: z.string(),
      /** Só aplica se estes requisitos foram cumpridos antes. */
      requer: z.array(z.string()).optional(),
    }),
  ),
  /** Eventos que ocorrem no tempo se uma condição não for cumprida. */
  eventosTempo: z.array(
    z.object({ t: z.number(), seNaoFeito: z.array(z.string()).optional(), mensagem: z.string(), sinais: SinaisSchema.partial().optional() }),
  ),
  /** Metas de tempo de resposta (ex.: porta-TC). */
  metas: z.array(z.object({ id, nome: z.string(), acao: z.string(), limiteMin: z.number() })),
  /** Custo em minutos de relógio clínico por tipo de ação. */
  custo: z.object({ pergunta: z.number(), manobra: z.number() }).default({ pergunta: 0.5, manobra: 1 }),
});
export type Evolucao = z.infer<typeof EvolucaoSchema>;

export const AvatarSchema = z.object({
  sexo: z.enum(["M", "F"]),
  idadeAparente: z.number(),
  pele: z.string(),
  cabelo: z.string(),
  calvicie: z.boolean().default(false),
  roupa: z.string(),
  /** Achados representados no corpo. */
  paresiaFacial: z.enum(["nenhuma", "esquerda", "direita"]).default("nenhuma"),
  paresiaMembro: z.enum(["nenhuma", "esquerda", "direita"]).default("nenhuma"),
  ferida: z.enum(["nenhuma", "antebraco_esquerdo", "antebraco_direito"]).default("nenhuma"),
  /** Pupilas: diâmetro relativo e reatividade. */
  pupilas: z.object({ direita: z.number(), esquerda: z.number(), reativas: z.boolean() }).default({ direita: 1, esquerda: 1, reativas: true }),
  emocao: z.enum(["neutro", "ansioso", "dor", "triste"]).default("neutro"),
  /** Fala arrastada simulada na síntese de voz (mais lenta). */
  disartria: z.boolean().default(false),
  /** Tremor de repouso contínuo na mão (parkinsonismo). */
  tremorRepouso: z.enum(["nenhum", "direita", "esquerda"]).default("nenhum"),
  /** Pálpebras pesadas e pouca movimentação (pós-ictal, sedação). */
  sonolento: z.boolean().default(false),
  /** Face em máscara: menos piscadas e expressões. */
  hipomimia: z.boolean().default(false),
});
export type Avatar = z.infer<typeof AvatarSchema>;

export const NihssItemSchema = z.object({ id: z.string(), nome: z.string(), max: z.number(), correto: z.number(), achado: z.string() });

export const CasoSchema = z.object({
  id,
  versao: z.number().default(1),
  titulo: z.string(),
  area: z.enum(["clinica", "cirurgica"]),
  especialidade: z.string(),
  tema: z.string(),
  cenario: z.enum(CENARIOS),
  duracaoMin: z.number().min(1),
  aviso: z.string().default("Caso demonstrativo criado para treino. Não é uma estação oficial da instituição."),
  enunciado: z.string(),
  tarefas: z.array(z.string()).min(1),
  paciente: z.object({
    nome: z.string(),
    idade: z.number(),
    sexo: z.enum(["M", "F"]),
    profissao: z.string(),
    acompanhante: z.string().optional(),
    falaInicial: z.string(),
    /** Como o paciente responde ao que não está na ficha (nunca inventa). */
    respostaDesconhecida: z.array(z.string()).min(1),
    /** Reações quando o aluno explica o diagnóstico / pergunta dúvidas. */
    reacaoExplicacao: z.string(),
    reacaoDuvidas: z.string(),
    reacaoConsentimento: z.string().default("Pode sim, doutor(a)."),
    limitacoes: z.array(z.string()).default([]),
    personalidade: z.string().default(""),
  }),
  avatar: AvatarSchema,
  fatos: z.array(FatoSchema).min(1),
  sinaisVitais: SinaisSchema,
  manobras: z.array(ManobraSchema).min(1),
  exames: z.array(ExameSchema),
  nihss: z.array(NihssItemSchema).optional(),
  decisoes: z.object({
    hipotese: z.array(OpcaoSchema).min(2),
    diferenciais: z.array(OpcaoSchema).default([]),
    janela: z.array(OpcaoSchema).default([]),
    conduta: z.array(OpcaoSchema).min(2),
    orientacoes: z.array(OpcaoSchema).default([]),
  }),
  checklist: z.array(ItemChecklistSchema).min(1),
  errosCriticos: z.array(ErroCriticoSchema).default([]),
  evolucao: EvolucaoSchema.optional(),
  /** Ficha didática (para revisão e relatório). */
  ficha: z.object({
    hda: z.string(),
    antecedentes: z.string(),
    medicamentos: z.string(),
    achadosClinicos: z.string(),
    diagnostico: z.string(),
    diferenciais: z.array(z.object({ nome: z.string(), comoAfastar: z.string() })),
    conduta: z.string(),
    orientacoes: z.string(),
    sinaisAlerta: z.array(z.string()),
    sequenciaIdeal: z.array(z.string()),
    explicacoes: z.array(z.string()),
    macetes: z.array(z.string()),
    referencias: z.array(z.object({ citacao: z.string(), url: z.string().optional() })).min(1),
  }),
  dicas: z.partialRecord(z.enum(ETAPAS), z.array(z.string())).default({}),
  revisao: z
    .object({
      status: z.enum(["rascunho", "revisado_por_aluno", "revisado_por_docente"]),
      revisor: z.string().optional(),
      data: z.string().optional(),
      notas: z.string().optional(),
    })
    .default({ status: "rascunho" }),
});
export type Caso = z.infer<typeof CasoSchema>;
export type CasoEntrada = z.input<typeof CasoSchema>;

export function validarCaso(dado: unknown): { ok: true; caso: Caso } | { ok: false; erros: string[] } {
  const r = CasoSchema.safeParse(dado);
  if (!r.success) {
    return { ok: false, erros: r.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`) };
  }
  const erros = verificarReferencias(r.data);
  return erros.length ? { ok: false, erros } : { ok: true, caso: r.data };
}

/** Confere se os ids citados no checklist e nas regras existem no caso. */
export function verificarReferencias(c: Caso): string[] {
  const erros: string[] = [];
  const fatos = new Set(c.fatos.map((f) => f.id));
  const acoes = new Set<string>(["higiene", ...c.manobras.map((m) => `ef:${m.id}`), ...c.exames.map((e) => `ex:${e.id}`)]);
  const opcoes = new Set<string>(Object.values(c.decisoes).flat().map((o) => o.id));
  const existeAcao = (a: string) => a === "decisao" || acoes.has(a) || opcoes.has(a) || [...acoes].some((x) => x.startsWith(a));
  for (const item of c.checklist) {
    const cr = item.criterio;
    if (cr.tipo === "fatos") cr.fatos.forEach((f) => !fatos.has(f) && erros.push(`checklist ${item.id}: fato inexistente "${f}"`));
    if (cr.tipo === "acao") cr.acoes.forEach((a) => !existeAcao(a) && erros.push(`checklist ${item.id}: ação inexistente "${a}"`));
    if (cr.tipo === "decisao") {
      const campo = new Set(c.decisoes[cr.campo].map((o) => o.id));
      cr.opcoes.forEach((o) => !campo.has(o) && erros.push(`checklist ${item.id}: opção inexistente em ${cr.campo}: "${o}"`));
    }
    if (cr.tipo === "sequencia") [cr.antes, cr.depois].forEach((a) => !existeAcao(a) && erros.push(`checklist ${item.id}: ação inexistente "${a}"`));
    if (cr.tipo === "nihss" && !c.nihss?.length) erros.push(`checklist ${item.id}: caso sem escala NIHSS`);
  }
  for (const e of c.errosCriticos) {
    const r = e.regra;
    if ("opcao" in r && !opcoes.has(r.opcao)) erros.push(`erro crítico ${e.id}: opção inexistente "${r.opcao}"`);
    if (r.tipo === "decisao_sem_requisito") r.requer.forEach((a) => !existeAcao(a) && erros.push(`erro crítico ${e.id}: requisito inexistente "${a}"`));
    if (r.tipo === "omissao_fatos") r.fatos.forEach((f) => !fatos.has(f) && erros.push(`erro crítico ${e.id}: fato inexistente "${f}"`));
    if (r.tipo === "omissao_acoes" || r.tipo === "sequencia") ("acoes" in r ? r.acoes : [r.antes, r.depois]).forEach((a) => !existeAcao(a) && erros.push(`erro crítico ${e.id}: ação inexistente "${a}"`));
  }
  return erros;
}
