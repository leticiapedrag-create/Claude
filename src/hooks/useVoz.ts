"use client";
/**
 * Voz pelo navegador (Web Speech API):
 * - reconhecimento de fala (Chrome, Edge e Safari/iPadOS — suporte varia);
 * - síntese de voz pt-BR para o paciente, com eventos de palavra para a boca do avatar.
 * Se o navegador não oferecer um dos recursos, a interface usa texto.
 */
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [suporte] = useState(() => ({
    reconhecimento: !!construtorReconhecimento(),
    sintese: typeof window !== "undefined" && "speechSynthesis" in window,
  }));
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

  const ouvir = useCallback(() => {
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
  }, []);

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
