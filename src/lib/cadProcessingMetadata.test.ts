import { describe, expect, it } from "vitest";

import type { BoundingBox, PMIData } from "@/hooks/useCADProcessing";

import {
  buildProcessedMetadata,
  getStoredPMIForPath,
} from "./cadProcessingMetadata";

const boundingBox: BoundingBox = {
  min: [0, 0, 0],
  max: [10, 20, 30],
  center: [5, 10, 15],
  size: [10, 20, 30],
};

const pmi: PMIData = {
  version: "1.0",
  dimensions: [
    {
      id: "dim-1",
      type: "linear",
      value: 25,
      unit: "mm",
      text: "25",
      position: { x: 1, y: 2, z: 3 },
      leader_points: [],
    },
  ],
  geometric_tolerances: [],
  datums: [],
  surface_finishes: [],
  weld_symbols: [],
  notes: [],
  graphical_pmi: [],
};

describe("cadProcessingMetadata", () => {
  it("builds a durable CAD processing metadata block while preserving compatibility fields", () => {
    const metadata = buildProcessedMetadata(
      { existing: "value" },
      {
        meshes: [],
        bounding_box: boundingBox,
        total_vertices: 128,
        total_faces: 64,
      },
      pmi,
      {
        backendMode: "custom",
        fileHash: "hash-123",
        fileName: "bracket.step",
        processedAt: "2026-05-25T10:00:00.000Z",
        processingTimeMs: 4200,
        sourcePath: "tenant-1/parts/part-1/bracket.step",
      },
    );

    expect(metadata).toMatchObject({
      existing: "value",
      geometry_processed: true,
      geometry_vertices: 128,
      geometry_faces: 64,
      bounding_box: boundingBox,
      pmi,
      pmi_extracted_at: "2026-05-25T10:00:00.000Z",
      processed_at: "2026-05-25T10:00:00.000Z",
      cad_processing: {
        backend_mode: "custom",
        file_hash: "hash-123",
        file_name: "bracket.step",
        geometry_available: true,
        pmi_available: true,
        processed_at: "2026-05-25T10:00:00.000Z",
        processing_time_ms: 4200,
        source_path: "tenant-1/parts/part-1/bracket.step",
      },
    });
  });

  it("only reuses stored PMI when it matches the selected STEP path", () => {
    const metadata = buildProcessedMetadata(
      {},
      null,
      pmi,
      {
        backendMode: "custom",
        fileHash: "hash-123",
        fileName: "bracket.step",
        processedAt: "2026-05-25T10:00:00.000Z",
        processingTimeMs: 4200,
        sourcePath: "tenant-1/parts/part-1/bracket.step",
      },
    );

    expect(
      getStoredPMIForPath(metadata, "tenant-1/parts/part-1/bracket.step"),
    ).toEqual(pmi);
    expect(
      getStoredPMIForPath(metadata, "tenant-1/parts/part-1/other.step"),
    ).toBeNull();
  });
});
