import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createDb } from '../../db';
import { expenses, users, auditLogs } from '../../schema';
import { authMiddleware, AuthVariables } from '../../middleware/auth';

type Bindings = { gestion_db: D1Database; JWT_SECRET: string };
type Variables = AuthVariables;

const expensesRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();
expensesRoute.use('*', authMiddleware);

// GET /expenses — Historial de gastos con autoría
expensesRoute.get('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const results = await db
        .select({
            id: expenses.id,
            description: expenses.description,
            detail: expenses.detail,
            amount: expenses.amount,
            category: expenses.category,
            payment_source: expenses.payment_source,
            expense_date: expenses.expense_date,
            created_at: expenses.created_at,
            registered_by: users.name,
            has_receipt: sql<number>`CASE WHEN ${expenses.receipt_base64} IS NOT NULL THEN 1 ELSE 0 END`.mapWith(Boolean),
        })
        .from(expenses)
        .innerJoin(users, eq(expenses.user_id, users.id))
        .where(eq(expenses.company_id, user.company_id))
        .orderBy(desc(expenses.expense_date));

    return c.json(results);
});

// GET /expenses/:id/receipt — Ver comprobante de un gasto
expensesRoute.get('/:id/receipt', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const expenseId = Number(c.req.param('id'));

    const result = await db
        .select({
            receipt_base64: expenses.receipt_base64,
            receipt_mime_type: expenses.receipt_mime_type,
        })
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.company_id, user.company_id)))
        .get();

    if (!result || !result.receipt_base64) {
        return c.json({ error: 'Comprobante no encontrado' }, 404);
    }

    return c.json({
        receipt_base64: result.receipt_base64,
        receipt_mime_type: result.receipt_mime_type,
    });
});

// POST /expenses — Registrar nuevo gasto
expensesRoute.post('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();

    const { description, detail, amount, category, payment_source, expense_date, receipt_base64, receipt_mime_type } = body;

    if (!description || !amount || !category || !payment_source || !expense_date) {
        return c.json({ error: 'Faltan campos requeridos' }, 400);
    }

    if (Number(amount) <= 0) {
        return c.json({ error: 'El monto debe ser mayor a 0' }, 400);
    }

    const result = await db.insert(expenses).values({
        company_id: user.company_id,
        user_id: user.id,
        description,
        detail: detail || null,
        amount: Number(amount),
        category,
        payment_source,
        expense_date,
        receipt_base64: receipt_base64 || null,
        receipt_mime_type: receipt_mime_type || null,
    }).returning();

    const newExpense = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'CREATE_EXPENSE',
        details: `Gasto registrado: ${category} - $${amount}. Descripción: ${description}`
    });

    return c.json(newExpense, 201);
});

// PUT /expenses/:id - Update expense
expensesRoute.put('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const expenseId = Number(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(expenseId)) {
        return c.json({ error: 'ID de gasto inválido' }, 400);
    }

    const { description, detail, amount, category, payment_source, expense_date, receipt_base64, receipt_mime_type } = body;

    if (!description || !amount || !category || !payment_source || !expense_date) {
        return c.json({ error: 'Faltan campos requeridos' }, 400);
    }

    const result = await db
        .update(expenses)
        .set({
            description,
            detail: detail || null,
            amount: Number(amount),
            category,
            payment_source,
            expense_date,
            receipt_base64: receipt_base64 || null,
            receipt_mime_type: receipt_mime_type || null,
        })
        .where(and(eq(expenses.id, expenseId), eq(expenses.company_id, user.company_id)))
        .returning();

    if (result.length === 0) {
        return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    const updatedExpense = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'UPDATE_EXPENSE',
        details: `Gasto ID ${updatedExpense.id} actualizado: ${category} - $${amount}.`
    });

    return c.json(updatedExpense);
});

// DELETE /expenses/:id - Delete expense
expensesRoute.delete('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const expenseId = Number(c.req.param('id'));

    if (isNaN(expenseId)) {
        return c.json({ error: 'ID de gasto inválido' }, 400);
    }

    const result = await db
        .delete(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.company_id, user.company_id)))
        .returning();

    if (result.length === 0) {
        return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    const deletedExpense = result[0];

    // Audit Log
    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'DELETE_EXPENSE',
        details: `Gasto ID ${expenseId} eliminado. Monto: $${deletedExpense.amount}`
    });

    return c.json({ message: 'Gasto eliminado correctamente' });
});

export default expensesRoute;
