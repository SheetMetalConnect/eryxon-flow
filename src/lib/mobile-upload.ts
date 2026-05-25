/**
 * Storage-path helpers for the mobile/native operator shell.
 *
 * Camera uploads on iOS/Android frequently reuse the same filename
 * (`image.jpg`, `IMG_0001.HEIC`, …) for every shot in a session, so a path
 * built straight from `file.name` collides on the second photo and the
 * `issues` bucket upload fails (the SDK defaults to `upsert: false`). We
 * prefix every object with a per-file unique segment so repeated camera
 * filenames never clash, while still keeping the original name readable for
 * anyone browsing storage.
 */

/** Strip path separators and characters that are awkward in storage keys. */
export function sanitizeUploadFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+/, "");
  return cleaned.length > 0 ? cleaned : "photo";
}

/**
 * Build a collision-proof storage path for an issue photo.
 *
 * @param tenantId  owning tenant (first path segment, matches RLS scoping)
 * @param issueId   the issue the photo belongs to
 * @param fileName  the original (possibly duplicated) camera filename
 * @param uniqueId  caller-supplied unique segment (e.g. `crypto.randomUUID()`)
 */
export function buildIssueImagePath(
  tenantId: string,
  issueId: string,
  fileName: string,
  uniqueId: string,
): string {
  return `${tenantId}/issues/${issueId}/${uniqueId}-${sanitizeUploadFileName(fileName)}`;
}
