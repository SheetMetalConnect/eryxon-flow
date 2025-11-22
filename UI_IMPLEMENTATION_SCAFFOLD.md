# MES Data Fields - UI Implementation Scaffold

**Status:** Backend Complete ✅ | UI Implementation Needed
**Date:** 2025-11-22

This document provides detailed implementation guides for all UI components needed to support the new MES data fields. Each section can be worked on independently in parallel.

---

## Table of Contents

1. [Component 1: Production Quantity Recording Modal](#component-1-production-quantity-recording-modal)
2. [Component 2: Scrap Reasons Management Page](#component-2-scrap-reasons-management-page)
3. [Component 3: Time Type Selector](#component-3-time-type-selector)
4. [Component 4: Material Lot Fields in Parts Form](#component-4-material-lot-fields-in-parts-form)
5. [Component 5: Operator Terminal Enhancements](#component-5-operator-terminal-enhancements)
6. [Component 6: Production Metrics Dashboard](#component-6-production-metrics-dashboard)
7. [Integration Checklist](#integration-checklist)

---

## Component 1: Production Quantity Recording Modal

**File:** `src/components/operator/ProductionQuantityModal.tsx`
**Dependencies:** None (can be worked on independently)
**Complexity:** Medium
**Estimated LOC:** ~250-300

### Purpose
Modal dialog for operators to record production quantities when completing an operation. Allows entry of produced, good, scrap, and rework quantities with validation.

### API Endpoints Used
- `POST /api-operation-quantities` - Create quantity record
- `GET /api-scrap-reasons?active=true` - Get active scrap reasons

### Props Interface
```typescript
interface ProductionQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  operationName: string;
  partNumber: string;
  plannedQuantity?: number;
  onSuccess: () => void;
}
```

### UI Layout
```
┌─────────────────────────────────────────┐
│ Record Production - [Operation Name]    │  [X]
├─────────────────────────────────────────┤
│ Part: [Part Number]                     │
│ Planned Qty: [123]                      │
│                                         │
│ Quantity Produced: [____]               │
│ • Good Parts:     [____]                │
│ • Scrap Parts:    [____]                │
│ • Rework Parts:   [____]                │
│                                         │
│ ⚠️ Total must equal produced            │
│                                         │
│ [Scrap Reason] (dropdown, if scrap > 0) │
│ ├─ MATL-001: Raw material defect        │
│ ├─ PROC-005: Bend angle out of tolerance│
│ └─ ...                                  │
│                                         │
│ Material Lot: [____] (optional)         │
│ Notes: [______________]                 │
│                                         │
│         [Cancel]  [Record Production]   │
└─────────────────────────────────────────┘
```

### Implementation Details

#### State Management
```typescript
const [formData, setFormData] = useState({
  quantity_produced: 0,
  quantity_good: 0,
  quantity_scrap: 0,
  quantity_rework: 0,
  scrap_reason_id: '',
  material_lot: '',
  notes: ''
});

const [scrapReasons, setScrapReasons] = useState<ScrapReason[]>([]);
const [isSubmitting, setIsSubmitting] = useState(false);
const [validationError, setValidationError] = useState<string | null>(null);
```

#### Validation Logic
```typescript
const validate = () => {
  const { quantity_produced, quantity_good, quantity_scrap, quantity_rework } = formData;

  // Validate sum constraint
  if (quantity_produced !== quantity_good + quantity_scrap + quantity_rework) {
    setValidationError('Produced must equal Good + Scrap + Rework');
    return false;
  }

  // Validate scrap reason required if scrap > 0
  if (quantity_scrap > 0 && !formData.scrap_reason_id) {
    setValidationError('Scrap reason is required when scrap quantity > 0');
    return false;
  }

  // Validate non-negative
  if (quantity_produced < 0 || quantity_good < 0 || quantity_scrap < 0 || quantity_rework < 0) {
    setValidationError('Quantities cannot be negative');
    return false;
  }

  setValidationError(null);
  return true;
};
```

#### Auto-calculation Feature
When user enters produced, good, and scrap, auto-calculate rework:
```typescript
useEffect(() => {
  const { quantity_produced, quantity_good, quantity_scrap } = formData;
  const calculatedRework = quantity_produced - quantity_good - quantity_scrap;

  if (calculatedRework >= 0 && calculatedRework !== formData.quantity_rework) {
    setFormData(prev => ({ ...prev, quantity_rework: calculatedRework }));
  }
}, [formData.quantity_produced, formData.quantity_good, formData.quantity_scrap]);
```

#### Submit Handler
```typescript
const handleSubmit = async () => {
  if (!validate()) return;

  setIsSubmitting(true);
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/api-operation-quantities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation_id: operationId,
        ...formData,
        recorded_at: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (data.success) {
      toast.success(`Production recorded: ${formData.quantity_good} good parts (${data.data.yield_percentage}% yield)`);
      onSuccess();
      onClose();
    } else {
      toast.error(data.error.message);
    }
  } catch (error) {
    toast.error('Failed to record production');
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Fetch Scrap Reasons on Mount
```typescript
useEffect(() => {
  if (isOpen) {
    fetchScrapReasons();
  }
}, [isOpen]);

const fetchScrapReasons = async () => {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/api-scrap-reasons?active=true`,
    {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    }
  );
  const data = await response.json();
  if (data.success) {
    setScrapReasons(data.data.scrap_reasons);
  }
};
```

### UI Components to Use
- `Dialog` from shadcn/ui for modal
- `Input` for number fields
- `Select` for scrap reason dropdown
- `Textarea` for notes
- `Button` for submit/cancel
- `Label` for form labels
- `Alert` for validation errors

### Accessibility
- Auto-focus on first input when opened
- Enter key submits form
- Escape key closes modal
- Proper ARIA labels on all inputs
- Error messages associated with inputs

### Testing Checklist
- [ ] Opens/closes properly
- [ ] Validation prevents invalid sums
- [ ] Auto-calculation works
- [ ] Scrap reasons load correctly
- [ ] Submit creates record and shows toast
- [ ] Form resets on close
- [ ] Error handling works

---

## Component 2: Scrap Reasons Management Page

**File:** `src/pages/admin/ConfigScrapReasons.tsx`
**Dependencies:** None
**Complexity:** Medium
**Estimated LOC:** ~400-500

### Purpose
Admin page for managing standardized scrap reason codes. Allows CRUD operations on scrap reasons with filtering by category.

### API Endpoints Used
- `GET /api-scrap-reasons` - List scrap reasons
- `POST /api-scrap-reasons` - Create scrap reason
- `PATCH /api-scrap-reasons?id={id}` - Update scrap reason
- `DELETE /api-scrap-reasons?id={id}` - Delete scrap reason (or soft delete via active=false)
- `POST /rest/v1/rpc/seed_default_scrap_reasons` - Seed default reasons

### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Scrap Reasons Configuration                                 │
│                                                             │
│ [+ Add Scrap Reason]  [📦 Seed Default Reasons]            │
│                                                             │
│ Filters: [Category ▼] [Search ______] [✓ Active Only]      │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Code       │ Description              │ Category  │ │   │
│ ├─────────────────────────────────────────────────────┤   │
│ │ MATL-001   │ Raw material defect      │ Material  │⚙️│   │
│ │ PROC-005   │ Bend angle out of tol... │ Process   │⚙️│   │
│ │ EQUIP-002  │ Tool wear/breakage       │ Equipment │⚙️│   │
│ │ ...                                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Pagination: [< 1 2 3 >]                                     │
└─────────────────────────────────────────────────────────────┘
```

### State Management
```typescript
const [scrapReasons, setScrapReasons] = useState<ScrapReason[]>([]);
const [filters, setFilters] = useState({
  category: '',
  search: '',
  activeOnly: true
});
const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
const [editingReason, setEditingReason] = useState<ScrapReason | null>(null);
const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });
```

### Seed Default Reasons Feature
```typescript
const handleSeedDefaults = async () => {
  const confirmed = await confirm(
    'This will create 30+ standard scrap reason codes. Continue?'
  );

  if (!confirmed) return;

  const response = await supabase.rpc('seed_default_scrap_reasons', {
    p_tenant_id: tenantId
  });

  if (response.error) {
    toast.error('Failed to seed default reasons');
  } else {
    toast.success('Default scrap reasons created successfully');
    fetchScrapReasons(); // Refresh list
  }
};
```

### Add/Edit Dialog
```typescript
interface ScrapReasonFormData {
  code: string;
  description: string;
  category: 'material' | 'process' | 'equipment' | 'operator' | 'design' | 'other';
  active: boolean;
}

const ScrapReasonDialog = ({ isOpen, onClose, existingReason }: Props) => {
  // Form for adding/editing scrap reason
  // Validation: code required, description required, category required
  // Show error if duplicate code
};
```

### Soft Delete vs Hard Delete
```typescript
const handleDelete = async (reason: ScrapReason) => {
  // Check if reason is referenced
  const response = await fetch(
    `${supabaseUrl}/functions/v1/api-operation-quantities?scrap_reason_id=${reason.id}&limit=1`
  );
  const data = await response.json();

  if (data.data.quantities.length > 0) {
    // Reason is referenced - suggest soft delete
    const softDelete = await confirm(
      `This scrap reason is used in ${data.data.pagination.total} records. ` +
      `Would you like to deactivate it instead of deleting?`
    );

    if (softDelete) {
      // PATCH to set active=false
      await updateScrapReason(reason.id, { active: false });
    }
  } else {
    // Safe to hard delete
    const confirmed = await confirm('Delete this scrap reason permanently?');
    if (confirmed) {
      await deleteScrapReason(reason.id);
    }
  }
};
```

### Category Badges
```typescript
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'material': return 'bg-amber-100 text-amber-800';
    case 'process': return 'bg-blue-100 text-blue-800';
    case 'equipment': return 'bg-red-100 text-red-800';
    case 'operator': return 'bg-purple-100 text-purple-800';
    case 'design': return 'bg-green-100 text-green-800';
    case 'other': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

<Badge className={getCategoryColor(reason.category)}>
  {reason.category}
</Badge>
```

### Routing
Add to routing configuration:
```typescript
// In src/App.tsx or routing file
{
  path: "/admin/config/scrap-reasons",
  element: <ConfigScrapReasons />
}
```

### Navigation Menu
Add to admin settings menu:
```typescript
// In admin settings navigation
<NavItem href="/admin/config/scrap-reasons" icon={AlertTriangle}>
  Scrap Reasons
</NavItem>
```

---

## Component 3: Time Type Selector

**File:** `src/components/operator/TimeTypeSelector.tsx`
**Dependencies:** None
**Complexity:** Low
**Estimated LOC:** ~50-100

### Purpose
Dropdown selector for choosing time type when starting a time entry (setup, run, rework, wait, breakdown).

### Props Interface
```typescript
interface TimeTypeSelectorProps {
  value: string;
  onChange: (timeType: string) => void;
  disabled?: boolean;
}
```

### UI Layout
```
Time Type: [Setup ▼]
           ├─ Setup
           ├─ Run (default)
           ├─ Rework
           ├─ Wait
           └─ Breakdown
```

### Implementation
```typescript
const timeTypes = [
  { value: 'setup', label: 'Setup', icon: Wrench, color: 'text-orange-500' },
  { value: 'run', label: 'Run', icon: Play, color: 'text-green-500' },
  { value: 'rework', label: 'Rework', icon: RefreshCw, color: 'text-yellow-500' },
  { value: 'wait', label: 'Wait', icon: Clock, color: 'text-gray-500' },
  { value: 'breakdown', label: 'Breakdown', icon: AlertTriangle, color: 'text-red-500' }
];

export const TimeTypeSelector = ({ value, onChange, disabled }: Props) => {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        {timeTypes.map(({ value, label, icon: Icon, color }) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span>{label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### Integration Point
Update `CurrentlyTimingWidget.tsx` or wherever time entries are started:

```typescript
const [timeType, setTimeType] = useState<string>('run');

// When starting time entry
const handleStartTimer = async () => {
  const response = await fetch('/api-time-entries/start', {
    method: 'POST',
    body: JSON.stringify({
      operation_id: operationId,
      operator_id: operatorId,
      time_type: timeType // ← New field
    })
  });
};

// In UI
<TimeTypeSelector value={timeType} onChange={setTimeType} />
<Button onClick={handleStartTimer}>Start Timer</Button>
```

---

## Component 4: Material Lot Fields in Parts Form

**File:** Update `src/pages/admin/JobCreate.tsx` (or wherever parts are created/edited)
**Dependencies:** None
**Complexity:** Low
**Estimated LOC:** ~30-50 (additions to existing form)

### Purpose
Add material lot traceability fields to parts creation/editing form.

### New Fields to Add
```typescript
// Add to part form state
const [partData, setPartData] = useState({
  // ... existing fields ...
  material_lot: '',
  material_supplier: '',
  material_cert_number: ''
});
```

### UI Addition
```tsx
{/* Existing material field */}
<FormField label="Material" required>
  <Input
    value={partData.material}
    onChange={(e) => setPartData({ ...partData, material: e.target.value })}
  />
</FormField>

{/* NEW: Material Traceability Section */}
<div className="space-y-4 border-t pt-4 mt-4">
  <h4 className="text-sm font-medium">Material Traceability (Optional)</h4>

  <FormField label="Material Lot/Heat Number">
    <Input
      value={partData.material_lot}
      onChange={(e) => setPartData({ ...partData, material_lot: e.target.value })}
      placeholder="e.g., LOT-2024-1234"
    />
  </FormField>

  <FormField label="Material Supplier">
    <Input
      value={partData.material_supplier}
      onChange={(e) => setPartData({ ...partData, material_supplier: e.target.value })}
      placeholder="e.g., Metal Supply Co"
    />
  </FormField>

  <FormField label="Material Certification Number">
    <Input
      value={partData.material_cert_number}
      onChange={(e) => setPartData({ ...partData, material_cert_number: e.target.value })}
      placeholder="e.g., CERT-ABC-123"
    />
  </FormField>
</div>
```

### Submit Update
```typescript
// In handleSubmit, include new fields
const response = await fetch('/api-parts', {
  method: 'POST',
  body: JSON.stringify({
    // ... existing fields ...
    material_lot: partData.material_lot || null,
    material_supplier: partData.material_supplier || null,
    material_cert_number: partData.material_cert_number || null
  })
});
```

### Parts List Display
Add columns to parts table:
```typescript
// In Parts.tsx or similar
<TableHeader>
  <TableRow>
    <TableHead>Part Number</TableHead>
    <TableHead>Material</TableHead>
    <TableHead>Material Lot</TableHead> {/* NEW */}
    <TableHead>Quantity</TableHead>
    <TableHead>Status</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {parts.map(part => (
    <TableRow key={part.id}>
      <TableCell>{part.part_number}</TableCell>
      <TableCell>{part.material}</TableCell>
      <TableCell>{part.material_lot || '-'}</TableCell> {/* NEW */}
      <TableCell>{part.quantity}</TableCell>
      <TableCell><StatusBadge status={part.status} /></TableCell>
    </TableRow>
  ))}
</TableBody>
```

---

## Component 5: Operator Terminal Enhancements

**File:** Update `src/pages/operator/OperatorTerminal.tsx`
**Dependencies:** Component 1 (ProductionQuantityModal), Component 3 (TimeTypeSelector)
**Complexity:** Medium
**Estimated LOC:** ~100-150 (additions to existing)

### Purpose
Integrate quantity recording and time type selection into operator terminal workflow.

### Workflow Changes

#### Before (Current):
```
1. Operator views operation
2. Starts timer
3. Completes work
4. Stops timer
5. Marks operation complete
```

#### After (Enhanced):
```
1. Operator views operation
2. Selects time type (setup/run/etc.)
3. Starts timer with time type
4. Completes work
5. Stops timer
6. **Records production quantities** ← NEW
7. Marks operation complete
```

### Integration Points

#### 1. Add Time Type Selection to Timer Start
```typescript
// In OperatorTerminal.tsx or CurrentlyTimingWidget.tsx
const [timeType, setTimeType] = useState<string>('run');
const [showQuantityModal, setShowQuantityModal] = useState(false);

// UI Update
<div className="space-y-2">
  <TimeTypeSelector value={timeType} onChange={setTimeType} />
  <Button onClick={() => handleStartTimer(timeType)}>
    Start Timer
  </Button>
</div>
```

#### 2. Trigger Quantity Modal on Timer Stop
```typescript
const handleStopTimer = async () => {
  // Stop the timer first
  await stopTimeEntry();

  // Then show quantity recording modal
  setShowQuantityModal(true);
};

// Render modal
<ProductionQuantityModal
  isOpen={showQuantityModal}
  onClose={() => setShowQuantityModal(false)}
  operationId={currentOperation.id}
  operationName={currentOperation.operation_name}
  partNumber={currentOperation.part.part_number}
  plannedQuantity={currentOperation.part.quantity}
  onSuccess={() => {
    // Refresh operation data
    fetchOperations();
  }}
/>
```

#### 3. Optional: Allow Skipping Quantity Recording
```typescript
// Some operations may not need quantity tracking
// Add a "Skip Quantity" button in modal or terminal

const handleSkipQuantity = () => {
  setShowQuantityModal(false);
  // Can still mark operation complete
};
```

#### 4. Display Recent Quantities on Operation Card
```typescript
// In OperationCard.tsx, show summary of recorded quantities
const [operationQuantities, setOperationQuantities] = useState<OperationQuantity[]>([]);

useEffect(() => {
  fetchOperationQuantities();
}, [operationId]);

const fetchOperationQuantities = async () => {
  const response = await fetch(
    `/api-operation-quantities?operation_id=${operationId}&limit=5`
  );
  const data = await response.json();
  if (data.success) {
    setOperationQuantities(data.data.quantities);
  }
};

// UI
<div className="mt-2 text-xs text-muted-foreground">
  {operationQuantities.length > 0 && (
    <div>
      Latest: {operationQuantities[0].quantity_good} good,
      {operationQuantities[0].quantity_scrap} scrap
    </div>
  )}
</div>
```

---

## Component 6: Production Metrics Dashboard

**File:** `src/pages/admin/ProductionMetrics.tsx`
**Dependencies:** None
**Complexity:** High
**Estimated LOC:** ~500-700

### Purpose
Dashboard for viewing production metrics, yield, and scrap analysis.

### API Endpoints Used
- `GET /api-operation-quantities` - Get quantity data
- `POST /rest/v1/rpc/get_scrap_summary_by_reason` - Scrap Pareto
- `POST /rest/v1/rpc/get_operation_total_quantities` - Operation totals

### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Production Metrics                    [Date Range: ▼]      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │ Produced│ │  Good   │ │  Scrap  │ │  Yield  │         │
│ │  1,250  │ │ 1,180   │ │    70   │ │  94.4%  │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
│ Scrap Pareto Analysis                                       │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ██████████████████████ PROC-005 (45%)                 │   │
│ │ ████████████ MATL-001 (30%)                           │   │
│ │ ██████ EQUIP-002 (15%)                                │   │
│ │ ████ OTHER-001 (10%)                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Recent Production Records                                   │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Operation      │ Produced │ Good │ Scrap │ Yield    │   │
│ ├─────────────────────────────────────────────────────┤   │
│ │ Bend - PART-001│    25    │  23  │   2   │  92.0%   │   │
│ │ Weld - PART-002│    50    │  50  │   0   │ 100.0%   │   │
│ └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Metrics Components
```typescript
const MetricCard = ({ title, value, change }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className={`text-xs ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}% from last period
        </p>
      )}
    </CardContent>
  </Card>
);
```

### Scrap Pareto Chart
Use Recharts or similar:
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const ScrapParetoChart = ({ data }: Props) => (
  <BarChart width={600} height={300} data={data}>
    <XAxis dataKey="scrap_reason_code" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="total_scrap_quantity" fill="#ef4444" />
  </BarChart>
);
```

### Date Range Filter
```typescript
const [dateRange, setDateRange] = useState({
  from: subDays(new Date(), 30),
  to: new Date()
});

// Fetch data with date range
const fetchMetrics = async () => {
  const response = await fetch(
    `/api-operation-quantities?from_date=${dateRange.from.toISOString()}&to_date=${dateRange.to.toISOString()}`
  );
  // Process data...
};
```

---

## Integration Checklist

### Backend Prerequisites (✅ Complete)
- [x] SQL migration script created
- [x] TypeScript types updated
- [x] API handlers implemented (operation-quantities, scrap-reasons)
- [x] Existing APIs enhanced (time-entries, parts)

### UI Components (🔨 To Build)
- [ ] Component 1: ProductionQuantityModal
- [ ] Component 2: ConfigScrapReasons page
- [ ] Component 3: TimeTypeSelector
- [ ] Component 4: Material lot fields in parts form
- [ ] Component 5: Operator terminal integration
- [ ] Component 6: Production metrics dashboard

### Testing (After UI Complete)
- [ ] End-to-end workflow test: Record production → View metrics
- [ ] Operator workflow: Start timer (with type) → Stop → Record quantities
- [ ] Admin workflow: Create scrap reason → Operator uses it
- [ ] Material lot traceability: Create part with lot → Record qty with lot → Search by lot
- [ ] Edge cases: Validation errors, duplicate codes, FK constraints

### Documentation Updates
- [ ] Update user guide with new features
- [ ] Update operator training materials
- [ ] Add screenshots to documentation
- [ ] Update API documentation examples

---

## File Locations Summary

### New Files to Create
```
src/components/operator/ProductionQuantityModal.tsx
src/components/operator/TimeTypeSelector.tsx
src/pages/admin/ConfigScrapReasons.tsx
src/pages/admin/ProductionMetrics.tsx
```

### Existing Files to Modify
```
src/pages/operator/OperatorTerminal.tsx
src/pages/admin/JobCreate.tsx (or parts form location)
src/pages/admin/Parts.tsx (add material_lot column)
src/App.tsx (add routes for new pages)
```

### Shared Types to Add
```typescript
// src/types/mes.ts (create new file)
export interface OperationQuantity {
  id: string;
  operation_id: string;
  quantity_produced: number;
  quantity_good: number;
  quantity_scrap: number;
  quantity_rework: number;
  scrap_reason_id?: string;
  material_lot?: string;
  material_supplier?: string;
  material_cert_number?: string;
  notes?: string;
  recorded_at: string;
  recorded_by?: string;
}

export interface ScrapReason {
  id: string;
  code: string;
  description: string;
  category: 'material' | 'process' | 'equipment' | 'operator' | 'design' | 'other';
  active: boolean;
  metadata?: Record<string, any>;
}

export type TimeType = 'setup' | 'run' | 'rework' | 'wait' | 'breakdown';
```

---

## Parallel Work Assignments (Suggestion)

### Team Member / Agent 1: Core Production Tracking
- Component 1: ProductionQuantityModal
- Component 5: Operator terminal integration
- **Dependencies:** None, can start immediately

### Team Member / Agent 2: Admin Configuration
- Component 2: ConfigScrapReasons page
- Component 4: Material lot fields
- **Dependencies:** None, can start immediately

### Team Member / Agent 3: UI Enhancements
- Component 3: TimeTypeSelector
- Component 6: Production metrics dashboard
- **Dependencies:** Component 1 data for dashboard testing

---

## Success Criteria

### Minimum Viable Product (MVP)
1. ✅ Operators can record production quantities when completing operations
2. ✅ Scrap reasons can be configured and selected
3. ✅ Material lots can be tracked through parts
4. ✅ Basic production metrics visible in dashboard

### Full Feature Set
1. ✅ Time types can be selected and tracked separately
2. ✅ Scrap Pareto analysis shows top scrap causes
3. ✅ Yield metrics calculated and displayed
4. ✅ Material lot traceability functional
5. ✅ All validations working correctly

---

## Notes for Implementers

1. **API is Ready:** All backend endpoints are implemented and tested. Focus on UI/UX.

2. **Follow Existing Patterns:** Look at existing components like `IssueForm.tsx` or `OperationCard.tsx` for styling patterns.

3. **Use Existing UI Library:** The app uses shadcn/ui components. Use existing components like Dialog, Select, Input, etc.

4. **Toast Notifications:** Use the toast system for success/error messages.

5. **Error Handling:** Always handle API errors gracefully with user-friendly messages.

6. **Mobile Responsive:** Operator terminal especially needs to work well on tablets/mobile.

7. **Accessibility:** Ensure keyboard navigation and screen reader support.

8. **Performance:** Use pagination for large datasets, debounce search inputs.

---

## Questions? Issues?

Refer to:
- `MES_DATA_INVENTORY_AND_GAP_ANALYSIS.md` - Full requirements and business context
- `MES_API_ENDPOINTS_DOCUMENTATION.md` - Complete API reference
- Existing codebase patterns for UI/UX consistency

---

**Status:** Ready for parallel UI implementation
**Backend Status:** ✅ Complete and deployed
**SQL Migration:** Ready to apply after UI testing
