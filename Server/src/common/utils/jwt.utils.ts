import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { JwtPayload } from "../../modules/auth/auth.types";

class JwtUtils {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || "default-access-secret";
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || "default-refresh-secret";
    this.accessTokenExpiry = "15m"; // 15 minutes
    this.refreshTokenExpiry = "7d";  // 7 days
  }

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(
      {
        id: payload.id.toString(),
        email: payload.email,
        role: payload.role,
      },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(
      {
        id: payload.id.toString(),
        email: payload.email,
        role: payload.role,
      },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
  }

  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload | null;
    } catch {
      return null;
    }
  }
}

export const jwtUtils = new JwtUtils();