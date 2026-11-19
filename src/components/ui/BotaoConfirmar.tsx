"use client";
import { useEffect, useState } from "react";

/** Confirmação em dois toques, sem depender de confirm() (bloqueado em algumas visualizações). */
export function BotaoConfirmar({ onConfirmar, children, pergunta = "Toque de novo para confirmar", className = "botao", ...resto }: { onConfirmar: () => void; children: React.ReactNode; pergunta?: string; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);
  return (
    <button {...resto} className={`${className} ${armado ? "!border-danger !text-danger" : ""}`} onClick={() => (armado ? (setArmado(false), onConfirmar()) : setArmado(true))}>
      {armado ? pergunta : children}
    </button>
  );
}
