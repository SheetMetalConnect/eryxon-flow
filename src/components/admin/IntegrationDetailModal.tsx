import React from "react";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExternalLink,
  Github,
  Star,
  Users,
  CheckCircle2,
  Download,
  BookOpen,
  AlertCircle,
  Package,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sanitizeUrl, safeOpenUrl } from "@/lib/utils";

interface Integration {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  category: string;
  logo_url?: string;
  banner_url?: string;
  provider_name: string;
  provider_url?: string;
  provider_email?: string;
  supported_systems?: string[];
  features?: string[];
  requirements?: Record<string, any>;
  documentation_url?: string;
  github_repo_url?: string;
  demo_video_url?: string;
  is_free: boolean;
  pricing_description?: string;
  pricing_url?: string;
  install_count: number;
  rating_average: number;
  rating_count: number;
  is_installed?: boolean;
  version?: string;
  requires_api_key?: boolean;
}

interface IntegrationDetailModalProps {
  integration: Integration;
  open: boolean;
  onClose: () => void;
  onInstall: (integrationId: string) => void;
  onUninstall: (integrationId: string) => void;
}

export default function IntegrationDetailModal({
  integration,
  open,
  onClose,
  onInstall,
  onUninstall,
}: IntegrationDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">
                {integration.logo_url ? (
                  <img
                    src={integration.logo_url}
                    alt={integration.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <Package className="w-16 h-16" />
                )}
              </div>
              <div>
                <DialogTitle className="text-2xl mb-1">
                  {integration.name}
                </DialogTitle>
                <DialogDescription className="text-base">
                  by {integration.provider_name}
                  {sanitizeUrl(integration.provider_url) && (
                    <a
                      href={sanitizeUrl(integration.provider_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </DialogDescription>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {integration.rating_average.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({integration.rating_count} reviews)
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{integration.install_count.toLocaleString()} installs</span>
                  </div>
                  {integration.version && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <Badge variant="outline">v{integration.version}</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {integration.is_free ? (
                <Badge variant="secondary" className="text-sm">
                  Free
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm">
                  Paid
                </Badge>
              )}
              {integration.is_installed && (
                <Badge variant="default" className="text-sm">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Installed
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{integration.description}</p>
            </div>

            {integration.long_description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{integration.long_description}</ReactMarkdown>
                </div>
              </div>
            )}

            {integration.supported_systems &&
              integration.supported_systems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Supported Systems
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {integration.supported_systems.map((system, index) => (
                      <Badge key={index} variant="secondary">
                        {system}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {!integration.is_free && integration.pricing_description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Pricing</h3>
                <p className="text-muted-foreground">
                  {integration.pricing_description}
                </p>
                {sanitizeUrl(integration.pricing_url) && (
                  <Button
                    variant="link"
                    className="px-0"
                    onClick={() => safeOpenUrl(integration.pricing_url)}
                  >
                    View pricing details
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            {integration.features && integration.features.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {integration.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No features listed for this integration.
              </p>
            )}

            {integration.requirements &&
              Object.keys(integration.requirements).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <pre className="text-sm whitespace-pre-wrap">
                        {JSON.stringify(integration.requirements, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {integration.requires_api_key
                  ? "This integration requires an API key. Make sure to generate one in the API Keys configuration page before installing."
                  : "This integration can be installed directly."}
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="text-lg font-semibold mb-3">
                Installation Steps
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Click the "Install Integration" button below</li>
                {integration.requires_api_key && (
                  <li>
                    Configure your API key in the integration settings
                  </li>
                )}
                <li>Follow the setup wizard to connect to your system</li>
                <li>Configure webhooks (if applicable)</li>
                <li>Test the connection</li>
              </ol>
            </div>

            {sanitizeUrl(integration.documentation_url) && (
              <Button
                variant="outline"
                onClick={() => safeOpenUrl(integration.documentation_url)}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                View Setup Documentation
              </Button>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid gap-4">
              {sanitizeUrl(integration.documentation_url) && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => safeOpenUrl(integration.documentation_url)}
                >
                  <BookOpen className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Documentation</div>
                    <div className="text-xs text-muted-foreground">
                      Complete setup and usage guide
                    </div>
                  </div>
                </Button>
              )}

              {sanitizeUrl(integration.github_repo_url) && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => safeOpenUrl(integration.github_repo_url)}
                >
                  <Github className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">GitHub Repository</div>
                    <div className="text-xs text-muted-foreground">
                      Starter kit with example code
                    </div>
                  </div>
                </Button>
              )}

              {sanitizeUrl(integration.demo_video_url) && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => safeOpenUrl(integration.demo_video_url)}
                >
                  <ExternalLink className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Demo Video</div>
                    <div className="text-xs text-muted-foreground">
                      Watch a walkthrough
                    </div>
                  </div>
                </Button>
              )}

              {integration.provider_email && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() =>
                    safeOpenUrl(`mailto:${integration.provider_email}`)
                  }
                >
                  <ExternalLink className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Support</div>
                    <div className="text-xs text-muted-foreground">
                      {integration.provider_email}
                    </div>
                  </div>
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {integration.is_installed ? (
            <Button
              variant="destructive"
              onClick={() => onUninstall(integration.id)}
            >
              Uninstall
            </Button>
          ) : (
            <Button onClick={() => onInstall(integration.id)}>
              <Download className="w-4 h-4 mr-2" />
              Install Integration
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
