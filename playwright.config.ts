import { defineConfig, devices } from '@playwright/test';

// Usa o Edge já instalado no Windows (sem baixar navegador). No CI (Linux), usa o Chromium do Playwright.
const channel = process.env.CI ? undefined : 'msedge';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  // Vários Edge animando o fundo ao mesmo tempo sobrecarregam este PC; 2 em paralelo é estável.
  workers: process.env.CI ? undefined : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    reducedMotion: 'reduce', // testa o caminho sem animação (acessibilidade) e evita instabilidade
  },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'], channel } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
