import { Link } from "react-router-dom";
import {
  ArrowRight,
  Upload as UploadIcon,
  Brain,
  Sparkles,
  CheckCircle,
  Eye,
  BarChart,
  TrendingUp,
  Database,
  Activity,
  Clock,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { buttonStyles } from "@components/ui/button-styles";
import { PageHeader } from "@components/common/PageHeader";
import { StatCard } from "@components/common/StatCard";
import { LoadingState } from "@components/common/LoadingState";
import { useDataset } from "@hooks/useDataset";
import { cn } from "@lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
  comingSoon?: boolean;
}

function FeatureCard({ title, description, icon: Icon, path, badge, comingSoon = false }: FeatureCardProps) {
  return (
    <Card className="h-full transition-all hover:border-primary/20 hover:shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {badge && (
              <Badge variant="info" className="mt-1">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {comingSoon ? (
          <button
            type="button"
            disabled
            className={buttonStyles({ variant: "outline", className: "w-full" })}
          >
            Coming Soon
          </button>
        ) : (
          <Link to={path} className={buttonStyles({ variant: "primary", className: "w-full" })}>
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

const features: FeatureCardProps[] = [
  { title: "Upload Dataset", description: "Import CSV files and begin your data analysis journey", icon: UploadIcon, path: "/upload" },
  { title: "Data Preview", description: "Explore dataset structure, columns, and sample rows", icon: Eye, path: "/preview" },
  { title: "Data Quality", description: "Detect missing values, duplicates, and inconsistencies", icon: CheckCircle, path: "/quality" },
  { title: "Feature Analysis", description: "Per-column statistics, distributions, and outliers", icon: BarChart, path: "/analysis" },
  { title: "AI Insights", description: "AI-powered explanations and recommendations", icon: Brain, path: "/insights", badge: "Planned", comingSoon: true },
  { title: "Data Cleaning", description: "Interactive cleaning workflow with before/after preview", icon: Sparkles, path: "/cleaning", badge: "Planned", comingSoon: true },
];

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  ready: "Ready",
  warning: "Ready with warnings",
  error: "Error",
};

const onboardingSteps = [
  { step: 1, title: "Upload a dataset", description: "Drag and drop a CSV file or browse from your computer", path: "/upload", available: true },
  { step: 2, title: "Explore the data", description: "Preview columns, data types, and sample rows", path: "/preview", available: true },
  { step: 3, title: "Review data quality", description: "Check for missing values, duplicates, and anomalies", path: "/quality", available: true },
  { step: 4, title: "Discover insights", description: "Get AI-powered explanations and recommendations", path: "/insights", available: false },
  { step: 5, title: "Clean and export", description: "Apply cleaning operations and download cleaned data", path: "/cleaning", available: false },
];

export function Dashboard() {
  const { dataset, status, isLoading } = useDataset();
  const qualityReport = dataset?.qualityReport;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={dataset ? `Viewing ${dataset.filename}` : "Welcome to DataMind AI. Start by uploading your first dataset."}
      />

      {isLoading ? (
        <LoadingState text="Loading dataset…" />
      ) : !dataset ? (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 sm:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">
                    Turn messy data into clear insights
                  </h2>
                  <p className="mt-3 text-lg text-muted-foreground">
                    Upload a CSV file to automatically profile, analyze, and clean your data.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Link
                    to="/upload"
                    className={buttonStyles({ variant: "primary", size: "lg" })}
                  >
                    <UploadIcon className="mr-2 h-5 w-5" />
                    Upload Dataset
                  </Link>
                  <Link
                    to="/settings"
                    className={buttonStyles({ variant: "outline", size: "lg" })}
                  >
                    <LayoutGrid className="mr-2 h-5 w-5" />
                    Settings
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Follow these steps to analyze your first dataset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {onboardingSteps.map((item) => (
                  <div
                    key={item.step}
                    className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold",
                      item.available ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
                    )}>
                      {item.available ? item.step : <Clock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="shrink-0">
                      {item.available ? (
                        <Link
                          to={item.path}
                          className={buttonStyles({ variant: "primary", size: "sm" })}
                        >
                          Go
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className={buttonStyles({ variant: "outline", size: "sm" })}
                        >
                          Soon
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Available Features</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.path} {...feature} />
            ))}
          </div>

        </>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Dataset"
              value={dataset.filename.length > 15 ? dataset.filename.slice(0, 15) + "…" : dataset.filename}
              description={formatFileSize(dataset.fileSize)}
              icon={<Database className="h-6 w-6" />}
              iconBg="bg-primary/10"
              iconColor="text-primary"
            />
            <StatCard
              title="Records"
              value={dataset.recordCount.toLocaleString()}
              description="Total rows in dataset"
              icon={<Activity className="h-6 w-6" />}
              iconBg="bg-info/10"
              iconColor="text-info"
            />
            <StatCard
              title="Columns"
              value={dataset.columnCount.toLocaleString()}
              description="Total columns detected"
              icon={<TrendingUp className="h-6 w-6" />}
              iconBg="bg-success/10"
              iconColor="text-success"
            />
            <StatCard
              title="Quality score"
              value={qualityReport?.overallScore != null ? qualityReport.overallScore.toFixed(1) + "%" : "—"}
              description={qualityReport ? `${qualityReport.issues.length} issue(s) detected` : "No profiling data"}
              icon={<CheckCircle className="h-6 w-6" />}
              iconBg="bg-warning/10"
              iconColor="text-warning"
              progress={
                qualityReport?.overallScore != null
                  ? { value: qualityReport.overallScore, variant: qualityReport.overallScore >= 80 ? "success" : qualityReport.overallScore >= 60 ? "warning" : "destructive" }
                  : undefined
              }
            />
          </div>

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Dataset Status</h3>
            <div className="flex items-center gap-2">
              <Badge variant={status === "ready" ? "success" : status === "warning" ? "warning" : "default"}>
                {STATUS_LABELS[status] ?? status}
              </Badge>
            </div>
          </div>

          {dataset.truncated && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3" role="status">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p className="text-sm text-foreground">
                The file was larger than the processing limit, so only the first {dataset.recordCount.toLocaleString()} rows were analysed.
              </p>
            </div>
          )}

          {dataset.storageStatus === "failed" && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-sm text-foreground">
                This dataset could not be saved to browser storage and will be lost when you close the tab.
              </p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Next steps with your dataset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <Link to="/preview" className={buttonStyles({ variant: "primary", size: "sm", className: "w-full" })}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Records
                </Link>
                <Link to="/quality" className={buttonStyles({ variant: "outline", size: "sm", className: "w-full" })}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check Quality
                </Link>
                <Link to="/analysis" className={buttonStyles({ variant: "outline", size: "sm", className: "w-full" })}>
                  <BarChart className="mr-2 h-4 w-4" />
                  Analyze Features
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Column Overview</CardTitle>
              <CardDescription>Detected columns and their types</CardDescription>
            </CardHeader>
            <CardContent>
              {dataset.columns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {dataset.columns.map((col) => (
                    <Badge
                      key={col.id}
                      variant={col.dataType === "empty" ? "destructive" : col.missingPercentage > 50 ? "warning" : "default"}
                      className="text-xs"
                    >
                      {col.name} ({col.dataType})
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No column data available</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
