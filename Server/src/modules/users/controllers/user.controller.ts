import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service";
import { ApiResponse } from "../../../common/utils/api.response";
import { AuthenticatedRequest } from "../../auth/auth.types";
import { StatusCodes } from "http-status-codes";

class UserController {
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getProfile(req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "User profile retrieved successfully",
          user
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "User retrieved successfully",
          user
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Profile updated successfully",
          user
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async updateAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ApiResponse(
          StatusCodes.BAD_REQUEST,
          "No image file provided"
        );
      }
      
      const user = await userService.updateAvatar(req.user.id, req.file);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Avatar updated successfully",
          user
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async updateCoverImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ApiResponse(
          StatusCodes.BAD_REQUEST,
          "No image file provided"
        );
      }
      
      const user = await userService.updateCoverImage(req.user.id, req.file);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Cover image updated successfully",
          user
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async updateUsername(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateUsername(req.user.id, req.body);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Username updated successfully",
          user
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await userService.deleteAccount(id, req.user.id);
      
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Account deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.searchUsers({
        query: req.query.q as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
      });
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Users retrieved successfully",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();