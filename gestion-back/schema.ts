import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const companies = sqliteTable('companies', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable('users', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash').notNull(),
    company_id: integer('company_id').references(() => companies.id).notNull(),
});

export const clients = sqliteTable('clients', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    cuit: text('cuit'),
    company_id: integer('company_id').references(() => companies.id).notNull(),
});

export const sales = sqliteTable('sales', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    client_id: integer('client_id').references(() => clients.id).notNull(),
    company_id: integer('company_id').references(() => companies.id).notNull(),
    created_by_user_id: integer('created_by_user_id').references(() => users.id).notNull(),
    sale_date: text('sale_date').notNull(), // ISO Date string
    bag_quantity: integer('bag_quantity').notNull(),
    price_per_bag: real('price_per_bag').notNull(),
    total_amount: real('total_amount').notNull(), // Calculated in app logic before insert
    is_fully_paid: integer('is_fully_paid', { mode: 'boolean' }).default(false),
});

export const payments = sqliteTable('payments', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    sale_id: integer('sale_id').references(() => sales.id).notNull(),
    company_id: integer('company_id').references(() => companies.id).notNull(),
    received_by_user_id: integer('received_by_user_id').references(() => users.id).notNull(),
    amount_paid: real('amount_paid').notNull(),
    payment_method: text('payment_method', { enum: ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'] }).notNull(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const expenses = sqliteTable('expenses', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    company_id: integer('company_id').references(() => companies.id).notNull(),
    user_id: integer('user_id').references(() => users.id).notNull(),
    description: text('description').notNull(),
    detail: text('detail'),
    amount: real('amount').notNull(),
    category: text('category').notNull(),
    payment_source: text('payment_source').notNull(),
    receipt_base64: text('receipt_base64'),
    receipt_mime_type: text('receipt_mime_type'),
    expense_date: text('expense_date').notNull(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable('audit_logs', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    user_id: integer('user_id').references(() => users.id).notNull(),
    company_id: integer('company_id').references(() => companies.id).notNull(),
    action: text('action').notNull(),
    details: text('details'),
    timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});
