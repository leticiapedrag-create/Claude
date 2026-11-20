"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, EyeOff, Hand, RotateCcw, Shuffle, Target, Timer, X } from "lucide-react";
import { AREAS, INSTRUMENTOS, imagemInstrumento, type AreaMesa, type Instrumento } from "@/data/instrumentos";

type Destino = AreaMesa | "bandeja";
interface Arraste { id: string; x: number; y: number; dx: number; dy: number; largura: number; ativo: boolean; x0: number; y0: number }
interface Resultado { data: string; total: number; areas: number; nomes: number; pct: number; tempoSeg: number }

const CHAVE = "osce.v2.mesa";
const lerHistorico = (): Resultado[] => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as Resultado[];
  } catch {
    return [];
  }
};
const gravarHistorico = (r: Resultado) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify([...lerHistorico(), r].slice(-30)));
  } catch {
    /* sem armazenamento */
  }
};

function embaralhar<T>(lista: T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Inclinação fixa por instrumento, para o efeito de "adesivo". */
const inclinacao = (id: string) => ((id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 9) - 4) * 1.2;
const formatar = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function MesaCirurgica() {
  const [rodada, setRodada] = useState<Instrumento[]>(INSTRUMENTOS);
  const [posicoes, setPosicoes] = useState<Record<string, AreaMesa | undefined>>({});
  const [nomes, setNomes] = useState<Record<string, string | undefined>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [nomeando, setNomeando] = useState<string | null>(null);
  const [arraste, setArraste] = useState<Arraste | null>(null);
  const [verificado, setVerificado] = useState(false);
  const [mostrarAreas, setMostrarAreas] = useState(false);
  const [inicio, setInicio] = useState(0);
  const [agora, setAgora] = useState(0);
  const [fim, setFim] = useState<number | null>(null);
  const [historico, setHistorico] = useState<Resultado[]>([]);
  const arrasteRef = useRef<Arraste | null>(null);


  const opcoesNome = useMemo(() => [...rodada].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [rodada]);
  const naBandeja = rodada.filter((i) => !posicoes[i.id]);
  const completos = rodada.filter((i) => posicoes[i.id] && nomes[i.id]).length;
  const tempoSeg = inicio ? Math.max(0, Math.round(((fim ?? agora) - inicio) / 1000)) : 0;

  const mover = (id: string, destino: Destino) => {
    if (verificado) return;
    setPosicoes((p) => ({ ...p, [id]: destino === "bandeja" ? undefined : destino }));
    setSelecionado(null);
  };

  // ------------------------------------------------------------ arrastar (mouse e toque)
  const iniciarArraste = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    if (verificado) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const a: Arraste = { id, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, largura: r.width, ativo: false, x0: e.clientX, y0: e.clientY };
    arrasteRef.current = a;
  };
  const moverArraste = (e: React.PointerEvent) => {
    const a = arrasteRef.current;
    if (!a) return;
    const ativo = a.ativo || Math.hypot(e.clientX - a.x0, e.clientY - a.y0) > 6;
    const novo = { ...a, x: e.clientX, y: e.clientY, ativo };
    arrasteRef.current = novo;
    if (ativo) setArraste(novo);
  };
  const soltarArraste = (e: React.PointerEvent) => {
    const a = arrasteRef.current;
    arrasteRef.current = null;
    setArraste(null);
    if (!a) return;
    if (!a.ativo) {
      // toque simples: seleciona para depois tocar na área
      setSelecionado((s) => (s === a.id ? null : a.id));
      return;
    }
    const alvo = document.elementsFromPoint(e.clientX, e.clientY).find((el) => (el as HTMLElement).dataset?.destino) as HTMLElement | undefined;
    if (alvo) mover(a.id, alvo.dataset.destino as Destino);
  };

  const verificar = () => {
    const areas = rodada.filter((i) => posicoes[i.id] === i.area).length;
    const nomesOk = rodada.filter((i) => nomes[i.id] === i.id).length;
    const total = rodada.length;
    const r: Resultado = { data: new Date().toISOString(), total, areas, nomes: nomesOk, pct: Math.round(((areas + nomesOk) / (2 * total)) * 100), tempoSeg };
    gravarHistorico(r);
    setHistorico(lerHistorico());
    setFim(inicio + tempoSeg * 1000);
    setVerificado(true);
    setSelecionado(null);
    setTimeout(() => document.querySelector('[data-testid="resultado-mesa"]')?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const novaRodada = (lista: Instrumento[] = INSTRUMENTOS) => {
    setRodada(embaralhar(lista));
    setPosicoes({});
    setNomes({});
    setVerificado(false);
    setSelecionado(null);
    setInicio(Date.now());
    setFim(null);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setHistorico(lerHistorico());
      novaRodada();
    }, 0);
    const i = setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, []);

  const erros = rodada.filter((i) => posicoes[i.id] !== i.area || nomes[i.id] !== i.id);
  const resultado = verificado ? historico[historico.length - 1] : null;
  const arrastado = arraste ? rodada.find((i) => i.id === arraste.id) : null;

  const adesivo = (i: Instrumento, contexto: "bandeja" | "mesa") => {
    const areaOk = posicoes[i.id] === i.area;
    const nomeOk = nomes[i.id] === i.id;
    const nomeEscolhido = rodada.find((x) => x.id === nomes[i.id])?.nome;
    return (
      <div key={i.id} className={`flex w-[118px] flex-col items-center gap-1 sm:w-[136px] ${arraste?.id === i.id && arraste.ativo ? "opacity-30" : ""}`} data-instrumento={i.id}>
        <button
          type="button"
          aria-label={`Instrumento ${nomeEscolhido ?? "sem nome"}${selecionado === i.id ? ", selecionado" : ""}`}
          aria-pressed={selecionado === i.id}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => iniciarArraste(e, i.id)}
          onPointerMove={moverArraste}
          onPointerUp={soltarArraste}
          onPointerCancel={() => { arrasteRef.current = null; setArraste(null); }}
          className={`grid h-[64px] w-full touch-none select-none place-items-center rounded-xl transition ${verificado ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${selecionado === i.id ? "bg-white/25 ring-2 ring-amber-300" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagemInstrumento(i.id)} alt="" draggable={false} className="adesivo max-h-[60px] max-w-full object-contain" style={{ transform: `rotate(${inclinacao(i.id)}deg)` }} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!verificado) setNomeando(i.id); }}
          className={`line-clamp-2 w-full rounded-md px-1.5 py-1 text-[11px] font-semibold leading-tight shadow-sm ${
            verificado ? (nomeOk ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900") : nomeEscolhido ? "bg-white text-slate-900" : "border border-dashed border-white/70 bg-white/10 text-white"
          }`}
          title={nomeEscolhido}
        >
          {nomeEscolhido ?? "Escolher nome"}
        </button>
        {verificado && contexto === "mesa" && (
          <div className="flex gap-1 text-[10px] font-semibold">
            <span className={`inline-flex items-center gap-0.5 rounded px-1 ${areaOk ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{areaOk ? <Check size={10} /> : <X size={10} />} área</span>
            <span className={`inline-flex items-center gap-0.5 rounded px-1 ${nomeOk ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{nomeOk ? <Check size={10} /> : <X size={10} />} nome</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" onPointerMove={moverArraste}>
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="rotulo">Instrumentação cirúrgica</p>
          <h1 className="text-2xl font-bold tracking-tight">Montagem da mesa</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Arraste cada instrumento da bandeja para a área certa da mesa, na ordem dos tempos cirúrgicos (1 a 6), e escolha o nome dele. No celular ou iPad, você também pode tocar no instrumento e depois tocar na área.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm font-semibold tabular-nums" aria-label="Tempo"><Timer size={15} /> {formatar(tempoSeg)}</span>
          <button className="botao" onClick={() => setMostrarAreas((v) => !v)} aria-pressed={mostrarAreas}>
            {mostrarAreas ? <EyeOff size={16} /> : <Eye size={16} />} {mostrarAreas ? "Esconder nomes das áreas" : "Mostrar nomes das áreas"}
          </button>
          <button className="botao" onClick={() => novaRodada()}><Shuffle size={16} /> Embaralhar</button>
        </div>
      </section>

      {/* bandeja */}
      {!verificado && (
        <section
          data-destino="bandeja"
          onClick={() => selecionado && mover(selecionado, "bandeja")}
          className="campo-cirurgico rounded-2xl p-3"
          aria-label="Bandeja de instrumentos"
        >
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80">
            <span className="inline-flex items-center gap-1.5"><Hand size={14} /> Bandeja · {naBandeja.length} instrumento(s)</span>
            <span>{completos} de {rodada.length} com área e nome</span>
          </div>
          <div className="flex min-h-[96px] flex-wrap justify-center gap-2" data-destino="bandeja">
            {naBandeja.length ? naBandeja.map((i) => adesivo(i, "bandeja")) : <p className="self-center text-sm text-white/80">Todos os instrumentos estão na mesa.</p>}
          </div>
        </section>
      )}

      {/* mesa */}
      <section className="rounded-3xl border-4 border-slate-300 bg-slate-200 p-2 shadow-inner dark:border-slate-600 dark:bg-slate-700" aria-label="Mesa cirúrgica">
        <div className="campo-cirurgico grid grid-cols-2 gap-2 rounded-2xl p-2 lg:grid-cols-3">
          {AREAS.map((a, n) => {
            const itens = rodada.filter((i) => posicoes[i.id] === a.id);
            return (
              <div
                key={a.id}
                data-destino={a.id}
                data-testid={`area-${n + 1}`}
                onClick={() => selecionado && mover(selecionado, a.id)}
                className={`relative min-h-[150px] rounded-xl border-2 border-dashed p-2 pt-8 transition ${selecionado ? "cursor-pointer border-amber-300 bg-white/10" : "border-white/40"}`}
              >
                <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 text-xs font-bold text-white">
                  <span className="grid size-6 place-items-center rounded-full bg-white text-[13px] text-slate-900">{n + 1}</span>
                  {(mostrarAreas || verificado) && <span>{a.nome}</span>}
                </span>
                <div className="flex flex-wrap justify-center gap-2" data-destino={a.id}>
                  {itens.map((i) => adesivo(i, "mesa"))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">Lado do instrumentador</p>
      </section>

      {!verificado ? (
        <div className="flex flex-wrap items-center gap-3">
          <button className="botao-primario" onClick={verificar} disabled={naBandeja.length > 0} data-testid="verificar-mesa">
            <Check size={16} /> Verificar a mesa
          </button>
          {naBandeja.length > 0 && <span className="text-sm text-muted">Coloque todos os instrumentos na mesa para verificar.</span>}
          {naBandeja.length === 0 && completos < rodada.length && <span className="text-sm text-muted">Faltam nomes em {rodada.length - completos} instrumento(s); eles contarão como erro.</span>}
        </div>
      ) : (
        resultado && (
          <section className="cartao space-y-4 p-5" data-testid="resultado-mesa">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <p><span className="text-3xl font-bold tabular-nums">{resultado.pct}%</span> <span className="text-muted">de acerto</span></p>
              <p className="text-sm">Áreas: <strong>{resultado.areas}/{resultado.total}</strong> · Nomes: <strong>{resultado.nomes}/{resultado.total}</strong> · Tempo: <strong>{formatar(resultado.tempoSeg)}</strong></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="botao-primario" onClick={() => novaRodada()}><RotateCcw size={16} /> Nova rodada</button>
              {erros.length > 0 && <button className="botao" onClick={() => novaRodada(erros)}><Target size={16} /> Treinar só os {erros.length} que errei</button>}
            </div>
            {erros.length > 0 ? (
              <div>
                <h2 className="mb-2 font-bold">Correções</h2>
                <ul className="grid gap-2 md:grid-cols-2">
                  {erros.map((i) => (
                    <li key={i.id} className="flex gap-3 rounded-xl border border-line p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagemInstrumento(i.id)} alt={i.nome} className="h-12 w-24 shrink-0 object-contain" />
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold">{i.nome} → área {AREAS.findIndex((a) => a.id === i.area) + 1} ({AREAS.find((a) => a.id === i.area)!.nome})</p>
                        <p className="text-muted">{i.funcao}</p>
                        <p className="mt-0.5 text-xs text-muted">Como reconhecer: {i.comoReconhecer}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="font-semibold text-ok">Mesa perfeita: todas as áreas e nomes corretos.</p>
            )}
          </section>
        )
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="cartao p-5 text-sm">
          <h2 className="mb-2 font-bold">Como a mesa é organizada</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {AREAS.map((a) => <li key={a.id}><strong>{a.nome}:</strong> {a.descricao}</li>)}
          </ol>
          <p className="mt-2 text-muted">A mesa é coberta por um campo impermeável e outro campo estéril; dentro de cada área, os instrumentos mais delicados vêm antes dos mais grosseiros.</p>
        </div>
        <div className="cartao p-5 text-sm">
          <h2 className="mb-2 font-bold">Suas últimas rodadas</h2>
          {historico.length === 0 ? (
            <p className="text-muted">Nenhuma rodada verificada ainda.</p>
          ) : (
            <ul className="space-y-1">
              {[...historico].reverse().slice(0, 6).map((h) => (
                <li key={h.data} className="flex justify-between gap-2 tabular-nums">
                  <span className="text-muted">{new Date(h.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span>{h.pct}% · áreas {h.areas}/{h.total} · nomes {h.nomes}/{h.total} · {formatar(h.tempoSeg)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <details className="cartao p-5 text-xs text-muted">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Créditos das fotos</summary>
        <p className="mt-2">Fotos reais do Wikimedia Commons, com o fundo removido para o efeito de adesivo. As versões recortadas seguem a mesma licença das originais.</p>
        <ul className="mt-2 space-y-1">
          {INSTRUMENTOS.map((i) => (
            <li key={i.id}>
              <strong className="text-ink">{i.nome}:</strong> “{i.credito.arquivo}”, de {i.credito.autor} — {i.credito.licencaUrl ? <a className="underline" href={i.credito.licencaUrl} target="_blank" rel="noreferrer">{i.credito.licenca}</a> : i.credito.licenca} — <a className="underline" href={i.credito.pagina} target="_blank" rel="noreferrer">página do arquivo</a>
            </li>
          ))}
        </ul>
      </details>

      {/* escolher nome */}
      {nomeando && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={() => setNomeando(null)} role="dialog" aria-modal="true" aria-label="Escolher nome do instrumento">
          <div className="max-h-[85dvh] w-full overflow-auto rounded-t-2xl bg-surface p-4 sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagemInstrumento(nomeando)} alt="" className="h-24 w-40 object-contain sm:w-56" />
              <p className="flex-1 font-semibold">Qual é este instrumento?</p>
              <button className="botao px-2.5" onClick={() => setNomeando(null)} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {opcoesNome.map((o) => {
                const usadoPor = Object.entries(nomes).find(([k, v]) => v === o.id && k !== nomeando);
                return (
                  <button
                    key={o.id}
                    onClick={() => { setNomes((n) => ({ ...n, [nomeando]: o.id })); setNomeando(null); }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${nomes[nomeando] === o.id ? "border-accent bg-accent/10 font-semibold" : "border-line hover:border-accent"} ${usadoPor ? "opacity-50" : ""}`}
                  >
                    {o.nome}{usadoPor ? " (já usado)" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* adesivo flutuante durante o arraste */}
      {arraste?.ativo && arrastado && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagemInstrumento(arrastado.id)}
          alt=""
          className="adesivo pointer-events-none fixed z-50 max-h-[70px] object-contain"
          style={{ left: arraste.x - arraste.dx, top: arraste.y - arraste.dy, width: arraste.largura, transform: `rotate(${inclinacao(arrastado.id) + 4}deg) scale(1.08)` }}
        />
      )}
    </div>
  );
}
