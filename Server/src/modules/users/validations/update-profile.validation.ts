import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    bio: z
      .string()
      .max(500, "Bio cannot exceed 500 characters")
      .optional(),
    // Note: avatar and coverImage are handled by separate endpoints
    // with file uploads, so they're not included here
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];