import * as Sentry from '@sentry/nextjs';

type MonitoringContext = {
  area: string;
  action: string;
  extra?: Record<string, unknown>;
};

function scrubExtra(extra: Record<string, unknown> = {}) {
  const clone = { ...extra };
  const piiKeys = ['email', 'password', 'token', 'authorization', 'image', 'base64'];

  for (const key of Object.keys(clone)) {
    if (piiKeys.some((pii) => key.toLowerCase().includes(pii))) {
      clone[key] = '[redacted]';
    }
  }

  return clone;
}

export function captureException(error: unknown, context: MonitoringContext) {
  Sentry.withScope((scope) => {
    scope.setTag('area', context.area);
    scope.setTag('action', context.action);
    scope.setContext('app_context', scrubExtra(context.extra));
    Sentry.captureException(error);
  });
}
