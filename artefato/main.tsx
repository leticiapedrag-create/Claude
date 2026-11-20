/** Ponto de entrada da versão de página única (publicada como artifact). */
import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import { Shell } from "@/components/ui/Shell";
import Inicio from "@/components/inicio/Inicio";
import Simulacao from "@/components/sim/Simulacao";
import Relatorio from "@/components/relatorio/Relatorio";
import Painel from "@/components/painel/Painel";
import Casos from "@/components/casos/Casos";
import Configuracoes from "@/components/config/Configuracoes";
import Simulado from "@/components/simulado/Simulado";
import MesaCirurgica from "@/components/mesa/MesaCirurgica";
import { useRota } from "./shims/roteador";

function App() {
  const { caminho } = useRota();
  if (caminho === "/simulacao") return <Simulacao />;
  const pagina =
    caminho === "/relatorio" ? <Relatorio /> :
    caminho === "/painel" ? <Painel /> :
    caminho === "/casos" ? <Casos /> :
    caminho === "/configuracoes" ? <Configuracoes /> :
    caminho === "/simulado" ? <Simulado /> :
    caminho === "/mesa" ? <MesaCirurgica /> :
    <Inicio />;
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>{pagina}</Suspense>
    </Shell>
  );
}

createRoot(document.getElementById("raiz")!).render(<App />);
