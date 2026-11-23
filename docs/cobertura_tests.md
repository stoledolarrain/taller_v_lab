# Guía de Cobertura de Pruebas (Test Coverage) — Pasanaku Digital

Este documento explica cómo funciona el sistema de medición y reporte de cobertura de código implementado para el backend del proyecto **Pasanaku Digital**. Está dirigido a todo el equipo de desarrollo para que comprendan su propósito, cómo ejecutarlo localmente y cómo se integra con GitHub Actions.

---

## 1. ¿Qué es la Cobertura de Pruebas?

La **cobertura de código (Code Coverage)** mide el porcentaje de líneas y ramas de código fuente de nuestra aplicación que son ejecutadas activamente por las pruebas automatizadas.
- **Meta del Proyecto:** Mantener al menos un **90%** de cobertura en los módulos del backend.
- **Resultado Actual:** **93.72% (~94%)** de cobertura total.

---

## 2. Estrategia de Testing Evaluada (Unitarios + E2E)

Para la certificación de cobertura, la suite ejecuta exclusivamente:
1. **Pruebas Unitarias de Dominio:** 
   - `apps/groups/tests/test_unit_business_rules.py` (Las 10 reglas críticas del PDF).
   - `apps/groups/tests/test_unit_services_selectors.py` (Casos límite, selectores y permisos).
   - `apps/authentication/tests/test_models.py` y `test_services.py` (Modelos y lógica de usuarios).
2. **Pruebas End-to-End (E2E) de la API:**
   - `apps/groups/tests/test_e2e_flows.py` (Los 7 flujos completos de ciclo de vida con múltiples actores).
3. **Pruebas de Autenticación de API:**
   - `apps/authentication/tests/test_api.py` (Endpoints de registro, login y perfil JWT).

> 📌 **¿Por qué se dejan a un lado las pruebas de integración (`test_integration_api.py`) para esta medición?**  
> Las pruebas de integración comprueban llamadas HTTP aisladas redundantes con respecto a los tests E2E y unitarios. Al evaluar Unitarios + E2E se demuestra que tanto la lógica pura aislada como los flujos de punta a punta cubren más del 93% del código productivo sin inflar artificialmente los tiempos de ejecución.

---

## 3. Herramientas Utilizadas

### A. A Nivel de Lenguaje: `pytest-cov` & `coverage.py`
- **`coverage.py`:** Es el motor oficial y estándar de la *Python Software Foundation* para medir la ejecución de código en Python.
- **`pytest-cov`:** Plugin que conecta `pytest` con `coverage.py`, permitiendo generar reportes en consola, XML y HTML.
- **`backend/.coveragerc`:** Archivo de configuración que:
  - Define `source = apps` (solo mide nuestro código en `apps/authentication` y `apps/groups`).
  - Omite automáticamente carpetas no productivas (`tests/`, `migrations/`, `apps.py`, `__init__.py`).
  - Define `fail_under = 90`: Si la cobertura total es inferior al 90%, el comando falla con código de salida de error (`exit code 1`).

### B. En GitHub Actions: `MishaKav/pytest-coverage-comment`
- Bot automatizado que se ejecuta en el workflow de CI (`.github/workflows/backend-ci.yml`).
- Cuando se abre o actualiza un **Pull Request**, el bot publica un comentario interactivo en GitHub con:
  - Badge visual de cobertura (ej. `Coverage: 94%` en verde).
  - Tabla desplegable con el desglose de líneas y porcentaje archivo por archivo.

---

## 4. Cómo Ejecutar y Visualizar la Cobertura Localmente

### Paso 1: Activar el entorno virtual
```bash
cd backend

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate
```

### Paso 2: Ejecutar las pruebas con cobertura
```bash
python -m pytest apps/groups/tests/test_unit_business_rules.py \
                 apps/groups/tests/test_unit_services_selectors.py \
                 apps/groups/tests/test_e2e_flows.py \
                 apps/authentication/tests/ \
                 --cov=apps \
                 --cov-config=.coveragerc \
                 --cov-report=term-missing \
                 --cov-report=html:htmlcov
```

### Paso 3: Abrir el Reporte HTML Interactivo
El comando anterior creará una carpeta llamada `backend/htmlcov/`.  
Abre en tu navegador el archivo:
```text
backend/htmlcov/index.html
```
En este reporte podrás:
- Ver el porcentaje global del proyecto (**94%**).
- Hacer clic en cualquier archivo (ej. `apps/groups/services.py`) para ver el código resaltado:
  - 🟩 **Verde:** Líneas ejecutadas y verificadas por las pruebas.
  - 🟥 **Rojo:** Líneas no ejecutadas (ramas pendientes o excepciones no alcanzadas).

---

## 5. Cómo Funciona en GitHub Actions (CI/CD)

Cada vez que alguien hace `push` o abre un `Pull Request` hacia las ramas `main` o `dev`, el workflow `.github/workflows/backend-ci.yml` realiza automáticamente:

1. **Check & Migrations:** Verifica que Django esté bien configurado y no falten migraciones.
2. **Pytest con Cobertura:** Corre las 47 pruebas de Unitarios y E2E. Si la cobertura es menor al 90%, el pipeline se marca como **FALLIDO** (rojo ❌) y bloquea el merge.
3. **Artifact Upload:** Sube la carpeta `htmlcov/` como un archivo ZIP descargable en la sección de *Artifacts* de la corrida de GitHub Actions.
4. **Comentario en el PR:** El bot deja la tabla de cobertura en la conversación del Pull Request.
5. **Step Summary:** Genera una tabla de resumen en la vista de ejecución de Actions.

---

## 6. Desglose Actual de Cobertura por Archivo

| Módulo / Archivo | Sentencias | Líneas No Cubiertas | % Cobertura |
|---|:---:|:---:|:---:|
| `apps/authentication/models.py` | 12 | 0 | **100%** |
| `apps/authentication/serializers.py` | 39 | 1 | **97%** |
| `apps/authentication/services.py` | 40 | 2 | **95%** |
| `apps/authentication/urls.py` | 5 | 0 | **100%** |
| `apps/authentication/views.py` | 30 | 0 | **100%** |
| `apps/groups/models.py` | 156 | 2 | **99%** |
| `apps/groups/permissions.py` | 13 | 0 | **100%** |
| `apps/groups/selectors.py` | 81 | 0 | **100%** |
| `apps/groups/serializers.py` | 130 | 7 | **95%** |
| `apps/groups/services.py` | 258 | 8 | **97%** |
| `apps/groups/urls.py` | 4 | 0 | **100%** |
| `apps/groups/views.py` | 187 | 40 | **79%** |
| **TOTAL** | **955** | **60** | **93.72% (~94%)** |
