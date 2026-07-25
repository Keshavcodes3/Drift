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

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: "Current password is required" }),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmNewPassword: z.string({ required_error: "Please confirm your new password" }),
  }).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];