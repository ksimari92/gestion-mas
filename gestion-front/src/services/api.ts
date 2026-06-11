import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import {
    LoginResponse,
    Client,
    Sale,
    Payment,
    Expense,
    CashFlowMetrics,
    ClientStatement,
    Movement,
    SaleWithStatus,
    ExpenseReceipt
} from '../types';

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
        create: async (data: { name: string; cuit: string }): Promise<Client> => {
            const response = await apiInstance.post<Client>('/clients', data);
            return response.data;
        },
        getStatement: async (id: number): Promise<ClientStatement> => {
            const response = await apiInstance.get<ClientStatement>(`/clients/${id}/statement`);
            return response.data;
        },
        update: async (id: number, data: { name: string; cuit: string }): Promise<Client> => {
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
    expenses: {
        getAll: async (): Promise<Expense[]> => {
            const response = await apiInstance.get<Expense[]>('/expenses');
            return response.data;
        },
        create: async (data: {
            description: string;
            detail?: string;
            amount: number;
            category: string;
            payment_source: string;
            expense_date: string;
            receipt_base64?: string | null;
            receipt_mime_type?: string | null;
        }): Promise<Expense> => {
            const response = await apiInstance.post<Expense>('/expenses', data);
            return response.data;
        },
        update: async (id: number, data: any): Promise<Expense> => {
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
        getCashFlow: async (): Promise<CashFlowMetrics> => {
            const response = await apiInstance.get<CashFlowMetrics>('/metrics/cash-flow');
            return response.data;
        },
        getMovements: async (limit: number = 20): Promise<Movement[]> => {
            const response = await apiInstance.get<Movement[]>(`/metrics/movements?limit=${limit}`);
            return response.data;
        },
    },
};
