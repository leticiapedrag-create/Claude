"use client";
/** Painéis de ação sobrepostos ao ambiente 3D. */
import { useMemo, useState } from "react";
import { Box, Check, CheckCircle2, ClipboardCheck, Eye, FlaskConical, Mic, MicOff, RotateCcw, Send, Sparkles, Stethoscope, TriangleAlert, X } from "lucide-react";
import type { Caso, Manobra, Opcao } from "@/lib/caso/schema";
import type { CampoDecisao, Evento, Sessao } from "@/lib/engine/sessao";
import { decisoesFinais, ultimoNihss } from "@/lib/engine/sessao";
import type { Equipamento } from "../three/tipos";

export function embaralhar<T>(lista: T[], semente: string): T[] {
  let h = 0;
  for (const c of semente) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------------ conversa
export function PainelConversa(props: {
  sessao: Sessao;
  versao: number;
  onEnviar: (texto: string, via: "texto" | "voz") => void;
  voz: { suporte: { reconhecimento: boolean }; ouvindo: boolean; parcial: string; erro: string | null; ouvir: () => void };
  aguardando: boolean;
  iaAtiva: boolean;
  onFechar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const eventos = props.sessao.r.eventos.filter((e) => e.tipo === "fala_aluno" || e.tipo === "fala_paciente" || e.tipo === "sistema");
  const ultimaPergunta = [...props.sessao.r.eventos].reverse().find((e): e is Extract<Evento, { tipo: "fala_aluno" }> => e.tipo === "fala_aluno");
  const enviar = () => {
    const t = texto.trim();
    if (!t) return;
    props.onEnviar(t, "texto");
    setTexto("");
  };
  return (
    <section className="vidro flex h-full flex-col rounded-2xl shadow-xl" aria-label="Conversa com o paciente">
      <header className="flex items-center justify-between border-b border-glass-line px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Conversa
          {props.iaAtiva && <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent"><Sparkles size={11} /> IA</span>}
        </div>
        <button onClick={props.onFechar} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Recolher conversa"><X size={16} /></button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-[14px] leading-snug" data-testid="transcricao">
        {eventos.map((e, i) =>
          e.tipo === "fala_aluno" ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-accent-contrast">
              {e.via === "voz" && <Mic size={11} className="mb-0.5 mr-1 inline opacity-70" />}
              {e.texto}
            </div>
          ) : e.tipo === "fala_paciente" ? (
            <div key={i} className={`mr-8 rounded-2xl rounded-bl-sm px-3 py-2 ${e.origem === "desconhecido" ? "bg-surface-2/70 italic text-muted" : "bg-surface-2"}`}>
              {e.texto}
              {e.origem === "ia" && <span className="ml-1 text-[10px] font-semibold text-accent">· IA</span>}
            </div>
          ) : (
            <p key={i} className="text-center text-[12px] text-muted">{e.texto}</p>
          ),
        )}
        {props.aguardando && <div className="mr-8 w-14 animate-pulse rounded-2xl bg-surface-2 px-3 py-2">…</div>}
        {props.voz.parcial && <div className="ml-8 rounded-2xl border border-dashed border-accent px-3 py-2 text-muted">{props.voz.parcial}</div>}
      </div>
      {props.voz.erro && <p className="px-3 pb-1 text-xs text-danger">{props.voz.erro}</p>}
      <form className="flex items-center gap-1.5 border-t border-glass-line p-2" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <button
          type="button"
          onClick={props.voz.ouvir}
          disabled={!props.voz.suporte.reconhecimento}
          title={props.voz.suporte.reconhecimento ? (props.voz.ouvindo ? "Parar de ouvir" : "Falar com o paciente") : "Reconhecimento de voz indisponível neste navegador — use o texto"}
          aria-label="Microfone"
          className={`grid size-11 shrink-0 place-items-center rounded-xl border transition ${props.voz.ouvindo ? "border-danger bg-danger/15 text-danger animate-pulse" : "border-line bg-surface text-ink"} disabled:opacity-40`}
        >
          {props.voz.suporte.reconhecimento ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Fale com o paciente…"
          aria-label="Sua fala"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-accent"
          enterKeyHint="send"
          autoComplete="off"
        />
        <button
          type="button"
          title="Repetir a última pergunta"
          aria-label="Repetir a última pergunta"
          disabled={!ultimaPergunta}
          onClick={() => ultimaPergunta && props.onEnviar(ultimaPergunta.texto, ultimaPergunta.via)}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface disabled:opacity-40"
        >
          <RotateCcw size={16} />
        </button>
        <button type="submit" className="botao-primario size-11 shrink-0 !px-0" aria-label="Enviar"><Send size={16} /></button>
      </form>
    </section>
  );
}

// ------------------------------------------------------------------ exame físico
export function PainelExame(props: {
  caso: Caso;
  sessao: Sessao;
  versao: number;
  filtro: Equipamento | null;
  onLimparFiltro: () => void;
  onExecutar: (manobra: Manobra, tecnicaId: string) => void;
}) {
  const [selecionada, setSelecionada] = useState<Manobra | null>(null);
  const [tecnica, setTecnica] = useState<string>("");
  const feitos = new Map<string, boolean>();
  for (const e of props.sessao.r.eventos) if (e.tipo === "acao" && e.acao.startsWith("ef:")) feitos.set(e.acao.slice(3), (feitos.get(e.acao.slice(3)) ?? false) || e.valida);
  const manobras = props.caso.manobras.filter((m) => !props.filtro || m.equipamento === props.filtro || (props.filtro === "mao" && m.equipamento === "mao"));
  const sistemas = [...new Set(manobras.map((m) => m.sistema))];
  const resultados = props.sessao.r.eventos.filter((e): e is Extract<Evento, { tipo: "acao" }> => e.tipo === "acao" && e.acao.startsWith("ef:")).reverse();
  const tecnicas = useMemo(() => (selecionada ? embaralhar(selecionada.tecnicas, props.sessao.r.id + selecionada.id) : []), [selecionada, props.sessao.r.id]);

  return (
    <div className="space-y-4">
      {props.filtro && (
        <div className="flex items-center justify-between rounded-xl bg-accent/10 px-3 py-2 text-xs">
          <span>Mostrando manobras com o equipamento selecionado.</span>
          <button className="font-semibold text-accent" onClick={props.onLimparFiltro}>Ver todas</button>
        </div>
      )}
      {sistemas.map((s) => (
        <div key={s}>
          <p className="rotulo mb-1.5">{s}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {manobras.filter((m) => m.sistema === s).map((m) => {
              const st = feitos.get(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelecionada(m); setTecnica(""); }}
                  className={`flex min-h-11 items-start gap-1.5 rounded-xl border px-2.5 py-2 text-left text-[13px] leading-tight transition hover:border-accent ${st === true ? "border-ok/50 bg-ok/10" : st === false ? "border-warn/60 bg-warn/10" : "border-line bg-surface"}`}
                >
                  {st === true ? <Check size={14} className="mt-0.5 shrink-0 text-ok" /> : st === false ? <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warn" /> : null}
                  <span>{m.nome}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {resultados.length > 0 && (
        <div>
          <p className="rotulo mb-1.5">Achados</p>
          <ul className="space-y-1.5" data-testid="achados">
            {resultados.map((r, i) => {
              const m = props.caso.manobras.find((x) => `ef:${x.id}` === r.acao);
              return (
                <li key={i} className={`rounded-xl border-l-4 bg-surface px-3 py-2 text-[13px] ${r.valida ? "border-accent" : "border-warn"}`}>
                  <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                    {m?.nome}
                    {m?.visual && r.valida ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent"><Box size={10} /> 3D</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">achado estruturado</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-muted">{r.resultado}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selecionada && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Técnica: ${selecionada.nome}`}>
          <div className="w-full max-w-md rounded-2xl bg-surface p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="rotulo">{selecionada.sistema}</p>
                <h3 className="text-lg font-bold">{selecionada.nome}</h3>
                <p className="text-sm text-muted">Escolha como vai realizar a manobra.</p>
              </div>
              <button onClick={() => setSelecionada(null)} className="rounded-lg p-1.5 hover:bg-surface-2" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {tecnicas.map((t) => (
                <label key={t.id} className={`flex cursor-pointer gap-2.5 rounded-xl border p-3 text-sm ${tecnica === t.id ? "border-accent bg-accent/5" : "border-line"}`}>
                  <input type="radio" name="tecnica" className="mt-0.5 size-4 accent-[var(--accent)]" checked={tecnica === t.id} onChange={() => setTecnica(t.id)} />
                  {t.descricao}
                </label>
              ))}
            </div>
            <button
              className="botao-primario mt-4 w-full"
              disabled={!tecnica}
              onClick={() => { props.onExecutar(selecionada, tecnica); setSelecionada(null); }}
            >
              <Stethoscope size={16} /> Executar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ exames complementares
export function PainelExames(props: { caso: Caso; sessao: Sessao; versao: number; relogio: number; onSolicitar: (id: string) => void }) {
  const pedidos = props.sessao.r.eventos.filter((e): e is Extract<Evento, { tipo: "acao" }> => e.tipo === "acao" && e.acao.startsWith("ex:"));
  const emergencia = props.sessao.r.modo === "emergencia";
  const grupos: Record<string, string> = { imagem: "Imagem", laboratorio: "Laboratório", cardiologico: "Cardiológico", outros: "Outros" };
  return (
    <div className="space-y-4">
      {emergencia && <p className="rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">Modo emergência: exames de imagem consomem tempo clínico; os de laboratório ficam prontos após o prazo de processamento.</p>}
      {Object.entries(grupos).map(([cat, nome]) => {
        const lista = props.caso.exames.filter((e) => e.categoria === cat);
        if (!lista.length) return null;
        return (
          <div key={cat}>
            <p className="rotulo mb-1.5">{nome}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {lista.map((e) => {
                const pedido = pedidos.find((p) => p.acao === `ex:${e.id}`);
                return (
                  <button key={e.id} disabled={!!pedido} onClick={() => props.onSolicitar(e.id)} className={`flex min-h-11 items-start gap-1.5 rounded-xl border px-2.5 py-2 text-left text-[13px] leading-tight ${pedido ? "border-ok/50 bg-ok/10" : "border-line bg-surface hover:border-accent"}`}>
                    {pedido && <Check size={14} className="mt-0.5 shrink-0 text-ok" />}
                    <span>{e.nome}{emergencia && e.tempoMin ? <span className="block text-[11px] text-muted">~{e.tempoMin} min</span> : null}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {pedidos.length > 0 && (
        <div>
          <p className="rotulo mb-1.5">Resultados</p>
          <ul className="space-y-1.5" data-testid="resultados-exames">
            {[...pedidos].reverse().map((p, i) => {
              const ex = props.caso.exames.find((x) => `ex:${x.id}` === p.acao)!;
              const pronto = !emergencia || ex.categoria === "imagem" || props.relogio >= p.tc + ex.tempoMin;
              return (
                <li key={i} className="rounded-xl border-l-4 border-accent bg-surface px-3 py-2 text-[13px]">
                  <p className="font-semibold">{ex.nome}</p>
                  {pronto ? <p className="text-muted">{ex.resultado}</p> : <p className="text-warn">Em processamento — pronto em ~{Math.ceil(p.tc + ex.tempoMin - props.relogio)} min de relógio clínico.</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ NIHSS
export function PainelNihss(props: { caso: Caso; sessao: Sessao; versao: number; aprendizado: boolean; onRegistrar: (v: Record<string, number>) => void }) {
  const salvo = ultimoNihss(props.sessao.r);
  const [valores, setValores] = useState<Record<string, number>>(salvo ?? {});
  const itens = props.caso.nihss ?? [];
  const total = itens.reduce((s, i) => s + (valores[i.id] ?? 0), 0);
  const completo = itens.every((i) => i.id in valores);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Pontue cada item a partir do que você examinou. A escala não mostra os achados — eles vêm do seu exame.</p>
      {itens.map((i) => (
        <label key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13px]">
          <span className="leading-tight">{i.nome}</span>
          <select
            aria-label={i.nome}
            className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm"
            value={valores[i.id] ?? ""}
            onChange={(e) => setValores({ ...valores, [i.id]: Number(e.target.value) })}
          >
            <option value="" disabled>–</option>
            {Array.from({ length: i.max + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      ))}
      <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
        <span className="text-sm font-semibold">Total: {total}</span>
        <button className="botao-primario" disabled={!completo} onClick={() => props.onRegistrar(valores)}>
          <ClipboardCheck size={16} /> {salvo ? "Atualizar" : "Registrar"} NIHSS
        </button>
      </div>
      {props.aprendizado && salvo && (
        <details className="rounded-xl border border-line p-2 text-xs">
          <summary className="cursor-pointer font-semibold">Comparar com o gabarito (modo aprendizado)</summary>
          <ul className="mt-1 space-y-0.5">
            {itens.map((i) => (
              <li key={i.id} className={salvo[i.id] === i.correto ? "text-ok" : "text-danger"}>{i.nome}: você {salvo[i.id]} · esperado {i.correto} — {i.achado}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ decisões
const CAMPOS: { campo: CampoDecisao; titulo: string; multiplo: boolean; ajuda: string }[] = [
  { campo: "hipotese", titulo: "Hipótese diagnóstica principal", multiplo: false, ajuda: "Escolha uma." },
  { campo: "diferenciais", titulo: "Diagnósticos diferenciais a considerar", multiplo: true, ajuda: "Marque os relevantes." },
  { campo: "janela", titulo: "Janela terapêutica", multiplo: false, ajuda: "Escolha uma." },
  { campo: "conduta", titulo: "Conduta", multiplo: true, ajuda: "Marque o que você faria. Condutas inadequadas são registradas." },
  { campo: "orientacoes", titulo: "Orientações ao paciente", multiplo: true, ajuda: "Marque o que você orientou." },
];

export function PainelDecisoes(props: { caso: Caso; sessao: Sessao; versao: number; onRegistrar: (campo: CampoDecisao, opcoes: string[]) => void }) {
  const finais = decisoesFinais(props.sessao.r);
  return (
    <div className="space-y-4">
      {props.sessao.r.modo === "emergencia" && (
        <p className="rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">Cada decisão registrada entra no relógio clínico e altera a evolução do paciente.</p>
      )}
      {CAMPOS.filter((c) => props.caso.decisoes[c.campo].length).map((c) => (
        <BlocoDecisao key={c.campo} {...c} titulo={props.caso.rotulosDecisao[c.campo] ?? c.titulo} opcoes={embaralhar(props.caso.decisoes[c.campo], props.sessao.r.id + c.campo)} registradas={finais[c.campo]?.opcoes ?? null} onRegistrar={(ops) => props.onRegistrar(c.campo, ops)} />
      ))}
    </div>
  );
}

function BlocoDecisao(props: { campo: CampoDecisao; titulo: string; ajuda: string; multiplo: boolean; opcoes: Opcao[]; registradas: string[] | null; onRegistrar: (ops: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(props.registradas ?? []);
  const mudou = JSON.stringify([...sel].sort()) !== JSON.stringify([...(props.registradas ?? [])].sort());
  return (
    <fieldset className="rounded-2xl border border-line bg-surface p-3" data-campo={props.campo}>
      <legend className="px-1 text-sm font-bold">{props.titulo}</legend>
      <p className="mb-2 text-xs text-muted">{props.ajuda}</p>
      <div className="space-y-1.5">
        {props.opcoes.map((o) => (
          <label key={o.id} className={`flex cursor-pointer gap-2.5 rounded-xl border p-2.5 text-[13px] leading-snug ${sel.includes(o.id) ? "border-accent bg-accent/5" : "border-line"}`}>
            <input
              type={props.multiplo ? "checkbox" : "radio"}
              name={props.campo}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
              checked={sel.includes(o.id)}
              onChange={(e) => setSel(props.multiplo ? (e.target.checked ? [...sel, o.id] : sel.filter((x) => x !== o.id)) : [o.id])}
            />
            {o.texto}
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted">{props.registradas ? (mudou ? "Alterações não registradas" : <span className="inline-flex items-center gap-1 text-ok"><CheckCircle2 size={13} /> Registrado</span>) : "Não registrado"}</span>
        <button className="botao" disabled={!sel.length || !mudou} onClick={() => props.onRegistrar(sel)}><Eye size={14} className="hidden" />Registrar</button>
      </div>
    </fieldset>
  );
}

export const ICONES_ABA = { exame: Stethoscope, exames: FlaskConical, nihss: ClipboardCheck, decisoes: CheckCircle2 };
