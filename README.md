# Gestión MAS 🥔

> Sistema integral de gestión agropecuaria para el seguimiento de **ventas, cobros, gastos y flujo de caja**. Aplicación full-stack *mobile-first* con PWA, construida sobre el ecosistema serverless de Cloudflare.

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <br/>
  <img alt="Hono" src="https://img.shields.io/badge/Hono-4-E36002?style=for-the-badge&logo=hono&logoColor=white" />
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflareworkers&logoColor=white" />
  <img alt="Cloudflare D1" src="https://img.shields.io/badge/D1_SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" />
</p>

---

## ✨ Características

- 📊 **Dashboard financiero** — balance neto en tiempo real entre cobros e ingresos vs. gastos.
- 👥 **Gestión de clientes** — alta de clientes con CUIT y estado de cuenta corriente por cliente.
- 🧾 **Ventas y cobros** — registro de ventas con saldo pendiente, pagos parciales y métodos de cobro.
- 💸 **Gastos operativos** — carga de gastos con categorías y soporte para adjuntar recibos.
- 🔐 **Autenticación JWT** — login seguro con contraseñas hasheadas (bcrypt) y multi-empresa.
- 📱 **PWA mobile-first** — instalable en el teléfono, pensada para uso en campo.
- ⚡ **100% serverless** — sin servidores que mantener: corre íntegramente sobre la red de Cloudflare.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | React 19 · TypeScript · Vite 6 · Tailwind CSS · Zustand · React Query · React Router · PWA |
| **Backend** | Hono (Worker-first framework) · Cloudflare Workers · TypeScript |
| **Base de datos** | Cloudflare D1 (SQLite) · Drizzle ORM · migraciones versionadas |
| **Auth & validación** | JWT · bcryptjs · Zod |
| **Infraestructura** | Cloudflare Workers (API) · Cloudflare Pages (front) · Wrangler |

El frontend sigue el patrón **Atomic Design** (`atoms` → `molecules` → `organisms` → `templates` → `pages`).

---

## 📸 Capturas

<!-- Reemplazá estos enlaces por tus imágenes (sugerencia: subilas a una carpeta /docs/screenshots y referencialas aquí). -->

| Login | Dashboard | Clientes |
| :---: | :---: | :---: |
| _![Login](docs/screenshots/login.png)_ | _![Dashboard](docs/screenshots/dashboard.png)_ | _![Clientes](docs/screenshots/clientes.png)_ |

> 💡 _Pendiente: agregar las capturas reales en `docs/screenshots/`._

---

## 📂 Estructura del Proyecto

```text
.
├── gestion-back/          # Backend (Cloudflare Workers + D1)
│   ├── drizzle/           # Migraciones de base de datos
│   ├── scripts/           # Seeds (demo y producción)
│   ├── src/routes/        # Rutas: clients, sales, payments, expenses
│   ├── middleware/        # Autenticación JWT
│   ├── index.ts           # Punto de entrada de la API
│   ├── schema.ts          # Definición de tablas (Drizzle)
│   └── wrangler.toml      # Configuración de Cloudflare
├── gestion-front/         # Frontend (React + Vite)
│   └── src/
│       ├── components/    # UI por Atomic Design
│       ├── pages/         # Vistas (Dashboard, Ventas, Gastos, Clientes…)
│       ├── services/      # Cliente API (Axios)
│       └── stores/        # Estado global (Zustand)
├── DEPLOYMENT.md          # Guía de despliegue a producción
└── README.md
```

---

## 🚀 Puesta en Marcha Local

### Requisitos
- Node.js v20+
- Cloudflare Wrangler (`npm install -g wrangler`)

### 1. Backend
```bash
cd gestion-back
npm install

# Generar y aplicar migraciones locales
npm run generate
npx wrangler d1 execute gestion-db --local --file drizzle/0000_simple_cassandra_nova.sql

# Levantar la API en http://localhost:8787
npm run dev
```

### 2. Frontend
```bash
cd gestion-front
npm install

# Crear .env con la URL de la API:
# VITE_API_URL=http://localhost:8787

npm run dev
```

---

## 🔐 Endpoints Principales

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Autenticación de usuarios |
| `GET` | `/metrics/cash-flow` | Resumen de ingresos y egresos |
| `GET` | `/metrics/movements` | Historial de transacciones |
| `GET` | `/clients` | Listado y estados de cuenta |
| `GET` / `POST` | `/sales` | Consulta y registro de ventas |
| `POST` | `/payments` | Registro de cobros a clientes |
| `POST` | `/expenses` | Registro de gastos operativos |

---

## 📦 Despliegue

El proyecto se despliega sobre Cloudflare (Workers para la API + Pages para el front). Los pasos detallados están en la **[Guía de Despliegue](./DEPLOYMENT.md)**.

---

## 👩‍💻 Autora

Desarrollado por **Karen Simari**.

## 📄 Licencia

Proyecto desarrollado para MAS. El código se comparte públicamente con fines de portfolio.
