# LabTrack — Sistema de Trazabilidad de Activos Tecnológicos

> Proyecto Integrador — Desarrollo de Aplicaciones Web  
> Escenario 4: Laboratorio de Innovación

---

## Descripción

**LabTrack** es una plataforma web para administrar activos tecnológicos de un laboratorio de innovación: sensores, placas, kits de robótica, dispositivos VR, equipos de cómputo y herramientas especializadas. Permite gestionar altas, bajas, préstamos, devoluciones, mantenimientos y auditoría de movimientos con roles de usuario diferenciados.

---

## Stack Tecnológico

| Capa              | Tecnología                        |
|-------------------|-----------------------------------|
| Frontend          | React 18 + Vite + TailwindCSS     |
| Backend API       | Node.js + Express                 |
| Base de datos     | PostgreSQL 15                     |
| Caché             | Redis 7                           |
| Proxy inverso     | Nginx (Alpine)                    |
| Contenedores      | Docker + Docker Compose           |
| Logs              | Winston (archivos estructurados)  |
| Exportación       | xlsx + PDFKit                     |

---

## Componentes avanzados implementados

1. ✅ **Servicio de caché** — Redis cachea consultas de activos y el dashboard (TTL configurable), con invalidación automática al modificar datos.
2. ✅ **Reverse proxy** — Nginx enruta `/api/*` al backend y `/` al frontend, gestiona compresión gzip y logging de acceso.
3. ✅ **Registro centralizado de logs** — Winston genera `app.log`, `error.log` y `audit.log` con formato JSON estructurado. Consultables desde el panel de administración.
4. ✅ *(Bonus)* **Exportación de reportes** — Descarga del inventario completo en Excel (.xlsx) o PDF con tabla formateada.

---

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) v24+
- [Docker Compose](https://docs.docker.com/compose/) v2.20+

> No se requiere Node.js ni PostgreSQL instalados localmente.

---

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-equipo/labtrack.git
cd labtrack
```

### 2. Levantar los contenedores

```bash
docker compose up --build -d
```

Este comando:
- Construye las imágenes de backend y frontend
- Levanta PostgreSQL, Redis, la API, el frontend y Nginx
- Ejecuta el script `init.sql` con el esquema y datos de ejemplo

### 3. Verificar que todo corra correctamente

```bash
docker compose ps
```

Todos los servicios deben aparecer como `running` o `healthy`.

### 4. Acceder a la aplicación

| URL                              | Descripción              |
|----------------------------------|--------------------------|
| http://localhost                 | Aplicación web (Nginx)   |
| http://localhost/api/health      | Health check de la API   |

---

## Credenciales de demostración

| Rol        | Email                   | Contraseña |
|------------|-------------------------|------------|
| Admin      | admin@labtrack.edu      | password   |
| Encargado  | carlos@labtrack.edu     | password   |
| Usuario    | ana@labtrack.edu        | password   |

---

## Módulos del sistema

| Módulo           | Descripción                                              | Roles con acceso          |
|------------------|----------------------------------------------------------|---------------------------|
| Dashboard        | KPIs, gráficas de estado, actividad reciente             | Todos                     |
| Activos          | CRUD completo de activos con filtros y exportación       | Todos / Editar: encargado |
| Préstamos        | Registro de préstamos y devoluciones                     | Ver: todos / Crear: encargado |
| Mantenimientos   | Solicitud y seguimiento de mantenimientos                | Encargado / Admin         |
| Auditoría        | Historial completo de acciones del sistema               | Admin                     |
| Logs del sistema | Visualización de logs en tiempo real                     | Admin                     |
| Reportes         | Exportación Excel / PDF                                  | Encargado / Admin         |

---

## Estructura del proyecto

```
labtrack/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── database/
│       │   ├── db.js
│       │   └── init.sql
│       ├── controllers/
│       │   ├── activos.controller.js
│       │   ├── auth.controller.js
│       │   ├── prestamos.controller.js
│       │   ├── mantenimientos.controller.js
│       │   └── dashboard.controller.js
│       ├── middleware/
│       │   └── auth.middleware.js
│       ├── routes/
│       │   └── index.js
│       ├── services/
│       │   ├── cache.service.js
│       │   ├── audit.service.js
│       │   └── export.service.js
│       └── utils/
│           └── logger.js
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── services/
        │   └── api.js
        ├── components/
        │   └── layout/
        │       └── Layout.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── ActivosPage.jsx
            ├── PrestamosPage.jsx
            └── AuditoriaPage.jsx
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real de todos los servicios
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Detener todos los contenedores
docker compose down

# Detener y eliminar volúmenes (base de datos limpia)
docker compose down -v

# Reconstruir solo el backend
docker compose up --build backend -d

# Acceder al contenedor de la base de datos
docker compose exec postgres psql -U labtrack_user -d labtrack_db

# Verificar el servicio de caché Redis
docker compose exec redis redis-cli -a redis_pass ping
```

---

## Variables de entorno (backend)

| Variable         | Descripción                   | Default               |
|------------------|-------------------------------|----------------------|
| `PORT`           | Puerto del servidor           | `4000`               |
| `DB_HOST`        | Host de PostgreSQL            | `postgres`           |
| `DB_NAME`        | Nombre de la base de datos    | `labtrack_db`        |
| `DB_USER`        | Usuario de PostgreSQL         | `labtrack_user`      |
| `DB_PASS`        | Contraseña de PostgreSQL      | `labtrack_pass`      |
| `REDIS_HOST`     | Host de Redis                 | `redis`              |
| `REDIS_PASS`     | Contraseña de Redis           | `redis_pass`         |
| `JWT_SECRET`     | Clave secreta para JWT        | *(cambiar en prod)*  |
| `JWT_EXPIRES_IN` | Expiración del token          | `8h`                 |

---

## Diagrama de arquitectura

```
                        ┌─────────────┐
         HTTP :80       │    Nginx    │   Reverse Proxy
    ──────────────────► │   (Alpine)  │
                        └──────┬──────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼ /api/*                      ▼ /*
        ┌───────────────┐           ┌─────────────────┐
        │   Backend     │           │    Frontend      │
        │  Node/Express │           │   React + Vite   │
        │   :4000       │           │    :3000         │
        └───────┬───────┘           └─────────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │
│    :5432     │  │    :6379     │
│  (datos)     │  │  (caché)     │
└──────────────┘  └──────────────┘
```

---

## Integrantes del equipo

| Nombre | Rol en el proyecto |
|--------|--------------------|
|        |                    |
|        |                    |
|        |                    |

---

## Referencias

- [Docker Documentation](https://docs.docker.com/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL 15 Docs](https://www.postgresql.org/docs/15/)
- [Redis Documentation](https://redis.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Winston Logger](https://github.com/winstonjs/winston)
