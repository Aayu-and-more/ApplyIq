import React from "react";
import { useAppStore } from "../store/useAppStore";

const Icon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>
    };
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icons[name] || null}
        </svg>
    );
};

export const LoginView = () => {
    const { loginWithGoogle } = useAppStore();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#080d1a] px-4 font-sans text-gray-900 dark:text-blue-50 transition-colors duration-300">
            <div className="w-full max-w-[400px] bg-white dark:bg-[#0e1524] rounded-2xl shadow-xl border border-gray-100 dark:border-[#1a2840] p-8 md:p-10 text-center flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight text-blue-600 mb-2">
                    <Icon name="briefcase" className="w-[28px] h-[28px] text-blue-600" />
                    ApplyIQ
                </div>
                <div className="text-[13.5px] text-gray-500 dark:text-[#8898b0] mb-8 font-medium">
                    Your ATS-Optimised Job Application Tracker
                </div>

                <button
                    onClick={loginWithGoogle}
                    className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-[#141e30] hover:bg-gray-50 dark:hover:bg-[#1a2840] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white py-3.5 px-4 rounded-xl text-[14px] font-bold transition-all shadow-sm cursor-pointer"
                >
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <div className="text-[11.5px] text-gray-400 dark:text-[#4e6a8a] mt-8 font-medium flex items-center gap-1.5">
                    <span className="text-[14px]">🔒</span> Your data is securely synced to the cloud
                </div>
            </div>
        </div>
    );
};
