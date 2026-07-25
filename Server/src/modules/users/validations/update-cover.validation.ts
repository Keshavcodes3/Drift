import { z } from "zod";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for cover images

export const updateCoverSchema = z.object({
  file: z
    .custom<Express.Multer.File>((val) => {
      if (!val) return false;
      return true;
    }, "File is required")
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.mimetype),
      "Only JPEG, JPG, PNG, WebP, and GIF images are allowed"
    )
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      "File size must be less than 10MB"
    ),
});