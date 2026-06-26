/**
 * 统一 API 请求封装
 * - 自动携带 token
 * - 401 自动跳转登录
 * - 统一错误处理
 */

import router from '@/router';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('qb-token');
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; [key: string]: any }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  // 401 → 跳转登录
  if (res.status === 401) {
    localStorage.removeItem('qb-token');
    localStorage.removeItem('qb-user');
    router.push('/login');
    return { success: false, error: '登录已过期，请重新登录' };
  }

  const json = await res.json();
  return json;
}

// 便捷方法
export const apiGet = <T = any>(path: string) => api<T>(path);

export const apiPost = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const apiPut = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });

export const apiDelete = <T = any>(path: string) =>
  api<T>(path, { method: 'DELETE' });

// 文件上传（不自动设 Content-Type，让浏览器自动加 boundary）
export async function apiUpload<T = any>(path: string, formData: FormData): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('qb-token');
    localStorage.removeItem('qb-user');
    router.push('/login');
    return { success: false, error: '登录已过期' };
  }

  return res.json();
}
