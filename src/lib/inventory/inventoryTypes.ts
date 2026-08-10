export type InventorySurface = "serrated" | "smooth" | "unknown";
export type InventoryFinish =
  | "bare"
  | "unpainted"
  | "galvanized"
  | "painted_black"
  | "unknown";
export type InventoryMaterial =
  | "carbon_steel"
  | "aluminum"
  | "stainless"
  | "unknown";
export type InventoryKind = "bar_grating" | "tread" | "other";

export interface InventoryItem {
  id: string;
  tenant_id: string;
  sku: string;
  source_item_no: string | null;
  category: string | null;
  kind: InventoryKind;
  raw_description: string;
  bar_depth_in: number | null;
  bar_thickness_in: number | null;
  designation: string | null;
  surface: InventorySurface;
  finish: InventoryFinish;
  material: InventoryMaterial;
  panel_width_in: number | null;
  panel_length_in: number | null;
  area_sqft: number | null;
  qty_on_hand: number;
  qty_reserved: number;
  needs_reconciliation: boolean;
  parse_confidence: string | null;
  created_at?: string;
  updated_at?: string;
}

export function qtyAvailable(item: Pick<InventoryItem, "qty_on_hand" | "qty_reserved">): number {
  return Number(item.qty_on_hand) - Number(item.qty_reserved);
}

export function formatMaterial(m: InventoryMaterial): string {
  switch (m) {
    case "carbon_steel":
      return "Carbon Steel";
    case "aluminum":
      return "Aluminum";
    case "stainless":
      return "Stainless";
    default:
      return "Unknown";
  }
}

export function formatSurface(s: InventorySurface): string {
  if (s === "serrated") return "Serrated";
  if (s === "smooth") return "Smooth";
  return "Unknown";
}

export function formatFinish(f: InventoryFinish): string {
  switch (f) {
    case "bare":
      return "Bare";
    case "unpainted":
      return "Unpainted";
    case "galvanized":
      return "Galvanized";
    case "painted_black":
      return "Painted Black";
    default:
      return "Unknown";
  }
}
