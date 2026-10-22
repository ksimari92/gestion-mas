import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import {
    LoginResponse,
    Client,
    ClientInput,
    Sale,
    Payment,
    Expense,
    CashFlowMetrics,
    ClientStatement,
    Movement,
    SaleWithStatus,
    ExpenseReceipt,
    ExpenseFilters,
    ExpenseInput,
    ExpenseSummary,
    DashboardData,
    Project,
    ProjectDetail,
    ProjectStage,
    StageTemplate
} from '../types';

/** Convierte los filtros de la planilla en query params, salteando vacíos. */
const toParams = (filters: ExpenseFilters = {}): Record<string, string> => {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        params[key] = String(value);
    });
    return params;
};

// Use environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

if (import.meta.env.DEV) {
    console.log(`[API] Using base URL: ${API_URL}`);
}

const apiInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add JWT token
apiInstance.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor to handle 401 errors
apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export const api = {
    auth: {
        login: async (email: string, password: string): Promise<LoginResponse> => {
            const response = await apiInstance.post<LoginResponse>('/auth/login', { email, password });
            return response.data;
        },
    },
    clients: {
        getAll: async (): Promise<Client[]> => {
            const response = await apiInstance.get<Client[]>('/clients');
            return response.data;
        },
        create: async (data: ClientInput): Promise<Client> => {
            const response = await apiInstance.post<Client>('/clients', data);
            return response.data;
        },
        getStatement: async (id: number): Promise<ClientStatement> => {
            const response = await apiInstance.get<ClientStatement>(`/clients/${id}/statement`);
            return response.data;
        },
        update: async (id: number, data: ClientInput): Promise<Client> => {
            const response = await apiInstance.put<Client>(`/clients/${id}`, data);
            return response.data;
        },
        delete: async (id: number): Promise<{ message: string }> => {
            const response = await apiInstance.delete<{ message: string }>(`/clients/${id}`);
            return response.data;
        },
    },
    sales: {
        getAll: async (): Promise<SaleWithStatus[]> => {
            const response = await apiInstance.get<SaleWithStatus[]>('/sales');
            return response.data;
        },
        create: async (data: Partial<Sale>): Promise<Sale> => {
            const response = await apiInstance.post<Sale>('/sales', data);
            return response.data;
        },
        update: async (id: number, data: Partial<Sale>): Promise<Sale> => {
            const response = await apiInstance.put<Sale>(`/sales/${id}`, data);
            return response.data;
        },
        delete: async (id: number): Promise<{ message: string }> => {
            const response = await apiInstance.delete<{ message: string }>(`/sales/${id}`);
            return response.data;
        },
    },
    payments: {
        getAll: async (): Promise<Payment[]> => {
            const response = await apiInstance.get<Payment[]>('/payments');
            return response.data;
        },
        create: async (data: Partial<Payment>): Promise<{ message: string }> => {
            const response = await apiInstance.post<{ message: string }>('/payments', data);
            return response.data;
        },
    },
    projects: {
        getAll: async (status?: string): Promise<Project[]> => {
            const response = await apiInstance.get<Project[]>('/projects', {
                params: status ? { status } : undefined,
            });
            return response.data;
        },
        getById: async (id: number): Promise<ProjectDetail> => {
            const response = await apiInstance.get<ProjectDetail>(`/projects/${id}`);
            return response.data;
        },
        getTemplates: async (): Promise<StageTemplate[]> => {
            const response = await apiInstance.get<StageTemplate[]>('/projects/templates');
            return response.data;
        },
        create: async (data: Omit<Partial<Project>, 'stages'> & { stages?: string[]; template?: string }): Promise<Project> => {
            const response = await apiInstance.post<Project>('/projects', data);
            return response.data;
        },
        update: async (id: number, data: Partial<Project>): Promise<Project> => {
            const response = await apiInstance.put<Project>(`/projects/${id}`, data);
            return response.data;
        },
        delete: async (id: number): Promise<{ message: string }> => {
            const response = await apiInstance.delete<{ message: string }>(`/projects/${id}`);
            return response.data;
        },
        createStage: async (projectId: number, data: Partial<ProjectStage>): Promise<ProjectStage> => {
            const response = await apiInstance.post<ProjectStage>(`/projects/${projectId}/stages`, data);
            return response.data;
        },
        updateStage: async (projectId: number, stageId: number, data: Partial<ProjectStage>): Promise<ProjectStage> => {
            const response = await apiInstance.put<ProjectStage>(`/projects/${projectId}/stages/${stageId}`, data);
            return response.data;
        },
        deleteStage: async (projectId: number, stageId: number): Promise<{ message: string }> => {
            const response = await apiInstance.delete<{ message: string }>(`/projects/${projectId}/stages/${stageId}`);
            return response.data;
        },
    },
    expenses: {
        getAll: async (filters?: ExpenseFilters): Promise<Expense[]> => {
            const response = await apiInstance.get<Expense[]>('/expenses', { params: toParams(filters) });
            return response.data;
        },
        getSummary: async (filters?: ExpenseFilters): Promise<ExpenseSummary> => {
            const response = await apiInstance.get<ExpenseSummary>('/expenses/summary', { params: toParams(filters) });
            return response.data;
        },
        create: async (data: ExpenseInput): Promise<Expense> => {
            const response = await apiInstance.post<Expense>('/expenses', data);
            return response.data;
        },
        createBulk: async (items: ExpenseInput[]): Promise<{ created: number; errors: { index: number; error: string }[] }> => {
            const response = await apiInstance.post('/expenses/bulk', { expenses: items });
            return response.data;
        },
        /** Actualización parcial: se envían sólo las celdas editadas. */
        update: async (id: number, data: ExpenseInput): Promise<Expense> => {
            const response = await apiInstance.put<Expense>(`/expenses/${id}`, data);
            return response.data;
        },
        delete: async (id: number): Promise<{ message: string }> => {
            const response = await apiInstance.delete<{ message: string }>(`/expenses/${id}`);
            return response.data;
        },
        getReceipt: async (id: number): Promise<ExpenseReceipt> => {
            const response = await apiInstance.get<ExpenseReceipt>(`/expenses/${id}/receipt`);
            return response.data;
        },
    },
    metrics: {
        getDashboard: async (filters?: { project_id?: number | 'none'; from?: string; to?: string }): Promise<DashboardData> => {
            const params: Record<string, string> = {};
            if (filters?.project_id !== undefined && filters.project_id !== null) params.project_id = String(filters.project_id);
            if (filters?.from) params.from = filters.from;
            if (filters?.to) params.to = filters.to;
            const response = await apiInstance.get<DashboardData>('/metrics/dashboard', { params });
            return response.data;
        },
        getCashFlow: async (): Promise<CashFlowMetrics> => {
            const response = await apiInstance.get<CashFlowMetrics>('/metrics/cash-flow');
            return response.data;
        },
        getMovements: async (
            limit: number = 20,
            filters?: { project_id?: number | 'none'; from?: string; to?: string }
        ): Promise<Movement[]> => {
            const params: Record<string, string> = { limit: String(limit) };
            if (filters?.project_id !== undefined && filters.project_id !== null) params.project_id = String(filters.project_id);
            if (filters?.from) params.from = filters.from;
            if (filters?.to) params.to = filters.to;
            const response = await apiInstance.get<Movement[]>('/metrics/movements', { params });
            return response.data;
        },
    },
};
