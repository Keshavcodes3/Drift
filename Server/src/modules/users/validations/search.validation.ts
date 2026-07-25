import { z } from "zod";

export const searchSchema = z.object({
  query: z.object({
    q: z
      .string()
      .min(2, "Search query must be at least 2 characters")
      .max(50, "Search query cannot exceed 50 characters"),
    limit: z
      .string()
      .optional()
      .refine((val) => !val || (Number(val) > 0 && Number(val) <= 100), {
        message: "Limit must be between 1 and 100",
      })
      .transform((val) => (val ? Number(val) : 10)),
    page: z
      .string()
      .optional()
      .refine((val) => !val || Number(val) > 0, {
        message: "Page must be a positive number",
      })
      .transform((val) => (val ? Number(val) : 1)),
  }),
});

export type SearchInput = z.infer<typeof searchSchema>["query"];