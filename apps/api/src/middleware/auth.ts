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
    // For this assignment, simulate an authenticated user context
    // We use the seed user we created
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
