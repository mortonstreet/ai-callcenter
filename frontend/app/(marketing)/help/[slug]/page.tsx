"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ScrollReveal } from "@/components/landing";
import { ArrowLeft, Book, Zap, Phone, Settings, Code, HelpCircle, ChevronRight } from "lucide-react";

type DocSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

type DocPage = {
  title: string;
  description: string;
  icon: React.ElementType;
  sections: DocSection[];
};

const docPages: Record<string, DocPage> = {
  "getting-started": {
    title: "Getting Started",
    description: "Quick start guide to set up your RevCenter account and launch your first AI call agent.",
    icon: Book,
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        content: (
          <>
            <p>
              Welcome to RevCenter! This guide will walk you through setting up your account and launching your first AI call agent. Most customers are fully operational within 1-2 days.
            </p>
            <h4>What You&apos;ll Need</h4>
            <ul>
              <li>A business phone number (or we can provide one)</li>
              <li>Access to your field service management software (ServiceTitan, FieldPulse, etc.)</li>
              <li>Basic information about your services, pricing, and service areas</li>
            </ul>
            <h4>Overview of the Setup Process</h4>
            <ol>
              <li><strong>Account creation</strong> - Sign up and verify your business</li>
              <li><strong>Phone configuration</strong> - Connect your existing number or get a new one</li>
              <li><strong>FSM integration</strong> - Connect your field service management software</li>
              <li><strong>Agent training</strong> - Configure your AI agent with your business details</li>
              <li><strong>Testing</strong> - Make test calls and refine behavior</li>
              <li><strong>Go live</strong> - Start handling real customer calls</li>
            </ol>
          </>
        ),
      },
      {
        id: "account-setup",
        title: "Account Setup",
        content: (
          <>
            <p>
              Creating your RevCenter account takes just a few minutes. Here&apos;s what to expect:
            </p>
            <h4>Step 1: Sign Up</h4>
            <p>
              Visit <strong>app.revcenter.ai/signup</strong> and enter your email address. You&apos;ll receive a verification email to confirm your account.
            </p>
            <h4>Step 2: Business Information</h4>
            <p>
              Provide basic information about your business:
            </p>
            <ul>
              <li><strong>Company name</strong> - How you want your business identified on calls</li>
              <li><strong>Industry</strong> - HVAC, Plumbing, Electrical, etc.</li>
              <li><strong>Business address</strong> - For service area configuration</li>
              <li><strong>Primary contact</strong> - Who should receive account notifications</li>
            </ul>
            <h4>Step 3: Choose Your Plan</h4>
            <p>
              Select the plan that best fits your call volume. You can upgrade or downgrade at any time. All plans include a 14-day free trial.
            </p>
            <h4>Step 4: Team Invites (Optional)</h4>
            <p>
              Invite team members who need access to the RevCenter dashboard. You can assign different permission levels:
            </p>
            <ul>
              <li><strong>Admin</strong> - Full access to all settings and billing</li>
              <li><strong>Manager</strong> - Can configure agents and view all calls</li>
              <li><strong>Agent</strong> - Can view calls and handle transfers</li>
            </ul>
          </>
        ),
      },
      {
        id: "first-agent",
        title: "Your First AI Agent",
        content: (
          <>
            <p>
              Now for the fun part—configuring your AI call agent. The agent setup wizard guides you through each step.
            </p>
            <h4>Agent Basics</h4>
            <ul>
              <li><strong>Agent name</strong> - What your agent introduces itself as (e.g., &quot;Alex from Comfort Zone HVAC&quot;)</li>
              <li><strong>Voice selection</strong> - Choose from multiple natural-sounding voices</li>
              <li><strong>Language</strong> - Primary language with automatic multilingual detection</li>
            </ul>
            <h4>Services Configuration</h4>
            <p>
              Tell your agent what services you offer:
            </p>
            <ul>
              <li>Service types (repair, maintenance, installation, emergency)</li>
              <li>Pricing information (or &quot;quote required&quot;)</li>
              <li>Service area boundaries (zip codes or radius)</li>
              <li>Equipment brands serviced</li>
            </ul>
            <h4>Scheduling Rules</h4>
            <p>
              Configure how your agent books appointments:
            </p>
            <ul>
              <li><strong>Business hours</strong> - When appointments can be scheduled</li>
              <li><strong>Emergency availability</strong> - After-hours emergency service</li>
              <li><strong>Appointment duration</strong> - Default time slots for different service types</li>
              <li><strong>Lead time</strong> - Minimum advance booking required</li>
            </ul>
            <h4>Testing Your Agent</h4>
            <p>
              Before going live, test your agent thoroughly:
            </p>
            <ol>
              <li>Use the &quot;Test Call&quot; feature in the dashboard</li>
              <li>Try different scenarios: booking, inquiry, emergency, out-of-area</li>
              <li>Review transcripts and adjust responses as needed</li>
              <li>Have team members make test calls from their phones</li>
            </ol>
          </>
        ),
      },
    ],
  },
  integrations: {
    title: "Integrations",
    description: "Connect RevCenter with your field service management software for seamless appointment booking.",
    icon: Zap,
    sections: [
      {
        id: "servicetitan",
        title: "ServiceTitan Integration",
        content: (
          <>
            <p>
              ServiceTitan is our most popular integration. Connect in minutes for real-time availability checking and instant appointment booking.
            </p>
            <h4>Prerequisites</h4>
            <ul>
              <li>ServiceTitan account with API access enabled</li>
              <li>Admin permissions in ServiceTitan</li>
              <li>Your ServiceTitan Tenant ID</li>
            </ul>
            <h4>Setup Steps</h4>
            <ol>
              <li>In ServiceTitan, go to <strong>Settings → Integrations → API Applications</strong></li>
              <li>Create a new application with these scopes: Customers, Jobs, Appointments, Dispatch</li>
              <li>Copy your Client ID and Client Secret</li>
              <li>In RevCenter, go to <strong>Integrations → Add → ServiceTitan</strong></li>
              <li>Enter your credentials and click Connect</li>
            </ol>
            <h4>What Syncs</h4>
            <ul>
              <li><strong>Availability:</strong> Real-time technician schedules</li>
              <li><strong>Customers:</strong> Existing customer lookup and new customer creation</li>
              <li><strong>Appointments:</strong> Direct booking into ServiceTitan</li>
              <li><strong>Job types:</strong> Service categories and pricing</li>
            </ul>
            <h4>Troubleshooting</h4>
            <p>
              <strong>Connection failed:</strong> Verify your Tenant ID and regenerate API credentials.
            </p>
            <p>
              <strong>No availability showing:</strong> Check that technicians have dispatch settings configured.
            </p>
          </>
        ),
      },
      {
        id: "fieldpulse",
        title: "FieldPulse Integration",
        content: (
          <>
            <p>
              FieldPulse integration enables calendar sync and automated job creation from AI-booked calls.
            </p>
            <h4>Setup Steps</h4>
            <ol>
              <li>In FieldPulse, navigate to <strong>Settings → Integrations</strong></li>
              <li>Generate an API key for RevCenter</li>
              <li>In RevCenter, go to <strong>Integrations → Add → FieldPulse</strong></li>
              <li>Enter your API key and connect</li>
            </ol>
            <h4>Features</h4>
            <ul>
              <li>Real-time calendar availability</li>
              <li>Automatic customer matching and creation</li>
              <li>Job creation with service details from call</li>
              <li>Notes and call summary attached to jobs</li>
            </ul>
          </>
        ),
      },
      {
        id: "service-fusion",
        title: "Service Fusion Integration",
        content: (
          <>
            <p>
              Connect with Service Fusion to enable automated scheduling and customer management.
            </p>
            <h4>Setup Steps</h4>
            <ol>
              <li>Request API access from Service Fusion support</li>
              <li>Once enabled, generate credentials in Service Fusion settings</li>
              <li>Add the integration in RevCenter with your credentials</li>
              <li>Map job types between systems</li>
            </ol>
            <h4>Sync Capabilities</h4>
            <ul>
              <li>Customer database lookup</li>
              <li>Technician availability</li>
              <li>Work order creation</li>
              <li>Service history access</li>
            </ul>
          </>
        ),
      },
      {
        id: "webhooks",
        title: "Webhooks",
        content: (
          <>
            <p>
              Use webhooks to receive real-time notifications about call events in your own systems.
            </p>
            <h4>Available Events</h4>
            <ul>
              <li><code>call.started</code> - When a call begins</li>
              <li><code>call.completed</code> - When a call ends</li>
              <li><code>appointment.booked</code> - When an appointment is scheduled</li>
              <li><code>transfer.requested</code> - When a call needs human handoff</li>
              <li><code>contact.created</code> - When a new contact is added</li>
            </ul>
            <h4>Webhook Configuration</h4>
            <ol>
              <li>Go to <strong>Settings → Webhooks</strong></li>
              <li>Click <strong>Add Endpoint</strong></li>
              <li>Enter your HTTPS endpoint URL</li>
              <li>Select events to subscribe to</li>
              <li>Save and test with the &quot;Send Test&quot; button</li>
            </ol>
            <h4>Payload Example</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "event": "appointment.booked",
  "timestamp": "2025-01-15T14:30:00Z",
  "data": {
    "call_id": "call_abc123",
    "customer": {
      "name": "John Smith",
      "phone": "+15551234567"
    },
    "appointment": {
      "date": "2025-01-16",
      "time": "10:00",
      "service_type": "AC Repair"
    }
  }
}`}
            </pre>
          </>
        ),
      },
    ],
  },
  "call-handling": {
    title: "Call Handling",
    description: "Configure how your AI agent handles inbound and outbound calls.",
    icon: Phone,
    sections: [
      {
        id: "inbound",
        title: "Inbound Calls",
        content: (
          <>
            <p>
              Configure how your AI agent greets callers and handles inbound inquiries.
            </p>
            <h4>Greeting Configuration</h4>
            <p>
              Customize your agent&apos;s opening greeting:
            </p>
            <ul>
              <li><strong>Standard greeting:</strong> &quot;Thank you for calling [Company]. This is [Agent]. How can I help you today?&quot;</li>
              <li><strong>After-hours greeting:</strong> Different messaging for calls outside business hours</li>
              <li><strong>Holiday greeting:</strong> Special messaging for holidays</li>
            </ul>
            <h4>Call Flow Options</h4>
            <ul>
              <li><strong>Direct booking:</strong> AI handles the entire call and books appointments</li>
              <li><strong>Qualification only:</strong> AI gathers information and creates a lead</li>
              <li><strong>Triage mode:</strong> AI determines urgency and routes accordingly</li>
            </ul>
            <h4>Data Collection</h4>
            <p>
              Configure what information your agent gathers:
            </p>
            <ul>
              <li>Required fields (name, phone, address)</li>
              <li>Service-specific questions (equipment type, symptoms)</li>
              <li>Optional fields (email, how they heard about you)</li>
            </ul>
          </>
        ),
      },
      {
        id: "outbound",
        title: "Outbound Campaigns",
        content: (
          <>
            <p>
              Create automated outbound call campaigns for lead follow-up, appointment reminders, and customer reactivation.
            </p>
            <h4>Campaign Types</h4>
            <ul>
              <li><strong>Lead follow-up:</strong> Call leads who didn&apos;t book on first contact</li>
              <li><strong>Appointment reminders:</strong> Confirm upcoming appointments</li>
              <li><strong>Maintenance reminders:</strong> Seasonal tune-up outreach</li>
              <li><strong>Estimate follow-up:</strong> Nurture open quotes</li>
              <li><strong>Customer reactivation:</strong> Re-engage dormant customers</li>
            </ul>
            <h4>Campaign Settings</h4>
            <ul>
              <li><strong>Calling hours:</strong> When outbound calls can be placed</li>
              <li><strong>Attempt limits:</strong> Maximum call attempts per contact</li>
              <li><strong>Retry intervals:</strong> Time between attempts</li>
              <li><strong>Voicemail detection:</strong> Leave voicemail or retry later</li>
            </ul>
            <h4>Compliance</h4>
            <p>
              RevCenter includes built-in compliance features:
            </p>
            <ul>
              <li>Automatic DNC list checking</li>
              <li>Time zone-aware calling restrictions</li>
              <li>Consent tracking</li>
              <li>Opt-out handling</li>
            </ul>
          </>
        ),
      },
      {
        id: "routing",
        title: "Call Routing",
        content: (
          <>
            <p>
              Configure intelligent call routing based on caller type, time of day, or call content.
            </p>
            <h4>Routing Rules</h4>
            <ul>
              <li><strong>Time-based:</strong> Different handling for business hours vs. after-hours</li>
              <li><strong>Caller-based:</strong> VIP customers go directly to senior staff</li>
              <li><strong>Content-based:</strong> Emergency calls trigger priority dispatch</li>
              <li><strong>Geographic:</strong> Route to nearest service location</li>
            </ul>
            <h4>Queue Management</h4>
            <p>
              When human agents are needed but busy:
            </p>
            <ul>
              <li>Estimated wait time announcements</li>
              <li>Callback option</li>
              <li>AI handling of routine questions while waiting</li>
            </ul>
          </>
        ),
      },
      {
        id: "transfers",
        title: "Human Transfers",
        content: (
          <>
            <p>
              Configure when and how calls are transferred to human agents.
            </p>
            <h4>Transfer Triggers</h4>
            <ul>
              <li><strong>Caller request:</strong> &quot;I&apos;d like to speak to a person&quot;</li>
              <li><strong>Complex situations:</strong> Issues AI isn&apos;t trained to handle</li>
              <li><strong>Escalation keywords:</strong> Complaints, legal, manager</li>
              <li><strong>Failed attempts:</strong> After multiple failed booking attempts</li>
            </ul>
            <h4>Transfer Process</h4>
            <ol>
              <li>AI announces the transfer to the caller</li>
              <li>System looks up available human agents</li>
              <li>Call summary and context are displayed to the agent</li>
              <li>Warm handoff with introduction (or cold transfer if preferred)</li>
            </ol>
            <h4>Fallback Options</h4>
            <p>
              When no human is available:
            </p>
            <ul>
              <li>Offer callback when agent is free</li>
              <li>Take a message with guaranteed response time</li>
              <li>Provide alternative contact options</li>
            </ul>
          </>
        ),
      },
    ],
  },
  configuration: {
    title: "Configuration",
    description: "Customize your AI agent's voice, behavior, and business settings.",
    icon: Settings,
    sections: [
      {
        id: "voice",
        title: "Voice Settings",
        content: (
          <>
            <p>
              Choose how your AI agent sounds to create the right impression for your brand.
            </p>
            <h4>Voice Selection</h4>
            <p>
              Choose from our library of natural-sounding voices:
            </p>
            <ul>
              <li><strong>Professional voices:</strong> Polished, corporate tone</li>
              <li><strong>Friendly voices:</strong> Warm, conversational style</li>
              <li><strong>Regional accents:</strong> Match your local market</li>
              <li><strong>Gender options:</strong> Male, female, and neutral voices</li>
            </ul>
            <h4>Voice Adjustments</h4>
            <ul>
              <li><strong>Speed:</strong> Adjust speaking pace (0.8x - 1.2x)</li>
              <li><strong>Pitch:</strong> Fine-tune voice pitch</li>
              <li><strong>Emphasis:</strong> How the agent emphasizes key words</li>
            </ul>
            <h4>Custom Voice (Enterprise)</h4>
            <p>
              Enterprise customers can create a custom voice cloned from a real person (with consent) for brand consistency.
            </p>
          </>
        ),
      },
      {
        id: "prompts",
        title: "Prompts & Scripts",
        content: (
          <>
            <p>
              Customize what your agent says in different situations.
            </p>
            <h4>Customizable Prompts</h4>
            <ul>
              <li><strong>Greeting:</strong> How the agent answers calls</li>
              <li><strong>Booking confirmation:</strong> What&apos;s said when an appointment is booked</li>
              <li><strong>Out of service area:</strong> Response for callers outside your area</li>
              <li><strong>After-hours:</strong> Messaging outside business hours</li>
              <li><strong>Hold messaging:</strong> What callers hear while waiting</li>
              <li><strong>Goodbye:</strong> How the agent ends calls</li>
            </ul>
            <h4>FAQ Responses</h4>
            <p>
              Train your agent on frequently asked questions:
            </p>
            <ul>
              <li>Add question/answer pairs</li>
              <li>Specify when to offer additional help</li>
              <li>Configure when to escalate to humans</li>
            </ul>
            <h4>Dynamic Variables</h4>
            <p>
              Use placeholders that fill in automatically:
            </p>
            <ul>
              <li><code>{"{company_name}"}</code> - Your business name</li>
              <li><code>{"{agent_name}"}</code> - The AI agent&apos;s name</li>
              <li><code>{"{customer_name}"}</code> - The caller&apos;s name (when known)</li>
              <li><code>{"{next_available}"}</code> - Next available appointment time</li>
            </ul>
          </>
        ),
      },
      {
        id: "hours",
        title: "Business Hours",
        content: (
          <>
            <p>
              Configure when your business operates and how calls are handled at different times.
            </p>
            <h4>Standard Hours</h4>
            <p>
              Set your regular operating hours for each day of the week. The agent uses these to:
            </p>
            <ul>
              <li>Determine available appointment slots</li>
              <li>Adjust greetings (e.g., &quot;Good morning&quot; vs. &quot;Good afternoon&quot;)</li>
              <li>Route calls appropriately</li>
            </ul>
            <h4>After-Hours Handling</h4>
            <ul>
              <li><strong>Emergency only:</strong> Only book true emergencies, take messages for others</li>
              <li><strong>Full service:</strong> Book next-day appointments</li>
              <li><strong>Message only:</strong> Take messages for callback</li>
            </ul>
            <h4>Holidays</h4>
            <p>
              Configure holiday schedules in advance:
            </p>
            <ul>
              <li>Closed holidays with special messaging</li>
              <li>Modified hours for holiday weeks</li>
              <li>Emergency-only holiday coverage</li>
            </ul>
            <h4>Time Zones</h4>
            <p>
              Set your business time zone. Multi-location businesses can configure different hours per location.
            </p>
          </>
        ),
      },
      {
        id: "languages",
        title: "Language Settings",
        content: (
          <>
            <p>
              Configure multilingual support to serve diverse customer bases.
            </p>
            <h4>Primary Language</h4>
            <p>
              Set the default language for your agent. This is used for:
            </p>
            <ul>
              <li>Initial greeting</li>
              <li>Dashboard and reporting</li>
              <li>Email notifications</li>
            </ul>
            <h4>Automatic Language Detection</h4>
            <p>
              When enabled, the agent automatically detects the caller&apos;s language and switches to match. Detection happens within the first few seconds of conversation.
            </p>
            <h4>Supported Languages</h4>
            <p>
              RevCenter supports 30+ languages including:
            </p>
            <ul>
              <li>Spanish, Mandarin, Vietnamese, Korean, Tagalog</li>
              <li>French, German, Portuguese, Italian</li>
              <li>Arabic, Hindi, Punjabi, and more</li>
            </ul>
            <h4>Per-Language Customization</h4>
            <p>
              Customize greetings and responses for each language to ensure cultural appropriateness and natural phrasing.
            </p>
          </>
        ),
      },
    ],
  },
  api: {
    title: "API Reference",
    description: "Build custom integrations with the RevCenter API.",
    icon: Code,
    sections: [
      {
        id: "authentication",
        title: "Authentication",
        content: (
          <>
            <p>
              The RevCenter API uses API keys for authentication. All requests must include your API key in the header.
            </p>
            <h4>Getting Your API Key</h4>
            <ol>
              <li>Go to <strong>Settings → API Keys</strong></li>
              <li>Click <strong>Create New Key</strong></li>
              <li>Give it a descriptive name</li>
              <li>Copy and securely store the key (it won&apos;t be shown again)</li>
            </ol>
            <h4>Using the API Key</h4>
            <p>Include the API key in the Authorization header:</p>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.revcenter.ai/v1/calls`}
            </pre>
            <h4>Rate Limits</h4>
            <ul>
              <li><strong>Starter:</strong> 100 requests/minute</li>
              <li><strong>Pro:</strong> 500 requests/minute</li>
              <li><strong>Enterprise:</strong> Custom limits</li>
            </ul>
          </>
        ),
      },
      {
        id: "calls",
        title: "Calls API",
        content: (
          <>
            <p>
              Retrieve call data, transcripts, and recordings.
            </p>
            <h4>List Calls</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`GET /v1/calls

Query Parameters:
- start_date: ISO 8601 date
- end_date: ISO 8601 date
- status: completed, missed, transferred
- limit: 1-100 (default 20)
- offset: pagination offset`}
            </pre>
            <h4>Get Call Details</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`GET /v1/calls/{call_id}

Response:
{
  "id": "call_abc123",
  "direction": "inbound",
  "caller_number": "+15551234567",
  "duration_seconds": 245,
  "status": "completed",
  "transcript": "...",
  "recording_url": "https://...",
  "appointment_id": "apt_xyz789"
}`}
            </pre>
            <h4>Get Transcript</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`GET /v1/calls/{call_id}/transcript

Response:
{
  "call_id": "call_abc123",
  "segments": [
    {"speaker": "agent", "text": "Thank you for calling..."},
    {"speaker": "caller", "text": "Hi, I need..."}
  ]
}`}
            </pre>
          </>
        ),
      },
      {
        id: "contacts",
        title: "Contacts API",
        content: (
          <>
            <p>
              Manage your contact database via the API.
            </p>
            <h4>Create Contact</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`POST /v1/contacts

Body:
{
  "phone": "+15551234567",
  "name": "John Smith",
  "email": "john@example.com",
  "address": {
    "street": "123 Main St",
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85001"
  }
}`}
            </pre>
            <h4>Update Contact</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`PATCH /v1/contacts/{contact_id}

Body:
{
  "email": "newemail@example.com"
}`}
            </pre>
            <h4>Search Contacts</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`GET /v1/contacts/search?q=john&field=name`}
            </pre>
          </>
        ),
      },
      {
        id: "webhooks",
        title: "Webhooks API",
        content: (
          <>
            <p>
              Programmatically manage webhook subscriptions.
            </p>
            <h4>List Webhooks</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`GET /v1/webhooks`}
            </pre>
            <h4>Create Webhook</h4>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`POST /v1/webhooks

Body:
{
  "url": "https://your-server.com/webhook",
  "events": ["call.completed", "appointment.booked"],
  "secret": "your-signing-secret"
}`}
            </pre>
            <h4>Webhook Signatures</h4>
            <p>
              All webhook payloads include a signature header for verification:
            </p>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`X-RevCenter-Signature: sha256=...

Verify with:
HMAC-SHA256(payload, secret) === signature`}
            </pre>
            <h4>Retry Policy</h4>
            <p>
              Failed webhook deliveries are retried with exponential backoff:
            </p>
            <ul>
              <li>Attempt 1: Immediate</li>
              <li>Attempt 2: 1 minute</li>
              <li>Attempt 3: 5 minutes</li>
              <li>Attempt 4: 30 minutes</li>
              <li>Attempt 5: 2 hours (final)</li>
            </ul>
          </>
        ),
      },
    ],
  },
  support: {
    title: "Support",
    description: "Get help with common issues and learn how to contact our support team.",
    icon: HelpCircle,
    sections: [
      {
        id: "faq",
        title: "Frequently Asked Questions",
        content: (
          <>
            <h4>General Questions</h4>
            <p><strong>How long does setup take?</strong></p>
            <p>Most customers are fully operational within 1-2 days. Basic setup can be completed in a few hours.</p>

            <p><strong>Do I need to change my phone number?</strong></p>
            <p>No. We can forward calls from your existing number to RevCenter, or port your number to our system if preferred.</p>

            <p><strong>What happens if the AI can&apos;t handle a call?</strong></p>
            <p>Calls are seamlessly transferred to human agents when needed. The agent receives full context from the AI conversation.</p>

            <h4>Billing Questions</h4>
            <p><strong>How is usage calculated?</strong></p>
            <p>Usage is based on connected call minutes. Only minutes where a caller is actively connected count toward your limit.</p>

            <p><strong>Can I change plans mid-cycle?</strong></p>
            <p>Yes. Upgrades take effect immediately with prorated billing. Downgrades take effect at the next billing cycle.</p>

            <p><strong>Is there a contract?</strong></p>
            <p>No long-term contracts required. Month-to-month billing with cancel anytime. Annual plans receive a discount.</p>

            <h4>Technical Questions</h4>
            <p><strong>What FSM systems do you integrate with?</strong></p>
            <p>ServiceTitan, FieldPulse, Service Fusion, Housecall Pro, Jobber, and many others. Contact us about specific systems.</p>

            <p><strong>Is my data secure?</strong></p>
            <p>Yes. We use AES-256 encryption at rest, TLS 1.3 in transit, and maintain SOC 2 Type II compliance.</p>

            <p><strong>Can I access call recordings?</strong></p>
            <p>Yes. All call recordings are available in your dashboard and via API. Retention period depends on your plan.</p>
          </>
        ),
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        content: (
          <>
            <h4>Calls Not Being Answered</h4>
            <ul>
              <li>Verify your phone number is correctly configured in Settings → Phone Numbers</li>
              <li>Check that call forwarding is set up with your carrier</li>
              <li>Ensure your account is active and billing is current</li>
              <li>Test with a call from a different phone</li>
            </ul>

            <h4>Integration Issues</h4>
            <ul>
              <li>Verify API credentials are current (regenerate if needed)</li>
              <li>Check that required permissions/scopes are enabled</li>
              <li>Review the integration status in Settings → Integrations</li>
              <li>Check webhook delivery logs for errors</li>
            </ul>

            <h4>Booking Failures</h4>
            <ul>
              <li>Verify availability is showing in your FSM system</li>
              <li>Check appointment type mappings in integration settings</li>
              <li>Ensure technicians are set up for dispatch</li>
              <li>Review call transcripts for error indicators</li>
            </ul>

            <h4>Audio Quality Issues</h4>
            <ul>
              <li>Check your phone carrier for network issues</li>
              <li>Verify call forwarding is configured correctly</li>
              <li>Contact support if issues persist across multiple calls</li>
            </ul>

            <h4>Still Need Help?</h4>
            <p>
              If you can&apos;t resolve your issue, contact our support team:
            </p>
            <ul>
              <li><strong>Email:</strong> support@revcenter.ai</li>
              <li><strong>In-app chat:</strong> Click the chat bubble in your dashboard</li>
              <li><strong>Phone:</strong> (888) 555-0100 (Pro and Enterprise plans)</li>
            </ul>
          </>
        ),
      },
    ],
  },
};

const navItems = [
  { slug: "getting-started", title: "Getting Started", icon: Book },
  { slug: "integrations", title: "Integrations", icon: Zap },
  { slug: "call-handling", title: "Call Handling", icon: Phone },
  { slug: "configuration", title: "Configuration", icon: Settings },
  { slug: "api", title: "API Reference", icon: Code },
  { slug: "support", title: "Support", icon: HelpCircle },
];

export default function HelpArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const doc = docPages[slug];

  if (!doc) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold mb-4">Article not found</h1>
        <Link href="/help" className="text-[#1b191a] hover:underline">
          ← Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Link
                href="/help"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1b191a] transition-colors text-sm mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                All Articles
              </Link>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/help/${item.slug}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      slug === item.slug
                        ? "bg-[#1b191a] text-white"
                        : "text-gray-600 hover:text-[#1b191a] hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.title}
                  </Link>
                ))}
              </nav>

              {/* Page sections */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  On this page
                </p>
                <nav className="space-y-1">
                  {doc.sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block px-3 py-1.5 text-sm text-gray-600 hover:text-[#1b191a] transition-colors"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main>
            {/* Mobile back link */}
            <div className="lg:hidden mb-8">
              <Link
                href="/help"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1b191a] transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Help Center
              </Link>
            </div>

            <ScrollReveal>
              {/* Header */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1b191a]/10 flex items-center justify-center">
                    <doc.icon className="w-6 h-6 text-[#1b191a]" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1b191a] heading-serif">
                      {doc.title}
                    </h1>
                  </div>
                </div>
                <p className="text-gray-600 text-lg">
                  {doc.description}
                </p>
              </div>

              {/* Sections */}
              <div className="space-y-12">
                {doc.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="text-2xl font-semibold text-[#1b191a] mb-4 pb-2 border-b border-gray-200">
                      {section.title}
                    </h2>
                    <div className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:text-[#1b191a] prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-strong:text-[#1b191a] prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-gray-100 prose-pre:text-gray-800">
                      {section.content}
                    </div>
                  </section>
                ))}
              </div>
            </ScrollReveal>

            {/* Next/Prev navigation */}
            <ScrollReveal>
              <div className="mt-16 pt-8 border-t border-gray-200">
                <div className="flex justify-between">
                  {navItems.findIndex(item => item.slug === slug) > 0 && (
                    <Link
                      href={`/help/${navItems[navItems.findIndex(item => item.slug === slug) - 1].slug}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-[#1b191a] transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {navItems[navItems.findIndex(item => item.slug === slug) - 1].title}
                    </Link>
                  )}
                  <div className="flex-grow" />
                  {navItems.findIndex(item => item.slug === slug) < navItems.length - 1 && (
                    <Link
                      href={`/help/${navItems[navItems.findIndex(item => item.slug === slug) + 1].slug}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-[#1b191a] transition-colors"
                    >
                      {navItems[navItems.findIndex(item => item.slug === slug) + 1].title}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </ScrollReveal>

            {/* Help CTA */}
            <ScrollReveal>
              <div className="mt-12 bg-[#f5f5f7] rounded-2xl p-8 text-center">
                <h3 className="text-lg font-semibold text-[#1b191a] mb-2">
                  Need more help?
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Our support team is available to assist you.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#1b191a] text-white text-sm font-medium hover:bg-[#2d2a2b] transition-colors"
                >
                  Contact Support
                </Link>
              </div>
            </ScrollReveal>
          </main>
        </div>
      </div>
    </div>
  );
}
