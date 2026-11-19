"use client";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, Clock, GraduationCap, ListChecks, Search, Siren, Stethoscope, Timer } from "lucide-react";
import { NOME_CENARIO, type Caso } from "@/lib/caso/schema";
import { avaliar } from "@/lib/engine/avaliacao";
import { useArmazenamento } from "@/hooks/useArmazenamento";
import { ASSUNTOS, casoNoNivel, rotuloAssunto, type Nivel } from "@/lib/programa";
import { EscolherNivel } from "@/components/simulado/Simulado";

export default function Inicio() {
  const { config, tentativas, casos } = useArmazenamento();
  const melhor = (c: Caso) => {
    const ts = tentativas.filter((t) => t.caso.id === c.id && t.registro.fim);
    if (!ts.length) return null;
    return Math.max(...ts.map((t) => avaliar(t.caso, t.registro, { revisoes: t.revisoes }).pct));
  };
  const [busca, setBusca] = useState("");
  const [area, setArea] = useState<"todas" | "clinica" | "cirurgica">("todas");
  const [nivel, setNivel] = useState<"todos" | Nivel>("todos");
  const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtrados = casos.filter((c) => {
    if (area !== "todas" && c.area !== area) return false;
    if (nivel !== "todos" && !casoNoNivel(c, nivel)) return false;
    if (!termo) return true;
    return [c.titulo, c.tema, c.especialidade, ...c.programa.map((p) => `${rotuloAssunto(p.bloco, p.numero)} ${ASSUNTOS[p.bloco][p.numero - 1] ?? ""}`)].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(termo);
  });
  const grupos: [string, Caso[]][] = [
    ["Estações clínicas", filtrados.filter((c) => c.area === "clinica")],
    ["Estações de clínica cirúrgica", filtrados.filter((c) => c.area === "cirurgica")],
  ];
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-teal-500/30 blur-3xl" style={{ background: "radial-gradient(circle, rgba(43,179,163,.45), transparent 70%)" }} />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-white/60">Hospital virtual · {config.nomeProva}</p>
        <h1 className="relative mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Atenda pacientes 3D, examine, decida e receba a avaliação pelo checklist.</h1>
        <p className="relative mt-3 max-w-2xl text-white/75">Prova configurada: {config.numeroEstacoes} estações ({config.estacoesClinicas} clínicas e {config.estacoesCirurgicas} cirúrgicas), {config.pontuacaoTotal} pontos, meta de {config.meta} pontos. Ajuste em Configurações.</p>
        <div className="relative mt-5 flex flex-wrap gap-2 text-[13px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><GraduationCap size={15} /> Aprendizado: dicas, pausa e retorno imediato</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Timer size={15} /> OSCE: tempo limitado, sem dicas</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Siren size={15} /> Emergência: evolução clínica no tempo</span>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ListChecks size={20} className="text-accent" /> Simulado de prova</h2>
          <Link href="/simulado" className="text-sm font-semibold text-accent">Simulados anteriores</Link>
        </div>
        <EscolherNivel />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <Search size={16} className="text-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tema ou assunto (ex.: ombro, AVC, sutura)" className="w-full bg-transparent text-sm outline-none" aria-label="Buscar estação" />
        </label>
        <div className="inline-flex rounded-xl border border-line bg-surface p-0.5" role="radiogroup" aria-label="Área">
          {([["todas", "Todas"], ["clinica", "Clínicas"], ["cirurgica", "Cirúrgicas"]] as const).map(([v, r]) => (
            <button key={v} role="radio" aria-checked={area === v} onClick={() => setArea(v)} className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${area === v ? "bg-navy text-white dark:bg-accent dark:text-accent-contrast" : "text-muted hover:text-ink"}`}>{r}</button>
          ))}
        </div>
        <div className="inline-flex rounded-xl border border-line bg-surface p-0.5" role="radiogroup" aria-label="Nível da prova">
          {(["todos", "N1", "N2", "N3"] as const).map((v) => (
            <button key={v} role="radio" aria-checked={nivel === v} onClick={() => setNivel(v)} className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${nivel === v ? "bg-navy text-white dark:bg-accent dark:text-accent-contrast" : "text-muted hover:text-ink"}`}>{v === "todos" ? "Todos os níveis" : v}</button>
          ))}
        </div>
        <span className="text-xs text-muted">{filtrados.length} de {casos.length} estações</span>
      </div>

      {grupos.filter(([, lista]) => lista.length || !termo).map(([titulo, lista]) => (
        <section key={titulo}>
          <h2 className="mb-3 text-lg font-bold">{titulo}</h2>
          {lista.length === 0 ? (
            <p className="cartao p-4 text-sm text-muted">Nenhum caso nesta área ainda. Importe seus roteiros em <Link className="font-semibold text-accent" href="/casos">Casos</Link>.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {lista.map((c) => {
                const m = melhor(c);
                const tempo = config.tempoEstacao[c.id] ?? c.duracaoMin;
                return (
                  <article key={c.id} className="cartao flex flex-col p-5" data-caso={c.id}>
                    <p className="rotulo">{c.especialidade} · {NOME_CENARIO[c.cenario]}</p>
                    <h3 className="mt-1 text-lg font-bold leading-snug">{c.titulo}</h3>
                    <p className="mt-1 line-clamp-3 text-sm text-muted">{c.enunciado}</p>
                    <p className="mt-2 text-xs font-semibold text-accent">
                      {c.programa.length ? c.programa.map((p) => `${rotuloAssunto(p.bloco, p.numero)} · ${ASSUNTOS[p.bloco][p.numero - 1] ?? c.tema}`).join(" / ") : c.tema}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><Clock size={13} /> {tempo} min</span>
                      <span className="inline-flex items-center gap-1"><Stethoscope size={13} /> {c.manobras.length} manobras · {c.exames.length} exames</span>
                      <span>{m === null ? "Ainda não realizada" : <>Melhor nota: <strong className="text-ink">{m}%</strong></>}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link className="botao" href={`/simulacao?caso=${c.id}&modo=aprendizado`}><GraduationCap size={16} /> Aprendizado</Link>
                      <Link className="botao-primario" href={`/simulacao?caso=${c.id}&modo=osce`}><Timer size={16} /> Modo OSCE</Link>
                      {c.evolucao && <Link className="botao" href={`/simulacao?caso=${c.id}&modo=emergencia`}><Siren size={16} /> Emergência</Link>}
                      <Link className="botao ml-auto px-2.5" href={`/casos?id=${c.id}`} aria-label="Ver ficha do caso"><BookOpen size={16} /></Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ))}

      <p className="text-xs text-muted">Os casos incluídos são demonstrativos, criados para treino, e não são estações oficiais da Afya. Você pode importar seus próprios roteiros e checklists.</p>
    </div>
  );
}
