import { z } from "zod";

const passwordRegex = /
  ^               # Start of string
  (?=.*[a-z])     # At least one lowercase letter
  (?=.*[A-Z])     # At least one uppercase letter
  (?=.*\d)        # At least one digit
  (?=.*[!@#$%^&*]) # At least one special character
  .{8,}           # At least 8 characters long
  $               # End of string
/
;

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];