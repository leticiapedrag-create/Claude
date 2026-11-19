import type { AnchorHTMLAttributes, ReactNode } from "react";
import { navegar } from "./roteador";

export default function Link({ href, children, onClick, ...resto }: { href: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...resto}
      href="#"
      data-href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        navegar(href);
      }}
    >
      {children}
    </a>
  );
}
