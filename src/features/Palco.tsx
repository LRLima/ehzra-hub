/**
 * Palco da tela inicial: o Ehzra de corpo inteiro, com o frasco de vida de um
 * lado e os cristais de mana do outro. Tudo aqui reage a dano, cura e gasto de mana.
 */
import { useEffect, useRef, useState } from 'react';
import { EyeIcon } from '@phosphor-icons/react';
import { useJogo, useUI } from '../store';
import { magia, manaMaxima } from '../domain/rules';
import { pvMaximo } from '../domain/state';

const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Número que "corre" até o valor novo em vez de trocar de uma vez. */
function useContagem(alvo: number) {
  const [v, setV] = useState(alvo);
  const atual = useRef(alvo);
  useEffect(() => {
    const de = atual.current;
    if (de === alvo) return;
    if (semMovimento()) { atual.current = alvo; setV(alvo); return; }
    const t0 = performance.now();
    const dur = Math.min(700, 220 + Math.abs(alvo - de) * 22);
    let raf = 0;
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const x = Math.round(de + (alvo - de) * (1 - Math.pow(1 - p, 3)));
      atual.current = x;
      setV(x);
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo]);
  return v;
}

/** Diferença da última mudança ("−18", "+7"), visível por um instante. */
export function useDelta(valor: number) {
  const antes = useRef(valor);
  const [fx, setFx] = useState<{ d: number; k: number } | null>(null);
  useEffect(() => {
    const d = valor - antes.current;
    antes.current = valor;
    if (!d) return;
    setFx({ d, k: Date.now() });
    const t = setTimeout(() => setFx(null), 1100);
    return () => clearTimeout(t);
  }, [valor]);
  return fx;
}

const sinal = (d: number) => (d > 0 ? `+${d}` : `−${-d}`);

export function ConcBanner({ semTestId = false }: { semTestId?: boolean }) {
  const { r, s, dispatch } = useJogo();
  const [quebrando, setQuebrando] = useState<string | null>(null);
  const conc = s.concentracao ? magia(r, s.concentracao.magia) : null;
  if (!conc && !quebrando) return null;
  return (
    <div className={`conc-banner${quebrando ? ' quebra' : ''}`} role="status" data-testid={semTestId ? undefined : 'concentracao'}>
      <EyeIcon size={18} color="var(--conc)" />
      <span className="t">Concentrado em <b>{conc?.nome ?? quebrando}</b></span>
      <button className="btn mini" onClick={() => {
        setQuebrando(conc?.nome ?? null);
        setTimeout(() => setQuebrando(null), 300);
        dispatch({ t: 'quebrarConcentracao' });
      }}>Quebrar</button>
    </div>
  );
}

export function Palco() {
  const { r, s } = useJogo();
  const { abrir, setPalco, palcoVisivel } = useUI();
  const ref = useRef<HTMLElement>(null);
  const max = pvMaximo(r, s);
  const manaMax = manaMaxima(r, s.nivel);
  const pv = useContagem(s.pv);
  const mana = useContagem(s.mana);
  const fxPv = useDelta(s.pv);
  const fxMana = useDelta(s.mana);
  const [rastro, setRastro] = useState(s.pv);

  // A barra compacta do topo só aparece quando o palco sai da tela.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPalco(true);
    // Histerese: some abaixo de 25% visível e só volta acima de 40%, para não ficar piscando no meio-termo.
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio <= 0.25) setPalco(false);
      else if (e.intersectionRatio >= 0.4) setPalco(true);
    }, { threshold: [0, 0.25, 0.4, 1] });
    io.observe(el);
    return () => { io.disconnect(); setPalco(false); };
  }, [setPalco]);

  // O líquido desce na hora; o rastro claro "sangra" logo depois.
  useEffect(() => {
    const t = setTimeout(() => setRastro(s.pv), 450);
    return () => clearTimeout(t);
  }, [s.pv]);

  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / max) * 100))}%`;
  const baixo = s.pv > 0 && s.pv <= max / 4;
  const cristais = Math.ceil(manaMax / 4);
  const fx = [
    fxPv ? (fxPv.d < 0 ? 'fx-dano' : 'fx-cura') : '',
    fxMana ? (fxMana.d < 0 ? 'fx-mana' : 'fx-mana-sobe') : '',
    baixo ? 'pv-baixo' : '', s.pv === 0 ? 'caido' : '',
  ].join(' ');
  const id = (nome: string) => (palcoVisivel ? nome : undefined);

  return (
    <>
      <section className={`palco ${fx}`} ref={ref} aria-label="Vida e mana">
        <div className="palco-nome" aria-hidden="true">Ehzra<br />Thanaris</div>

        <button className="frasco pv" onClick={() => abrir({ tipo: 'pv' })} aria-label={`PV ${s.pv} de ${max}. Tocar para dano ou cura`}>
          <span className="frasco-num"><b data-testid={id('pv')}>{pv}</b><small>/{max}</small></span>
          {s.pvTemp > 0 && <span className="badge-temp">+{s.pvTemp}</span>}
          <span className="frasco-tubo">
            <span className="rastro" style={{ height: pct(Math.max(rastro, s.pv)) }} />
            <span className="liquido" style={{ height: pct(s.pv) }} />
          </span>
          <span className="frasco-rot">Vida</span>
          {fxPv && <span key={fxPv.k} className={`delta ${fxPv.d < 0 ? 'neg' : 'pos'}`}>{sinal(fxPv.d)}</span>}
        </button>

        <div className="palco-figura">
          <img src="img/ehzra-figura.webp" alt={`${r.character.nome}, de armadura negra e capa vinho, com a Ceifadora no ombro`} />
        </div>

        <button className="frasco mana" onClick={() => abrir({ tipo: 'mana' })} aria-label={`Mana ${s.mana} de ${manaMax}`}>
          <span className="frasco-num"><b data-testid={id('mana')}>{mana}</b><small>/{manaMax}</small></span>
          <span className="cristais">
            {Array.from({ length: cristais }, (_, i) => {
              const cheio = Math.max(0, Math.min(1, (s.mana - i * 4) / 4));
              return <i key={i} className={cheio === 0 ? 'off' : ''} style={{ opacity: cheio === 0 ? undefined : 0.35 + 0.65 * cheio }} />;
            })}
          </span>
          <span className="frasco-rot">Mana</span>
          {fxMana && <span key={fxMana.k} className={`delta ${fxMana.d < 0 ? 'neg' : 'pos'}`}>{sinal(fxMana.d)}</span>}
        </button>
      </section>
      <ConcBanner />
    </>
  );
}
