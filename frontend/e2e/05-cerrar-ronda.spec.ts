import { expect, test } from '@playwright/test';
import { gotoGroup, setupStartedGroup, validateContributionOf } from './helpers';

/**
 * E2E 05 — Cerrar ronda (PDF Sec. 13):
 * todas las cuotas están pagadas → administrador confirma entrega →
 * cierra ronda → sistema habilita siguiente turno.
 */
test('E2E 05 - con todas las cuotas pagadas el administrador cierra la ronda y se habilita la siguiente', async ({
  browser,
}) => {
  const { admin, participant, group } = await setupStartedGroup(browser);

  await gotoGroup(admin.page, group.id);
  const beneficiary1 = await admin.page
    .getByTestId('turn-item-1')
    .locator('.turns-item__username')
    .innerText();
  const beneficiary2 = await admin.page
    .getByTestId('turn-item-2')
    .locator('.turns-item__username')
    .innerText();

  // Todas las cuotas pagadas
  await validateContributionOf(admin.page, admin.username);
  await validateContributionOf(admin.page, participant.username);
  await expect(admin.page.getByTestId('contributions-paid-counter')).toHaveText(
    '2/2 cuotas pagadas'
  );

  // Confirmar entrega al beneficiario y cerrar la ronda
  const closeBtn = admin.page.getByTestId('close-round-btn');
  await expect(closeBtn).toBeEnabled();
  await expect(admin.page.getByTestId('debt-block-notice')).toHaveCount(0);
  await closeBtn.click();
  await expect(admin.page.getByTestId('confirm-modal')).toContainText('entregado');
  await admin.page.getByTestId('modal-confirm-btn').click();

  // Se habilita la Ronda 2 con el siguiente beneficiario y cuotas nuevas pendientes
  await expect(admin.page.getByTestId('current-round-card')).toContainText(
    'Ronda #2 de 2'
  );
  await expect(admin.page.getByTestId('current-round-beneficiary')).toContainText(
    beneficiary2
  );
  await expect(admin.page.getByTestId('contributions-paid-counter')).toHaveText(
    '0/2 cuotas pagadas'
  );

  // La Ronda 1 queda en el historial y el turno 1 figura como ya recibido
  await expect(admin.page.getByTestId('turn-item-1')).toContainText('Ya recibió');
  await expect(admin.page.getByTestId('turn-item-2')).toContainText('Ronda en curso');
  await admin.page.getByTestId('round-history-toggle-btn').click();
  await expect(admin.page.getByTestId('history-round-row-1')).toContainText(beneficiary1);
});
