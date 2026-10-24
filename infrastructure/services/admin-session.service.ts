import 'server-only';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UnauthorizedError } from '@/core/domain/errors/domain.error';

const sessionCookie = 'kunan_admin_session';
const sessionDurationSeconds = 60 * 60 * 8; // 8 horas

export class AdminSessionService {
  private static getAuthConfig() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    if (!email || !password || !secret || secret.length < 32) {
      throw new Error(
        'Configurá ADMIN_EMAIL, ADMIN_PASSWORD y AUTH_SECRET (mínimo 32 caracteres) para habilitar el panel.'
      );
    }

    return { email, password, secret };
  }

  private static safeEqual(left: string, right: string) {
    return timingSafeEqual(
      createHash('sha256').update(left).digest(),
      createHash('sha256').update(right).digest()
    );
  }

  private static sign(payload: string, secret: string) {
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  static verifyCredentials(email: string, password: string): boolean {
    const config = this.getAuthConfig();
    const emailMatches = this.safeEqual(
      email.trim().toLocaleLowerCase('en-US'),
      config.email.trim().toLocaleLowerCase('en-US')
    );
    const passwordMatches = this.safeEqual(password, config.password);
    return emailMatches && passwordMatches;
  }

  static async createSession(): Promise<void> {
    const { secret } = this.getAuthConfig();
    const payload = Buffer.from(
      JSON.stringify({
        expiresAt: Math.floor(Date.now() / 1000) + sessionDurationSeconds,
      })
    ).toString('base64url');
    const token = `${payload}.${this.sign(payload, secret)}`;

    const cookieStore = await cookies();
    cookieStore.set(sessionCookie, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionDurationSeconds,
    });
  }

  static async isAuthenticated(): Promise<boolean> {
    const { secret } = this.getAuthConfig();
    const token = (await cookies()).get(sessionCookie)?.value;
    if (!token) return false;

    const [payload, signature, ...extra] = token.split('.');
    if (!payload || !signature || extra.length || !/^[A-Za-z0-9_-]+$/.test(payload)) {
      return false;
    }

    const expectedSignature = this.sign(payload, secret);
    if (!this.safeEqual(signature, expectedSignature)) return false;

    try {
      const session = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8')
      ) as { expiresAt?: unknown };

      return (
        typeof session.expiresAt === 'number' &&
        session.expiresAt > Math.floor(Date.now() / 1000)
      );
    } catch {
      return false;
    }
  }

  static async requireAdmin(): Promise<void> {
    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      redirect('/admin/login');
    }
  }

  static async clearSession(): Promise<void> {
    const cookieStore = await cookies();
    for (const path of ['/', '/admin']) {
      cookieStore.set(sessionCookie, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path,
        maxAge: 0,
      });
    }
  }
}
