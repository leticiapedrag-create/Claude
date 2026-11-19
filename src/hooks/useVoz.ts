"use client";
/**
 * Voz pelo navegador (Web Speech API):
 * - reconhecimento de fala (Chrome, Edge e Safari/iPadOS — suporte varia);
 * - síntese de voz pt-BR para o paciente, com eventos de palavra para a boca do avatar.
 * Se o navegador não oferecer um dos recursos, a interface usa texto.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { NO_ARTEFATO, usarCapacidade } from "@/lib/plataforma";

/** Ditado do claude.ai (versão publicada): a plataforma segura o microfone e entrega o texto. */
interface Ditado {
  start(o?: { language?: string }): Promise<void>;
  stop(): Promise<void>;
  onPartial(h: (e: { text: string }) => void): () => void;
  onFinal(h: (e: { text: string }) => void): () => void;
  onState(h: (e: { state: string; reason?: string }) => void): () => void;
}

/* Tipos mínimos: a Web Speech API de reconhecimento não está no lib.dom padrão. */
interface ResultadoFala { isFinal: boolean; 0: { transcript: string } }
interface EventoFala { resultIndex: number; results: ArrayLike<ResultadoFala> }
interface Reconhecedor {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: EventoFala) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type CtorReconhecedor = new () => Reconhecedor;

function construtorReconhecimento(): CtorReconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: CtorReconhecedor; webkitSpeechRecognition?: CtorReconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoz(opts: {
  onFinal: (texto: string) => void;
  onFalaInicio?: () => void;
  onPalavra?: () => void;
  onFalaFim?: () => void;
}) {
  // Usado apenas em componentes montados no cliente.
  const [suporteNavegador] = useState(() => ({
    reconhecimento: !NO_ARTEFATO && !!construtorReconhecimento(),
    sintese: typeof window !== "undefined" && "speechSynthesis" in window,
  }));
  const [ditado, setDitado] = useState<Ditado | null>(null);
  const suporte = { reconhecimento: suporteNavegador.reconhecimento || !!ditado, sintese: suporteNavegador.sintese };
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const rec = useRef<Reconhecedor | null>(null);
  const cb = useRef(opts);
  useEffect(() => {
    cb.current = opts;
  });
  const voz = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const escolher = () => {
      const vozes = speechSynthesis.getVoices().filter((v) => /^pt[-_]BR/i.test(v.lang));
      voz.current = vozes.find((v) => /natural|premium|enhanced|neural|google/i.test(v.name)) ?? vozes[0] ?? null;
    };
    escolher();
    speechSynthesis.addEventListener("voiceschanged", escolher);
    return () => speechSynthesis.removeEventListener("voiceschanged", escolher);
  }, []);

  useEffect(() => {
    if (!NO_ARTEFATO) return;
    let vivo = true;
    const desligar: (() => void)[] = [];
    usarCapacidade<Ditado>("dictation").then((d) => {
      if (!vivo || !d) return;
      desligar.push(
        d.onPartial(({ text }) => setParcial(text)),
        d.onFinal(({ text }) => {
          setParcial("");
          if (text.trim()) cb.current.onFinal(text.trim());
          void d.stop().catch(() => {});
        }),
        d.onState(({ state, reason }) => {
          setOuvindo(state !== "idle");
          if (state === "idle" && reason && !["stopped", "viewer_stopped", "hidden"].includes(reason)) {
            setErro(reason === "not_granted" ? "Ditado não autorizado. Use o texto." : reason === "unavailable" ? "Ditado indisponível nesta visualização." : "Falha no ditado. Tente de novo ou use o texto.");
            if (reason === "not_granted" || reason === "unavailable") setDitado(null);
          }
        }),
      );
      setDitado(d);
    });
    return () => {
      vivo = false;
      desligar.forEach((f) => f());
    };
  }, []);

  const ouvir = useCallback(() => {
    if (ditado) {
      if (ouvindo) {
        void ditado.stop().catch(() => {});
        return;
      }
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      setErro(null);
      // start() precisa ser chamado direto do toque/clique, sem await antes.
      ditado.start({ language: "pt-BR" }).catch((e: { code?: string }) => {
        if (e?.code === "not_granted") setErro("Ditado não autorizado. Use o texto.");
        else if (e?.code && e.code !== "stopped" && e.code !== "dismissed") setErro("Ditado indisponível agora. Use o texto.");
      });
      return;
    }
    const Ctor = construtorReconhecimento();
    if (!Ctor) return;
    if (rec.current) {
      rec.current.stop();
      return;
    }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const r = new Ctor();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let texto = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        texto += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      setParcial(texto);
      if (final && texto.trim()) {
        setParcial("");
        cb.current.onFinal(texto.trim());
      }
    };
    r.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") setErro(e.error === "not-allowed" ? "Permissão do microfone negada." : `Erro no reconhecimento de voz (${e.error}).`);
    };
    r.onend = () => {
      rec.current = null;
      setOuvindo(false);
    };
    rec.current = r;
    setErro(null);
    setOuvindo(true);
    try {
      r.start();
    } catch {
      rec.current = null;
      setOuvindo(false);
    }
  }, [ditado, ouvindo]);

  const falar = useCallback((texto: string, ritmo = 1) => {
    if (!("speechSynthesis" in window)) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto.replace(/\(.*?\)/g, ""));
    u.lang = "pt-BR";
    u.rate = ritmo;
    if (voz.current) u.voice = voz.current;
    u.onstart = () => cb.current.onFalaInicio?.();
    u.onboundary = () => cb.current.onPalavra?.();
    u.onend = () => cb.current.onFalaFim?.();
    u.onerror = () => cb.current.onFalaFim?.();
    speechSynthesis.speak(u);
    return true;
  }, []);

  const calar = useCallback(() => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }, []);

  useEffect(() => () => {
    rec.current?.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
  }, []);

  return { suporte, ouvindo, parcial, erro, ouvir, falar, calar };
}
