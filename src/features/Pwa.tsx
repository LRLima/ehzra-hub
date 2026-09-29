/** Aviso de nova versão do app (service worker) sem recarregar no meio de um combate. */
import { useRegisterSW } from 'virtual:pwa-register/react';

export function AtualizarApp() {
  const { needRefresh: [precisa, setPrecisa], updateServiceWorker } = useRegisterSW();
  if (!precisa) return null;
  return (
    <div className="toasts" style={{ bottom: 'auto', top: 90 }}>
      <div className="toast">
        <span className="t">Nova versão do Hub disponível.</span>
        <button className="btn mini ouro" onClick={() => updateServiceWorker(true)}>Atualizar</button>
        <button className="btn mini fantasma" onClick={() => setPrecisa(false)}>Depois</button>
      </div>
    </div>
  );
}
