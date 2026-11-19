import { useMemo } from "react";
import { navegar, useRota } from "./roteador";

export function usePathname() {
  return useRota().caminho;
}
export function useSearchParams() {
  const { busca } = useRota();
  return useMemo(() => new URLSearchParams(busca), [busca]);
}
export function useRouter() {
  return { push: navegar, replace: navegar, back: () => navegar("/"), refresh: () => {}, prefetch: () => {} };
}
