import { motion, useReducedMotion } from "motion/react";
import { HoloRing } from "../fx";

const TILTS = [16, 0, -16];

/**
 * Painel direito das telas de autenticação: título + pontos-chave flutuando
 * em painéis de vidro sobre o anel holográfico (cena do vídeo da marca).
 */
export default function AuthShowcase({ title, subtitle, points = [] }) {
  const reduce = useReducedMotion();
  return (
    <div className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-between p-14 border-l border-line/10">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 78%, rgb(30 123 255 / 0.28), transparent 70%), radial-gradient(ellipse 50% 40% at 90% 0%, rgb(var(--glow) / 0.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--line) / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line) / 0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 60%, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 60%, #000 30%, transparent 80%)",
        }}
      />

      <div className="relative z-10 max-w-xl">
        <h2 className="text-4xl xl:text-[2.75rem] font-semibold leading-[1.08] text-fg">{title}</h2>
        {subtitle && <p className="mt-4 text-base leading-relaxed text-fg-muted max-w-md">{subtitle}</p>}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-end justify-center gap-3" style={{ perspective: 900 }}>
          {points.slice(0, 3).map(({ icon: Icon, text }, i) => (
            <motion.div
              key={text}
              initial={reduce ? false : { opacity: 0, y: 28, rotateY: TILTS[i] }}
              animate={{ opacity: 1, y: 0, rotateY: TILTS[i] }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className={`glass glow-top rounded-2xl p-4 w-48 ${i === 1 ? "hud-corners mb-6" : ""}`}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-glow/30 bg-glow/10 text-glow shadow-[0_0_16px_-4px_rgb(var(--glow)/0.8)]">
                <Icon size={17} />
              </div>
              <p className="text-sm leading-snug text-fg/90">{text}</p>
            </motion.div>
          ))}
        </div>
        <HoloRing size={460} className="-mt-10" />
      </div>

      <p className="relative z-10 text-xs text-fg-dim">
        © {new Date().getFullYear()} ML SmartHub · Todos os direitos reservados
      </p>
    </div>
  );
}
