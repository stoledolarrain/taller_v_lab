import { expect, test } from '@playwright/test';
import { createGroup, newRegisteredUser } from './helpers';

/**
 * E2E 07 — Control de acceso (PDF Sec. 13, aislamiento Sec. 10):
 * usuario no perteneciente al grupo intenta acceder → sistema bloquea el acceso.
 */
test('E2E 07 - un usuario ajeno no puede ver un grupo privado', async ({ browser }) => {
  const admin = await newRegisteredUser(browser, 'admin');
  const group = await createGroup(admin.page, { members: 3 });

  const outsider = await newRegisteredUser(browser, 'ajeno');

  // El grupo no aparece entre los grupos del usuario ajeno
  await expect(outsider.page.getByTestId('dashboard-list-screen')).not.toContainText(
    group.name
  );

  // Intenta abrir el grupo directamente por su enlace
  await outsider.page.goto(`/#/grupos/${group.id}`);
  await outsider.page.reload();

  // El sistema bloquea el acceso: mensaje de autorización y ningún dato privado
  await expect(outsider.page.getByTestId('error-message')).toContainText(
    /No tienes (permiso|autorización)/
  );
  await expect(outsider.page.getByTestId('group-detail')).toHaveCount(0);
  await expect(outsider.page.getByText(group.name)).toHaveCount(0);
  await expect(outsider.page.getByText(group.inviteCode)).toHaveCount(0);

  // Puede volver a su listado sin problemas
  await outsider.page.getByTestId('group-detail-back-on-error').click();
  await expect(outsider.page.getByTestId('dashboard-list-screen')).toBeVisible();
});
