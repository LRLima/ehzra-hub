import { useEffect, useRef, useState } from 'react';
import {
  SwordIcon, BookOpenIcon, UserIcon, NotebookIcon, DotsThreeIcon, MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import { useJogo, useRota, useUI } from './store';
import { Toasts } from './ui/components';
import { Sheets } from './features/Sheets';
import { Combate } from './features/Combate';
import { Grimorio } from './features/Grimorio';
import { Ficha } from './features/Ficha';
import { Sessao } from './features/Sessao';
import { Mais } from './features/Mais';
import { manaMaxima } from './domain/rules';
import { ConcBanner } from './features/Palco';
import { CastFlash } from './ui/components';
import { pvMaximo } from './domain/state';
import { AtualizarApp } from './features/Pwa';

function TopBar() {
  const { r, s } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const max = pvMaximo(r, s);
  const manaMax = manaMaxima(r, s.nivel);
  const [trail, setTrail] = useState(s.pv);
  const [curou, setCurou] = useState(false);
  const antes = useRef(s.pv);
  const header = useRef<HTMLElement>(null);

  // O topo cresce com a faixa de concentração; o conteúdo acompanha para nada ficar escondido embaixo.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.setProperty('--topbar-h', '0px'); };
  }, []);

  // A barra muda na hora; o rastro claro "sangra" atrás dela.
  useEffect(() => {
    if (s.pv > antes.current) { setCurou(true); setTimeout(() => setCurou(false), 650); }
    antes.current = s.pv;
    const t = setTimeout(() => setTrail(s.pv), 30);
    return () => clearTimeout(t);
  }, [s.pv]);

  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / (max + s.pvTemp)) * 100))}%`;

  return (
    <header className="topbar" ref={header}>
      <div className="topbar-inner">
        <button className={`vital${s.pv <= max / 4 ? ' hp-baixo' : ''}`} onClick={() => abrir({ tipo: 'pv' })} aria-label={`PV ${s.pv} de ${max}. Tocar para dano ou cura`}>
          <div className="vital-row">
            <span className="vital-label">PV</span>
            <span className="vital-val" data-testid="pv">{s.pv}</span>
            <span className="vital-max">/{max}</span>
            {s.pvTemp > 0 && <span className="badge-temp">+{s.pvTemp}</span>}
          </div>
          <div className={`hpbar${curou ? ' cura' : ''}`}>
            <span className="trail" style={{ width: pct(Math.max(trail, s.pv)) }} />
            <span className="fill" style={{ width: pct(s.pv) }} />
            {s.pvTemp > 0 && <span className="temp" style={{ left: pct(s.pv), width: pct(s.pvTemp) }} />}
          </div>
        </button>
        <button className="vital" onClick={() => abrir({ tipo: 'mana' })} aria-label={`Mana ${s.mana} de ${manaMax}`}>
          <div className="vital-row">
            <span className="vital-label">MANA</span>
            <span className="vital-val mana-val" data-testid="mana">{s.mana}</span>
            <span className="vital-max">/{manaMax}</span>
          </div>
          <div className="manabar" style={{ gridTemplateColumns: `repeat(${Math.ceil(manaMax / 2)}, 1fr)` }}>
            {Array.from({ length: Math.ceil(manaMax / 2) }, (_, i) => <i key={i} className={i * 2 < s.mana ? '' : 'off'} />)}
          </div>
        </button>
      </div>
      <ConcBanner />
    </header>
  );
}

const ABAS = [
  { id: 'combate', rotulo: 'Combate', Icone: SwordIcon },
  { id: 'magias', rotulo: 'Magias', Icone: BookOpenIcon },
  { id: 'ficha', rotulo: 'Ficha', Icone: UserIcon },
  { id: 'sessao', rotulo: 'Sessão', Icone: NotebookIcon },
  { id: 'mais', rotulo: 'Mais', Icone: DotsThreeIcon },
];

export function App() {
  const rota = useRota();
  const { pronto } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const palcoVisivel = useUI((u) => u.palcoVisivel);
  const aba = rota[0];

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrir({ tipo: 'busca' }); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [abrir]);

  const telaCheia = aba === 'mais' && rota[1] === 'lore';

  return (
    <div className="app">
      <div className="lava" aria-hidden="true"><i /><i /><i /><i /></div>
      {!telaCheia && !(aba === 'combate' && pronto && palcoVisivel) && <TopBar />}
      <main className={`main page-in${telaCheia ? ' sem-topbar' : ''}`} key={rota.join('/')}>
        {!pronto ? <p className="faint">Abrindo o grimório...</p>
          : aba === 'combate' ? <Combate />
          : aba === 'magias' ? <Grimorio />
          : aba === 'ficha' ? <Ficha />
          : aba === 'sessao' ? <Sessao />
          : <Mais rota={rota.slice(1)} />}
      </main>
      <button className="fab" onClick={() => abrir({ tipo: 'busca' })} aria-label="Buscar (Ctrl+K)" data-testid="busca">
        <MagnifyingGlassIcon size={22} weight="bold" />
      </button>
      <nav className="nav" aria-label="Seções">
        <ul>
          {ABAS.map(({ id, rotulo, Icone }) => (
            <li key={id}>
              <a href={`#/${id}`} aria-current={aba === id ? 'page' : undefined}>
                <Icone size={20} weight={aba === id ? 'fill' : 'regular'} />{rotulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Sheets />
      <Toasts />
      <CastFlash />
      <AtualizarApp />
    </div>
  );
}
