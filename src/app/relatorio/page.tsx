import { Suspense } from "react";
import { Shell } from "@/components/ui/Shell";
import Relatorio from "@/components/relatorio/Relatorio";

export const metadata = { title: "Relatório da estação — OSCE Immersive" };

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted">Carregando relatório…</p>}>
        <Relatorio />
      </Suspense>
    </Shell>
  );
}
