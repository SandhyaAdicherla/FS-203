import { Router, Request, Response } from "express";
import {
  onboardingService
} from "../services/onboardingService";
import {
  validateSaveStep
} from "../validation/onboardingValidation";

const router = Router();

router.post(
  "/",
  (_req: Request, res: Response) => {
    const draft = onboardingService.createDraft();

    res.status(201).json(draft);
  }
);

router.get(
  "/:id",
  (req: Request, res: Response) => {
    const draft = onboardingService.getDraft(String(req.params.id));

    if (!draft) {
      return res.status(404).json({
        error: "Onboarding draft not found"
      });
    }

    return res.json(draft);
  }
);

router.patch(
  "/:id/steps",
  (req: Request, res: Response) => {
    const error = validateSaveStep(req.body);

    if (error) {
      return res.status(400).json({
        error
      });
    }

    try {
      const draft = onboardingService.saveStep(String(
        req.params.id),
        req.body
      );

      return res.json(draft);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      return res.status(400).json({
        error: message
      });
    }
  }
);

router.post(
  "/:id/submit",
  (req: Request, res: Response) => {
    const idempotencyKey =
      req.header("Idempotency-Key");

    if (!idempotencyKey) {
      return res.status(400).json({
        error: "Idempotency-Key header is required"
      });
    }

    try {
      const result = onboardingService.submit(String(
        req.params.id),
        idempotencyKey
      );

      return res.json(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      return res.status(400).json({
        error: message
      });
    }
  }
);

export default router;