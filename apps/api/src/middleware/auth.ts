import { Request, Response, NextFunction } from 'express';
import { prisma } from 'database';

// Extend Express Request object to include currentUser
declare global {
  namespace Express {
    interface Request {
      currentUser?: any;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof req.query.token === 'string' && req.query.token) {
      token = req.query.token;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)(?:auth_token|token)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    }

    const jwt = (await import('jsonwebtoken')).default;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production') as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
      }

      req.currentUser = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  } catch (error) {
    next(error);
  }
};

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof req.query.token === 'string' && req.query.token) {
      token = req.query.token;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)(?:auth_token|token)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (token) {
      const jwt = (await import('jsonwebtoken')).default;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production') as { userId: string };
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        if (user) {
          req.currentUser = user;
        }
      } catch (jwtError) {
        // Ignored for optional auth
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
