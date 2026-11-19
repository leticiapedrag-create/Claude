import { CasoSchema, type Caso } from "@/lib/caso/schema";
import { casoAVC } from "./avc";
import { casoFerida } from "./ferida";
import { casoLombalgia, casoCervicalgia } from "./coluna";
import { casoJoelho, casoGota, casoAquiles } from "./articulacoes";
import { casoOmbro, casoCotovelo } from "./membro-superior";
import { casoFuncional, casoConvulsao, casoParkinson, casoMeningite } from "./neuro";
import { casoOtite, casoVertigem, casoFundoscopia, casoTireoide } from "./sentidos-endocrino";
import { casoPsicose, casoSuicidio, casoQuedas } from "./mental-seguranca";

/**
 * Casos que acompanham o aplicativo (validados no carregamento), na ordem das
 * semanas do resumo de OSCE HAM V.
 */
export const CASOS_EMBUTIDOS: Caso[] = [
  casoPsicose, // semana 02
  casoQuedas, // semana 03
  casoLombalgia, // semana 04
  casoCervicalgia, // semana 04
  casoJoelho, // semana 05
  casoGota, // semana 05
  casoAquiles, // semana 05
  casoOmbro, // semana 06
  casoCotovelo, // semana 06
  casoFuncional, // semana 07
  casoAVC, // semana 08
  casoConvulsao, // semana 10
  casoParkinson, // semana 11
  casoSuicidio, // semana 12
  casoMeningite, // semana 14
  casoOtite, // semana 15
  casoVertigem, // semana 15
  casoFundoscopia, // semana 16
  casoTireoide, // semana 17
  casoFerida, // cirúrgica: feridas e sutura
].map((c) => CasoSchema.parse(c));
