import { Suspense } from "react";
import { Shell } from "@/components/ui/Shell";
import Simulado from "@/components/simulado/Simulado";

export const metadata = { title: "Simulado de prova — OSCE Immersive" };

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Simulado />
      </Suspense>
    </Shell>
  );
}
