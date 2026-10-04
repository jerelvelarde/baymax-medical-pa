import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { medicalProfile } from "../medical-record/profile";
import { medicalContext } from "../medical-record/context";
import { importedHealth } from '../lib/health-reader';

const userInfoSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  conditions: z.array(z.string()),
  medications: z.array(z.string()),
  allergies: z.array(z.string()),
  notes: z.string().optional(),
});

/** Returns the current user's profile from Postgres. */
export const userInfoTool = createTool({
  id: "get-user-info",
  description:
    "Get basic information about the current user, including their name, age, health conditions, medications, and allergies. Use this to personalize advice and before drafting care plans or doctor briefs.",
  inputSchema: z.object({}),
  outputSchema: userInfoSchema,
  execute: async (_input, context) => {
    return medicalProfile(medicalContext(context), !(await importedHealth(context)).connected);
  },
});
