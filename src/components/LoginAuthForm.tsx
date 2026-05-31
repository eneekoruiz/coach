'use client';

type LoginAuthFormProps = {
  loginAction: (formData: FormData) => Promise<void>;
  signupAction: (formData: FormData) => Promise<void>;
};

export default function LoginAuthForm({ loginAction, signupAction }: LoginAuthFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmitCapture={() => {
        const activeElement = document.activeElement as HTMLElement | null;
        activeElement?.blur();
      }}
    >
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={120}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          maxLength={128}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          placeholder="••••••••"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
        <button
          type="submit"
          formAction={loginAction}
          className="rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.01] active:scale-[0.99]"
        >
          Iniciar Sesión
        </button>
        <button
          type="submit"
          formAction={signupAction}
          className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Crear Cuenta
        </button>
      </div>
    </form>
  );
}
