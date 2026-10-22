export interface User {
    id: number;
    name: string;
    email: string;
    company_id: number;
}

/** Datos del DTV (Documento de Tránsito Vegetal, SENASA). Todos opcionales. */
export interface DtvData {
    renspa: string | null;
    senasa_holder: string | null;
    establishment: string | null;
    locality: string | null;
    province: string | null;
    dtv_notes: string | null;
}

export interface Client extends DtvData {
    id: number;
    name: string;
    cuit: string | null;
    company_id: number;
    // Agregados que devuelve el listado
    has_dtv_data?: boolean;
    sale_count?: number;
    total_billed?: number;
    pending_balance?: number;
}

export type ClientInput = Partial<DtvData> & {
    name: string;
    cuit?: string | null;
};

export interface Sale {
    id: number;
    client_id: number;
    company_id: number;
    created_by_user_id: number;
    sale_date: string;
    bag_quantity: number;
    price_per_bag: number;
    total_amount: number;
    is_fully_paid: boolean;
    // Joined fields from API
    client_name?: string;
}

export interface Payment {
    id: number;
    sale_id: number;
    company_id: number;
    received_by_user_id: number;
    amount_paid: number;
    payment_method: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE';
    created_at: string;
    // Joined fields from API
    received_by?: string;
    client_name?: string;
}

export type ExpenseCategory =
    | 'insumos' | 'logistica' | 'servicios' | 'alquiler'
    | 'mantenimiento' | 'personal' | 'impuestos' | 'otro';

export type PaymentSource = 'caja_chica' | 'banco' | 'personal';

export type ProjectStatus = 'activo' | 'cerrado' | 'archivado';

export interface ProjectStage {
    id: number;
    project_id: number;
    company_id: number;
    name: string;
    sort_order: number | null;
    planned_budget: number | null;
    color: string | null;
    created_at?: string | null;
    // Agregados que devuelve el detalle del proyecto
    total_spent?: number;
    expense_count?: number;
}

export interface Project {
    id: number;
    company_id: number;
    name: string;
    code: string | null;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    size: number | null;
    size_unit: string | null;
    budget: number | null;
    status: ProjectStatus;
    created_at?: string | null;
    stages: ProjectStage[];
    total_spent?: number;
    expense_count?: number;
}

export interface ProjectDetail extends Project {
    summary: {
        total_spent: number;
        budget: number | null;
        remaining: number | null;
        cost_per_unit: number | null;
        unassigned_spent: number;
    };
}

export interface StageTemplate {
    key: string;
    stages: string[];
}

export interface Expense {
    id: number;
    description: string;
    detail: string | null;
    supplier: string | null;
    quantity: number | null;
    unit: string | null;
    unit_cost: number | null;
    amount: number;
    category: ExpenseCategory;
    payment_source: PaymentSource;
    invoice_number: string | null;
    expense_date: string;
    created_at: string | null;
    project_id: number | null;
    stage_id: number | null;
    project_name: string | null;
    stage_name: string | null;
    registered_by: string;
    has_receipt: boolean;
}

/** Filtros de la planilla de costos. */
export interface ExpenseFilters {
    project_id?: number | 'none';
    stage_id?: number | 'none';
    category?: ExpenseCategory;
    payment_source?: PaymentSource;
    from?: string;
    to?: string;
    q?: string;
}

export interface ExpenseInput {
    description?: string;
    detail?: string | null;
    supplier?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unit_cost?: number | null;
    amount?: number | null;
    category?: ExpenseCategory;
    payment_source?: PaymentSource;
    invoice_number?: string | null;
    expense_date?: string;
    project_id?: number | null;
    stage_id?: number | null;
    receipt_base64?: string | null;
    receipt_mime_type?: string | null;
}

/** Todo lo que el panel necesita, ya agregado por el backend. */
export interface DashboardData {
    period: {
        from: string | null;
        to: string | null;
        first_expense: string | null;
        last_expense: string | null;
    };
    project: {
        id: number;
        name: string;
        size: number | null;
        size_unit: string | null;
        budget: number | null;
        status: ProjectStatus;
    } | null;
    costs: {
        total: number;
        count: number;
        by_stage: {
            stage_id: number;
            name: string;
            sort_order: number;
            planned_budget: number | null;
            total: number;
            count: number;
        }[];
        by_category: { category: ExpenseCategory; total: number; count: number }[];
        by_month: { month: string; total: number; count: number }[];
        without_stage: { total: number; count: number };
        without_project: { total: number; count: number };
    };
    budget: {
        planned: number;
        spent: number;
        remaining: number;
        pct: number | null;
    } | null;
    unit_cost: { value: number; unit: string | null; size: number } | null;
    benchmark: {
        peer_average: number | null;
        peers: { project_id: number; name: string; unit: string | null; cost_per_unit: number }[];
        aging_threshold_days: number;
    };
    receivables: {
        total_billed: number;
        total_collected: number;
        pending: number;
        overdue_amount: number;
        overdue_count: number;
        top_debtors: { client_id: number; name: string; pending: number; oldest_days: number }[];
    };
    cash: { income: number; expenses: number; net: number };
}

export interface ExpenseSummary {
    total: number;
    count: number;
    by_stage: { stage_id: number | null; stage_name: string | null; total: number; count: number }[];
    by_category: { category: ExpenseCategory; total: number; count: number }[];
}

export interface ExpenseReceipt {
    receipt_base64: string;
    receipt_mime_type: string;
}

export interface CashFlowMetrics {
    total_income: number;
    total_expenses: number;
    net_balance: number;
}

export interface PaymentRecord {
    id: number;
    amount_paid: number;
    payment_method: string;
    received_by: string;
    created_at: string | null;
}

export interface SaleWithPayments {
    id: number;
    sale_date: string;
    bag_quantity: number;
    price_per_bag: number;
    total_amount: number;
    is_fully_paid: boolean | number;
    created_by: string;
    amount_paid_so_far: number;
    pending: number;
    payments: PaymentRecord[];
}

export interface ClientStatement {
    client: DtvData & {
        id: number;
        name: string;
        cuit: string | null;
    };
    summary: {
        total_billed: number;
        total_paid: number;
        pending_balance: number;
    };
    sales: SaleWithPayments[];
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface Movement {
    id: string;
    type: 'INGRESO' | 'EGRESO';
    amount: number;
    description: string;
    userName: string;
    created_at: string;
}

export type SaleStatus = 'IMPAGO' | 'PARCIAL' | 'SALDADO';

export interface SaleWithStatus {
    id: number;
    sale_date: string;
    bag_quantity: number;
    price_per_bag: number;
    total_amount: number;
    is_fully_paid: boolean | number;
    client_id: number;
    client_name: string;
    created_by: string;
    amount_paid_so_far: number;
    pending: number;
    status: SaleStatus;
}
