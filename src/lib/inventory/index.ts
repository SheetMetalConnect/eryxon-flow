export type {
  ParsedGrating,
  StructuralRequirement,
  SectionPropertiesPerFoot,
  StructuralCheckResult,
  LoadDuty,
  LoadKind,
  GratingSurface,
  GratingMaterial,
} from "./types";

export {
  parseGratingDescription,
  bearingBarSpacingFromDesignation,
} from "./parseGratingDescription";
export type { ParseOptions } from "./parseGratingDescription";

export {
  parseImperialMeasure,
  parseLengthToken,
  panelAreaSqFt,
  formatInches,
  mmToInches,
  feetToInches,
} from "./units";

export { estimateSectionPropertiesPerFoot } from "./sectionProperties";

export {
  FB_CARBON_STEEL_PSI,
  E_STEEL_PSI,
  MATERIAL_PROPERTIES,
  getMaterialProperties,
  nextHeavyDutyCatalogDepth,
  HEAVY_DUTY_CATALOG_DEPTHS_IN,
  maxDeflectionInches,
  computeStructuralRequirement,
  checkSectionAgainstRequirement,
  evaluateInventoryCandidate,
} from "./structural";
