// Controllers
export { authController } from "./controllers/auth.controller";

// Services
export { authService } from "./services/auth.service";

// Repositories
export { userRepository } from "./repositories/user.repository";

// Models
export { UserModel } from "./models/user.model";

// Routes
export { authRoutes } from "./routes/auth.routes";

// Types
export type {
  IUser,
  JwtPayload,
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  AuthenticatedRequest,
  TokenPair,
} from "./auth.types";

// Validations
export {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshSchema,
} from "./validations";