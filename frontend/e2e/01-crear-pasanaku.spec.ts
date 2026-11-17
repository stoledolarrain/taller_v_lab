import { expect, test } from '@playwright/test';
import { createGroup, gotoGroup, joinGroup, newRegisteredUser } from './helpers';

/**
 * E2E 01 — Crear pasanaku (PDF Sec. 13):
 * administrador inicia sesión → crea grupo → configura Bs 200 mensual →
 * invita participantes → completa el grupo.
 * Incluye el control de participantes duplicados (PDF Sec. 4).
 */
test('E2E 01 - el administrador crea un pasanaku de Bs 200 mensual y lo completa con participantes', async ({
  browser,
}) => {
  const admin = await newRegisteredUser(browser, 'admin');
  const group = await createGroup(admin.page, {
    members: 3,
    quota: '200',
    periodicity: 'MENSUAL',
  });

  // Configuración guardada: Bs 200, mensual, total por ronda 3 × 200 = Bs 600
  const summary = admin.page.getByRole('region', { name: 'Resumen del pasanaku' });
  await expect(summary).toContainText('Bs 200.00');
  await expect(summary).toContainText('Mensual');
  await expect(admin.page.getByTestId('group-detail-total')).toHaveText('Bs 600.00');
  await expect(admin.page.getByTestId('status-badge-borrador')).toBeVisible();
  await expect(admin.page.getByTestId('group-detail-members')).toHaveText('1/3');

  // Primer participante se une con el código de invitación
  const socio1 = await newRegisteredUser(browser, 'socio');
  await joinGroup(socio1.page, group.inviteCode);

  // Participante duplicado: intentar unirse otra vez al mismo grupo es rechazado
  await socio1.page.getByTestId('join-group-btn').click();
  await socio1.page.getByTestId('invite-code-input').fill(group.inviteCode);
  await socio1.page.getByTestId('join-search-btn').click();
  const preview = socio1.page.getByTestId('join-group-preview');
  const errorMsg = socio1.page.getByTestId('error-message');
  await expect(preview.or(errorMsg)).toBeVisible();
  if (await preview.isVisible()) {
    await socio1.page.getByTestId('join-confirm-btn').click();
  }
  await expect(errorMsg).toBeVisible();

  // Segundo participante completa el grupo
  const socio2 = await newRegisteredUser(browser, 'socio');
  await joinGroup(socio2.page, group.inviteCode);

  // El administrador ve el grupo completo (3/3), sin duplicados en la lista
  await gotoGroup(admin.page, group.id);
  await expect(admin.page.getByTestId('group-detail-members')).toHaveText('3/3');
  await expect(admin.page.getByTestId('req-full-capacity')).toHaveClass(/req-met/);

  const members = admin.page.getByTestId('members-list');
  await expect(members.locator('li')).toHaveCount(3);
  await expect(members).toContainText(socio1.username);
  await expect(members).toContainText(socio2.username);
});
