import { getActiveBusinessId } from '@/stores/business.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const REQUEST_TIMEOUT_MS = 30_000;

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const businessId = getActiveBusinessId();
    const skipBusinessHeader =
      endpoint.startsWith('/auth') || endpoint.startsWith('/businesses');
    if (businessId && !skipBusinessHeader) {
      (headers as Record<string, string>)['X-Business-Id'] = businessId;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      let data: { success?: boolean; data?: T; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error('Invalid server response');
      }

      if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        import('@/stores/auth.store').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
        throw new Error('Session expired. Please sign in again.');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Request failed');
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async download(endpoint: string, filename: string) {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    const businessId = getActiveBusinessId();
    if (businessId && !endpoint.startsWith('/auth') && !endpoint.startsWith('/businesses')) {
      (headers as Record<string, string>)['X-Business-Id'] = businessId;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_URL}${endpoint}`, { headers, signal: controller.signal });
      if (!res.ok) {
        throw new Error('Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const api = new ApiClient();
