import {
  Brain,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { PageHeader } from '@components/common/PageHeader';

interface AIFeature {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'success' | 'warning' | 'info';
}

const aiFeatures: AIFeature[] = [
  {
    title: 'Data Quality Explanations',
    description: 'Natural language explanations of detected quality issues',
    icon: MessageSquare,
    variant: 'default',
  },
  {
    title: 'Cleaning Recommendations',
    description: 'AI-suggested cleaning operations with rationale',
    icon: Lightbulb,
    variant: 'success',
  },
  {
    title: 'Pattern Detection',
    description: 'Automatic discovery of patterns, anomalies, and relationships',
    icon: Sparkles,
    variant: 'default',
  },
  {
    title: 'Insight Generation',
    description: 'Executive summaries and actionable insights from your data',
    icon: Brain,
    variant: 'info',
  },
];

const aiCapabilities = [
  {
    title: 'Secure Server-Side AI',
    description: 'All AI processing happens in Cloudflare Workers, never in the browser',
    icon: Shield,
    variant: 'success',
  },
  {
    title: 'No API Keys in Frontend',
    description: 'API keys stored securely in Worker environment variables',
    icon: Zap,
    variant: 'warning',
  },
  {
    title: 'Context-Aware Prompts',
    description: 'Prompts include dataset schema and quality metrics for relevant insights',
    icon: Brain,
    variant: 'info',
  },
  {
    title: 'Explainable Recommendations',
    description: 'Every AI suggestion includes reasoning and confidence scores',
    icon: Clock,
    variant: 'default',
  },
];

export function AIInsights() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Insights"
        description="AI-powered analysis and recommendations"
        badge="Planned"
        badgeVariant="info"
      />

      <Card className="border-info/30 bg-info/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-info" />
            AI Insights — Planned
          </CardTitle>
          <CardDescription>
            This page shows the planned interface for AI-powered insights. No AI responses
            are simulated or generated yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All AI functionality will be implemented server-side through Cloudflare Workers
            to keep API keys secure and enable proper prompt engineering.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {aiFeatures.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="py-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-center font-medium text-foreground">{feature.title}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">{feature.description}</p>
              <div className="mt-4 text-center">
                <Badge variant="outline">Planned</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planned AI Capabilities</CardTitle>
          <CardDescription>Planned features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aiCapabilities.map((cap) => (
              <div
                key={cap.title}
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <cap.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{cap.title}</p>
                  <p className="text-sm text-muted-foreground">{cap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
