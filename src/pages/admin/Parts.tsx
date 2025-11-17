import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PartDetailModal from "@/components/admin/PartDetailModal";
import Layout from "@/components/Layout";
import { Package, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Parts() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [assemblyFilter, setAssemblyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const { data: materials } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("material")
        .not("material", "is", null);

      if (error) throw error;

      const uniqueMaterials = [...new Set(data.map((p) => p.material))];
      return uniqueMaterials.sort();
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number")
        .order("job_number");

      if (error) throw error;
      return data;
    },
  });

  const { data: parts, isLoading, refetch } = useQuery({
    queryKey: ["admin-parts", statusFilter, materialFilter, jobFilter, assemblyFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("parts")
        .select(`
          *,
          job:jobs(job_number),
          cell:cells(name, color),
          operations(count)
        `);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      if (materialFilter !== "all") {
        query = query.eq("material", materialFilter);
      }

      if (jobFilter !== "all") {
        query = query.eq("job_id", jobFilter);
      }

      if (assemblyFilter === "assemblies") {
        // Get parts that have children (are assemblies)
        const { data: childParts } = await supabase
          .from("parts")
          .select("parent_part_id")
          .not("parent_part_id", "is", null);

        const assemblyIds = [...new Set(childParts?.map(p => p.parent_part_id))];
        if (assemblyIds.length > 0) {
          query = query.in("id", assemblyIds);
        } else {
          // No assemblies exist, return empty
          return [];
        }
      } else if (assemblyFilter === "components") {
        query = query.not("parent_part_id", "is", null);
      } else if (assemblyFilter === "standalone") {
        query = query.is("parent_part_id", null);
      }

      if (searchQuery) {
        query = query.ilike("part_number", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Check which parts have children
      const { data: allChildRelations } = await supabase
        .from("parts")
        .select("parent_part_id")
        .not("parent_part_id", "is", null);

      const partsWithChildren = new Set(allChildRelations?.map(p => p.parent_part_id) || []);

      return data.map((part: any) => ({
        ...part,
        operations_count: part.operations?.[0]?.count || 0,
        has_children: partsWithChildren.has(part.id),
      }));
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      not_started: "secondary",
      in_progress: "default",
      completed: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("parts.title")}</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Input
          placeholder={t("parts.searchByPartNumber")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("parts.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("parts.allStatuses")}</SelectItem>
            <SelectItem value="not_started">{t("parts.status.notStarted")}</SelectItem>
            <SelectItem value="in_progress">{t("parts.status.inProgress")}</SelectItem>
            <SelectItem value="completed">{t("parts.status.completed")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("parts.filterByMaterial")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("parts.allMaterials")}</SelectItem>
            {materials?.map((material) => (
              <SelectItem key={material} value={material}>
                {material}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("parts.filterByJob")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("parts.allJobs")}</SelectItem>
            {jobs?.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.job_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assemblyFilter} onValueChange={setAssemblyFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("parts.assemblyType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("parts.allTypes")}</SelectItem>
            <SelectItem value="assemblies">{t("parts.assembliesHasChildren")}</SelectItem>
            <SelectItem value="components">{t("parts.componentsHasParent")}</SelectItem>
            <SelectItem value="standalone">{t("parts.standaloneParts")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parts Table */}
      {isLoading ? (
        <div className="text-center py-8">{t("parts.loadingParts")}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("parts.partNumber")}</TableHead>
              <TableHead>{t("parts.type")}</TableHead>
              <TableHead>{t("parts.jobNumber")}</TableHead>
              <TableHead>{t("parts.material")}</TableHead>
              <TableHead>{t("parts.status.title")}</TableHead>
              <TableHead>{t("parts.currentCell")}</TableHead>
              <TableHead className="text-right">{t("parts.operations")}</TableHead>
              <TableHead className="text-right">{t("parts.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts?.map((part: any) => (
              <TableRow key={part.id}>
                <TableCell className="font-medium">{part.part_number}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {part.has_children && (
                      <Badge variant="outline" className="text-xs" title={t("parts.assemblyTooltip")}>
                        <Package className="h-3 w-3 mr-1" />
                        {t("parts.assembly")}
                      </Badge>
                    )}
                    {part.parent_part_id && (
                      <Badge variant="secondary" className="text-xs" title={t("parts.componentTooltip")}>
                        <ChevronRight className="h-3 w-3 mr-1" />
                        {t("parts.component")}
                      </Badge>
                    )}
                    {!part.has_children && !part.parent_part_id && (
                      <span className="text-xs text-gray-500">{t("parts.standalone")}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{part.job?.job_number}</TableCell>
                <TableCell>{part.material}</TableCell>
                <TableCell>{getStatusBadge(part.status)}</TableCell>
                <TableCell>
                  {part.cell ? (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: part.cell.color,
                        backgroundColor: `${part.cell.color}20`,
                      }}
                    >
                      {part.cell.name}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">{t("parts.notStarted")}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{part.operations_count}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPartId(part.id)}
                  >
                    {t("parts.viewDetails")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {parts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  {t("parts.noPartsFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {selectedPartId && (
        <PartDetailModal
          partId={selectedPartId}
          onClose={() => setSelectedPartId(null)}
          onUpdate={() => refetch()}
        />
      )}
    </Layout>
  );
}
