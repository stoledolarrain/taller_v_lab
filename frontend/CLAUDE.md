# Frontend — Contexto Específico (React + Vite + TypeScript)

Este subdirectorio contiene la aplicación cliente SPA de **Pasanaku Digital**.

## 🛠 Stack y Herramientas

- **Librería UI:** React 19
- **Lenguaje:** TypeScript 5.7+
- **Bundler:** Vite 6
- **Estilos:** CSS modular / App.css con paleta basada en tonos pizarra y esmeralda

---

## 🏛 Arquitectura: Patrón MVVM

La arquitectura del frontend desacopla estrictamente la lógica de la presentación:

- **Model (`src/types/` & `src/services/`):**
  - Interfaces y tipos TypeScript (`User`, `AuthTokens`, etc.).
  - `apiClient.ts`: Cliente HTTP centralizado que inyecta automáticamente el encabezado `Authorization: Bearer <token>`.
  - Servicios API (`authService.ts`, `groupsService.ts`).
- **ViewModel (`src/context/` & `src/hooks/`):**
  - Manejo del estado global y reactivo (`AuthContext.tsx`).
  - Custom hooks (`useAuth.ts`, etc.) que exponen estado, funciones de acción y manejo de errores hacia los componentes.
- **View (`src/components/`):**
  - Componentes de interfaz puros (`LoginForm.tsx`, `RegisterForm.tsx`, `Navbar.tsx`, etc.).
  - No realizan llamadas `fetch` directas; consumen exclusivamente el ViewModel correspondiente.

---

## 💻 Comandos Útiles

```bash
npm run dev      # Iniciar servidor de desarrollo en http://localhost:5173
npm run build    # Compilación estática de TypeScript y bundle de producción
npm run preview  # Previsualizar el build de producción
```
