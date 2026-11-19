"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertOctagon, CheckCircle2, CircleDashed, Clock, FileDown, ListChecks, Pencil, Play, RotateCcw, Target, TriangleAlert, XCircle } from "lucide-react";
import { COMPETENCIAS, ETAPAS, NOME_COMPETENCIA, NOME_ETAPA, NOME_CENARIO } from "@/lib/caso/schema";
import { avaliar, projetarNaProva, type Evidencia, type ResultadoItem, type RevisaoManual, type StatusItem } from "@/lib/engine/avaliacao";
import { itensParaTreinar, linhaDoTempo, planoDeRevisao } from "@/lib/engine/relatorio";
import { formatarRelogio } from "@/lib/engine/emergencia";
import { armazenamento } from "@/lib/store/armazenamento";
import { valorDaEstacao } from "@/lib/store/config";
import { resultadoSimulado } from "@/components/simulado/Simulado";
import { useArmazenamento } from "@/hooks/useArmazenamento";
import { RadarCompetencias } from "@/components/graficos/Graficos";
import { NO_ARTEFATO } from "@/lib/plataforma";

const NOME_STATUS: Record<StatusItem, string> = { cumprido: "Cumprido", nao_cumprido: "Não cumprido", sequencia_inadequada: "Fora de sequência", pendente_revisao: "Aguarda revisão" };
const NOME_EVIDENCIA: Record<Evidencia, string> = { interface: "ação na tela", texto: "fala verificada", ia: "interpretação de IA", manual: "revisão manual", nenhuma: "sem evidência" };
const NOME_MODO = { aprendizado: "Aprendizado", osce: "OSCE", emergencia: "Emergência" };

function IconeStatus({ s }: { s: StatusItem }) {
  if (s === "cumprido") return <CheckCircle2 size={17} className="shrink-0 text-ok" aria-label="Cumprido" />;
  if (s === "sequencia_inadequada") return <TriangleAlert size={17} className="shrink-0 text-warn" aria-label="Fora de sequência" />;
  if (s === "pendente_revisao") return <CircleDashed size={17} className="shrink-0 text-muted" aria-label="Aguarda revisão" />;
  return <XCircle size={17} className="shrink-0 text-danger" aria-label="Não cumprido" />;
}

export default function Relatorio() {
  const id = useSearchParams().get("id") ?? "";
  const { pronto, config, tentativas, simulados, casos } = useArmazenamento();
  const t = tentativas.find((x) => x.registro.id === id);
  const [editando, setEditando] = useState<string | null>(null);

  const a = useMemo(() => (t ? avaliar(t.caso, t.registro, { revisoes: t.revisoes, politicaErroCritico: config.politicaErroCritico }) : null), [t, config.politicaErroCritico]);
  if (!pronto) return <p className="text-muted">Carregando…</p>;
  if (!t || !a) return <div className="cartao p-6">Relatório não encontrado. <Link className="font-semibold text-accent" href="/painel">Ver histórico</Link></div>;

  const caso = t.caso;
  const r = t.registro;
  const { valor, suposicao } = valorDaEstacao(config, caso.id);
  const projetado = projetarNaProva(a.pct, valor);
  const erros = itensParaTreinar(a);
  const plano = planoDeRevisao(caso, a);
  const linha = linhaDoTempo(caso, r);
  const radar = COMPETENCIAS.filter((c) => a.porCompetencia[c].maximo > 0).map((c) => ({ nome: NOME_COMPETENCIA[c], pct: Math.round((a.porCompetencia[c].obtido / a.porCompetencia[c].maximo) * 100) }));
  const perdidos = a.itens.filter((i) => i.pontos < i.item.pontos);

  const salvarRevisao = (it: ResultadoItem, status: StatusItem, pontos: number, justificativa: string) => {
    const rev: RevisaoManual = { itemId: it.item.id, status, pontos, justificativa, data: new Date().toISOString(), anterior: { status: it.status, pontos: it.pontos } };
    armazenamento.salvarTentativa({ ...t, revisoes: [...t.revisoes.filter((x) => x.itemId !== it.item.id), rev], historicoRevisoes: [...t.historicoRevisoes, rev] });
    setEditando(null);
  };

  const simulado = simulados.find((x) => Object.values(x.tentativas).includes(r.id));
  const resSim = simulado ? resultadoSimulado(simulado, casos, tentativas, config) : null;

  return (
    <article className="space-y-5" data-testid="relatorio">
      {simulado && resSim && (
        <section className="nao-imprimir cartao flex flex-wrap items-center gap-3 border-accent/40 p-4" data-testid="faixa-simulado">
          <ListChecks size={20} className="text-accent" />
          <p className="min-w-0 flex-1 text-sm">
            <strong>Simulado {simulado.nivel}</strong> · {resSim.feitas} de {simulado.casos.length} estações · {resSim.total.toFixed(2)} de {resSim.maximo.toFixed(2)} pts até agora
          </p>
          {resSim.proxima ? (
            <Link className="botao-primario" href={`/simulacao?caso=${resSim.proxima.id}&modo=osce&simulado=${simulado.id}`}><Play size={16} /> Próxima estação</Link>
          ) : (
            <Link className="botao-primario" href={`/simulado?id=${simulado.id}`}>Ver resultado do simulado</Link>
          )}
        </section>
      )}
      {/* cabeçalho */}
      <section className="cartao overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--series-1) ${a.pct * 3.6}deg, var(--surface-2) 0)` }}>
            <div className="grid size-22 place-items-center rounded-full bg-surface text-center">
              <div><p className="text-2xl font-bold tabular-nums" data-testid="nota-pct">{a.pct}%</p><p className="text-[11px] text-muted">{a.obtido}/{a.maximo} pts</p></div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="rotulo">{caso.area === "clinica" ? "Clínica" : "Clínica cirúrgica"} · {caso.especialidade} · {NOME_CENARIO[caso.cenario]}</p>
            <h1 className="text-2xl font-bold tracking-tight">{caso.titulo}</h1>
            <p className="mt-1 text-sm text-muted">
              Modo {NOME_MODO[r.modo]} · {new Date(r.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · <Clock size={13} className="inline" /> {formatarRelogio(a.duracaoSeg / 60).replace("h", "h ")}min{r.tempoEsgotado ? " (tempo esgotado)" : ""}
            </p>
            <p className="mt-2 text-sm">
              Na prova ({config.nomeProva}): <strong>{projetado.toFixed(2)} de {valor.toFixed(2)} pts</strong>
              {suposicao && <span className="text-muted"> — valor da estação suposto ({config.pontuacaoTotal} ÷ {config.numeroEstacoes}); ajuste em Configurações quando tiver o checklist oficial.</span>}
            </p>
          </div>
          <div className="nao-imprimir flex flex-wrap gap-2 sm:flex-col">
            <Link className="botao-primario" href={`/simulacao?caso=${caso.id}&modo=${r.modo}`}><RotateCcw size={16} /> Refazer estação</Link>
            <Link className={`botao ${erros.length ? "" : "pointer-events-none opacity-50"}`} href={`/simulacao?caso=${caso.id}&modo=aprendizado&foco=${erros.join(",")}`}><Target size={16} /> Treinar apenas meus erros</Link>
            {!NO_ARTEFATO && <button className="botao" onClick={() => window.print()}><FileDown size={16} /> Exportar PDF</button>}
          </div>
        </div>
        <p className="border-t border-line bg-surface-2 px-5 py-2 text-xs text-muted">
          Nota estimada pelo simulador a partir de evidências registradas. Não equivale à avaliação de professores. {a.pendentes > 0 && <strong className="text-ink">{a.pendentes} item(ns) aguardam revisão manual e ainda não pontuam.</strong>}
        </p>
      </section>

      {(a.errosCriticos.length > 0 || a.zeradaPorErroCritico) && (
        <section className="cartao border-danger/40 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold text-danger"><AlertOctagon size={18} /> Erros críticos</h2>
          {a.zeradaPorErroCritico && <p className="mb-2 text-sm font-semibold text-danger">Pela política configurada, a estação foi zerada.</p>}
          <ul className="space-y-2 text-sm">{a.errosCriticos.map((e) => <li key={e.id}><strong>{e.texto}.</strong> <span className="text-muted">{e.explicacao}</span></li>)}</ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao p-5">
          <h2 className="font-bold">Competências nesta estação</h2>
          <p className="text-xs text-muted">Percentual dos pontos de cada competência.</p>
          <RadarCompetencias dados={radar} />
          <table className="w-full text-sm">
            <tbody>{radar.map((x) => <tr key={x.nome} className="border-t border-line"><td className="py-1">{x.nome}</td><td className="text-right tabular-nums">{x.pct}%</td></tr>)}</tbody>
          </table>
        </section>
        <section className="cartao p-5">
          <h2 className="font-bold">Tempo por etapa</h2>
          <p className="mb-3 text-xs text-muted">Estimado pelo intervalo entre suas ações registradas.</p>
          <ul className="space-y-2">
            {ETAPAS.filter((e) => a.temposEtapaSeg[e] > 0.5).map((e) => (
              <li key={e}>
                <div className="flex justify-between text-sm"><span>{NOME_ETAPA[e]}</span><span className="tabular-nums text-muted">{Math.floor(a.temposEtapaSeg[e] / 60)}min {Math.round(a.temposEtapaSeg[e] % 60)}s</span></div>
                <div className="mt-1 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full" style={{ width: `${(a.temposEtapaSeg[e] / Math.max(1, a.duracaoSeg)) * 100}%`, background: "var(--series-1)" }} /></div>
              </li>
            ))}
          </ul>
          {a.metasTempo.length > 0 && (
            <>
              <h3 className="mt-5 font-semibold">Tempos de resposta (relógio clínico)</h3>
              <table className="mt-1 w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th>Meta</th><th>Limite</th><th>Você</th><th /></tr></thead>
                <tbody>{a.metasTempo.map((m) => <tr key={m.id} className="border-t border-line"><td className="py-1">{m.nome}</td><td>{m.limiteMin} min</td><td className="tabular-nums">{m.realizadoEmMin === null ? "não realizado" : `${Math.round(m.realizadoEmMin)} min`}</td><td>{m.cumprida ? <CheckCircle2 size={16} className="text-ok" /> : <XCircle size={16} className="text-danger" />}</td></tr>)}</tbody>
              </table>
            </>
          )}
        </section>
      </div>

      {/* checklist */}
      <section className="cartao p-5">
        <h2 className="font-bold">Checklist detalhado</h2>
        <p className="mb-3 text-xs text-muted">Cada item mostra a origem da evidência. Itens de interpretação de IA ou de avaliação humana só pontuam após revisão manual.</p>
        {ETAPAS.map((etapa) => {
          const itens = a.itens.filter((i) => i.item.etapa === etapa);
          if (!itens.length) return null;
          return (
            <div key={etapa} className="mb-4">
              <p className="rotulo mb-1">{NOME_ETAPA[etapa]}</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {itens.map((it) => (
                  <li key={it.item.id} className="px-3 py-2.5 text-sm" data-item={it.item.id} data-status={it.status}>
                    <div className="flex items-start gap-2">
                      <IconeStatus s={it.status} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{it.item.texto}</p>
                        <p className="text-xs text-muted">
                          {NOME_STATUS[it.status]} · {NOME_EVIDENCIA[it.evidencia]} · {it.detalhe}
                          {it.revisado && <> · revisado: “{it.revisado.justificativa}”</>}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums font-semibold">{it.pontos}/{it.item.pontos}</span>
                      <button className="nao-imprimir rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setEditando(editando === it.item.id ? null : it.item.id)} aria-label="Revisar item manualmente"><Pencil size={14} /></button>
                    </div>
                    {editando === it.item.id && <FormRevisao it={it} onSalvar={salvarRevisao} onCancelar={() => setEditando(null)} />}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {t.historicoRevisoes.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-semibold">Histórico de alterações manuais ({t.historicoRevisoes.length})</summary>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {t.historicoRevisoes.map((h, i) => (
                <li key={i}>{new Date(h.data).toLocaleString("pt-BR")} — {caso.checklist.find((c) => c.id === h.itemId)?.texto}: {NOME_STATUS[h.anterior.status]} ({h.anterior.pontos}) → {NOME_STATUS[h.status]} ({h.pontos}). “{h.justificativa}”</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {(a.decisoesInadequadas.length > 0 || a.tecnicasInadequadas.length > 0) && (
        <section className="cartao p-5">
          <h2 className="mb-2 font-bold">Escolhas inadequadas</h2>
          <ul className="space-y-1.5 text-sm">
            {a.decisoesInadequadas.map((d, i) => <li key={i}><XCircle size={14} className="mr-1 inline text-danger" /><strong>{d.texto}</strong>{d.explicacao && <span className="text-muted"> — {d.explicacao}</span>}</li>)}
            {a.tecnicasInadequadas.map((d, i) => <li key={"t" + i}><TriangleAlert size={14} className="mr-1 inline text-warn" />Técnica inadequada em <strong>{d.manobra}</strong>: <span className="text-muted">{d.tecnica}</span></li>)}
          </ul>
        </section>
      )}

      {perdidos.length > 0 && (
        <section className="cartao p-5">
          <h2 className="mb-2 font-bold">O que deveria ter sido feito</h2>
          <ul className="space-y-2 text-sm">
            {perdidos.map((i) => <li key={i.item.id}><strong>{i.item.texto}</strong> <span className="text-muted">(−{i.item.pontos - i.pontos} pt){i.item.comoFazer ? ` — ${i.item.comoFazer}` : ""}</span></li>)}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao p-5">
          <h2 className="mb-2 font-bold">Sequência ideal</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">{caso.ficha.sequenciaIdeal.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
        <section className="cartao p-5">
          <h2 className="mb-2 font-bold">Sua sequência</h2>
          <ol className="max-h-80 space-y-1 overflow-y-auto text-sm">
            {linha.map((p, i) => <li key={i} className="flex gap-2"><span className="w-12 shrink-0 tabular-nums text-muted">{Math.floor(p.t / 60000)}:{String(Math.floor((p.t % 60000) / 1000)).padStart(2, "0")}</span><span>{p.texto}</span></li>)}
            {!linha.length && <li className="text-muted">Nenhuma ação registrada.</li>}
          </ol>
        </section>
      </div>

      <section className="cartao p-5">
        <h2 className="mb-2 font-bold">Explicação clínica</h2>
        <p className="text-sm"><strong>Diagnóstico:</strong> {caso.ficha.diagnostico}</p>
        <p className="mt-2 text-sm font-semibold">Diferenciais e como afastar</p>
        <ul className="list-disc pl-5 text-sm">{caso.ficha.diferenciais.map((d) => <li key={d.nome}><strong>{d.nome}:</strong> {d.comoAfastar}</li>)}</ul>
        <p className="mt-2 text-sm"><strong>Conduta:</strong> {caso.ficha.conduta}</p>
        <ul className="mt-2 list-disc pl-5 text-sm">{caso.ficha.explicacoes.map((e) => <li key={e}>{e}</li>)}</ul>
        <p className="mt-2 text-sm font-semibold">Sinais de alerta</p>
        <ul className="list-disc pl-5 text-sm">{caso.ficha.sinaisAlerta.map((e) => <li key={e}>{e}</li>)}</ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao p-5">
          <h2 className="mb-2 font-bold">Macetes de memorização</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{caso.ficha.macetes.map((m) => <li key={m}>{m}</li>)}</ul>
        </section>
        <section className="cartao p-5">
          <h2 className="mb-2 font-bold">Plano de revisão</h2>
          {plano.length === 0 ? <p className="text-sm text-muted">Nenhuma competência abaixo de 80% nesta estação.</p> : (
            <ol className="space-y-3 text-sm">
              {plano.map((p) => (
                <li key={p.competencia}>
                  <p className="font-semibold">{p.nome} — {p.pct}%</p>
                  <p className="text-muted">{p.sugestao}</p>
                  {p.itens.length > 0 && <ul className="mt-1 list-disc pl-5">{p.itens.map((i) => <li key={i.texto}>{i.texto}</li>)}</ul>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="cartao p-5">
        <h2 className="mb-2 font-bold">Referências</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">{caso.ficha.referencias.map((ref) => <li key={ref.citacao}>{ref.citacao}{ref.url && <> — <a className="text-accent underline" href={ref.url} target="_blank" rel="noreferrer">link</a></>}</li>)}</ul>
        <p className="mt-2 text-xs text-muted">Status de revisão do conteúdo: {caso.revisao.status.replaceAll("_", " ")}. {caso.aviso}</p>
      </section>

      <details className="cartao p-5">
        <summary className="cursor-pointer font-bold">Transcrição completa</summary>
        <ul className="mt-3 space-y-1 text-sm">
          {r.eventos.filter((e) => e.tipo !== "nihss").map((e, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-12 shrink-0 tabular-nums text-muted">{Math.floor(e.t / 60000)}:{String(Math.floor((e.t % 60000) / 1000)).padStart(2, "0")}</span>
              <span>
                {e.tipo === "fala_aluno" && <><strong>Você:</strong> {e.texto}</>}
                {e.tipo === "fala_paciente" && <><strong>Paciente{e.origem === "ia" ? " (IA)" : ""}:</strong> {e.texto}</>}
                {e.tipo === "acao" && <span className="text-muted">[{e.acao}{e.valida ? "" : " — técnica inadequada"}] {e.resultado ?? ""}</span>}
                {e.tipo === "decisao" && <span className="text-muted">[decisão: {e.campo}] {e.opcoes.map((o) => Object.values(caso.decisoes).flat().find((x) => x.id === o)?.texto ?? o).join("; ")}</span>}
                {(e.tipo === "sistema" || e.tipo === "dica") && <span className="text-muted">{e.tipo === "dica" ? "Dica: " : ""}{e.texto}</span>}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function FormRevisao({ it, onSalvar, onCancelar }: { it: ResultadoItem; onSalvar: (it: ResultadoItem, s: StatusItem, p: number, j: string) => void; onCancelar: () => void }) {
  const [status, setStatus] = useState<StatusItem>(it.status === "pendente_revisao" ? "cumprido" : it.status);
  const [pontos, setPontos] = useState(it.status === "pendente_revisao" ? it.item.pontos : it.pontos);
  const [just, setJust] = useState("");
  return (
    <div className="mt-2 grid gap-2 rounded-xl bg-surface-2 p-3 sm:grid-cols-[1fr_auto_auto]">
      <input value={just} onChange={(e) => setJust(e.target.value)} placeholder="Justificativa (obrigatória)" className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm" />
      <select value={status} onChange={(e) => { const s = e.target.value as StatusItem; setStatus(s); setPontos(s === "cumprido" ? it.item.pontos : 0); }} className="rounded-lg border border-line bg-surface px-2 py-2 text-sm">
        {(["cumprido", "nao_cumprido", "sequencia_inadequada"] as StatusItem[]).map((s) => <option key={s} value={s}>{NOME_STATUS[s]}</option>)}
      </select>
      <div className="flex items-center gap-2">
        <input type="number" min={0} max={it.item.pontos} step={0.25} value={pontos} onChange={(e) => setPontos(Math.max(0, Math.min(it.item.pontos, Number(e.target.value))))} className="w-20 rounded-lg border border-line bg-surface px-2 py-2 text-sm" aria-label="Pontos" />
        <button className="botao-primario" disabled={just.trim().length < 3} onClick={() => onSalvar(it, status, pontos, just.trim())}>Salvar</button>
        <button className="botao" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
