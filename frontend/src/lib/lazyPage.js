import { lazy } from "react";

const RELOAD_FLAG = "chunk-reload-at";

/**
 * React.lazy com recuperação de deploy: se o arquivo da página não existir mais
 * (aba aberta antes de um deploy novo), recarrega a página uma vez para buscar
 * os arquivos atuais. Evita loop: só recarrega se não recarregou nos últimos 10 s.
 */
export function lazyPage(factory) {
  return lazy(() =>
    factory().catch((err) => {
      let last = 0;
      try { last = Number(sessionStorage.getItem(RELOAD_FLAG)) || 0; } catch { /* sem storage */ }
      if (Date.now() - last > 10_000) {
        try { sessionStorage.setItem(RELOAD_FLAG, String(Date.now())); } catch { /* sem storage */ }
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    })
  );
}
