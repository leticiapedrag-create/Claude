/** Programa de HAM 5 — práticas (assuntos e níveis de prova). */
export type Bloco = "clinica" | "cirurgica";
export type Nivel = "N1" | "N2" | "N3";

export const ASSUNTOS: Record<Bloco, string[]> = {
  clinica: [
    "Entrevista em Saúde Mental",
    "Segurança do Paciente",
    "Exame do Paciente com Dor",
    "Exame do Paciente com Artropatia",
    "Exame do Ombro no Idoso",
    "Manejo de Desordens Neurológicas Não Orgânicas",
    "Avaliação do Quadro Neurológico Isquêmico Agudo",
    "Manejo do Paciente Agitado e Agressivo",
    "Avaliação da Crise Epiléptica no Pronto Atendimento",
    "Síndrome Extrapiramidal (Parkinson) e Cuidados Paliativos",
    "Manejo do Paciente com Tendência Suicida",
    "Coleta de Líquor em Paciente com Encefalopatia",
    "Técnica de Otoscopia e Interpretação",
    "Avaliação do Paciente Diabético no Pronto Atendimento",
    "Avaliação do Paciente com Distúrbio Tireoidiano",
    "Distúrbios Hipotálamo-Hipofisários e Automedicação",
  ],
  cirurgica: [
    "NR 32 e Normas de Biossegurança",
    "Escovação, Paramentação e Desparamentação",
    "Antissepsia e Campos Cirúrgicos",
    "Instrumentação Cirúrgica",
    "Técnica de Anestesia Local",
    "Manuseio de Instrumental e Sutura Interrompida",
    "Sutura Contínua",
    "Modalidades de Hemostasia",
    "Cuidados com Ferida Pós-operatória",
    "Manejo da Via Aérea e Intubação Orotraqueal",
    "Cuidados com Lesões por Pressão",
    "Punção Venosa Periférica e Coleta de Sangue",
    "Tratamento do Abscesso Cutâneo",
    "Manejo da Dor Pós-operatória",
    "Protocolo de Cirurgia Segura",
    "TCLE e Revisão de Procedimentos",
  ],
};

/** N1: 01–07; N2: 01–12 (inclui a N1); N3: 13–16. */
export const FAIXA: Record<Nivel, [number, number]> = { N1: [1, 7], N2: [1, 12], N3: [13, 16] };

export function nivelDoAssunto(numero: number): Nivel[] {
  return (Object.keys(FAIXA) as Nivel[]).filter((n) => numero >= FAIXA[n][0] && numero <= FAIXA[n][1]);
}

export function rotuloAssunto(bloco: Bloco, numero: number) {
  return `${bloco === "clinica" ? "Clínica" : "Cirúrgica"} ${String(numero).padStart(2, "0")}`;
}

type ComPrograma = { id: string; area: Bloco; programa: { bloco: Bloco; numero: number }[] };

/** O caso pertence ao nível (algum assunto do seu bloco está na faixa do nível). */
export function casoNoNivel(caso: ComPrograma, nivel: Nivel) {
  const [de, ate] = FAIXA[nivel];
  return caso.programa.some((p) => p.bloco === caso.area && p.numero >= de && p.numero <= ate);
}

/**
 * Sorteia um simulado: `porBloco` estações de cada bloco, de assuntos distintos,
 * entre os casos do nível. `aleatorio` permite testes determinísticos.
 */
export function sortearSimulado<T extends ComPrograma>(casos: T[], nivel: Nivel, porBloco = 3, aleatorio: () => number = Math.random): T[] {
  const escolhidos: T[] = [];
  for (const bloco of ["clinica", "cirurgica"] as Bloco[]) {
    const candidatos = casos.filter((c) => c.area === bloco && casoNoNivel(c, nivel));
    const embaralhados = [...candidatos];
    for (let i = embaralhados.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
    }
    const assuntos = new Set<number>();
    for (const c of embaralhados) {
      if (escolhidos.filter((e) => e.area === bloco).length >= porBloco) break;
      const numero = c.programa.find((p) => p.bloco === bloco)?.numero ?? 0;
      if (assuntos.has(numero)) continue;
      assuntos.add(numero);
      escolhidos.push(c);
    }
  }
  return escolhidos;
}
