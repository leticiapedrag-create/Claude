/** Roteador em memória para a versão de página única (sem servidor Next.js). */
import { useSyncExternalStore } from "react";

type Rota = { caminho: string; busca: string };
let atual: Rota = { caminho: "/", busca: "" };
const ouvintes = new Set<() => void>();

export function navegar(href: string) {
  const [caminho, busca = ""] = href.split("?");
  atual = { caminho: caminho || "/", busca };
  ouvintes.forEach((f) => f());
  window.scrollTo(0, 0);
}

export function useRota(): Rota {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
    () => atual,
  );
}
