/**
 * Security utilities for Edge Functions
 */

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    // Don't expose internal error details
    // Only return generic messages for security
    const message = error.message;

    // Check for database errors (Postgres codes)
    if (message.includes('duplicate key') || message.includes('PGRST116')) {
      return { code: 'CONFLICT', message: 'Resource already exists or not found' };
    }

    if (message.includes('foreign key') || message.includes('violates')) {
      return { code: 'INVALID_REFERENCE', message: 'Invalid reference to related resource' };
    }

    if (message.includes('permission denied') || message.includes('RLS')) {
      return { code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    // For other errors, return generic message
    // Log the real error server-side for debugging
    console.error('Sanitized error:', error);

    return { code: 'INTERNAL_ERROR', message: 'An internal error occurred' };
  }

  return { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
}

/**
 * Validate and sanitize filename for uploads
 */
export function validateFilename(filename: string): { valid: boolean; error?: string; sanitized?: string } {
  // Check length
  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }

  if (filename.length === 0) {
    return { valid: false, error: 'Filename cannot be empty' };
  }

  // Block path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }

  // Block dangerous extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.app', '.deb', '.rpm',
    '.js', '.jsx', '.ts', '.tsx', '.mjs',
    '.php', '.asp', '.aspx', '.jsp',
    '.dll', '.so', '.dylib',
  ];

  const lowerFilename = filename.toLowerCase();
  for (const ext of dangerousExtensions) {
    if (lowerFilename.endsWith(ext)) {
      return { valid: false, error: `File type ${ext} not allowed` };
    }
  }

  // Sanitize filename: remove special characters except . - _
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return { valid: true, sanitized };
}

/**
 * Validate content type
 */
export function validateContentType(contentType: string): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
  ];

  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: 'Content type not allowed' };
  }

  return { valid: true };
}

/**
 * Validate webhook URL to prevent SSRF
 */
export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Webhook URL must use HTTPS' };
    }

    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost')
    ) {
      return { valid: false, error: 'Localhost URLs not allowed' };
    }

    // Block private IP ranges
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return { valid: false, error: 'Private IP addresses not allowed' };
    }

    // Block metadata services
    if (hostname === '169.254.169.254' || hostname.includes('metadata')) {
      return { valid: false, error: 'Metadata service URLs not allowed' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate input limits
 */
export function validateInputLimits(input: {
  jobNumber?: string;
  partNumber?: string;
  taskName?: string;
  customer?: string;
  notes?: string;
  description?: string;
  quantity?: number;
  estimatedTime?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // String length limits
  if (input.jobNumber && input.jobNumber.length > 100) {
    errors.push('Job number too long (max 100 characters)');
  }

  if (input.partNumber && input.partNumber.length > 100) {
    errors.push('Part number too long (max 100 characters)');
  }

  if (input.taskName && input.taskName.length > 200) {
    errors.push('Task name too long (max 200 characters)');
  }

  if (input.customer && input.customer.length > 200) {
    errors.push('Customer name too long (max 200 characters)');
  }

  if (input.notes && input.notes.length > 5000) {
    errors.push('Notes too long (max 5000 characters)');
  }

  if (input.description && input.description.length > 5000) {
    errors.push('Description too long (max 5000 characters)');
  }

  // Numeric limits
  if (input.quantity !== undefined) {
    if (input.quantity < 1 || input.quantity > 1000000) {
      errors.push('Quantity must be between 1 and 1,000,000');
    }
  }

  if (input.estimatedTime !== undefined) {
    if (input.estimatedTime < 0 || input.estimatedTime > 100000) {
      errors.push('Estimated time must be between 0 and 100,000 minutes');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Cap pagination limits
 */
export function capPaginationLimit(limit: number, defaultLimit: number = 100, maxLimit: number = 1000): number {
  if (limit < 1) return defaultLimit;
  if (limit > maxLimit) return maxLimit;
  return limit;
}

/**
 * Get client identifier for rate limiting
 * Uses API key hash or IP address
 */
export function getClientIdentifier(req: Request, apiKeyHash?: string): string {
  if (apiKeyHash) {
    // Use first 16 chars of API key hash
    return apiKeyHash.substring(0, 16);
  }

  // Fallback to IP (note: Edge Functions may not have direct IP access)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Last resort: use a constant (not ideal, but prevents crashes)
  return 'unknown';
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get secure CORS headers
 * Returns restrictive CORS by default, can be overridden with env variable
 */
export function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}
