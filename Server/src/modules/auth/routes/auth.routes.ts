import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../../../common/middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshSchema,
} from "../validations";
import { authMiddleware } from "../../../common/middlewares/auth.middleware";

const router = Router();

// Public routes
router.post(
  "/register",
  validate(registerSchema),
  authController.register.bind(authController)
);

router.post(
  "/login",
  validate(loginSchema),
  authController.login.bind(authController)
);

// Protected routes (require authentication)
router.post(
  "/logout",
  authMiddleware,
  authController.logout.bind(authController)
);

router.post(
  "/refresh",
  validate(refreshSchema),
  authMiddleware,
  authController.refresh.bind(authController)
);

router.patch(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword.bind(authController)
);

router.get(
  "/me",
  authMiddleware,
  authController.me.bind(authController)
);

export const authRoutes = router;