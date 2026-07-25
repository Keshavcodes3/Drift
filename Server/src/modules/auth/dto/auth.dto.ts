import { type IUser } from "../types/user.types.js";

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  user: Omit<IUser, "password" | "refreshToken">;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshDto {
  refreshToken: string;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface UserResponseDto {
  user: Omit<IUser, "password" | "refreshToken">;
}