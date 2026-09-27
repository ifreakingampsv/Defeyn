import type { TutorApi } from '../types';
import { mockTutorApi } from './mockTutorApi';
import { realTutorApi } from './realTutorApi';

/**
 * Single entry point the UI uses to talk to "the backend".
 *
 * - `VITE_API_BASE_URL` set  → real HTTP client (fetch/streaming) is returned.
 * - otherwise                → in-memory mock that powers the product demos.
 */
export function getTutorApi(): TutorApi {
  if (import.meta.env.VITE_API_BASE_URL) {
    return realTutorApi;
  }
  return mockTutorApi;
}
