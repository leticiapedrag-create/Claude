import type { Sinais, Visual } from "@/lib/caso/schema";

export type PontoVista = "porta" | "sala" | "paciente" | "rosto" | "membro" | "pia" | "bandeja" | "monitor";

export type Equipamento =
  | "mao"
  | "esfigmo"
  | "oximetro"
  | "termometro"
  | "glicosimetro"
  | "lanterna"
  | "martelo"
  | "estetoscopio"
  | "monofilamento"
  | "bandeja";

export type AlvoInterativo = "paciente" | "pia" | "monitor" | Equipamento;

/**
 * Estado mutável compartilhado entre a interface e a cena 3D.
 * É lido a cada quadro (useFrame) sem provocar nova renderização do React.
 */
export interface EstadoCena {
  falando: boolean;
  /** Momento (performance.now) da última palavra falada — dá ritmo à boca. */
  pulsoFala: number;
  /** Fala estimada sem síntese de voz: anima a boca até este instante. */
  falandoAte: number;
  animacao: { tipo: Visual | null; inicio: number };
  dorAte: number;
  sinais: Sinais;
  monitorLigado: boolean;
  relogio: string;
  feridaExposta: boolean;
  emocao: "neutro" | "ansioso" | "dor" | "triste";
}

export function estadoInicialCena(sinais: Sinais, emocao: EstadoCena["emocao"]): EstadoCena {
  return {
    falando: false,
    pulsoFala: 0,
    falandoAte: 0,
    animacao: { tipo: null, inicio: 0 },
    dorAte: 0,
    sinais,
    monitorLigado: false,
    relogio: "",
    feridaExposta: false,
    emocao,
  };
}

/** Duração de cada animação clínica (ms). */
export const DURACAO_VISUAL: Record<Visual, number> = {
  pupilas_reativas: 5200,
  oculomotricidade: 6500,
  sorriso: 3500,
  bracos_estendidos: 9000,
  perna_estendida: 7000,
  ferida: 2500,
  respiracao: 4000,
};

/** Ponto de vista sugerido para observar cada achado. */
export const VISTA_DO_VISUAL: Record<Visual, PontoVista> = {
  pupilas_reativas: "rosto",
  oculomotricidade: "rosto",
  sorriso: "rosto",
  bracos_estendidos: "paciente",
  perna_estendida: "paciente",
  ferida: "membro",
  respiracao: "paciente",
};
