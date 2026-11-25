export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3);
}

export function formatDayMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatNextReview(isoDate: string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'Hoy';
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Mañana';
  if (days < 30) return `En ${days} días`;
  const months = Math.round(days / 30);
  return `En ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

export function speakEnglish(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}
