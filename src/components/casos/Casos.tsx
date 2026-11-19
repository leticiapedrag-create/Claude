"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Download, FileUp, Pencil, Save, Trash2, Upload } from "lucide-react";
import { NOME_CENARIO, NOME_COMPETENCIA, NOME_ETAPA, validarCaso, type Caso } from "@/lib/caso/schema";
import { armazenamento } from "@/lib/store/armazenamento";
import { useArmazenamento } from "@/hooks/useArmazenamento";
import { CASOS_EMBUTIDOS } from "@/data/casos";
import { salvarArquivo } from "@/lib/plataforma";
import { BotaoConfirmar } from "@/components/ui/BotaoConfirmar";

function baixar(nome: string, conteudo: string) {
  void salvarArquivo(nome, conteudo);
}

export default function Casos() {
  const id = useSearchParams().get("id");
  const { casos } = useArmazenamento();
  const [erros, setErros] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const caso = id ? casos.find((c) => c.id === id) : null;
  if (caso) return <Detalhe caso={caso} />;

  const importar = async (f: File) => {
    setErros([]);
    setMsg(null);
    try {
      const dado = JSON.parse(await f.text());
      const lista = Array.isArray(dado) ? dado : [dado];
      const todos: string[] = [];
      let ok = 0;
      for (const item of lista) {
        const r = validarCaso(item);
        if (r.ok) { armazenamento.salvarCaso({ ...r.caso, aviso: r.caso.aviso }); ok++; }
        else todos.push(...r.erros.slice(0, 20).map((e) => `${(item as { id?: string })?.id ?? "caso"}: ${e}`));
      }
      setErros(todos);
      if (ok) setMsg(`${ok} caso(s) importado(s).`);
    } catch {
      setErros(["Arquivo não é um JSON válido."]);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biblioteca de casos</h1>
          <p className="text-sm text-muted">Casos demonstrativos editáveis. Importe seus roteiros e checklists em JSON.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="botao" onClick={() => baixar("modelo-caso-osce.json", JSON.stringify(CASOS_EMBUTIDOS[0], null, 2))}><Download size={16} /> Baixar modelo</button>
          <button className="botao-primario" onClick={() => arquivo.current?.click()}><Upload size={16} /> Importar JSON</button>
          <input ref={arquivo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} data-testid="importar" />
        </div>
      </div>
      {msg && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">{msg}</p>}
      {erros.length > 0 && (
        <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          <p className="font-semibold">Problemas na importação:</p>
          <ul className="list-disc pl-5">{erros.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      <div className="cartao divide-y divide-line">
        {casos.map((c) => (
          <Link key={c.id} href={`/casos?id=${c.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.titulo}</p>
              <p className="text-xs text-muted">{c.area === "clinica" ? "Clínica" : "Cirúrgica"} · {c.especialidade} · {c.tema} · {NOME_CENARIO[c.cenario]} · {c.checklist.reduce((s, i) => s + i.pontos, 0)} pts no checklist</p>
            </div>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{armazenamento.ehPersonalizado(c.id) ? "personalizado" : "embutido"} · {c.revisao.status.replaceAll("_", " ")}</span>
          </Link>
        ))}
      </div>
      <div className="cartao p-5 text-sm">
        <h2 className="mb-1 font-bold">Formato de importação</h2>
        <p className="text-muted">Baixe o modelo, edite e importe. O arquivo é validado: ids de fatos, manobras, exames e opções citados no checklist precisam existir. Critérios aceitos: <code>fatos</code>, <code>intencao</code>, <code>acao</code>, <code>decisao</code>, <code>sequencia</code>, <code>nihss</code> e <code>manual</code> (sempre exige revisão humana). Um caso importado com o mesmo id de um embutido o substitui neste dispositivo.</p>
        <p className="mt-2 text-muted">A biblioteca cobre os 32 assuntos da lista do 5º período (HAM 5 Práticas): 16 clínicos e 16 cirúrgicos, com ao menos uma estação por assunto, além dos temas do resumo de OSCE HAM V. Os casos são demonstrativos; não são estações oficiais.</p>
      </div>
    </div>
  );
}

function Secao({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="mb-2 font-bold"><span className="mr-2 text-muted">{n}.</span>{titulo}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Detalhe({ caso }: { caso: Caso }) {
  const [editor, setEditor] = useState<string | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [rev, setRev] = useState(caso.revisao);
  const personalizado = armazenamento.ehPersonalizado(caso.id);
  const s = caso.sinaisVitais;

  const salvarEdicao = () => {
    try {
      const r = validarCaso(JSON.parse(editor ?? ""));
      if (!r.ok) return setErros(r.erros);
      armazenamento.salvarCaso({ ...r.caso, versao: Math.max(r.caso.versao, caso.versao + 1) });
      setEditor(null);
      setErros([]);
    } catch {
      setErros(["JSON inválido."]);
    }
  };

  return (
    <div className="space-y-4" data-testid="ficha-caso">
      <Link href="/casos" className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><ArrowLeft size={15} /> Biblioteca</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="rotulo">{caso.area === "clinica" ? "Clínica" : "Cirúrgica"} · {caso.especialidade} · versão {caso.versao}</p>
          <h1 className="text-2xl font-bold tracking-tight">{caso.titulo}</h1>
          <p className="text-sm text-muted">{caso.aviso}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="botao" onClick={() => baixar(`${caso.id}.json`, JSON.stringify(caso, null, 2))}><Download size={16} /> Exportar</button>
          <button className="botao" onClick={() => setEditor(JSON.stringify(caso, null, 2))}><Pencil size={16} /> Editar JSON</button>
          {personalizado && <BotaoConfirmar className="botao text-danger" onConfirmar={() => armazenamento.removerCasoPersonalizado(caso.id)}><Trash2 size={16} /> Remover personalização</BotaoConfirmar>}
          <Link className="botao-primario" href={`/simulacao?caso=${caso.id}&modo=osce`}>Simular</Link>
        </div>
      </div>

      {editor !== null && (
        <section className="cartao space-y-2 p-4">
          <p className="text-sm text-muted">Edite e salve. A edição fica como versão personalizada neste dispositivo; o original embutido permanece disponível ao remover a personalização.</p>
          <textarea value={editor} onChange={(e) => setEditor(e.target.value)} className="h-96 w-full rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs" spellCheck={false} />
          {erros.length > 0 && <ul className="list-disc rounded-xl bg-danger/10 py-2 pl-8 pr-3 text-sm text-danger">{erros.slice(0, 15).map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="flex gap-2"><button className="botao-primario" onClick={salvarEdicao}><Save size={16} /> Validar e salvar</button><button className="botao" onClick={() => { setEditor(null); setErros([]); }}>Cancelar</button></div>
        </section>
      )}

      <section className="cartao flex flex-wrap items-end gap-3 p-4 text-sm">
        <div><p className="rotulo mb-1">Revisão do conteúdo clínico</p>
          <select value={rev.status} onChange={(e) => setRev({ ...rev, status: e.target.value as Caso["revisao"]["status"] })} className="rounded-lg border border-line bg-surface px-2 py-2">
            <option value="rascunho">Rascunho</option>
            <option value="revisado_por_aluno">Revisado por aluno</option>
            <option value="revisado_por_docente">Revisado por docente</option>
          </select>
        </div>
        <input placeholder="Revisor" value={rev.revisor ?? ""} onChange={(e) => setRev({ ...rev, revisor: e.target.value })} className="rounded-lg border border-line bg-surface px-2.5 py-2" />
        <input placeholder="Notas da revisão" value={rev.notas ?? ""} onChange={(e) => setRev({ ...rev, notas: e.target.value })} className="min-w-48 flex-1 rounded-lg border border-line bg-surface px-2.5 py-2" />
        <button className="botao" onClick={() => armazenamento.salvarCaso({ ...caso, revisao: { ...rev, data: new Date().toISOString() } })}><FileUp size={16} /> Salvar revisão</button>
      </section>

      <Secao n={1} titulo="Identificação do paciente">{caso.paciente.nome}, {caso.paciente.idade} anos, {caso.paciente.sexo === "M" ? "masculino" : "feminino"}. {caso.paciente.profissao} {caso.paciente.acompanhante && `Acompanhante: ${caso.paciente.acompanhante}.`}</Secao>
      <Secao n={2} titulo="História da doença atual">{caso.ficha.hda}</Secao>
      <Secao n={3} titulo="Antecedentes">{caso.ficha.antecedentes}</Secao>
      <Secao n={4} titulo="Medicamentos">{caso.ficha.medicamentos}</Secao>
      <Secao n={5} titulo="Sinais vitais">PA {s.paS}x{s.paD} mmHg · FC {s.fc} bpm ({s.ritmo}) · FR {s.fr} irpm · SatO₂ {s.sat}% · T {s.temp} °C{s.glasgow ? ` · Glasgow ${s.glasgow}` : ""}</Secao>
      <Secao n={6} titulo="Achados clínicos">
        <p>{caso.ficha.achadosClinicos}</p>
        <details className="mt-2"><summary className="cursor-pointer font-semibold">Manobras e achados ({caso.manobras.length})</summary>
          <ul className="mt-1 list-disc pl-5">{caso.manobras.map((m) => <li key={m.id}><strong>{m.nome}</strong> ({m.visual ? "representado em 3D" : "achado estruturado"}): {m.achado}</li>)}</ul>
        </details>
        <details className="mt-1"><summary className="cursor-pointer font-semibold">Ficha de falas do paciente ({caso.fatos.length})</summary>
          <ul className="mt-1 list-disc pl-5">{caso.fatos.map((f) => <li key={f.id}><strong>{f.tema}:</strong> {f.resposta}</li>)}</ul>
          <p className="mt-1 text-muted">Fora da ficha: “{caso.paciente.respostaDesconhecida[0]}”. Limitações: {caso.paciente.limitacoes.join("; ") || "—"}</p>
        </details>
      </Secao>
      <Secao n={7} titulo="Exames disponíveis"><ul className="list-disc pl-5">{caso.exames.map((e) => <li key={e.id}><strong>{e.nome}</strong>{!e.indicado && " (não indicado)"}: {e.resultado}</li>)}</ul></Secao>
      <Secao n={8} titulo="Diagnóstico esperado">{caso.ficha.diagnostico}</Secao>
      <Secao n={9} titulo="Diagnósticos diferenciais"><ul className="list-disc pl-5">{caso.ficha.diferenciais.map((d) => <li key={d.nome}><strong>{d.nome}:</strong> {d.comoAfastar}</li>)}</ul></Secao>
      <Secao n={10} titulo="Conduta">{caso.ficha.conduta}</Secao>
      <Secao n={11} titulo="Orientações">{caso.ficha.orientacoes}</Secao>
      <Secao n={12} titulo="Sinais de alerta"><ul className="list-disc pl-5">{caso.ficha.sinaisAlerta.map((x) => <li key={x}>{x}</li>)}</ul></Secao>
      <Secao n={13} titulo={`Checklist avaliativo (${caso.checklist.reduce((s, i) => s + i.pontos, 0)} pts)`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1">Item</th><th>Competência</th><th>Etapa</th><th>Critério</th><th className="text-right">Pts</th></tr></thead>
            <tbody>{caso.checklist.map((i) => <tr key={i.id} className="border-t border-line"><td className="py-1.5 pr-2">{i.texto}</td><td className="pr-2">{NOME_COMPETENCIA[i.competencia]}</td><td className="pr-2">{NOME_ETAPA[i.etapa]}</td><td className="pr-2 text-xs text-muted">{i.criterio.tipo}</td><td className="text-right tabular-nums">{i.pontos}</td></tr>)}</tbody>
          </table>
        </div>
      </Secao>
      <Secao n={14} titulo="Critérios de erros críticos"><ul className="list-disc pl-5">{caso.errosCriticos.map((e) => <li key={e.id}><strong>{e.texto}:</strong> {e.explicacao}</li>)}</ul></Secao>
      <Secao n={15} titulo="Referências"><ul className="list-disc pl-5">{caso.ficha.referencias.map((r) => <li key={r.citacao}>{r.citacao} {r.url && <a className="text-accent underline" href={r.url} target="_blank" rel="noreferrer">link</a>}</li>)}</ul><p className="mt-2 text-muted">Revisão: {caso.revisao.status.replaceAll("_", " ")}{caso.revisao.revisor ? ` por ${caso.revisao.revisor}` : ""}{caso.revisao.notas ? ` — ${caso.revisao.notas}` : ""}</p></Secao>
    </div>
  );
}
