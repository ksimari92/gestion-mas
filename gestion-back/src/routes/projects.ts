import { Hono } from 'hono';
import { eq, and, asc, desc, sql, inArray } from 'drizzle-orm';
import { createDb } from '../../db';
import { projects, projectStages, expenses, auditLogs } from '../../schema';
import { authMiddleware, AuthVariables } from '../../middleware/auth';

type Bindings = { gestion_db: D1Database; JWT_SECRET: string };
type Variables = AuthVariables;

const projectsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();
projectsRoute.use('*', authMiddleware);

// Plantillas de etapas. Son sugerencias: el usuario las edita, renombra y reordena.
const STAGE_TEMPLATES: Record<string, string[]> = {
    agro: ['Preparación de suelo', 'Siembra', 'Riego', 'Fertilización y sanidad', 'Cosecha', 'Poscosecha'],
    siembra_cosecha: ['Siembra', 'Riego', 'Cosecha'],
    obra: ['Proyecto', 'Materiales', 'Ejecución', 'Terminaciones'],
    generico: ['Etapa 1', 'Etapa 2', 'Etapa 3'],
};

// GET /projects/templates — plantillas de etapas disponibles
projectsRoute.get('/templates', (c) => {
    return c.json(
        Object.entries(STAGE_TEMPLATES).map(([key, stages]) => ({ key, stages }))
    );
});

// GET /projects — listado con etapas y total gastado
projectsRoute.get('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const status = c.req.query('status');

    const where = status
        ? and(eq(projects.company_id, user.company_id), eq(projects.status, status))
        : eq(projects.company_id, user.company_id);

    const rows = await db
        .select()
        .from(projects)
        .where(where)
        .orderBy(desc(projects.id));

    if (rows.length === 0) return c.json([]);

    const projectIds = rows.map((p) => p.id);

    const stages = await db
        .select()
        .from(projectStages)
        .where(inArray(projectStages.project_id, projectIds))
        .orderBy(asc(projectStages.sort_order), asc(projectStages.id));

    const spent = await db
        .select({
            project_id: expenses.project_id,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(and(eq(expenses.company_id, user.company_id), inArray(expenses.project_id, projectIds)))
        .groupBy(expenses.project_id);

    const spentByProject = new Map(spent.map((s) => [s.project_id, s]));

    return c.json(
        rows.map((p) => ({
            ...p,
            stages: stages.filter((s) => s.project_id === p.id),
            total_spent: spentByProject.get(p.id)?.total ?? 0,
            expense_count: spentByProject.get(p.id)?.count ?? 0,
        }))
    );
});

// GET /projects/:id — detalle con resumen por etapa
projectsRoute.get('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const projectId = Number(c.req.param('id'));

    if (isNaN(projectId)) return c.json({ error: 'ID de proyecto inválido' }, 400);

    const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.company_id, user.company_id)))
        .get();

    if (!project) return c.json({ error: 'Proyecto no encontrado' }, 404);

    const stages = await db
        .select()
        .from(projectStages)
        .where(eq(projectStages.project_id, projectId))
        .orderBy(asc(projectStages.sort_order), asc(projectStages.id));

    const spentByStage = await db
        .select({
            stage_id: expenses.stage_id,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(and(eq(expenses.company_id, user.company_id), eq(expenses.project_id, projectId)))
        .groupBy(expenses.stage_id);

    const map = new Map(spentByStage.map((s) => [s.stage_id, s]));
    const totalSpent = spentByStage.reduce((acc, s) => acc + (s.total || 0), 0);

    return c.json({
        ...project,
        stages: stages.map((s) => ({
            ...s,
            total_spent: map.get(s.id)?.total ?? 0,
            expense_count: map.get(s.id)?.count ?? 0,
        })),
        summary: {
            total_spent: Math.round(totalSpent * 100) / 100,
            budget: project.budget ?? null,
            remaining: project.budget != null ? Math.round((project.budget - totalSpent) * 100) / 100 : null,
            cost_per_unit:
                project.size && project.size > 0 ? Math.round((totalSpent / project.size) * 100) / 100 : null,
            unassigned_spent: map.get(null)?.total ?? 0,
        },
    });
});

// POST /projects — crea el proyecto y, opcionalmente, sus etapas
projectsRoute.post('/', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const body = await c.req.json();

    const { name, code, description, start_date, end_date, size, size_unit, budget, stages, template } = body;

    if (!name || String(name).trim() === '') {
        return c.json({ error: 'El nombre del proyecto es requerido' }, 400);
    }

    const created = await db
        .insert(projects)
        .values({
            company_id: user.company_id,
            name: String(name).trim(),
            code: code || null,
            description: description || null,
            start_date: start_date || null,
            end_date: end_date || null,
            size: size != null && size !== '' ? Number(size) : null,
            size_unit: size_unit || null,
            budget: budget != null && budget !== '' ? Number(budget) : null,
            status: 'activo',
        })
        .returning();

    const project = created[0];

    // Etapas explícitas > plantilla > ninguna
    const stageNames: string[] = Array.isArray(stages) && stages.length > 0
        ? stages.map((s: string | { name: string }) => (typeof s === 'string' ? s : s.name)).filter(Boolean)
        : (template && STAGE_TEMPLATES[template]) || [];

    let createdStages: typeof projectStages.$inferSelect[] = [];
    if (stageNames.length > 0) {
        createdStages = await db
            .insert(projectStages)
            .values(
                stageNames.map((stageName, index) => ({
                    project_id: project.id,
                    company_id: user.company_id,
                    name: stageName,
                    sort_order: index,
                }))
            )
            .returning();
    }

    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'CREATE_PROJECT',
        details: `Proyecto creado: ${project.name} (${createdStages.length} etapas)`,
    });

    return c.json({ ...project, stages: createdStages }, 201);
});

// PUT /projects/:id
projectsRoute.put('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const projectId = Number(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(projectId)) return c.json({ error: 'ID de proyecto inválido' }, 400);
    if (!body.name || String(body.name).trim() === '') {
        return c.json({ error: 'El nombre del proyecto es requerido' }, 400);
    }

    const result = await db
        .update(projects)
        .set({
            name: String(body.name).trim(),
            code: body.code || null,
            description: body.description || null,
            start_date: body.start_date || null,
            end_date: body.end_date || null,
            size: body.size != null && body.size !== '' ? Number(body.size) : null,
            size_unit: body.size_unit || null,
            budget: body.budget != null && body.budget !== '' ? Number(body.budget) : null,
            status: body.status || 'activo',
        })
        .where(and(eq(projects.id, projectId), eq(projects.company_id, user.company_id)))
        .returning();

    if (result.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404);

    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'UPDATE_PROJECT',
        details: `Proyecto ID ${projectId} actualizado: ${result[0].name}`,
    });

    return c.json(result[0]);
});

// DELETE /projects/:id — sólo si no tiene gastos asociados
projectsRoute.delete('/:id', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const projectId = Number(c.req.param('id'));

    if (isNaN(projectId)) return c.json({ error: 'ID de proyecto inválido' }, 400);

    const linked = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(expenses)
        .where(and(eq(expenses.project_id, projectId), eq(expenses.company_id, user.company_id)))
        .get();

    if ((linked?.count ?? 0) > 0) {
        return c.json(
            { error: `El proyecto tiene ${linked!.count} gasto(s) asociado(s). Archivalo en lugar de eliminarlo.` },
            409
        );
    }

    await db
        .delete(projectStages)
        .where(and(eq(projectStages.project_id, projectId), eq(projectStages.company_id, user.company_id)));

    const result = await db
        .delete(projects)
        .where(and(eq(projects.id, projectId), eq(projects.company_id, user.company_id)))
        .returning();

    if (result.length === 0) return c.json({ error: 'Proyecto no encontrado' }, 404);

    await db.insert(auditLogs).values({
        user_id: user.id,
        company_id: user.company_id,
        action: 'DELETE_PROJECT',
        details: `Proyecto ID ${projectId} eliminado: ${result[0].name}`,
    });

    return c.json({ message: 'Proyecto eliminado correctamente' });
});

// POST /projects/:id/stages — agregar etapa
projectsRoute.post('/:id/stages', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const projectId = Number(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(projectId)) return c.json({ error: 'ID de proyecto inválido' }, 400);
    if (!body.name || String(body.name).trim() === '') {
        return c.json({ error: 'El nombre de la etapa es requerido' }, 400);
    }

    const project = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.company_id, user.company_id)))
        .get();

    if (!project) return c.json({ error: 'Proyecto no encontrado' }, 404);

    const last = await db
        .select({ max: sql<number>`COALESCE(MAX(${projectStages.sort_order}), -1)` })
        .from(projectStages)
        .where(eq(projectStages.project_id, projectId))
        .get();

    const result = await db
        .insert(projectStages)
        .values({
            project_id: projectId,
            company_id: user.company_id,
            name: String(body.name).trim(),
            sort_order: body.sort_order != null ? Number(body.sort_order) : (last?.max ?? -1) + 1,
            planned_budget: body.planned_budget != null && body.planned_budget !== '' ? Number(body.planned_budget) : null,
            color: body.color || null,
        })
        .returning();

    return c.json(result[0], 201);
});

// PUT /projects/:id/stages/:stageId
projectsRoute.put('/:id/stages/:stageId', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const projectId = Number(c.req.param('id'));
    const stageId = Number(c.req.param('stageId'));
    const body = await c.req.json();

    if (isNaN(projectId) || isNaN(stageId)) return c.json({ error: 'ID inválido' }, 400);
    if (!body.name || String(body.name).trim() === '') {
        return c.json({ error: 'El nombre de la etapa es requerido' }, 400);
    }

    const result = await db
        .update(projectStages)
        .set({
            name: String(body.name).trim(),
            sort_order: body.sort_order != null ? Number(body.sort_order) : undefined,
            planned_budget: body.planned_budget != null && body.planned_budget !== '' ? Number(body.planned_budget) : null,
            color: body.color || null,
        })
        .where(
            and(
                eq(projectStages.id, stageId),
                eq(projectStages.project_id, projectId),
                eq(projectStages.company_id, user.company_id)
            )
        )
        .returning();

    if (result.length === 0) return c.json({ error: 'Etapa no encontrada' }, 404);

    return c.json(result[0]);
});

// DELETE /projects/:id/stages/:stageId — los gastos quedan sin etapa, no se borran
projectsRoute.delete('/:id/stages/:stageId', async (c) => {
    const db = createDb(c.env.gestion_db);
    const user = c.get('user');
    const projectId = Number(c.req.param('id'));
    const stageId = Number(c.req.param('stageId'));

    if (isNaN(projectId) || isNaN(stageId)) return c.json({ error: 'ID inválido' }, 400);

    await db
        .update(expenses)
        .set({ stage_id: null })
        .where(and(eq(expenses.stage_id, stageId), eq(expenses.company_id, user.company_id)));

    const result = await db
        .delete(projectStages)
        .where(
            and(
                eq(projectStages.id, stageId),
                eq(projectStages.project_id, projectId),
                eq(projectStages.company_id, user.company_id)
            )
        )
        .returning();

    if (result.length === 0) return c.json({ error: 'Etapa no encontrada' }, 404);

    return c.json({ message: 'Etapa eliminada. Los gastos asociados quedaron sin etapa.' });
});

export default projectsRoute;
