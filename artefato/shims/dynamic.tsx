import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

export default function dynamic<P extends object>(carregar: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>, opts: { loading?: () => ReactNode } = {}) {
  const Preguicoso = lazy(async () => {
    const m = await carregar();
    return "default" in (m as object) ? (m as { default: ComponentType<P> }) : { default: m as ComponentType<P> };
  });
  return function Dinamico(props: P) {
    return (
      <Suspense fallback={opts.loading ? opts.loading() : null}>
        <Preguicoso {...props} />
      </Suspense>
    );
  };
}
