import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Store,
  Search,
  Filter,
  Download,
  ExternalLink,
  Github,
  Star,
  Users,
  Package,
  CheckCircle2,
} from "lucide-react";
import IntegrationDetailModal from "@/components/admin/IntegrationDetailModal";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;
  category: string;
  logo_url?: string;
  banner_url?: string;
  provider_name: string;
  provider_url?: string;
  supported_systems?: string[];
  features?: string[];
  documentation_url?: string;
  github_repo_url?: string;
  is_free: boolean;
  pricing_description?: string;
  install_count: number;
  rating_average: number;
  rating_count: number;
  is_installed?: boolean;
  version?: string;
}

const categoryIcons: Record<string, string> = {
  erp: "🏭",
  accounting: "💰",
  crm: "👥",
  inventory: "📦",
  shipping: "🚚",
  analytics: "📊",
  other: "🔧",
};

const categoryLabels: Record<string, string> = {
  erp: "ERP Systems",
  accounting: "Accounting",
  crm: "CRM",
  inventory: "Inventory",
  shipping: "Shipping",
  analytics: "Analytics",
  other: "Other",
};

export default function IntegrationsMarketplace() {
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [activeTab, setActiveTab] = useState("marketplace");

  // Fetch all integrations
  const { data: integrations, isLoading, refetch } = useQuery({
    queryKey: ["integrations-marketplace", categoryFilter, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (sortBy) params.append("sort", sortBy);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-integrations?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch integrations");
      }

      const result = await response.json();
      return result.data as Integration[];
    },
    enabled: !!session,
  });

  // Fetch installed integrations
  const { data: installedIntegrations } = useQuery({
    queryKey: ["installed-integrations"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-integrations/installed`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch installed integrations");
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!session && activeTab === "installed",
  });

  const handleInstall = async (integrationId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-integrations/${integrationId}/install`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to install integration");
      }

      toast.success("Integration installed successfully");
      refetch();
      setSelectedIntegration(null);
    } catch (error) {
      console.error("Install error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to install integration");
    }
  };

  const handleUninstall = async (integrationId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-integrations/${integrationId}/uninstall`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to uninstall integration");
      }

      toast.success("Integration uninstalled successfully");
      refetch();
      setSelectedIntegration(null);
    } catch (error) {
      console.error("Uninstall error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to uninstall integration");
    }
  };

  const IntegrationCard = ({ integration }: { integration: Integration }) => (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => setSelectedIntegration(integration)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">
              {categoryIcons[integration.category] || "🔧"}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {integration.name}
                {integration.is_installed && (
                  <Badge variant="default" className="ml-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Installed
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                by {integration.provider_name}
              </CardDescription>
            </div>
          </div>
          {integration.is_free ? (
            <Badge variant="secondary">Free</Badge>
          ) : (
            <Badge variant="outline">Paid</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {integration.description}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{integration.rating_average.toFixed(1)}</span>
            <span>({integration.rating_count})</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{integration.install_count.toLocaleString()} installs</span>
          </div>
        </div>
        {integration.github_repo_url && (
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(integration.github_repo_url, "_blank");
              }}
            >
              <Github className="w-4 h-4 mr-2" />
              View Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Store className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Integration Marketplace</h1>
        </div>
        <p className="text-muted-foreground">
          Browse and install pre-built integrations for common ERP systems, or
          build your own using our starter kits.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="marketplace">
            <Package className="w-4 h-4 mr-2" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="installed">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Installed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {categoryIcons[value]} {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Integration Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : integrations && integrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No integrations found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="installed" className="space-y-6">
          {installedIntegrations && installedIntegrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {installedIntegrations.map((item: any) => (
                <IntegrationCard
                  key={item.id}
                  integration={{ ...item.integration, is_installed: true }}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No integrations installed yet
                </p>
                <Button onClick={() => setActiveTab("marketplace")}>
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Integration Detail Modal */}
      {selectedIntegration && (
        <IntegrationDetailModal
          integration={selectedIntegration}
          open={!!selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
        />
      )}
    </div>
  );
}
