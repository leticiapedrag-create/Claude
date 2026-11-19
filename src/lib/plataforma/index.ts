/**
 * Diferenças entre a versão instalada (Next.js) e a versão publicada como página
 * única (artifact do claude.ai), onde impressão, downloads diretos, confirm() e
 * o microfone do navegador não estão disponíveis.
 */
export const NO_ARTEFATO = process.env.NEXT_PUBLIC_ARTEFATO === "1";

type Capacidades = { use?: (nome: string) => Promise<unknown> };

export function usarCapacidade<T>(nome: string): Promise<T | null> {
  if (!NO_ARTEFATO || typeof window === "undefined") return Promise.resolve(null);
  const c = (window as unknown as { claude?: Capacidades }).claude;
  return c?.use ? (c.use(nome) as Promise<T | null>).catch(() => null) : Promise.resolve(null);
}

/** Oferece um arquivo para o usuário salvar. Retorna false se não foi possível. */
export async function salvarArquivo(nome: string, conteudo: string, tipo = "application/json"): Promise<boolean> {
  if (NO_ARTEFATO) {
    const d = await usarCapacidade<{ save: (r: { filename: string; data: string }) => Promise<unknown> }>("downloads");
    if (!d) return false;
    try {
      await d.save({ filename: nome, data: conteudo });
      return true;
    } catch {
      return false;
    }
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
