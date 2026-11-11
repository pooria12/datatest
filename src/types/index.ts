export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface PageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface HealthResponse {
  status: 'ok';
  service: 'datamind-ai';
  phase: '0';
  timestamp: string;
}

export type Phase = '0' | '1' | '2' | '3';

export interface DatasetOverview {
  name: string;
  rows: number;
  columns: number;
  size: number;
  uploadedAt: string;
}

export interface DataQualityMetrics {
  missingValues: number;
  duplicateRows: number;
  invalidValues: number;
  qualityScore: number;
}

export interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';
  missingCount: number;
  uniqueCount: number;
  stats?: {
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
  };
  topValues?: Array<{ value: string; count: number }>;
}

export interface CleaningOperation {
  id: string;
  type: 'remove_duplicates' | 'fill_missing' | 'remove_outliers' | 'standardize' | 'custom';
  description: string;
  column?: string;
  parameters: Record<string, unknown>;
  preview: {
    before: unknown[][];
    after: unknown[][];
  };
  applied: boolean;
}