/* eslint-disable @typescript-eslint/no-explicit-any */

import { env } from './config';

const buildApiUrl = (url: string) => `${env.API_URL.toString()}${url}`;

const parseBody = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const resolveErrorMessage = (response: Response, payload: any): string => {
  const message =
    payload?.userMessage ||
    payload?.message ||
    payload?.error?.userMessage ||
    payload?.error?.message ||
    (Array.isArray(payload?.validation) ? payload.validation[0]?.message : undefined);

  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  if (response.statusText?.trim()) {
    return response.statusText.trim();
  }

  return `Request failed (${response.status})`;
};

const request = async <T>(url: string, options: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl(url), {
    ...options,
    credentials: 'include',
  });

  const payload = await parseBody(response);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(response, payload));
  }

  return payload as T;
};

export const get = <T>(url: string, options?: RequestInit): Promise<T> =>
  request<T>(url, { ...options, method: 'GET' });

export const post = <T>(url: string, data?: any, options?: RequestInit): Promise<T> =>
  request<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

export const put = <T>(url: string, data?: any, options?: RequestInit): Promise<T> =>
  request<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

export const patch = <T>(url: string, data?: any, options?: RequestInit): Promise<T> =>
  request<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

export const del = <T>(url: string, options?: RequestInit): Promise<T> =>
  request<T>(url, { ...options, method: 'DELETE' });
