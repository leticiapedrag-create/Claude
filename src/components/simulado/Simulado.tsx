"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, ClipboardList, Play, Target, Trash2 } from "lucide-react";
import { useArmazenamento } from "@/hooks/useArmazenamento";
import { armazenamento, type Simulado as TSimulado, type Tentativa } from "@/lib/store/armazenamento";
import { valorDaEstacao, type ConfigProva } from "@/lib/store/config";
import { avaliar, projetarNaProva } from "@/lib/engine/avaliacao";
import { ASSUNTOS, FAIXA, rotuloAssunto, type Nivel } from "@/lib/programa";
import type { Caso } from "@/lib/caso/schema";
import { BotaoConfirmar } from "@/components/ui/BotaoConfirmar";

const NIVEIS: Nivel[] = ["N1", "N2", "N3"];
export const DESCRICAO_NIVEL: Record<Nivel, string> = {
  N1: "Assuntos 01 a 07",
  N2: "Assuntos 01 a 12 (inclui a N1)",
  N3: "Assuntos 13 a 16",
};

/** Resultado consolidado de um simulado (só com estações realmente feitas). */
export function resultadoSimulado(sim: TSimulado, casos: Caso[], tentativas: Tentativa[], config: ConfigProva) {
  const estacoes = sim.casos.map((id) => {
    const caso = casos.find((c) => c.id === id);
    const t = tentativas.find((x) => x.registro.id === sim.tentativas[id]);
    const a = t ? avaliar(t.caso, t.registro, { revisoes: t.revisoes, politicaErroCritico: config.politicaErroCritico }) : null;
    const { valor, suposicao } = valorDaEstacao(config, id);
    return { id, caso, tentativa: t, avaliacao: a, valor, suposicao, pontos: a ? projetarNaProva(a.pct, valor) : null };
  });
  const feitas = estacoes.filter((e) => e.pontos !== null);
  const total = feitas.reduce((s, e) => s + (e.pontos ?? 0), 0);
  const maximo = estacoes.reduce((s, e) => s + e.valor, 0);
  const proxima = estacoes.find((e) => !e.tentativa && e.caso);
  return { estacoes, feitas: feitas.length, total, maximo, proxima, suposicao: estacoes.some((e) => e.suposicao) };
}

export function iniciarSimulado(nivel: Nivel, navegar: (url: string) => void) {
  const sim = armazenamento.criarSimulado(nivel);
  if (!sim) return false;
  navegar(`/simulacao?caso=${sim.casos[0]}&modo=osce&simulado=${sim.id}`);
  return true;
}

export function EscolherNivel() {
  const router = useRouter();
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {NIVEIS.map((n) => (
        <button key={n} className="cartao flex items-center gap-3 p-4 text-left transition hover:border-accent" onClick={() => iniciarSimulado(n, (u) => router.push(u))} data-testid={`simulado-${n}`}>
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-base font-bold text-white dark:bg-accent dark:text-accent-contrast">{n}</span>
          <span>
            <span className="block font-semibold">Simulado {n}</span>
            <span className="block text-xs text-muted">{DESCRICAO_NIVEL[n]} · 3 clínicas + 3 cirúrgicas</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Simulado() {
  const id = useSearchParams().get("id");
  const { pronto, simulados, casos, tentativas, config } = useArmazenamento();
  if (!pronto) return <p className="text-muted">Carregando…</p>;
  const sim = id ? simulados.find((s) => s.id === id) : undefined;
  if (id && !sim) return <div className="cartao p-6">Simulado não encontrado. <Link className="font-semibold text-accent" href="/simulado">Ver simulados</Link></div>;

  if (sim) {
    const r = resultadoSimulado(sim, casos, tentativas, config);
    const completo = r.feitas === sim.casos.length;
    const atingiu = r.total >= config.meta;
    return (
      <div className="space-y-5" data-testid="simulado">
        <section className="cartao p-5">
          <p className="rotulo">Simulado {sim.nivel} · {DESCRICAO_NIVEL[sim.nivel]} · {new Date(sim.criadoEm).toLocaleDateString("pt-BR")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{completo ? "Resultado do simulado" : `Estação ${r.feitas + 1} de ${sim.casos.length}`}</h1>
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p><span className="text-3xl font-bold tabular-nums" data-testid="simulado-total">{r.total.toFixed(2)}</span> <span className="text-muted">de {r.maximo.toFixed(2)} pts{completo ? "" : ` (${r.feitas} de ${sim.casos.length} estações feitas)`}</span></p>
            <p className={`text-sm font-semibold ${completo ? (atingiu ? "text-ok" : "text-danger") : "text-muted"}`}>
              Meta: {config.meta} pts{completo ? (atingiu ? " — atingida" : ` — faltaram ${(config.meta - r.total).toFixed(2)} pts`) : ""}
            </p>
          </div>
          {r.suposicao && <p className="mt-2 text-xs text-muted">Valor de cada estação suposto ({config.pontuacaoTotal} ÷ {config.numeroEstacoes}), sem checklist oficial. Ajuste em Configurações. A nota vem do checklist demonstrativo e não equivale à avaliação dos professores.</p>}
          {r.proxima && (
            <Link className="botao-primario mt-4" href={`/simulacao?caso=${r.proxima.id}&modo=osce&simulado=${sim.id}`}><Play size={16} /> {r.feitas ? "Próxima estação" : "Começar"}</Link>
          )}
        </section>
        <ol className="space-y-2">
          {r.estacoes.map((e, i) => {
            const p = e.caso?.programa.find((x) => x.bloco === e.caso?.area);
            return (
              <li key={e.id} className="cartao flex flex-wrap items-center gap-3 p-4">
                {e.tentativa ? <CheckCircle2 size={20} className="text-ok" /> : <Circle size={20} className="text-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="rotulo">Estação {i + 1}{p ? ` · ${rotuloAssunto(p.bloco, p.numero)} · ${ASSUNTOS[p.bloco][p.numero - 1]}` : ""}</p>
                  <p className="font-semibold">{e.caso?.titulo ?? "Caso removido"}</p>
                </div>
                {e.avaliacao ? (
                  <>
                    <span className="text-sm tabular-nums"><strong>{e.pontos!.toFixed(2)}</strong> / {e.valor.toFixed(2)} pts · {e.avaliacao.pct}%{e.avaliacao.errosCriticos.length ? <span className="text-danger"> · {e.avaliacao.errosCriticos.length} erro(s) crítico(s)</span> : null}</span>
                    <Link className="botao" href={`/relatorio?id=${e.tentativa!.registro.id}`}><ClipboardList size={16} /> Relatório</Link>
                  </>
                ) : (
                  <span className="text-sm text-muted">Não realizada</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const lista = [...simulados].reverse();
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Simulado de prova</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Sorteia 3 estações clínicas e 3 cirúrgicas, de assuntos diferentes, entre os assuntos do nível escolhido (N1: {FAIXA.N1.join("–")}; N2: {FAIXA.N2.join("–")}; N3: {FAIXA.N3.join("–")}). Todas no modo OSCE, em sequência, e a nota é somada na escala da prova ({config.pontuacaoTotal} pontos, meta {config.meta}).
        </p>
      </section>
      <EscolherNivel />
      <section>
        <h2 className="mb-3 text-lg font-bold">Simulados anteriores</h2>
        {lista.length === 0 ? (
          <p className="cartao p-4 text-sm text-muted">Nenhum simulado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((s) => {
              const r = resultadoSimulado(s, casos, tentativas, config);
              return (
                <li key={s.id} className="cartao flex flex-wrap items-center gap-3 p-4">
                  <Target size={18} className="text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Simulado {s.nivel} · {new Date(s.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                    <p className="text-xs text-muted">{r.feitas} de {s.casos.length} estações · {r.total.toFixed(2)} de {r.maximo.toFixed(2)} pts</p>
                  </div>
                  <Link className="botao" href={`/simulado?id=${s.id}`}>{r.feitas === s.casos.length ? "Ver resultado" : "Continuar"}</Link>
                  <BotaoConfirmar className="botao px-2.5" pergunta="Excluir?" aria-label="Excluir simulado" onConfirmar={() => armazenamento.removerSimulado(s.id)}><Trash2 size={16} /></BotaoConfirmar>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
