export type KnowledgeCategoryId = 'observations' | 'measurement' | 'astra-care' | 'spaceflight';

export type KnowledgeClassification = 'App explanation' | 'General health education' | 'Spaceflight research context';

export type KnowledgeMetricType =
  | 'heartRate'
  | 'bloodPressure'
  | 'temperature'
  | 'sleep'
  | 'mood'
  | 'stress'
  | 'symptoms'
  | 'timestamps'
  | 'reports';

export type KnowledgeAppFeature =
  | 'mission-overview'
  | 'check-in'
  | 'guided-check-in'
  | 'assessment'
  | 'trends'
  | 'replay'
  | 'reports'
  | 'delivery'
  | 'identify'
  | 'body-map';

export type KnowledgeDiagram = 'baseline' | 'percentage' | 'timeline';

export type KnowledgeCategory = {
  id: KnowledgeCategoryId;
  label: string;
  shortLabel: string;
  description: string;
};

export type KnowledgeSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  reviewedAt: string;
  topic: string;
  contentVersion: string;
};

export type KnowledgeCard = {
  id: string;
  title: string;
  category: KnowledgeCategoryId;
  /** Level 1: one or two sentences that answer the question immediately. */
  summary: string;
  /** Level 2: a short paragraph with an everyday example. */
  plainLanguageBody: string;
  example: string | null;
  /** Level 3: optional detail, limitations and how ASTRA CARE uses the concept. */
  extendedExplanation: string;
  relatedMetricTypes: KnowledgeMetricType[];
  relatedAppFeatures: KnowledgeAppFeature[];
  keywords: string[];
  /** Source IDs resolved against lib/knowledge/sources.ts. Empty for pure app-behavior cards. */
  references: string[];
  version: string;
  lastReviewedAt: string;
  contentClassification: KnowledgeClassification;
  diagram: KnowledgeDiagram | null;
  featured: boolean;
};

export const EDUCATIONAL_NOTICE =
  'Educational information only. Follow approved mission medical procedures for operational decisions.';
