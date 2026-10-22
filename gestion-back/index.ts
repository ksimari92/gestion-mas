import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq, and, desc } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import { createDb } from './db';
import { sales, payments, auditLogs, companies, users, clients, expenses, projects, projectStages } from './schema';
import { authMiddleware, AuthVariables } from './middleware/auth';
import * as bcrypt from 'bcryptjs';

// Routes
import clientsRoute from './src/routes/clients';
import salesRoute from './src/routes/sales';
import paymentsRoute from './src/routes/payments';
import expensesRoute from './src/routes/expenses';
import projectsRoute from './src/routes/projects';
import metricsRoute from './src/routes/metrics';

type Bindings = {
    gestion_db: D1Database;
    JWT_SECRET: string;
    SEED_SECRET: string;
};

type Variables = AuthVariables;

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors());

// Auth Middleware (Skip for /setup and /auth/login)
app.use('*', async (c, next) => {
    if (c.req.path === '/setup' || c.req.path === '/auth/login' || c.req.path === '/seed-production') {
        return next();
    }
    return authMiddleware(c, next);
});

// Mount Routes
app.route('/clients', clientsRoute);
app.route('/sales', salesRoute);
app.route('/payments', paymentsRoute);
app.route('/expenses', expensesRoute);
app.route('/projects', projectsRoute);
app.route('/metrics', metricsRoute);

// POST /auth/login: Simple auth for the app
app.post('/auth/login', async (c) => {
    const db = createDb(c.env.gestion_db);
    const { email, password } = await c.req.json();

    const user = await db.select().from(users).where(eq(users.email, email)).get();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return c.json({ error: 'Credenciales invÃ¡lidas' }, 401);
    }

    const token = await sign({
        id: user.id,
        company_id: user.company_id,
        email: user.email,
        name: user.name
    }, c.env.JWT_SECRET, 'HS256');

    return c.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            company_id: user.company_id
        }
    });
});

// Setup endpoint: RESET and SEED
app.post('/setup', async (c) => {
    const db = createDb(c.env.gestion_db);

    // Reset Data (Caution: All tables cleared)
    await db.delete(auditLogs);
    await db.delete(payments);
    await db.delete(sales);
    await db.delete(expenses);
    await db.delete(projectStages);
    await db.delete(projects);
    await db.delete(clients);
    await db.delete(users);
    await db.delete(companies);

    // 1. Create Company
    const companyRes = await db.insert(companies).values({ name: 'MAS papas' }).returning();
    const companyId = companyRes[0].id;

    // 2. Create User with hashed password (mas123)
    const passwordHash = await bcrypt.hash('mas123', 10);
    const userRes = await db.insert(users).values({
        name: 'Karen',
        email: 'simarikaren@gmail.com',
        password_hash: passwordHash,
        company_id: companyId,
    }).returning();
    const userId = userRes[0].id;

    // 3. Create Client
    const clientRes = await db.insert(clients).values({
        name: 'Juan Pedro',
        company_id: companyId,
        cuit: '20-12345678-9'
    }).returning();
    const clientId = clientRes[0].id;

    return c.json({
        message: 'Database reset and seeded successfully',
        credentials: {
            email: 'simarikaren@gmail.com',
            password: 'mas123'
        },
        data: { companyId, userId, clientId }
    });
});

// POST /seed-production: Seed seguro para producción
app.post('/seed-production', async (c) => {
    const db = createDb(c.env.gestion_db);
    const body = await c.req.json();

    // Verificar clave de seguridad
    const expectedSecret = c.env.SEED_SECRET;
    if (!expectedSecret || body.secret !== expectedSecret) {
        return c.json({ error: 'No autorizado' }, 401);
    }

    const { companies: companiesPayload } = body;

    if (!companiesPayload || !Array.isArray(companiesPayload) || companiesPayload.length === 0) {
        return c.json({ error: 'Payload inválido' }, 400);
    }

    // ⚠️ RESET COMPLETO — Borrar en orden por foreign keys
    await db.delete(auditLogs);
    await db.delete(payments);
    await db.delete(sales);
    await db.delete(expenses);
    await db.delete(projectStages);
    await db.delete(projects);
    await db.delete(clients);
    await db.delete(users);
    await db.delete(companies);

    const results = [];

    for (const companyPayload of companiesPayload) {
        const { company_name, users: usersPayload } = companyPayload;

        if (!company_name || !usersPayload || !Array.isArray(usersPayload)) {
            continue;
        }

        // Crear empresa
        const companyRes = await db.insert(companies)
            .values({ name: company_name })
            .returning();
        const companyId = companyRes[0].id;

        // Crear usuarios — los password_hash vienen ya hasheados desde el script
        const createdUsers = await Promise.all(
            usersPayload.map(async (u: { name: string; email: string; password_hash: string }) => {
                const res = await db.insert(users).values({
                    name: u.name,
                    email: u.email,
                    password_hash: u.password_hash, // ya hasheado, no hashear de nuevo
                    company_id: companyId,
                }).returning();
                return { id: res[0].id, name: u.name, email: u.email };
            })
        );

        results.push({
            company: company_name,
            users_created: createdUsers.length,
            users: createdUsers
        });

        console.log(`[SEED-PRODUCTION] Empresa "${company_name}" creada con ${createdUsers.length} usuarios.`);
    }

    return c.json({
        message: 'Seed de producción completado',
        results
    });
});

// GET /admin/audit: Audit logs
app.get('/admin/audit', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const queryUserId = c.req.query('user_id');

    // Basic filters
    let whereClause: Event | any = eq(auditLogs.company_id, user.company_id);

    if (queryUserId) {
        whereClause = and(whereClause, eq(auditLogs.user_id, Number(queryUserId)));
    }

    const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.timestamp));

    return c.json(logs);
});

// Las métricas viven en src/routes/metrics.ts
export default app;

