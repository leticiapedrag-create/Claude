"use client";
import * as THREE from "three";
import type { Sinais } from "@/lib/caso/schema";

/** Piso vinílico gerado em canvas (sem download de arquivos). */
export function texturaPiso(cor = "#d5dbe0") {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = cor;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  g.strokeStyle = "rgba(0,0,0,0.12)";
  g.lineWidth = 2;
  g.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(7, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Cartaz de parede com título e linhas de texto. */
export function texturaCartaz(titulo: string, linhas: string[], cor = "#0f766e") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 720;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fbfcfd";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = cor;
  g.fillRect(0, 0, c.width, 130);
  g.fillStyle = "#fff";
  g.font = "bold 40px system-ui, sans-serif";
  quebrar(g, titulo, 30, 75, 460, 44);
  g.fillStyle = "#1f2d3a";
  g.font = "28px system-ui, sans-serif";
  let y = 190;
  for (const l of linhas) {
    y = quebrar(g, "• " + l, 30, y, 450, 36) + 22;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function quebrar(g: CanvasRenderingContext2D, texto: string, x: number, y: number, larg: number, alt: number) {
  const palavras = texto.split(" ");
  let linha = "";
  for (const p of palavras) {
    const teste = linha ? linha + " " + p : p;
    if (g.measureText(teste).width > larg && linha) {
      g.fillText(linha, x, y);
      linha = p;
      y += alt;
    } else linha = teste;
  }
  g.fillText(linha, x, y);
  return y;
}

/** Monitor multiparamétrico: desenha sinais e traçado de ECG. Retorna função de atualização. */
export function criarMonitor() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  const textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  let fase = 0;
  const historico: number[] = new Array(220).fill(0);

  function atualizar(s: Sinais, ligado: boolean, dt: number) {
    g.fillStyle = "#03080d";
    g.fillRect(0, 0, c.width, c.height);
    if (!ligado) {
      g.fillStyle = "#3d5266";
      g.font = "22px system-ui, sans-serif";
      g.fillText("Monitor sem sensores conectados", 70, 165);
      textura.needsUpdate = true;
      return;
    }
    // traçado de ECG: ritmo irregular quando o caso define
    const irregular = /irreg/i.test(s.ritmo ?? "");
    const freq = (s.fc || 80) / 60;
    for (let i = 0; i < 3; i++) {
      fase += dt * freq * (irregular ? 0.7 + Math.random() * 0.8 : 1) / 3;
      const p = fase % 1;
      let v = 0;
      if (!irregular && p > 0.1 && p < 0.16) v = Math.sin(((p - 0.1) / 0.06) * Math.PI) * 0.12; // onda P
      if (p > 0.22 && p < 0.25) v = -0.15;
      if (p > 0.25 && p < 0.29) v = 1;
      if (p > 0.29 && p < 0.32) v = -0.3;
      if (p > 0.45 && p < 0.6) v = Math.sin(((p - 0.45) / 0.15) * Math.PI) * 0.22; // onda T
      if (irregular) v += (Math.random() - 0.5) * 0.06; // linha de base fibrilatória
      historico.push(v);
      historico.shift();
    }
    g.strokeStyle = "#38f28a";
    g.lineWidth = 3;
    g.beginPath();
    historico.forEach((v, i) => {
      const x = 12 + i * 1.5;
      const y = 85 - v * 55;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
    g.fillStyle = "#38f28a";
    g.font = "bold 64px system-ui, sans-serif";
    g.fillText(String(Math.round(s.fc)), 360, 90);
    g.font = "18px system-ui, sans-serif";
    g.fillText("FC bpm" + (irregular ? " • irreg" : ""), 362, 32);
    g.fillStyle = "#ff6b6b";
    g.font = "18px system-ui, sans-serif";
    g.fillText("PNI mmHg", 18, 175);
    g.font = "bold 50px system-ui, sans-serif";
    g.fillText(`${Math.round(s.paS)}/${Math.round(s.paD)}`, 18, 228);
    g.fillStyle = "#5ad1ff";
    g.font = "18px system-ui, sans-serif";
    g.fillText("SpO₂ %", 300, 175);
    g.font = "bold 50px system-ui, sans-serif";
    g.fillText(String(Math.round(s.sat)), 300, 228);
    g.fillStyle = "#f6e05e";
    g.font = "18px system-ui, sans-serif";
    g.fillText("FR irpm", 420, 175);
    g.font = "bold 40px system-ui, sans-serif";
    g.fillText(String(Math.round(s.fr)), 420, 225);
    g.fillStyle = "#c9d6e2";
    g.font = "20px system-ui, sans-serif";
    g.fillText(`T ${s.temp.toFixed(1)} °C`, 18, 290);
    textura.needsUpdate = true;
  }
  return { textura, atualizar };
}

/** Relógio de parede com texto (hora clínica no modo emergência). */
export function criarRelogio() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  let ultimo = "";
  function atualizar(texto: string) {
    if (texto === ultimo) return;
    ultimo = texto;
    g.fillStyle = "#fdfdfd";
    g.beginPath();
    g.arc(128, 128, 124, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#1c2833";
    g.lineWidth = 10;
    g.stroke();
    g.fillStyle = "#1c2833";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(128 + Math.sin(a) * 100 - 3, 128 - Math.cos(a) * 100 - 3, 6, 6);
    }
    g.font = "bold 46px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText(texto || "--:--", 128, 142);
    textura.needsUpdate = true;
  }
  return { textura, atualizar };
}
