"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Hospital, LayoutDashboard, ListChecks, Moon, Settings, Sun } from "lucide-react";
import { armazenamento } from "@/lib/store/armazenamento";
import { aplicarTema, useArmazenamento } from "@/hooks/useArmazenamento";

const LINKS = [
  { href: "/", rotulo: "Hospital", icone: Hospital },
  { href: "/simulado", rotulo: "Simulado", icone: ListChecks },
  { href: "/painel", rotulo: "Desempenho", icone: LayoutDashboard },
  { href: "/casos", rotulo: "Casos", icone: BookOpen },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const { config } = useArmazenamento();
  const alternarTema = () => {
    const t = document.documentElement.dataset.theme;
    const atual = t === "escuro" || t === "dark" ? "escuro" : "claro";
    const novo = atual === "escuro" ? "claro" : "escuro";
    armazenamento.salvarConfig({ ...config, tema: novo });
    aplicarTema(novo);
  };
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="nao-imprimir sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
          <Link href="/" className="mr-2 flex items-center gap-2 font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-navy text-white"><Activity size={18} /></span>
            <span className="hidden sm:inline">OSCE Immersive</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {LINKS.map(({ href, rotulo, icone: Icone }) => {
              const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href);
              return (
                <Link key={href} href={href} className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${ativo ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}>
                  <Icone size={16} /> <span className="hidden md:inline">{rotulo}</span>
                </Link>
              );
            })}
          </nav>
          <button onClick={alternarTema} className="botao px-2.5" aria-label="Alternar tema claro/escuro" title="Alternar tema">
            <Sun size={16} className="hidden dark:block" />
            <Moon size={16} className="dark:hidden" />
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="nao-imprimir border-t border-line px-4 py-4 text-center text-xs text-muted">
        Ferramenta de estudo. As notas são estimativas do simulador e não equivalem à avaliação de professores.
      </footer>
    </div>
  );
}
