export interface QueueEntry {
  id: number;
  name: string;
  party_size: number;
  phone_number: string | null;
  joined_at: string;
  status: 'waiting' | 'seated' | 'no_show' | 'cancelled';
  // Optional, computed client-side
  estimated_wait_minutes?: number;
}

export type QueueStatus = 'waiting' | 'seated' | 'no_show' | 'cancelled';

