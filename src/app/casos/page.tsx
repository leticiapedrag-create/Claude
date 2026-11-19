import { Suspense } from "react";
import { Shell } from "@/components/ui/Shell";
import Casos from "@/components/casos/Casos";

export const metadata = { title: "Casos — OSCE Immersive" };

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Casos />
      </Suspense>
    </Shell>
  );
}
