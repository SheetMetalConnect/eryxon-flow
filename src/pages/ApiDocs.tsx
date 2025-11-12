import { useEffect, useState } from "react";
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
  PlayCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

export default function ApiDocs() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/supabase', '') || "https://vatgianzotsurljznsry.supabase.co";
  const apiBaseUrl = `${baseUrl}/functions/v1`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
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
    <Layout>
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
                  Production workflow management API for sheet metal manufacturing.
                  Build integrations, automate workflows, and manage your production data programmatically.
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

        <Tabs defaultValue="quickstart" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full md:w-auto md:inline-grid">
            <TabsTrigger value="quickstart" className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Quick Start
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Code Examples
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              API Reference
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
                      <pre className="p-4 bg-slate-950 text-green-400 rounded-md overflow-x-auto text-xs">
{`curl ${apiBaseUrl}/api-stages \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                      </pre>
                    </div>
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-800 dark:text-green-300">Expected Response</AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-400">
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
                        <pre className="p-4 bg-slate-950 text-green-400 rounded-md overflow-x-auto text-xs">
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

          {/* API Reference Tab */}
          <TabsContent value="reference" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Interactive API Reference
                </CardTitle>
                <CardDescription>
                  Explore all endpoints and test them directly in your browser.
                  Click "Authorize" and enter your API key to start testing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <PlayCircle className="h-4 w-4" />
                  <AlertTitle>Try it out!</AlertTitle>
                  <AlertDescription>
                    Click "Authorize" in the panel below, enter your API key (with the <code>ery_live_</code> or <code>ery_test_</code> prefix),
                    then click any endpoint to test it directly.
                  </AlertDescription>
                </Alert>
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
    </Layout>
  );
}
