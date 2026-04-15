# Frontend

Next.js + TypeScript para una experiencia moderna con:
- chat principal,
- panel de transparencia,
- resultados tabulares,
- flujo de aprobación,
- dashboard operativo.

## Configuracion de autenticacion

El frontend usa Microsoft Entra ID y requiere que las URLs configuradas en estas variables existan tambien en el App Registration asociado al `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`:

- `NEXT_PUBLIC_REDIRECT_URI`
- `NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI`

Ejemplos habituales:

- Local: `http://localhost:3000/`
- Azure: `https://ifdev2-web.azurewebsites.net`

Si despliegas con otro dominio o cambias la URL del Web App, actualiza primero el App Registration en Entra ID y luego las variables del frontend. Si no coinciden exactamente, Microsoft devolvera `AADSTS50011`.

La authority tambien debe corresponder al tenant real y no a `common` si el App Registration esta restringido a un tenant especifico.
