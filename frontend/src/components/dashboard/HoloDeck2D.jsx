import { motion, useReducedMotion } from "motion/react";
import { HoloRing } from "../fx";
import { CompetitividadePanel, PerguntasPanel, LinksPanel, derivePanelData } from "./HoloPanels";

function DeckPanel({ tilt = 0, delay = 0, className = "", children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, rotateY: tilt }}
      animate={{ opacity: 1, y: 0, rotateY: tilt }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`glass glow-top rounded-xl p-3.5 ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}

/** Versão 2D (CSS) do hero — fallback sem WebGL ou com movimento reduzido. */
export function HoloDeck2D({ stats, loading }) {
  const data = derivePanelData(stats);
  return (
    <div className="relative flex flex-col items-center justify-end pt-2">
      <div className="relative z-10 flex items-end gap-3" style={{ perspective: 900, transformStyle: "preserve-3d" }}>
        <DeckPanel tilt={18} delay={0.05} className="w-44 h-40"><CompetitividadePanel data={data} loading={loading} /></DeckPanel>
        <DeckPanel delay={0.15} className="w-52 h-48 hud-corners"><PerguntasPanel data={data} loading={loading} /></DeckPanel>
        <DeckPanel tilt={-18} delay={0.25} className="w-44 h-40"><LinksPanel data={data} loading={loading} /></DeckPanel>
      </div>
      <HoloRing size={380} className="-mt-6" />
    </div>
  );
}
