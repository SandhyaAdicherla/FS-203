const API_URL = "http://localhost:5001/api";

export interface OnboardingDraft {
  id: string;
  data: {
    company?: {
      companyName: string;
      industry: string;
    };
    admin?: {
      name: string;
      email: string;
    };
    plan?: {
      plan: "starter" | "growth" | "enterprise";
    };
  };
  completedSteps: string[];
  status: "draft" | "submitted";
  version: number;
  updatedAt: string;
  workspaceId?: string;
}

export async function createDraft(): Promise<OnboardingDraft> {
  const response = await fetch(
    `${API_URL}/onboarding`,
    {
      method: "POST"
    }
  );

  if (!response.ok) {
    throw new Error("Unable to create onboarding draft");
  }

  return response.json();
}

export async function getDraft(
  id: string
): Promise<OnboardingDraft> {
  const response = await fetch(
    `${API_URL}/onboarding/${id}`
  );

  if (!response.ok) {
    throw new Error("Unable to load onboarding draft");
  }

  return response.json();
}

export async function saveStep(
  id: string,
  step: string,
  data: unknown
): Promise<OnboardingDraft> {
  const response = await fetch(
    `${API_URL}/onboarding/${id}/steps`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        step,
        data
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.error || "Unable to save step"
    );
  }

  return response.json();
}

export async function submitOnboarding(
  id: string,
  idempotencyKey: string
) {
  const response = await fetch(
    `${API_URL}/onboarding/${id}/submit`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to submit onboarding"
    );
  }

  return data;
}