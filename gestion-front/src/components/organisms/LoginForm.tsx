import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export const LoginForm = () => {
    const navigate = useNavigate();
    const loginBound = useAuthStore((state) => state.login);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const loginMutation = useMutation({
        mutationFn: async () => {
            // Basic validation
            if (!email || !password) {
                throw new Error('Por favor complete todos los campos');
            }
            try {
                console.log('Attempting login with:', { email });
                return await api.auth.login(email, password);
            } catch (err: any) {
                // Detailed logging for debugging
                console.error('Login request failed details:', {
                    status: err.response?.status,
                    data: err.response?.data,
                    headers: err.response?.headers,
                    message: err.message
                });
                throw err;
            }
        },
        onSuccess: (data) => {
            console.log('Login successful', data);
            loginBound(data.user, data.token);
            navigate('/');
        },
        onError: (err: any) => {
            console.error('Login mutation error:', err);
            // Handle axios error or generic error
            let message = 'Error al iniciar sesión';

            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                if (err.response.status === 401) {
                    message = 'Credenciales incorrectas. Verifique email y contraseña.';
                } else if (err.response.data && err.response.data.message) {
                    message = err.response.data.message;
                }
            } else if (err.request) {
                // The request was made but no response was received
                message = 'No se pudo conectar con el servidor. Verifique su conexión.';
            } else {
                // Something happened in setting up the request that triggered an Error
                message = err.message;
            }

            setError(message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        loginMutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-50 relative overflow-hidden group">
                <div className="text-center mb-10">
                    <div className="mx-auto w-16 h-16 bg-agro-50/50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-agro-100">
                        <span className="text-2xl">🌱</span>
                    </div>
                    <h2 className="text-3xl font-black text-agro-950 tracking-tighter leading-none mb-2">Gestión MAS</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ingresa a tu cuenta</p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email</label>
                        <input
                            type="email"
                            placeholder="usuario@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            autoFocus
                            className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 font-bold focus:border-agro-500 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 font-bold focus:border-agro-500 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-8 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 animate-in fade-in">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <span className="text-red-600 font-bold">!</span>
                        </div>
                        <p className="text-xs font-bold text-red-700 leading-tight">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full mt-10 bg-agro-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-agro-900/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-agro-700"
                >
                    {loginMutation.isPending ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
            </div>
        </form>
    );
};

