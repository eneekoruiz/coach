'use client';

type LoginAuthFormProps = {
  loginAction: (formData: FormData) => Promise<void>;
  signupAction: (formData: FormData) => Promise<void>;
  resendConfirmationAction: (formData: FormData) => Promise<void>;
  defaultEmail?: string;
};

export default function LoginAuthForm({
  loginAction,
  signupAction,
  resendConfirmationAction,
  defaultEmail = '',
}: LoginAuthFormProps) {
  const isE2EMockMode = process.env.NEXT_PUBLIC_E2E_MOCK_MODE === '1';

  const handleMockAuth = (mode: 'login' | 'signup') => {
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const email = emailInput?.value?.trim() ?? '';
    const password = passwordInput?.value ?? '';
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail || password.length < 6) {
      window.location.assign('/login?error=invalid_form');
      return;
    }

    window.location.assign(`/?e2e_auth=${mode}`);
  };

  return (
    <form className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          data-testid="login-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          spellCheck={false}
          required
          maxLength={120}
          defaultValue={defaultEmail}
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
          data-testid="login-password"
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
          type={isE2EMockMode ? 'button' : 'submit'}
          data-testid="login-submit"
          onClick={isE2EMockMode ? () => handleMockAuth('login') : undefined}
          {...(!isE2EMockMode ? { formAction: loginAction } : {})}
          className="rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.01] active:scale-[0.99]"
        >
          Iniciar Sesión
        </button>
        <button
          type={isE2EMockMode ? 'button' : 'submit'}
          data-testid="signup-submit"
          onClick={isE2EMockMode ? () => handleMockAuth('signup') : undefined}
          {...(!isE2EMockMode ? { formAction: signupAction } : {})}
          className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Crear Cuenta
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">¿No te llegó el correo de confirmación?</p>
        <p className="mt-1 leading-6">
          Usa el mismo email para solicitar un nuevo enlace. No necesitas escribir la contraseña.
        </p>
        <button
          type="submit"
          formAction={resendConfirmationAction}
          formNoValidate
          className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Reenviar confirmación
        </button>
      </div>
    </form>
  );
}
