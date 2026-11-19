import { Shell } from "@/components/ui/Shell";
import Configuracoes from "@/components/config/Configuracoes";

export const metadata = { title: "Configurações — OSCE Immersive" };

export default function Page() {
  return (
    <Shell>
      <Configuracoes />
    </Shell>
  );
}
