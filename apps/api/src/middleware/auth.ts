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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    }

    const token = authHeader.substring(7);
    const jwt = (await import('jsonwebtoken')).default;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
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
