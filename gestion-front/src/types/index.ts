export interface User {
    id: number;
    name: string;
    email: string;
    company_id: number;
}

export interface Client {
    id: number;
    name: string;
    cuit?: string;
    phone?: string;
    company_id: number;
}

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

export interface Expense {
    id: number;
    description: string;
    detail: string | null;
    amount: number;
    category: ExpenseCategory;
    payment_source: PaymentSource;
    expense_date: string;
    created_at: string | null;
    registered_by: string;
    has_receipt: boolean;
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
    client: {
        id: number;
        name: string;
        cuit: string | null;
        phone?: string | null;
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
