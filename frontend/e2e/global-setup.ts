/**
 * Verifica que el backend esté disponible antes de correr la suite E2E,
 * para fallar con un mensaje claro en lugar de errores "Failed to fetch".
 */
export default async function globalSetup(): Promise<void> {
  const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api/v1';
  try {
    // /auth/me/ sin token responde 401: basta con que el servidor conteste
    await fetch(`${apiUrl}/auth/me/`);
  } catch {
    throw new Error(
      `\n\nNo se pudo conectar con el backend en ${apiUrl}.\n` +
        'Inicia el backend antes de correr los E2E:\n' +
        '  cd backend && source .venv/Scripts/activate && python manage.py runserver\n'
    );
  }
}
