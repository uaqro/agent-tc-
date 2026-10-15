# MigrationGPT · Front

Interfaz web (HTML/CSS/JS sin build) del asistente de operación del portal **Ticket Car+**.

Este repositorio contiene **solo el front**. No guarda secretos: las llaves del modelo de
lenguaje, la base de conocimiento y las guías PDF viven en el backend privado, que valida
cada petición con **Supabase Auth**.

## Arquitectura

```
Navegador ──(login)──▶ Supabase Auth ──▶ access_token (JWT)
    │
    └──(Authorization: Bearer <token>)──▶ Backend FastAPI (privado)
                                              ├─ valida el token con Supabase
                                              ├─ llaves del LLM en variables de entorno del host
                                              └─ guías, índice y PDFs
```

- **Usuarios:** chatean y descargan las guías PDF.
- **Administradores:** además editan la base de conocimiento, suben PDFs y reindexan. El backend
  lo exige; el front solo oculta los botones.

## Configuración

Edita `config.js`:

| Campo | Valor |
| --- | --- |
| `API_BASE_URL` | URL del backend (en local, `http://127.0.0.1:8000`) |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Llave **publicable** (`sb_publishable_...`), pensada para el navegador |

Nunca pongas aquí la llave `service_role`/`secret` de Supabase ni llaves del LLM.

## Ejecutar en local

```bash
python3 -m http.server 5173
```

Abre <http://localhost:5173>. El origen del front debe estar en `CORS_ORIGINS` del backend.

## Publicar

Es un sitio estático: sirve la carpeta tal cual (GitHub Pages, Netlify, Vercel, etc.).
Después:

1. Cambia `API_BASE_URL` a la URL pública del backend (HTTPS).
2. Agrega la URL del front a `CORS_ORIGINS` en el backend.
3. En Supabase, agrega la URL del front en **Authentication > URL Configuration**.

## Supabase

- **Authentication > Providers > Email:** desactiva *Allow new users to sign up* y crea los
  usuarios desde **Authentication > Users** (o invítalos).
- **Administradores:** agrega su correo en `ADMIN_EMAILS` del backend, o define
  `app_metadata.role = "admin"` en el usuario.
