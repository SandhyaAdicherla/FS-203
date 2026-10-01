import {
  OnboardingStep,
  SaveStepRequest
} from "../types/onboarding";

const validSteps: OnboardingStep[] = [
  "company",
  "admin",
  "plan"
];

export function validateSaveStep(
  request: SaveStepRequest
): string | null {
  if (!validSteps.includes(request.step)) {
    return "Invalid onboarding step";
  }

  if (!request.data) {
    return "Step data is required";
  }

  if (
    request.step === "company" &&
    !("companyName" in request.data)
  ) {
    return "Company details are invalid";
  }

  if (
    request.step === "admin" &&
    !("email" in request.data)
  ) {
    return "Admin details are invalid";
  }

  if (
    request.step === "plan" &&
    !("plan" in request.data)
  ) {
    return "Plan details are invalid";
  }

  return null;
}