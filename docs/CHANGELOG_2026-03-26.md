# Changelog - 2026-03-26

## Update - 2026-04-15 (Saneamiento Inicial)

### Backend
- Se reemplazo logging por consola en cliente Foundry por logging estructurado con `ILogger` para mejorar observabilidad y diagnostico.
- Se ajusto registro DI para inyectar logger en cliente Foundry sin cambiar contratos publicos.
- Se endurecio `SqlExecutionService`:
  - constantes operativas para timeouts y limites,
  - `TOP` parametrizado en consultas de auditoria,
  - timeout consistente en lecturas de auditoria por usuario.
- Se reforzo `SqlGenerationService`:
  - eliminacion de interpolacion dinamica de `observation_window` en fallback SQL,
  - uso de ventanas permitidas explicitas,
  - regex compilada para limpieza de code fences.

### Frontend
- Se fortalecieron guards contra valores nulos/estructuras incompletas en render de tablas y sugerencias de grafica.
- Se reemplazaron tipos `any` en propiedades criticas de `ChatArea` por tipos explicitos de log y `RequestInit`.

### Verificacion
- Build de Functions sin errores tras cambios.
- Sin errores de diagnostico en archivos modificados.

## Resumen
Se consolidaron mejoras en visualizacion de chat, persistencia de contexto, robustez de renderizado de iconos en frontend, y ajustes operativos en backend/deploy.

## Frontend
- Se corrigio la visualizacion de mensajes y estados en chat para evitar respuestas vacias en UI.
- Se fortalecio el manejo de sesiones y polling en `useChatSessions` para mantener consistencia por sesion activa.
- Se removieron artefactos temporales de depuracion y trazas visuales del chat.
- Se ajusto layout/anchoring de la ventana de conversacion para mantener header en posicion superior.
- Se estandarizo el renderizado de iconos en vistas principales mediante SVG inline para evitar fallback a texto.
- Se incorporo `frontend/components/AppIcon.tsx` como componente reutilizable de iconos.
- Se actualizaron iconos en:
  - `ChatArea`
  - `Sidebar`
  - `TerminalLogs`
  - `ConnectionManager`
  - `IDEArea`
  - `LandingPage`
  - `UnifiedChat`
  - `WelcomeArea`
  - `WorkspaceOnboarding`
  - `app/docs/page.tsx`
  - `app/page.tsx`
- Se ajusto icono de `Clear Chat` para mejorar visibilidad y contraste.

## Backend
- Se ajusto la deserializacion de salida en `QueryIntakeFunction` para tolerar diferencias de casing.
- Se reforzo persistencia de turnos en el orquestador para rutas terminales (incluyendo caminos de aclaracion/bloqueo/completado).
- Se mejoro control de narrativa para evitar menciones de graficas no solicitadas por el usuario.
- Se realizaron ajustes operativos adicionales en funciones y arranque de API.

## Deploy y Scripts
- Actualizaciones en configuracion y flujo de despliegue:
  - `deploy/Deploy.Configuration.Sample.psd1`
  - `deploy/Invoke-FullDeployment.ps1`
- Ajustes en scripts de ejecucion local (`scripts/start-local-functions.ps1`).

## Notas
- Se excluyeron del commit archivos locales/sensibles y de ejecucion local (por ejemplo logs y settings dev locales no versionados).
