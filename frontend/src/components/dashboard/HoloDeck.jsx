import { Component, Suspense, lazy, useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { HoloDeck2D } from "./HoloDeck2D";
import { useTheme } from "../../contexts/ThemeContext";

// three.js só é baixado quando o Dashboard abre em tela grande.
const HoloScene3D = lazy(() => import("./HoloScene3D"));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Se a cena 3D falhar (driver, contexto perdido), cai para a versão 2D. */
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * Hero do Dashboard: cena 3D real (React Three Fiber) com painéis de dados
 * flutuando sobre a plataforma holográfica. Some em telas < lg; no tema claro usa a 2D.
 */
export function HoloDeck({ stats, loading }) {
  const reduce = useReducedMotion();
  const { theme } = useTheme();
  const webgl = useMemo(hasWebGL, []);
  const fallback = <HoloDeck2D stats={stats} loading={loading} />;

  return (
    <div className="relative hidden lg:block">
      {/* Cena 3D é feita para fundo escuro; no tema claro usa a versão 2D. */}
      {reduce || !webgl || theme === "light" ? (
        fallback
      ) : (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <HoloScene3D stats={stats} loading={loading} />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}
