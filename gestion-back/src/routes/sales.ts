import { Hono } from 'hono';
import { createDb } from '../../db';
import { clients, sales, payments, auditLogs, users } from '../../schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthVariables } from '../../middleware/auth';
import { z } from 'zod';

type Bindings = {
    gestion_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

const createSaleSchema = z.object({
    client_id: z.number(),
    bag_quantity: z.number().positive(),
    price_per_bag: z.number().positive(),
    sale_date: z.string(), // ISO date
});

// GET /sales - List all sales with payment status
app.get('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const salesData = await db
        .select({
            id: sales.id,
            sale_date: sales.sale_date,
            bag_quantity: sales.bag_quantity,
            price_per_bag: sales.price_per_bag,
            total_amount: sales.total_amount,
            is_fully_paid: sales.is_fully_paid,
            client_id: sales.client_id,
            client_name: clients.name,
            created_by: users.name,
        })
        .from(sales)
        .innerJoin(clients, eq(sales.client_id, clients.id))
        .innerJoin(users, eq(sales.created_by_user_id, users.id))
        .where(eq(sales.company_id, user.company_id))
        .orderBy(desc(sales.sale_date));

    // For each sale, calculate payment totals and status
    const result = await Promise.all(salesData.map(async (sale) => {
        const paymentSumResult = await db
            .select({ total: sql<number>`COALESCE(SUM(amount_paid), 0)` })
            .from(payments)
            .where(eq(payments.sale_id, sale.id))
            .get();

        const paid = paymentSumResult?.total ?? 0;
        const pending = sale.total_amount - paid;

        let status: 'IMPAGO' | 'PARCIAL' | 'SALDADO' = 'IMPAGO';
        if (sale.is_fully_paid || paid >= sale.total_amount - 0.01) status = 'SALDADO';
        else if (paid > 0) status = 'PARCIAL';

        return {
            ...sale,
            amount_paid_so_far: paid,
            pending: Math.round(pending * 100) / 100,
            status
        };
    }));

    return c.json(result);
});

// POST /sales - Create a new sale
app.post('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();

    const validation = createSaleSchema.safeParse(body);
    if (!validation.success) {
        return c.json({ error: validation.error.format() }, 400);
    }
    const data = validation.data;

    // Calculate total amount with rounding to 2 decimals
    const totalAmount = Math.round((data.bag_quantity * data.price_per_bag) * 100) / 100;

    const result = await db
        .insert(sales)
        .values({
            client_id: data.client_id,
            company_id: user.company_id,
            created_by_user_id: user.id,
            sale_date: data.sale_date,
            bag_quantity: data.bag_quantity,
            price_per_bag: data.price_per_bag,
            total_amount: totalAmount,
            is_fully_paid: false,
        })
        .returning();

    const newSale = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'CREATE_SALE',
        details: `Venta ID ${newSale.id} creada para Cliente ID ${data.client_id}. Total: $${totalAmount}`
    });

    return c.json(newSale, 201);
});

// PUT /sales/:id - Update sale
app.put('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const saleId = Number(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(saleId)) {
        return c.json({ error: 'ID de venta inválido' }, 400);
    }

    const validation = createSaleSchema.safeParse(body);
    if (!validation.success) {
        return c.json({ error: validation.error.format() }, 400);
    }
    const data = validation.data;
    const totalAmount = Math.round((data.bag_quantity * data.price_per_bag) * 100) / 100;

    const result = await db
        .update(sales)
        .set({
            client_id: data.client_id,
            sale_date: data.sale_date,
            bag_quantity: data.bag_quantity,
            price_per_bag: data.price_per_bag,
            total_amount: totalAmount,
        })
        .where(and(eq(sales.id, saleId), eq(sales.company_id, user.company_id)))
        .returning();

    if (result.length === 0) {
        return c.json({ error: 'Venta no encontrada' }, 404);
    }

    const updatedSale = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'UPDATE_SALE',
        details: `Venta ID ${updatedSale.id} actualizada. Nuevo total: $${totalAmount}`
    });

    return c.json(updatedSale);
});

// DELETE /sales/:id - Delete sale and associated payments
app.delete('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const saleId = Number(c.req.param('id'));

    if (isNaN(saleId)) {
        return c.json({ error: 'ID de venta inválido' }, 400);
    }

    // Get sale info first for audit
    const saleToDelete = await db.select().from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.company_id, user.company_id)))
        .get();

    if (!saleToDelete) {
        return c.json({ error: 'Venta no encontrada' }, 404);
    }

    // Execute deletion in a batch/transaction to ensure integrity
    // Note: D1 batch is specifically for multi-query execution.
    // Drizzle with D1 uses db.batch([ query1, query2, ... ])
    await db.batch([
        db.delete(payments).where(eq(payments.sale_id, saleId)),
        db.delete(sales).where(eq(sales.id, saleId)),
        db.insert(auditLogs).values({
            user_id: user.id,
            company_id: user.company_id,
            action: 'DELETE_SALE',
            details: `Venta ID ${saleId} eliminada junto con sus pagos. Monto original: $${saleToDelete.total_amount}`
        })
    ]);

    return c.json({ message: 'Venta y pagos asociados eliminados correctamente' });
});

export default app;
