"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertOctagon, Hospital, Target } from "lucide-react";
import { COMPETENCIAS, ETAPAS, NOME_COMPETENCIA, NOME_ETAPA } from "@/lib/caso/schema";
import { avaliar } from "@/lib/engine/avaliacao";
import { itensParaTreinar } from "@/lib/engine/relatorio";
import { valorDaEstacao } from "@/lib/store/config";
import { useArmazenamento } from "@/hooks/useArmazenamento";
import { BarrasPorTema, BarrasTempo, LinhaEvolucao, MapaErros, MedidorMeta, RadarCompetencias } from "@/components/graficos/Graficos";

type FiltroModo = "todos" | "aprendizado" | "osce" | "emergencia";
type FiltroArea = "todas" | "clinica" | "cirurgica";

export default function Painel() {
  const { pronto, config, tentativas } = useArmazenamento();
  const [modo, setModo] = useState<FiltroModo>("todos");
  const [area, setArea] = useState<FiltroArea>("todas");

  const dados = useMemo(() => {
    const lista = tentativas
      .filter((t) => t.registro.fim)
      .filter((t) => modo === "todos" || t.registro.modo === modo)
      .filter((t) => area === "todas" || t.caso.area === area)
      .sort((a, b) => a.registro.inicio - b.registro.inicio)
      .map((t) => ({ t, a: avaliar(t.caso, t.registro, { revisoes: t.revisoes, politicaErroCritico: config.politicaErroCritico }) }));
    return lista;
  }, [tentativas, modo, area, config.politicaErroCritico]);

  if (!pronto) return <p className="text-muted">Carregando…</p>;

  const filtros = (
    <div className="flex flex-wrap gap-2">
      <Segmentado valor={modo} opcoes={[["todos", "Todos os modos"], ["osce", "OSCE"], ["aprendizado", "Aprendizado"], ["emergencia", "Emergência"]]} onChange={setModo} />
      <Segmentado valor={area} opcoes={[["todas", "Todas as áreas"], ["clinica", "Clínica"], ["cirurgica", "Cirúrgica"]]} onChange={setArea} />
    </div>
  );

  if (!dados.length) {
    return (
      <div className="space-y-4">
        <Cabecalho />
        {filtros}
        <div className="cartao grid place-items-center gap-3 p-10 text-center">
          <Hospital size={32} className="text-muted" />
          <p className="font-semibold">Nenhuma simulação concluída {modo !== "todos" || area !== "todas" ? "com esses filtros" : "ainda"}.</p>
          <p className="max-w-md text-sm text-muted">Os gráficos usam apenas os seus atendimentos reais. Conclua uma estação para ver seu desempenho.</p>
          <Link href="/" className="botao-primario">Ir para o hospital</Link>
        </div>
      </div>
    );
  }

  // ---------------- agregações
  const radar = COMPETENCIAS.map((c) => {
    let o = 0, m = 0;
    for (const { a } of dados) { o += a.porCompetencia[c].obtido; m += a.porCompetencia[c].maximo; }
    return { nome: NOME_COMPETENCIA[c], pct: m ? Math.round((o / m) * 100) : 0, m };
  }).filter((x) => x.m > 0);

  const metaPct = (config.meta / config.pontuacaoTotal) * 100;
  const evolucao = dados.map(({ t, a }, i) => ({ rotulo: `#${i + 1}`, pct: a.pct, caso: `${t.caso.titulo} — ${new Date(t.registro.inicio).toLocaleDateString("pt-BR")}` }));

  const porTema = new Map<string, { soma: number; n: number }>();
  for (const { t, a } of dados) {
    const k = t.caso.tema;
    const v = porTema.get(k) ?? { soma: 0, n: 0 };
    porTema.set(k, { soma: v.soma + a.pct, n: v.n + 1 });
  }
  const temas = [...porTema.entries()].map(([tema, v]) => ({ tema, pct: Math.round(v.soma / v.n), n: v.n })).sort((x, y) => x.pct - y.pct);

  const celulas = new Map<string, { falhas: number; n: number }>();
  const contagemItens = new Map<string, { texto: string; caso: string; falhas: number; n: number }>();
  for (const { t, a } of dados) {
    for (const i of a.itens) {
      if (i.status === "pendente_revisao") continue;
      const k = `${i.item.competencia}|${i.item.etapa}`;
      const c = celulas.get(k) ?? { falhas: 0, n: 0 };
      const falhou = i.status !== "cumprido";
      celulas.set(k, { falhas: c.falhas + (falhou ? 1 : 0), n: c.n + 1 });
      const ki = `${t.caso.id}|${i.item.id}`;
      const ci = contagemItens.get(ki) ?? { texto: i.item.texto, caso: t.caso.titulo, falhas: 0, n: 0 };
      contagemItens.set(ki, { ...ci, falhas: ci.falhas + (falhou ? 1 : 0), n: ci.n + 1 });
    }
  }
  const maisFalhados = [...contagemItens.values()].filter((x) => x.falhas > 0).sort((x, y) => y.falhas / y.n - x.falhas / x.n || y.falhas - x.falhas).slice(0, 6);
  const errosCriticos = dados.reduce((s, d) => s + d.a.errosCriticos.length, 0);

  const etapasUsadas = ETAPAS.filter((e) => dados.some((d) => d.a.temposEtapaSeg[e] > 1));
  const tempos = dados.slice(-10).map(({ a }, i) => ({ rotulo: `#${dados.length - Math.min(10, dados.length) + i + 1}`, ...Object.fromEntries(etapasUsadas.map((e) => [e, Math.round((a.temposEtapaSeg[e] / 60) * 10) / 10])) }));

  // Projeção: última tentativa de cada estação treinada, ponderada pelo valor da estação.
  const ultimaPorCaso = new Map<string, (typeof dados)[number]>();
  for (const d of dados) ultimaPorCaso.set(d.t.caso.id, d);
  let somaPond = 0, somaValor = 0, algumaSuposicao = false;
  for (const [id, d] of ultimaPorCaso) {
    const { valor, suposicao } = valorDaEstacao(config, id);
    somaPond += (d.a.pct / 100) * valor;
    somaValor += valor;
    algumaSuposicao ||= suposicao;
  }
  const projecao = somaValor ? (somaPond / somaValor) * config.pontuacaoTotal : 0;

  // Treinar meus erros: estação com mais itens perdidos na última tentativa.
  const piorUltima = [...ultimaPorCaso.values()].sort((x, y) => x.a.pct - y.a.pct)[0];

  return (
    <div className="space-y-5" data-testid="painel">
      <Cabecalho />
      {filtros}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="cartao p-5 lg:col-span-2">
          <p className="rotulo">Meta da prova — {config.nomeProva}</p>
          <div className="mt-2"><MedidorMeta valor={projecao} meta={config.meta} total={config.pontuacaoTotal} rotulo="Projeção da nota na prova" /></div>
          <p className="mt-3 text-xs text-muted">
            Projeção = aproveitamento da última tentativa de cada estação treinada ({ultimaPorCaso.size} de {config.numeroEstacoes} estações), ponderado pelo valor de cada estação, aplicado ao total de {config.pontuacaoTotal} pontos.
            {algumaSuposicao && " Algumas estações usam valor suposto (divisão igual) até você informar o checklist oficial em Configurações."} É uma estimativa do simulador.
          </p>
        </section>
        <section className="cartao grid grid-cols-2 gap-3 p-5">
          <Numero rotulo="Estações concluídas" valor={String(dados.length)} />
          <Numero rotulo="Média geral" valor={`${Math.round(dados.reduce((s, d) => s + d.a.pct, 0) / dados.length)}%`} />
          <Numero rotulo="Erros críticos" valor={String(errosCriticos)} alerta={errosCriticos > 0} />
          <Numero rotulo="Aguardando revisão" valor={String(dados.reduce((s, d) => s + d.a.pendentes, 0))} />
          {piorUltima && itensParaTreinar(piorUltima.a).length > 0 && (
            <Link href={`/simulacao?caso=${piorUltima.t.caso.id}&modo=aprendizado&foco=${itensParaTreinar(piorUltima.a).join(",")}`} className="botao col-span-2"><Target size={16} /> Treinar meus erros</Link>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Radar de competências" sub="Pontos obtidos ÷ pontos possíveis em cada competência, somando as tentativas filtradas.">
          <RadarCompetencias dados={radar} />
        </Cartao>
        <Cartao titulo="Evolução das notas" sub="Percentual de cada tentativa, em ordem. Linha tracejada: meta convertida em percentual.">
          <LinhaEvolucao dados={evolucao} metaPct={metaPct} />
        </Cartao>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Desempenho por tema" sub="Média das tentativas em cada tema.">
          <BarrasPorTema dados={temas} />
        </Cartao>
        <Cartao titulo="Mapa de erros" sub="Percentual de itens não cumpridos por competência e etapa do atendimento.">
          <MapaErros
            linhas={COMPETENCIAS.map((c) => ({ chave: c, nome: NOME_COMPETENCIA[c] }))}
            colunas={ETAPAS.map((e) => ({ chave: e, nome: NOME_ETAPA[e].split(" ")[0] }))}
            valor={(l, c) => { const v = celulas.get(`${l}|${c}`); return v ? { taxa: v.falhas / v.n, n: v.n } : null; }}
          />
        </Cartao>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Gestão do tempo" sub="Minutos em cada etapa nas últimas 10 tentativas.">
          <BarrasTempo dados={tempos} etapas={etapasUsadas.map((e) => ({ chave: e, nome: NOME_ETAPA[e] }))} />
        </Cartao>
        <Cartao titulo="Itens que você mais perde" sub="Frequência de falha por item do checklist.">
          {maisFalhados.length ? (
            <ul className="space-y-2 text-sm">
              {maisFalhados.map((m) => (
                <li key={m.caso + m.texto}>
                  <div className="flex justify-between gap-2"><span>{m.texto}</span><span className="shrink-0 tabular-nums font-semibold">{m.falhas}/{m.n}</span></div>
                  <p className="text-xs text-muted">{m.caso}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nenhum item perdido nas tentativas filtradas.</p>}
        </Cartao>
      </div>

      <Cartao titulo="Histórico" sub="Todos os atendimentos concluídos (filtrados).">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1.5">Data</th><th>Estação</th><th>Modo</th><th>Nota</th><th>Erros críticos</th><th /></tr></thead>
            <tbody>
              {[...dados].reverse().map(({ t, a }) => (
                <tr key={t.registro.id} className="border-t border-line">
                  <td className="whitespace-nowrap py-2">{new Date(t.registro.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="min-w-48">{t.caso.titulo}</td>
                  <td>{{ aprendizado: "Aprendizado", osce: "OSCE", emergencia: "Emergência" }[t.registro.modo]}</td>
                  <td className="tabular-nums font-semibold">{a.pct}% <span className="font-normal text-muted">({a.obtido}/{a.maximo})</span></td>
                  <td>{a.errosCriticos.length ? <span className="inline-flex items-center gap-1 text-danger"><AlertOctagon size={14} />{a.errosCriticos.length}</span> : "—"}</td>
                  <td><Link className="font-semibold text-accent" href={`/relatorio?id=${t.registro.id}`}>Relatório</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  );
}

function Cabecalho() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Desempenho</h1>
      <p className="text-sm text-muted">Calculado a partir das suas simulações neste dispositivo. Notas são estimativas do simulador.</p>
    </div>
  );
}

function Cartao({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="font-bold">{titulo}</h2>
      <p className="mb-3 text-xs text-muted">{sub}</p>
      {children}
    </section>
  );
}

function Numero({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-[11px] font-semibold text-muted">{rotulo}</p>
      <p className={`text-2xl font-bold tabular-nums ${alerta ? "text-danger" : ""}`}>{valor}</p>
    </div>
  );
}

function Segmentado<T extends string>({ valor, opcoes, onChange }: { valor: T; opcoes: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-0.5" role="radiogroup">
      {opcoes.map(([v, r]) => (
        <button key={v} role="radio" aria-checked={valor === v} onClick={() => onChange(v)} className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${valor === v ? "bg-navy text-white dark:bg-accent dark:text-accent-contrast" : "text-muted hover:text-ink"}`}>{r}</button>
      ))}
    </div>
  );
}
