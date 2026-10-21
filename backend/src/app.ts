import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { authGuard, roleGuard } from './middlewares/authGuard';
import prisma from './config/prisma';

import authRouter from './modules/auth/auth.router';
import jugadoresRouter from './modules/jugadores/jugadores.router';
import torneosRouter from './modules/torneos/torneos.router';
import gruposRouter from './modules/grupos/grupos.router';
import partidasRouter from './modules/partidas/partidas.router';
import rankingRouter from './modules/ranking/ranking.router';
import bracketRouter from './modules/bracket/bracket.router';
import inscripcionesRouter from './modules/inscripciones/inscripciones.router';

const app = express();

// ─── SEGURIDAD ───────────────────────────────────────────────────────────────

// Helmet: headers de seguridad HTTP
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS configurado para producción y desarrollo
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.CORS_ORIGIN === '*' ||
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.endsWith('.trycloudflare.com') ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


// Confiar en proxies inversos (Render, Netlify, Railway, Heroku, Cloudflare)
// Permite obtener la IP real del cliente desde X-Forwarded-For
app.set('trust proxy', 1);

// Rate limiting global: Alta capacidad para marcadores y torneos en vivo (5000 req/min)
// Las peticiones autenticadas y las de marcador/partidas quedan exentas para evitar bloqueos
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  skip: (req) => {
    // Nunca limitar rutas de tiempo real, partidas, marcador o health
    if (req.path.startsWith('/api/v1/partidas')) return true;
    if (req.path === '/api/v1/health') return true;
    // Eximir usuarios autenticados (jueces, admin en partidas)
    if (req.headers.authorization) return true;
    return false;
  },
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Rate limiting para login: 30 intentos por minuto por IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiados intentos de login. Espera un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ─── RUTAS ───────────────────────────────────────────────────────────────────

// Login con rate limit estricto
app.use('/api/v1/auth/login', loginLimiter);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/jugadores', jugadoresRouter);
app.use('/api/v1/torneos', torneosRouter);
app.use('/api/v1/grupos', gruposRouter);
app.use('/api/v1/partidas', partidasRouter);
app.use('/api/v1/ranking', rankingRouter);
app.use('/api/v1/bracket', bracketRouter);
app.use('/api/v1/inscripciones', inscripcionesRouter);

// Health check
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── RESET: Vaciar base de datos (solo admin, con confirmación) ──────────────
app.delete('/api/v1/admin/reset', authGuard, roleGuard('admin'), async (req, res, next) => {
  try {
    const { confirmar } = req.body as { confirmar?: string };
    if (confirmar !== 'ELIMINAR_TODO') {
      return res.status(400).json({ error: 'Debes enviar { "confirmar": "ELIMINAR_TODO" } para confirmar' });
    }

    await prisma.entradaSet.deleteMany();
    await prisma.set.deleteMany();
    await prisma.bracketSlot.deleteMany();
    await prisma.partida.deleteMany();
    await prisma.grupoJugador.deleteMany();
    await prisma.grupo.deleteMany();
    await prisma.ranking.deleteMany();
    await prisma.inscripcionTorneo.deleteMany();
    await prisma.fase.deleteMany();
    await prisma.torneo.deleteMany();
    await prisma.jugador.deleteMany();
    await prisma.club.deleteMany();

    console.log(`[AUDIT] Base de datos vaciada por admin ${(req as any).user?.email} a las ${new Date().toISOString()}`);
    res.json({ mensaje: 'Base de datos vaciada correctamente. Los usuarios se mantienen.' });
  } catch (err) { next(err); }
});

import { sincronizarEsquemaBD } from './config/schemaSync';

// Error handler (siempre al final)
app.use(errorHandler);

app.listen(env.PORT, async () => {
  console.log(`Servidor corriendo en http://localhost:${env.PORT} [${process.env.NODE_ENV}]`);
  await sincronizarEsquemaBD();
});

export default app;
