import { Request, Response, NextFunction } from "express";
import { jwtUtils } from "../utils/jwt.utils";
import { ApiError } from "../errors/api.error";
import { StatusCodes } from "http-status-codes";
import { AuthenticatedRequest } from "../../modules/auth/auth.types";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookies
    const accessToken = req.cookies.accessToken;
    
    if (!accessToken) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Authentication required. Please log in."
      );
    }
    
    // Verify token
    const decoded = jwtUtils.verifyAccessToken(accessToken);
    
    // Attach user to request
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      // Handle JWT specific errors
      if (error.name === "TokenExpiredError") {
        next(
          new ApiError(
            StatusCodes.UNAUTHORIZED,
            "Session expired. Please log in again."
          )
        );
      } else if (error.name === "JsonWebTokenError") {
        next(
          new ApiError(
            StatusCodes.UNAUTHORIZED,
            "Invalid token. Please log in again."
          )
        );
      } else {
        next(
          new ApiError(
            StatusCodes.UNAUTHORIZED,
            "Authentication failed. Please log in."
          )
        );
      }
    }
  }
};