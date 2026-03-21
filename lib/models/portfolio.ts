export interface PropertyEntry {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
  statementCount: number;
}

export interface PropertyStatement {
  id: string;        // property_statements.id (UUID)
  analysisId: string; // analyses.id (UUID)
  fileHash: string;
  fileName: string;
  propertyName: string;
  period: string;
  yearLabel: string;
  addedAt: string;
}

export interface PropertyDetail {
  id: string;
  name: string;
  address?: string;
  portfolioSummary?: string;
  portfolioAnalyzedAt?: string;
  createdAt: string;
  statements: PropertyStatement[];
}

export interface CrossYearFlag {
  metric: string;
  label: string;
  periods: string[];
  values: (number | null)[];
  changePercent: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface PortfolioKeyMetric {
  key: string;
  label: string;
  unit: '%' | '$' | 'x';
  values: (number | null)[];
}
