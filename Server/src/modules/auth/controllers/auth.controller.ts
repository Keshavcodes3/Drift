import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { StatusCodes } from "http-status-codes";
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  AuthenticatedRequest,
} from "../auth.types";
import { ApiError } from "../../../common/errors/api.error";

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens } = await authService.login(req.body);

      // Set HTTP-only cookies
      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Login successful",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user.id);

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token missing");
      }

      const tokens = await authService.refresh(req.user.id, refreshToken);

      // Set new HTTP-only cookies
      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Token refreshed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await authService.changePassword(req.user.id, req.body);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "User retrieved successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();