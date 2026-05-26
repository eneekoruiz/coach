export function formatSpanishDate(dateValue: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateValue));
}

export function formatShortHeader(dateValue: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(dateValue));
}
