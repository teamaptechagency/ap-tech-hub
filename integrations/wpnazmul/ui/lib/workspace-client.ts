import { hubFetch } from './hub-fetch';
export type Realm = 'client' | 'admin';
export type Person = { id: string | number; name: string; email: string };
export type Project = { id: string; uuid?: string; title: string; service: string; brief: string; budget?: string; status: string; revision: number; due_date?: string | null; client_name?: string; unread_count?: number };
export type Invoice = { id: string; uuid?: string; title: string; amount_minor: number; currency: string; status: string };
export type Message = { id: number; body: string; sender_role?: string; author_type?: string; sender_name?: string; mine?: boolean; created_at?: string };
export type History = { messages: Message[]; next_cursor: number | null; has_more: boolean; read_cursor: number | null };
const sessionTokens: Partial<Record<Realm, string>> = {};

export class WorkspaceError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter=0) { super(message); }
}

export async function workspace<T>(realm: Realm, path: string, method = 'GET', data?: object, key?: string): Promise<T> {
  if (method !== 'GET' && !sessionTokens[realm]) await workspace(realm, '/session');
  const headers = new Headers({ Accept: 'application/json' });
  const multipart = data instanceof FormData;
  if (data && !multipart) headers.set('Content-Type', 'application/json');
  if (method !== 'GET' && sessionTokens[realm]) headers.set('X-CSRF-TOKEN', sessionTokens[realm]);
  if (key) headers.set('Idempotency-Key', key);
  const response = await hubFetch('/api/v1/' + realm + path, {
    method, headers, body: multipart ? data : data ? JSON.stringify(data) : undefined, credentials: 'same-origin', cache: 'no-store',
  });
  const result = response.status === 204 ? {} : await response.json().catch(() => null);
  if (!response.ok || !result) {
    if ([401, 419].includes(response.status)) delete sessionTokens[realm];
    const fields = Object.values(result?.error?.fields ?? {}).flat().filter(value => typeof value === 'string');
    const retryAfter=Math.min(600,Math.max(0,Number(response.headers.get('Retry-After'))||0));
    throw new WorkspaceError(fields.join(' ') || result?.error?.message || (response.status===429?'Please wait before trying again.':'Request failed. Please try again.'), response.status,retryAfter);
  }
  if (typeof result.csrf === 'string') sessionTokens[realm] = result.csrf;
  else if (['/login', '/logout', '/register'].includes(path)) delete sessionTokens[realm];
  return result;
}

export function recordId(record: { id: string; uuid?: string }) {
  return encodeURIComponent(record.uuid || record.id);
}
