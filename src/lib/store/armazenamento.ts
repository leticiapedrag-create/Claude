/**
 * Persistência local (localStorage). Tudo fica no navegador do aluno.
 * Nenhuma nota é gerada sem uma simulação realizada.
 */
import { CasoSchema, type Caso } from "@/lib/caso/schema";
import type { RevisaoManual } from "@/lib/engine/avaliacao";
import type { RegistroSessao } from "@/lib/engine/sessao";
import { CONFIG_PADRAO, type ConfigProva } from "./config";
import { CASOS_EMBUTIDOS } from "@/data/casos";

const K = {
  tentativas: "osce.v2.tentativas",
  config: "osce.v2.config",
  casos: "osce.v2.casos",
  emAndamento: "osce.v2.em-andamento",
};

export interface Tentativa {
  registro: RegistroSessao;
  /** Cópia do caso usado (para recalcular a nota mesmo se o caso for editado depois). */
  caso: Caso;
  revisoes: RevisaoManual[];
  /** Histórico de alterações manuais (inclui revisões desfeitas). */
  historicoRevisoes: RevisaoManual[];
}

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    window.dispatchEvent(new CustomEvent("osce-store", { detail: chave }));
  } catch {
    /* armazenamento indisponível (aba privada, cota) */
  }
}

export const armazenamento = {
  config(): ConfigProva {
    return { ...CONFIG_PADRAO, ...ler<Partial<ConfigProva>>(K.config, {}) };
  },
  salvarConfig(c: ConfigProva) {
    gravar(K.config, c);
  },

  casosPersonalizados(): Caso[] {
    return ler<unknown[]>(K.casos, []).flatMap((c) => {
      const r = CasoSchema.safeParse(c);
      return r.success ? [r.data] : [];
    });
  },
  /** Embutidos + personalizados (um personalizado com o mesmo id substitui o embutido). */
  todosCasos(): Caso[] {
    const pers = this.casosPersonalizados();
    const ids = new Set(pers.map((c) => c.id));
    return [...CASOS_EMBUTIDOS.filter((c) => !ids.has(c.id)), ...pers];
  },
  caso(id: string): Caso | undefined {
    return this.todosCasos().find((c) => c.id === id);
  },
  salvarCaso(c: Caso) {
    const lista = this.casosPersonalizados().filter((x) => x.id !== c.id);
    gravar(K.casos, [...lista, c]);
  },
  removerCasoPersonalizado(id: string) {
    gravar(K.casos, this.casosPersonalizados().filter((x) => x.id !== id));
  },
  ehPersonalizado(id: string) {
    return this.casosPersonalizados().some((c) => c.id === id);
  },

  tentativas(): Tentativa[] {
    return ler<Tentativa[]>(K.tentativas, []);
  },
  tentativa(id: string) {
    return this.tentativas().find((t) => t.registro.id === id);
  },
  salvarTentativa(t: Tentativa) {
    const lista = this.tentativas().filter((x) => x.registro.id !== t.registro.id);
    gravar(K.tentativas, [...lista, t].slice(-300));
  },
  removerTentativa(id: string) {
    gravar(K.tentativas, this.tentativas().filter((x) => x.registro.id !== id));
  },
  limparTentativas() {
    gravar(K.tentativas, []);
  },
  exportarTudo() {
    return JSON.stringify({ versao: 2, exportadoEm: new Date().toISOString(), config: this.config(), casos: this.casosPersonalizados(), tentativas: this.tentativas() }, null, 2);
  },
};
