"use client";
/** Gráficos de desempenho (Recharts). Todos recebem dados reais das tentativas. */
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const eixo = { fill: "var(--eixo)", fontSize: 12 };
const dica = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 13 },
  labelStyle: { color: "var(--text)", fontWeight: 600 },
  itemStyle: { color: "var(--text)" },
};
export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];

export function RadarCompetencias({ dados }: { dados: { nome: string; pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={dados} outerRadius="72%">
        <PolarGrid stroke="var(--grade)" />
        <PolarAngleAxis dataKey="nome" tick={{ ...eixo, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="pct" name="Aproveitamento (%)" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.18} dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
        <Tooltip {...dica} formatter={(v) => [`${v}%`, "Aproveitamento"]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function LinhaEvolucao({ dados, metaPct }: { dados: { rotulo: string; pct: number; caso: string }[]; metaPct: number }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados} margin={{ top: 12, right: 16, bottom: 4, left: -12 }}>
        <CartesianGrid stroke="var(--grade)" vertical={false} />
        <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={{ stroke: "var(--grade)" }} />
        <YAxis domain={[0, 100]} tick={eixo} tickLine={false} axisLine={false} unit="%" />
        <ReferenceLine y={metaPct} stroke="var(--eixo)" strokeDasharray="5 4" label={{ value: `Meta ${metaPct.toFixed(1)}%`, position: "insideTopRight", fill: "var(--eixo)", fontSize: 12 }} />
        <Tooltip {...dica} formatter={(v) => [`${v}%`, "Nota"]} labelFormatter={(_, p) => (p?.[0]?.payload as { caso?: string })?.caso ?? ""} />
        <Line type="monotone" dataKey="pct" name="Nota (%)" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarrasPorTema({ dados }: { dados: { tema: string; pct: number; n: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 52)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={10}>
        <CartesianGrid stroke="var(--grade)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={eixo} tickLine={false} axisLine={false} unit="%" />
        <YAxis type="category" dataKey="tema" tick={eixo} tickLine={false} axisLine={false} width={120} />
        <Tooltip {...dica} cursor={{ fill: "var(--surface-2)" }} formatter={(v, _n, p) => [`${v}% (${(p.payload as { n: number }).n} tentativa(s))`, "Média"]} />
        <Bar dataKey="pct" name="Média (%)" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} label={{ position: "right", fill: "var(--text)", fontSize: 12, formatter: (v: unknown) => `${v}%` }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarrasTempo({ dados, etapas }: { dados: Record<string, number | string>[]; etapas: { chave: string; nome: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 4, left: -8 }} barCategoryGap="28%">
        <CartesianGrid stroke="var(--grade)" vertical={false} />
        <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={{ stroke: "var(--grade)" }} />
        <YAxis tick={eixo} tickLine={false} axisLine={false} unit=" min" />
        <Tooltip {...dica} cursor={{ fill: "var(--surface-2)" }} formatter={(v, n) => [`${Number(v).toFixed(1)} min`, n]} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--text)" }} iconType="circle" iconSize={8} />
        {etapas.map((e, i) => (
          <Bar key={e.chave} dataKey={e.chave} name={e.nome} stackId="t" fill={SERIES[i % SERIES.length]} stroke="var(--surface)" strokeWidth={2} maxBarSize={44} isAnimationActive={false} radius={i === etapas.length - 1 ? [4, 4, 0, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Mapa de calor: taxa de falha (0–1) por competência × etapa. Escala sequencial de um matiz. */
export function MapaErros({ linhas, colunas, valor }: { linhas: { chave: string; nome: string }[]; colunas: { chave: string; nome: string }[]; valor: (l: string, c: string) => { taxa: number; n: number } | null }) {
  const cor = (t: number) => (t < 0.15 ? "var(--seq-100)" : t < 0.35 ? "var(--seq-250)" : t < 0.6 ? "var(--seq-400)" : t < 0.8 ? "var(--seq-550)" : "var(--seq-700)");
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-[12px]">
        <thead>
          <tr>
            <th />
            {colunas.map((c) => <th key={c.chave} className="px-1 pb-1 text-left font-medium text-muted">{c.nome}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave}>
              <th className="whitespace-nowrap pr-2 text-left font-medium text-muted">{l.nome}</th>
              {colunas.map((c) => {
                const v = valor(l.chave, c.chave);
                return (
                  <td key={c.chave} title={v ? `${l.nome} · ${c.nome}: ${Math.round(v.taxa * 100)}% de itens não cumpridos (${v.n} avaliações)` : "Sem itens"} className="h-9 min-w-14 rounded-md text-center font-semibold" style={{ background: v ? cor(v.taxa) : "transparent", color: v && v.taxa >= 0.6 ? "#fff" : "var(--text)", border: v ? "none" : "1px dashed var(--border)" }}>
                    {v ? `${Math.round(v.taxa * 100)}%` : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <span>menos falhas</span>
        {["--seq-100", "--seq-250", "--seq-400", "--seq-550", "--seq-700"].map((v) => <span key={v} className="h-3 w-6 rounded-sm" style={{ background: `var(${v})` }} />)}
        <span>mais falhas</span>
      </div>
    </div>
  );
}

export function MedidorMeta({ valor, meta, total, rotulo }: { valor: number; meta: number; total: number; rotulo: string }) {
  const pct = Math.min(100, (valor / total) * 100);
  const metaPct = (meta / total) * 100;
  const atingiu = valor >= meta;
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-4xl font-bold tabular-nums tracking-tight">{valor.toFixed(1)}<span className="text-lg font-semibold text-muted"> / {total}</span></p>
        <p className={`text-sm font-semibold ${atingiu ? "text-ok" : "text-muted"}`}>{atingiu ? "✓ Meta atingida" : `Faltam ${(meta - valor).toFixed(1)} pts`}</p>
      </div>
      <div className="relative mt-3 h-3 rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={valor} aria-label={rotulo}>
        <div className="h-3 rounded-full" style={{ width: `${pct}%`, background: "var(--series-1)" }} />
        <div className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `${metaPct}%` }} title={`Meta ${meta}`} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted"><span>0</span><span style={{ marginLeft: `${metaPct - 8}%` }}>meta {meta}</span><span>{total}</span></div>
    </div>
  );
}
