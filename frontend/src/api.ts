import axios from 'axios';
import type { QueueEntry, QueueStatus } from './types';

// Configure API base via Vite envs:
// - Dev:  VITE_API_BASE_URL=http://localhost:8000/api
// - Prod: VITE_API_BASE_URL=https://danison.dev/qup/api  (or https://api.danison.dev/qup/api)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Token ${token}`;
  }
  return config;
});

export const queueApi = {
  // Get all queue entries
  getAll: async (): Promise<QueueEntry[]> => {
    const response = await api.get('/queue/');
    const data = response.data as any;
    // Support both paginated and non-paginated DRF responses
    if (Array.isArray(data)) {
      return data as QueueEntry[];
    }
    if (data && Array.isArray(data.results)) {
      return data.results as QueueEntry[];
    }
    return [];
  },

  // Create a new queue entry
  create: async (data: {
    name: string;
    party_size: number;
    phone_number?: string;
  }): Promise<QueueEntry> => {
    const response = await api.post<QueueEntry>('/queue/', data);
    return response.data;
  },

  // Update queue entry status
  updateStatus: async (
    id: number,
    status: QueueStatus
  ): Promise<QueueEntry> => {
    const response = await api.patch<QueueEntry>(`/queue/${id}/`, {
      status,
    });
    return response.data;
  },

  // Delete a queue entry (admin only)
  remove: async (id: number): Promise<void> => {
    await api.delete(`/queue/${id}/delete/`);
  },

  // Compute seating optimization plan
  optimize: async (tables?: Array<{ id?: number; capacity: number }>): Promise<any> => {
    const response = await api.post('/queue/optimize/', tables ? { tables } : {});
    return response.data;
  },
};

export const authApi = {
  login: async (username: string, password: string): Promise<string> => {
    const response = await api.post<{ token: string }>('/token/', {
      username,
      password,
    });
    const token = response.data.token;
    localStorage.setItem('authToken', token);
    return token;
  },
  logout: () => {
    localStorage.removeItem('authToken');
  },
  isLoggedIn: () => {
    return Boolean(localStorage.getItem('authToken'));
  },
};
