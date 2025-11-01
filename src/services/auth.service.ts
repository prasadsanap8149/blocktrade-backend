import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload, AuthTokens } from '../types/user.types';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export class AuthService {
  private jwtSecret: string | null = null;
  private jwtRefreshSecret: string | null = null;
  private jwtExpiresIn: string | null = null;
  private jwtRefreshExpiresIn: string | null = null;

  constructor() {
    // Don't load environment variables in constructor
    // They will be loaded when methods are called
  }

  private getSecrets(): { jwtSecret: string; jwtRefreshSecret: string; jwtExpiresIn: string; jwtRefreshExpiresIn: string } {
    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      this.jwtSecret = process.env.JWT_SECRET || '';
      this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';
      this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
      this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

      if (!this.jwtSecret || !this.jwtRefreshSecret) {
        throw new Error('JWT secrets are required in environment variables');
      }
    }

    return {
      jwtSecret: this.jwtSecret,
      jwtRefreshSecret: this.jwtRefreshSecret,
      jwtExpiresIn: this.jwtExpiresIn!,
      jwtRefreshExpiresIn: this.jwtRefreshExpiresIn!,
    };
  }

  generateTokens(payload: JWTPayload, rememberMe: boolean = false): AuthTokens {
    try {
      const secrets = this.getSecrets();
      
      // Use longer expiry if remember me is checked
      const accessTokenExpiry = rememberMe ? '7d' : secrets.jwtExpiresIn;
      const refreshTokenExpiry = rememberMe ? '90d' : secrets.jwtRefreshExpiresIn;
      
      const accessToken = jwt.sign(
        payload,
        secrets.jwtSecret,
        {
          expiresIn: accessTokenExpiry,
          issuer: 'blocktrade-api',
          audience: 'blocktrade-frontend',
        } as SignOptions
      );

      const refreshToken = jwt.sign(
        { 
          userId: payload.userId,
          organizationId: payload.organizationId,
          organizationType: payload.organizationType
        },
        secrets.jwtRefreshSecret,
        {
          expiresIn: refreshTokenExpiry,
          issuer: 'blocktrade-api',
          audience: 'blocktrade-frontend',
        } as SignOptions
      );

      // Calculate expiry time in seconds
      const decoded = jwt.decode(accessToken) as any;
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      logger.info(`🔐 Tokens generated for user: ${payload.username} (${payload.organizationType}) - Remember Me: ${rememberMe}`);

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      logger.error('❌ Error generating tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      const secrets = this.getSecrets();
      
      const decoded = jwt.verify(token, secrets.jwtSecret, {
        issuer: 'blocktrade-api',
        audience: 'blocktrade-frontend',
      }) as unknown as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      logger.error('❌ Error verifying access token:', error);
      throw new Error('Token verification failed');
    }
  }

  verifyRefreshToken(token: string): { userId: string; organizationId: string; organizationType: string } {
    try {
      const secrets = this.getSecrets();
      
      const decoded = jwt.verify(token, secrets.jwtRefreshSecret, {
        issuer: 'blocktrade-api',
        audience: 'blocktrade-frontend',
      }) as unknown as { userId: string; organizationId: string; organizationType: string };

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      logger.error('❌ Error verifying refresh token:', error);
      throw new Error('Refresh token verification failed');
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('❌ Error decoding token:', error);
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
}

export const authService = new AuthService();
export default authService;
