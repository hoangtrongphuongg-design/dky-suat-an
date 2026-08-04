import { neon } from '@neondatabase/serverless';

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL chưa được cấu hình.');
  }
  return neon(process.env.DATABASE_URL, { fetchOptions: { cache: 'no-store' } });
}
