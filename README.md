# MigrationGPT · Asistente del portal Ticket Car+

Asistente que responde **cómo operar el portal web Ticket Car+**, desplegado completo en
**Netlify**: sitio estático + Edge Function de chat + Function de API. Es de acceso público
(sin login), con límite de peticiones por IP.

Este repositorio **no contiene secretos ni la base de conocimiento**:

- Las llaves (Anthropic, etc.) viven en las **variables de entorno de Netlify**.
- Las guías y los PDF viven en **Netlify Blobs** (privado), se cargan con `npm run seed`.

## Arquitectura

```
Navegador
   │
   ├─ POST /api/chat/stream  ▶ Edge Function (netlify/edge-functions/chat.ts)
   │                             límite por IP → Claude (streaming, guías en el prompt cacheado)
   └─ /api/*                 ▶ Function (netlify/functions/api.mts)
                                 estado, PDFs (descarga), editor de guías (solo con ADMIN_TOKEN)
                                        │
                                        └─ Netlify Blobs "tcplus": guides/, pdf/, bundle.json
```

- **Cualquier visitante:** chatea (15 mensajes por minuto por IP) y descarga las guías PDF.
- **Administración** (editar guías, subir PDFs, publicar): desactivada salvo que exista la
  variable `ADMIN_TOKEN` y la petición la envíe como `Authorization: Bearer`. Lo normal es
  actualizar las guías con `npm run seed`.
- El historial de cada conversación se guarda en el navegador y se envía con cada mensaje.

## Variables de entorno (Netlify)

| Variable | Descripción |
| --- | --- |
| `ANTHROPIC_API_KEY` | Llave de Anthropic (secreta) |
| `ANTHROPIC_MODEL` | Modelo de Claude |
| `ANTHROPIC_MAX_TOKENS` | Máximo de tokens por respuesta |
| `ADMIN_TOKEN` | Opcional. Habilita las funciones de administración por API |

## Cargar o actualizar guías y PDF

```bash
NETLIFY_SITE_ID=<id> NETLIFY_AUTH_TOKEN=<token> \
  npm run seed -- --guides <carpeta de guías .md> --pdfs <carpeta de PDF>
```

Cada guía es un markdown con frontmatter (`titulo`, `modulo`, `ruta`, `pdf`). Los PDF listados
en `pdf` aparecen como botón **Descargar PDF** bajo las respuestas que citan la guía.

## Desarrollo local

```bash
npm install
netlify link        # una vez
netlify dev         # http://localhost:8888
```
