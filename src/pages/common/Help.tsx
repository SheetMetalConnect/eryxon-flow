"use client";

import * as React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Code,
  GitBranch,
  Wrench,
  ExternalLink,
  Sparkles,
  Calendar,
  CheckCircle,
  BookOpen,
  Users,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Release {
  version: string;
  date: string;
  sha: string;
  changes: string[];
}

interface ReleasesData {
  releases: Release[];
  lastUpdated: string;
}

// Text-based logo component matching the docs site
const EryxonLogo = () => (
  <div className="flex items-center gap-2">
    <span className="text-3xl font-black tracking-tight">
      ERYXON <span className="font-normal text-muted-foreground">FLOW</span>
    </span>
  </div>
);

export default function Help() {
  const [releases, setReleases] = React.useState<Release[]>([]);
  const [releasesLoading, setReleasesLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/releases.json')
      .then(res => res.json())
      .then((data: ReleasesData) => {
        setReleases(data.releases?.slice(0, 3) || []);
        setReleasesLoading(false);
      })
      .catch(() => {
        setReleasesLoading(false);
      });
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const docLinks = [
    {
      href: "https://eryxon.eu/docs/guides/quick-start/",
      icon: BookOpen,
      title: "Quick Start",
      desc: "Get up and running",
    },
    {
      href: "https://eryxon.eu/docs/guides/operator-manual/",
      icon: Users,
      title: "Operator Guide",
      desc: "For shop floor users",
    },
    {
      href: "https://eryxon.eu/docs/guides/admin-manual/",
      icon: Shield,
      title: "Admin Guide",
      desc: "Configuration & setup",
    },
    {
      href: "https://eryxon.eu/docs/guides/faq/",
      icon: HelpCircle,
      title: "FAQ",
      desc: "Common questions",
    },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header with Logo */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <EryxonLogo />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Help & Documentation</h1>
        <p className="text-muted-foreground">
          Everything you need to use Eryxon MES
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <a
          href="https://eryxon.eu/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card className="glass-card hover:bg-white/5 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <FileText className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Documentation</h3>
              <p className="text-xs text-muted-foreground">Full guides</p>
            </CardContent>
          </Card>
        </a>

        <Link to="/admin/api-docs">
          <Card className="glass-card hover:bg-white/5 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <Code className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold mb-1">API Reference</h3>
              <p className="text-xs text-muted-foreground">OpenAPI spec</p>
            </CardContent>
          </Card>
        </Link>

        <a
          href="https://github.com/SheetMetalConnect/eryxon-flow"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card className="glass-card hover:bg-white/5 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <GitBranch className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold mb-1">GitHub</h3>
              <p className="text-xs text-muted-foreground">Source code</p>
            </CardContent>
          </Card>
        </a>

        <Link to="/admin/about">
          <Card className="glass-card hover:bg-white/5 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <Wrench className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold mb-1">About</h3>
              <p className="text-xs text-muted-foreground">Version info</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Documentation Links */}
      <Card className="glass-card mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{link.title}</p>
                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </a>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <a
              href="https://eryxon.eu/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View all documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* What's New */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              What's New
            </CardTitle>
            <a
              href="https://github.com/SheetMetalConnect/eryxon-flow/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              All releases
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {releasesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : releases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No releases yet. Check back soon!
            </p>
          ) : (
            <div className="space-y-4">
              {releases.map((release, index) => (
                <div
                  key={release.version}
                  className={cn(
                    "p-3 rounded-lg",
                    index === 0 ? "bg-primary/10" : "bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">v{release.version}</span>
                    {index === 0 && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">
                        Latest
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(release.date)}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {release.changes.slice(0, 3).map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{change}</span>
                      </li>
                    ))}
                    {release.changes.length > 3 && (
                      <li className="text-xs text-muted-foreground pl-5">
                        +{release.changes.length - 3} more changes
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
