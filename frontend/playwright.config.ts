import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de pruebas End-to-End (PDF Sec. 13).
 *
 * Requisitos para ejecutar:
 *  1. Backend Django corriendo en http://127.0.0.1:8000 (python manage.py runserver).
 *  2. El frontend se levanta automáticamente con `npm run dev` si no está corriendo.
 *
 * Cada test crea sus propios usuarios y grupos con nombres únicos, por lo que la
 * suite puede ejecutarse repetidamente sin limpiar la base de datos.
 */
const FRONTEND_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Un worker: el backend de desarrollo usa SQLite, que no tolera bien escrituras concurrentes
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    locale: 'es-BO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: FRONTEND_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
