export interface IssueLocationCandidate {
  cell_id: string | null;
  sequence: number;
  status: string;
}

export interface IssueLocationContextInput {
  operationCellId: string | null;
  partCurrentCellId: string | null;
  operationSequence: number;
  nextOperations: IssueLocationCandidate[];
}

export interface IssueAttachmentUploadResult {
  uploadedPaths: string[];
  failedFiles: string[];
}

interface StorageUploadError {
  message: string;
}

interface StorageBucketClient {
  upload: (
    path: string,
    file: File,
  ) => Promise<{ error: StorageUploadError | null }>;
}

interface StorageClient {
  from: (bucket: string) => StorageBucketClient;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function deriveIssueLocationContext({
  operationCellId,
  partCurrentCellId,
  operationSequence,
  nextOperations,
}: IssueLocationContextInput) {
  const currentCellId = partCurrentCellId ?? operationCellId ?? null;
  const intendedNextCellId =
    nextOperations
      .filter(
        (operation) =>
          operation.sequence > operationSequence &&
          operation.status !== "completed" &&
          operation.cell_id,
      )
      .sort((left, right) => left.sequence - right.sequence)[0]?.cell_id ?? null;

  return {
    currentCellId,
    intendedNextCellId,
  };
}

export async function uploadIssueAttachments({
  storage,
  tenantId,
  issueId,
  files,
}: {
  storage: StorageClient;
  tenantId: string;
  issueId: string;
  files: FileList | null;
}): Promise<IssueAttachmentUploadResult> {
  const uploadedPaths: string[] = [];
  const failedFiles: string[] = [];

  if (!files || files.length === 0) {
    return { uploadedPaths, failedFiles };
  }

  for (const [index, file] of Array.from(files).entries()) {
    const path = [
      tenantId,
      "issues",
      issueId,
      `${Date.now()}-${index}-${sanitizeFileName(file.name)}`,
    ].join("/");

    const { error } = await storage.from("issues").upload(path, file);

    if (error) {
      failedFiles.push(file.name);
      continue;
    }

    uploadedPaths.push(path);
  }

  return { uploadedPaths, failedFiles };
}
