/**
 * Última linha de defesa: se algo quebrar ao montar a tela (por exemplo, um
 * evento antigo que o app novo não entende), mostra o erro em vez de uma tela
 * preta. Os eventos continuam salvos no aparelho.
 */
import { Component, type ReactNode } from 'react';

export class ErroFatal extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  componentDidCatch(erro: Error) {
    console.error('Erro ao montar o Hub:', erro);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    return (
      <main style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
        <h1 className="page-title">Algo quebrou</h1>
        <p>O Hub encontrou um erro ao abrir. Seus dados continuam salvos neste aparelho.</p>
        <pre className="card" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{erro.message}</pre>
        <button className="btn primario largo" onClick={() => location.reload()}>Recarregar</button>
      </main>
    );
  }
}
