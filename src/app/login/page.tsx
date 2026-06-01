import { login, resendConfirmation, signup } from './actions';
import LoginAuthForm from '@/components/LoginAuthForm';

const errorMessages: Record<string, string> = {
  invalid_form: 'Revisa email y contraseña. Formato inválido o campos vacíos.',
  invalid_credentials: 'Email o contraseña inválidos.',
  email_not_confirmed: 'Debes confirmar tu email antes de iniciar sesión.',
  email_confirmation_link_expired:
    'El enlace de confirmación expiró o ya no es válido. Pide un nuevo correo de confirmación.',
  config_missing: 'Falta configuración de Supabase en el servidor.',
  auth_failed: 'No se pudo iniciar sesión. Intenta nuevamente.',
  logout_failed: 'No se pudo cerrar sesión correctamente.',
};

const successMessages: Record<string, string> = {
  signup: 'Cuenta creada. Revisa tu correo para confirmar el email.',
  confirmation_resent: 'Te enviamos un nuevo correo de confirmación. Revisa tu bandeja de entrada.',
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    email?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const errorCode = resolvedSearchParams?.error;
  const successCode = resolvedSearchParams?.success;
  const pendingEmail = resolvedSearchParams?.email ?? '';
  const errorText = errorCode ? errorMessages[errorCode] ?? 'Error desconocido de autenticación.' : null;
  const successText = successCode ? successMessages[successCode] ?? null : null;
  const isEmailNotConfirmed = errorCode === 'email_not_confirmed';
  const isExpiredConfirmationLink = errorCode === 'email_confirmation_link_expired';

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(232,238,245,0.92)_38%,_rgba(212,220,232,0.96)_100%)] px-4 py-6 text-slate-900 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-[1.5rem] border border-white/80 bg-white/75 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-8">
          <div className="mb-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
              Gemelo Digital Fisiológico
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Acceso al Bio-Avatar
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Entra para registrar hábitos, analizar tu día y generar el cierre final.
            </p>
          </div>

          {errorText ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900" role="alert">
              <p className="font-semibold">
                {isEmailNotConfirmed || isExpiredConfirmationLink
                  ? 'Problema con la confirmación del correo'
                  : 'No pudimos iniciar sesión'}
              </p>
              <p className="mt-1 leading-6">{errorText}</p>
              {isEmailNotConfirmed || isExpiredConfirmationLink ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-3 text-rose-950">
                  <p className="font-medium">Qué hacer ahora</p>
                  <p className="mt-1 leading-6">
                    {isExpiredConfirmationLink
                      ? 'Vuelve a solicitar un correo de confirmación desde el registro o pide que te reenviemos el enlace.'
                      : `Revisa la bandeja de entrada y la carpeta de spam del correo ${pendingEmail || 'que usaste al registrarte'}. Abre el mensaje de confirmación y vuelve después a iniciar sesión.`}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {successText ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
              {successText}
            </div>
          ) : null}

          <LoginAuthForm
            loginAction={login}
            signupAction={signup}
            resendConfirmationAction={resendConfirmation}
            defaultEmail={pendingEmail}
          />
        </section>
      </div>
    </main>
  );
}
