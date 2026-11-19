"use client";
import { useEffect, useState } from "react";
import { armazenamento } from "@/lib/store/armazenamento";
import { CONFIG_PADRAO, type ConfigProva } from "@/lib/store/config";
import type { Simulado, Tentativa } from "@/lib/store/armazenamento";
import type { Caso } from "@/lib/caso/schema";
import { CASOS_EMBUTIDOS } from "@/data/casos";

interface Estado {
  pronto: boolean;
  config: ConfigProva;
  tentativas: Tentativa[];
  casos: Caso[];
  simulados: Simulado[];
}

function ler(): Estado {
  return { pronto: true, config: armazenamento.config(), tentativas: armazenamento.tentativas(), casos: armazenamento.todosCasos(), simulados: armazenamento.simulados() };
}

/** Lê os dados locais depois da montagem e atualiza quando outra parte do app grava. */
export function useArmazenamento(): Estado {
  const [estado, setEstado] = useState<Estado>({ pronto: false, config: CONFIG_PADRAO, tentativas: [], casos: CASOS_EMBUTIDOS, simulados: [] });
  useEffect(() => {
    const atualizar = () => setEstado(ler());
    atualizar();
    window.addEventListener("osce-store", atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener("osce-store", atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return estado;
}

export function aplicarTema(tema: ConfigProva["tema"]) {
  const t = tema === "sistema" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro") : tema;
  document.documentElement.dataset.theme = t;
}
