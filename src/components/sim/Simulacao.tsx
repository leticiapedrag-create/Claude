"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Droplets, Eye, Hand, Lightbulb, MessageSquare, Pause, Play, Square, Target, Timer, Volume2, VolumeX, X } from "lucide-react";
import type { Caso, Etapa, Manobra } from "@/lib/caso/schema";
import { NOME_CENARIO } from "@/lib/caso/schema";
import { Sessao, type CampoDecisao, type Modo } from "@/lib/engine/sessao";
import { avaliar } from "@/lib/engine/avaliacao";
import { estadoClinico, formatarRelogio } from "@/lib/engine/emergencia";
import { armazenamento } from "@/lib/store/armazenamento";
import { useVoz } from "@/hooks/useVoz";
import { useArmazenamento } from "@/hooks/useArmazenamento";
import { BotaoConfirmar } from "@/components/ui/BotaoConfirmar";
import { estadoInicialCena, DURACAO_VISUAL, VISTA_DO_VISUAL, type AlvoInterativo, type Equipamento, type EstadoCena, type PontoVista } from "../three/tipos";
import { ICONES_ABA, PainelConversa, PainelDecisoes, PainelExame, PainelExames, PainelNihss } from "./paineis";

const Hospital = dynamic(() => import("../three/Hospital"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center bg-navy-950 text-sm text-white/70">Carregando o ambiente 3D…</div>,
});

type Aba = "exame" | "exames" | "nihss" | "decisoes";
const NOMES_ABA: Record<Aba, string> = { exame: "Exame físico", exames: "Exames", nihss: "NIHSS", decisoes: "Decisões" };
const NOME_MODO: Record<Modo, string> = { aprendizado: "Aprendizado", osce: "OSCE", emergencia: "Emergência" };

interface Aviso { id: number; texto: string; tipo: "ok" | "erro" | "info" }

export default function Simulacao() {
  const params = useSearchParams();
  const router = useRouter();
  const casoId = params.get("caso") ?? "";
  const modo = (params.get("modo") as Modo) || "osce";
  const foco = useMemo(() => (params.get("foco") ?? "").split(",").filter(Boolean), [params]);
  const { pronto, casos } = useArmazenamento();
  const caso = pronto ? casos.find((c) => c.id === casoId) ?? null : undefined;

  if (caso === undefined) return <div className="grid h-dvh place-items-center bg-navy-950 text-white/70">Preparando a estação…</div>;
  if (caso === null)
    return (
      <div className="grid h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-3">Caso não encontrado.</p>
          <Link href="/" className="botao-primario">Voltar ao hospital</Link>
        </div>
      </div>
    );
  return <Atendimento caso={caso} modo={modo === "emergencia" && !caso.evolucao ? "osce" : modo} foco={foco} onSair={(id) => router.push(id ? `/relatorio?id=${id}` : "/")} />;
}

function Atendimento({ caso, modo, foco, onSair }: { caso: Caso; modo: Modo; foco: string[]; onSair: (tentativaId?: string) => void }) {
  const [config] = useState(() => armazenamento.config());
  const [movimentoReduzido] = useState(() => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [sessao, setSessao] = useState(() => new Sessao(caso, modo, { foco, escalaClinica: config.escalaClinica }));
  const cena = useRef<EstadoCena>(estadoInicialCena(caso.sinaisVitais, caso.avatar.emocao));
  const [versao, setVersao] = useState(0);
  const atualizar = () => setVersao((v) => v + 1);

  const [fase, setFase] = useState<"porta" | "atendimento">("porta");
  const [vista, setVista] = useState<PontoVista>("porta");
  const [versaoVista, setVersaoVista] = useState(0);
  const irPara = (v: PontoVista) => { setVista(v); setVersaoVista((x) => x + 1); };
  const [conversaAberta, setConversaAberta] = useState(true);
  const [aba, setAba] = useState<Aba | null>(null);
  const [filtroEquip, setFiltroEquip] = useState<Equipamento | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [vozLigada, setVozLigada] = useState(config.vozPaciente);
  const [aguardandoIA, setAguardandoIA] = useState(false);
  const [iaDisponivel, setIaDisponivel] = useState(false);
  const [dica, setDica] = useState<string | null>(null);
  const [confirmarFim, setConfirmarFim] = useState(false);
  const encerrada = useRef(false);
  const cumpridosAntes = useRef(new Set<string>());
  const errosAntes = useRef(new Set<string>());
  const mensagensVistas = useRef(new Set<string>());
  const tempoLimiteSeg = (config.tempoEstacao[caso.id] ?? caso.duracaoMin) * 60;
  const aprendizado = modo === "aprendizado";
  const emergencia = modo === "emergencia";

  const avisar = useCallback((texto: string, tipo: Aviso["tipo"] = "info") => {
    const id = Math.random();
    setAvisos((a) => [...a.slice(-3), { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (!config.iaHabilitada) return;
    fetch("/api/paciente").then((r) => r.json()).then((d) => setIaDisponivel(!!d.disponivel)).catch(() => setIaDisponivel(false));
  }, [config.iaHabilitada]);

  // ------------------------------------------------------------ voz
  const voz = useVoz({
    onFinal: (t) => enviar(t, "voz"),
    onFalaInicio: () => { cena.current.falando = true; cena.current.pulsoFala = performance.now(); },
    onPalavra: () => { cena.current.pulsoFala = performance.now(); },
    onFalaFim: () => { cena.current.falando = false; },
  });

  const pacienteFala = useCallback((texto: string) => {
    const usouVoz = vozLigada && voz.falar(texto, caso.avatar.disartria ? 0.82 : 0.98);
    if (!usouVoz) cena.current.falandoAte = performance.now() + Math.min(9000, 600 + texto.length * 55);
  }, [vozLigada, voz, caso.avatar.disartria]);

  // ------------------------------------------------------------ retorno imediato (modo aprendizado)
  const verificarProgresso = useCallback(() => {
    const s = sessao;
    const a = avaliar(caso, s.r);
    for (const it of a.itens) {
      if (it.status === "cumprido" && !cumpridosAntes.current.has(it.item.id)) {
        cumpridosAntes.current.add(it.item.id);
        if (aprendizado) avisar(`✓ ${it.item.texto}`, "ok");
      }
    }
    for (const e of a.errosCriticos) {
      if (!errosAntes.current.has(e.id)) {
        errosAntes.current.add(e.id);
        if (aprendizado) avisar(`Erro crítico: ${e.texto}`, "erro");
      }
    }
  }, [caso, sessao, aprendizado, avisar]);

  // ------------------------------------------------------------ conversa
  const enviar = useCallback(async (texto: string, via: "texto" | "voz") => {
    const s = sessao;
    if (encerrada.current || s.pausado) return;
    const usarIA = config.iaHabilitada && iaDisponivel;
    const historico = s.r.eventos
      .filter((e) => e.tipo === "fala_aluno" || e.tipo === "fala_paciente")
      .slice(-20)
      .map((e) => ({ quem: e.tipo === "fala_aluno" ? ("aluno" as const) : ("paciente" as const), texto: (e as { texto: string }).texto }));
    const r = s.perguntar(texto, via, Date.now(), { adiarResposta: usarIA });
    atualizar();
    if (usarIA) {
      setAguardandoIA(true);
      try {
        const resp = await fetch("/api/paciente", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            paciente: { nome: caso.paciente.nome, idade: caso.paciente.idade, profissao: caso.paciente.profissao, personalidade: caso.paciente.personalidade, limitacoes: caso.paciente.limitacoes },
            fatos: caso.fatos.map((f) => ({ id: f.id, tema: f.tema, resposta: f.resposta })),
            historico,
            pergunta: texto,
          }),
        });
        if (!resp.ok) throw new Error(String(resp.status));
        const d = (await resp.json()) as { resposta: string; fatos_revelados: string[] };
        s.registrarRespostaIA(d.resposta, d.fatos_revelados);
        pacienteFala(d.resposta);
      } catch {
        s.responderComFicha(r.resposta, r.desconhecido);
        pacienteFala(r.resposta);
        avisar("IA indisponível: resposta pela ficha do caso.", "info");
      } finally {
        setAguardandoIA(false);
      }
    } else {
      pacienteFala(r.resposta);
    }
    atualizar();
    verificarProgresso();
  }, [caso, sessao, config.iaHabilitada, iaDisponivel, pacienteFala, verificarProgresso, avisar]);

  // ------------------------------------------------------------ ações
  const higienizar = () => {
    sessao.higienizar();
    irPara("pia");
    avisar("Mãos higienizadas com álcool em gel (20–30 s).", "info");
    atualizar();
    verificarProgresso();
    setTimeout(() => irPara("paciente"), 1800);
  };

  const executarManobra = (m: Manobra, tecnicaId: string) => {
    const s = sessao;
    if (!s.r.eventos.some((e) => e.tipo === "acao" && e.acao === "higiene") && aprendizado) avisar("Lembre-se: higienize as mãos antes de tocar o paciente.", "info");
    const r = s.examinar(m.id, tecnicaId);
    if (!r.valida) avisar(aprendizado && r.tecnica.explicacao ? `Técnica inadequada: ${r.tecnica.explicacao}` : "Técnica registrada.", aprendizado ? "erro" : "info");
    if (r.valida && m.visual) {
      cena.current.animacao = { tipo: m.visual, inicio: performance.now() };
      if (m.visual === "ferida") cena.current.feridaExposta = true;
      irPara(VISTA_DO_VISUAL[m.visual]);
      setTimeout(() => { if (cena.current.animacao.tipo === m.visual) cena.current.animacao = { tipo: null, inicio: 0 }; }, DURACAO_VISUAL[m.visual]);
    }
    if (m.provocaDor) cena.current.dorAte = performance.now() + 2600;
    if (["pa", "sat", "pulso", "sinais"].includes(m.id)) cena.current.monitorLigado = true;
    atualizar();
    verificarProgresso();
  };

  const solicitar = (id: string) => {
    const r = sessao.solicitar(id);
    if (emergencia && r.exame.categoria === "imagem") avisar(`Paciente levado para ${r.exame.nome} (+${r.exame.tempoMin} min de relógio clínico).`, "info");
    atualizar();
    verificarProgresso();
  };

  const decidir = (campo: CampoDecisao, opcoes: string[]) => {
    sessao.decidir(campo, opcoes);
    avisar("Decisão registrada.", "info");
    atualizar();
    verificarProgresso();
  };

  const selecionar3D = (alvo: AlvoInterativo) => {
    if (fase !== "atendimento") return;
    if (alvo === "pia") return higienizar();
    if (alvo === "monitor") return irPara("monitor");
    if (alvo === "paciente") {
      setFiltroEquip(null);
      setAba("exame");
      if (vista === "porta" || vista === "sala") irPara("paciente");
      return;
    }
    setFiltroEquip(alvo);
    setAba("exame");
  };

  const entrar = () => {
    const nova = new Sessao(caso, modo, { foco, escalaClinica: config.escalaClinica });
    setSessao(nova);
    nova.sistema(`Você entra: ${NOME_CENARIO[caso.cenario].toLowerCase()}.`);
    setFase("atendimento");
    irPara("paciente");
    setTimeout(() => {
      nova.responderComFicha(caso.paciente.falaInicial, false);
      pacienteFala(caso.paciente.falaInicial);
      atualizar();
    }, 1600);
  };

  const finalizar = (tempoEsgotado = false) => {
    if (encerrada.current) return;
    encerrada.current = true;
    voz.calar();
    const s = sessao;
    s.encerrar(Date.now(), tempoEsgotado);
    armazenamento.salvarTentativa({ registro: s.r, caso, revisoes: [], historicoRevisoes: [] });
    onSair(s.r.id);
  };

  const pausar = () => {
    const s = sessao;
    if (s.pausado) s.retomar();
    else s.pausar();
    voz.calar();
    atualizar();
  };

  // ------------------------------------------------------------ relógio e evolução clínica
  useEffect(() => {
    if (fase !== "atendimento") return;
    const id = setInterval(() => {
      const t = Date.now();
      setAgora(t);
      const s = sessao;
      const tc = s.relogioClinico(t);
      if (emergencia) {
        const est = estadoClinico(caso, s.r, tc);
        cena.current.sinais = est.sinais;
        cena.current.monitorLigado = true;
        const relogioReal = new Date(0, 0, 0, 10, 10 + Math.floor(tc));
        cena.current.relogio = `${String(relogioReal.getHours()).padStart(2, "0")}:${String(relogioReal.getMinutes()).padStart(2, "0")}`;
        for (const m of est.mensagens) {
          const chave = `${m.tc}|${m.texto}`;
          if (!mensagensVistas.current.has(chave)) {
            mensagensVistas.current.add(chave);
            s.sistema(`⏱ ${formatarRelogio(m.tc)} — ${m.texto}`, "decisao");
            avisar(m.texto, /piora|ultrapassad|encerrada/i.test(m.texto) ? "erro" : "info");
            setVersao((v) => v + 1);
          }
        }
      } else {
        const d = new Date();
        cena.current.relogio = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
      if (modo === "osce" && s.decorridoMs(t) / 1000 >= tempoLimiteSeg && !encerrada.current) {
        finalizar(true);
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, sessao, emergencia, modo, tempoLimiteSeg]);

  const pedirDica = () => {
    const s = sessao;
    const a = avaliar(caso, s.r);
    const pendentes = a.itens.filter((i) => i.status !== "cumprido" && i.item.criterio.tipo !== "manual");
    const focoPend = pendentes.filter((i) => foco.includes(i.item.id));
    const alvo = (focoPend[0] ?? pendentes[0])?.item;
    const etapa: Etapa = alvo?.etapa ?? "orientacoes";
    const texto = alvo ? alvo.comoFazer ?? caso.dicas[etapa]?.[0] ?? `Ainda falta: ${alvo.texto}` : "Você cumpriu os itens verificáveis. Revise as orientações e encerre.";
    s.registrarDica(texto, etapa);
    setDica(texto);
    atualizar();
  };

  // ------------------------------------------------------------ valores exibidos
  const s = sessao;
  const decorrido = s.decorridoMs(agora) / 1000;
  const restante = Math.max(0, tempoLimiteSeg - decorrido);
  const tc = s.relogioClinico(agora);
  const minutosDesdeInicio = caso.evolucao ? tc - caso.evolucao.inicioSintomasMin : 0;
  const itensFoco = foco.length ? caso.checklist.filter((i) => foco.includes(i.id)) : [];
  const avaliacaoFoco = itensFoco.length ? avaliar(caso, s.r) : null;
  void versao;

  const abas: Aba[] = ["exame", "exames", ...(caso.nihss?.length ? (["nihss"] as Aba[]) : []), "decisoes"];
  const vistas: PontoVista[] = ["porta", "paciente", "rosto", ...(caso.avatar.ferida !== "nenhuma" ? (["membro"] as PontoVista[]) : []), "bandeja", ...(caso.cenario !== "consultorio" ? (["monitor"] as PontoVista[]) : [])];

  return (
    <div className="fixed inset-0 overflow-hidden bg-navy-950 text-ink" data-testid="simulacao">
      <Hospital caso={caso} estado={cena} vista={vista} versaoVista={versaoVista} onSelecionar={selecionar3D} qualidade={config.qualidade} movimentoReduzido={movimentoReduzido} />

      {/* ---------------- barra superior */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3" style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}>
        <div className="vidro pointer-events-auto flex min-w-0 items-center gap-2 rounded-2xl px-2 py-1.5">
          {fase === "porta" ? (
            <button onClick={() => onSair()} className="rounded-lg p-2 hover:bg-surface-2" aria-label="Sair"><ArrowLeft size={18} /></button>
          ) : (
            <BotaoConfirmar onConfirmar={() => onSair()} className="rounded-lg p-2 text-[12px] font-semibold hover:bg-surface-2" pergunta="Sair sem salvar?" aria-label="Sair"><ArrowLeft size={18} /></BotaoConfirmar>
          )}
          <div className="min-w-0 pr-2">
            <p className="truncate text-sm font-bold leading-tight">{caso.titulo}</p>
            <p className="truncate text-[11px] text-muted">{NOME_CENARIO[caso.cenario]} · Modo {NOME_MODO[modo]}</p>
          </div>
        </div>
        {fase === "atendimento" && (
          <div className="vidro pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5">
            {emergencia ? (
              <div className="px-2 text-right" data-testid="relogio-clinico">
                <p className="font-mono text-lg font-bold leading-none tabular-nums">{formatarRelogio(tc)}</p>
                <p className={`text-[10px] font-semibold ${minutosDesdeInicio > 240 ? "text-danger" : "text-muted"}`}>{formatarRelogio(minutosDesdeInicio)} desde o início dos sintomas</p>
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 px-2 font-mono text-lg font-bold tabular-nums ${modo === "osce" && restante < 120 ? "text-danger" : ""}`} data-testid="cronometro">
                <Timer size={16} />
                {modo === "osce" ? formatarTempo(restante) : formatarTempo(decorrido)}
              </div>
            )}
            {modo !== "osce" && (
              <button onClick={pausar} className="rounded-lg p-2 hover:bg-surface-2" aria-label={s.pausado ? "Retomar" : "Pausar"}>{s.pausado ? <Play size={17} /> : <Pause size={17} />}</button>
            )}
            <button onClick={() => { setVozLigada(!vozLigada); voz.calar(); }} className="rounded-lg p-2 hover:bg-surface-2" aria-label={vozLigada ? "Silenciar paciente" : "Ativar voz do paciente"} title={voz.suporte.sintese ? "Voz do paciente" : "Síntese de voz indisponível"}>
              {vozLigada && voz.suporte.sintese ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          </div>
        )}
      </header>

      {/* ---------------- avisos */}
      <div className="pointer-events-none absolute left-1/2 top-20 z-40 flex w-[min(92vw,520px)] -translate-x-1/2 flex-col gap-1.5" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`rounded-xl px-3 py-2 text-sm font-medium shadow-lg ${a.tipo === "ok" ? "bg-ok text-white" : a.tipo === "erro" ? "bg-danger text-white" : "bg-navy text-white"}`}>{a.texto}</div>
        ))}
      </div>

      {fase === "porta" && <PortaEstacao caso={caso} modo={modo} tempoMin={tempoLimiteSeg / 60} foco={itensFoco.map((i) => i.texto)} onEntrar={entrar} />}

      {fase === "atendimento" && (
        <>
          {/* conversa */}
          {conversaAberta ? (
            <div className={`absolute inset-x-2 bottom-[4.75rem] z-20 h-[46dvh] sm:inset-x-auto sm:bottom-20 sm:left-3 sm:top-20 sm:h-auto sm:w-[360px] ${aba ? "max-sm:hidden" : ""}`}>
              <PainelConversa sessao={s} versao={versao} onEnviar={enviar} voz={voz} aguardando={aguardandoIA} iaAtiva={config.iaHabilitada && iaDisponivel} onFechar={() => setConversaAberta(false)} />
            </div>
          ) : (
            <button onClick={() => { setConversaAberta(true); if (window.matchMedia("(max-width: 639px)").matches) setAba(null); }} className="vidro absolute left-2 top-20 z-20 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold sm:left-3"><MessageSquare size={16} /> Conversa</button>
          )}

          {/* painel de ações */}
          <div className="absolute right-2 top-20 z-20 flex flex-col items-end gap-2 sm:right-3">
            <div className="vidro flex gap-1 rounded-2xl p-1">
              {abas.map((a) => {
                const Icone = ICONES_ABA[a];
                return (
                  <button key={a} onClick={() => { setAba(aba === a ? null : a); if (a !== "exame") setFiltroEquip(null); }} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold ${aba === a ? "bg-accent text-accent-contrast" : "hover:bg-surface-2"}`} aria-pressed={aba === a} aria-label={NOMES_ABA[a]}>
                    <Icone size={15} /> <span className="hidden sm:inline">{NOMES_ABA[a]}</span>
                  </button>
                );
              })}
            </div>
            {aba && (
              <div className="vidro overflow-y-auto rounded-2xl p-3 shadow-xl max-sm:fixed max-sm:inset-x-2 max-sm:bottom-[4.75rem] max-sm:max-h-[52dvh] sm:max-h-[calc(100dvh-11rem)] sm:w-[400px]" data-testid={`painel-${aba}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-bold">{NOMES_ABA[aba]}</h2>
                  <button onClick={() => setAba(null)} className="rounded-lg p-1.5 hover:bg-surface-2" aria-label="Fechar painel"><X size={16} /></button>
                </div>
                {aba === "exame" && <PainelExame caso={caso} sessao={s} versao={versao} filtro={filtroEquip} onLimparFiltro={() => setFiltroEquip(null)} onExecutar={executarManobra} />}
                {aba === "exames" && <PainelExames caso={caso} sessao={s} versao={versao} relogio={tc} onSolicitar={solicitar} />}
                {aba === "nihss" && <PainelNihss caso={caso} sessao={s} versao={versao} aprendizado={aprendizado} onRegistrar={(v) => { s.registrarNihss(v); avisar("NIHSS registrada.", "info"); atualizar(); verificarProgresso(); }} />}
                {aba === "decisoes" && <PainelDecisoes caso={caso} sessao={s} versao={versao} onRegistrar={decidir} />}
              </div>
            )}
            {itensFoco.length > 0 && !aba && (
              <div className="vidro w-[min(92vw,320px)] rounded-2xl p-3 text-[13px]" data-testid="painel-foco">
                <p className="mb-1 flex items-center gap-1.5 font-bold"><Target size={15} /> Foco: seus erros anteriores</p>
                <ul className="space-y-1">
                  {itensFoco.map((i) => {
                    const ok = avaliacaoFoco?.itens.find((x) => x.item.id === i.id)?.status === "cumprido";
                    return <li key={i.id} className={ok ? "text-ok line-through" : ""}>{i.texto}</li>;
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* barra inferior: navegação e ações */}
          <nav className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-2 sm:p-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
            <div className="vidro flex max-w-full items-center gap-1 rounded-2xl p-1.5">
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              {vistas.map((v) => (
                <button key={v} onClick={() => irPara(v)} className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-[13px] font-medium ${vista === v ? "bg-surface-2 font-semibold" : "hover:bg-surface-2"}`}>
                  <Eye size={14} className="opacity-60" /> {rotuloVista(v)}
                </button>
              ))}
              </div>
              <span className="mx-1 h-6 w-px shrink-0 bg-line" />
              <button onClick={higienizar} className="flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-[13px] font-semibold hover:bg-surface-2" data-testid="higienizar" aria-label="Higienizar as mãos"><Droplets size={15} /> <span className="max-sm:hidden">Higienizar</span></button>
              {aprendizado && <button onClick={pedirDica} className="flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-warn hover:bg-surface-2" aria-label="Dica"><Lightbulb size={15} /> <span className="max-sm:hidden">Dica</span></button>}
              <button onClick={() => setConfirmarFim(true)} className="botao-primario shrink-0 !py-2" data-testid="encerrar"><Square size={14} /> Encerrar</button>
            </div>
          </nav>

          {s.pausado && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/50">
              <div className="cartao p-6 text-center">
                <p className="mb-3 font-bold">Atendimento pausado</p>
                <button className="botao-primario" onClick={pausar}><Play size={16} /> Retomar</button>
              </div>
            </div>
          )}
          {dica && (
            <div className="absolute inset-x-0 bottom-24 z-30 mx-auto w-[min(92vw,480px)]">
              <div className="flex items-start gap-2 rounded-2xl bg-warn/95 p-3 text-sm font-medium text-white shadow-xl">
                <Lightbulb size={18} className="mt-0.5 shrink-0" /> <span className="flex-1">{dica}</span>
                <button onClick={() => setDica(null)} aria-label="Fechar dica"><X size={16} /></button>
              </div>
            </div>
          )}
          {confirmarFim && <ConfirmarEncerramento sessao={s} caso={caso} onCancelar={() => setConfirmarFim(false)} onConfirmar={() => finalizar(false)} onAbrirDecisoes={() => { setConfirmarFim(false); setAba("decisoes"); }} />}
        </>
      )}
      <Hand className="hidden" />
    </div>
  );
}

function rotuloVista(v: PontoVista) {
  return { porta: "Porta", sala: "Sala", paciente: "Paciente", rosto: "Rosto", membro: "Ferida", pia: "Pia", bandeja: "Bandeja", monitor: "Monitor" }[v];
}

function formatarTempo(seg: number) {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function PortaEstacao({ caso, modo, tempoMin, foco, onEntrar }: { caso: Caso; modo: Modo; tempoMin: number; foco: string[]; onEntrar: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-navy-950/55 p-4">
      <div className="vidro w-full max-w-xl rounded-3xl p-5 shadow-2xl sm:p-6" role="dialog" aria-label="Enunciado da estação">
        <p className="rotulo">{caso.area === "clinica" ? "Estação clínica" : "Estação de clínica cirúrgica"} · {caso.especialidade}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{caso.titulo}</h1>
        <p className="mt-3 text-[15px] leading-relaxed">{caso.enunciado}</p>
        <p className="rotulo mt-4">Tarefas</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-[14px]">{caso.tarefas.map((t) => <li key={t}>{t}</li>)}</ol>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl bg-surface-2 px-3 py-2"><p className="rotulo">Tempo</p>{modo === "osce" ? `${tempoMin} min (contagem regressiva)` : modo === "emergencia" ? "Relógio clínico: suas ações consomem tempo" : "Livre, com pausa"}</div>
          <div className="rounded-xl bg-surface-2 px-3 py-2"><p className="rotulo">Dicas</p>{modo === "aprendizado" ? "Disponíveis, com retorno imediato" : "Nenhuma durante a estação"}</div>
        </div>
        {foco.length > 0 && (
          <div className="mt-3 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-[13px]">
            <p className="font-semibold">Treino focado nos seus erros:</p>
            <ul className="list-disc pl-5">{foco.slice(0, 6).map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted">{caso.aviso} Navegue tocando/clicando nos equipamentos e na barra inferior; arraste para olhar em volta; no computador, WASD ou setas para andar.</p>
        <button onClick={onEntrar} className="botao-primario mt-4 w-full !py-3 text-base" data-testid="entrar">Entrar na sala</button>
      </div>
    </div>
  );
}

function ConfirmarEncerramento({ sessao, caso, onCancelar, onConfirmar, onAbrirDecisoes }: { sessao: Sessao; caso: Caso; onCancelar: () => void; onConfirmar: () => void; onAbrirDecisoes: () => void }) {
  const campos = (["hipotese", "conduta", "orientacoes"] as const).filter((c) => caso.decisoes[c].length);
  const registrados = new Set(sessao.r.eventos.filter((e) => e.tipo === "decisao").map((e) => (e as { campo: string }).campo));
  const faltando = campos.filter((c) => !registrados.has(c));
  const nomes = { hipotese: "hipótese diagnóstica", conduta: "conduta", orientacoes: "orientações" };
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl">
        <h2 className="text-lg font-bold">Encerrar o atendimento?</h2>
        {faltando.length > 0 ? (
          <p className="mt-2 text-sm text-warn">Você ainda não registrou: {faltando.map((f) => nomes[f]).join(", ")}. Itens não registrados não pontuam.</p>
        ) : (
          <p className="mt-2 text-sm text-muted">O checklist será aplicado e você verá o relatório.</p>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="botao" onClick={onCancelar}>Continuar atendendo</button>
          {faltando.length > 0 && <button className="botao" onClick={onAbrirDecisoes}>Registrar decisões</button>}
          <button className="botao-primario" onClick={onConfirmar} data-testid="confirmar-encerrar">Encerrar e avaliar</button>
        </div>
      </div>
    </div>
  );
}
