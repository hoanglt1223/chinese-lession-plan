const API_BASE = import.meta.env.TAURI
  ? 'http://localhost:5000/api'  // For Tauri development, change to your deployed API
  : '/api';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Convert relative URLs to absolute for Tauri
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  
  return res;
}
