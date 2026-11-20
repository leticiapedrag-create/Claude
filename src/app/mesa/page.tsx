import { Shell } from "@/components/ui/Shell";
import MesaCirurgica from "@/components/mesa/MesaCirurgica";

export const metadata = { title: "Mesa cirúrgica — OSCE Immersive" };

export default function Page() {
  return (
    <Shell>
      <MesaCirurgica />
    </Shell>
  );
}
