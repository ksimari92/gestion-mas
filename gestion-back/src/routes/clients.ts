import { Hono } from 'hono';
import { createDb } from '../../db';
import { clients, sales, payments, auditLogs, users } from '../../schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { AuthVariables } from '../../middleware/auth';
import { z } from 'zod';
import { isValidCuit, isValidRenspaFormat, formatCuit, formatRenspa } from '../lib/identifiers';

type Bindings = {
    gestion_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

/** '' y undefined se guardan como null: un campo vacío no es un dato. */
const optionalText = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().nullish()
);

const clientSchema = z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    cuit: z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
        z.string().trim().nullish().refine(
            (value) => value == null || isValidCuit(value),
            'El CUIT no es válido: revisá los 11 dígitos'
        )
    ),
    // Datos del DTV — todos opcionales
    renspa: z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
        z.string().trim().nullish().refine(
            (value) => value == null || isValidRenspaFormat(formatRenspa(value)),
            'El RENSPA debe tener el formato 23.045.0.00123/01'
        )
    ),
    senasa_holder: optionalText,
    establishment: optionalText,
    locality: optionalText,
    province: optionalText,
    dtv_notes: optionalText,
});

/** Normaliza lo que llega del formulario antes de guardarlo. */
const toClientRow = (data: z.infer<typeof clientSchema>) => ({
    name: data.name,
    cuit: data.cuit ? formatCuit(data.cuit) : null,
    renspa: data.renspa ? formatRenspa(data.renspa) : null,
    senasa_holder: data.senasa_holder ?? null,
    establishment: data.establishment ?? null,
    locality: data.locality ?? null,
    province: data.province ?? null,
    dtv_notes: data.dtv_notes ?? null,
});

/**
 * En la edición sólo se tocan las claves que vinieron en el body. Un cliente
 * que se guarda desde un formulario reducido (por ejemplo sólo nombre y CUIT)
 * no debe perder los datos del DTV que no estaban en pantalla.
 */
const toClientPatch = (data: z.infer<typeof clientSchema>, body: Record<string, unknown>) => {
    const full = toClientRow(data);
    const patch: Partial<typeof full> = { name: full.name };
    (['cuit', 'renspa', 'senasa_holder', 'establishment', 'locality', 'province', 'dtv_notes'] as const)
        .forEach((key) => {
            if (key in body) patch[key] = full[key];
        });
    return patch;
};

// GET /clients - List all clients for the company
app.get('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const rows = await db
        .select()
        .from(clients)
        .where(eq(clients.company_id, user.company_id));

    if (rows.length === 0) return c.json([]);

    // Saldo pendiente por cliente: la lista sin saldo no dice nada útil.
    // Se agregan por separado facturado y cobrado — una subconsulta
    // correlacionada dentro del SUM no arrastra bien la fila externa.
    const clientIds = rows.map((r) => r.id);

    const [billedRows, paidRows] = await Promise.all([
        db.select({
            client_id: sales.client_id,
            billed: sql<number>`COALESCE(SUM(${sales.total_amount}), 0)`,
            sale_count: sql<number>`COUNT(*)`,
        })
            .from(sales)
            .where(and(eq(sales.company_id, user.company_id), inArray(sales.client_id, clientIds)))
            .groupBy(sales.client_id),

        db.select({
            client_id: sales.client_id,
            paid: sql<number>`COALESCE(SUM(${payments.amount_paid}), 0)`,
        })
            .from(payments)
            .innerJoin(sales, eq(payments.sale_id, sales.id))
            .where(and(eq(sales.company_id, user.company_id), inArray(sales.client_id, clientIds)))
            .groupBy(sales.client_id),
    ]);

    const billedByClient = new Map(billedRows.map((b) => [b.client_id, b]));
    const paidByClient = new Map(paidRows.map((p) => [p.client_id, p.paid]));

    return c.json(rows.map((client) => {
        const billed = billedByClient.get(client.id);
        const paid = paidByClient.get(client.id) ?? 0;
        return {
            ...client,
            has_dtv_data: Boolean(client.renspa || client.senasa_holder || client.establishment),
            sale_count: billed?.sale_count ?? 0,
            total_billed: Math.round((billed?.billed ?? 0) * 100) / 100,
            total_paid: Math.round(paid * 100) / 100,
            pending_balance: Math.round(((billed?.billed ?? 0) - paid) * 100) / 100,
        };
    }));
});

// POST /clients - Create a new client
app.post('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();

    const validation = clientSchema.safeParse(body);
    if (!validation.success) {
        return c.json({ error: validation.error.issues[0]?.message ?? 'Datos inválidos' }, 400);
    }

    const result = await db
        .insert(clients)
        .values({
            ...toClientRow(validation.data),
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
            cuit: client.cuit,
            renspa: client.renspa,
            senasa_holder: client.senasa_holder,
            establishment: client.establishment,
            locality: client.locality,
            province: client.province,
            dtv_notes: client.dtv_notes,
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

    const validation = clientSchema.safeParse(body);
    if (!validation.success) {
        return c.json({ error: validation.error.issues[0]?.message ?? 'Datos inválidos' }, 400);
    }

    const result = await db
        .update(clients)
        .set(toClientPatch(validation.data, body))
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
