import express from "express";
import cors from "cors";
import profileRoutes from "./routes/profile.routes.js";
import opportunityRoutes from "./routes/opportunity.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import skillGapRoutes from "./routes/skillgap.routes.js";
import explanationRoutes from "./routes/explanation.routes.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Allow the separate frontend (different origin) to call this API
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Simple health check so we can confirm the server is alive
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/profile", profileRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/skill-gap", skillGapRoutes);
app.use("/api/explanations", explanationRoutes);

app.listen(PORT, () => {
  console.log(`OpportunityAI backend listening on port ${PORT}`);
});
