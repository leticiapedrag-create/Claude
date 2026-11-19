"use client";
/**
 * Câmera em primeira pessoa: pontos de vista predefinidos (toque/clique),
 * olhar livre arrastando, e WASD/setas para caminhar no computador.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { POSICAO_PACIENTE, SALA } from "./Sala";
import type { PontoVista } from "./tipos";

const [px, py, pz] = POSICAO_PACIENTE;
const CABECA = new THREE.Vector3(px, py + 0.12 + 0.66 + 0.12, pz);

export const VISTAS: Record<PontoVista, { pos: THREE.Vector3; alvo: THREE.Vector3; rotulo: string }> = {
  porta: { pos: new THREE.Vector3(-1.2, 1.65, 3.4), alvo: new THREE.Vector3(0, 1.2, pz), rotulo: "Porta" },
  sala: { pos: new THREE.Vector3(0.9, 1.65, 1.2), alvo: new THREE.Vector3(0, 1.25, pz), rotulo: "Sala" },
  paciente: { pos: new THREE.Vector3(0.12, 1.6, pz + 1.35), alvo: new THREE.Vector3(0, 1.2, pz), rotulo: "Paciente" },
  rosto: { pos: new THREE.Vector3(0, CABECA.y + 0.02, pz + 0.55), alvo: CABECA.clone(), rotulo: "Rosto" },
  membro: { pos: new THREE.Vector3(0.45, 1.45, pz + 0.75), alvo: new THREE.Vector3(0.18, 0.85, pz + 0.2), rotulo: "Membro" },
  pia: { pos: new THREE.Vector3(-1.9, 1.62, 0.3), alvo: new THREE.Vector3(-SALA.largura / 2, 1.0, 0.3), rotulo: "Pia" },
  bandeja: { pos: new THREE.Vector3(0.95, 1.6, -0.35), alvo: new THREE.Vector3(0.95, 0.8, -1.35), rotulo: "Bandeja" },
  monitor: { pos: new THREE.Vector3(-0.6, 1.62, -1.6), alvo: new THREE.Vector3(-1.05, 1.62, -2.6), rotulo: "Monitor" },
};

export function CameraRig({ vista, versao, instantaneo = false }: { vista: PontoVista; versao: number; instantaneo?: boolean }) {
  const { camera, gl, invalidate } = useThree();
  const destino = useRef({ pos: VISTAS.porta.pos.clone(), alvo: VISTAS.porta.alvo.clone() });
  const olhar = useRef({ yaw: 0, pitch: 0, arrastando: false, x: 0, y: 0, moveu: 0 });
  const teclas = useRef(new Set<string>());

  useEffect(() => {
    destino.current.pos.copy(VISTAS[vista].pos);
    destino.current.alvo.copy(VISTAS[vista].alvo);
    olhar.current.yaw = 0;
    olhar.current.pitch = 0;
    invalidate();
  }, [vista, versao, invalidate]);

  useEffect(() => {
    camera.position.copy(VISTAS.porta.pos);
    camera.lookAt(VISTAS.porta.alvo);
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      olhar.current.arrastando = true;
      olhar.current.x = e.clientX;
      olhar.current.y = e.clientY;
      olhar.current.moveu = 0;
    };
    const move = (e: PointerEvent) => {
      const o = olhar.current;
      if (!o.arrastando) return;
      const dx = e.clientX - o.x;
      const dy = e.clientY - o.y;
      o.moveu += Math.abs(dx) + Math.abs(dy);
      o.x = e.clientX;
      o.y = e.clientY;
      if (o.moveu < 6) return; // toque curto = clique, não arraste
      o.yaw = THREE.MathUtils.clamp(o.yaw - dx * 0.004, -1.4, 1.4);
      o.pitch = THREE.MathUtils.clamp(o.pitch - dy * 0.003, -0.6, 0.5);
    };
    const up = () => { olhar.current.arrastando = false; };
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]")) return;
      teclas.current.add(e.key.toLowerCase());
    };
    const ku = (e: KeyboardEvent) => teclas.current.delete(e.key.toLowerCase());
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [camera, gl]);

  const tmp = useRef({ dir: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, "YXZ"), frente: new THREE.Vector3(), lado: new THREE.Vector3() });

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const d = destino.current;
    const t = tmp.current;
    // caminhar com WASD/setas: move posição e alvo juntos, dentro da sala
    const k = teclas.current;
    if (k.size) {
      t.frente.subVectors(d.alvo, d.pos).setY(0).normalize();
      t.frente.applyAxisAngle(new THREE.Vector3(0, 1, 0), olhar.current.yaw);
      t.lado.crossVectors(t.frente, new THREE.Vector3(0, 1, 0));
      const passo = 1.6 * dt;
      const mov = new THREE.Vector3();
      if (k.has("w") || k.has("arrowup")) mov.add(t.frente);
      if (k.has("s") || k.has("arrowdown")) mov.sub(t.frente);
      if (k.has("d") || k.has("arrowright")) mov.add(t.lado);
      if (k.has("a") || k.has("arrowleft")) mov.sub(t.lado);
      if (mov.lengthSq()) {
        mov.normalize().multiplyScalar(passo);
        const nova = d.pos.clone().add(mov);
        nova.x = THREE.MathUtils.clamp(nova.x, -SALA.largura / 2 + 0.5, SALA.largura / 2 - 0.5);
        nova.z = THREE.MathUtils.clamp(nova.z, -SALA.profundidade / 2 + 0.5, SALA.profundidade / 2 - 0.4);
        const real = nova.clone().sub(d.pos);
        d.pos.add(real);
        d.alvo.add(real);
      }
    }
    const f = instantaneo ? 1 : 1 - Math.exp(-4 * dt);
    camera.position.lerp(d.pos, f);
    // orientação: olhar para o alvo + deslocamento do arraste
    t.m.lookAt(camera.position, d.alvo, camera.up);
    t.q.setFromRotationMatrix(t.m);
    t.e.setFromQuaternion(t.q);
    t.e.y += olhar.current.yaw;
    t.e.x = THREE.MathUtils.clamp(t.e.x + olhar.current.pitch, -1.2, 1.2);
    t.e.z = 0;
    t.q.setFromEuler(t.e);
    camera.quaternion.slerp(t.q, f);
  });

  return null;
}
