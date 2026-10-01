import express from "express";
import cors from "cors";
import onboardingRoutes from "./routes/onboardingRoutes";

const app = express();

const PORT = 5001;

app.use(cors());

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "fs-203-onboarding"
  });
});

app.use(
  "/api/onboarding",
  onboardingRoutes
);

app.listen(PORT, () => {
  console.log(
    `FS-203 backend running on http://localhost:${PORT}`
  );
});