const API_BASE =
  typeof window !== 'undefined'
    ? (import.meta.env.VITE_API_URL || '') + '/api'
    : '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Request failed');
  }
  return data as T;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<import('../types').LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    register: (username: string, password: string, displayName?: string) =>
      request<import('../types').LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName }),
      }),
  },
  books: {
    list: () => request<import('../types').Book[]>('/books'),
    get: (id: string) => request<import('../types').Book>(`/books/${id}`),
    create: (body: Partial<import('../types').Book>) =>
      request<import('../types').Book>('/books', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Partial<import('../types').Book>) =>
      request<import('../types').Book>(`/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/books/${id}`, { method: 'DELETE' }),
  },
  borrowings: {
    list: () => request<import('../types').Borrowing[]>('/borrowings'),
    borrow: (bookId: string) =>
      request<import('../types').Borrowing>('/borrowings/borrow', {
        method: 'POST',
        body: JSON.stringify({ bookId }),
      }),
    return: (id: string) =>
      request<{ id: string; status: string }>(`/borrowings/return/${id}`, {
        method: 'POST',
      }),
  },
};
