import { z } from "zod";
import { BottleMood, DeliveryType } from "../bottles.types";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

export const createBottleSchema = z.object({
  body: z.object({
    message: z
      .string()
      .min(1, "Message cannot be empty")
      .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
    mood: z.nativeEnum(BottleMood),
    isAnonymous: z.boolean().optional().default(false),
    deliveryType: z.nativeEnum(DeliveryType),
    deliveryTime: z
      .date()
      .optional()
      .refine(
        (val) => {
          if (val) return val > new Date(); // Must be in the future
          return true;
        },
        "Delivery time must be in the future"
      ),
    tags: z
      .array(z.string().max(MAX_TAG_LENGTH, `Tag cannot exceed ${MAX_TAG_LENGTH} characters`))
      .max(MAX_TAGS, `Cannot have more than ${MAX_TAGS} tags`)
      .optional(),
  }),
});

export type CreateBottleInput = z.infer<typeof createBottleSchema>["body"];