import { getDb } from './db';
import { User } from './types';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'shatiby_session_user_id';

export function hashPassword(password: string): string {
  return `hash_${password}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hash === `hash_${password}` || hash === password;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionUserId) return null;

    const db = getDb();
    const user = db.users.find((u) => u.id === sessionUserId && u.status === 'active');

    return user || null;
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): User | null {
  try {
    const authHeader = req.headers.get('x-user-id') || req.headers.get('authorization')?.replace('Bearer ', '');
    const cookieUserId = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const userId = authHeader || cookieUserId;

    if (!userId) return null;

    const db = getDb();
    const user = db.users.find((u) => u.id === userId && u.status === 'active');

    return user || null;
  } catch (err) {
    console.error('Error in getUserFromRequest:', err);
    return null;
  }
}

/**
 * Checks if user is authorized to view or act on a specific partner data
 */
export function authorizePartnerAccess(user: User | null, requestedPartnerId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'partner' && user.partner_id === requestedPartnerId) return true;
  return false;
}
