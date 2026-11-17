import { expect, test } from '@playwright/test';
import { contributionRowOf, gotoGroup, setupStartedGroup } from './helpers';

/**
 * E2E 03 — Registrar aportes (PDF Sec. 13):
 * participante ingresa → consulta cuota → registra/reporta pago →
 * administrador valida → estado cambia a PAGADA.
 */
test('E2E 03 - el participante reporta su pago y el administrador lo valida como PAGADA', async ({
  browser,
}) => {
  const { admin, participant, group } = await setupStartedGroup(browser);

  // Participante consulta su cuota de la ronda activa: Bs 200, PENDIENTE
  await gotoGroup(participant.page, group.id);
  const myRow = contributionRowOf(participant.page, participant.username);
  await expect(myRow).toContainText('Bs 200.00');
  await expect(myRow.getByTestId('status-badge-pendiente')).toBeVisible();

  // Reporta el pago realizado fuera de la plataforma
  await myRow.locator('[data-testid^="pay-contribution-btn-"]').click();
  await expect(participant.page.getByTestId('report-payment-modal')).toBeVisible();
  await participant.page
    .getByTestId('payment-notes-input')
    .fill('Transferencia QR #E2E-001');
  await participant.page.getByTestId('report-payment-confirm-btn').click();

  // Queda "Por validar" (sigue PENDIENTE) y ya no puede volver a reportarlo
  await expect(myRow.locator('[data-testid^="contribution-reported-"]')).toBeVisible();
  await expect(myRow.getByTestId('status-badge-pendiente')).toBeVisible();
  await expect(myRow.locator('[data-testid^="pay-contribution-btn-"]')).toHaveCount(0);
  await expect(myRow).toContainText('Transferencia QR #E2E-001');

  // Administrador ve el reporte pendiente y valida el aporte
  await gotoGroup(admin.page, group.id);
  await expect(admin.page.getByTestId('contributions-reported-counter')).toHaveText(
    '1 por validar'
  );
  const rowForAdmin = contributionRowOf(admin.page, participant.username);
  await rowForAdmin.locator('[data-testid^="validate-contribution-btn-"]').click();

  await expect(rowForAdmin.getByTestId('status-badge-pagada')).toBeVisible();
  await expect(rowForAdmin).toContainText(`por @${admin.username}`);

  // El participante ve su cuota como PAGADA, con fecha de validación
  await gotoGroup(participant.page, group.id);
  await expect(myRow.getByTestId('status-badge-pagada')).toBeVisible();
  const myHistory = participant.page.getByTestId('my-contributions');
  await expect(myHistory.getByTestId('status-badge-pagada')).toBeVisible();
  await expect(myHistory).not.toContainText('Sin validar');
});
