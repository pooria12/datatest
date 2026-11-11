import { User, Palette, Database, Shield, Lock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { PageHeader } from '@components/common/PageHeader';
import { useTheme } from '@hooks/useTheme';
import type { ThemePreference } from '@lib/theme';

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function Settings() {
  const { preference, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your application preferences"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel of the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Palette className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Theme</p>
                <p className="text-sm text-muted-foreground">Light, dark, or system preference</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={preference === option.value ? 'primary' : 'outline'}
                  size="sm"
                  aria-pressed={preference === option.value}
                  onClick={() => setTheme(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Info className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Reduced Motion</p>
                <p className="text-sm text-muted-foreground">Respect system preference for reduced animations</p>
              </div>
            </div>
            <Badge variant="outline">System</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data
          </CardTitle>
          <CardDescription>Data handling and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Database className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Local Processing</p>
                <p className="text-sm text-muted-foreground">
                  CSV files are parsed and profiled entirely in your browser
                </p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Lock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">No Cloud Storage</p>
                <p className="text-sm text-muted-foreground">
                  Datasets are saved only in this browser (IndexedDB); nothing is uploaded to a server
                </p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">AI Processing</p>
                <p className="text-sm text-muted-foreground">Server-side only, planned</p>
              </div>
            </div>
            <Badge variant="warning">Planned</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Account settings and profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Authentication</p>
                <p className="text-sm text-muted-foreground">Not implemented yet</p>
              </div>
            </div>
            <Badge variant="outline">Planned</Badge>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Database className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">API Keys</p>
                <p className="text-sm text-muted-foreground">Manage API keys for integrations</p>
              </div>
            </div>
            <Badge variant="outline">Planned</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Info</CardTitle>
          <CardDescription>Version and build information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">0.2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Framework</span>
            <span className="font-mono">React 19 + TypeScript</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Runtime</span>
            <span className="font-mono">Cloudflare Workers</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Styling</span>
            <span className="font-mono">Tailwind CSS v4</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Build Tool</span>
            <span className="font-mono">Vite</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Router</span>
            <span className="font-mono">React Router v7</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
