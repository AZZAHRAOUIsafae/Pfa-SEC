type LogLevel = 'info' | 'warn' | 'error';

export function logClient(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (import.meta.env.PROD && level === 'info') return;
  const payload = { level, message, ...context, at: new Date().toISOString() };
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](payload);
}
