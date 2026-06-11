# Guía de Despliegue a Producción (Cloudflare) ☁️

Este documento detalla los pasos necesarios para desplegar tanto el backend como el frontend del sistema MAS en la plataforma Cloudflare.

---

## 1. Backend (Cloudflare Workers + D1)

### Paso A: Crear la Base de Datos D1
Desde tu terminal, ejecuta:
```bash
npx wrangler d1 create gestion-db
```
Copia el `database_id` que te devuelva el comando.

### Paso B: Configurar `wrangler.toml`
Actualiza el archivo `gestion-back/wrangler.toml` con el ID obtenido:
```toml
name = "gestion-back"
main = "index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "gestion-db"
database_id = "TU_DATABASE_ID_AQUÍ"

[vars]
JWT_SECRET = "una-clave-muy-segura" # Cambia esto
SEED_SECRET = "otra-clave-para-seeds" # Cambia esto
```

### Paso C: Desplegar Base de Datos (Esquema)
Aplica las migraciones de Drizzle a la base de datos de producción:
```bash
cd gestion-back
# Genera el SQL si no existe
npm run generate 
# Ejecuta en producción (quita --local)
npx wrangler d1 execute gestion-db --file ./drizzle/0000_simple_cassandra_nova.sql
```

### Paso D: Desplegar Worker
```bash
npm run deploy
```
Al finalizar, Cloudflare te dará una URL (ej: `https://gestion-back.tu-usuario.workers.dev`). **Cópiala**, la necesitarás para el frontend.

---

## 2. Frontend (Cloudflare Pages)

### Paso A: Preparar Variables de Entorno
Cloudflare Pages permite configurar variables desde su panel.
- Necesitarás: `VITE_API_URL` con el valor de la URL de tu backend.

### Paso B: Conectar Repositorio
1. Entra al panel de Cloudflare -> **Workers & Pages**.
2. Dale a **Create application** -> **Pages** -> **Connect to Git**.
3. Selecciona tu repositorio.

### Paso C: Configuración de Build
- **Project Name:** `gestion-mas`
- **Framework Preset:** `Vite`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/gestion-front` (Importante!)

### Paso D: Añadir Variables
En el panel de configuración de la página (Settings -> Variables and Secrets):
- Añade `VITE_API_URL` con la URL de tu Worker de producción.

---

## 3. Inicialización de Datos (Seed Seguro)

Una vez desplegado todo, la base de datos estará vacía. Para crear el primer usuario y empresa de forma segura:

1. Configura el `SEED_SECRET` en los Secrets del Worker si no lo pusiste en el `.toml`.
2. Utiliza el script de seed incluido en `gestion-back/scripts`:
   ```bash
   # En gestion-back
   # Crea un .env.seed basado en .env.seed.example con los datos reales
   source .env.seed && npx tsx scripts/seed-production.ts
   ```
   *Nota: Asegúrate de que `API_URL` en `.env.seed` apunte a la URL de producción.*

---

## ✅ Resumen de Comandos Críticos

| Tarea | Comando | Directorio |
| :--- | :--- | :--- |
| Crear DB D1 | `npx wrangler d1 create <name>` | Root |
| Migración Prod | `npx wrangler d1 execute <db> --file <path>` | `gestion-back` |
| Desplegar API | `npm run deploy` | `gestion-back` |
| Build Front | `npm run build` | `gestion-front` |

---

## ⚠️ Notas Importantes
- **CORS:** El backend permite CORS por defecto (`app.use('*', cors())`). Si tienes problemas, puedes restringir los dominios en `index.ts`.
- **Drizzly Kit:** Mantén siempre sincronizado `schema.ts` con tus migraciones locales antes de subir a producción.
