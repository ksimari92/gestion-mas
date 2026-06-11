import { LoginForm } from '../components/organisms/LoginForm';

export function Login() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-agro-50/40 via-gray-50/50 to-gray-50/50">
            <div className="w-full max-w-md space-y-8 relative z-10">
                <LoginForm />
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 mt-8">
                    © {new Date().getFullYear()} Desarrollado por Karen Simari
                </p>
            </div>
        </div>
    );
}
