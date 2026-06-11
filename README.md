# Gestión MAS 🥔

Sistema integral de gestión agropecuaria diseñado para el seguimiento de ventas, pagos, gastos y flujo de caja. Construido con una arquitectura moderna, escalable y optimizada para el ecosistema de Cloudflare.

## 🚀 Tecnologías Principales

### Backend
- **Framework:** [Hono](https://hono.dev/) (Worker-first web framework)
- **Runtime:** Cloudflare Workers
- **Base de Datos:** Cloudflare D1 (SQLite)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Autenticación:** JWT (JSON Web Tokens) & bcryptjs

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Estado/Datos:** Zustand & React Query
- **PWA:** Soporte para Progressive Web App

---

## 📂 Estructura del Proyecto

```text
.
├── gestion-back/          # Backend (Cloudflare Workers + D1)
│   ├── drizzle/           # Migraciones de base de datos
│   ├── src/               # Rutas y lógica de negocio
│   ├── index.ts           # Punto de entrada de la API
│   ├── schema.ts          # Definición de tablas Drizzle
│   └── wrangler.toml      # Configuración de Cloudflare
├── gestion-front/         # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # Componentes UI (Atomic Design)
│   │   ├── pages/         # Vistas principales (Dashboard, Ventas, etc.)
│   │   ├── services/      # Cliente API (Axios)
│   │   └── stores/        # Gestión de estado (Zustand)
│   └── vite.config.ts     # Configuración de Vite & PWA
└── README.md              # Este archivo
```

---

## 🛠️ Configuración Local

### 1. Requisitos
- Node.js (v20+)
- Cloudflare Wrangler (`npm install -g wrangler`)

### 2. Backend Setup
```bash
cd gestion-back
npm install

# Generar y aplicar migraciones locales
npm run generate
npx wrangler d1 execute DB --local --file drizzle/0000_simple_cassandra_nova.sql

# Inicializar datos de prueba (opcional)
# Puedes usar el endpoint /setup tras iniciar el servidor
npm run dev
```

### 3. Frontend Setup
```bash
cd gestion-front
npm install

# Configurar variables de entorno (crear .env)
# VITE_API_URL=http://localhost:8787

npm run dev
```

---

## 🔐 Endpoints Principales

- `POST /auth/login`: Autenticación de usuarios.
- `GET /metrics/cash-flow`: Resumen de ingresos y egresos.
- `GET /metrics/movements`: Historial de transacciones financieras.
- `GET /clients`: Gestión de clientes y estados de cuenta.
- `GET /sales` / `POST /sales`: Registro y consulta de ventas.
- `POST /payments`: Registro de cobros a clientes.
- `POST /expenses`: Registro de gastos operativos (con soporte para recibos).

---

## 📦 Despliegue

Para detalles específicos sobre cómo subir este proyecto a producción en Cloudflare, consulta la **[Guía de Despliegue](./DEPLOYMENT.md)**.

---

## 📄 Licencia
Este proyecto es privado y para uso exclusivo de MAS.
