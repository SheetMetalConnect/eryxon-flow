import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DOCS_GUIDES_URL } from "@/lib/config";

export default function About() {
  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">About</h1>

      <Card className="glass-card mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-2">Eryxon MES</h2>
          <p className="text-muted-foreground mb-4">
            Manufacturing execution system for metals fabrication. Track jobs, parts, and operations through production.
          </p>
          <p className="text-sm text-muted-foreground">
            Made by{" "}
            <a
              href="https://sheetmetalconnect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Sheet Metal Connect
            </a>
          </p>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <a
            href={DOCS_GUIDES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Documentation
          </a>{" "}
          ·{" "}
          <Link to="/api-docs" className="hover:underline">
            API Docs
          </Link>{" "}
          ·{" "}
          <a
            href="https://github.com/SheetMetalConnect/eryxon-flow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </p>
        <p className="text-sm text-muted-foreground">
          <Link to="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link to="/terms-of-service" className="hover:underline">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
