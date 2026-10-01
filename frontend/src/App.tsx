import { useEffect, useState } from "react";
import {
  createDraft,
  getDraft,
  saveStep,
  submitOnboarding,
  type OnboardingDraft
} from "./api";

import "./app.css";

type Step = 1 | 2 | 3;

const stepNames = [
  "Company Details",
  "Admin Details",
  "Plan Configuration"
];

function App() {
  const [draft, setDraft] =
    useState<OnboardingDraft | null>(null);

  const [currentStep, setCurrentStep] =
    useState<Step>(1);

  const [companyName, setCompanyName] =
    useState("");

  const [industry, setIndustry] =
    useState("");

  const [adminName, setAdminName] =
    useState("");

  const [adminEmail, setAdminEmail] =
    useState("");

  const [plan, setPlan] =
    useState<"starter" | "growth" | "enterprise">(
      "starter"
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [offlineMode, setOfflineMode] =
    useState(false);

  useEffect(() => {
    const savedId =
      localStorage.getItem("fs203_onboarding_id");

    if (!savedId) {
      startNewOnboarding();
      return;
    }

    resumeDraft(savedId);
  }, []);

  async function startNewOnboarding() {
    try {
      setLoading(true);

      const newDraft = await createDraft();

      localStorage.setItem(
        "fs203_onboarding_id",
        newDraft.id
      );

      setDraft(newDraft);
    } catch {
      setError(
        "Unable to create onboarding draft."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resumeDraft(id: string) {
    try {
      setLoading(true);

      const existingDraft =
        await getDraft(id);

      setDraft(existingDraft);

      restoreDraft(existingDraft);
    } catch {
      localStorage.removeItem(
        "fs203_onboarding_id"
      );

      await startNewOnboarding();
    } finally {
      setLoading(false);
    }
  }

  function restoreDraft(
    existingDraft: OnboardingDraft
  ) {
    const data = existingDraft.data;

    if (data.company) {
      setCompanyName(
        data.company.companyName
      );

      setIndustry(
        data.company.industry
      );
    }

    if (data.admin) {
      setAdminName(
        data.admin.name
      );

      setAdminEmail(
        data.admin.email
      );
    }

    if (data.plan) {
      setPlan(data.plan.plan);
    }

    const completed =
      existingDraft.completedSteps;

    if (!completed.includes("company")) {
      setCurrentStep(1);
    } else if (!completed.includes("admin")) {
      setCurrentStep(2);
    } else if (!completed.includes("plan")) {
      setCurrentStep(3);
    } else {
      setCurrentStep(3);
    }
  }

  async function handleSaveCompany() {
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!industry.trim()) {
      setError("Industry is required.");
      return;
    }

    if (offlineMode) {
      setError(
        "Network unavailable. Step was not saved."
      );
      return;
    }

    if (!draft) return;

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const updated =
        await saveStep(
          draft.id,
          "company",
          {
            companyName,
            industry
          }
        );

      setDraft(updated);
      setCurrentStep(2);

      setMessage(
        "Company details saved successfully."
      );
    } catch {
      setError(
        "Network error. Your previously accepted steps are still safe."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAdmin() {
    if (!adminName.trim()) {
      setError("Admin name is required.");
      return;
    }

    if (!adminEmail.trim()) {
      setError("Admin email is required.");
      return;
    }

    if (offlineMode) {
      setError(
        "Network unavailable. Step was not saved."
      );
      return;
    }

    if (!draft) return;

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const updated =
        await saveStep(
          draft.id,
          "admin",
          {
            name: adminName,
            email: adminEmail
          }
        );

      setDraft(updated);
      setCurrentStep(3);

      setMessage(
        "Admin details saved successfully."
      );
    } catch {
      setError(
        "Network error. Previously accepted steps are preserved."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePlan() {
    if (!draft) return;

    if (offlineMode) {
      setError(
        "Network unavailable. Step was not saved."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const updated =
        await saveStep(
          draft.id,
          "plan",
          {
            plan
          }
        );

      setDraft(updated);

      setMessage(
        "Plan configuration saved."
      );
    } catch {
      setError(
        "Network error. Previously accepted steps are preserved."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!draft) return;

    if (
      !draft.completedSteps.includes(
        "company"
      ) ||
      !draft.completedSteps.includes(
        "admin"
      ) ||
      !draft.completedSteps.includes(
        "plan"
      )
    ) {
      setError(
        "Please complete all onboarding steps first."
      );

      return;
    }

    if (offlineMode) {
      setError(
        "Network unavailable. Submission was not completed."
      );

      return;
    }

    const idempotencyKey =
      localStorage.getItem(
        "fs203_submission_key"
      ) ||
      crypto.randomUUID();

    localStorage.setItem(
      "fs203_submission_key",
      idempotencyKey
    );

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const result =
        await submitOnboarding(
          draft.id,
          idempotencyKey
        );

      setMessage(
        result.status === "created"
          ? `Workspace created successfully: ${result.workspaceId}`
          : `Retry handled safely. Existing workspace: ${result.workspaceId}`
      );

      const updated = await getDraft(
        draft.id
      );

      setDraft(updated);
    } catch {
      setError(
        "Submission failed. You can safely retry using the same idempotency key."
      );
    } finally {
      setLoading(false);
    }
  }

  async function simulateFailure() {
  if (!offlineMode) {
    // Simulate network failure
    setOfflineMode(true);
    setError("");
    setMessage("");
    return;
  }

  // Restore network
  setOfflineMode(false);
  setError("");
  setMessage("");

  if (!draft) return;

  try {
    setLoading(true);

    const latestDraft = await getDraft(draft.id);

    setDraft(latestDraft);

    // Restore all previously accepted data
    restoreDraft(latestDraft);

    setMessage(
      "Network restored. Your saved onboarding progress has been recovered."
    );
  } catch {
    setError(
      "Network restored, but the saved draft could not be loaded."
    );
  } finally {
    setLoading(false);
  }
}

  function resetDemo() {
    localStorage.removeItem(
      "fs203_onboarding_id"
    );

    localStorage.removeItem(
      "fs203_submission_key"
    );

    window.location.reload();
  }

  if (loading && !draft) {
    return (
      <div className="app">
        <div className="card">
          <h1>CloudForge Onboarding</h1>
          <p>Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">

        <header>
          <div>
            <p className="eyebrow">
              FS-203
            </p>

            <h1>
              CloudForge Onboarding
            </h1>

            <p className="subtitle">
              Resumable onboarding with
              idempotent submission
            </p>
          </div>

          <div
            className={
              offlineMode
                ? "network offline"
                : "network online"
            }
          >
            {offlineMode
              ? "● Offline"
              : "● Online"}
          </div>
        </header>

        <div className="steps">
          {stepNames.map(
            (name, index) => {
              const stepNumber =
                index + 1;

              const completed =
                draft?.completedSteps.includes(
                  [
                    "company",
                    "admin",
                    "plan"
                  ][index]
                );

              return (
                <div
                  key={name}
                  className={
                    currentStep === stepNumber
                      ? "step active"
                      : completed
                        ? "step completed"
                        : "step"
                  }
                >
                  <span>
                    {completed
                      ? "✓"
                      : stepNumber}
                  </span>

                  <div>
                    <strong>
                      {name}
                    </strong>

                    <small>
                      {completed
                        ? "Saved"
                        : `Step ${stepNumber}`}
                    </small>
                  </div>
                </div>
              );
            }
          )}
        </div>

        <main className="card">

          {error && (
            <div className="alert error">
              {error}
            </div>
          )}

          {message && (
            <div className="alert success">
              {message}
            </div>
          )}

          {currentStep === 1 && (
            <section>
              <h2>
                Company Details
              </h2>

              <p className="description">
                Start your organization
                configuration.
              </p>

              <label>
                Company Name
              </label>

              <input
                value={companyName}
                onChange={(event) =>
                  setCompanyName(
                    event.target.value
                  )
                }
                placeholder="Demo Corp"
              />

              <label>
                Industry
              </label>

              <input
                value={industry}
                onChange={(event) =>
                  setIndustry(
                    event.target.value
                  )
                }
                placeholder="Software"
              />

              <button
                onClick={handleSaveCompany}
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : "Save & Continue"}
              </button>
            </section>
          )}

          {currentStep === 2 && (
            <section>
              <h2>
                Admin Details
              </h2>

              <p className="description">
                Configure the initial
                organization administrator.
              </p>

              <label>
                Admin Name
              </label>

              <input
                value={adminName}
                onChange={(event) =>
                  setAdminName(
                    event.target.value
                  )
                }
                placeholder="Demo Admin"
              />

              <label>
                Admin Email
              </label>

              <input
                value={adminEmail}
                onChange={(event) =>
                  setAdminEmail(
                    event.target.value
                  )
                }
                placeholder="admin@example.com"
              />

              <div className="actions">
                <button
                  className="secondary"
                  onClick={() =>
                    setCurrentStep(1)
                  }
                >
                  Back
                </button>

                <button
                  onClick={handleSaveAdmin}
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : "Save & Continue"}
                </button>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section>
              <h2>
                Plan Configuration
              </h2>

              <p className="description">
                Select the plan for your
                organization.
              </p>

              <label>
                Plan
              </label>

              <select
                value={plan}
                onChange={(event) =>
                  setPlan(
                    event.target.value as
                      | "starter"
                      | "growth"
                      | "enterprise"
                  )
                }
              >
                <option value="starter">
                  Starter
                </option>

                <option value="growth">
                  Growth
                </option>

                <option value="enterprise">
                  Enterprise
                </option>
              </select>

              <div className="actions">
                <button
                  className="secondary"
                  onClick={() =>
                    setCurrentStep(2)
                  }
                >
                  Back
                </button>

                <button
                  onClick={handleSavePlan}
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : "Save Plan"}
                </button>
              </div>

              {draft?.completedSteps.includes(
                "plan"
              ) && (
                <div className="submit-area">
                  <button
                    className="submit"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    Submit Onboarding
                  </button>
                </div>
              )}
            </section>
          )}

        </main>

        <section className="demo-controls">
          <h3>
            Reliability Demo Controls
          </h3>

          <p>
            Use these controls to demonstrate
            failure recovery during the
            assessment.
          </p>

          <div className="actions">
            <button
              className={
                offlineMode
                  ? "danger"
                  : "secondary"
              }
              onClick={simulateFailure}
            >
              {offlineMode
                ? "Restore Network"
                : "Simulate Network Failure"}
            </button>

            <button
              className="secondary"
              onClick={resetDemo}
            >
              Reset Demo
            </button>
          </div>
        </section>

        <section className="technical-info">
          <div>
            <strong>
              Draft ID
            </strong>

            <span>
              {draft?.id}
            </span>
          </div>

          <div>
            <strong>
              Saved Steps
            </strong>

            <span>
              {draft?.completedSteps.length ?? 0}
              /3
            </span>
          </div>

          <div>
            <strong>
              Draft Version
            </strong>

            <span>
              {draft?.version ?? 0}
            </span>
          </div>

          <div>
            <strong>
              Status
            </strong>

            <span>
              {draft?.status}
            </span>
          </div>
        </section>

      </div>
    </div>
  );
}

export default App;