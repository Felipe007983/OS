import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key-for-dev',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5173',
};
