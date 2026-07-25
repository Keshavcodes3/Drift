import { Router } from "express";
import { bottleController } from "../controllers/bottle.controller";
import { validate } from "../../../common/middlewares/validate.middleware";
import {
  createBottleSchema,
  updateBottleSchema,
} from "../validations";
import { authMiddleware } from "../../../common/middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Bottle CRUD operations
router.post(
  "/",
  validate(createBottleSchema),
  bottleController.create.bind(bottleController)
);

router.get(
  "/me",
  bottleController.getMine.bind(bottleController)
);

router.get(
  "/:id",
  bottleController.getBottle.bind(bottleController)
);

router.patch(
  "/:id",
  validate(updateBottleSchema),
  bottleController.update.bind(bottleController)
);

router.delete(
  "/:id",
  bottleController.delete.bind(bottleController)
);

// Bottle actions
router.post(
  "/:id/throw",
  bottleController.throwBottle.bind(bottleController)
);

router.post(
  "/:id/archive",
  bottleController.archive.bind(bottleController)
);

router.post(
  "/:id/favorite",
  bottleController.favorite.bind(bottleController)
);

export const bottleRoutes = router;