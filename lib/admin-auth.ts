import 'server-only';

import { AdminSessionService } from '@/infrastructure/services/admin-session.service';

export function verifyAdminCredentials(email: string, password: string) {
  return AdminSessionService.verifyCredentials(email, password);
}

export async function createAdminSession() {
  return AdminSessionService.createSession();
}

export async function isAdminAuthenticated() {
  return AdminSessionService.isAuthenticated();
}

export async function requireAdmin() {
  return AdminSessionService.requireAdmin();
}

export async function clearAdminSession() {
  return AdminSessionService.clearSession();
}
