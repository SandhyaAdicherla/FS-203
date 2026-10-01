import { describe, expect, it } from "vitest";
import { OnboardingService } from "../src/services/onboardingService";

describe("FS-203 Multi-Step Onboarding Reliability", () => {
  describe("TC01 - Normal onboarding flow", () => {
    it("should save all steps and create exactly one workspace", () => {
      const service = new OnboardingService();

      const draft = service.createDraft();

      service.saveStep(draft.id, {
        step: "company",
        data: {
          companyName: "Demo Corp",
          industry: "Software"
        }
      });

      service.saveStep(draft.id, {
        step: "admin",
        data: {
          name: "Demo Admin",
          email: "admin@example.com"
        }
      });

      service.saveStep(draft.id, {
        step: "plan",
        data: {
          plan: "growth"
        }
      });

      const result = service.submit(
        draft.id,
        "normal-submit-key"
      );

      expect(result.status).toBe("created");
      expect(result.workspaceId).toBe("workspace-1");

      const savedDraft = service.getDraft(draft.id);

      expect(savedDraft?.completedSteps).toEqual([
        "company",
        "admin",
        "plan"
      ]);

      expect(savedDraft?.status).toBe("submitted");
    });
  });

  describe("TC02 - Boundary case: submit with missing step", () => {
    it("should reject submission when onboarding is incomplete", () => {
      const service = new OnboardingService();

      const draft = service.createDraft();

      service.saveStep(draft.id, {
        step: "company",
        data: {
          companyName: "Demo Corp",
          industry: "Software"
        }
      });

      service.saveStep(draft.id, {
        step: "admin",
        data: {
          name: "Demo Admin",
          email: "admin@example.com"
        }
      });

      expect(() => {
        service.submit(
          draft.id,
          "incomplete-submit-key"
        );
      }).toThrow("INCOMPLETE_ONBOARDING");

      const savedDraft = service.getDraft(draft.id);

      expect(savedDraft?.status).toBe("draft");

      expect(savedDraft?.completedSteps).toEqual([
        "company",
        "admin"
      ]);
    });
  });

  describe("TC03 - Failure case: network interruption", () => {
    it("should preserve accepted steps after an interruption", () => {
      const service = new OnboardingService();

      const draft = service.createDraft();

      // Step 1 succeeds before network failure
      service.saveStep(draft.id, {
        step: "company",
        data: {
          companyName: "Demo Corp",
          industry: "Software"
        }
      });

      // Simulate network interruption.
      // Step 2 is intentionally not saved.

      const recoveredDraft =
        service.getDraft(draft.id);

      expect(recoveredDraft).toBeDefined();

      expect(recoveredDraft?.completedSteps).toEqual([
        "company"
      ]);

      expect(
        recoveredDraft?.data.company?.companyName
      ).toBe("Demo Corp");

      expect(recoveredDraft?.status).toBe("draft");
    });
  });

  describe("TC04 - Idempotent final submission", () => {
    it("should return the same workspace when the request is retried", () => {
      const service = new OnboardingService();

      const draft = service.createDraft();

      service.saveStep(draft.id, {
        step: "company",
        data: {
          companyName: "Demo Corp",
          industry: "Software"
        }
      });

      service.saveStep(draft.id, {
        step: "admin",
        data: {
          name: "Demo Admin",
          email: "admin@example.com"
        }
      });

      service.saveStep(draft.id, {
        step: "plan",
        data: {
          plan: "growth"
        }
      });

      const firstRequest = service.submit(
        draft.id,
        "same-idempotency-key"
      );

      const retryRequest = service.submit(
        draft.id,
        "same-idempotency-key"
      );

      expect(firstRequest.workspaceId)
        .toBe("workspace-1");

      expect(retryRequest.workspaceId)
        .toBe(firstRequest.workspaceId);

      expect(firstRequest.status)
        .toBe("created");

      expect(retryRequest.status)
        .toBe("already_created");
    });
  });

  describe("TC05 - Different idempotency keys", () => {
    it("should not allow a second workspace for an already submitted onboarding", () => {
      const service = new OnboardingService();

      const draft = service.createDraft();

      service.saveStep(draft.id, {
        step: "company",
        data: {
          companyName: "Demo Corp",
          industry: "Software"
        }
      });

      service.saveStep(draft.id, {
        step: "admin",
        data: {
          name: "Demo Admin",
          email: "admin@example.com"
        }
      });

      service.saveStep(draft.id, {
        step: "plan",
        data: {
          plan: "growth"
        }
      });

      const firstRequest = service.submit(
        draft.id,
        "first-key"
      );

      const secondRequest = service.submit(
        draft.id,
        "different-key"
      );

      expect(secondRequest.workspaceId)
        .toBe(firstRequest.workspaceId);

      expect(secondRequest.status)
        .toBe("already_created");
    });
  });

  describe("TC06 - Unknown onboarding draft", () => {
    it("should reject operations for a non-existing draft", () => {
      const service = new OnboardingService();

      expect(() => {
        service.saveStep("invalid-id", {
          step: "company",
          data: {
            companyName: "Demo Corp",
            industry: "Software"
          }
        });
      }).toThrow("ONBOARDING_NOT_FOUND");
    });
  });

  describe("TC07 - Idempotency key is required", () => {
    it("should reject final submission without an idempotency key", () => {
      const service = new OnboardingService();

      const draft = service.createDraft();

      service.saveStep(draft.id, {
        step: "company",
        data: {
          companyName: "Demo Corp",
          industry: "Software"
        }
      });

      service.saveStep(draft.id, {
        step: "admin",
        data: {
          name: "Demo Admin",
          email: "admin@example.com"
        }
      });

      service.saveStep(draft.id, {
        step: "plan",
        data: {
          plan: "growth"
        }
      });

      expect(() => {
        service.submit(draft.id, "");
      }).toThrow("IDEMPOTENCY_KEY_REQUIRED");
    });
  });
});