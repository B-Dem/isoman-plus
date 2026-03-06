import type {
  APIResponse,
  CreateISORequest,
  ISO,
  ListISOsParams,
  ListISOsResponse,
  UpdateISORequest,
} from '../types/iso';
import type { DownloadTrend, Stats } from '../types/stats';

/**
 * Base API URL - defaults to same origin in production
 * Can be overridden with PUBLIC_API_URL environment variable
 */
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '';

/**
 * Generic fetch wrapper with error handling and JSON parsing
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<APIResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data: APIResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'An error occurred');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

/**
 * List ISOs with pagination and sorting
 */
export async function listISOsPaginated(
  params: ListISOsParams = {},
): Promise<ListISOsResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize)
    searchParams.set('page_size', params.pageSize.toString());
  if (params.sortBy) searchParams.set('sort_by', params.sortBy);
  if (params.sortDir) searchParams.set('sort_dir', params.sortDir);

  const queryString = searchParams.toString();
  const url = queryString ? `/api/isos?${queryString}` : '/api/isos';

  const response = await apiFetch<ListISOsResponse>(url);
  return {
    isos: response.data?.isos || [],
    pagination: response.data?.pagination || {
      page: 1,
      page_size: 10,
      total: 0,
      total_pages: 0,
    },
  };
}

/**
 * Get a single ISO by ID
 */
export async function getISO(id: string): Promise<ISO> {
  const response = await apiFetch<ISO>(`/api/isos/${id}`);
  if (!response.data) {
    throw new Error('ISO not found');
  }
  return response.data;
}

/**
 * Create a new ISO download
 */
export async function createISO(request: CreateISORequest): Promise<ISO> {
  const response = await apiFetch<ISO>('/api/isos', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (!response.data) {
    throw new Error('Failed to create ISO');
  }
  return response.data;
}

/**
 * Delete an ISO by ID
 */
export async function deleteISO(id: string): Promise<void> {
  await apiFetch<void>(`/api/isos/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Retry a failed ISO download
 */
export async function retryISO(id: string): Promise<ISO> {
  const response = await apiFetch<ISO>(`/api/isos/${id}/retry`, {
    method: 'POST',
  });
  if (!response.data) {
    throw new Error('Failed to retry ISO');
  }
  return response.data;
}

/**
 * Update an existing ISO
 */
export async function updateISO(
  id: string,
  request: UpdateISORequest,
): Promise<ISO> {
  const response = await apiFetch<ISO>(`/api/isos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
  if (!response.data) {
    throw new Error('Failed to update ISO');
  }
  return response.data;
}

/**
 * Get health status
 */
export async function getHealth(): Promise<{ status: string; time: string }> {
  const response = await apiFetch<{ status: string; time: string }>('/health');
  if (!response.data) {
    throw new Error('Failed to get health status');
  }
  return response.data;
}

/**
 * Get aggregated statistics
 */
export async function getStats(): Promise<Stats> {
  const response = await apiFetch<Stats>('/api/stats');
  if (!response.data) {
    throw new Error('Failed to get statistics');
  }
  return response.data;
}

/**
 * Get download trends over time
 */
export async function getDownloadTrends(
  period: 'daily' | 'weekly' = 'daily',
  days: number = 30,
): Promise<DownloadTrend> {
  const response = await apiFetch<DownloadTrend>(
    `/api/stats/trends?period=${period}&days=${days}`,
  );
  if (!response.data) {
    throw new Error('Failed to get download trends');
  }
  return response.data;
}
// Fonction pour uploader un fichier ISO local avec suivi de progression et annulation
export function uploadISO(
  formData: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal // <-- NOUVEAU : On écoute le signal d'annulation
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // NOUVEAU : Si on clique sur "Annuler", ça coupe la connexion immédiatement
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error("Upload annulé par l'utilisateur"));
      });
    }

    xhr.open('POST', '/api/isos/upload');

    // Écouteur de progression de l'upload
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    // Gestion de la réponse une fois terminé
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.data || data);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error?.message || 'Échec de l\'upload'));
        } catch (e) {
          reject(new Error(`Erreur réseau (Statut ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Erreur de connexion pendant l\'upload'));

    // Envoi de la requête
    xhr.send(formData);
  });
}