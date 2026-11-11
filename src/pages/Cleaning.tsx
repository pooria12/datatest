import {
  Sparkles,
  ArrowLeftRight,
  History,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { PageHeader } from '@components/common/PageHeader';
import { EmptyState } from '@components/common/EmptyState';
import { Badge } from '@components/ui/Badge';

interface CleaningOperation {
  id: string;
  title: string;
  description: string;
  column?: string;
  status: 'pending' | 'applied' | 'rejected';
}

const proposedOperations: CleaningOperation[] = [];

const operationHistory: CleaningOperation[] = [];

export function Cleaning() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Data Cleaning"
        description="Review and apply cleaning operations"
        badge="Planned"
        badgeVariant="info"
      />

      <Card className="border-warning/50 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            Cleaning Workflow — Planned
          </CardTitle>
          <CardDescription>
            This page shows the planned interface for data cleaning. No actual cleaning
            operations are performed yet.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proposed Cleaning Operations</CardTitle>
          <CardDescription>Operations will be listed here after data quality analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {proposedOperations.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8 text-muted-foreground" />}
              title="No Operations Proposed"
              description="Run data quality analysis to see suggested cleaning operations"
            />
          ) : (
            <div className="space-y-3">
              {proposedOperations.map((op) => (
                <div
                  key={op.id}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{op.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{op.description}</p>
                    {op.column && (
                      <p className="mt-1 text-xs text-muted-foreground font-mono">
                        Column: {op.column}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={op.status === 'applied' ? 'success' : op.status === 'rejected' ? 'destructive' : 'default'}
                    >
                      {op.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => {}}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Before & After Preview</CardTitle>
          <CardDescription>Compare data before and after cleaning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border rounded-lg p-4">
              <h5 className="font-medium mb-2 text-foreground">Before Cleaning</h5>
              <div className="text-sm text-muted-foreground text-center py-8">
                No dataset loaded
              </div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <h5 className="font-medium mb-2 text-foreground">After Cleaning</h5>
              <div className="text-sm text-muted-foreground text-center py-8">
                Preview will appear after applying operations
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cleaning History</CardTitle>
          <CardDescription>Track applied operations</CardDescription>
        </CardHeader>
        <CardContent>
          {operationHistory.length === 0 ? (
            <EmptyState
              icon={<History className="h-8 w-8 text-muted-foreground" />}
              title="No Operations Applied"
              description="Applied cleaning operations will appear here"
            />
          ) : (
            <div className="space-y-3">
              {operationHistory.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{op.title}</p>
                      <p className="text-xs text-muted-foreground">{op.description}</p>
                    </div>
                  </div>
                  <Badge variant={op.status === 'applied' ? 'success' : 'destructive'}>
                    {op.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Cleaned Data</CardTitle>
          <CardDescription>Download your cleaned dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Available after applying operations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
