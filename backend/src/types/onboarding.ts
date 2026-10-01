export type OnboardingStep =
  | "company"
  | "admin"
  | "plan";

export interface CompanyDetails {
  companyName: string;
  industry: string;
}

export interface AdminDetails {
  name: string;
  email: string;
}

export interface PlanDetails {
  plan: "starter" | "growth" | "enterprise";
}

export interface OnboardingData {
  company?: CompanyDetails;
  admin?: AdminDetails;
  plan?: PlanDetails;
}

export interface OnboardingDraft {
  id: string;
  data: OnboardingData;
  completedSteps: OnboardingStep[];
  status: "draft" | "submitted";
  version: number;
  updatedAt: string;
  workspaceId?: string;
}

export interface SaveStepRequest {
  step: OnboardingStep;
  data: CompanyDetails | AdminDetails | PlanDetails;
}

export interface FinalSubmissionResult {
  workspaceId: string;
  onboardingId: string;
  status: "created" | "already_created";
}