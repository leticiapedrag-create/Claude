/**
 * Evolução clínica do modo emergência. Tudo é determinado pelas regras do caso
 * (curva de sinais vitais, efeitos de decisões e eventos por tempo) — nada é sorteado.
 */
import type { Caso, Sinais } from "../caso/schema";
import type { RegistroSessao } from "./sessao";

export interface EstadoClinico {
  tc: number;
  sinais: Sinais;
  mensagens: { tc: number; texto: string }[];
  minutosDesdeInicio: number;
}

function interpolar(caso: Caso, tc: number): Sinais {
  const base = { ...caso.sinaisVitais };
  const curva = caso.evolucao?.curva ?? [];
  if (!curva.length) return base;
  const ordenada = [...curva].sort((a, b) => a.t - b.t);
  let ant = ordenada[0];
  let prox = ordenada[ordenada.length - 1];
  for (const p of ordenada) {
    if (p.t <= tc) ant = p;
    if (p.t >= tc) { prox = p; break; }
  }
  const out: Sinais = { ...base };
  const chaves = ["paS", "paD", "fc", "fr", "sat", "temp", "glasgow"] as const;
  for (const k of chaves) {
    const a = ant.sinais[k] ?? base[k];
    const b = prox.sinais[k] ?? a;
    if (a === undefined || b === undefined) continue;
    const f = prox.t === ant.t ? 0 : Math.min(1, Math.max(0, (tc - ant.t) / (prox.t - ant.t)));
    out[k] = Math.round((a + (b - a) * f) * 10) / 10;
  }
  out.ritmo = ant.sinais.ritmo ?? base.ritmo;
  return out;
}

/** Momento (relógio clínico) em que cada ação/decisão foi feita pela primeira vez. */
export function momentos(r: RegistroSessao) {
  const m = new Map<string, number>();
  for (const e of r.eventos) {
    if (e.tipo === "acao" && e.valida && !m.has(e.acao)) m.set(e.acao, e.tc);
    if (e.tipo === "decisao") for (const o of e.opcoes) if (!m.has(o)) m.set(o, e.tc);
  }
  return m;
}

export function estadoClinico(caso: Caso, r: RegistroSessao, tc: number): EstadoClinico {
  const ev = caso.evolucao;
  let sinais = interpolar(caso, tc);
  const mensagens: EstadoClinico["mensagens"] = [];
  if (!ev) return { tc, sinais, mensagens, minutosDesdeInicio: tc };
  const feitos = momentos(r);
  const feitoAntes = (id: string, t: number) => {
    const x = feitos.get(id) ?? [...feitos.entries()].find(([k]) => id.endsWith(":") && k.startsWith(id))?.[1];
    return x !== undefined && x <= t;
  };

  const aplicaveis: { t: number; sinais?: Partial<Sinais>; texto: string }[] = [];
  for (const e of ev.eventosTempo) {
    if (tc < e.t) continue;
    if (e.seNaoFeito && e.seNaoFeito.some((id) => feitoAntes(id, e.t))) continue;
    aplicaveis.push({ t: e.t, sinais: e.sinais, texto: e.mensagem });
  }
  for (const e of ev.efeitos) {
    const t0 = feitos.get(e.quando);
    if (t0 === undefined) continue;
    const t = t0 + e.atrasoMin;
    if (tc < t) continue;
    if (e.requer && !e.requer.every((req) => feitoAntes(req, t0))) continue;
    aplicaveis.push({ t, sinais: e.sinais, texto: e.mensagem });
  }
  aplicaveis.sort((a, b) => a.t - b.t);
  for (const a of aplicaveis) {
    if (a.sinais) sinais = { ...sinais, ...a.sinais };
    mensagens.push({ tc: a.t, texto: a.texto });
  }
  return { tc, sinais, mensagens, minutosDesdeInicio: tc - ev.inicioSintomasMin };
}

export function formatarRelogio(min: number) {
  const total = Math.max(0, Math.floor(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}
