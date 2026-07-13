import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db';

export interface AuthenticatedAdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    fullName: string;
  };
}

/**
 * Middleware to authenticate an administrator session (admin JWT).
 */
export async function verifyAdminSession(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.admin_token) {
      token = req.cookies.admin_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Admin session token missing' });
    }

    const decoded = jwt.verify(token, config.jwtAdminSecret) as { id: string; email: string; fullName: string };
    
    // Check database to ensure admin account exists
    const result = await db.query(
      'SELECT id, email, full_name FROM admins WHERE id = $1',
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Unauthorized: Admin account not found' });
    }

    const admin = result.rows[0];
    req.admin = {
      id: admin.id,
      email: admin.email,
      fullName: admin.full_name,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin session' });
  }
}
