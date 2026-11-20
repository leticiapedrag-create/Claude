/**
 * Instrumentos da mesa cirúrgica. Áreas e funções seguem as aulas de
 * Centro Cirúrgico 1 ("Atos operatórios e instrumental cirúrgico"):
 * mesa em 6 partes — diérese, preensão, hemostasia, afastadores, especiais e síntese.
 * As fotos (recortadas, sem fundo) e seus créditos ficam em instrumentos-creditos.json.
 */
import creditos from "./instrumentos-creditos.json";

export type AreaMesa = "dierese" | "preensao" | "hemostasia" | "afastadores" | "especiais" | "sintese";

export const AREAS: { id: AreaMesa; nome: string; descricao: string }[] = [
  { id: "dierese", nome: "Diérese", descricao: "Cortar e separar tecidos: bisturi e tesouras." },
  { id: "preensao", nome: "Preensão", descricao: "Segurar tecidos e vísceras: pinças de dissecção e de vísceras." },
  { id: "hemostasia", nome: "Hemostasia", descricao: "Pinçar vasos: Kelly, Crile, Halstead (mosquito), Kocher." },
  { id: "afastadores", nome: "Afastadores", descricao: "Expor os planos: dinâmicos (manuais) e autoestáticos." },
  { id: "especiais", nome: "Especiais", descricao: "Uso restrito a certos tempos: Backhaus, Mixter e outros." },
  { id: "sintese", nome: "Síntese", descricao: "Aproximar os tecidos: porta-agulha e fios." },
];

export interface Credito {
  arquivo: string;
  autor: string;
  licenca: string;
  licencaUrl?: string;
  pagina: string;
}

export interface Instrumento {
  id: string;
  nome: string;
  area: AreaMesa;
  funcao: string;
  /** Como reconhecer na foto. */
  comoReconhecer: string;
  credito: Credito;
}

type Base = Omit<Instrumento, "credito">;

const BASE: Base[] = [
  { id: "bisturi", nome: "Cabo de bisturi", area: "dierese", funcao: "Incisão dos tecidos. Cabo nº 3 recebe lâminas pequenas (10 a 15); cabo nº 4, lâminas grandes (20 a 25).", comoReconhecer: "Cabo metálico plano, com encaixe para a lâmina na ponta." },
  { id: "metzenbaum", nome: "Tesoura de Metzenbaum", area: "dierese", funcao: "Dissecção delicada: pontas finas, parte cortante curta e haste longa, alcança o fundo de cavidades.", comoReconhecer: "Tesoura longa e fina, lâminas curtas em relação às hastes." },
  { id: "mayo_tesoura", nome: "Tesoura de Mayo", area: "dierese", funcao: "Tecidos resistentes (fáscia, músculo) e corte de fios.", comoReconhecer: "Tesoura robusta, lâminas largas e mais longas que na Metzenbaum." },
  { id: "anatomica", nome: "Pinça anatômica (dissecção)", area: "preensao", funcao: "Preensão de tecidos delicados durante a dissecção.", comoReconhecer: "Pinça de mola sem dentes, com ponta serrilhada." },
  { id: "allis", nome: "Pinça de Allis", area: "preensao", funcao: "Preensão de vísceras delicadas e escorregadias e de bordas de tecido.", comoReconhecer: "Argolas e cremalheira; ponta com pequenos dentes finos que se encaixam." },
  { id: "babcock", nome: "Pinça de Babcock", area: "preensao", funcao: "Preensão atraumática de vísceras ocas (alça intestinal, apêndice).", comoReconhecer: "Ponta larga e fenestrada, em forma de alça arredondada, sem dentes." },
  { id: "foerster", nome: "Pinça de Foerster", area: "preensao", funcao: "Preensão de vísceras; também usada para montar gaze.", comoReconhecer: "Pinça longa com argolas e ponta em anel oval fenestrado." },
  { id: "kelly", nome: "Pinça de Kelly", area: "hemostasia", funcao: "Pinçamento de vasos e fios grossos; ranhuras em 2/3 da parte preensora.", comoReconhecer: "Pinça hemostática média, reta ou curva, com cremalheira e ponta sem dentes." },
  { id: "kocher", nome: "Pinça de Kocher", area: "hemostasia", funcao: "Tração de tecido fibroso (aponeurose) e hemostasia temporária; tem dente de rato na ponta.", comoReconhecer: "Pinça hemostática robusta com dente na extremidade." },
  { id: "volkmann", nome: "Afastador de Volkmann", area: "afastadores", funcao: "Afastador dinâmico com garras, para planos musculares.", comoReconhecer: "Cabo com ponta em forma de garfo (garras curvas)." },
  { id: "autoestatico", nome: "Afastador autoestático (Gelpi/Weitlaner)", area: "afastadores", funcao: "Afastador autoestático: depois de aberto, mantém-se sem tração manual. Útil em incisões pequenas.", comoReconhecer: "Argolas com cremalheira e pontas com garras que se abrem lateralmente." },
  { id: "backhaus", nome: "Pinça de Backhaus", area: "especiais", funcao: "Fixação dos campos cirúrgicos; traumática para tecidos.", comoReconhecer: "Pinça curta com pontas curvas e agudas que se cruzam." },
  { id: "mixter", nome: "Pinça de Mixter", area: "especiais", funcao: "Passa-fio ao redor de vasos e estruturas tubulares; dissecção de estruturas de difícil acesso.", comoReconhecer: "Ponta angulada em ângulo reto (forma de J)." },
  { id: "porta_agulha", nome: "Porta-agulha de Mayo-Hegar", area: "sintese", funcao: "Segura a agulha na mão dominante durante a sutura.", comoReconhecer: "Argolas e cremalheira; ponta curta, grossa e serrilhada." },
];

const CREDITOS = creditos as Record<string, Credito>;

/** Só entram no jogo os instrumentos que têm foto. */
export const INSTRUMENTOS: Instrumento[] = BASE.filter((b) => CREDITOS[b.id]).map((b) => ({ ...b, credito: CREDITOS[b.id] }));

export function imagemInstrumento(id: string) {
  const base = process.env.NEXT_PUBLIC_ARTEFATO ? "" : "/";
  return `${base}instrumentos/${id}.webp`;
}
