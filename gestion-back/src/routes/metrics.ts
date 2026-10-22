import { Hono } from 'hono';
import { eq, and, gte, lte, desc, asc, sql, isNull, SQL } from 'drizzle-orm';
import { createDb } from '../../db';
import { expenses, payments, sales, clients, users, projects, projectStages } from '../../schema';
import { authMiddleware, AuthVariables } from '../../middleware/auth';

type Bindings = { gestion_db: D1Database; JWT_SECRET: string };
type Variables = AuthVariables;

const metricsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();
metricsRoute.use('*', authMiddleware);

/** Días a partir de los cuales un saldo pendiente se marca como demorado. */
const AGING_THRESHOLD_DAYS = 30;

const round = (value: number) => Math.round(value * 100) / 100;

const daysBetween = (from: string, to: Date) => {
    const parsed = new Date(`${from}T12:00:00`);
    if (isNaN(parsed.getTime())) return 0;
    return Math.floor((to.getTime() - parsed.getTime()) / 86400000);
};

/**
 * GET /metrics/dashboard
 * Arma el panel completo del lado del servidor: el front no tiene que
 * traerse todos los gastos para calcular agregados.
 */
metricsRoute.get('/dashboard', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const projectParam = c.req.query('project_id');
    const from = c.req.query('from');
    const to = c.req.query('to');

    // Filtro de gastos: el proyecto y el período que eligió el usuario arriba.
    const expenseConditions: SQL[] = [eq(expenses.company_id, user.company_id)];
    if (projectParam === 'none') expenseConditions.push(isNull(expenses.project_id));
    else if (projectParam) expenseConditions.push(eq(expenses.project_id, Number(projectParam)));
    if (from) expenseConditions.push(gte(expenses.expense_date, from));
    if (to) expenseConditions.push(lte(expenses.expense_date, to));
    const expenseWhere = and(...expenseConditions) as SQL;

    const activeProjectId = projectParam && projectParam !== 'none' ? Number(projectParam) : null;

    const [
        totals,
        byStage,
        byCategory,
        byMonth,
        unassignedStage,
        project,
        stages,
        allProjects,
        spentPerProject,
        salesRows,
        paymentsInPeriod,
    ] = await Promise.all([
        db.select({
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
            first_date: sql<string | null>`MIN(${expenses.expense_date})`,
            last_date: sql<string | null>`MAX(${expenses.expense_date})`,
        }).from(expenses).where(expenseWhere).get(),

        db.select({
            stage_id: expenses.stage_id,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        }).from(expenses).where(expenseWhere).groupBy(expenses.stage_id),

        db.select({
            category: expenses.category,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        }).from(expenses).where(expenseWhere).groupBy(expenses.category),

        db.select({
            month: sql<string>`substr(${expenses.expense_date}, 1, 7)`,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        }).from(expenses).where(expenseWhere)
            .groupBy(sql`substr(${expenses.expense_date}, 1, 7)`)
            .orderBy(asc(sql`substr(${expenses.expense_date}, 1, 7)`)),

        db.select({
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        }).from(expenses).where(and(expenseWhere, isNull(expenses.stage_id))).get(),

        activeProjectId
            ? db.select().from(projects)
                .where(and(eq(projects.id, activeProjectId), eq(projects.company_id, user.company_id)))
                .get()
            : Promise.resolve(undefined),

        activeProjectId
            ? db.select().from(projectStages)
                .where(eq(projectStages.project_id, activeProjectId))
                .orderBy(asc(projectStages.sort_order), asc(projectStages.id))
            : Promise.resolve([]),

        db.select().from(projects).where(eq(projects.company_id, user.company_id)),

        db.select({
            project_id: expenses.project_id,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        }).from(expenses).where(eq(expenses.company_id, user.company_id)).groupBy(expenses.project_id),

        db.select({
            id: sales.id,
            sale_date: sales.sale_date,
            total_amount: sales.total_amount,
            client_id: sales.client_id,
            client_name: clients.name,
            paid: sql<number>`COALESCE((SELECT SUM(${payments.amount_paid}) FROM ${payments} WHERE ${payments.sale_id} = ${sales.id}), 0)`,
        }).from(sales).innerJoin(clients, eq(sales.client_id, clients.id))
            .where(eq(sales.company_id, user.company_id)),

        db.select({
            total: sql<number>`COALESCE(SUM(${payments.amount_paid}), 0)`,
            count: sql<number>`COUNT(*)`,
        }).from(payments).where(eq(payments.company_id, user.company_id)).get(),
    ]);

    // ── Costos por etapa, en el orden configurado en el proyecto ──────────────
    const stageTotals = new Map(byStage.map((s) => [s.stage_id, s]));
    const stageBreakdown = stages.map((stage) => {
        const row = stageTotals.get(stage.id);
        return {
            stage_id: stage.id,
            name: stage.name,
            sort_order: stage.sort_order ?? 0,
            planned_budget: stage.planned_budget,
            total: round(row?.total ?? 0),
            count: row?.count ?? 0,
        };
    });

    const totalSpent = round(totals?.total ?? 0);

    // ── Presupuesto ──────────────────────────────────────────────────────────
    const plannedFromStages = stageBreakdown.reduce((acc, s) => acc + (s.planned_budget ?? 0), 0);
    const budgetTotal = project?.budget ?? (plannedFromStages > 0 ? plannedFromStages : null);
    const budget = budgetTotal != null
        ? {
            planned: budgetTotal,
            spent: totalSpent,
            remaining: round(budgetTotal - totalSpent),
            pct: budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 1000) / 10 : null,
        }
        : null;

    // ── Costo por unidad y comparación contra las demás campañas ─────────────
    const spentByProject = new Map(spentPerProject.map((p) => [p.project_id, p.total]));
    const comparables = allProjects
        .filter((p) => p.size && p.size > 0 && (spentByProject.get(p.id) ?? 0) > 0)
        .map((p) => ({
            project_id: p.id,
            name: p.name,
            unit: p.size_unit,
            cost_per_unit: round((spentByProject.get(p.id) ?? 0) / (p.size as number)),
        }));

    const unitCost = project?.size && project.size > 0
        ? {
            value: round(totalSpent / project.size),
            unit: project.size_unit,
            size: project.size,
        }
        : null;

    // El promedio de referencia excluye la campaña que se está mirando.
    const peers = comparables.filter((p) => p.project_id !== activeProjectId && p.unit === project?.size_unit);
    const peerAverage = peers.length > 0
        ? round(peers.reduce((acc, p) => acc + p.cost_per_unit, 0) / peers.length)
        : null;

    // ── Cuentas por cobrar, con antigüedad ───────────────────────────────────
    const now = new Date();
    let totalBilled = 0;
    let totalCollected = 0;
    let pending = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    const debtorMap = new Map<number, { client_id: number; name: string; pending: number; oldest_days: number }>();

    for (const sale of salesRows) {
        totalBilled += sale.total_amount;
        totalCollected += sale.paid;
        const salePending = sale.total_amount - sale.paid;
        if (salePending <= 0.01) continue;

        pending += salePending;
        const age = daysBetween(sale.sale_date, now);
        if (age > AGING_THRESHOLD_DAYS) {
            overdueAmount += salePending;
            overdueCount += 1;
        }

        const current = debtorMap.get(sale.client_id);
        if (current) {
            current.pending += salePending;
            current.oldest_days = Math.max(current.oldest_days, age);
        } else {
            debtorMap.set(sale.client_id, {
                client_id: sale.client_id,
                name: sale.client_name,
                pending: salePending,
                oldest_days: age,
            });
        }
    }

    const topDebtors = [...debtorMap.values()]
        .sort((a, b) => b.pending - a.pending)
        .slice(0, 5)
        .map((d) => ({ ...d, pending: round(d.pending) }));

    // ── Gastos huérfanos: sirven para corregir, no sólo para mirar ───────────
    const orphanExpenses = await db
        .select({
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(and(eq(expenses.company_id, user.company_id), isNull(expenses.project_id)))
        .get();

    return c.json({
        period: { from: from ?? null, to: to ?? null, first_expense: totals?.first_date ?? null, last_expense: totals?.last_date ?? null },
        project: project
            ? {
                id: project.id, name: project.name, size: project.size,
                size_unit: project.size_unit, budget: project.budget, status: project.status,
            }
            : null,
        costs: {
            total: totalSpent,
            count: totals?.count ?? 0,
            by_stage: stageBreakdown,
            by_category: byCategory
                .map((row) => ({ ...row, total: round(row.total) }))
                .sort((a, b) => b.total - a.total),
            by_month: byMonth.map((row) => ({ ...row, total: round(row.total) })),
            without_stage: {
                total: round(unassignedStage?.total ?? 0),
                count: unassignedStage?.count ?? 0,
            },
            without_project: {
                total: round(orphanExpenses?.total ?? 0),
                count: orphanExpenses?.count ?? 0,
            },
        },
        budget,
        unit_cost: unitCost,
        benchmark: { peer_average: peerAverage, peers, aging_threshold_days: AGING_THRESHOLD_DAYS },
        receivables: {
            total_billed: round(totalBilled),
            total_collected: round(totalCollected),
            pending: round(pending),
            overdue_amount: round(overdueAmount),
            overdue_count: overdueCount,
            top_debtors: topDebtors,
        },
        cash: {
            income: round(paymentsInPeriod?.total ?? 0),
            expenses: totalSpent,
            net: round((paymentsInPeriod?.total ?? 0) - totalSpent),
        },
    });
});

// GET /metrics/cash-flow — resumen simple de cobros vs gastos
metricsRoute.get('/cash-flow', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');

    const [income, expense] = await Promise.all([
        db.select({ total: sql<number>`COALESCE(SUM(${payments.amount_paid}), 0)` })
            .from(payments).where(eq(payments.company_id, user.company_id)).get(),
        db.select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
            .from(expenses).where(eq(expenses.company_id, user.company_id)).get(),
    ]);

    const totalIncome = income?.total ?? 0;
    const totalExpenses = expense?.total ?? 0;

    return c.json({
        total_income: round(totalIncome),
        total_expenses: round(totalExpenses),
        net_balance: round(totalIncome - totalExpenses),
    });
});

/**
 * GET /metrics/movements — últimos cobros y gastos.
 *
 * Los cobros no se asignan a un proyecto (una venta es de la empresa, no de
 * una campaña), así que cuando se filtra por proyecto la lista queda sólo con
 * los gastos de ese proyecto: mezclar cobros ajenos daría una lista que
 * contradice el filtro elegido arriba.
 */
metricsRoute.get('/movements', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const limit = Number(c.req.query('limit')) || 20;
    const projectParam = c.req.query('project_id');
    const from = c.req.query('from');
    const to = c.req.query('to');

    const scopedToProject = Boolean(projectParam);

    const expenseConditions: SQL[] = [eq(expenses.company_id, user.company_id)];
    if (projectParam === 'none') expenseConditions.push(isNull(expenses.project_id));
    else if (projectParam) expenseConditions.push(eq(expenses.project_id, Number(projectParam)));
    if (from) expenseConditions.push(gte(expenses.expense_date, from));
    if (to) expenseConditions.push(lte(expenses.expense_date, to));

    const [paymentsData, expensesData] = await Promise.all([
        scopedToProject
            ? Promise.resolve([])
            : db.select({
                id: payments.id,
                amount: payments.amount_paid,
                created_at: payments.created_at,
                description: clients.name,
                userName: users.name,
            })
                .from(payments)
                .innerJoin(users, eq(payments.received_by_user_id, users.id))
                .innerJoin(sales, eq(payments.sale_id, sales.id))
                .innerJoin(clients, eq(sales.client_id, clients.id))
                .where(eq(payments.company_id, user.company_id))
                .orderBy(desc(payments.id))
                .limit(limit),

        db.select({
            id: expenses.id,
            amount: expenses.amount,
            created_at: expenses.created_at,
            expense_date: expenses.expense_date,
            description: expenses.description,
            userName: users.name,
            category: expenses.category,
        })
            .from(expenses)
            .innerJoin(users, eq(expenses.user_id, users.id))
            .where(and(...expenseConditions) as SQL)
            .orderBy(desc(expenses.id))
            .limit(limit),
    ]);

    const movements = [
        ...paymentsData.map((p) => {
            let date = p.created_at;
            if (date && date.includes(' ')) date = date.replace(' ', 'T') + 'Z';
            return {
                id: `payment-${p.id}`,
                type: 'INGRESO' as const,
                amount: p.amount,
                description: `Cobro de ${p.description}`,
                userName: p.userName,
                created_at: date,
            };
        }),
        ...expensesData.map((e) => {
            let date = e.expense_date;
            if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) date = date + 'T12:00:00';
            else if (date && date.includes(' ')) date = date.replace(' ', 'T') + 'Z';
            return {
                id: `expense-${e.id}`,
                type: 'EGRESO' as const,
                amount: e.amount,
                description: e.description,
                userName: e.userName,
                created_at: date || e.created_at,
            };
        }),
    ];

    movements.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
    });

    return c.json(movements.slice(0, limit));
});

export default metricsRoute;
