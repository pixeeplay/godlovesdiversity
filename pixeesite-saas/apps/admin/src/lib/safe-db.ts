/**
 * Wrapper to safely query Prisma models that may not exist yet on a tenant DB
 * (e.g., new models added but `prisma db push` not yet applied).
 * Returns the fallback if the table doesn't exist.
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await fn();
    return result ?? fallback;
  } catch (e: any) {
    // P2021 = table does not exist | P2022 = column does not exist
    const code = e?.code || '';
    const msg = e?.message || '';
    if (code === 'P2021' || code === 'P2022' || msg.includes('does not exist') || msg.includes('Unknown')) {
      return fallback;
    }
    // Re-throw other errors
    throw e;
  }
}
