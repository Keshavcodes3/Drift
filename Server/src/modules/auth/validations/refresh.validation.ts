import { z } from "zod";

export const refreshSchema = z.object({
  cookies: z.object({
    refreshToken: z
      .string({ required_error: "Refresh token is required" })
      .min(1, "Refresh token cannot be empty"),
  }),
});

export type RefreshInput = z.infer<typeof refreshSchema>["cookies"];