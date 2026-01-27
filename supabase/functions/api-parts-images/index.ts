import { serveApi } from "@shared/handler.ts";
import type { HandlerContext } from "@shared/handler.ts";
import {
  createSuccessResponse,
  handleMethodNotAllowed,
  NotFoundError,
  ValidationException,
  UnauthorizedError,
  BadRequestError,
} from "@shared/validation/errorHandler.ts";

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default serveApi(async (req: Request, ctx: HandlerContext) => {
  const { supabase, tenantId, url } = ctx;

  const pathParts = url.pathname.split("/").filter((p) => p);

    // Extract part_id from path: /api-parts-images/{part_id}/...
    const partId = pathParts[1]; // Index 0 is 'api-parts-images', 1 is part_id

    if (!partId) {
      throw new BadRequestError("Part ID is required");
    }

    // Verify part exists and belongs to tenant
    const { data: part, error: partError } = await supabase
      .from("parts")
      .select("id, tenant_id, image_paths")
      .eq("id", partId)
      .single();

    if (partError || !part) {
      throw new NotFoundError("Part not found");
    }

    if (part.tenant_id !== tenantId) {
      throw new UnauthorizedError("Access denied to this part");
    }

    // Route by HTTP method and action
    const action = pathParts[2]; // e.g., 'upload', 'url'

    switch (req.method) {
      case "GET":
        if (action === "url") {
          return await handleGetSignedUrl(req, supabase, tenantId, partId);
        }
        return await handleListImages(req, supabase, tenantId, partId, part);
      case "POST":
        if (action === "upload") {
          return await handleUploadImage(req, supabase, tenantId, partId, part);
        }
        throw new BadRequestError("Invalid action for POST");
      case "DELETE":
        return await handleDeleteImage(req, supabase, tenantId, partId, part);
      default:
        return handleMethodNotAllowed(["GET", "POST", "DELETE"]);
    }
});

/**
 * GET /api-parts-images/{part_id} - List all images for a part
 */
async function handleListImages(
  req: Request,
  supabase: any,
  tenantId: string,
  partId: string,
  part: any,
): Promise<Response> {
  const imagePaths = part.image_paths || [];

  if (imagePaths.length === 0) {
    return createSuccessResponse({ images: [] });
  }

  // Generate signed URLs for all images
  const images = await Promise.all(
    imagePaths.map(async (path: string) => {
      const { data } = await supabase.storage
        .from("parts-images")
        .createSignedUrl(path, 3600); // 1 hour expiry

      // Get file metadata
      const { data: fileData } = await supabase.storage
        .from("parts-images")
        .list(path.substring(0, path.lastIndexOf("/")), {
          search: path.substring(path.lastIndexOf("/") + 1),
        });

      const fileInfo = fileData?.[0];

      return {
        path,
        url: data?.signedUrl || null,
        size: fileInfo?.metadata?.size || 0,
        created_at: fileInfo?.created_at || null,
        name: path.substring(path.lastIndexOf("/") + 1),
      };
    }),
  );

  return createSuccessResponse({ images });
}

/**
 * POST /api-parts-images/{part_id}/upload - Upload a new image
 */
async function handleUploadImage(
  req: Request,
  supabase: any,
  tenantId: string,
  partId: string,
  part: any,
): Promise<Response> {
  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    throw new BadRequestError("No file provided or invalid file");
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new BadRequestError(
      `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    );
  }

  // Check storage quota
  const { data: quotaData } = await supabase.rpc("can_upload_file", {
    p_tenant_id: tenantId,
    p_file_size_bytes: file.size,
  });

  const quotaCheck = quotaData?.[0];
  if (!quotaCheck?.allowed) {
    throw new ValidationException(
      quotaCheck?.reason || "Storage quota exceeded",
    );
  }

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${timestamp}_${crypto.randomUUID()}.${extension}`;
  const path = `${tenantId}/parts/${partId}/${filename}`;

  // Upload to storage
  const fileBuffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("parts-images")
    .upload(path, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Update storage usage
  await supabase.rpc("update_tenant_storage_usage", {
    p_tenant_id: tenantId,
    p_size_bytes: file.size,
    p_operation: "add",
  });

  // Update part's image_paths array
  const currentPaths = part.image_paths || [];
  const updatedPaths = [...currentPaths, path];

  const { error: updateError } = await supabase
    .from("parts")
    .update({ image_paths: updatedPaths })
    .eq("id", partId);

  if (updateError) {
    // Rollback storage upload
    await supabase.storage.from("parts-images").remove([path]);
    throw new Error(`Failed to update part: ${updateError.message}`);
  }

  // Generate signed URL for response
  const { data: signedUrlData } = await supabase.storage
    .from("parts-images")
    .createSignedUrl(path, 3600);

  return createSuccessResponse({
    path,
    url: signedUrlData?.signedUrl || null,
    size: file.size,
    name: filename,
  }, 201);
}

/**
 * DELETE /api-parts-images/{part_id} - Delete an image
 */
async function handleDeleteImage(
  req: Request,
  supabase: any,
  tenantId: string,
  partId: string,
  part: any,
): Promise<Response> {
  const body = await req.json();
  const { path } = body;

  if (!path) {
    throw new BadRequestError("Image path is required");
  }

  // Verify path is in part's image_paths
  const currentPaths = part.image_paths || [];
  if (!currentPaths.includes(path)) {
    throw new NotFoundError("Image not found for this part");
  }

  // Get file size before deletion
  const pathParts = path.split("/");
  const filename = pathParts[pathParts.length - 1];
  const folderPath = pathParts.slice(0, -1).join("/");

  const { data: fileList } = await supabase.storage
    .from("parts-images")
    .list(folderPath, { search: filename });

  const fileSize = fileList?.[0]?.metadata?.size || 0;

  // Delete from storage
  const { error: deleteError } = await supabase.storage
    .from("parts-images")
    .remove([path]);

  if (deleteError) {
    throw new Error(`Failed to delete file: ${deleteError.message}`);
  }

  // Update storage usage
  if (fileSize > 0) {
    await supabase.rpc("update_tenant_storage_usage", {
      p_tenant_id: tenantId,
      p_size_bytes: fileSize,
      p_operation: "remove",
    });
  }

  // Update part's image_paths array
  const updatedPaths = currentPaths.filter((p: string) => p !== path);

  const { error: updateError } = await supabase
    .from("parts")
    .update({ image_paths: updatedPaths })
    .eq("id", partId);

  if (updateError) {
    throw new Error(`Failed to update part: ${updateError.message}`);
  }

  return createSuccessResponse({ success: true, deleted_path: path });
}

/**
 * GET /api-parts-images/{part_id}/url?path={path} - Get signed URL for an image
 */
async function handleGetSignedUrl(
  req: Request,
  supabase: any,
  tenantId: string,
  partId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");

  if (!path) {
    throw new BadRequestError("Image path is required");
  }

  // Verify part has this image
  const { data: part } = await supabase
    .from("parts")
    .select("image_paths")
    .eq("id", partId)
    .single();

  const imagePaths = part?.image_paths || [];
  if (!imagePaths.includes(path)) {
    throw new NotFoundError("Image not found for this part");
  }

  // Generate signed URL
  const { data: signedUrlData, error } = await supabase.storage
    .from("parts-images")
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return createSuccessResponse({
    url: signedUrlData?.signedUrl || null,
    expires_in: 3600,
    path,
  });
}
