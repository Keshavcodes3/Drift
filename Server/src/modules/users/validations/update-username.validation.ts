import { z } from "zod";

export const updateUsernameSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
  }),
});

export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>["body"];