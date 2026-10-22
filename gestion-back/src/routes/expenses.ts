import { Hono } from 'hono';
import { eq, and, or, gte, lte, like, isNull, desc, asc, sql, SQL } from 'drizzle-orm';
import { createDb } from '../../db';
import { expenses, users, projects, projectStages, auditLogs } from '../../schema';
import { authMiddleware, AuthVariables } from '../../middleware/auth';

type Bindings = { gestion_db: D1Database; JWT_SECRET: string };
type Variables = AuthVariables;

const expensesRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();
expensesRoute.use('*', authMiddleware);

// Campos que la planilla puede editar celda a celda.
const EDITABLE_FIELDS = [
    'description', 'detail', 'supplier', 'quantity', 'unit', 'unit_cost',
    'amount', 'category', 'payment_source', 'invoice_number', 'expense_date',
    'project_id', 'stage_id', 'receipt_base64', 'receipt_mime_type',
] as const;

const NUMERIC_FIELDS = ['quantity', 'unit_cost', 'amount'];
const REFERENCE_FIELDS = ['project_id', 'stage_id'];

/** Normaliza un valor entrante: '' y undefined → null, numéricos a Number. */
const normalize = (field: string, value: unknown) => {
    if (value === '' || value === undefined) return null;
    if (value === null) return null;
    if (NUMERIC_FIELDS.includes(field)) {
        const n = Number(value);
        return isNaN(n) ? null : n;
    }
    if (REFERENCE_FIELDS.includes(field)) {
        const n = Number(value);
        return isNaN(n) ? null : n;
    }
    return value;
};

/**
 * El total manda: si viene explícito se respeta. Si no viene pero hay
 * cantidad y precio unitario, se calcula. Así la planilla puede trabajar
 * con o sin desglose por unidad.
 */
const resolveAmount = (payload: Record<string, unknown>, fallback?: number | null) => {
    if (payload.amount != null && payload.amount !== '') return Number(payload.amount);
    const qty = payload.quantity != null && payload.quantity !== '' ? Number(payload.quantity) : null;
    const cost = payload.unit_cost != null && payload.unit_cost !== '' ? Number(payload.unit_cost) : null;
    if (qty != null && cost != null && !isNaN(qty) && !isNaN(cost)) {
        return Math.round(qty * cost * 100) / 100;
    }
    return fallback ?? null;
};

const buildFilters = (companyId: number, query: Record<string, string | undefined>) => {
    const conditions: SQL[] = [eq(expenses.company_id, companyId)];

    if (query.project_id === 'none') {
        conditions.push(isNull(expenses.project_id));
    } else if (query.project_id) {
        conditions.push(eq(expenses.project_id, Number(query.project_id)));
    }

    if (query.stage_id === 'none') {
        conditions.push(isNull(expenses.stage_id));
    } else if (query.stage_id) {
        conditions.push(eq(expenses.stage_id, Number(query.stage_id)));
    }

    if (query.category) conditions.push(eq(expenses.category, query.category));
    if (query.payment_source) conditions.push(eq(expenses.payment_source, query.payment_source));
    if (query.from) conditions.push(gte(expenses.expense_date, query.from));
    if (query.to) conditions.push(lte(expenses.expense_date, query.to));

    if (query.q) {
        const term = `%${query.q}%`;
        conditions.push(
            or(
                like(expenses.description, term),
                like(expenses.detail, term),
                like(expenses.supplier, term),
                like(expenses.invoice_number, term)
            ) as SQL
        );
    }

    return and(...conditions) as SQL;
};

const expenseColumns = {
    id: expenses.id,
    description: expenses.description,
    detail: expenses.detail,
    supplier: expenses.supplier,
    quantity: expenses.quantity,
    unit: expenses.unit,
    unit_cost: expenses.unit_cost,
    amount: expenses.amount,
    category: expenses.category,
    payment_source: expenses.payment_source,
    invoice_number: expenses.invoice_number,
    expense_date: expenses.expense_date,
    created_at: expenses.created_at,
    project_id: expenses.project_id,
    stage_id: expenses.stage_id,
    project_name: projects.name,
    stage_name: projectStages.name,
    registered_by: users.name,
    has_receipt: sql<number>`CASE WHEN ${expenses.receipt_base64} IS NOT NULL THEN 1 ELSE 0 END`.mapWith(Boolean),
};

// GET /expenses — historial filtrable. Devuelve las filas de la planilla.
expensesRoute.get('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const where = buildFilters(user.company_id, {
        project_id: c.req.query('project_id'),
        stage_id: c.req.query('stage_id'),
        category: c.req.query('category'),
        payment_source: c.req.query('payment_source'),
        from: c.req.query('from'),
        to: c.req.query('to'),
        q: c.req.query('q'),
    });

    const results = await db
        .select(expenseColumns)
        .from(expenses)
        .innerJoin(users, eq(expenses.user_id, users.id))
        .leftJoin(projects, eq(expenses.project_id, projects.id))
        .leftJoin(projectStages, eq(expenses.stage_id, projectStages.id))
        .where(where)
        .orderBy(desc(expenses.expense_date), desc(expenses.id));

    return c.json(results);
});

// GET /expenses/summary — totales por etapa y por categoría para los mismos filtros
expensesRoute.get('/summary', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const where = buildFilters(user.company_id, {
        project_id: c.req.query('project_id'),
        stage_id: c.req.query('stage_id'),
        category: c.req.query('category'),
        payment_source: c.req.query('payment_source'),
        from: c.req.query('from'),
        to: c.req.query('to'),
        q: c.req.query('q'),
    });

    const [total, byStage, byCategory] = await Promise.all([
        db
            .select({
                total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(expenses)
            .where(where)
            .get(),
        db
            .select({
                stage_id: expenses.stage_id,
                stage_name: projectStages.name,
                total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(expenses)
            .leftJoin(projectStages, eq(expenses.stage_id, projectStages.id))
            .where(where)
            .groupBy(expenses.stage_id, projectStages.name)
            .orderBy(asc(projectStages.sort_order)),
        db
            .select({
                category: expenses.category,
                total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(expenses)
            .where(where)
            .groupBy(expenses.category),
    ]);

    return c.json({
        total: total?.total ?? 0,
        count: total?.count ?? 0,
        by_stage: byStage,
        by_category: byCategory,
    });
});

// GET /expenses/:id/receipt — comprobante de un gasto
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

/** Relee un gasto con los joins para devolver la fila completa a la grilla. */
const readExpenseRow = async (db: ReturnType<typeof createDb>, companyId: number, id: number) =>
    db
        .select(expenseColumns)
        .from(expenses)
        .innerJoin(users, eq(expenses.user_id, users.id))
        .leftJoin(projects, eq(expenses.project_id, projects.id))
        .leftJoin(projectStages, eq(expenses.stage_id, projectStages.id))
        .where(and(eq(expenses.id, id), eq(expenses.company_id, companyId)))
        .get();

// POST /expenses — alta. La planilla la usa al completar la fila fantasma.
expensesRoute.post('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();

    const amount = resolveAmount(body);

    if (!body.description || !body.category || !body.payment_source || !body.expense_date) {
        return c.json({ error: 'Faltan campos requeridos: descripción, categoría, origen y fecha' }, 400);
    }

    if (amount == null || isNaN(amount) || amount <= 0) {
        return c.json({ error: 'El monto debe ser mayor a 0 (cargá el total o cantidad × precio unitario)' }, 400);
    }

    const result = await db
        .insert(expenses)
        .values({
            company_id: user.company_id,
            user_id: user.id,
            project_id: normalize('project_id', body.project_id) as number | null,
            stage_id: normalize('stage_id', body.stage_id) as number | null,
            description: body.description,
            detail: (normalize('detail', body.detail) as string) ?? null,
            supplier: (normalize('supplier', body.supplier) as string) ?? null,
            quantity: normalize('quantity', body.quantity) as number | null,
            unit: (normalize('unit', body.unit) as string) ?? null,
            unit_cost: normalize('unit_cost', body.unit_cost) as number | null,
            amount,
            category: body.category,
            payment_source: body.payment_source,
            invoice_number: (normalize('invoice_number', body.invoice_number) as string) ?? null,
            expense_date: body.expense_date,
            receipt_base64: body.receipt_base64 || null,
            receipt_mime_type: body.receipt_mime_type || null,
        })
        .returning();

    const newExpense = result[0];

    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'CREATE_EXPENSE',
        details: `Gasto registrado: ${body.category} - $${amount}. Descripción: ${body.description}`,
    });

    const row = await readExpenseRow(db, user.company_id, newExpense.id);
    return c.json(row ?? newExpense, 201);
});

// POST /expenses/bulk — alta de varias filas en una sola llamada
expensesRoute.post('/bulk', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();
    const items = Array.isArray(body?.expenses) ? body.expenses : null;

    if (!items || items.length === 0) {
        return c.json({ error: 'No se recibieron gastos para cargar' }, 400);
    }

    if (items.length > 100) {
        return c.json({ error: 'Máximo 100 gastos por carga' }, 400);
    }

    const values: typeof expenses.$inferInsert[] = [];
    const errors: { index: number; error: string }[] = [];

    items.forEach((item: Record<string, unknown>, index: number) => {
        const amount = resolveAmount(item);
        if (!item.description || !item.category || !item.payment_source || !item.expense_date) {
            errors.push({ index, error: 'Faltan campos requeridos' });
            return;
        }
        if (amount == null || isNaN(amount) || amount <= 0) {
            errors.push({ index, error: 'Monto inválido' });
            return;
        }
        values.push({
            company_id: user.company_id,
            user_id: user.id,
            project_id: normalize('project_id', item.project_id) as number | null,
            stage_id: normalize('stage_id', item.stage_id) as number | null,
            description: String(item.description),
            detail: (normalize('detail', item.detail) as string) ?? null,
            supplier: (normalize('supplier', item.supplier) as string) ?? null,
            quantity: normalize('quantity', item.quantity) as number | null,
            unit: (normalize('unit', item.unit) as string) ?? null,
            unit_cost: normalize('unit_cost', item.unit_cost) as number | null,
            amount,
            category: String(item.category),
            payment_source: String(item.payment_source),
            invoice_number: (normalize('invoice_number', item.invoice_number) as string) ?? null,
            expense_date: String(item.expense_date),
            receipt_base64: null,
            receipt_mime_type: null,
        });
    });

    if (values.length === 0) {
        return c.json({ error: 'Ninguna fila era válida', errors }, 400);
    }

    // D1 acepta hasta 100 variables por sentencia. Con 18 columnas por fila
    // eso da 5 filas por INSERT, así que la carga se parte en lotes.
    const ROWS_PER_INSERT = 5;
    const inserted: typeof expenses.$inferSelect[] = [];
    for (let i = 0; i < values.length; i += ROWS_PER_INSERT) {
        const chunk = values.slice(i, i + ROWS_PER_INSERT);
        const result = await db.insert(expenses).values(chunk).returning();
        inserted.push(...result);
    }

    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'BULK_CREATE_EXPENSE',
        details: `Carga masiva: ${inserted.length} gasto(s) registrados`,
    });

    return c.json({ created: inserted.length, errors, expenses: inserted }, 201);
});

// PUT /expenses/:id — actualización parcial: sólo se tocan los campos enviados.
// La grilla manda una sola clave por celda editada.
expensesRoute.put('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const expenseId = Number(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(expenseId)) return c.json({ error: 'ID de gasto inválido' }, 400);

    const current = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.company_id, user.company_id)))
        .get();

    if (!current) return c.json({ error: 'Gasto no encontrado' }, 404);

    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
        if (field in body) patch[field] = normalize(field, body[field]);
    }

    if (Object.keys(patch).length === 0) {
        return c.json({ error: 'No se enviaron campos para actualizar' }, 400);
    }

    // Si cambió cantidad o precio unitario y el total no vino explícito, se recalcula.
    const touchesUnitMath = 'quantity' in patch || 'unit_cost' in patch;
    if (touchesUnitMath && !('amount' in body)) {
        const qty = 'quantity' in patch ? (patch.quantity as number | null) : current.quantity;
        const cost = 'unit_cost' in patch ? (patch.unit_cost as number | null) : current.unit_cost;
        if (qty != null && cost != null) {
            patch.amount = Math.round(qty * cost * 100) / 100;
        }
    }

    if ('description' in patch && (!patch.description || String(patch.description).trim() === '')) {
        return c.json({ error: 'La descripción no puede quedar vacía' }, 400);
    }

    if ('amount' in patch && (patch.amount == null || Number(patch.amount) <= 0)) {
        return c.json({ error: 'El monto debe ser mayor a 0' }, 400);
    }

    // Cambiar de proyecto invalida la etapa anterior si no se envía una nueva.
    if ('project_id' in patch && !('stage_id' in patch) && patch.project_id !== current.project_id) {
        patch.stage_id = null;
    }

    await db
        .update(expenses)
        .set(patch)
        .where(and(eq(expenses.id, expenseId), eq(expenses.company_id, user.company_id)));

    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'UPDATE_EXPENSE',
        details: `Gasto ID ${expenseId} actualizado: ${Object.keys(patch).join(', ')}`,
    });

    const row = await readExpenseRow(db, user.company_id, expenseId);
    return c.json(row);
});

// DELETE /expenses/:id
expensesRoute.delete('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const expenseId = Number(c.req.param('id'));

    if (isNaN(expenseId)) return c.json({ error: 'ID de gasto inválido' }, 400);

    const result = await db
        .delete(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.company_id, user.company_id)))
        .returning();

    if (result.length === 0) return c.json({ error: 'Gasto no encontrado' }, 404);

    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'DELETE_EXPENSE',
        details: `Gasto ID ${expenseId} eliminado. Monto: $${result[0].amount}`,
    });

    return c.json({ message: 'Gasto eliminado correctamente' });
});

export default expensesRoute;
