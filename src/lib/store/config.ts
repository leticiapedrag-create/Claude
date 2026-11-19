export interface ConfigProva {
  nomeProva: string;
  pontuacaoTotal: number;
  meta: number;
  numeroEstacoes: number;
  estacoesClinicas: number;
  estacoesCirurgicas: number;
  /** Valor da estação na prova, por caso. Ausente = ainda não informado pelo aluno. */
  valorEstacao: Record<string, number>;
  /** Tempo da estação em minutos, por caso (sobrepõe o padrão do caso). */
  tempoEstacao: Record<string, number>;
  politicaErroCritico: "sinalizar" | "zerar";
  escalaClinica: number;
  vozPaciente: boolean;
  iaHabilitada: boolean;
  tema: "sistema" | "claro" | "escuro";
  /** Qualidade gráfica do ambiente 3D (iPads antigos: "economia"). */
  qualidade: "alta" | "equilibrada" | "economia";
}

export const CONFIG_PADRAO: ConfigProva = {
  nomeProva: "OSCE HAM V",
  pontuacaoTotal: 55,
  meta: 31.4,
  numeroEstacoes: 6,
  estacoesClinicas: 3,
  estacoesCirurgicas: 3,
  valorEstacao: {},
  tempoEstacao: {},
  politicaErroCritico: "sinalizar",
  escalaClinica: 1,
  vozPaciente: true,
  iaHabilitada: false,
  tema: "sistema",
  qualidade: "equilibrada",
};

/**
 * Valor da estação usado na projeção. Sem checklist oficial, usa a divisão igual
 * (pontuação total ÷ número de estações) e marca a projeção como suposição.
 */
export function valorDaEstacao(cfg: ConfigProva, casoId: string): { valor: number; suposicao: boolean } {
  const v = cfg.valorEstacao[casoId];
  if (typeof v === "number" && v > 0) return { valor: v, suposicao: false };
  return { valor: cfg.pontuacaoTotal / Math.max(1, cfg.numeroEstacoes), suposicao: true };
}
