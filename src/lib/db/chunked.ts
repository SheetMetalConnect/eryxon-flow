/**
 * Run a PostgREST `.in(column, ids)` query in chunks and concatenate the rows.
 *
 * A single `.in()` with hundreds of ids builds a URL longer than the server
 * accepts, returning a 400 (this took down the operator view, which loads every
 * visible operation's batch links at once). Chunking keeps each request small.
 */
const DEFAULT_CHUNK_SIZE = 100;

export async function fetchInChunks<T>(
  ids: string[],
  run: (chunk: string[]) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const { data, error } = await run(ids.slice(i, i + chunkSize));
    if (error) throw error;
    if (data) out.push(...(data as T[]));
  }
  return out;
}
