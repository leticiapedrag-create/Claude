import { CasoSchema, type Caso } from "@/lib/caso/schema";
import { casoAVC } from "./avc";
import { casoFerida } from "./ferida";

/** Casos que acompanham o aplicativo (validados no carregamento). */
export const CASOS_EMBUTIDOS: Caso[] = [casoAVC, casoFerida].map((c) => CasoSchema.parse(c));
