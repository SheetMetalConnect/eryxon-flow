import { serveApi } from "@shared/handler.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { createSuccessResponse, BadRequestError } from "@shared/validation/errorHandler.ts";

export default serveApi(async (req: Request, ctx: HandlerContext) => {
  const { supabase, tenantId } = ctx;

  const body = await req.json();
  const { filename, content_type, job_number } = body;

  if (!filename || !content_type) {
    throw new BadRequestError('filename and content_type are required');
  }

  // Basic filename validation
  if (filename.length > 255) {
    throw new BadRequestError('Filename too long (max 255 characters)');
  }

  // Block path traversal and dangerous characters
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new BadRequestError('Filename contains invalid characters');
  }

  // Sanitize filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  const filePath = job_number
    ? `${tenantId}/jobs/${job_number}/${sanitizedFilename}`
    : `${tenantId}/files/${sanitizedFilename}`;

  const { data, error } = await supabase.storage
    .from('issues')
    .createSignedUploadUrl(filePath);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return createSuccessResponse({
    upload_url: data.signedUrl,
    file_path: filePath,
    expires_at: expiresAt
  });
});
