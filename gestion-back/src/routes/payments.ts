import { Hono } from 'hono';
import { createDb } from '../../db';
import { sales, payments, auditLogs, users, clients } from '../../schema';
import { eq, and, desc } from 'drizzle-orm';
import { AuthVariables } from '../../middleware/auth';
import { z } from 'zod';

type Bindings = {
    gestion_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

const createPaymentSchema = z.object({
    sale_id: z.number(),
    amount_paid: z.number().positive(),
    payment_method: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE']),
});

// GET /payments - List all payments
app.get('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const result = await db
        .select({
            id: payments.id,
            amount_paid: payments.amount_paid,
            payment_method: payments.payment_method,
            created_at: payments.created_at,
            sale_id: payments.sale_id,
            received_by: users.name,
            client_name: clients.name
        })
        .from(payments)
        .innerJoin(users, eq(payments.received_by_user_id, users.id))
        .innerJoin(sales, eq(payments.sale_id, sales.id))
        .innerJoin(clients, eq(sales.client_id, clients.id))
        .where(eq(payments.company_id, user.company_id))
        .orderBy(desc(payments.created_at));

    return c.json(result);
});

// POST /payments - Create a new payment
app.post('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();

    const validation = createPaymentSchema.safeParse(body);
    if (!validation.success) {
        return c.json({ error: validation.error.format() }, 400);
    }
    const data = validation.data;

    // Insert payment
    await db.insert(payments).values({
        sale_id: data.sale_id,
        company_id: user.company_id,
        received_by_user_id: user.id,
        amount_paid: data.amount_paid,
        payment_method: data.payment_method,
    });

    // Check if fully paid (optional but recommended logic)
    const saleResults = await db
        .select()
        .from(sales)
        .where(and(eq(sales.id, data.sale_id), eq(sales.company_id, user.company_id)))
        .limit(1);
    const sale = saleResults[0];

    if (sale) {
        const paymentRecords = await db.select().from(payments).where(eq(payments.sale_id, data.sale_id));
        const totalPaid = paymentRecords.reduce((sum, p) => sum + p.amount_paid, 0);

        if (totalPaid >= sale.total_amount - 0.01) { // Tolerance for floats
            await db
                .update(sales)
                .set({ is_fully_paid: true })
                .where(eq(sales.id, data.sale_id));
        }
    }

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'CREATE_PAYMENT',
        details: `Payment of ${data.amount_paid} received for Sale ID ${data.sale_id} via ${data.payment_method}`
    });

    return c.json({ message: 'Payment registered successfully' }, 201);
});

export default app;
