import { Request, Response, NextFunction } from "express";
import { bottleService } from "../services/bottle.service";
import { ApiResponse } from "../../../common/utils/api.response";
import { AuthenticatedRequest } from "../../auth/auth.types";
import { StatusCodes } from "http-status-codes";
import {
  CreateBottleInput,
  UpdateBottleInput,
  BottleStatus,
} from "../bottles.types";

class BottleController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bottle = await bottleService.createBottle(req.user.id, req.body);
      
      res.status(StatusCodes.CREATED).json(
        new ApiResponse(
          StatusCodes.CREATED,
          "Bottle created successfully",
          bottle
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const bottle = await bottleService.updateDraft(
        id,
        req.user.id,
        req.body
      );
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Bottle updated successfully",
          bottle
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await bottleService.deleteDraft(id, req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, "Bottle deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  async throwBottle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const bottle = await bottleService.throwBottle(id, req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Bottle thrown successfully",
          bottle
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getBottle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const bottle = await bottleService.getBottle(id, req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Bottle retrieved successfully",
          bottle
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getMine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      
      const bottles = await bottleService.getMyBottles(
        req.user.id,
        status as BottleStatus,
        limit,
        page
      );
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Bottles retrieved successfully",
          bottles
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async archive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const bottle = await bottleService.archiveBottle(id, req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Bottle archived successfully",
          bottle
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async favorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const bottle = await bottleService.favoriteBottle(id, req.user.id);
      
      res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          "Bottle favorited successfully",
          bottle
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

export const bottleController = new BottleController();