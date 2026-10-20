import dotenv from 'dotenv';
dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_cambiar_en_produccion',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  PORT: parseInt(process.env.PORT || '3000'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
