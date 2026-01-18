/**
 * Flexible Metadata Type System
 *
 * Defines well-known metadata structures for jobs, parts, operations, and resources.
 * Each type can be extended with custom fields while maintaining type safety.
 */

// ============================================================================
// Base Metadata Types
// ============================================================================

export type MetadataValue = string | number | boolean | null | MetadataValue[] | { [key: string]: MetadataValue };

export interface BaseMetadata {
  [key: string]: MetadataValue;
}

// ============================================================================
// Resource-Specific Metadata
// ============================================================================

export interface MoldMetadata extends BaseMetadata {
  moldId?: string;
  moldName?: string;
  cavities?: number;
  tonnage?: number;
  setupTime?: number; // minutes
  cycleTime?: number; // seconds
  material?: string;
  temperature?: number;
  pressure?: number;
  notes?: string;
}

export interface ToolingMetadata extends BaseMetadata {
  toolId?: string;
  toolName?: string;
  toolType?: 'punch' | 'die' | 'cutting' | 'forming' | 'welding' | 'other';
  diameter?: number;
  length?: number;
  material?: string;
  coatingType?: string;
  setupTime?: number; // minutes
  lifeExpectancy?: number; // uses
  currentUses?: number;
  maintenanceDue?: string; // ISO date
  notes?: string;
}

export interface FixtureMetadata extends BaseMetadata {
  fixtureId?: string;
  fixtureName?: string;
  fixtureType?: 'welding' | 'assembly' | 'inspection' | 'machining' | 'other';
  capacity?: number;
  setupTime?: number; // minutes
  calibrationDue?: string; // ISO date
  location?: string;
  notes?: string;
}

export interface MaterialMetadata extends BaseMetadata {
  materialType?: string;
  grade?: string;
  thickness?: string;
  width?: number;
  length?: number;
  weight?: number;
  finish?: string;
  supplier?: string;
  lotNumber?: string;
  certifications?: string[];
  notes?: string;
}

// ============================================================================
// Process-Specific Metadata
// ============================================================================

export interface BendSequenceMetadata extends BaseMetadata {
  bendCount?: number;
  bends?: Array<{
    sequence: number;
    angle: number;
    radius: number;
    length?: number;
    direction?: 'up' | 'down';
    tooling?: string;
    notes?: string;
  }>;
  material?: string;
  thickness?: string;
  bendAllowance?: number;
  springBack?: number;
  notes?: string;
}

export interface WeldingMetadata extends BaseMetadata {
  weldType?: 'MIG' | 'TIG' | 'Stick' | 'Spot' | 'Other';
  material?: string;
  thickness?: string;
  amperage?: number;
  voltage?: number;
  wireSpeed?: number;
  shieldingGas?: string;
  gasFlowRate?: number;
  travelSpeed?: number;
  preHeat?: number; // temperature
  postHeat?: number; // temperature
  weldSequence?: string[];
  inspectionRequired?: boolean;
  notes?: string;
}

export interface MachineSettingsMetadata extends BaseMetadata {
  machineId?: string;
  machineName?: string;
  program?: string;
  feedRate?: number;
  spindleSpeed?: number;
  cutDepth?: number;
  coolant?: boolean;
  toolChanges?: number;
  setupTime?: number; // minutes
  cycleTime?: number; // minutes
  notes?: string;
}

export interface LaserCuttingMetadata extends BaseMetadata {
  material?: string;
  thickness?: string;
  power?: number; // watts
  speed?: number; // mm/min
  frequency?: number; // Hz
  gasType?: string;
  gasPressure?: number;
  focusHeight?: number;
  pierceTime?: number; // seconds
  program?: string;
  nestingEfficiency?: number; // percentage
  notes?: string;
}

export interface AssemblyMetadata extends BaseMetadata {
  assemblyName?: string;
  componentCount?: number;
  components?: Array<{
    partNumber: string;
    quantity: number;
    position?: string;
  }>;
  assemblySequence?: string[];
  fasteners?: Array<{
    type: string;
    size: string;
    quantity: number;
    torque?: number;
  }>;
  adhesives?: string[];
  cureTime?: number; // minutes
  inspectionPoints?: string[];
  notes?: string;
}

export interface InspectionMetadata extends BaseMetadata {
  inspectionType?: 'visual' | 'dimensional' | 'functional' | 'CMM' | 'other';
  checkpoints?: Array<{
    name: string;
    specification: string;
    tolerance?: string;
    method?: string;
  }>;
  equipment?: string[];
  acceptanceCriteria?: string;
  samplingPlan?: string;
  frequency?: string;
  notes?: string;
}

// ============================================================================
// Job & Part Metadata
// ============================================================================

export interface JobMetadata extends BaseMetadata {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  customerPO?: string;
  projectName?: string;
  shippingMethod?: string;
  packingInstructions?: string;
  qualityLevel?: 'standard' | 'aerospace' | 'medical' | 'military';
  certificationRequired?: boolean;
  specialInstructions?: string;
  // Can include any of the above metadata types
}

export interface PartMetadata extends BaseMetadata {
  dimensions?: string;
  weight?: number;
  volume?: number;
  surfaceArea?: number;
  revision?: string;
  drawingNumber?: string;
  material?: string;
  finish?: string;
  color?: string;
  tolerance?: string;
  // Can include any process-specific metadata
  bendSequence?: BendSequenceMetadata;
  welding?: WeldingMetadata;
  machineSettings?: MachineSettingsMetadata;
  laserCutting?: LaserCuttingMetadata;
  assembly?: AssemblyMetadata;
  inspection?: InspectionMetadata;
}

export interface OperationMetadata extends BaseMetadata {
  // Process-specific settings
  bendSequence?: BendSequenceMetadata;
  welding?: WeldingMetadata;
  machineSettings?: MachineSettingsMetadata;
  laserCutting?: LaserCuttingMetadata;
  assembly?: AssemblyMetadata;
  inspection?: InspectionMetadata;
  // General operation metadata
  setupInstructions?: string;
  safetyNotes?: string;
  qualityChecks?: string[];
  commonIssues?: string[];
  tipsTricks?: string;
}

// ============================================================================
// Metadata Templates
// ============================================================================

export interface MetadataTemplate {
  id: string;
  name: string;
  description: string;
  category: 'job' | 'part' | 'operation' | 'resource';
  resourceType?: 'tooling' | 'fixture' | 'mold' | 'material' | 'other';
  processType?: 'bending' | 'welding' | 'machining' | 'laser' | 'assembly' | 'inspection' | 'other';
  fields: MetadataFieldDefinition[];
  defaultValues?: BaseMetadata;
}

export interface MetadataFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'time' | 'textarea' | 'array';
  required?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  helpText?: string;
  unit?: string;
  min?: number;
  max?: number;
  defaultValue?: MetadataValue;
  validation?: {
    pattern?: string;
    message?: string;
  };
}

// ============================================================================
// Pre-defined Templates
// ============================================================================

export const METADATA_TEMPLATES: MetadataTemplate[] = [
  // Resource Templates
  {
    id: 'mold-template',
    name: 'Mold',
    description: 'Template for mold resources',
    category: 'resource',
    resourceType: 'mold',
    fields: [
      { key: 'moldId', label: 'Mold ID', type: 'text', required: true },
      { key: 'moldName', label: 'Mold Name', type: 'text', required: true },
      { key: 'cavities', label: 'Number of Cavities', type: 'number', min: 1 },
      { key: 'tonnage', label: 'Tonnage Required', type: 'number', unit: 'tons' },
      { key: 'setupTime', label: 'Setup Time', type: 'number', unit: 'minutes' },
      { key: 'cycleTime', label: 'Cycle Time', type: 'number', unit: 'seconds' },
      { key: 'temperature', label: 'Operating Temperature', type: 'number', unit: '°C' },
      { key: 'pressure', label: 'Operating Pressure', type: 'number', unit: 'PSI' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'tooling-template',
    name: 'Tooling',
    description: 'Template for tooling resources',
    category: 'resource',
    resourceType: 'tooling',
    fields: [
      { key: 'toolId', label: 'Tool ID', type: 'text', required: true },
      { key: 'toolName', label: 'Tool Name', type: 'text', required: true },
      {
        key: 'toolType',
        label: 'Tool Type',
        type: 'select',
        options: [
          { value: 'punch', label: 'Punch' },
          { value: 'die', label: 'Die' },
          { value: 'cutting', label: 'Cutting' },
          { value: 'forming', label: 'Forming' },
          { value: 'welding', label: 'Welding' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'diameter', label: 'Diameter', type: 'number', unit: 'mm' },
      { key: 'length', label: 'Length', type: 'number', unit: 'mm' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'setupTime', label: 'Setup Time', type: 'number', unit: 'minutes' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'fixture-template',
    name: 'Fixture',
    description: 'Template for fixture resources',
    category: 'resource',
    resourceType: 'fixture',
    fields: [
      { key: 'fixtureId', label: 'Fixture ID', type: 'text', required: true },
      { key: 'fixtureName', label: 'Fixture Name', type: 'text', required: true },
      {
        key: 'fixtureType',
        label: 'Fixture Type',
        type: 'select',
        options: [
          { value: 'welding', label: 'Welding' },
          { value: 'assembly', label: 'Assembly' },
          { value: 'inspection', label: 'Inspection' },
          { value: 'machining', label: 'Machining' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'setupTime', label: 'Setup Time', type: 'number', unit: 'minutes' },
      { key: 'calibrationDue', label: 'Calibration Due Date', type: 'date' },
      { key: 'location', label: 'Storage Location', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'material-template',
    name: 'Material',
    description: 'Template for material resources',
    category: 'resource',
    resourceType: 'material',
    fields: [
      { key: 'materialType', label: 'Material Type', type: 'text', required: true },
      { key: 'grade', label: 'Grade/Specification', type: 'text' },
      { key: 'thickness', label: 'Thickness', type: 'text' },
      { key: 'width', label: 'Width', type: 'number', unit: 'mm' },
      { key: 'length', label: 'Length', type: 'number', unit: 'mm' },
      { key: 'weight', label: 'Weight', type: 'number', unit: 'kg' },
      { key: 'finish', label: 'Finish', type: 'text' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'lotNumber', label: 'Lot Number', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },

  // Process Templates
  {
    id: 'bend-sequence-template',
    name: 'Bend Sequence',
    description: 'Template for sheet metal bending operations',
    category: 'operation',
    processType: 'bending',
    fields: [
      { key: 'bendCount', label: 'Number of Bends', type: 'number', required: true, min: 1 },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'thickness', label: 'Material Thickness', type: 'text' },
      { key: 'bendAllowance', label: 'Bend Allowance', type: 'number', unit: 'mm' },
      { key: 'springBack', label: 'Spring Back Factor', type: 'number' },
      { key: 'notes', label: 'Special Instructions', type: 'textarea' },
    ],
  },
  {
    id: 'welding-template',
    name: 'Welding Parameters',
    description: 'Template for welding operations',
    category: 'operation',
    processType: 'welding',
    fields: [
      {
        key: 'weldType',
        label: 'Weld Type',
        type: 'select',
        required: true,
        options: [
          { value: 'MIG', label: 'MIG' },
          { value: 'TIG', label: 'TIG' },
          { value: 'Stick', label: 'Stick' },
          { value: 'Spot', label: 'Spot' },
          { value: 'Other', label: 'Other' },
        ],
      },
      { key: 'material', label: 'Base Material', type: 'text' },
      { key: 'thickness', label: 'Material Thickness', type: 'text' },
      { key: 'amperage', label: 'Amperage', type: 'number', unit: 'A' },
      { key: 'voltage', label: 'Voltage', type: 'number', unit: 'V' },
      { key: 'wireSpeed', label: 'Wire Feed Speed', type: 'number', unit: 'IPM' },
      { key: 'shieldingGas', label: 'Shielding Gas', type: 'text' },
      { key: 'gasFlowRate', label: 'Gas Flow Rate', type: 'number', unit: 'CFH' },
      { key: 'preHeat', label: 'Preheat Temperature', type: 'number', unit: '°F' },
      { key: 'inspectionRequired', label: 'Inspection Required', type: 'boolean' },
      { key: 'notes', label: 'Special Instructions', type: 'textarea' },
    ],
  },
  {
    id: 'laser-cutting-template',
    name: 'Laser Cutting',
    description: 'Template for laser cutting operations',
    category: 'operation',
    processType: 'laser',
    fields: [
      { key: 'material', label: 'Material', type: 'text', required: true },
      { key: 'thickness', label: 'Thickness', type: 'text', required: true },
      { key: 'power', label: 'Laser Power', type: 'number', unit: 'W' },
      { key: 'speed', label: 'Cutting Speed', type: 'number', unit: 'mm/min' },
      { key: 'frequency', label: 'Frequency', type: 'number', unit: 'Hz' },
      { key: 'gasType', label: 'Assist Gas', type: 'text' },
      { key: 'gasPressure', label: 'Gas Pressure', type: 'number', unit: 'PSI' },
      { key: 'focusHeight', label: 'Focus Height', type: 'number', unit: 'mm' },
      { key: 'program', label: 'NC Program', type: 'text' },
      { key: 'notes', label: 'Special Instructions', type: 'textarea' },
    ],
  },
  {
    id: 'machining-template',
    name: 'Machining Settings',
    description: 'Template for CNC machining operations',
    category: 'operation',
    processType: 'machining',
    fields: [
      { key: 'machineId', label: 'Machine ID', type: 'text' },
      { key: 'program', label: 'NC Program', type: 'text', required: true },
      { key: 'feedRate', label: 'Feed Rate', type: 'number', unit: 'mm/min' },
      { key: 'spindleSpeed', label: 'Spindle Speed', type: 'number', unit: 'RPM' },
      { key: 'cutDepth', label: 'Depth of Cut', type: 'number', unit: 'mm' },
      { key: 'coolant', label: 'Coolant Required', type: 'boolean' },
      { key: 'setupTime', label: 'Setup Time', type: 'number', unit: 'minutes' },
      { key: 'cycleTime', label: 'Cycle Time', type: 'number', unit: 'minutes' },
      { key: 'notes', label: 'Special Instructions', type: 'textarea' },
    ],
  },
  {
    id: 'assembly-template',
    name: 'Assembly Instructions',
    description: 'Template for assembly operations',
    category: 'operation',
    processType: 'assembly',
    fields: [
      { key: 'assemblyName', label: 'Assembly Name', type: 'text', required: true },
      { key: 'componentCount', label: 'Number of Components', type: 'number', min: 1 },
      { key: 'cureTime', label: 'Cure/Set Time', type: 'number', unit: 'minutes' },
      { key: 'notes', label: 'Assembly Instructions', type: 'textarea', required: true },
    ],
  },
  {
    id: 'inspection-template',
    name: 'Inspection Requirements',
    description: 'Template for inspection operations',
    category: 'operation',
    processType: 'inspection',
    fields: [
      {
        key: 'inspectionType',
        label: 'Inspection Type',
        type: 'select',
        required: true,
        options: [
          { value: 'visual', label: 'Visual' },
          { value: 'dimensional', label: 'Dimensional' },
          { value: 'functional', label: 'Functional' },
          { value: 'CMM', label: 'CMM' },
          { value: 'other', label: 'Other' },
        ],
      },
      { key: 'acceptanceCriteria', label: 'Acceptance Criteria', type: 'textarea', required: true },
      { key: 'samplingPlan', label: 'Sampling Plan', type: 'text' },
      { key: 'frequency', label: 'Inspection Frequency', type: 'text' },
      { key: 'notes', label: 'Special Instructions', type: 'textarea' },
    ],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): MetadataTemplate | undefined {
  return METADATA_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: MetadataTemplate['category']): MetadataTemplate[] {
  return METADATA_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by resource type
 */
export function getTemplatesByResourceType(resourceType: string): MetadataTemplate[] {
  return METADATA_TEMPLATES.filter(t => t.resourceType === resourceType);
}

/**
 * Get templates by process type
 */
export function getTemplatesByProcessType(processType: string): MetadataTemplate[] {
  return METADATA_TEMPLATES.filter(t => t.processType === processType);
}

/**
 * Detect metadata type from structure
 */
export function detectMetadataType(metadata: BaseMetadata): string | null {
  if (!metadata || typeof metadata !== 'object') return null;

  const keys = Object.keys(metadata);

  // Check for mold indicators
  if (keys.includes('moldId') || keys.includes('moldName') || keys.includes('cavities')) {
    return 'mold';
  }

  // Check for tooling indicators
  if (keys.includes('toolId') || keys.includes('toolName') || keys.includes('toolType')) {
    return 'tooling';
  }

  // Check for fixture indicators
  if (keys.includes('fixtureId') || keys.includes('fixtureName') || keys.includes('fixtureType')) {
    return 'fixture';
  }

  // Check for material indicators
  if (keys.includes('materialType') || (keys.includes('grade') && keys.includes('thickness'))) {
    return 'material';
  }

  // Check for bend sequence indicators
  if (keys.includes('bendCount') || keys.includes('bends') || keys.includes('bendAllowance')) {
    return 'bend-sequence';
  }

  // Check for welding indicators
  if (keys.includes('weldType') || keys.includes('amperage') || keys.includes('shieldingGas')) {
    return 'welding';
  }

  // Check for laser cutting indicators
  if (keys.includes('power') && keys.includes('speed') && (keys.includes('gasType') || keys.includes('focusHeight'))) {
    return 'laser-cutting';
  }

  // Check for machining indicators
  if ((keys.includes('feedRate') && keys.includes('spindleSpeed')) || keys.includes('program')) {
    return 'machining';
  }

  // Check for assembly indicators
  if (keys.includes('assemblyName') || keys.includes('componentCount') || keys.includes('assemblySequence')) {
    return 'assembly';
  }

  // Check for inspection indicators
  if (keys.includes('inspectionType') || keys.includes('checkpoints') || keys.includes('acceptanceCriteria')) {
    return 'inspection';
  }

  return null;
}

/**
 * Get icon for metadata type
 */
export function getMetadataIcon(type: string | null): string {
  switch (type) {
    case 'mold': return 'Package';
    case 'tooling': return 'Wrench';
    case 'fixture': return 'Settings';
    case 'material': return 'Layers';
    case 'bend-sequence': return 'Maximize2';
    case 'welding': return 'Flame';
    case 'laser-cutting': return 'Zap';
    case 'machining': return 'Settings';
    case 'assembly': return 'GitMerge';
    case 'inspection': return 'Eye';
    default: return 'FileText';
  }
}

/**
 * Get label for metadata type
 */
export function getMetadataLabel(type: string | null): string {
  switch (type) {
    case 'mold': return 'Mold';
    case 'tooling': return 'Tooling';
    case 'fixture': return 'Fixture';
    case 'material': return 'Material';
    case 'bend-sequence': return 'Bend Sequence';
    case 'welding': return 'Welding Parameters';
    case 'laser-cutting': return 'Laser Cutting';
    case 'machining': return 'Machine Settings';
    case 'assembly': return 'Assembly Instructions';
    case 'inspection': return 'Inspection Requirements';
    default: return 'Custom Fields';
  }
}
