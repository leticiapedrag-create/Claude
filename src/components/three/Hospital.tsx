"use client";
/** Cena 3D completa do atendimento. */
import { Suspense, useEffect, type RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveDpr, ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { Caso } from "@/lib/caso/schema";
import { CameraRig } from "./CameraRig";
import { Paciente } from "./Paciente";
import { POSICAO_PACIENTE, Sala } from "./Sala";
import type { AlvoInterativo, EstadoCena, PontoVista } from "./tipos";

interface Props {
  caso: Caso;
  estado: RefObject<EstadoCena>;
  vista: PontoVista;
  versaoVista: number;
  onSelecionar: (alvo: AlvoInterativo) => void;
  onQualidade?: (baixa: boolean) => void;
  qualidade: "alta" | "equilibrada" | "economia";
  /** Movimento reduzido: renderiza sob demanda (poucos quadros), câmera sem transições. */
  movimentoReduzido: boolean;
}

const DPR = { alta: [1, 1.75], equilibrada: [1, 1.35], economia: [1, 1] } as const;

/** No modo de movimento reduzido, atualiza a cena poucas vezes por segundo. */
function RelogioQuadros({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

export default function Hospital({ caso, estado, vista, versaoVista, onSelecionar, onQualidade, qualidade, movimentoReduzido }: Props) {
  return (
    <Canvas
      className="!absolute inset-0 touch-none"
      dpr={[...DPR[qualidade]]}
      frameloop={movimentoReduzido ? "demand" : "always"}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 58, near: 0.05, far: 30, position: [0, 1.6, 3] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <PerformanceMonitor onDecline={() => onQualidade?.(true)} onIncline={() => onQualidade?.(false)} />
      <AdaptiveDpr pixelated={false} />
      {movimentoReduzido && <RelogioQuadros fps={2} />}
      <color attach="background" args={["#dfe6eb"]} />
      <hemisphereLight args={["#ffffff", "#9aa7b2", 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 1]} intensity={1.1} color="#fff7ec" />
      <pointLight position={[0, 2.6, -1.2]} intensity={6} distance={6} decay={1.6} color="#fffaf2" />
      <pointLight position={[0, 2.6, 1.6]} intensity={4} distance={6} decay={1.6} color="#f4f8ff" />
      {/* Mapa de ambiente gerado localmente (reflexos realistas sem baixar HDR) */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[4, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[3, 1.5, 1]} color="#dff1ff" />
        <Lightformer form="rect" intensity={0.6} position={[-4, 1.5, 0]} rotation-y={Math.PI / 2} scale={[3, 1.5, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Sala cenario={caso.cenario} estado={estado} onSelecionar={onSelecionar} />
        <Paciente avatar={caso.avatar} estado={estado} posicao={POSICAO_PACIENTE} onClick={() => onSelecionar("paciente")} />
        <ContactShadows position={[0, 0.005, -1.6]} opacity={0.35} scale={5} blur={2.4} far={2} frames={1} />
      </Suspense>
      <CameraRig vista={vista} versao={versaoVista} instantaneo={movimentoReduzido} />
    </Canvas>
  );
}
