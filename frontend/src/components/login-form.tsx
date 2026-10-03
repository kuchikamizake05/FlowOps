"use client";
import React, { useState } from "react";

export default function LoginForm() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if(!email.trim() || !password){
            setError('Email dan kata sandi wajib diisi!');
            return;
        }

        setError(null);
        console.log('Data yang dikirim: ', {email});
    };

    return(
        <div className="max-w-md mx-auto my-10 rounded-lg border border-zinc-200 p-6 bg-white shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email-field" className="block text-sm font-medium text-zinc-700 mb-1">
                        Email
                    </label>
                    <input
                        id="email-field"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                        placeholder="example@email.com"
                    />
                </div>
                
                <div>
                    <label htmlFor="password-field" className="block text-sm font-medium text-zinc-700 mb-1">
                        Kata Sandi
                    </label>
                    <input
                        id="password-field"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                        placeholder="••••••••"
                    />
                </div>

                {error && <p role="alert" className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{error}</p>}

                <button
                    type="submit"
                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                    Masuk
                </button>
            </form>
        </div>
    );
}
