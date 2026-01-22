import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Wrench,
  Settings,
  Layers,
  Maximize2,
  Flame,
  Zap,
  GitMerge,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  BaseMetadata,
  detectMetadataType,
  getMetadataLabel,
  MoldMetadata,
  ToolingMetadata,
  FixtureMetadata,
  MaterialMetadata,
  BendSequenceMetadata,
  WeldingMetadata,
  LaserCuttingMetadata,
  MachineSettingsMetadata,
  AssemblyMetadata,
  InspectionMetadata,
} from '@/types/metadata';

interface EnhancedMetadataDisplayProps {
  metadata: BaseMetadata | null | undefined;
  title?: string;
  compact?: boolean;
  showTypeIndicator?: boolean;
}

export function EnhancedMetadataDisplay({
  metadata,
  title,
  compact = false,
  showTypeIndicator = true,
}: EnhancedMetadataDisplayProps) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const metadataType = detectMetadataType(metadata);
  const displayTitle = title || getMetadataLabel(metadataType);

  // Get icon based on type
  const getIcon = () => {
    switch (metadataType) {
      case 'mold': return <Package className="h-5 w-5" />;
      case 'tooling': return <Wrench className="h-5 w-5" />;
      case 'fixture': return <Settings className="h-5 w-5" />;
      case 'material': return <Layers className="h-5 w-5" />;
      case 'bend-sequence': return <Maximize2 className="h-5 w-5" />;
      case 'welding': return <Flame className="h-5 w-5" />;
      case 'laser-cutting': return <Zap className="h-5 w-5" />;
      case 'machining': return <Settings className="h-5 w-5" />;
      case 'assembly': return <GitMerge className="h-5 w-5" />;
      case 'inspection': return <Eye className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  // Render specialized view based on type
  const renderContent = () => {
    switch (metadataType) {
      case 'mold':
        return <MoldMetadataView metadata={metadata as MoldMetadata} compact={compact} />;
      case 'tooling':
        return <ToolingMetadataView metadata={metadata as ToolingMetadata} compact={compact} />;
      case 'fixture':
        return <FixtureMetadataView metadata={metadata as FixtureMetadata} compact={compact} />;
      case 'material':
        return <MaterialMetadataView metadata={metadata as MaterialMetadata} compact={compact} />;
      case 'bend-sequence':
        return <BendSequenceMetadataView metadata={metadata as BendSequenceMetadata} compact={compact} />;
      case 'welding':
        return <WeldingMetadataView metadata={metadata as WeldingMetadata} compact={compact} />;
      case 'laser-cutting':
        return <LaserCuttingMetadataView metadata={metadata as LaserCuttingMetadata} compact={compact} />;
      case 'machining':
        return <MachineSettingsMetadataView metadata={metadata as MachineSettingsMetadata} compact={compact} />;
      case 'assembly':
        return <AssemblyMetadataView metadata={metadata as AssemblyMetadata} compact={compact} />;
      case 'inspection':
        return <InspectionMetadataView metadata={metadata as InspectionMetadata} compact={compact} />;
      default:
        return <GenericMetadataView metadata={metadata} compact={compact} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getIcon()}
          {displayTitle}
          {showTypeIndicator && metadataType && (
            <Badge variant="secondary" className="ml-auto">
              {metadataType}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

// Generic metadata view (fallback)
function GenericMetadataView({ metadata, compact }: { metadata: BaseMetadata; compact: boolean }) {
  return (
    <div className={compact ? 'space-y-1 text-sm' : 'grid grid-cols-2 gap-3'}>
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className={compact ? '' : 'space-y-1'}>
          <div className="text-sm font-medium text-muted-foreground">
            {formatKey(key)}
          </div>
          <div className={compact ? 'text-xs' : 'text-sm'}>
            {formatValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Mold metadata view
function MoldMetadataView({ metadata, compact }: { metadata: MoldMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.moldId && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Mold ID:</span>
          <Badge variant="outline">{metadata.moldId}</Badge>
        </div>
      )}
      {metadata.moldName && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Name:</span>
          <span className="text-sm">{metadata.moldName}</span>
        </div>
      )}
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.cavities && <MetadataField label="Cavities" value={metadata.cavities} />}
        {metadata.tonnage && <MetadataField label="Tonnage" value={`${metadata.tonnage} tons`} />}
        {metadata.setupTime && <MetadataField label="Setup Time" value={`${metadata.setupTime} min`} />}
        {metadata.cycleTime && <MetadataField label="Cycle Time" value={`${metadata.cycleTime} sec`} />}
        {metadata.temperature && <MetadataField label="Temperature" value={`${metadata.temperature}°C`} />}
        {metadata.pressure && <MetadataField label="Pressure" value={`${metadata.pressure} PSI`} />}
      </div>
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Notes:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Tooling metadata view
function ToolingMetadataView({ metadata, compact }: { metadata: ToolingMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.toolId && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Tool ID:</span>
          <Badge variant="outline">{metadata.toolId}</Badge>
        </div>
      )}
      {metadata.toolName && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Name:</span>
          <span className="text-sm">{metadata.toolName}</span>
        </div>
      )}
      {metadata.toolType && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Type:</span>
          <Badge>{metadata.toolType}</Badge>
        </div>
      )}
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.diameter && <MetadataField label="Diameter" value={`${metadata.diameter} mm`} />}
        {metadata.length && <MetadataField label="Length" value={`${metadata.length} mm`} />}
        {metadata.material && <MetadataField label="Material" value={metadata.material} />}
        {metadata.setupTime && <MetadataField label="Setup Time" value={`${metadata.setupTime} min`} />}
      </div>
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Notes:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Fixture metadata view
function FixtureMetadataView({ metadata, compact }: { metadata: FixtureMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.fixtureId && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Fixture ID:</span>
          <Badge variant="outline">{metadata.fixtureId}</Badge>
        </div>
      )}
      {metadata.fixtureName && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Name:</span>
          <span className="text-sm">{metadata.fixtureName}</span>
        </div>
      )}
      {metadata.fixtureType && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Type:</span>
          <Badge>{metadata.fixtureType}</Badge>
        </div>
      )}
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.setupTime && <MetadataField label="Setup Time" value={`${metadata.setupTime} min`} />}
        {metadata.location && <MetadataField label="Location" value={metadata.location} />}
        {metadata.calibrationDue && <MetadataField label="Calibration Due" value={formatDate(metadata.calibrationDue)} />}
      </div>
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Notes:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Material metadata view
function MaterialMetadataView({ metadata, compact }: { metadata: MaterialMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.materialType && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Material:</span>
          <Badge variant="outline">{metadata.materialType}</Badge>
        </div>
      )}
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.grade && <MetadataField label="Grade" value={metadata.grade} />}
        {metadata.thickness && <MetadataField label="Thickness" value={metadata.thickness} />}
        {metadata.width && <MetadataField label="Width" value={`${metadata.width} mm`} />}
        {metadata.length && <MetadataField label="Length" value={`${metadata.length} mm`} />}
        {metadata.weight && <MetadataField label="Weight" value={`${metadata.weight} kg`} />}
        {metadata.finish && <MetadataField label="Finish" value={metadata.finish} />}
        {metadata.supplier && <MetadataField label="Supplier" value={metadata.supplier} />}
        {metadata.lotNumber && <MetadataField label="Lot Number" value={metadata.lotNumber} />}
      </div>
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Notes:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Bend sequence metadata view
function BendSequenceMetadataView({ metadata, compact }: { metadata: BendSequenceMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.bendCount && <MetadataField label="Bend Count" value={metadata.bendCount} />}
        {metadata.material && <MetadataField label="Material" value={metadata.material} />}
        {metadata.thickness && <MetadataField label="Thickness" value={metadata.thickness} />}
        {metadata.bendAllowance && <MetadataField label="Bend Allowance" value={`${metadata.bendAllowance} mm`} />}
      </div>
      {metadata.bends && metadata.bends.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-2">Bend Sequence:</div>
          <div className="space-y-2">
            {metadata.bends.map((bend, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                <Badge variant="outline">{bend.sequence}</Badge>
                <span>{bend.angle}° {bend.direction ? `(${bend.direction})` : ''}</span>
                {bend.radius && <span>R{bend.radius}</span>}
                {bend.tooling && <span className="text-muted-foreground">• {bend.tooling}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Instructions:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Welding metadata view
function WeldingMetadataView({ metadata, compact }: { metadata: WeldingMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.weldType && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Weld Type:</span>
          <Badge>{metadata.weldType}</Badge>
        </div>
      )}
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.material && <MetadataField label="Material" value={metadata.material} />}
        {metadata.thickness && <MetadataField label="Thickness" value={metadata.thickness} />}
        {metadata.amperage && <MetadataField label="Amperage" value={`${metadata.amperage} A`} />}
        {metadata.voltage && <MetadataField label="Voltage" value={`${metadata.voltage} V`} />}
        {metadata.wireSpeed && <MetadataField label="Wire Speed" value={`${metadata.wireSpeed} IPM`} />}
        {metadata.shieldingGas && <MetadataField label="Shielding Gas" value={metadata.shieldingGas} />}
        {metadata.gasFlowRate && <MetadataField label="Gas Flow" value={`${metadata.gasFlowRate} CFH`} />}
        {metadata.preHeat && <MetadataField label="Preheat" value={`${metadata.preHeat}°F`} />}
      </div>
      {metadata.inspectionRequired && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          <AlertCircle className="h-4 w-4" />
          <span>Inspection Required</span>
        </div>
      )}
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Instructions:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Laser cutting metadata view
function LaserCuttingMetadataView({ metadata, compact }: { metadata: LaserCuttingMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.material && <MetadataField label="Material" value={metadata.material} />}
        {metadata.thickness && <MetadataField label="Thickness" value={metadata.thickness} />}
        {metadata.power && <MetadataField label="Power" value={`${metadata.power} W`} />}
        {metadata.speed && <MetadataField label="Speed" value={`${metadata.speed} mm/min`} />}
        {metadata.gasType && <MetadataField label="Assist Gas" value={metadata.gasType} />}
        {metadata.gasPressure && <MetadataField label="Gas Pressure" value={`${metadata.gasPressure} PSI`} />}
        {metadata.program && <MetadataField label="NC Program" value={metadata.program} />}
      </div>
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Instructions:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Machine settings metadata view
function MachineSettingsMetadataView({ metadata, compact }: { metadata: MachineSettingsMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.machineId && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Machine ID:</span>
          <Badge variant="outline">{metadata.machineId}</Badge>
        </div>
      )}
      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {metadata.program && <MetadataField label="Program" value={metadata.program} />}
        {metadata.feedRate && <MetadataField label="Feed Rate" value={`${metadata.feedRate} mm/min`} />}
        {metadata.spindleSpeed && <MetadataField label="Spindle Speed" value={`${metadata.spindleSpeed} RPM`} />}
        {metadata.cutDepth && <MetadataField label="Cut Depth" value={`${metadata.cutDepth} mm`} />}
        {metadata.coolant !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            {metadata.coolant ? (
              <><CheckCircle className="h-4 w-4 text-green-500" /> Coolant: Yes</>
            ) : (
              <><XCircle className="h-4 w-4 text-red-500" /> Coolant: No</>
            )}
          </div>
        )}
        {metadata.setupTime && <MetadataField label="Setup Time" value={`${metadata.setupTime} min`} />}
        {metadata.cycleTime && <MetadataField label="Cycle Time" value={`${metadata.cycleTime} min`} />}
      </div>
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Instructions:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Assembly metadata view
function AssemblyMetadataView({ metadata, compact }: { metadata: AssemblyMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.assemblyName && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Assembly:</span>
          <span className="text-sm">{metadata.assemblyName}</span>
        </div>
      )}
      {metadata.componentCount && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Components:</span>
          <Badge>{metadata.componentCount}</Badge>
        </div>
      )}
      {metadata.components && metadata.components.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-2">Component List:</div>
          <div className="space-y-1">
            {metadata.components.map((comp, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                <span>{comp.partNumber}</span>
                <Badge variant="outline">Qty: {comp.quantity}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Instructions:</div>
          <div className="text-sm whitespace-pre-wrap">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Inspection metadata view
function InspectionMetadataView({ metadata, compact }: { metadata: InspectionMetadata; compact: boolean }) {
  return (
    <div className="space-y-3">
      {metadata.inspectionType && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Type:</span>
          <Badge>{metadata.inspectionType}</Badge>
        </div>
      )}
      {metadata.checkpoints && metadata.checkpoints.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-2">Checkpoints:</div>
          <div className="space-y-2">
            {metadata.checkpoints.map((cp, idx) => (
              <div key={idx} className="bg-muted p-2 rounded space-y-1">
                <div className="text-sm font-medium">{cp.name}</div>
                <div className="text-xs text-muted-foreground">{cp.specification}</div>
                {cp.tolerance && <div className="text-xs">Tolerance: {cp.tolerance}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {metadata.acceptanceCriteria && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Acceptance Criteria:</div>
          <div className="text-sm">{metadata.acceptanceCriteria}</div>
        </div>
      )}
      {metadata.notes && (
        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-1">Notes:</div>
          <div className="text-sm">{metadata.notes}</div>
        </div>
      )}
    </div>
  );
}

// Helper component for field display
function MetadataField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

// Helper functions
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}
