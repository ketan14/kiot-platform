import { useOrgStore } from '../stores/orgStore';

const BASE_URL = ''; // Relative path, proxied by Vite to Fastify API (http://localhost:3000)

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;
  const currentOrgId = useOrgStore.getState().currentOrg.id;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const response = await fetch(url, {
    ...customConfig,
    headers: {
      'Content-Type': 'application/json',
      'X-KIOT-Organization-Id': currentOrgId,
      ...headers,
    },
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || errJson.error || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}

