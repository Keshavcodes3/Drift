import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { validate } from "../../../common/middlewares/validate.middleware";
import {
  updateProfileSchema,
  updateAvatarSchema,
  updateCoverSchema,
  updateUsernameSchema,
  searchSchema,
} from "../validations";
import { authMiddleware } from "../../../common/middlewares/auth.middleware";
import { upload } from "../../../common/middlewares/multer.middleware";

const router = Router();

// Public route (no auth required)
router.get("/:id", userController.getUser.bind(userController));

// Protected routes (require authentication)
router.get(
  "/me",
  authMiddleware,
  userController.me.bind(userController)
);

router.patch(
  "/profile",
  authMiddleware,
  validate(updateProfileSchema),
  userController.updateProfile.bind(userController)
);

router.patch(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  validate(updateAvatarSchema),
  userController.updateAvatar.bind(userController)
);

router.patch(
  "/cover",
  authMiddleware,
  upload.single("coverImage"),
  validate(updateCoverSchema),
  userController.updateCoverImage.bind(userController)
);

router.patch(
  "/username",
  authMiddleware,
  validate(updateUsernameSchema),
  userController.updateUsername.bind(userController)
);

router.delete(
  "/:id",
  authMiddleware,
  userController.deleteAccount.bind(userController)
);

router.get(
  "/search",
  authMiddleware,
  validate(searchSchema),
  userController.searchUsers.bind(userController)
);

export const userRoutes = router;