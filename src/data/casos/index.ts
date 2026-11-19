import { CasoSchema, type Caso, type CasoEntrada } from "@/lib/caso/schema";
import { casoAVC } from "./avc";
import { casoFerida } from "./ferida";
import { casoLombalgia, casoCervicalgia } from "./coluna";
import { casoJoelho, casoGota, casoAquiles } from "./articulacoes";
import { casoOmbro, casoCotovelo } from "./membro-superior";
import { casoFuncional, casoConvulsao, casoParkinson, casoMeningite } from "./neuro";
import { casoOtite, casoVertigem, casoFundoscopia, casoTireoide } from "./sentidos-endocrino";
import { casoPsicose, casoSuicidio, casoQuedas } from "./mental-seguranca";
import { casoAgitado, casoEncefalopatia, casoCAD, casoAutomedicacao } from "./clinica-extra";
import { casoNR32, casoParamentacao, casoAntissepsia, casoInstrumentacao, casoAnestesiaLocal, casoSuturaContinua, casoHemostasia } from "./cirurgica-a";
import { casoFeridaPO, casoIOT, casoLPP, casoPuncaoVenosa, casoAbscesso, casoDorPO, casoCirurgiaSegura, casoTCLE } from "./cirurgica-b";

const clinica = (c: CasoEntrada, ...numeros: number[]): CasoEntrada => ({ ...c, programa: numeros.map((numero) => ({ bloco: "clinica" as const, numero })) });

/**
 * Casos que acompanham o aplicativo (validados no carregamento), na ordem da
 * lista de assuntos do 5º período (HAM 5 Práticas): bloco 1 clínica, bloco 2 cirúrgica.
 */
export const CASOS_EMBUTIDOS: Caso[] = [
  clinica(casoPsicose, 1),
  clinica(casoQuedas, 2),
  clinica(casoLombalgia, 3),
  clinica(casoCervicalgia, 3),
  clinica(casoJoelho, 4),
  clinica(casoGota, 4),
  clinica(casoAquiles, 4),
  clinica(casoOmbro, 5),
  clinica(casoCotovelo, 4),
  clinica(casoFuncional, 6),
  clinica(casoAVC, 7),
  casoAgitado, // 08
  clinica(casoConvulsao, 9),
  clinica(casoParkinson, 10),
  clinica(casoSuicidio, 11),
  casoEncefalopatia, // 12
  clinica(casoMeningite, 12),
  clinica(casoOtite, 13),
  clinica(casoVertigem, 13),
  casoCAD, // 14
  clinica(casoFundoscopia, 14),
  clinica(casoTireoide, 15),
  casoAutomedicacao, // 16
  casoNR32,
  casoParamentacao,
  casoAntissepsia,
  casoInstrumentacao,
  casoAnestesiaLocal,
  { ...casoFerida, programa: [{ bloco: "cirurgica", numero: 6 }] },
  casoSuturaContinua,
  casoHemostasia,
  casoFeridaPO,
  casoIOT,
  casoLPP,
  casoPuncaoVenosa,
  casoAbscesso,
  casoDorPO,
  casoCirurgiaSegura,
  casoTCLE,
].map((c) => CasoSchema.parse(c));
