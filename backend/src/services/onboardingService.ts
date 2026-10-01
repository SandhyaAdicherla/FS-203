import {
  FinalSubmissionResult,
  OnboardingData,
  OnboardingDraft,
  OnboardingStep,
  SaveStepRequest
} from "../types/onboarding";

export class OnboardingService {
  private drafts = new Map<string, OnboardingDraft>();

  private idempotencyResults = new Map<
    string,
    FinalSubmissionResult
  >();

  private workspaceCounter = 1;

  createDraft(): OnboardingDraft {
    const id = `onboarding-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const draft: OnboardingDraft = {
      id,
      data: {},
      completedSteps: [],
      status: "draft",
      version: 0,
      updatedAt: new Date().toISOString()
    };

    this.drafts.set(id, draft);

    return draft;
  }

  getDraft(id: string): OnboardingDraft | undefined {
    return this.drafts.get(id);
  }

  saveStep(
    onboardingId: string,
    request: SaveStepRequest
  ): OnboardingDraft {
    const draft = this.drafts.get(onboardingId);

    if (!draft) {
      throw new Error("ONBOARDING_NOT_FOUND");
    }

    if (draft.status === "submitted") {
      throw new Error("ONBOARDING_ALREADY_SUBMITTED");
    }

    this.updateStepData(draft.data, request);

    if (!draft.completedSteps.includes(request.step)) {
      draft.completedSteps.push(request.step);
    }

    draft.version += 1;
    draft.updatedAt = new Date().toISOString();

    return draft;
  }

  submit(
    onboardingId: string,
    idempotencyKey: string
  ): FinalSubmissionResult {
    if (!idempotencyKey) {
      throw new Error("IDEMPOTENCY_KEY_REQUIRED");
    }

    const existingResult =
      this.idempotencyResults.get(idempotencyKey);

    if (existingResult) {
      return {
        ...existingResult,
        status: "already_created"
      };
    }

    const draft = this.drafts.get(onboardingId);

    if (!draft) {
      throw new Error("ONBOARDING_NOT_FOUND");
    }

    if (draft.status === "submitted" && draft.workspaceId) {
      const result: FinalSubmissionResult = {
        workspaceId: draft.workspaceId,
        onboardingId: draft.id,
        status: "already_created"
      };

      this.idempotencyResults.set(idempotencyKey, result);

      return result;
    }

    this.validateForSubmission(draft);

    const workspaceId = `workspace-${this.workspaceCounter++}`;

    draft.status = "submitted";
    draft.workspaceId = workspaceId;
    draft.version += 1;
    draft.updatedAt = new Date().toISOString();

    const result: FinalSubmissionResult = {
      workspaceId,
      onboardingId: draft.id,
      status: "created"
    };

    this.idempotencyResults.set(idempotencyKey, result);

    return result;
  }

  private updateStepData(
    data: OnboardingData,
    request: SaveStepRequest
  ): void {
    switch (request.step) {
      case "company":
        data.company = request.data as OnboardingData["company"];
        break;

      case "admin":
        data.admin = request.data as OnboardingData["admin"];
        break;

      case "plan":
        data.plan = request.data as OnboardingData["plan"];
        break;
    }
  }

  private validateForSubmission(
    draft: OnboardingDraft
  ): void {
    const requiredSteps: OnboardingStep[] = [
      "company",
      "admin",
      "plan"
    ];

    const missingSteps = requiredSteps.filter(
      (step) => !draft.completedSteps.includes(step)
    );

    if (missingSteps.length > 0) {
      throw new Error(
        `INCOMPLETE_ONBOARDING:${missingSteps.join(",")}`
      );
    }
  }
}

export const onboardingService =
  new OnboardingService();