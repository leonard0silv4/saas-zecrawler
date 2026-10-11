import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { CompetitividadePanel, PerguntasPanel, LinksPanel, derivePanelData } from "./HoloPanels";

const CYAN = new THREE.Color("#40c8ff");
const BLUE = new THREE.Color("#1e7bff");

/** Anel fino emissivo (bloom faz o brilho). */
function GlowRing({ radius, tube = 0.012, color = CYAN, opacity = 1, speed = 0, arc = Math.PI * 2 }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current && speed) ref.current.rotation.z += dt * speed; });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[radius, tube, 12, 160, arc]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

/** Marcas de régua girando em volta da plataforma. */
function TickRing({ radius = 2.65, count = 72, speed = 0.08 }) {
  const ref = useRef();
  const matrices = useMemo(() => {
    const m = new THREE.Object3D();
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      m.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      m.rotation.set(0, -a, 0);
      m.scale.set(1, 1, i % 6 === 0 ? 2.4 : 1);
      m.updateMatrix();
      return m.matrix.clone();
    });
  }, [count, radius]);

  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y -= dt * speed; });

  return (
    <instancedMesh
      ref={ref}
      args={[null, null, count]}
      onUpdate={(self) => {
        matrices.forEach((mx, i) => self.setMatrixAt(i, mx));
        self.instanceMatrix.needsUpdate = true;
      }}
    >
      <boxGeometry args={[0.012, 0.012, 0.08]} />
      <meshBasicMaterial color={CYAN} transparent opacity={0.7} toneMapped={false} />
    </instancedMesh>
  );
}

/** Partículas subindo do centro da plataforma. */
function Particles({ count = 160 }) {
  const ref = useRef();
  const { positions, speeds } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 2.6;
      const a = Math.random() * Math.PI * 2;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = Math.random() * 3.2;
      p[i * 3 + 2] = Math.sin(a) * r;
      s[i] = 0.15 + Math.random() * 0.35;
    }
    return { positions: p, speeds: s };
  }, [count]);

  useFrame((_, dt) => {
    const attr = ref.current?.geometry.attributes.position;
    if (!attr) return;
    for (let i = 0; i < count; i++) {
      let y = attr.array[i * 3 + 1] + speeds[i] * dt;
      if (y > 3.2) y = 0;
      attr.array[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={CYAN} size={0.025} transparent opacity={0.75} sizeAttenuation toneMapped={false} depthWrite={false} />
    </points>
  );
}

/** Cone de luz suave saindo do centro (feixe do holograma). */
function LightBeam() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: BLUE } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "uniform vec3 uColor; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 2.6) * 0.2; gl_FragColor = vec4(uColor, a); }",
      }),
    []
  );
  return (
    <mesh position={[0, 1.5, 0]} material={material}>
      <cylinderGeometry args={[2.2, 1.0, 3, 64, 1, true]} />
    </mesh>
  );
}

function Platform() {
  return (
    <group position={[0, -1.15, 0]} scale={0.82}>
      {/* base escura com brilho central */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[3.1, 96]} />
        <meshBasicMaterial color="#0a1a36" transparent opacity={0.85} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
        <circleGeometry args={[1.1, 64]} />
        <meshBasicMaterial color={BLUE} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <GlowRing radius={3.05} tube={0.018} opacity={0.9} />
      <GlowRing radius={2.4} tube={0.01} color={BLUE} opacity={0.8} speed={-0.25} arc={Math.PI * 1.4} />
      <GlowRing radius={1.75} tube={0.028} color={BLUE} opacity={0.95} speed={0.4} arc={Math.PI * 0.6} />
      <GlowRing radius={1.75} tube={0.028} color={BLUE} opacity={0.95} speed={0.4} arc={Math.PI * 0.35} />
      <GlowRing radius={1.1} tube={0.012} opacity={1} />
      <GlowRing radius={0.55} tube={0.02} opacity={1} speed={-0.8} arc={Math.PI * 1.6} />
      <TickRing />
      <Particles />
      <LightBeam />
    </group>
  );
}

/** Painel de dados real (DOM) posicionado no espaço 3D. */
function DataPanel({ position, rotationY = 0, width, children, hud = false, floatSpeed = 1.4 }) {
  return (
    <Float speed={floatSpeed} rotationIntensity={0.08} floatIntensity={0.35}>
      <group position={position} rotation-y={rotationY}>
        <Html transform distanceFactor={4.3} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className={`glass glow-top rounded-xl p-3.5 ${hud ? "hud-corners" : ""}`} style={{ width }}>
            {children}
          </div>
        </Html>
      </group>
    </Float>
  );
}

/** Câmera acompanha levemente o mouse (paralaxe). */
function CameraRig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.9, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.3 + pointer.y * 0.4, 0.04);
    camera.lookAt(0, -0.05, 0);
  });
  return null;
}

export default function HoloScene3D({ stats, loading }) {
  const data = derivePanelData(stats);
  return (
    <div
      className="relative h-[360px] w-[600px] xl:w-[680px]"
      style={{
        maskImage: "radial-gradient(ellipse 72% 85% at 50% 45%, #000 60%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 72% 85% at 50% 45%, #000 60%, transparent 100%)",
      }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.3, 6.6], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <CameraRig />
        <Platform />
        <DataPanel position={[-2.4, 0.3, -0.5]} rotationY={0.42} width={176} floatSpeed={1.2}>
          <CompetitividadePanel data={data} loading={loading} />
        </DataPanel>
        <DataPanel position={[0, 0.55, 0.1]} width={208} hud floatSpeed={1.6}>
          <PerguntasPanel data={data} loading={loading} />
        </DataPanel>
        <DataPanel position={[2.4, 0.3, -0.5]} rotationY={-0.42} width={176} floatSpeed={1.35}>
          <LinksPanel data={data} loading={loading} />
        </DataPanel>
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.15} luminanceSmoothing={0.3} radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
