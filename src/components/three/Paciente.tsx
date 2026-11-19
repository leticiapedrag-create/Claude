"use client";
/**
 * Paciente virtual 3D procedural (geometria gerada em código, sem modelo externo).
 * Animações: respiração conforme a FR, contato visual com pausas, piscar irregular,
 * movimento da mandíbula ao falar, expressões (ansiedade, dor) e achados clínicos
 * (paresia facial, queda do braço, pupilas reagindo à luz, seguimento ocular, ferida).
 */
import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Avatar } from "@/lib/caso/schema";
import type { EstadoCena } from "./tipos";

interface Props {
  avatar: Avatar;
  estado: RefObject<EstadoCena>;
  posicao: [number, number, number];
  onClick?: () => void;
}

const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

/** Ruído suave determinístico (soma de senoides incomensuráveis) — evita repetição perceptível. */
function ruido(t: number, s: number) {
  return (Math.sin(t * 1.13 + s) + Math.sin(t * 0.71 + s * 2.3) * 0.6 + Math.sin(t * 2.17 + s * 0.7) * 0.3) / 1.9;
}

function escurecer(hex: string, f: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c;
}

export function Paciente({ avatar, estado, posicao, onClick }: Props) {
  const { camera } = useThree();
  const raiz = useRef<THREE.Group>(null);
  const tronco = useRef<THREE.Group>(null);
  const cabeca = useRef<THREE.Group>(null);
  const mandibula = useRef<THREE.Group>(null);
  const olhoD = useRef<THREE.Group>(null);
  const olhoE = useRef<THREE.Group>(null);
  const pupD = useRef<THREE.Mesh>(null);
  const pupE = useRef<THREE.Mesh>(null);
  const palpD = useRef<THREE.Mesh>(null);
  const palpE = useRef<THREE.Mesh>(null);
  const sobD = useRef<THREE.Mesh>(null);
  const sobE = useRef<THREE.Mesh>(null);
  const ombroD = useRef<THREE.Group>(null);
  const ombroE = useRef<THREE.Group>(null);
  const cotoveloD = useRef<THREE.Group>(null);
  const cotoveloE = useRef<THREE.Group>(null);
  const joelhoD = useRef<THREE.Group>(null);
  const joelhoE = useRef<THREE.Group>(null);
  const labioSup = useRef<THREE.Mesh>(null);
  const labioInf = useRef<THREE.Mesh>(null);
  const lanterna = useRef<THREE.Group>(null);
  const luzLanterna = useRef<THREE.PointLight>(null);
  const alvoDedo = useRef<THREE.Mesh>(null);
  const gaze = useRef<THREE.Mesh>(null);

  const mats = useMemo(() => {
    const pele = new THREE.MeshPhysicalMaterial({ color: avatar.pele, roughness: 0.58, sheen: 0.35, sheenColor: new THREE.Color("#ffd2bf"), sheenRoughness: 0.6 });
    return {
      pele,
      labio: new THREE.MeshStandardMaterial({ color: escurecer(avatar.pele, 0.72).lerp(new THREE.Color("#8c3f3a"), 0.35), roughness: 0.45 }),
      boca: new THREE.MeshStandardMaterial({ color: "#2a0f0f", roughness: 0.9 }),
      dente: new THREE.MeshStandardMaterial({ color: "#efe9dc", roughness: 0.4 }),
      roupa: new THREE.MeshStandardMaterial({ color: avatar.roupa, roughness: 0.85 }),
      roupaEscura: new THREE.MeshStandardMaterial({ color: escurecer(avatar.roupa, 0.75), roughness: 0.9 }),
      cabelo: new THREE.MeshStandardMaterial({ color: avatar.cabelo, roughness: 0.95 }),
      esclera: new THREE.MeshPhysicalMaterial({ color: "#f3efe8", roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
      iris: new THREE.MeshStandardMaterial({ color: "#4b3424", roughness: 0.3 }),
      pupila: new THREE.MeshBasicMaterial({ color: "#050505" }),
      sobrancelha: new THREE.MeshStandardMaterial({ color: avatar.calvicie ? "#8f8a85" : avatar.cabelo, roughness: 1 }),
      calca: new THREE.MeshStandardMaterial({ color: "#3d4651", roughness: 0.9 }),
      sapato: new THREE.MeshStandardMaterial({ color: "#1d1f22", roughness: 0.6 }),
      ferida: new THREE.MeshStandardMaterial({ color: "#7d1414", roughness: 0.35, emissive: "#300000" }),
      gaze: new THREE.MeshStandardMaterial({ color: "#f4f4f0", roughness: 0.95 }),
    };
  }, [avatar]);

  const geo = useMemo(
    () => ({
      cranio: new THREE.SphereGeometry(0.105, 40, 32),
      queixo: new THREE.SphereGeometry(0.068, 28, 20),
      orelha: new THREE.SphereGeometry(0.026, 16, 12),
      nariz: new THREE.CapsuleGeometry(0.012, 0.03, 6, 12),
      ponta: new THREE.SphereGeometry(0.015, 16, 12),
      olho: new THREE.SphereGeometry(0.0135, 24, 16),
      iris: new THREE.CircleGeometry(0.0068, 24),
      pupila: new THREE.CircleGeometry(0.0034, 20),
      palpebra: new THREE.SphereGeometry(0.0148, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      sobrancelha: new THREE.CapsuleGeometry(0.0035, 0.026, 4, 8),
      bocaInterna: new THREE.SphereGeometry(0.02, 16, 10),
      pescoco: new THREE.CylinderGeometry(0.048, 0.055, 0.12, 20),
      peito: new THREE.CapsuleGeometry(0.15, 0.3, 10, 24),
      bracoSup: new THREE.CapsuleGeometry(0.045, 0.22, 8, 16),
      antebraco: new THREE.CapsuleGeometry(0.037, 0.2, 8, 16),
      mao: new THREE.SphereGeometry(0.042, 16, 12),
      coxa: new THREE.CapsuleGeometry(0.072, 0.32, 8, 16),
      perna: new THREE.CapsuleGeometry(0.05, 0.36, 8, 16),
      pe: new THREE.BoxGeometry(0.09, 0.06, 0.22),
      quadril: new THREE.CapsuleGeometry(0.15, 0.12, 8, 20),
    }),
    [],
  );

  // Cabelo: calvície com "coroa" lateral/posterior, ou cabelo cheio.
  const cabeloGeo = useMemo(
    () =>
      avatar.calvicie
        ? new THREE.SphereGeometry(0.109, 32, 20, Math.PI * 0.89, Math.PI * 1.22, Math.PI * 0.27, Math.PI * 0.3)
        : new THREE.SphereGeometry(0.11, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.42),
    [avatar.calvicie],
  );

  const tubo = (pts: THREE.Vector3[]) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.0033, 8, false);
  const labioSupGeo = useMemo(() => tubo([new THREE.Vector3(-0.024, -0.001, -0.004), new THREE.Vector3(-0.01, 0.0015, 0.003), new THREE.Vector3(0, 0.0005, 0.005), new THREE.Vector3(0.01, 0.0015, 0.003), new THREE.Vector3(0.024, -0.001, -0.004)]), []);
  const labioInfGeo = useMemo(() => tubo([new THREE.Vector3(-0.022, 0.001, -0.004), new THREE.Vector3(0, -0.0015, 0.0045), new THREE.Vector3(0.022, 0.001, -0.004)]), []);

  // Estado interno das animações (não provoca renderização).
  const anim = useRef({
    piscar: 0,
    proximoPiscar: 2.5,
    olharFora: 0,
    proximoOlharFora: 5,
    alvoFora: new THREE.Vector2(),
    cabecaYaw: 0,
    cabecaPitch: 0,
    olhoYaw: 0,
    olhoPitch: 0,
    pupD: 1,
    pupE: 1,
    mand: 0,
    cantoD: 0,
    cantoE: 0,
    bracoE: 0,
    bracoD: 0,
    quedaBracoE: 0,
    pernaE: 0,
    pernaD: 0,
    quedaPernaE: 0,
    sobr: 0,
    estrabismoDor: 0,
  });

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), inv: new THREE.Matrix4() }), []);
  const parEsq = avatar.paresiaFacial === "esquerda";
  const parDir = avatar.paresiaFacial === "direita";
  const membroEsq = avatar.paresiaMembro === "esquerda";
  const membroDir = avatar.paresiaMembro === "direita";

  useFrame((st, dt) => {
    const e = estado.current;
    const a = anim.current;
    const t = st.clock.elapsedTime;
    const agora = performance.now();
    const tipo = e.animacao.tipo;
    const ta = (agora - e.animacao.inicio) / 1000; // segundos desde o início da animação clínica
    const emDor = agora < e.dorAte;
    dt = Math.min(dt, 0.25); // aparelhos lentos: as animações continuam avançando
    const k = (v: number) => 1 - Math.exp(-v * dt); // suavização independente do FPS

    // --- respiração (FR do caso) e postura
    const fr = e.sinais.fr || 16;
    const resp = Math.sin(t * Math.PI * 2 * (fr / 60));
    if (tronco.current) {
      tronco.current.scale.set(1 + resp * 0.012, 1 + resp * 0.008, 1 + resp * 0.02);
      tronco.current.rotation.z = ruido(t * 0.25, 1) * 0.012;
      tronco.current.rotation.x = -0.04 + ruido(t * 0.2, 4) * 0.01 + (emDor ? 0.05 : 0);
    }

    // --- olhar: contato visual com a câmera, intercalado com pausas olhando para outro ponto
    a.proximoOlharFora -= dt;
    if (a.proximoOlharFora <= 0 && a.olharFora <= 0 && !tipo) {
      a.olharFora = 0.7 + Math.random() * 1.2;
      a.alvoFora.set((Math.random() - 0.5) * 0.9, -0.15 - Math.random() * 0.25);
      a.proximoOlharFora = 4 + Math.random() * 6;
    }
    if (a.olharFora > 0) a.olharFora -= dt;

    let alvoYaw = 0;
    let alvoPitch = 0;
    if (cabeca.current && raiz.current) {
      tmp.v.copy(camera.position);
      raiz.current.worldToLocal(tmp.v);
      const dx = tmp.v.x;
      const dy = tmp.v.y - 0.98;
      const dz = tmp.v.z;
      alvoYaw = clamp(Math.atan2(dx, dz), -0.7, 0.7);
      alvoPitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.45, 0.35);
    }
    let olhoAlvoYaw = 0;
    let olhoAlvoPitch = 0;
    if (a.olharFora > 0) {
      olhoAlvoYaw = a.alvoFora.x * 0.5;
      olhoAlvoPitch = -a.alvoFora.y * 0.6;
      alvoYaw += a.alvoFora.x * 0.4;
      alvoPitch += -a.alvoFora.y * 0.3;
    }
    // Seguimento ocular: alvo percorre um "H"; a cabeça fica parada.
    if (tipo === "oculomotricidade" && alvoDedo.current) {
      const fase = (ta % 6) / 6;
      const pts: [number, number][] = [[0, 0], [-1, 0], [-1, 1], [-1, -1], [-1, 0], [1, 0], [1, 1], [1, -1], [1, 0], [0, 0]];
      const p = fase * (pts.length - 1);
      const i = Math.floor(p);
      const f = p - i;
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[Math.min(i + 1, pts.length - 1)];
      const hx = lerp(x0, x1, f);
      const hy = lerp(y0, y1, f);
      alvoDedo.current.visible = true;
      alvoDedo.current.position.set(hx * 0.22, 0.98 + hy * 0.12, 0.42);
      olhoAlvoYaw = hx * 0.55;
      olhoAlvoPitch = -hy * 0.35;
      alvoYaw = 0;
      alvoPitch = 0;
    } else if (alvoDedo.current) alvoDedo.current.visible = false;

    // micro-movimentos naturais da cabeça
    const vivacidade = avatar.hipomimia ? 0.35 : 1;
    alvoYaw += ruido(t * 0.35, 7) * 0.05 * vivacidade;
    alvoPitch += ruido(t * 0.3, 11) * 0.03 * vivacidade + (emDor ? -0.12 : 0) + (avatar.sonolento ? 0.18 : 0);
    a.cabecaYaw = lerp(a.cabecaYaw, alvoYaw, k(3));
    a.cabecaPitch = lerp(a.cabecaPitch, alvoPitch, k(3));
    if (cabeca.current) {
      cabeca.current.rotation.y = a.cabecaYaw;
      cabeca.current.rotation.x = a.cabecaPitch;
      cabeca.current.rotation.z = ruido(t * 0.27, 3) * 0.03;
    }
    // olhos chegam ao alvo antes da cabeça (sacada)
    a.olhoYaw = lerp(a.olhoYaw, olhoAlvoYaw + (alvoYaw - a.cabecaYaw) * 0.8, k(18));
    a.olhoPitch = lerp(a.olhoPitch, olhoAlvoPitch + (alvoPitch - a.cabecaPitch) * 0.8, k(18));
    for (const o of [olhoD.current, olhoE.current]) {
      if (!o) continue;
      o.rotation.y = clamp(a.olhoYaw, -0.6, 0.6);
      o.rotation.x = clamp(a.olhoPitch, -0.4, 0.4);
    }

    // --- piscar em intervalos irregulares (às vezes duplo)
    a.proximoPiscar -= dt;
    if (a.proximoPiscar <= 0) {
      a.piscar = 0.13;
      a.proximoPiscar = Math.random() < 0.15 ? 0.25 : (avatar.hipomimia ? 5 : 2) + Math.random() * (avatar.hipomimia ? 6 : 4.5);
    }
    a.piscar = Math.max(0, a.piscar - dt);
    const fechamentoPiscar = a.piscar > 0 ? Math.sin((a.piscar / 0.13) * Math.PI) : 0;
    const olhosFechados = tipo === "bracos_estendidos" && ta > 0.8 && ta < 8; // prova com olhos fechados
    const dorSquint = emDor ? 0.45 : 0;
    const ansioso = e.emocao === "ansioso" ? 1 : 0;
    const fechamento = olhosFechados ? 1 : Math.max(fechamentoPiscar, dorSquint, avatar.sonolento ? 0.55 : 0);
    const anguloPalp = lerp(-0.3, 1.05, fechamento);
    if (palpD.current) palpD.current.rotation.x = anguloPalp;
    if (palpE.current) palpE.current.rotation.x = anguloPalp;

    // --- sobrancelhas: ansiedade (porção interna elevada), dor (franzidas)
    const alvoSobr = emDor ? -1 : ansioso ? 0.6 : 0;
    a.sobr = lerp(a.sobr, alvoSobr, k(6));
    if (sobD.current && sobE.current) {
      sobD.current.position.y = 0.029 + a.sobr * 0.003;
      sobE.current.position.y = 0.029 + a.sobr * 0.003;
      sobD.current.rotation.z = Math.PI / 2 + 0.18 * a.sobr + (emDor ? -0.25 : 0);
      sobE.current.rotation.z = Math.PI / 2 - 0.18 * a.sobr + (emDor ? 0.25 : 0);
    }

    // --- pupilas: fotorreação direta e consensual com latência
    let luzD = 0;
    let luzE = 0;
    if (tipo === "pupilas_reativas" && lanterna.current && luzLanterna.current) {
      lanterna.current.visible = true;
      // 0–2,2 s olho direito do paciente (x negativo), 2,6–4,8 s olho esquerdo
      const naDireita = ta < 2.4;
      const fase = naDireita ? ta / 2.2 : (ta - 2.6) / 2.2;
      const lado = naDireita ? -1 : 1;
      const aprox = clamp(fase * 2.5, 0, 1);
      lanterna.current.position.set(lado * lerp(0.2, 0.05, aprox), 0.995, lerp(0.25, 0.14, aprox));
      luzLanterna.current.intensity = fase > 0 && fase < 1 ? 0.6 : 0;
      const ativa = aprox > 0.7 && fase < 1 ? 1 : 0;
      if (naDireita) luzD = ativa;
      else luzE = ativa;
    } else if (lanterna.current && luzLanterna.current) {
      lanterna.current.visible = false;
      luzLanterna.current.intensity = 0;
    }
    const estimulo = avatar.pupilas.reativas ? Math.max(luzD, luzE) : 0; // consensual: ambas contraem
    const alvoPD = avatar.pupilas.direita * (1 - 0.48 * estimulo);
    const alvoPE = avatar.pupilas.esquerda * (1 - 0.48 * estimulo);
    a.pupD = lerp(a.pupD, alvoPD, k(estimulo ? 5 : 1.8));
    a.pupE = lerp(a.pupE, alvoPE, k(estimulo ? 5 : 1.8));
    pupD.current?.scale.setScalar(a.pupD);
    pupE.current?.scale.setScalar(a.pupE);

    // --- fala: mandíbula guiada pelas palavras da síntese de voz (ou estimativa sem voz)
    const falando = e.falando || agora < e.falandoAte;
    const desdePalavra = (agora - e.pulsoFala) / 1000;
    const envelope = falando ? 0.45 + 0.55 * Math.exp(-desdePalavra * 5) : 0;
    const silabas = Math.abs(Math.sin(t * (avatar.disartria ? 9 : 13))) * 0.75 + Math.abs(ruido(t * 6, 2)) * 0.25;
    a.mand = lerp(a.mand, falando ? envelope * silabas : 0, k(falando ? 22 : 10));
    if (mandibula.current) mandibula.current.rotation.x = 0.02 + a.mand * 0.16;

    // --- comissura labial: paresia facial central e sorriso a pedido
    const sorrindo = tipo === "sorriso" && ta > 0.4 && ta < 3.2 ? 1 : 0;
    const quedaEsq = parEsq ? -0.007 : 0;
    const quedaDir = parDir ? -0.007 : 0;
    a.cantoE = lerp(a.cantoE, quedaEsq + (sorrindo && !parEsq ? 0.016 : 0) + (emDor ? -0.003 : 0), k(7));
    a.cantoD = lerp(a.cantoD, quedaDir + (sorrindo && !parDir ? 0.016 : 0) + (emDor ? -0.003 : 0), k(7));
    for (const l of [labioSup.current, labioInf.current]) {
      if (!l) continue;
      // inclinação do lábio acompanha a assimetria (lado esquerdo do paciente = +x)
      l.rotation.z = (a.cantoE - a.cantoD) * 9;
      l.scale.x = 1 + sorrindo * 0.12;
    }
    if (labioSup.current) labioSup.current.position.y = -0.043 + (a.cantoE + a.cantoD) * 0.35;

    // --- membros: prova dos braços estendidos e das pernas
    const bracosAlvo = tipo === "bracos_estendidos" && ta < 8.4 ? 1 : 0;
    a.bracoD = lerp(a.bracoD, bracosAlvo, k(3));
    a.bracoE = lerp(a.bracoE, bracosAlvo, k(3));
    const tempoQueda = bracosAlvo ? clamp((ta - 2.5) / 4.5, 0, 1) : 0;
    a.quedaBracoE = lerp(a.quedaBracoE, membroEsq ? tempoQueda : 0, k(4));
    const quedaBracoD = membroDir ? tempoQueda : 0;
    if (ombroD.current && cotoveloD.current) {
      ombroD.current.rotation.x = lerp(-0.18, -1.5 + quedaBracoD * 0.9, a.bracoD);
      cotoveloD.current.rotation.x = lerp(-1.25, 0, a.bracoD);
      // tremor de repouso (4–6 Hz), some quando o braço é usado
      cotoveloD.current.rotation.z = avatar.tremorRepouso === "direita" ? Math.sin(t * Math.PI * 2 * 5) * 0.07 * (1 - a.bracoD) * (tipo === "tremor" ? 1.4 : 1) : 0;
    }
    if (ombroE.current && cotoveloE.current) {
      ombroE.current.rotation.x = lerp(-0.18, -1.5 + a.quedaBracoE * 0.9, a.bracoE);
      cotoveloE.current.rotation.x = lerp(-1.25, 0, a.bracoE) + a.quedaBracoE * 0.2 * a.bracoE;
      cotoveloE.current.rotation.z = avatar.tremorRepouso === "esquerda" ? Math.sin(t * Math.PI * 2 * 5) * 0.07 * (1 - a.bracoE) * (tipo === "tremor" ? 1.4 : 1) : 0;
      // ferida: antebraço esquerdo em supinação sobre a coxa
      ombroE.current.rotation.z = avatar.ferida === "antebraco_esquerdo" ? -0.12 : 0;
    }
    const pernasAlvo = tipo === "perna_estendida" && ta < 6.4 ? 1 : 0;
    a.pernaD = lerp(a.pernaD, pernasAlvo, k(3));
    a.pernaE = lerp(a.pernaE, pernasAlvo, k(3));
    const quedaPerna = pernasAlvo ? clamp((ta - 2) / 3, 0, 1) : 0;
    a.quedaPernaE = lerp(a.quedaPernaE, membroEsq ? quedaPerna : 0, k(4));
    if (joelhoD.current) joelhoD.current.rotation.x = lerp(0, -1.35 + (membroDir ? quedaPerna * 0.8 : 0), a.pernaD);
    if (joelhoE.current) joelhoE.current.rotation.x = lerp(0, -1.35 + a.quedaPernaE * 0.8, a.pernaE);
    if (gaze.current) gaze.current.visible = !e.feridaExposta;
  });

  const pele = mats.pele;
  const temFerida = avatar.ferida !== "nenhuma";

  return (
    <group ref={raiz} position={posicao} onClick={(ev) => { ev.stopPropagation(); onClick?.(); }}>
      {/* quadril sobre a maca */}
      <mesh geometry={geo.quadril} material={mats.calca} position={[0, 0.1, -0.02]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.8]} />
      {/* coxas e pernas (sentado na beira da maca) */}
      {([[-1, joelhoD], [1, joelhoE]] as const).map(([lado, ref]) => (
        <group key={lado} position={[lado * 0.1, 0.09, 0]}>
          <mesh geometry={geo.coxa} material={mats.calca} position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} />
          <group ref={ref} position={[0, 0, 0.42]}>
            <mesh geometry={geo.perna} material={mats.calca} position={[0, -0.24, 0]} />
            <mesh geometry={geo.pe} material={mats.sapato} position={[0, -0.47, 0.06]} />
          </group>
        </group>
      ))}

      {/* tronco */}
      <group ref={tronco} position={[0, 0.12, -0.03]}>
        <mesh geometry={geo.peito} material={mats.roupa} position={[0, 0.3, 0]} scale={[1.28, 1, 0.82]} />
        {/* decote do avental */}
        <mesh geometry={geo.mao} material={pele} position={[0, 0.53, 0.07]} scale={[1.1, 0.55, 0.5]} />
        <mesh geometry={geo.pescoco} material={pele} position={[0, 0.6, 0]} />

        {/* braços: ombro → cotovelo → mão */}
        {([[-1, ombroD, cotoveloD], [1, ombroE, cotoveloE]] as const).map(([lado, refOmbro, refCotovelo]) => (
          <group key={lado} ref={refOmbro} position={[lado * 0.215, 0.5, 0]}>
            <mesh geometry={geo.mao} material={mats.roupa} scale={[1.15, 1.05, 1.15]} />
            <mesh geometry={geo.bracoSup} material={pele} position={[0, -0.15, 0]} />
            <mesh geometry={geo.bracoSup} material={mats.roupaEscura} position={[0, -0.07, 0]} scale={[1.18, 0.45, 1.18]} />
            <group ref={refCotovelo} position={[0, -0.29, 0]}>
              <mesh geometry={geo.antebraco} material={pele} position={[0, -0.13, 0]} />
              <mesh geometry={geo.mao} material={pele} position={[0, -0.29, 0]} scale={[0.85, 1.25, 0.55]} />
              {lado === 1 && temFerida && (
                <group position={[0, -0.13, 0.034]}>
                  {/* ferida incisa na face volar do antebraço esquerdo */}
                  <mesh material={mats.ferida} rotation={[0, 0, 0.12]}>
                    <boxGeometry args={[0.006, 0.07, 0.006]} />
                  </mesh>
                  {/* gaze sobre a ferida até a inspeção */}
                  <mesh ref={gaze} material={mats.gaze} position={[0, 0, 0.004]}>
                    <boxGeometry args={[0.05, 0.1, 0.006]} />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        ))}

        {/* cabeça */}
        <group ref={cabeca} position={[0, 0.66, 0.005]}>
          <group position={[0, 0.12, 0]}>
            <mesh geometry={geo.cranio} material={pele} scale={[0.93, 1.1, 1.0]} />
            <mesh geometry={cabeloGeo} material={mats.cabelo} scale={[0.95, 1.12, 1.03]} />
            <mesh geometry={geo.orelha} material={pele} position={[-0.097, 0.0, 0]} scale={[0.45, 1, 0.75]} />
            <mesh geometry={geo.orelha} material={pele} position={[0.097, 0.0, 0]} scale={[0.45, 1, 0.75]} />
            {/* nariz */}
            <mesh geometry={geo.nariz} material={pele} position={[0, -0.002, 0.101]} rotation={[0.42, 0, 0]} scale={[0.9, 1.25, 1]} />
            <mesh geometry={geo.ponta} material={pele} position={[0, -0.022, 0.111]} scale={[1.05, 0.85, 0.95]} />
            <mesh geometry={geo.ponta} material={pele} position={[-0.012, -0.027, 0.101]} scale={[0.65, 0.55, 0.7]} />
            <mesh geometry={geo.ponta} material={pele} position={[0.012, -0.027, 0.101]} scale={[0.65, 0.55, 0.7]} />
            {/* bochechas: suavizam a transição entre olhos, nariz e boca */}
            <mesh geometry={geo.queixo} material={pele} position={[-0.04, -0.03, 0.044]} scale={[0.5, 0.5, 0.5]} />
            <mesh geometry={geo.queixo} material={pele} position={[0.04, -0.03, 0.044]} scale={[0.5, 0.5, 0.5]} />
            {/* olhos */}
            {([[-1, olhoD, pupD, palpD, sobD], [1, olhoE, pupE, palpE, sobE]] as const).map(([lado, refOlho, refPup, refPalp, refSob]) => (
              <group key={lado} position={[lado * 0.036, 0.018, 0.093]}>
                <group ref={refOlho}>
                  <mesh geometry={geo.olho} material={mats.esclera} />
                  <mesh geometry={geo.iris} material={mats.iris} position={[0, 0, 0.0131]} />
                  <mesh ref={refPup} geometry={geo.pupila} material={mats.pupila} position={[0, 0, 0.0133]} />
                </group>
                <mesh ref={refPalp} geometry={geo.palpebra} material={pele} rotation={[-0.3, 0, 0]} />
                <mesh geometry={geo.palpebra} material={pele} rotation={[Math.PI + 0.62, 0, 0]} />
                <mesh ref={refSob} geometry={geo.sobrancelha} material={mats.sobrancelha} position={[0, 0.029, 0.012]} rotation={[0, 0, Math.PI / 2]} />
              </group>
            ))}
            {/* boca: lábio superior fixo, inferior acompanha a mandíbula */}
            <mesh ref={labioSup} geometry={labioSupGeo} material={mats.labio} position={[0, -0.043, 0.097]} scale={[1, 0.85, 0.8]} />
            <mesh geometry={geo.bocaInterna} material={mats.boca} position={[0, -0.047, 0.082]} scale={[1.0, 0.3, 0.45]} />
            <group ref={mandibula} position={[0, -0.02, 0.0]}>
              <mesh geometry={geo.queixo} material={pele} position={[0, -0.052, 0.024]} scale={[0.95, 0.78, 0.92]} />
              <mesh ref={labioInf} geometry={labioInfGeo} material={mats.labio} position={[0, -0.0295, 0.096]} scale={[1, 1, 0.8]} />
            </group>
          </group>
        </group>
      </group>

      {/* lanterna clínica (pupilas) */}
      <group ref={lanterna} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.11, 12]} />
          <meshStandardMaterial color="#c7ccd1" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.056]}>
          <sphereGeometry args={[0.008, 12, 8]} />
          <meshBasicMaterial color="#fff6d8" />
        </mesh>
        <pointLight ref={luzLanterna} intensity={0} distance={0.6} color="#fff3d0" position={[0, 0, -0.07]} />
      </group>
      {/* dedo-alvo para motricidade ocular */}
      <mesh ref={alvoDedo} visible={false}>
        <capsuleGeometry args={[0.009, 0.05, 4, 8]} />
        <meshStandardMaterial color="#e0b49a" roughness={0.6} />
      </mesh>
    </group>
  );
}

