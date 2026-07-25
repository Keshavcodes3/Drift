import { userRepository } from "../repositories/user.repository.js";
import { jwtUtils } from "../../../common/utils/jwt.utils.js";
import { ApiError } from "../../../common/errors/api.error.js";
import {
  type IUser,
  type RegisterInput,
  type LoginInput,
  type ChangePasswordInput,
  type TokenPair,
} from "../auth.types.js";
import { StatusCodes } from "http-status-codes";

class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(private bcrypt: typeof import("bcrypt") = globalThis.bcrypt) { }

  async register(input: RegisterInput): Promise<Omit<IUser, "password" | "refreshToken">> {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ApiError(StatusCodes.CONFLICT, "Email already in use");
    }

    const existingUsername = await userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ApiError(StatusCodes.CONFLICT, "Username already taken");
    }

    const hashedPassword = await this.bcrypt.hash(input.password, this.SALT_ROUNDS);

    const user = await userRepository.create({
      ...input,
      password: hashedPassword,
      role: "user",
      status: "active",
    });

    // Remove sensitive data before returning
    const { password, refreshToken, ...userWithoutSensitiveData } = user;
    return userWithoutSensitiveData;
  }

  async login(input: LoginInput): Promise<{
    user: Omit<IUser, "password" | "refreshToken">;
    tokens: TokenPair;
  }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    const isPasswordValid = await user.comparePassword(input.password);
    if (!isPasswordValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    if (user.status !== "active") {
      throw new ApiError(StatusCodes.FORBIDDEN, "Account is not active");
    }

    const tokens = this.generateTokens(user);
    await userRepository.saveRefreshToken(user._id.toString(), tokens.refreshToken);

    // Remove sensitive data before returning
    const { password, refreshToken, ...userWithoutSensitiveData } = user;
    return { user: userWithoutSensitiveData, tokens };
  }

  async logout(userId: string): Promise<void> {
    await userRepository.removeRefreshToken(userId);
  }

  async refresh(userId: string, refreshToken: string): Promise<TokenPair> {
    const user = await userRepository.findById(userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
    }

    const newTokens = this.generateTokens(user);
    await userRepository.saveRefreshToken(user._id.toString(), newTokens.refreshToken);

    return newTokens;
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    const isPasswordValid = await user.comparePassword(input.oldPassword);
    if (!isPasswordValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Current password is incorrect");
    }

    const hashedPassword = await this.bcrypt.hash(input.newPassword, this.SALT_ROUNDS);
    await userRepository.updatePassword(user._id.toString(), hashedPassword);
  }

  async getCurrentUser(userId: string): Promise<Omit<IUser, "password" | "refreshToken">> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    await userRepository.updateLastSeen(userId);

    // Remove sensitive data before returning
    const { password, refreshToken, ...userWithoutSensitiveData } = user;
    return userWithoutSensitiveData;
  }

  private generateTokens(user: IUser): TokenPair {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: jwtUtils.generateAccessToken(payload),
      refreshToken: jwtUtils.generateRefreshToken(payload),
    };
  }
}

export const authService = new AuthService();