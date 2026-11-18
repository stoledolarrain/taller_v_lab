import { expect, test } from '@playwright/test';
import { newRegisteredUser, PASSWORD, uniqueSuffix } from './helpers';

/**
 * Pruebas End-to-End de Autenticación y Reglas de Negocio de Registro (PDF Sec. 2 y Sec. 14).
 * Valida unicidad estricta de Cédula de Identidad (C.I.), Número de Celular/Teléfono,
 * nombre de usuario y validaciones de contraseña en la interfaz real.
 */

test('E2E Auth 01 - registrar un usuario con CI y celular válidos ingresa exitosamente al dashboard', async ({
  browser,
}) => {
  const suffix = uniqueSuffix();
  const ci = `${suffix.slice(0, 7)} LP`;
  const phoneNumber = `7${Math.floor(1000000 + Math.random() * 9000000)}`;

  const user = await newRegisteredUser(browser, 'auth_ok', { ci, phoneNumber });

  await expect(user.page.getByTestId('dashboard-list-screen')).toBeVisible();
  await expect(user.page.locator('.navbar-user')).toContainText(`@${user.username}`);
  await user.page.context().close();
});

test('E2E Auth 02 - rechazar registro cuando la Cédula de Identidad (C.I.) ya está registrada en el sistema', async ({
  browser,
}) => {
  const suffix = uniqueSuffix();
  const duplicateCI = `99${suffix.slice(0, 5)} CB`;

  // 1. Registramos al primer usuario con la C.I.
  const user1 = await newRegisteredUser(browser, 'socio_original', { ci: duplicateCI });
  await expect(user1.page.getByTestId('dashboard-list-screen')).toBeVisible();
  await user1.page.context().close();

  // 2. Intentamos registrar a un segundo usuario con la MISMA C.I.
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  const secondUsername = `intruso_${uniqueSuffix()}`;

  await page2.goto('/');
  await page2.getByRole('button', { name: 'Regístrate aquí' }).click();

  await page2.locator('#firstName').fill('Segundo');
  await page2.locator('#lastName').fill('Usuario');
  await page2.locator('#ci').fill(duplicateCI);
  await page2.locator('#phoneNumber').fill('78901234');
  await page2.locator('#username').fill(secondUsername);
  await page2.locator('#email').fill(`${secondUsername}@pasanaku.bo`);
  await page2.locator('#password').fill(PASSWORD);
  await page2.locator('#confirmPassword').fill(PASSWORD);
  await page2.getByRole('button', { name: 'Registrarme' }).click();

  // 3. Verificamos que se bloquee el registro y se muestre la alerta de error
  const errorAlert = page2.locator('.error-alert');
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert).toContainText(/cédula de identidad/i);

  // Verificamos que permanezca en la pantalla de registro y NO ingrese al dashboard
  await expect(page2.getByTestId('dashboard-list-screen')).not.toBeVisible();
  await context2.close();
});

test('E2E Auth 03 - rechazar registro cuando el Celular/Teléfono ya pertenece a otro usuario', async ({
  browser,
}) => {
  const duplicatePhone = `7${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 1. Registramos al primer usuario con el celular
  const user1 = await newRegisteredUser(browser, 'titular_cel', { phoneNumber: duplicatePhone });
  await expect(user1.page.getByTestId('dashboard-list-screen')).toBeVisible();
  await user1.page.context().close();

  // 2. Intentamos registrar a un segundo usuario con el MISMO celular
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  const secondUsername = `clon_cel_${uniqueSuffix()}`;

  await page2.goto('/');
  await page2.getByRole('button', { name: 'Regístrate aquí' }).click();

  await page2.locator('#firstName').fill('Clon');
  await page2.locator('#lastName').fill('Telefono');
  await page2.locator('#ci').fill(`55${uniqueSuffix().slice(0, 5)} SC`);
  await page2.locator('#phoneNumber').fill(duplicatePhone);
  await page2.locator('#username').fill(secondUsername);
  await page2.locator('#email').fill(`${secondUsername}@pasanaku.bo`);
  await page2.locator('#password').fill(PASSWORD);
  await page2.locator('#confirmPassword').fill(PASSWORD);
  await page2.getByRole('button', { name: 'Registrarme' }).click();

  // 3. Verificamos que se bloquee el registro y se muestre la alerta de error
  const errorAlert = page2.locator('.error-alert');
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert).toContainText(/teléfono|celular/i);

  await expect(page2.getByTestId('dashboard-list-screen')).not.toBeVisible();
  await context2.close();
});

test('E2E Auth 04 - rechazar registro cuando las contraseñas no coinciden en el formulario', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Regístrate aquí' }).click();

  await page.locator('#username').fill(`user_${uniqueSuffix()}`);
  await page.locator('#email').fill(`user_${uniqueSuffix()}@pasanaku.bo`);
  await page.locator('#password').fill('Password123!');
  await page.locator('#confirmPassword').fill('OtraPasswordDistinta!');
  await page.getByRole('button', { name: 'Registrarme' }).click();

  const errorAlert = page.locator('.error-alert');
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert).toContainText(/las contraseñas no coinciden/i);
  await expect(page.getByTestId('dashboard-list-screen')).not.toBeVisible();
});
