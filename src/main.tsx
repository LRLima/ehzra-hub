import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import './ui/app.css';
import { JogoProvider } from './store';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JogoProvider>
      <App />
    </JogoProvider>
  </StrictMode>,
);
