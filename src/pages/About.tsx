import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">About</h1>

      <Card className="glass-card mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-3">Eryxon MES</h2>
          <p className="text-muted-foreground mb-4">
            Manufacturing execution system for metals fabrication. Track jobs, parts, and operations through production.
          </p>
          <p className="text-sm text-muted-foreground">
            Made by{" "}
            <a
              href="https://sheetmetalconnect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-foreground underline transition-base"
            >
              Sheet Metal Connect
            </a>
          </p>
        </CardContent>
      </Card>

      <Separator className="my-6 bg-border-subtle" />

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <a href="/admin/help" className="hover:text-foreground transition-base">
            Help
          </a>
          {" · "}
          <a href="/admin/api-docs" className="hover:text-foreground transition-base">
            API Docs
          </a>
          {" · "}
          <a
            href="https://github.com/SheetMetalConnect/eryxon-flow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-base"
          >
            GitHub
          </a>
        </div>
        <div className="text-sm text-muted-foreground">
          Privacy Policy · Terms of Service
        </div>
      </div>
    </div>
  );
}
