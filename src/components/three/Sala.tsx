"use client";
/** Ambiente clínico 3D: sala, mobiliário e equipamentos interativos. */
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Cenario } from "@/lib/caso/schema";
import { criarMonitor, criarRelogio, texturaCartaz, texturaPiso } from "./texturas";
import type { AlvoInterativo, EstadoCena } from "./tipos";

export const SALA = { largura: 6.4, profundidade: 8, altura: 2.9 };
/** Assento da maca onde o paciente está sentado. */
export const POSICAO_PACIENTE: [number, number, number] = [0, 0.66, -1.48];

const ROTULOS: Record<AlvoInterativo, string> = {
  paciente: "Paciente",
  pia: "Pia — higienizar as mãos",
  monitor: "Monitor multiparamétrico",
  mao: "Exame físico",
  esfigmo: "Esfigmomanômetro",
  oximetro: "Oxímetro de pulso",
  termometro: "Termômetro",
  glicosimetro: "Glicosímetro",
  lanterna: "Lanterna clínica",
  martelo: "Martelo de reflexos",
  estetoscopio: "Estetoscópio",
  monofilamento: "Monofilamento",
  bandeja: "Bandeja de procedimento",
};

function Interativo({ alvo, onSelecionar, children, posicaoRotulo = [0, 0.18, 0] }: { alvo: AlvoInterativo; onSelecionar: (a: AlvoInterativo) => void; children: ReactNode; posicaoRotulo?: [number, number, number] }) {
  const [sobre, setSobre] = useState(false);
  const grupo = useRef<THREE.Group>(null);
  useEffect(() => {
    grupo.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "emissive" in m) {
        if (!m.userData.base) m.userData.base = m.emissive.clone();
        m.emissive.copy(sobre ? new THREE.Color("#1fb5a3") : m.userData.base);
        m.emissiveIntensity = sobre ? 0.45 : 1;
      }
    });
    document.body.style.cursor = sobre ? "pointer" : "";
  }, [sobre]);
  return (
    <group
      ref={grupo}
      onPointerOver={(e) => { e.stopPropagation(); setSobre(true); }}
      onPointerOut={() => setSobre(false)}
      onClick={(e) => { e.stopPropagation(); onSelecionar(alvo); }}
    >
      {children}
      {sobre && (
        <Html position={posicaoRotulo} center distanceFactor={3} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white">{ROTULOS[alvo]}</div>
        </Html>
      )}
    </group>
  );
}

const metal = () => new THREE.MeshStandardMaterial({ color: "#b9c2ca", metalness: 0.85, roughness: 0.28 });

function Maca({ procedimento }: { procedimento: boolean }) {
  const m = useMemo(() => ({ metal: metal(), colchao: new THREE.MeshStandardMaterial({ color: procedimento ? "#2f4f6b" : "#4b6f8c", roughness: 0.55 }), papel: new THREE.MeshStandardMaterial({ color: "#f6f4ee", roughness: 0.95 }) }), [procedimento]);
  return (
    <group position={[0, 0, -2.1]}>
      <mesh position={[0, 0.3, 0]} material={m.metal}>
        <boxGeometry args={[0.7, 0.06, 1.9]} />
      </mesh>
      {[-0.3, 0.3].flatMap((x) => [-0.85, 0.85].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.15, z]} material={m.metal}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 10]} />
        </mesh>
      )))}
      <mesh position={[0, 0.5, 0]} material={m.metal}>
        <boxGeometry args={[0.66, 0.34, 1.8]} />
      </mesh>
      <mesh position={[0, 0.63, 0]} material={m.colchao}>
        <boxGeometry args={[0.72, 0.08, 1.95]} />
      </mesh>
      <mesh position={[0, 0.672, 0.05]} material={m.papel}>
        <boxGeometry args={[0.5, 0.004, 1.85]} />
      </mesh>
      {/* encosto elevado */}
      <mesh position={[0, 0.92, -0.85]} rotation={[-0.35, 0, 0]} material={m.colchao}>
        <boxGeometry args={[0.72, 0.6, 0.08]} />
      </mesh>
    </group>
  );
}

function Pia({ onSelecionar }: { onSelecionar: (a: AlvoInterativo) => void }) {
  const mat = useMemo(() => ({ armario: new THREE.MeshStandardMaterial({ color: "#e8edf1", roughness: 0.6 }), inox: metal(), gel: new THREE.MeshStandardMaterial({ color: "#cfe9f5", roughness: 0.2, transparent: true, opacity: 0.85 }) }), []);
  return (
    <Interativo alvo="pia" onSelecionar={onSelecionar} posicaoRotulo={[0, 1.55, 0]}>
      <group position={[-SALA.largura / 2 + 0.3, 0, 0.3]}>
        <mesh position={[0, 0.42, 0]} material={mat.armario}>
          <boxGeometry args={[0.55, 0.84, 0.9]} />
        </mesh>
        <mesh position={[0.02, 0.86, 0]} material={mat.inox}>
          <boxGeometry args={[0.5, 0.05, 0.6]} />
        </mesh>
        <mesh position={[-0.18, 1.0, 0]} rotation={[0, 0, -0.5]} material={mat.inox}>
          <cylinderGeometry args={[0.015, 0.015, 0.28, 10]} />
        </mesh>
        {/* dispensador de álcool em gel e papel-toalha */}
        <mesh position={[-0.27, 1.35, -0.25]} material={mat.gel}>
          <boxGeometry args={[0.05, 0.22, 0.12]} />
        </mesh>
        <mesh position={[-0.27, 1.38, 0.25]} material={mat.armario}>
          <boxGeometry args={[0.08, 0.3, 0.26]} />
        </mesh>
      </group>
    </Interativo>
  );
}

function Bandeja({ onSelecionar, procedimento }: { onSelecionar: (a: AlvoInterativo) => void; procedimento: boolean }) {
  const m = useMemo(() => ({ inox: metal(), preto: new THREE.MeshStandardMaterial({ color: "#1d2329", roughness: 0.5 }), azul: new THREE.MeshStandardMaterial({ color: "#2563eb", roughness: 0.4 }), branco: new THREE.MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.5 }), verde: new THREE.MeshStandardMaterial({ color: "#3f7d5c", roughness: 0.8 }), cinza: new THREE.MeshStandardMaterial({ color: "#5c6670", roughness: 0.5 }) }), []);
  return (
    <group position={[0.95, 0, -1.35]}>
      {/* carrinho */}
      <mesh position={[0, 0.8, 0]} material={m.inox}>
        <boxGeometry args={[0.6, 0.03, 0.45]} />
      </mesh>
      <mesh position={[0, 0.4, 0]} material={m.inox}>
        <boxGeometry args={[0.56, 0.02, 0.41]} />
      </mesh>
      {[-0.27, 0.27].flatMap((x) => [-0.2, 0.2].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.4, z]} material={m.inox}>
          <cylinderGeometry args={[0.012, 0.012, 0.8, 8]} />
        </mesh>
      )))}
      <Interativo alvo="estetoscopio" onSelecionar={onSelecionar}>
        <group position={[-0.18, 0.83, -0.08]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.preto}>
            <torusGeometry args={[0.07, 0.008, 8, 24]} />
          </mesh>
          <mesh position={[0.08, 0.005, 0.05]} material={m.inox}>
            <cylinderGeometry args={[0.022, 0.022, 0.012, 16]} />
          </mesh>
        </group>
      </Interativo>
      <Interativo alvo="lanterna" onSelecionar={onSelecionar}>
        <mesh position={[0.02, 0.83, -0.12]} rotation={[0, 0.3, Math.PI / 2]} material={m.inox}>
          <cylinderGeometry args={[0.01, 0.01, 0.13, 10]} />
        </mesh>
      </Interativo>
      <Interativo alvo="martelo" onSelecionar={onSelecionar}>
        <group position={[0.16, 0.83, -0.1]} rotation={[0, -0.4, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.inox}>
            <cylinderGeometry args={[0.006, 0.006, 0.2, 8]} />
          </mesh>
          <mesh position={[-0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.cinza}>
            <torusGeometry args={[0.025, 0.012, 8, 16, Math.PI]} />
          </mesh>
        </group>
      </Interativo>
      <Interativo alvo="glicosimetro" onSelecionar={onSelecionar}>
        <group position={[-0.08, 0.835, 0.1]}>
          <mesh material={m.branco}>
            <boxGeometry args={[0.06, 0.02, 0.1]} />
          </mesh>
          <mesh position={[0, 0.011, -0.015]} material={m.cinza}>
            <boxGeometry args={[0.04, 0.002, 0.035]} />
          </mesh>
        </group>
      </Interativo>
      <Interativo alvo="termometro" onSelecionar={onSelecionar}>
        <mesh position={[0.08, 0.825, 0.12]} rotation={[0, 0.5, Math.PI / 2]} material={m.branco}>
          <cylinderGeometry args={[0.006, 0.006, 0.13, 8]} />
        </mesh>
      </Interativo>
      <Interativo alvo="oximetro" onSelecionar={onSelecionar}>
        <mesh position={[0.2, 0.835, 0.1]} material={m.azul}>
          <boxGeometry args={[0.04, 0.03, 0.06]} />
        </mesh>
      </Interativo>
      {procedimento && (
        <Interativo alvo="bandeja" onSelecionar={onSelecionar} posicaoRotulo={[0, 1.15, 0]}>
          {/* mesa auxiliar com campo estéril e instrumental */}
          <group position={[-0.85, 0, 0.55]}>
            <mesh position={[0, 0.9, 0]} material={m.inox}>
              <boxGeometry args={[0.55, 0.02, 0.4]} />
            </mesh>
            <mesh position={[0, 0.45, -0.18]} material={m.inox}>
              <cylinderGeometry args={[0.02, 0.02, 0.9, 10]} />
            </mesh>
            <mesh position={[0, 0.913, 0]} material={m.verde}>
              <boxGeometry args={[0.5, 0.004, 0.36]} />
            </mesh>
            {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
              <mesh key={x} position={[x, 0.922, 0.02]} rotation={[0, 0.1 * i, 0]} material={m.inox}>
                <boxGeometry args={[0.012, 0.008, 0.15]} />
              </mesh>
            ))}
          </group>
        </Interativo>
      )}
    </group>
  );
}

function MonitorParede({ estado, onSelecionar }: { estado: RefObject<EstadoCena>; onSelecionar: (a: AlvoInterativo) => void }) {
  const mon = useMemo(() => criarMonitor(), []);
  const acum = useRef(0);
  useFrame((_, dt) => {
    acum.current += dt;
    if (acum.current < 1 / 20) return;
    mon.atualizar(estado.current.sinais, estado.current.monitorLigado, acum.current);
    acum.current = 0;
  });
  return (
    <Interativo alvo="monitor" onSelecionar={onSelecionar} posicaoRotulo={[0, 0.3, 0]}>
      <group position={[-1.05, 1.62, -2.6]} rotation={[0, 0.35, 0]}>
        <mesh>
          <boxGeometry args={[0.58, 0.4, 0.08]} />
          <meshStandardMaterial color="#2a3139" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.041]}>
          <planeGeometry args={[0.52, 0.33]} />
          <meshBasicMaterial map={mon.textura} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.6, -0.02]}>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
          <meshStandardMaterial color="#9aa4ad" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </Interativo>
  );
}

function RelogioParede({ estado }: { estado: RefObject<EstadoCena> }) {
  const r = useMemo(() => criarRelogio(), []);
  useFrame(() => r.atualizar(estado.current.relogio));
  return (
    <mesh position={[1.4, 2.25, -SALA.profundidade / 2 + 0.02]}>
      <circleGeometry args={[0.18, 40]} />
      <meshBasicMaterial map={r.textura} toneMapped={false} />
    </mesh>
  );
}

function Esfigmo({ onSelecionar }: { onSelecionar: (a: AlvoInterativo) => void }) {
  return (
    <Interativo alvo="esfigmo" onSelecionar={onSelecionar} posicaoRotulo={[0, 0.25, 0]}>
      <group position={[0.75, 1.45, -SALA.profundidade / 2 + 0.06]}>
        <mesh>
          <boxGeometry args={[0.2, 0.26, 0.06]} />
          <meshStandardMaterial color="#e9edf0" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.03, 0.032]}>
          <circleGeometry args={[0.07, 32]} />
          <meshStandardMaterial color="#fafafa" roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.2, 0.02]}>
          <torusGeometry args={[0.06, 0.006, 8, 24]} />
          <meshStandardMaterial color="#2b2f33" roughness={0.6} />
        </mesh>
        <mesh position={[0.18, -0.12, 0.03]}>
          <boxGeometry args={[0.14, 0.08, 0.04]} />
          <meshStandardMaterial color="#1f3b57" roughness={0.8} />
        </mesh>
      </group>
    </Interativo>
  );
}

const CARTAZ: Record<Cenario, [string, string[], string]> = {
  pronto_atendimento: ["Código AVC — tempo é cérebro", ["Último momento visto bem", "Glicemia capilar", "NIHSS", "TC sem contraste ≤ 25 min", "Porta-agulha ≤ 60 min"], "#0b1f3a"],
  emergencia: ["Sala vermelha", ["ABCDE", "Monitorização", "Acesso venoso", "Reavaliação contínua"], "#9b1c1c"],
  procedimentos: ["5 momentos da higiene das mãos", ["Antes de tocar o paciente", "Antes de procedimento asséptico", "Após risco de exposição a fluidos", "Após tocar o paciente", "Após tocar superfícies próximas"], "#0f766e"],
  consultorio: ["Consulta centrada na pessoa", ["Apresente-se", "Escute sem interromper", "Explique com clareza", "Verifique o entendimento"], "#0f766e"],
  enfermaria: ["Prevenção de quedas", ["Grades elevadas", "Campainha ao alcance", "Calçado adequado"], "#0f766e"],
};

export function Sala({ cenario, estado, onSelecionar }: { cenario: Cenario; estado: RefObject<EstadoCena>; onSelecionar: (a: AlvoInterativo) => void }) {
  const { largura: L, profundidade: P, altura: A } = SALA;
  const piso = useMemo(() => texturaPiso(cenario === "emergencia" ? "#c9d1d8" : "#d6dce1"), [cenario]);
  const cartaz = useMemo(() => { const [t, l, c] = CARTAZ[cenario]; return texturaCartaz(t, l, c); }, [cenario]);
  const parede = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef2f4", roughness: 0.92 }), []);
  const faixa = useMemo(() => new THREE.MeshStandardMaterial({ color: cenario === "emergencia" ? "#8f2a2a" : "#1f6f6a", roughness: 0.7 }), [cenario]);
  const procedimento = cenario === "procedimentos";

  return (
    <group>
      {/* piso, teto, paredes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[L, P]} />
        <meshStandardMaterial map={piso} roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, A, 0]}>
        <planeGeometry args={[L, P]} />
        <meshStandardMaterial color="#f7f8f9" roughness={1} />
      </mesh>
      {[
        { p: [0, A / 2, -P / 2], r: [0, 0, 0], w: L },
        { p: [0, A / 2, P / 2], r: [0, Math.PI, 0], w: L },
        { p: [-L / 2, A / 2, 0], r: [0, Math.PI / 2, 0], w: P },
        { p: [L / 2, A / 2, 0], r: [0, -Math.PI / 2, 0], w: P },
      ].map((w, i) => (
        <group key={i} position={w.p as [number, number, number]} rotation={w.r as [number, number, number]}>
          <mesh material={parede}>
            <planeGeometry args={[w.w, A]} />
          </mesh>
          <mesh position={[0, -A / 2 + 0.95, 0.005]} material={faixa}>
            <planeGeometry args={[w.w, 0.06]} />
          </mesh>
          <mesh position={[0, -A / 2 + 0.05, 0.01]}>
            <planeGeometry args={[w.w, 0.1]} />
            <meshStandardMaterial color="#9aa6b1" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* luminárias embutidas */}
      {[[-1.2, -1.5], [1.2, -1.5], [-1.2, 1.5], [1.2, 1.5]].map(([x, z]) => (
        <mesh key={`${x}${z}`} rotation={[Math.PI / 2, 0, 0]} position={[x, A - 0.01, z]}>
          <planeGeometry args={[1.1, 0.5]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
      {/* janela com luz natural */}
      <group position={[L / 2 - 0.01, 1.6, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[1.8, 1.1]} />
          <meshBasicMaterial color="#cfe8f7" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.04, 1.1]} />
          <meshStandardMaterial color="#e5e9ec" />
        </mesh>
      </group>
      {/* porta */}
      <group position={[-1.6, 1.05, P / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <planeGeometry args={[1.0, 2.1]} />
          <meshStandardMaterial color="#c9b79b" roughness={0.6} />
        </mesh>
        <mesh position={[0.38, 0, 0.02]}>
          <boxGeometry args={[0.12, 0.03, 0.04]} />
          <meshStandardMaterial color="#9aa4ad" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {/* cartaz */}
      <mesh position={[-1.2, 1.6, -P / 2 + 0.015]}>
        <planeGeometry args={[0.56, 0.79]} />
        <meshStandardMaterial map={cartaz} roughness={0.8} />
      </mesh>
      {/* cortina de privacidade */}
      <mesh position={[-1.6, 1.4, -1.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.2, 2.0]} />
        <meshStandardMaterial color="#a9c7c4" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-1.6, 2.42, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 2.4, 8]} />
        <meshStandardMaterial color="#c3c9ce" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* mesa e computador */}
      <group position={[2.3, 0, 1.2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.74, 0]}>
          <boxGeometry args={[1.3, 0.04, 0.65]} />
          <meshStandardMaterial color="#d9cdb8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.37, 0.28]}>
          <boxGeometry args={[1.25, 0.74, 0.03]} />
          <meshStandardMaterial color="#c8bca7" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.02, 0.15]}>
          <boxGeometry args={[0.55, 0.34, 0.03]} />
          <meshStandardMaterial color="#15191d" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.02, 0.134]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.5, 0.29]} />
          <meshBasicMaterial color="#dbe7f2" toneMapped={false} />
        </mesh>
      </group>
      {cenario !== "consultorio" && <MonitorParede estado={estado} onSelecionar={onSelecionar} />}
      {cenario === "emergencia" && (
        <mesh position={[2.4, 0.5, -2.6]}>
          <boxGeometry args={[0.6, 1.0, 0.5]} />
          <meshStandardMaterial color="#b42318" roughness={0.5} />
        </mesh>
      )}
      {procedimento && (
        <group position={[0.2, A - 0.5, -1.6]}>
          {/* foco cirúrgico */}
          <mesh>
            <cylinderGeometry args={[0.3, 0.36, 0.12, 32]} />
            <meshStandardMaterial color="#e7ecef" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, -0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.28, 32]} />
            <meshBasicMaterial color="#fffdf2" toneMapped={false} />
          </mesh>
          <spotLight position={[0, -0.1, 0]} angle={0.45} penumbra={0.6} intensity={6} distance={3} color="#fffaf0" target-position={[0, -1.6, 0.2]} />
        </group>
      )}
      <RelogioParede estado={estado} />
      <Maca procedimento={procedimento} />
      <Pia onSelecionar={onSelecionar} />
      <Bandeja onSelecionar={onSelecionar} procedimento={procedimento} />
      <Esfigmo onSelecionar={onSelecionar} />
    </group>
  );
}
