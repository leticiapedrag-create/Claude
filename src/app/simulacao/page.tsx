import { Suspense } from "react";
import Simulacao from "@/components/sim/Simulacao";

export const metadata = { title: "Atendimento — OSCE Immersive" };

export default function Page() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center bg-navy-950 text-white/70">Preparando a estação…</div>}>
      <Simulacao />
    </Suspense>
  );
}
