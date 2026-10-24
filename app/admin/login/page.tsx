'use client';

import { useActionState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';

import { loginAdmin } from '@/app/admin/actions';

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f4ee] p-4 text-[#262320]">
      <section className="w-full max-w-md rounded-3xl border border-[#e9e0d4] bg-[#fffdf9] p-6 shadow-[0_20px_60px_rgba(76,57,38,0.08)] sm:p-9">
        <div className="mb-8">
          <p className="font-serif text-4xl tracking-[-0.08em]">kunan</p>
          <p className="mt-2 text-[10px] font-medium tracking-[0.18em] text-[#a88b4c] uppercase">
            Administración privada
          </p>
        </div>
        <div className="mb-6 flex size-11 items-center justify-center rounded-2xl bg-[#f1e7d7] text-[#a88b4c]">
          <LockKeyhole />
        </div>
        <h1 className="font-serif text-3xl">Ingresar al panel</h1>
        <p className="mt-2 text-sm leading-6 text-[#766e66]">
          Acceso exclusivo para gestionar tu local.
        </p>
        <form action={formAction} className="mt-7 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="admin@kunan.com"
              className="rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-3 text-sm outline-none focus:border-[#c9ae73]"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-medium text-[#766e66]">
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="rounded-xl border border-[#e0d5c7] bg-[#fffdf9] px-3 py-3 text-sm outline-none focus:border-[#c9ae73]"
            />
          </label>
          {state.error && (
            <p role="alert" className="text-xs text-[#a33a32]">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#262320] px-4 py-3 text-xs font-medium text-white transition hover:bg-[#a88b4c] disabled:opacity-60"
          >
            {pending ? (
              'Ingresando…'
            ) : (
              <>
                Entrar <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
