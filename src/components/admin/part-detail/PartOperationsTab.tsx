import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Save, X, AlertTriangle, Package, ChevronRight, Wrench } from "lucide-react";
import { RoutingVisualization } from "@/components/qrm/RoutingVisualization";
import { IssuesSummarySection } from "@/components/issues/IssuesSummarySection";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";

interface NewOperation {
  operation_name: string;
  cell_id: string;
  estimated_time: number;
  sequence: number;
  notes: string;
  selected_resources: { resource_id: string; quantity: number; notes: string }[];
}

interface PartOperationsTabProps {
  partId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  part: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operations: any[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routing: any;
  routingLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentPart: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  childParts: any[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dependencies: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cells: any[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availableResources: any[] | undefined;
  addingOperation: boolean;
  setAddingOperation: (value: boolean) => void;
  newOperation: NewOperation;
  setNewOperation: (value: NewOperation) => void;
  handleAddOperation: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addOperationMutation: UseMutationResult<void, Error, void, unknown>;
}

export function PartOperationsTab({
  partId,
  part,
  operations,
  routing,
  routingLoading,
  parentPart,
  childParts,
  dependencies,
  cells,
  availableResources,
  addingOperation,
  setAddingOperation,
  newOperation,
  setNewOperation,
  handleAddOperation,
  addOperationMutation,
}: PartOperationsTabProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Routing visualization */}
      <div>
        <Label className="text-lg">{t("qrm.routing")}</Label>
        <div className="mt-3 border rounded-lg p-4 bg-muted">
          <RoutingVisualization routing={routing} loading={routingLoading} compact />
        </div>
      </div>

      {part?.notes && (
        <div>
          <Label>{t("parts.notes")}</Label>
          <p className="mt-1 text-sm text-muted-foreground">{part.notes}</p>
        </div>
      )}

      {part?.metadata && Object.keys(part.metadata).length > 0 && (
        <div>
          <Label>{t("parts.customMetadata")}</Label>
          <div className="mt-2 border rounded-md p-3">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(part.metadata).map(([key, value]) => (
                  <tr key={key}>
                    <td className="font-medium py-1 pr-4">{key}:</td>
                    <td className="py-1">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assembly relationships */}
      {(parentPart || (childParts && childParts.length > 0)) && (
        <div className="border-t pt-6">
          <Label className="text-lg flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            {t("parts.assemblyRelationships")}
          </Label>

          {parentPart && (
            <div className="mb-4">
              <Label className="text-sm text-muted-foreground">{t("parts.parentAssembly")}</Label>
              <div className="mt-2 border rounded-lg p-3 bg-alert-info-bg border-alert-info-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
                    <div>
                      <p className="font-medium">{parentPart.part_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {parentPart.material} | {t("jobs.job")}: {parentPart.job?.job_number}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{parentPart.status?.replace("_", " ")}</Badge>
                </div>
              </div>
            </div>
          )}

          {childParts && childParts.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground">
                {t("parts.childComponents")} ({childParts.length})
              </Label>

              {dependencies && !dependencies.dependenciesMet && (
                <Alert variant="destructive" className="my-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t("parts.dependencyWarning")}</AlertTitle>
                  <AlertDescription>
                    {t("parts.dependencyWarningDesc", { count: dependencies.warnings.length })}
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-2 space-y-2">
                {childParts.map((child: { id: string; part_number: string; status: string; material?: string; operations?: Array<{ id: string; status: string; operation_name: string }> }) => {
                  const completedOps = child.operations?.filter((op: { status: string }) => op.status === "completed").length || 0;
                  const totalOps = child.operations?.length || 0;
                  const isComplete = child.status === "completed";

                  return (
                    <div
                      key={child.id}
                      className={`border rounded-lg p-3 ${isComplete ? "bg-alert-success-bg" : "bg-card"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{child.part_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {child.material} | {totalOps} {t("operations.operation", { count: totalOps })}
                              {totalOps > 0 && ` (${completedOps}/${totalOps} ${t("parts.done")})`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isComplete ? "default" : "secondary"}
                            className={isComplete ? "bg-success text-success-foreground" : ""}
                          >
                            {child.status?.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dependencies && dependencies.dependenciesMet && (
                <div className="mt-3 p-3 bg-alert-success-bg border border-alert-success-border rounded-lg">
                  <p className="text-sm text-success flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t("parts.readyForAssembly")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Issues section */}
      <IssuesSummarySection partId={partId} />

      {/* Operations list */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <Label className="text-lg">{t("operations.title")} ({operations?.length || 0})</Label>
          <Button size="sm" onClick={() => setAddingOperation(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t("operations.addOperation")}
          </Button>
        </div>

        {addingOperation && (
          <div className="border rounded-lg p-3 sm:p-4 mb-4 bg-alert-info-bg border-alert-info-border">
            <h4 className="font-semibold mb-3 text-sm sm:text-base">{t("operations.newOperation")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("operations.operationName")} *</Label>
                <Input
                  value={newOperation.operation_name}
                  onChange={(e) =>
                    setNewOperation({ ...newOperation, operation_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t("operations.cell")} *</Label>
                <Select
                  value={newOperation.cell_id}
                  onValueChange={(value) =>
                    setNewOperation({ ...newOperation, cell_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("operations.selectCell")} />
                  </SelectTrigger>
                  <SelectContent>
                    {cells?.map((cell: { id: string; name: string }) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("operations.estimatedTimeMinutes")}</Label>
                <Input
                  type="number"
                  value={newOperation.estimated_time || ""}
                  onChange={(e) =>
                    setNewOperation({
                      ...newOperation,
                      estimated_time: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>{t("operations.sequence")}</Label>
                <Input
                  type="number"
                  value={newOperation.sequence}
                  onChange={(e) =>
                    setNewOperation({
                      ...newOperation,
                      sequence: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("operations.notes")}</Label>
                <Textarea
                  value={newOperation.notes}
                  onChange={(e) =>
                    setNewOperation({ ...newOperation, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-orange-600" />
                  <Label>{t("operations.requiredResourcesOptional")}</Label>
                </div>

                <Select
                  onValueChange={(resourceId) => {
                    if (!newOperation.selected_resources.find(r => r.resource_id === resourceId)) {
                      setNewOperation({
                        ...newOperation,
                        selected_resources: [
                          ...newOperation.selected_resources,
                          { resource_id: resourceId, quantity: 1, notes: "" }
                        ]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("operations.addResource")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableResources
                      ?.filter(res => !newOperation.selected_resources.find(sr => sr.resource_id === res.id))
                      .map((resource: { id: string; name: string; type: string }) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          <div className="flex items-center gap-2">
                            <span>{resource.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {newOperation.selected_resources.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newOperation.selected_resources.map((selectedRes, idx) => {
                      const resource = availableResources?.find(r => r.id === selectedRes.resource_id);
                      return (
                        <div key={idx} className="border rounded-md p-3 bg-white">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Wrench className="h-3 w-3 text-orange-600" />
                                <span className="font-medium text-sm">{resource?.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {resource?.type}
                                </Badge>
                              </div>
                              {resource?.description && (
                                <p className="text-xs text-muted-foreground">{resource.description}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setNewOperation({
                                  ...newOperation,
                                  selected_resources: newOperation.selected_resources.filter((_, i) => i !== idx)
                                });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">{t("operations.quantity")}</Label>
                              <Input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={selectedRes.quantity}
                                onChange={(e) => {
                                  const updated = [...newOperation.selected_resources];
                                  updated[idx].quantity = parseFloat(e.target.value) || 1;
                                  setNewOperation({ ...newOperation, selected_resources: updated });
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t("operations.instructionsOptional")}</Label>
                              <Input
                                value={selectedRes.notes}
                                onChange={(e) => {
                                  const updated = [...newOperation.selected_resources];
                                  updated[idx].notes = e.target.value;
                                  setNewOperation({ ...newOperation, selected_resources: updated });
                                }}
                                placeholder={t("operations.specialInstructions")}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={handleAddOperation} disabled={addOperationMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {addOperationMutation.isPending ? t("operations.saving") : t("operations.saveOperation")}
              </Button>
              <Button variant="outline" onClick={() => setAddingOperation(false)}>
                <X className="h-4 w-4 mr-2" /> {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {(operations as unknown as { id: string; operation_name: string; sequence: number; estimated_time: number | null; status: string; resources_count: number; cell?: { name: string; color: string | null }; assigned_operator?: { full_name: string } | null }[])?.map((op) => (
            <div
              key={op.id}
              className="flex items-center justify-between border rounded-md p-3"
            >
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  style={{
                    borderColor: op.cell?.color,
                    backgroundColor: `${op.cell?.color || "#999"}20`,
                  }}
                >
                  {op.cell?.name}
                </Badge>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{op.operation_name}</p>
                    {op.resources_count > 0 && (
                      <Badge variant="outline" className="gap-1 text-xs px-1.5 py-0">
                        <Wrench className="h-3 w-3 text-orange-600" />
                        {op.resources_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("operations.seq")}: {op.sequence}
                    {op.estimated_time && ` | ${t("operations.est")}: ${op.estimated_time}${t("operations.min")}`}
                    {op.assigned_operator && (
                      <span className="ml-2">
                        | {t("operations.assigned")}: {op.assigned_operator.full_name}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Badge variant={op.status === "completed" ? "default" : "secondary"}>
                {op.status?.replace("_", " ")}
              </Badge>
            </div>
          ))}
          {(operations?.length || 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("operations.noOperationsYet")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
