/**
 * Frontend logger. In development, errors go to the console as before.
 * In production builds, console noise is suppressed (it leaked internals in
 * DevTools) while still returning the error to callers for UI handling.
 * Wire a remote sink here when one is added.
 */

const isDev = import.meta.env.DEV;

type LoggerFn = (message?: unknown, ...optional: unknown[]) => void;

function makeFn(level: 'error' | 'warn' | 'info'): LoggerFn {
  if (isDev) {
    return (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console[level](...(args as [unknown, ...unknown[]]));
    };
  }
  return () => {};
}

export const logger = {
  error: makeFn('error'),
  warn: makeFn('warn'),
  info: makeFn('info'),
};
