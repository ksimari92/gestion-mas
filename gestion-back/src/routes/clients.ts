import { Hono } from 'hono';
import { createDb } from '../../db';
import { clients, sales, payments, auditLogs, users } from '../../schema';
import { eq, and, desc } from 'drizzle-orm';
import { AuthVariables } from '../../middleware/auth';
import { z } from 'zod';

type Bindings = {
    gestion_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

// Schemas
const createClientSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    cuit: z.string().optional(),
});

// GET /clients - List all clients for the company
app.get('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const result = await db
        .select()
        .from(clients)
        .where(eq(clients.company_id, user.company_id));

    return c.json(result);
});

// POST /clients - Create a new client
app.post('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();

    const validation = createClientSchema.safeParse(body);
    if (!validation.success) {
        return c.json({ error: validation.error.format() }, 400);
    }

    const { name, cuit } = validation.data;

    const result = await db
        .insert(clients)
        .values({
            name,
            cuit,
            company_id: user.company_id,
        })
        .returning();

    const newClient = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'CREATE_CLIENT',
        details: `Created client: ${newClient.name} (ID: ${newClient.id})`,
    });

    return c.json(newClient, 201);
});

// GET /clients/:id/statement - Detailed client statement
app.get('/:id/statement', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const clientId = Number(c.req.param('id'));

    if (isNaN(clientId)) {
        return c.json({ error: 'ID de cliente inválido' }, 400);
    }

    // 1. Verificar cliente
    const client = await db.select().from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.company_id, user.company_id)))
        .get();

    if (!client) return c.json({ error: 'Cliente no encontrado' }, 404);

    // 2. Traer ventas del cliente con el nombre de quien la creó
    const salesData = await db.select({
        id: sales.id,
        sale_date: sales.sale_date,
        bag_quantity: sales.bag_quantity,
        price_per_bag: sales.price_per_bag,
        total_amount: sales.total_amount,
        is_fully_paid: sales.is_fully_paid,
        created_by: users.name,
    })
        .from(sales)
        .innerJoin(users, eq(sales.created_by_user_id, users.id))
        .where(and(eq(sales.client_id, clientId), eq(sales.company_id, user.company_id)))
        .orderBy(desc(sales.sale_date));

    // 3. Para cada venta, traer sus pagos asociados
    const salesWithPayments = await Promise.all(salesData.map(async (sale) => {
        const paymentsData = await db.select({
            id: payments.id,
            amount_paid: payments.amount_paid,
            payment_method: payments.payment_method,
            received_by: users.name,
            created_at: payments.created_at,
        })
            .from(payments)
            .innerJoin(users, eq(payments.received_by_user_id, users.id))
            .where(eq(payments.sale_id, sale.id))
            .orderBy(payments.created_at);

        const amount_paid_so_far = paymentsData.reduce((acc, p) => acc + p.amount_paid, 0);
        return {
            ...sale,
            amount_paid_so_far,
            pending: sale.total_amount - amount_paid_so_far,
            payments: paymentsData,
        };
    }));

    // 4. Calcular totales globales
    const total_billed = salesWithPayments.reduce((acc, s) => acc + s.total_amount, 0);
    const total_paid = salesWithPayments.reduce((acc, s) => acc + s.amount_paid_so_far, 0);

    return c.json({
        client: {
            id: client.id,
            name: client.name,
            cuit: client.cuit
        },
        summary: {
            total_billed: Math.round(total_billed * 100) / 100,
            total_paid: Math.round(total_paid * 100) / 100,
            pending_balance: Math.round((total_billed - total_paid) * 100) / 100,
        },
        sales: salesWithPayments,
    });
});

// PUT /clients/:id - Update client info
app.put('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const clientId = Number(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(clientId)) {
        return c.json({ error: 'ID de cliente inválido' }, 400);
    }

    const validation = createClientSchema.safeParse(body);
    if (!validation.success) {
        return c.json({ error: validation.error.format() }, 400);
    }

    const { name, cuit } = validation.data;

    const result = await db
        .update(clients)
        .set({ name, cuit })
        .where(and(eq(clients.id, clientId), eq(clients.company_id, user.company_id)))
        .returning();

    if (result.length === 0) {
        return c.json({ error: 'Cliente no encontrado' }, 404);
    }

    const updatedClient = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'UPDATE_CLIENT',
        details: `Updated client: ${updatedClient.name} (ID: ${updatedClient.id})`,
    });

    return c.json(updatedClient);
});

// DELETE /clients/:id - Delete a client
app.delete('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const clientId = Number(c.req.param('id'));

    if (isNaN(clientId)) {
        return c.json({ error: 'ID de cliente inválido' }, 400);
    }

    // Check for active transactions (sales)
    const activeSales = await db
        .select()
        .from(sales)
        .where(and(eq(sales.client_id, clientId), eq(sales.company_id, user.company_id)))
        .limit(1)
        .get();

    if (activeSales) {
        return c.json({ error: 'No se puede eliminar un cliente con transacciones activas. Elimine primero sus ventas.' }, 400);
    }

    const result = await db
        .delete(clients)
        .where(and(eq(clients.id, clientId), eq(clients.company_id, user.company_id)))
        .returning();

    if (result.length === 0) {
        return c.json({ error: 'Cliente no encontrado' }, 404);
    }

    const deletedClient = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'DELETE_CLIENT',
        details: `Deleted client: ${deletedClient.name} (ID: ${deletedClient.id})`,
    });

    return c.json({ message: 'Cliente eliminado correctamente' });
});

export default app;
