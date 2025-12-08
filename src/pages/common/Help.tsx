"use client";

import * as React from "react";
import { Link } from "react-router-dom";
import {
  Play,
  User,
  Shield,
  Bug,
  ChevronDown,
  Clock,
  FileText,
  CheckCircle,
  Code,
  Wrench,
  ExternalLink,
  Sparkles,
  Calendar,
  GitBranch,
  RefreshCw,
  FileUp,
  Database,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

export default function Help() {
  const [releases, setReleases] = React.useState<Release[]>([]);
  const [releasesLoading, setReleasesLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/releases.json')
      .then(res => res.json())
      .then((data: ReleasesData) => {
        setReleases(data.releases || []);
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
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Help</h1>
        <p className="text-lg text-muted-foreground">How to use Eryxon MES</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/admin/api-docs">
          <Card className="glass-card hover:bg-white/5 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <Code className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-semibold mb-1">API Docs</h3>
              <p className="text-sm text-muted-foreground">Complete API reference</p>
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
              <FileText className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-semibold mb-1">GitHub</h3>
              <p className="text-sm text-muted-foreground">Source and docs</p>
            </CardContent>
          </Card>
        </a>

        <Link to="/admin/about">
          <Card className="glass-card hover:bg-white/5 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <Wrench className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-semibold mb-1">About</h3>
              <p className="text-sm text-muted-foreground">About Eryxon MES</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <Card className="glass-card">
        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="w-full justify-start border-b border-white/10 rounded-none bg-transparent h-auto p-0 overflow-x-auto">
            <TabsTrigger
              value="getting-started"
              className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2 px-4 py-3"
            >
              <Play className="h-4 w-4" />
              Getting Started
            </TabsTrigger>
            <TabsTrigger
              value="operators"
              className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2 px-4 py-3"
            >
              <User className="h-4 w-4" />
              For Operators
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2 px-4 py-3"
            >
              <Shield className="h-4 w-4" />
              For Admins
            </TabsTrigger>
            <TabsTrigger
              value="faq"
              className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2 px-4 py-3"
            >
              <Bug className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger
              value="whats-new"
              className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2 px-4 py-3"
            >
              <Sparkles className="h-4 w-4" />
              What's New
            </TabsTrigger>
            <TabsTrigger
              value="erp-integration"
              className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2 px-4 py-3"
            >
              <RefreshCw className="h-4 w-4" />
              ERP Integration
            </TabsTrigger>
          </TabsList>

          {/* Getting Started Tab */}
          <TabsContent value="getting-started" className="p-6">
            <h2 className="text-2xl font-semibold mb-2">Getting Started</h2>
            <p className="text-muted-foreground mb-4">
              Eryxon MES is a manufacturing execution system for sheet metal fabrication.
            </p>

            <Alert className="mb-6 bg-primary/10 border-primary/30">
              <AlertTitle className="font-semibold">Your role determines what you can access</AlertTitle>
              <AlertDescription>
                <strong>Operators</strong> execute work and track time. <strong>Admins</strong> manage jobs, configure settings, and oversee production.
              </AlertDescription>
            </Alert>

            <h3 className="text-lg font-semibold mb-3 mt-6">How It Works</h3>
            <div className="space-y-3">
              {[
                { title: "1. Jobs are created by admins", desc: "Each job represents a customer order or manufacturing project" },
                { title: "2. Jobs contain Parts", desc: "Parts can be standalone components or assemblies made of multiple parts" },
                { title: "3. Parts have Operations", desc: "Operations are specific tasks (cutting, bending, welding, etc.) performed on parts" },
                { title: "4. Operators execute operations", desc: "Track time, report issues, and mark work complete from the Work Queue" },
                { title: "5. Real-time tracking", desc: "Admins see live updates of production progress on the dashboard" },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6 bg-white/10" />

            <h3 className="text-lg font-semibold mb-4">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Clock, title: "Time Tracking", desc: "Track actual time vs. estimated time. Pause and resume as needed." },
                { icon: Bug, title: "Issue Management", desc: "Report production issues with photos. Admins review and resolve issues." },
                { icon: Wrench, title: "3D CAD Viewer", desc: "View STEP files in browser with 3D controls, wireframe mode, and exploded views." },
                { icon: Code, title: "API Integration", desc: "Connect with ERP and other systems via REST API with webhooks." },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Card key={i} className="border-white/10 bg-white/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">{item.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* For Operators Tab */}
          <TabsContent value="operators" className="p-6">
            <h2 className="text-2xl font-semibold mb-2">Operator Guide</h2>
            <p className="text-muted-foreground mb-6">
              As an operator, you'll spend most of your time in the Work Queue executing operations.
            </p>

            <h3 className="text-lg font-semibold mb-3">Daily Workflow</h3>
            <Accordion type="single" collapsible defaultValue="item-1" className="space-y-2">
              <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  1. View Your Work Queue
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">
                    After logging in, you'll see your <strong className="text-foreground">Work Queue</strong> with all operations assigned to you.
                  </p>
                  <ul className="space-y-2">
                    <li><strong className="text-foreground">Filter by status, material, or cell</strong> - Use the filter buttons at the top</li>
                    <li><strong className="text-foreground">Search by part or job number</strong> - Use Cmd+K (Mac) or Ctrl+K (Windows)</li>
                    <li><strong className="text-foreground">Sort by priority or due date</strong> - Click column headers</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  2. Start an Operation
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">Click on an operation card to open details:</p>
                  <ul className="space-y-2 mb-4">
                    <li><strong className="text-foreground">Review operation details</strong> - Check part number, material, and any special notes</li>
                    <li><strong className="text-foreground">View CAD files (if available)</strong> - Click 'View 3D' to see STEP files</li>
                    <li><strong className="text-foreground">Click 'Start Timing'</strong> - This begins tracking your time</li>
                  </ul>
                  <Alert className="bg-yellow-500/10 border-yellow-500/30">
                    <AlertDescription>
                      You can only time one operation at a time. Starting a new operation will stop timing on the previous one.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  3. During Work
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">While working on an operation:</p>
                  <ul className="space-y-2">
                    <li><strong className="text-foreground">The timer runs automatically</strong> - You'll see elapsed time in the Currently Timing widget</li>
                    <li><strong className="text-foreground">Pause if needed</strong> - Taking a break? Click 'Pause' - pause time won't count</li>
                    <li><strong className="text-foreground">Report issues</strong> - If you encounter problems, click 'Report Issue'</li>
                    <li><strong className="text-foreground">Add photos to issues</strong> - Use your device camera to document problems</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  4. Complete the Operation
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">When you're done:</p>
                  <ul className="space-y-2">
                    <li><strong className="text-foreground">Click 'Stop Timing'</strong> - This records your actual time</li>
                    <li><strong className="text-foreground">Mark as complete</strong> - Click 'Complete Operation'</li>
                    <li><strong className="text-foreground">Move to next operation</strong> - Return to Work Queue</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  5. Review Your Activity
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">
                    Click <strong className="text-foreground">My Activity</strong> in the navigation to see:
                  </p>
                  <ul className="space-y-2">
                    <li>Your completed work for the last 7 days</li>
                    <li>Time spent on each operation</li>
                    <li>Total hours worked</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3 mt-8">Shop Floor Terminals</h3>
            <Accordion type="single" collapsible className="space-y-2 mb-8">
              <AccordionItem value="terminal-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  Shared Terminal Login (PIN)
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">
                    Shared factory terminals use a two-step login:
                  </p>
                  <ol className="space-y-2 mb-4">
                    <li><strong className="text-foreground">1. Terminal Account</strong> - Admin logs in with the shop floor account</li>
                    <li><strong className="text-foreground">2. Operator PIN</strong> - Operators clock in with their Employee ID + PIN</li>
                  </ol>
                  <Alert className="bg-primary/10 border-primary/30">
                    <AlertDescription>
                      Your Employee ID and PIN are provided by your admin. PINs are 4-6 digits.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="terminal-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  Switching Operators
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">
                    You can quickly switch operators without logging out of the terminal:
                  </p>
                  <ul className="space-y-2">
                    <li><strong className="text-foreground">Header Badge</strong> - Click your name in the header to see who's clocked in</li>
                    <li><strong className="text-foreground">Switch Operator</strong> - Click "Switch Operator" to enter a different Employee ID + PIN</li>
                    <li><strong className="text-foreground">Time Attribution</strong> - All time tracking and issues are attributed to the active operator</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3 mt-8">Tips for Operators</h3>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {[
                    "Always start timing before you begin work",
                    "Pause the timer during breaks or interruptions",
                    "Report issues immediately when they occur",
                    "Take photos of issues for documentation",
                    "Mark operations complete as soon as you finish",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* For Admins Tab */}
          <TabsContent value="admins" className="p-6">
            <h2 className="text-2xl font-semibold mb-2">Admin Guide</h2>
            <p className="text-muted-foreground mb-6">
              As an admin, you have full access to manage jobs, configure the system, and oversee production.
            </p>

            <h3 className="text-lg font-semibold mb-3">Key Admin Tasks</h3>
            <Accordion type="single" collapsible defaultValue="admin-1" className="space-y-2">
              <AccordionItem value="admin-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  Creating Jobs
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>
                    Navigate to <strong className="text-foreground">Jobs → Create New Job</strong>
                  </p>
                  <div>
                    <p className="font-medium text-foreground mb-2">Step 1: Job Details</p>
                    <ul className="space-y-1 text-sm">
                      <li><strong>Job Number</strong> - Unique identifier (e.g., JOB-001)</li>
                      <li><strong>Customer Name</strong> - Who is this for?</li>
                      <li><strong>Due Date</strong> - When does the customer need it?</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-2">Step 2: Add Parts</p>
                    <ul className="space-y-1 text-sm">
                      <li><strong>Part Number</strong> - Unique within this job</li>
                      <li><strong>Material</strong> - Select from your catalog</li>
                      <li><strong>Quantity</strong> - How many to make</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-2">Step 3: Add Operations</p>
                    <ul className="space-y-1 text-sm">
                      <li><strong>Operation Name</strong> - E.g., Laser Cut, Bend 90°</li>
                      <li><strong>Cell/Stage</strong> - Cutting, Bending, etc.</li>
                      <li><strong>Estimated Time</strong> - How long (minutes)</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="admin-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  Assigning Work
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">
                    Go to <strong className="text-foreground">Assignments</strong> page:
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li>Select a part from available parts in active jobs</li>
                    <li>Select an operator to assign the work</li>
                    <li>Click Assign - Operator will see this in their Work Queue</li>
                  </ul>
                  <Alert className="bg-primary/10 border-primary/30">
                    <AlertDescription>
                      You can assign the same part to multiple operators for collaborative work.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="admin-3" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  Managing Issues
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">
                    When operators report issues, they appear in <strong className="text-foreground">Issues</strong> page:
                  </p>
                  <ul className="space-y-2">
                    <li><strong>Review issue details</strong> - Read description, view photos</li>
                    <li><strong>Approve if valid</strong> - Confirms it needs fixing</li>
                    <li><strong>Reject if not valid</strong> - Reported in error</li>
                    <li><strong>Close when resolved</strong> - Mark as fixed</li>
                    <li><strong>Add resolution notes</strong> - Document how it was resolved</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="admin-4" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  Configuring the System
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p className="font-medium text-foreground">Settings Menu:</p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-foreground text-sm">Stages/Cells</p>
                      <p className="text-sm">Define workflow stages (Cutting, Bending, Welding)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Materials</p>
                      <p className="text-sm">Create catalog (Steel 1018, Aluminum 6061)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Resources</p>
                      <p className="text-sm">Track tools, fixtures, molds, equipment</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Users</p>
                      <p className="text-sm">Create admin accounts with email login</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Operators</p>
                      <p className="text-sm">Create shop floor operators with Employee ID + PIN login</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">API Keys</p>
                      <p className="text-sm">Generate keys for external integrations</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Webhooks</p>
                      <p className="text-sm">Real-time notifications to external systems</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3 mt-8">Best Practices</h3>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {[
                    "Set up your workflow cells first - this makes job creation easier",
                    "Create a materials catalog before adding jobs",
                    "Review the dashboard daily to catch issues early",
                    "Respond to issues quickly",
                    "Export data regularly for backups",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>

            <h3 className="text-lg font-semibold mb-3">General</h3>
            <Accordion type="single" collapsible className="space-y-2 mb-8">
              <AccordionItem value="faq-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  What's the difference between Jobs, Parts, and Operations?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">Job:</strong> A customer order or manufacturing project</p>
                  <p><strong className="text-foreground">Part:</strong> An individual component within a job</p>
                  <p><strong className="text-foreground">Operation:</strong> A specific task performed on a part</p>
                  <p><strong className="text-foreground">Hierarchy:</strong> Job → Parts → Operations</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  Can I time multiple operations at once?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  No, you can only time one operation at a time per operator. Starting a new timer automatically stops any previous one.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  What happens to pause time?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">Pause time is tracked separately. When you stop timing:</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-sm font-mono overflow-x-auto">
{`Total Time = Stop Time - Start Time
Pause Time = Sum of all pauses
Effective Time = Total Time - Pause Time`}
                  </pre>
                  <p className="mt-3">Only Effective Time counts toward the operation's actual time.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  How do assemblies work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">Assemblies are parts that contain other parts:</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-sm font-mono overflow-x-auto">
{`Bracket Assembly (parent)
├── Left Plate (child)
├── Right Plate (child)
└── Mounting Bracket (child)`}
                  </pre>
                  <p className="mt-3">Each part can have its own operations.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3">Troubleshooting</h3>
            <Accordion type="single" collapsible className="space-y-2 mb-8">
              <AccordionItem value="trouble-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  I don't see any operations in my Work Queue
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">Check 1:</strong> Make sure work has been assigned to you by an admin.</p>
                  <p><strong className="text-foreground">Check 2:</strong> Clear all filters to see if operations appear.</p>
                  <p><strong className="text-foreground">Check 3:</strong> You might have completed all assigned work. Check "My Activity".</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="trouble-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  Timer doesn't start when I click "Start Timing"
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">Cause:</strong> You likely have another operation already timing.</p>
                  <p><strong className="text-foreground">Solution:</strong> Check the "Currently Timing" widget at the top. Stop that timer first.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="trouble-3" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  3D CAD viewer won't load my STEP file
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">Check 1:</strong> Is the file a valid STEP format (.step or .stp)?</p>
                  <p><strong className="text-foreground">Check 2:</strong> File size - Maximum is 50MB.</p>
                  <p><strong className="text-foreground">Check 3:</strong> Try re-exporting from your CAD software.</p>
                  <p><strong className="text-foreground">Check 4:</strong> Click "Fit View" if the model appears off-screen.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3">API & Integration</h3>
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="api-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  How do I get API access?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">Step 1:</strong> Go to Settings → API Keys</p>
                  <p><strong className="text-foreground">Step 2:</strong> Click "Generate New API Key"</p>
                  <p><strong className="text-foreground">Step 3:</strong> Copy the key immediately (shown only once)</p>
                  <p><strong className="text-foreground">Step 4:</strong> Use in Authorization header: <code className="bg-black/30 px-1.5 py-0.5 rounded text-sm">Authorization: Bearer ery_live_xxxxx</code></p>
                  <Alert className="mt-4 bg-yellow-500/10 border-yellow-500/30">
                    <AlertDescription>
                      Store your API key securely. It cannot be retrieved later.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="api-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="hover:no-underline">
                  How do webhooks work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-3">Webhooks send HTTP POST notifications to your server when events occur:</p>
                  <ul className="space-y-1 mb-4">
                    <li><code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">operation.started</code> - When operator starts timing</li>
                    <li><code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">operation.completed</code> - When operation finishes</li>
                    <li><code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">issue.created</code> - When issue is reported</li>
                    <li><code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">job.created</code> - When new job is created</li>
                  </ul>
                  <p><strong className="text-foreground">Setup:</strong> Go to Settings → Webhooks → Add endpoint URL → Select events</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* What's New Tab */}
          <TabsContent value="whats-new" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">What's New</h2>
                <p className="text-muted-foreground">
                  Latest updates and improvements to Eryxon MES
                </p>
              </div>
              <a
                href="https://github.com/SheetMetalConnect/eryxon-flow/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all releases
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {releasesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : releases.length === 0 ? (
              <Alert className="bg-primary/10 border-primary/30">
                <AlertDescription>
                  No release notes available yet. Check back after the next release.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                {releases.map((release, index) => (
                  <Card key={release.version} className={cn(
                    "border-white/10",
                    index === 0 ? "bg-primary/5 border-primary/20" : "bg-white/5"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">
                            v{release.version}
                          </CardTitle>
                          {index === 0 && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(release.date)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <GitBranch className="h-3.5 w-3.5" />
                            <code className="text-xs">{release.sha}</code>
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {release.changes.map((change, changeIndex) => (
                          <li key={changeIndex} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ERP Integration Tab */}
          <TabsContent value="erp-integration" className="p-6">
            <h2 className="text-2xl font-semibold mb-2">ERP Integration Guide</h2>
            <p className="text-muted-foreground mb-6">
              Sync data between Eryxon MES and your external ERP system (SAP, NetSuite, Odoo, etc.)
            </p>

            <Alert className="mb-6 bg-primary/10 border-primary/30">
              <ArrowRightLeft className="h-4 w-4" />
              <AlertTitle>Two-Way Sync Architecture</AlertTitle>
              <AlertDescription>
                Eryxon supports both <strong>REST API</strong> for real-time individual updates and <strong>CSV batch import</strong> for mass data loading.
              </AlertDescription>
            </Alert>

            <h3 className="text-lg font-semibold mb-3">Integration Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Unified ERP Sync</h4>
                    <Badge variant="secondary" className="ml-auto text-xs">New</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Optimized bulk sync with change detection. Preview changes before syncing.</p>
                  <ul className="text-xs space-y-1">
                    <li><code className="bg-black/30 px-1.5 py-0.5 rounded">POST /api-erp-sync/diff</code> - Preview changes</li>
                    <li><code className="bg-black/30 px-1.5 py-0.5 rounded">POST /api-erp-sync/sync</code> - Execute sync</li>
                    <li><code className="bg-black/30 px-1.5 py-0.5 rounded">GET /api-erp-sync/status</code> - Sync history</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Entity Sync</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Per-entity sync endpoints for individual records or bulk operations.</p>
                  <ul className="text-xs space-y-1">
                    <li><code className="bg-black/30 px-1.5 py-0.5 rounded">PUT /api-jobs/sync</code> - Upsert single job</li>
                    <li><code className="bg-black/30 px-1.5 py-0.5 rounded">POST /api-jobs/bulk-sync</code> - Batch up to 1000</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">CSV Batch Import</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Upload CSV files for mass data import. Includes field mapping wizard.</p>
                  <Link to="/admin/data-import" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Go to Data Import
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-lg font-semibold mb-3">Unified ERP Sync API</h3>
            <Alert className="mb-4 bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Recommended for ERP Integrations</AlertTitle>
              <AlertDescription>
                The unified <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">/api-erp-sync</code> endpoint is optimized for ERP systems with change detection, batch operations, and detailed status reporting.
              </AlertDescription>
            </Alert>
            <Accordion type="single" collapsible defaultValue="unified-1" className="space-y-2 mb-8">
              <AccordionItem value="unified-1" className="border border-primary/20 rounded-lg px-4 bg-primary/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    Preview Changes (Diff)
                    <Badge variant="secondary" className="ml-2 text-xs">New</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>Check what would change <strong>without</strong> modifying data. Perfect for incremental sync validation.</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`POST /api-erp-sync/diff
{
  "jobs": [
    { "external_id": "SO-001", "external_source": "SAP", "job_number": "JOB-001" },
    { "external_id": "SO-002", "external_source": "SAP", "job_number": "JOB-002" }
  ],
  "parts": [...],
  "resources": [...]
}`}
                  </pre>
                  <p className="font-medium text-foreground text-sm mt-4 mb-2">Response shows status for each record:</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`{
  "summary": { "total_to_create": 1, "total_to_update": 1, "total_unchanged": 0 },
  "entities": {
    "jobs": {
      "records": [
        { "external_id": "SO-001", "status": "create" },
        { "external_id": "SO-002", "status": "update", "changes": ["customer: Old -> New"] }
      ]
    }
  }
}`}
                  </pre>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="unified-2" className="border border-primary/20 rounded-lg px-4 bg-primary/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    Execute Sync
                    <Badge variant="secondary" className="ml-2 text-xs">New</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>Sync jobs, parts, and resources in a single request. Skips unchanged records automatically.</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`POST /api-erp-sync/sync
{
  "jobs": [
    {
      "external_id": "SO-12345",
      "external_source": "SAP",
      "job_number": "JOB-2024-001",
      "customer_name": "Acme Corp",
      "due_date": "2024-12-31"
    }
  ],
  "parts": [
    {
      "external_id": "SO-12345-10",
      "external_source": "SAP",
      "job_external_id": "SO-12345",
      "part_number": "BRACKET-A",
      "material": "Steel 1018",
      "quantity": 25
    }
  ],
  "options": {
    "skip_unchanged": true,
    "continue_on_error": true
  }
}`}
                  </pre>
                  <p className="font-medium text-foreground text-sm mt-4 mb-2">Response includes detailed results:</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`{
  "summary": {
    "total_created": 1, "total_updated": 0,
    "total_skipped": 0, "total_errors": 0,
    "duration_ms": 245
  },
  "entities": {
    "jobs": { "created": 1, "results": [...] },
    "parts": { "created": 1, "results": [...] }
  }
}`}
                  </pre>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="unified-3" className="border border-primary/20 rounded-lg px-4 bg-primary/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Sync Status & History
                    <Badge variant="secondary" className="ml-2 text-xs">New</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>View sync history and statistics for auditing and troubleshooting.</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`GET /api-erp-sync/status?entity_type=jobs&limit=10`}
                  </pre>
                  <p className="font-medium text-foreground text-sm mt-4 mb-2">Response includes stats and history:</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`{
  "stats": {
    "total_syncs": 15,
    "successful": 14,
    "failed": 1,
    "total_created": 150,
    "total_updated": 45
  },
  "history": [
    {
      "source": "api_erp_sync",
      "entity_type": "jobs",
      "status": "completed",
      "created_count": 10,
      "completed_at": "2024-12-06T10:30:00Z"
    }
  ]
}`}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3">Per-Entity Sync Endpoints</h3>
            <Accordion type="single" collapsible className="space-y-2 mb-8">
              <AccordionItem value="sync-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Syncing Jobs (Sales Orders)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>Use the <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">external_id</code> field to link jobs to your ERP system.</p>
                  <div>
                    <p className="font-medium text-foreground text-sm mb-2">Single Job Sync:</p>
                    <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`PUT /api-jobs/sync
{
  "external_id": "SO-12345",
  "external_source": "SAP",
  "job_number": "JOB-2024-001",
  "customer": "Acme Corp",
  "due_date": "2024-12-31"
}`}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm mb-2">With Nested Parts & Operations:</p>
                    <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`PUT /api-jobs/sync
{
  "external_id": "SO-12345",
  "external_source": "SAP",
  "job_number": "JOB-2024-001",
  "parts": [{
    "external_id": "SO-12345-10",
    "part_number": "BRACKET-A",
    "quantity": 25,
    "operations": [{
      "external_id": "SO-12345-10-010",
      "operation_name": "Laser Cut",
      "cell_name": "Cutting"
    }]
  }]
}`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sync-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Bulk Sync (Up to 1000 Records)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>For batch operations, use the bulk-sync endpoint:</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`POST /api-jobs/bulk-sync
{
  "jobs": [
    { "external_id": "SO-001", "job_number": "JOB-001", ... },
    { "external_id": "SO-002", "job_number": "JOB-002", ... },
    ...up to 1000 records
  ]
}`}
                  </pre>
                  <p className="font-medium text-foreground text-sm mt-4 mb-2">Response includes individual results:</p>
                  <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "data": {
    "total": 100,
    "created": 75,
    "updated": 23,
    "errors": 2,
    "results": [...]
  }
}`}
                  </pre>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sync-3" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Available Sync Endpoints
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <Alert className="mb-4 bg-primary/10 border-primary/30">
                    <AlertDescription className="text-xs">
                      <strong>Tip:</strong> Use <code className="bg-black/30 px-1 rounded">/api-erp-sync</code> for multi-entity sync with change detection. Use per-entity endpoints below for simpler single-entity operations.
                    </AlertDescription>
                  </Alert>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-white/10">
                        <th className="pb-2">Entity</th>
                        <th className="pb-2">Single Sync</th>
                        <th className="pb-2">Bulk Sync</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      <tr className="border-b border-primary/20 bg-primary/5">
                        <td className="py-2 font-semibold">All (Unified)</td>
                        <td colSpan={2}><code>POST /api-erp-sync/sync</code> <span className="text-primary">(Recommended)</span></td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2">Jobs</td>
                        <td><code>PUT /api-jobs/sync</code></td>
                        <td><code>POST /api-jobs/bulk-sync</code></td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2">Parts</td>
                        <td><code>PUT /api-parts/sync</code></td>
                        <td><code>POST /api-parts/bulk-sync</code></td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2">Operations</td>
                        <td><code>PUT /api-operations/sync</code></td>
                        <td><code>POST /api-operations/bulk-sync</code></td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2">Cells</td>
                        <td><code>PUT /api-cells/sync</code></td>
                        <td><code>POST /api-cells/bulk-sync</code></td>
                      </tr>
                      <tr>
                        <td className="py-2">Resources</td>
                        <td><code>PUT /api-resources/sync</code></td>
                        <td><code>POST /api-resources/bulk-sync</code></td>
                      </tr>
                    </tbody>
                  </table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3">CSV Import Guide</h3>
            <Accordion type="single" collapsible className="space-y-2 mb-8">
              <AccordionItem value="csv-1" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-primary" />
                    How to Import CSV Data
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <ol className="space-y-2">
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">1.</span>
                      <span>Navigate to <strong className="text-foreground">Admin → Data Import</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">2.</span>
                      <span>Select the entity type (Jobs, Parts, Operations, etc.)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">3.</span>
                      <span>Download a template or upload your CSV file</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">4.</span>
                      <span>Map your CSV columns to Eryxon fields</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">5.</span>
                      <span>Preview validation results and fix any errors</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">6.</span>
                      <span>Click "Start Import" to process your data</span>
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="csv-2" className="border border-white/10 rounded-lg px-4 bg-white/5">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Required Fields by Entity
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-foreground text-sm mb-1">Jobs</p>
                      <p className="text-xs"><code className="bg-black/30 px-1.5 py-0.5 rounded">job_number</code> (required), customer, due_date, priority, notes, external_id</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm mb-1">Parts</p>
                      <p className="text-xs"><code className="bg-black/30 px-1.5 py-0.5 rounded">part_number</code>, <code className="bg-black/30 px-1.5 py-0.5 rounded">job_external_id</code> (required), material, quantity, notes, external_id</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm mb-1">Operations</p>
                      <p className="text-xs"><code className="bg-black/30 px-1.5 py-0.5 rounded">operation_name</code>, <code className="bg-black/30 px-1.5 py-0.5 rounded">part_external_id</code>, <code className="bg-black/30 px-1.5 py-0.5 rounded">cell_name</code> (required), sequence, estimated_time_minutes</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm mb-1">Cells</p>
                      <p className="text-xs"><code className="bg-black/30 px-1.5 py-0.5 rounded">name</code> (required), color, sequence, active, external_id</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm mb-1">Resources</p>
                      <p className="text-xs"><code className="bg-black/30 px-1.5 py-0.5 rounded">name</code>, <code className="bg-black/30 px-1.5 py-0.5 rounded">type</code> (required), description, identifier, location, status, external_id</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <h3 className="text-lg font-semibold mb-3 mt-8">Best Practices</h3>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {[
                    "Always include external_id and external_source for sync operations",
                    "Use bulk-sync for batch operations (up to 1000 records per request)",
                    "Sync cells/work centers before syncing operations that reference them",
                    "Use the CSV import wizard for initial data migration",
                    "Implement webhooks to receive real-time updates back to your ERP",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="mt-6 flex gap-4">
              <Link to="/admin/api-docs">
                <Button variant="outline" className="gap-2">
                  <Code className="h-4 w-4" />
                  View Full API Docs
                </Button>
              </Link>
              <Link to="/admin/data-import">
                <Button variant="outline" className="gap-2">
                  <FileUp className="h-4 w-4" />
                  Go to Data Import
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
