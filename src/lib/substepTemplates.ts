// Predefined substep templates for typical metalworking operations
// These help SMB shops quickly set up standard workflows

export interface SubstepTemplate {
  name: string;
  notes?: string;
}

export const SUBSTEP_TEMPLATES: Record<string, SubstepTemplate[]> = {
  cutting: [
    { name: "Review cutting plan and material specs", notes: "Check drawing dimensions" },
    { name: "Prepare material and verify quantity", notes: "Count pieces and check material grade" },
    { name: "Set up cutting equipment", notes: "Verify blade condition and parameters" },
    { name: "Perform first article inspection", notes: "Measure first piece before production run" },
    { name: "Execute cutting operation" },
    { name: "Quality check and deburr", notes: "Check dimensions and remove sharp edges" },
    { name: "Sign off and move to next cell" },
  ],
  bending: [
    { name: "Review bend angles and sequence", notes: "Check drawing for bend order" },
    { name: "Select and verify tooling", notes: "Confirm correct dies and punches" },
    { name: "Set up press brake parameters", notes: "Set tonnage, back gauge, and angle" },
    { name: "Test bend on scrap material", notes: "Verify angles before production" },
    { name: "Execute bending operation" },
    { name: "Inspect bend angles and dimensions", notes: "Use protractor or CMM" },
    { name: "Sign off completion" },
  ],
  welding: [
    { name: "Review welding procedure and specifications", notes: "Check WPS and joint requirements" },
    { name: "Prepare joint surfaces", notes: "Clean and fit-up parts" },
    { name: "Set up welding equipment", notes: "Check settings, wire, and gas" },
    { name: "Tack weld and verify alignment", notes: "Check fit before final welding" },
    { name: "Execute welding operation" },
    { name: "Visual inspection of welds", notes: "Check for defects, undercut, porosity" },
    { name: "Post-weld cleanup", notes: "Remove slag and spatter" },
    { name: "Sign off and document" },
  ],
  machining: [
    { name: "Review machining program and drawings" },
    { name: "Verify material and prepare workpiece", notes: "Check material cert if required" },
    { name: "Set up machine and load program", notes: "Select and check tooling" },
    { name: "Run first article and inspect", notes: "Measure critical dimensions" },
    { name: "Execute machining operation" },
    { name: "In-process quality checks", notes: "Check dimensions periodically" },
    { name: "Final inspection and deburr" },
    { name: "Clean and sign off" },
  ],
  finishing: [
    { name: "Review finishing specifications", notes: "Check coating type and thickness" },
    { name: "Prepare surface", notes: "Clean, degrease, and mask as needed" },
    { name: "Verify finish equipment setup", notes: "Check powder/paint supply and settings" },
    { name: "Apply finish coating" },
    { name: "Cure or dry per specifications" },
    { name: "Inspect coating quality", notes: "Check coverage, thickness, and defects" },
    { name: "Sign off completion" },
  ],
  assembly: [
    { name: "Verify all components are complete", notes: "Check component status in system" },
    { name: "Review assembly drawing and BOM", notes: "Confirm all parts and hardware" },
    { name: "Prepare assembly area and tools" },
    { name: "Fit components and check alignment" },
    { name: "Install fasteners per torque specs", notes: "Use torque wrench if specified" },
    { name: "Function test if applicable", notes: "Check moving parts and alignment" },
    { name: "Final inspection and sign off" },
  ],
  inspection: [
    { name: "Gather inspection documents", notes: "Get drawings, specs, and inspection plan" },
    { name: "Prepare measurement equipment", notes: "Verify calibration dates" },
    { name: "Measure critical dimensions", notes: "Record measurements" },
    { name: "Visual inspection for defects" },
    { name: "Document results and photos", notes: "Take photos of any issues" },
    { name: "Sign off inspection report" },
  ],
  packaging: [
    { name: "Verify quantity matches order", notes: "Count and verify against job" },
    { name: "Final quality check before packing" },
    { name: "Prepare packaging materials" },
    { name: "Pack parts with protection", notes: "Use foam, bubble wrap, or separators" },
    { name: "Label packages with job and part info" },
    { name: "Update inventory and mark complete" },
    { name: "Sign off and ready for shipment" },
  ],
  general: [
    { name: "Prepare materials and tools" },
    { name: "Review work instructions" },
    { name: "Perform operation" },
    { name: "Quality check" },
    { name: "Sign off completion" },
  ],
};

// Helper function to get template by operation name
export function getSubstepTemplate(operationName: string): SubstepTemplate[] {
  const normalizedName = operationName.toLowerCase();

  // Try to find a matching template
  for (const [key, template] of Object.entries(SUBSTEP_TEMPLATES)) {
    if (normalizedName.includes(key)) {
      return template;
    }
  }

  // Return general template if no match found
  return SUBSTEP_TEMPLATES.general;
}

// Get all available template categories
export function getTemplateCategories(): string[] {
  return Object.keys(SUBSTEP_TEMPLATES);
}
