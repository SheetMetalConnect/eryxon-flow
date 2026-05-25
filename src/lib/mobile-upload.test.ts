import { describe, expect, it } from "vitest";
import { buildIssueImagePath, sanitizeUploadFileName } from "./mobile-upload";

describe("sanitizeUploadFileName", () => {
  it("strips path separators, keeping just the basename", () => {
    expect(sanitizeUploadFileName("/var/tmp/IMG_0001.HEIC")).toBe("IMG_0001.HEIC");
    expect(sanitizeUploadFileName("C:\\photos\\image.jpg")).toBe("image.jpg");
  });

  it("replaces awkward characters with underscores", () => {
    expect(sanitizeUploadFileName("my photo (2).jpg")).toBe("my_photo_2_.jpg");
  });

  it("falls back to a stable name when nothing usable remains", () => {
    expect(sanitizeUploadFileName("")).toBe("photo");
    expect(sanitizeUploadFileName("///")).toBe("photo");
  });
});

describe("buildIssueImagePath", () => {
  it("scopes the object under tenant/issues/<issueId>", () => {
    const path = buildIssueImagePath("tenant-1", "issue-9", "image.jpg", "uid-a");
    expect(path).toBe("tenant-1/issues/issue-9/uid-a-image.jpg");
  });

  it("keeps repeated camera filenames collision-proof", () => {
    // Two photos snapped in one session both named `image.jpg` — the classic
    // multi-photo failure this guards against.
    const first = buildIssueImagePath("t", "i", "image.jpg", "uid-1");
    const second = buildIssueImagePath("t", "i", "image.jpg", "uid-2");
    expect(first).not.toBe(second);
    expect(first.endsWith("image.jpg")).toBe(true);
    expect(second.endsWith("image.jpg")).toBe(true);
  });
});
