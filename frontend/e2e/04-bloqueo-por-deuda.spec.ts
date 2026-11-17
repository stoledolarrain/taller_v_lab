import { expect, test } from '@playwright/test';
import { gotoGroup, setupStartedGroup, validateContributionOf } from './helpers';

/**
 * E2E 04 — Bloqueo por deuda (PDF Sec. 13, regla crítica Sec. 6):
 * administrador intenta cerrar una ronda con al menos una cuota pendiente →
 * sistema impide el cierre.
 */
test('E2E 04 - no se puede cerrar la ronda mientras exista una cuota pendiente', async ({
  browser,
}) => {
  const { admin, participant, group } = await setupStartedGroup(browser);

  // Solo se valida la cuota del administrador: la del participante sigue PENDIENTE
  await gotoGroup(admin.page, group.id);
  await validateContributionOf(admin.page, admin.username);

  const closeBtn = admin.page.getByTestId('close-round-btn');
  await expect(closeBtn).toBeDisabled();
  await expect(admin.page.getByTestId('debt-block-notice')).toContainText(
    'Bloqueo por deuda'
  );
  await expect(admin.page.getByTestId('current-round-pending')).toContainText(
    'Bs 200.00'
  );

  // Intentar el cierre igualmente: el botón no responde y la ronda no avanza
  await closeBtn.click({ force: true });
  await expect(admin.page.getByTestId('confirm-modal')).toHaveCount(0);

  await gotoGroup(admin.page, group.id);
  await expect(admin.page.getByTestId('current-round-card')).toContainText(
    'Ronda #1 de 2'
  );
  await expect(admin.page.getByTestId('close-round-btn')).toBeDisabled();

  // El participante deudor aparece identificado en el balance del grupo
  await admin.page.getByTestId('toggle-financial-details-btn').click();
  await expect(admin.page.getByTestId('financial-summary-card')).toContainText(
    participant.username
  );
});
