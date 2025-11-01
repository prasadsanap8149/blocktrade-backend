import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import UserModel from '../models/User.model';
import { AppError } from './errorHandler';
import { JWTPayload, UserRole } from '../types/user.types';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new AppError('Access token is required', 401);
    }

    // Verify the token
    const decoded = authService.verifyAccessToken(token);
    
    // Check if user still exists and is active
    const userModel = new UserModel();
    const user = await userModel.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      throw new AppError('User account is inactive or does not exist', 401);
    }

    // Check if account is locked
    const isLocked = await userModel.isAccountLocked(decoded.userId);
    if (isLocked) {
      throw new AppError('Account is temporarily locked', 423);
    }
    
    // Attach user info to request
    req.user = decoded;
    
    logger.debug(`🔐 Authenticated user: ${decoded.username} (${decoded.role}) - Org: ${decoded.organizationType}`);
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid or expired token', 401));
    }
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          403
        );
      }

      logger.debug(`✅ Role check passed: ${req.user.role} in [${allowedRoles.join(', ')}]`);
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!req.user.permissions.includes(permission)) {
        throw new AppError(
          `Access denied. Required permission: ${permission}`,
          403
        );
      }

      logger.debug(`✅ Permission check passed: ${permission} for user ${req.user.username}`);
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const hasPermission = permissions.some(permission => 
        req.user!.permissions.includes(permission)
      );

      if (!hasPermission) {
        throw new AppError(
          `Access denied. Required any of: ${permissions.join(', ')}`,
          403
        );
      }

      logger.debug(`✅ Permission check passed: user has one of [${permissions.join(', ')}]`);
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireOrganizationType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!allowedTypes.includes(req.user.organizationType)) {
        throw new AppError(
          `Access denied. Required organization types: ${allowedTypes.join(', ')}`,
          403
        );
      }

      logger.debug(`✅ Organization type check passed: ${req.user.organizationType} in [${allowedTypes.join(', ')}]`);
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireSameOrganization = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const targetOrgId = req.params.organizationId || req.body.organizationId;
    
    if (targetOrgId && targetOrgId !== req.user.organizationId) {
      // Allow bank admins and officers to access other organizations
      const allowedRoles: UserRole[] = ['bank_admin', 'bank_officer'];
      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError('Access denied. Can only access your own organization data', 403);
      }
    }

    logger.debug(`✅ Organization access check passed for user ${req.user.username}`);
    
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = authService.extractTokenFromHeader(req.headers.authorization);
  
  if (token) {
    try {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
      logger.debug(`🔐 Optional auth successful: ${decoded.username}`);
    } catch (error) {
      // Token exists but is invalid - continue without user
      logger.debug('🔐 Optional auth failed, continuing without user');
    }
  }
  
  next();
};

// Pre-defined role combinations for common use cases
export const requireBankStaff = requireRole(['bank_admin', 'bank_officer']);

export const requireCorporateStaff = requireRole(['corporate_admin', 'corporate_user']);

export const requireNBFCStaff = requireRole(['nbfc_admin', 'nbfc_user']);

export const requireLogisticsStaff = requireRole(['logistics_admin', 'logistics_user']);

export const requireInsuranceStaff = requireRole(['insurance_admin', 'insurance_user']);

export const requireAdminLevel = requireRole([
  'bank_admin', 
  'corporate_admin', 
  'nbfc_admin', 
  'logistics_admin', 
  'insurance_admin'
]);

export const requireAnyBankAccess = requireOrganizationType(['bank']);

export const requireAnyFinancialAccess = requireOrganizationType(['bank', 'nbfc']);

// Middleware for accessing only bank-related resources
export const requireBankAccess = [
  authenticateToken,
  requireOrganizationType(['bank'])
];

// Middleware for accessing trade finance resources
export const requireTradeFinanceAccess = [
  authenticateToken,
  requireOrganizationType(['bank', 'nbfc', 'corporate'])
];

// Middleware for full system access
export const requireSystemAccess = [
  authenticateToken,
  requireRole(['bank_admin'])
];
