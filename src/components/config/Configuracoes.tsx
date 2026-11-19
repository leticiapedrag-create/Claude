"use client";
import { useEffect, useState } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import { armazenamento } from "@/lib/store/armazenamento";
import { CONFIG_PADRAO, type ConfigProva } from "@/lib/store/config";
import { aplicarTema, useArmazenamento } from "@/hooks/useArmazenamento";

function Campo({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{rotulo}</span>
      {ajuda && <span className="block text-xs text-muted">{ajuda}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
const entrada = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm";

export default function Configuracoes() {
  const dados = useArmazenamento();
  if (!dados.pronto) return <p className="text-muted">Carregando…</p>;
  return <Formulario {...dados} />;
}

function Formulario({ config, casos, tentativas }: ReturnType<typeof useArmazenamento>) {
  const [c, setC] = useState<ConfigProva>(config);
  const [salvo, setSalvo] = useState(false);
  const [ia, setIa] = useState<{ disponivel: boolean; modelo?: string } | null>(null);
  useEffect(() => { fetch("/api/paciente").then((r) => r.json()).then(setIa).catch(() => setIa({ disponivel: false })); }, []);

  const somaValores = casos.reduce((s, k) => s + (c.valorEstacao[k.id] ?? 0), 0);
  const salvar = () => {
    armazenamento.salvarConfig(c);
    aplicarTema(c.tema);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };
  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted">Ajuste a prova ao longo da graduação. Tudo fica salvo neste dispositivo.</p>
      </div>

      <section className="cartao grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="font-bold sm:col-span-2 lg:col-span-3">Prova</h2>
        <Campo rotulo="Nome da prova"><input className={entrada} value={c.nomeProva} onChange={(e) => setC({ ...c, nomeProva: e.target.value })} /></Campo>
        <Campo rotulo="Pontuação total"><input className={entrada} inputMode="decimal" value={c.pontuacaoTotal} onChange={(e) => setC({ ...c, pontuacaoTotal: num(e.target.value) })} /></Campo>
        <Campo rotulo="Meta (pontos)"><input className={entrada} inputMode="decimal" value={c.meta} onChange={(e) => setC({ ...c, meta: num(e.target.value) })} data-testid="cfg-meta" /></Campo>
        <Campo rotulo="Número de estações"><input className={entrada} inputMode="numeric" value={c.numeroEstacoes} onChange={(e) => setC({ ...c, numeroEstacoes: Math.max(1, num(e.target.value)) })} /></Campo>
        <Campo rotulo="Estações clínicas"><input className={entrada} inputMode="numeric" value={c.estacoesClinicas} onChange={(e) => setC({ ...c, estacoesClinicas: num(e.target.value) })} /></Campo>
        <Campo rotulo="Estações cirúrgicas"><input className={entrada} inputMode="numeric" value={c.estacoesCirurgicas} onChange={(e) => setC({ ...c, estacoesCirurgicas: num(e.target.value) })} /></Campo>
        <p className="text-xs text-muted sm:col-span-2 lg:col-span-3">Meta atual: {c.meta} / {c.pontuacaoTotal} = {((c.meta / Math.max(1, c.pontuacaoTotal)) * 100).toFixed(1)}%.</p>
      </section>

      <section className="cartao p-5">
        <h2 className="font-bold">Valor e tempo de cada estação</h2>
        <p className="mb-3 text-xs text-muted">Deixe o valor em branco enquanto não tiver o checklist oficial: o simulador usa a divisão igual ({(c.pontuacaoTotal / Math.max(1, c.numeroEstacoes)).toFixed(2)} pts) e sinaliza a projeção como suposição.{somaValores > 0 && ` Soma informada: ${somaValores} pts.`}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1">Estação</th><th>Valor na prova (pts)</th><th>Tempo (min)</th></tr></thead>
            <tbody>
              {casos.map((k) => (
                <tr key={k.id} className="border-t border-line">
                  <td className="py-2 pr-3">{k.titulo}</td>
                  <td className="pr-3"><input className={`${entrada} w-28`} inputMode="decimal" placeholder="—" value={c.valorEstacao[k.id] ?? ""} onChange={(e) => { const v = { ...c.valorEstacao }; if (e.target.value === "") delete v[k.id]; else v[k.id] = num(e.target.value); setC({ ...c, valorEstacao: v }); }} /></td>
                  <td><input className={`${entrada} w-24`} inputMode="numeric" placeholder={String(k.duracaoMin)} value={c.tempoEstacao[k.id] ?? ""} onChange={(e) => { const v = { ...c.tempoEstacao }; if (e.target.value === "") delete v[k.id]; else v[k.id] = Math.max(1, num(e.target.value)); setC({ ...c, tempoEstacao: v }); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cartao grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Avaliação e simulação</h2>
        <Campo rotulo="Erros críticos" ajuda="Algumas bancas zeram a estação quando há erro crítico.">
          <select className={entrada} value={c.politicaErroCritico} onChange={(e) => setC({ ...c, politicaErroCritico: e.target.value as ConfigProva["politicaErroCritico"] })}>
            <option value="sinalizar">Apenas sinalizar</option>
            <option value="zerar">Zerar a estação</option>
          </select>
        </Campo>
        <Campo rotulo="Velocidade do relógio clínico (modo emergência)" ajuda="1 = tempo real. Exames de imagem somam o próprio tempo.">
          <select className={entrada} value={c.escalaClinica} onChange={(e) => setC({ ...c, escalaClinica: Number(e.target.value) })}>
            {[1, 2, 3, 5].map((v) => <option key={v} value={v}>{v}×</option>)}
          </select>
        </Campo>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={c.vozPaciente} onChange={(e) => setC({ ...c, vozPaciente: e.target.checked })} /> Paciente responde em voz alta (síntese do navegador)</label>
        <div className="text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={c.iaHabilitada} onChange={(e) => setC({ ...c, iaHabilitada: e.target.checked })} /> IA conversacional opcional</label>
          <p className="mt-1 text-xs text-muted">
            {ia === null ? "Verificando servidor…" : ia.disponivel ? `Disponível no servidor (${ia.modelo}). A IA só usa a ficha do caso; o que ela revela fica como "interpretação incerta" até revisão.` : "Indisponível: o servidor não tem ANTHROPIC_API_KEY. Sem ela, o paciente responde pela ficha do caso (modo determinístico)."}
          </p>
        </div>
        <Campo rotulo="Qualidade gráfica do 3D" ajuda="Use 'Economia' em iPads mais antigos. Com 'Reduzir movimento' ativo no sistema, a cena é atualizada poucas vezes por segundo.">
          <select className={entrada} value={c.qualidade} onChange={(e) => setC({ ...c, qualidade: e.target.value as ConfigProva["qualidade"] })}>
            <option value="alta">Alta</option>
            <option value="equilibrada">Equilibrada</option>
            <option value="economia">Economia de bateria</option>
          </select>
        </Campo>
        <Campo rotulo="Tema">
          <select className={entrada} value={c.tema} onChange={(e) => setC({ ...c, tema: e.target.value as ConfigProva["tema"] })}>
            <option value="sistema">Seguir o sistema</option>
            <option value="claro">Claro</option>
            <option value="escuro">Escuro</option>
          </select>
        </Campo>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="botao-primario" onClick={salvar} data-testid="cfg-salvar"><Save size={16} /> {salvo ? "Salvo!" : "Salvar configurações"}</button>
        <button className="botao" onClick={() => setC(CONFIG_PADRAO)}>Restaurar padrão (HAM V)</button>
      </div>

      <section className="cartao flex flex-wrap items-center gap-2 p-5">
        <h2 className="w-full font-bold">Dados</h2>
        <p className="w-full text-xs text-muted">{tentativas.length} atendimento(s) salvos neste navegador. Faça backup antes de limpar o navegador ou trocar de aparelho.</p>
        <button className="botao" onClick={() => { const url = URL.createObjectURL(new Blob([armazenamento.exportarTudo()], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "osce-backup.json"; a.click(); }}><Download size={16} /> Exportar backup</button>
        <button className="botao text-danger" onClick={() => confirm("Apagar todo o histórico de atendimentos?") && armazenamento.limparTentativas()}><Trash2 size={16} /> Apagar histórico</button>
      </section>
    </div>
  );
}
