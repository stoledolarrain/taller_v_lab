import { expect, test } from '@playwright/test';
import { createGroup, gotoGroup, joinGroup, newRegisteredUser } from './helpers';

/**
 * E2E 02 — Definir turnos (PDF Sec. 13):
 * administrador abre grupo → genera/asigna orden → verifica que todos tengan
 * exactamente un turno → inicia pasanaku.
 */
test('E2E 02 - el sorteo asigna exactamente un turno por participante y permite iniciar', async ({
  browser,
}) => {
  const admin = await newRegisteredUser(browser, 'admin');
  const group = await createGroup(admin.page, { members: 3 });

  // Con cupos incompletos no se puede sortear ni iniciar
  await expect(admin.page.getByTestId('raffle-turns-btn')).toBeDisabled();
  await expect(admin.page.getByTestId('start-pasanaku-btn')).toBeDisabled();

  const socio1 = await newRegisteredUser(browser, 'socio');
  await joinGroup(socio1.page, group.inviteCode);
  const socio2 = await newRegisteredUser(browser, 'socio');
  await joinGroup(socio2.page, group.inviteCode);

  // Administrador abre el grupo completo y sortea los turnos
  await gotoGroup(admin.page, group.id);
  await admin.page.getByTestId('raffle-turns-btn').click();

  const turns = admin.page.getByTestId('turns-list').locator('li');
  await expect(turns).toHaveCount(3);
  await expect(admin.page.getByTestId('turns-assigned-counter')).toHaveText(
    '3/3 asignados'
  );

  // Cada participante aparece exactamente una vez y los turnos son 1..3 sin huecos
  const usernames = await admin.page
    .getByTestId('turns-list')
    .locator('.turns-item__username')
    .allInnerTexts();
  const expected = [admin.username, socio1.username, socio2.username].map((u) => `@${u}`);
  expect([...usernames].sort()).toEqual([...expected].sort());
  expect(new Set(usernames).size).toBe(3);
  for (const n of [1, 2, 3]) {
    await expect(admin.page.getByTestId(`turn-item-${n}`)).toBeVisible();
  }

  // Requisitos cumplidos: se inicia el pasanaku
  await expect(admin.page.getByTestId('start-requirements')).toHaveCount(0);
  await admin.page.getByTestId('start-pasanaku-btn').click();
  await admin.page.getByTestId('modal-confirm-btn').click();

  await expect(admin.page.getByTestId('status-badge-iniciado')).toBeVisible();
  await expect(admin.page.getByTestId('current-round-card')).toContainText(
    'Ronda #1 de 3'
  );

  // El beneficiario de la Ronda 1 es quien tiene el turno 1
  const turn1User = await admin.page
    .getByTestId('turn-item-1')
    .locator('.turns-item__username')
    .innerText();
  await expect(admin.page.getByTestId('current-round-beneficiary')).toContainText(
    turn1User
  );
});
