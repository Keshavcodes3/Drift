import { z } from "zod";
import { BottleMood, DeliveryType } from "../bottles.types";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

export const updateBottleSchema = z.object({
  body: z.object({
    message: z
      .string()
      .min(1, "Message cannot be empty")
      .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
      .optional(),
    mood: z.nativeEnum(BottleMood).optional(),
    isAnonymous: z.boolean().optional(),
    deliveryType: z.nativeEnum(DeliveryType).optional(),
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

export type UpdateBottleInput = z.infer<typeof updateBottleSchema>["body"];