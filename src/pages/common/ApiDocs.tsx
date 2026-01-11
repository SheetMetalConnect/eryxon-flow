import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Code2,
  KeyRound,
  Rocket,
  CheckCircle2,
  Copy,
  ExternalLink,
  Terminal,
  Zap,
  FileJson,
  PlayCircle,
  Download,
  FileCode,
  Link as LinkIcon,
  Package,
  FileUp,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApiDocs() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/supabase', '') || "";
  const apiBaseUrl = `${baseUrl}/functions/v1`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const downloadSpec = async (format: 'json' | 'yaml') => {
    try {
      const response = await fetch('/openapi.json');
      const spec = await response.json();

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(spec, null, 2);
        filename = 'eryxon-flow-openapi.json';
        mimeType = 'application/json';
      } else {
        // Convert JSON to YAML (simple conversion)
        content = jsonToYaml(spec);
        filename = 'eryxon-flow-openapi.yaml';
        mimeType = 'application/x-yaml';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: `OpenAPI spec downloaded as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download spec",
        variant: "destructive",
      });
    }
  };

  // Simple JSON to YAML converter (handles common cases)
  const jsonToYaml = (obj: any, indent = 0): string => {
    const spaces = '  '.repeat(indent);
    let result = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          result += `${spaces}-\n${jsonToYaml(item, indent + 1).replace(/^  /, '')}`;
        } else {
          result += `${spaces}- ${formatYamlValue(item)}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value) && value.length === 0) {
            result += `${spaces}${key}: []\n`;
          } else if (typeof value === 'object' && Object.keys(value).length === 0) {
            result += `${spaces}${key}: {}\n`;
          } else {
            result += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
          }
        } else {
          result += `${spaces}${key}: ${formatYamlValue(value)}\n`;
        }
      }
    }

    return result;
  };

  const formatYamlValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      if (value.includes('\n') || value.includes(':') || value.includes('#') ||
          value.includes('"') || value.includes("'") || value.startsWith(' ') ||
          value.endsWith(' ') || /^[\d.]+$/.test(value) || value === '') {
        return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      }
      return value;
    }
    return String(value);
  };

  const openInSwaggerEditor = () => {
    const specUrl = encodeURIComponent(`${window.location.origin}/openapi.json`);
    window.open(`https://editor.swagger.io/?url=${specUrl}`, '_blank');
  };

  const codeExamples = {
    curl: `# Test your API connection
curl ${apiBaseUrl}/api-stages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# Create a new job
curl -X POST ${apiBaseUrl}/api-jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_number": "JOB-2024-001",
    "customer": "Acme Corp",
    "due_date": "2024-12-31",
    "parts": [{
      "part_number": "BRACKET-001",
      "material": "Steel 304",
      "quantity": 10
    }]
  }'`,

    javascript: `// Using fetch API
const apiKey = 'YOUR_API_KEY';
const baseUrl = '${apiBaseUrl}';

// Fetch stages
async function getStages() {
  const response = await fetch(\`\${baseUrl}/api-stages\`, {
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data;
}

// Create a job
async function createJob(jobData) {
  const response = await fetch(\`\${baseUrl}/api-jobs\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(jobData)
  });

  const data = await response.json();
  return data;
}

// Example usage
const newJob = {
  job_number: 'JOB-2024-001',
  customer: 'Acme Corp',
  due_date: '2024-12-31',
  parts: [{
    part_number: 'BRACKET-001',
    material: 'Steel 304',
    quantity: 10
  }]
};

createJob(newJob).then(console.log);`,

    python: `import requests
import json

API_KEY = 'YOUR_API_KEY'
BASE_URL = '${apiBaseUrl}'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Test connection
response = requests.get(f'{BASE_URL}/api-stages', headers=headers)
print(response.json())

# Create a job
job_data = {
    'job_number': 'JOB-2024-001',
    'customer': 'Acme Corp',
    'due_date': '2024-12-31',
    'parts': [{
        'part_number': 'BRACKET-001',
        'material': 'Steel 304',
        'quantity': 10
    }]
}

response = requests.post(
    f'{BASE_URL}/api-jobs',
    headers=headers,
    json=job_data
)

print(response.json())`,

    nodejs: `// Using axios (npm install axios)
const axios = require('axios');

const apiClient = axios.create({
  baseURL: '${apiBaseUrl}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

// Get stages
apiClient.get('/api-stages')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Create a job
const jobData = {
  job_number: 'JOB-2024-001',
  customer: 'Acme Corp',
  due_date: '2024-12-31',
  parts: [{
    part_number: 'BRACKET-001',
    material: 'Steel 304',
    quantity: 10
  }]
};

apiClient.post('/api-jobs', jobData)
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`
  };

  // Custom Swagger UI plugin to inject API key
  const ApiKeyPlugin = () => {
    return {
      wrapComponents: {
        authorizeBtn: (Original: any) => (props: any) => {
          return null; // Hide default authorize button
        }
      }
    };
  };

  return (
    <>
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="h-8 w-8 text-primary" />
                  Eryxon Flow API
                </CardTitle>
                <CardDescription className="text-base">
                  Production workflow management API for custom metals fabrication.
                  Build integrations, automate workflows, and manage your production data programmatically.
                  See <a href="https://eryxon.eu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">full documentation</a>.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                v1.0.0
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <Zap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">REST API</div>
                  <div className="text-xs text-muted-foreground">JSON-based RESTful API</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <KeyRound className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">API Key Auth</div>
                  <div className="text-xs text-muted-foreground">Secure bearer token authentication</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <PlayCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">Interactive Docs</div>
                  <div className="text-xs text-muted-foreground">Test endpoints directly in browser</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download & Tools Section */}
        <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              OpenAPI Specification
            </CardTitle>
            <CardDescription>
              Download the spec to use with Swagger, Postman, or generate client SDKs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Download JSON */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2"
                onClick={() => downloadSpec('json')}
              >
                <FileJson className="h-5 w-5 text-orange-500" />
                <div className="text-center">
                  <div className="font-semibold text-sm">Download JSON</div>
                  <div className="text-xs text-muted-foreground">OpenAPI 3.0 spec</div>
                </div>
              </Button>

              {/* Download YAML */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2"
                onClick={() => downloadSpec('yaml')}
              >
                <FileCode className="h-5 w-5 text-green-500" />
                <div className="text-center">
                  <div className="font-semibold text-sm">Download YAML</div>
                  <div className="text-xs text-muted-foreground">Human-readable format</div>
                </div>
              </Button>

              {/* Open in Swagger Editor */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2"
                onClick={openInSwaggerEditor}
              >
                <ExternalLink className="h-5 w-5 text-blue-500" />
                <div className="text-center">
                  <div className="font-semibold text-sm">Swagger Editor</div>
                  <div className="text-xs text-muted-foreground">Edit & validate online</div>
                </div>
              </Button>

              {/* Copy Spec URL */}
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2"
                onClick={() => copyToClipboard(`${window.location.origin}/openapi.json`, "Spec URL")}
              >
                <LinkIcon className="h-5 w-5 text-purple-500" />
                <div className="text-center">
                  <div className="font-semibold text-sm">Copy Spec URL</div>
                  <div className="text-xs text-muted-foreground">Direct link to JSON</div>
                </div>
              </Button>
            </div>

            {/* Postman Import Instructions */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm">Import to Postman</div>
                  <div className="text-xs text-muted-foreground">
                    Open Postman → Import → Link → Paste: <code className="px-1.5 py-0.5 bg-background rounded text-[10px]">{window.location.origin}/openapi.json</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs mt-1"
                    onClick={() => copyToClipboard(`${window.location.origin}/openapi.json`, "Postman import URL")}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>

            {/* Related Resources */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/admin/data-import">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileUp className="h-4 w-4" />
                  CSV Import Wizard
                </Button>
              </Link>
              <Link to="/help">
                <Button variant="outline" size="sm" className="gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Help & Guides
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="quickstart" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-grid">
            <TabsTrigger value="quickstart" className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Quick Start
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Code Examples
            </TabsTrigger>
            <TabsTrigger value="tryit" className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Try It Out
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Full Reference
            </TabsTrigger>
          </TabsList>

          {/* Quick Start Tab */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Getting Started in 3 Steps
                </CardTitle>
                <CardDescription>
                  Start making API calls in minutes with this beginner-friendly guide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      1
                    </div>
                    <h3 className="text-lg font-semibold">Generate an API Key</h3>
                  </div>
                  <div className="ml-11 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Navigate to <strong>Admin &gt; API Keys</strong> in the web interface and generate a new API key.
                      Your key will start with <code className="px-2 py-1 bg-muted rounded text-xs">ery_live_</code> or <code className="px-2 py-1 bg-muted rounded text-xs">ery_test_</code>
                    </p>
                    <Alert>
                      <KeyRound className="h-4 w-4" />
                      <AlertTitle>Keep your API key secure!</AlertTitle>
                      <AlertDescription>
                        Your API key is shown only once. Store it securely and never commit it to version control.
                      </AlertDescription>
                    </Alert>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/admin/config/api-keys'}
                      className="mt-2"
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Go to API Keys
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Step 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      2
                    </div>
                    <h3 className="text-lg font-semibold">Test Your Connection</h3>
                  </div>
                  <div className="ml-11 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Make your first API call to verify your key works. We recommend starting with the read-only <code className="px-2 py-1 bg-muted rounded text-xs">/api-stages</code> endpoint.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Base URL:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiBaseUrl, "Base URL")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-md font-mono text-xs overflow-x-auto">
                        {apiBaseUrl}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">cURL Example:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(
                            `curl ${apiBaseUrl}/api-stages -H "Authorization: Bearer YOUR_API_KEY"`,
                            "cURL command"
                          )}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <pre className="p-4 bg-code-bg text-code-fg rounded-md overflow-x-auto text-xs">
                        {`curl ${apiBaseUrl}/api-stages \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                      </pre>
                    </div>
                    <Alert className="bg-alert-success-bg border-alert-success-border">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <AlertTitle className="text-success">Expected Response</AlertTitle>
                      <AlertDescription className="text-success">
                        <pre className="mt-2 text-xs overflow-x-auto">
                          {`{
  "success": true,
  "data": {
    "stages": [...]
  }
}`}
                        </pre>
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <Separator />

                {/* Step 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      3
                    </div>
                    <h3 className="text-lg font-semibold">Start Building</h3>
                  </div>
                  <div className="ml-11 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Explore the API Reference below to see all available endpoints and try them interactively.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card className="p-4 space-y-2">
                        <div className="font-semibold text-sm">Common Use Cases</div>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Create jobs from ERP systems</li>
                          <li>Track production progress</li>
                          <li>Update task completion</li>
                          <li>Query job status and metrics</li>
                        </ul>
                      </Card>
                      <Card className="p-4 space-y-2">
                        <div className="font-semibold text-sm">Best Practices</div>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Use pagination for large datasets</li>
                          <li>Implement exponential backoff</li>
                          <li>Handle rate limit headers</li>
                          <li>Validate responses</li>
                        </ul>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code Examples Tab */}
          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Code Examples
                </CardTitle>
                <CardDescription>
                  Ready-to-use code snippets in multiple programming languages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="curl" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>

                  {Object.entries(codeExamples).map(([lang, code]) => (
                    <TabsContent key={lang} value={lang}>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 z-10"
                          onClick={() => copyToClipboard(code, `${lang} code`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <pre className="p-4 bg-code-bg text-code-fg rounded-md overflow-x-auto text-xs">
                          {code}
                        </pre>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Authentication Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  All API requests require authentication using an API key in the Authorization header:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Header Format:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard("Authorization: Bearer YOUR_API_KEY", "Header")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre className="p-3 bg-muted rounded-md font-mono text-xs">
                    Authorization: Bearer ery_live_your_api_key_here
                  </pre>
                </div>
                <Alert>
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Rate Limiting</AlertTitle>
                  <AlertDescription>
                    API requests are rate-limited. Check the <code>X-RateLimit-*</code> headers in responses
                    for current limits and usage.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Try It Out Tab - Interactive Testing */}
          <TabsContent value="tryit" className="space-y-4">
            <Card className="border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-green-500" />
                  Interactive API Testing
                </CardTitle>
                <CardDescription>
                  Test API endpoints directly in your browser. No additional tools required!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>How to Test</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                      <li>Click the <strong>"Authorize"</strong> button below (green lock icon)</li>
                      <li>Enter your API key: <code className="px-1 py-0.5 bg-muted rounded text-xs">ery_live_xxxxx</code></li>
                      <li>Expand any endpoint and click <strong>"Try it out"</strong></li>
                      <li>Fill in parameters and click <strong>"Execute"</strong></li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* Quick Test Endpoints */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="p-4 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">GET</Badge>
                      <span className="font-mono text-sm">/api-stages</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Best endpoint to test your API key. Returns all production stages.</p>
                  </Card>
                  <Card className="p-4 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">GET</Badge>
                      <span className="font-mono text-sm">/api-jobs</span>
                    </div>
                    <p className="text-xs text-muted-foreground">List all jobs with filtering. Test pagination with limit/offset.</p>
                  </Card>
                  <Card className="p-4 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">POST</Badge>
                      <span className="font-mono text-sm">/api-jobs</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Create a new job. Includes example request body.</p>
                  </Card>
                  <Card className="p-4 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">PUT</Badge>
                      <span className="font-mono text-sm">/api-jobs/sync</span>
                    </div>
                    <p className="text-xs text-muted-foreground">ERP sync endpoint. Upsert by external_id.</p>
                  </Card>
                </div>

                <Separator />

                <div className="swagger-container">
                  <SwaggerUI
                    url="/openapi.json"
                    deepLinking={true}
                    displayRequestDuration={true}
                    filter={true}
                    showExtensions={true}
                    showCommonExtensions={true}
                    persistAuthorization={true}
                    tryItOutEnabled={true}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Reference Tab - Full Spec */}
          <TabsContent value="reference" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Complete API Reference
                </CardTitle>
                <CardDescription>
                  Full OpenAPI specification with all endpoints, schemas, and examples.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSpec('json')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSpec('yaml')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download YAML
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openInSwaggerEditor}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Swagger Editor
                  </Button>
                </div>
                <div className="swagger-container">
                  <SwaggerUI
                    url="/openapi.json"
                    deepLinking={true}
                    displayRequestDuration={true}
                    filter={true}
                    showExtensions={true}
                    showCommonExtensions={true}
                    persistAuthorization={true}
                    tryItOutEnabled={true}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        .swagger-container {
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .swagger-ui {
          font-family: inherit !important;
        }

        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 0 !important;
        }

        .swagger-ui .scheme-container {
          background: transparent;
          box-shadow: none;
          padding: 0;
          margin: 0;
        }
      `}</style>
    </>
  );
}
