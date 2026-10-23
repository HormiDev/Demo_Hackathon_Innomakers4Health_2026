export type Option = { id: string; label: string; max_age_months?: number };
export type Question = {
  id: string;
  label: string;
  kind: "single" | "multi";
  options: Option[];
  zones: string[];
  symptoms: string[];
  max_age_months: number | null;
};
export type CaseData = {
  age_months: number;
  respondent: "self" | "companion";
  reason: string;
  body_zones: string[];
  onset: string;
  duration: string;
  evolution: string;
  pain: number | null;
  symptoms: string[];
  alarms: string[];
  answers: Record<string, string | string[]>;
  history: string;
  reviewed: boolean;
};
export type Catalog = {
  version: string;
  specialties: { id: string; name: string; criteria: string }[];
  body_zones: Option[];
  symptoms: Option[];
  alarms: Option[];
  questions: Question[];
  max_followups: number;
};
export type Health = {
  status: "ready" | "model_missing" | "unavailable" | "incompatible";
  model: string;
  message: string;
};
export type NextResult = {
  status: "question" | "complete" | "limit" | "urgent";
  question: Question | null;
  source: "model" | "rules";
  warnings: string[];
  answered: number;
};
export type Result = {
  status: "classified" | "inconclusive" | "urgent";
  rankings: { id: string; name: string; probability: number }[];
  warnings: string[];
  model: string;
  catalog_version: string;
  latency_ms: number;
  considered_data: CaseData;
  label: string;
};
