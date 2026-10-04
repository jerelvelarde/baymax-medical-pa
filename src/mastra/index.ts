import { medicalTraceFilter } from "./medical-record/tracing";
import { Mastra } from "@mastra/core";
import { registerApiRoute } from "@mastra/core/server";
import { createStateHandler } from "./persistence/handler";
import { CareStore } from "./persistence/store";
import { query } from "./persistence/database";
import { LibSQLStore } from "@mastra/libsql";
import { Observability, DefaultExporter, SensitiveDataFilter } from "@mastra/observability";
import { baymaxAgent } from "./agents/baymax-agent";
import { healthRoutes } from "./routes/health";
import { travelRoutes } from "./routes/travel";
import { recordsRoutes } from "./routes/records";
import { conversationRoutes } from "./routes/conversations";
import { computerTraceFilter } from "./computer/tracing";
import { computerRoutes } from "./routes/computer";
import { demoRoutes } from "./routes/demo";
import { appleHealthRoutes } from "./routes/apple-health";
import { medicalRecordRoutes } from "./routes/medical-record";
import { MEDICAL_USER_KEY } from "./medical-record/context";
import { userIdOf } from "./lib/demo-user";
import { bindHealthSession } from "./persistence/session";

const handleCareState = createStateHandler(new CareStore(query));

export const mastra = new Mastra({
  agents: { baymaxAgent },
  server: {
    middleware: [async (c, next) => {
      bindHealthSession(c.req.raw, c.get('requestContext'));
      // Overwrite client context. Replace userIdOf() with authenticated identity when login is added.
      c.get('requestContext').set(MEDICAL_USER_KEY, userIdOf());
      await next();
    }],
    apiRoutes: [...medicalRecordRoutes, ...computerRoutes, ...travelRoutes, ...healthRoutes, ...recordsRoutes, ...conversationRoutes, ...demoRoutes, ...appleHealthRoutes, ...["GET", "PUT", "DELETE"].map(method =>
      registerApiRoute("/care-state", {
        method: method as "GET" | "PUT" | "DELETE",
        handler: c => handleCareState(c.req.raw),
      }),
    )],
  },
  // `mastra dev` runs from .mastra/output, so ../../ is the project root.
  // Override with MASTRA_DB_URL if needed.
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: process.env.MASTRA_DB_URL ?? "file:../../mastra.db",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "baymax",
        // Local only: no data leaves the machine.
        exporters: [new DefaultExporter()],
        spanOutputProcessors: [new SensitiveDataFilter(), computerTraceFilter(), medicalTraceFilter()],
      },
    },
  }),
});
