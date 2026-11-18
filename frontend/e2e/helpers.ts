import { expect, type Browser, type Locator, type Page } from '@playwright/test';

/**
 * Pasos reutilizables de los E2E. Todos interactúan con la interfaz real
 * (formularios, botones y textos visibles), nunca llaman a la API directamente.
 */

export const PASSWORD = 'Pasanaku#2026';

export interface TestUser {
  username: string;
  page: Page;
}

export interface CreatedGroup {
  id: number;
  name: string;
  inviteCode: string;
}

let counter = 0;
/** Sufijo único por ejecución para que la suite se pueda repetir sin limpiar la BD */
export function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter}`;
}

/** Fecha de inicio válida (el backend rechaza fechas pasadas): hoy + 7 días */
export function futureDate(days = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Abre una sesión de navegador independiente (otro usuario) y lo registra por la UI */
export async function newRegisteredUser(
  browser: Browser,
  prefix: string,
  extra?: { ci?: string; phoneNumber?: string }
): Promise<TestUser> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const username = `${prefix}_${uniqueSuffix()}`;

  await page.goto('/');
  await page.getByRole('button', { name: 'Regístrate aquí' }).click();

  await page.locator('#firstName').fill(prefix.replace(/_/g, ' '));
  await page.locator('#lastName').fill('E2E');
  if (extra?.ci) {
    await page.locator('#ci').fill(extra.ci);
  }
  if (extra?.phoneNumber) {
    await page.locator('#phoneNumber').fill(extra.phoneNumber);
  }
  await page.locator('#username').fill(username);
  await page.locator('#email').fill(`${username}@e2e.pasanaku.bo`);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#confirmPassword').fill(PASSWORD);
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page.getByTestId('dashboard-list-screen')).toBeVisible();
  return { username, page };
}

/** Crea un grupo desde el formulario, lo abre y devuelve su id y código de invitación */
export async function createGroup(
  page: Page,
  options: { members: number; quota?: string; periodicity?: string; prefix?: string }
): Promise<CreatedGroup> {
  const name = `${options.prefix ?? 'Pasanaku E2E'} ${uniqueSuffix()}`;

  await page.getByTestId('create-group-btn').click();
  await page.getByTestId('group-name-input').fill(name);
  await page.getByTestId('group-description-input').fill('Grupo creado por pruebas E2E');
  await page.getByTestId('group-quota-input').fill(options.quota ?? '200');
  await page
    .getByTestId('group-periodicity-select')
    .selectOption(options.periodicity ?? 'MENSUAL');
  await page.getByTestId('group-start-date-input').fill(futureDate());
  await page.getByTestId('group-members-input').fill(String(options.members));
  await page.getByTestId('group-form-submit-btn').click();

  await expect(page.getByTestId('dashboard-list-screen')).toBeVisible();
  await openGroupByName(page, name);

  const id = Number(/#\/grupos\/(\d+)/.exec(page.url())?.[1]);
  const inviteCode = (await page.getByTestId('invite-code-value').innerText()).trim();
  expect(id).toBeGreaterThan(0);
  expect(inviteCode).not.toBe('');

  return { id, name, inviteCode };
}

/** Desde el listado, abre el detalle de un grupo por su nombre */
export async function openGroupByName(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: `Ver detalle del grupo ${name}` }).click();
  await expect(page.getByTestId('group-detail')).toBeVisible();
}

/** Abre (o recarga) el detalle de un grupo por su enlace, con datos frescos del backend */
export async function gotoGroup(page: Page, groupId: number): Promise<void> {
  await page.goto(`/#/grupos/${groupId}`);
  await page.reload();
  await expect(page.getByTestId('group-detail')).toBeVisible();
}

/** Se une a un grupo con el código de invitación: buscar → ver preview → confirmar */
export async function joinGroup(page: Page, inviteCode: string): Promise<void> {
  await page.getByTestId('join-group-btn').click();
  await page.getByTestId('invite-code-input').fill(inviteCode);
  await page.getByTestId('join-search-btn').click();
  await expect(page.getByTestId('join-group-preview')).toBeVisible();
  await page.getByTestId('join-confirm-btn').click();
  await expect(page.getByTestId('dashboard-list-screen')).toBeVisible();
}

/** El administrador sortea los turnos y confirma el inicio del pasanaku */
export async function raffleAndStart(page: Page, groupId: number): Promise<void> {
  await gotoGroup(page, groupId);
  await page.getByTestId('raffle-turns-btn').click();
  await expect(page.getByTestId('turns-list')).toBeVisible();

  await expect(page.getByTestId('start-pasanaku-btn')).toBeEnabled();
  await page.getByTestId('start-pasanaku-btn').click();
  await page.getByTestId('modal-confirm-btn').click();

  await expect(page.getByTestId('status-badge-iniciado')).toBeVisible();
  await expect(page.getByTestId('current-round-card')).toBeVisible();
}

/**
 * Escenario base de varios tests: un administrador y un participante en un
 * pasanaku de 2 personas, Bs 200 mensual, ya iniciado (Ronda 1 activa).
 */
export async function setupStartedGroup(browser: Browser) {
  const admin = await newRegisteredUser(browser, 'admin');
  const group = await createGroup(admin.page, { members: 2 });

  const participant = await newRegisteredUser(browser, 'socio');
  await joinGroup(participant.page, group.inviteCode);

  await raffleAndStart(admin.page, group.id);
  return { admin, participant, group };
}

/** Fila de la tabla de cuotas de la ronda activa que corresponde a un usuario */
export function contributionRowOf(page: Page, username: string): Locator {
  return page
    .locator('tr[data-testid^="contribution-row-"]')
    .filter({ hasText: `@${username}` });
}

/** El administrador valida la cuota de un usuario y comprueba que quede PAGADA */
export async function validateContributionOf(
  page: Page,
  username: string
): Promise<void> {
  const row = contributionRowOf(page, username);
  await row.locator('[data-testid^="validate-contribution-btn-"]').click();
  await expect(row.getByTestId('status-badge-pagada')).toBeVisible();
}
