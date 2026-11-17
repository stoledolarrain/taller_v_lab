import { expect, test } from '@playwright/test';
import { gotoGroup, setupStartedGroup, validateContributionOf } from './helpers';

/**
 * E2E 06 — Historial (PDF Sec. 13):
 * participante consulta el grupo → revisa turnos, aportes realizados,
 * pendientes y beneficiarios anteriores.
 */
test('E2E 06 - el participante consulta turnos, sus aportes y los beneficiarios anteriores', async ({
  browser,
}) => {
  const { admin, participant, group } = await setupStartedGroup(browser);

  // Se completa y cierra la Ronda 1 para generar historial
  await gotoGroup(admin.page, group.id);
  await validateContributionOf(admin.page, admin.username);
  await validateContributionOf(admin.page, participant.username);
  await admin.page.getByTestId('close-round-btn').click();
  await admin.page.getByTestId('modal-confirm-btn').click();
  await expect(admin.page.getByTestId('current-round-card')).toContainText(
    'Ronda #2 de 2'
  );

  // El participante consulta el grupo
  const page = participant.page;
  await gotoGroup(page, group.id);

  // Turnos: los dos integrantes con su fecha estimada y estado
  await expect(page.getByTestId('turns-list').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('turn-date-1')).toBeVisible();
  await expect(page.getByTestId('turn-item-1')).toContainText('Ya recibió');
  const beneficiary1 = await page
    .getByTestId('turn-item-1')
    .locator('.turns-item__username')
    .innerText();

  // Sus aportes: Ronda 1 pagada, Ronda 2 pendiente
  const mine = page.getByTestId('my-contributions');
  await expect(mine).toBeVisible();
  await expect(page.getByTestId('my-contributions-counter')).toHaveText(
    '1 pagada · 1 pendiente'
  );
  const rows = mine.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('#1');
  await expect(rows.nth(0).getByTestId('status-badge-pagada')).toBeVisible();
  await expect(rows.nth(1)).toContainText('#2');
  await expect(rows.nth(1).getByTestId('status-badge-pendiente')).toBeVisible();

  // Beneficiarios anteriores y detalle de cuotas de la ronda cerrada
  await page.getByTestId('round-history-toggle-btn').click();
  const historyRow = page.getByTestId('history-round-row-1');
  await expect(historyRow).toContainText(beneficiary1);
  await expect(historyRow).toContainText('Bs 400.00');
  await page.getByTestId('history-round-detail-btn-1').click();
  const detail = page.getByTestId('history-round-detail-1');
  await expect(detail.locator('li')).toHaveCount(2);
  await expect(detail.getByTestId('status-badge-pagada')).toHaveCount(2);
});
