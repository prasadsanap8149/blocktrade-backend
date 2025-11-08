import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

// Validation schemas
export const validationSchemas = {
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must only contain alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must be less than 30 characters',
        'any.required': 'Username is required',
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must be less than 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required',
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match password',
        'any.required': 'Password confirmation is required',
      }),
    
    firstName: Joi.string()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name is required',
        'string.max': 'First name must be less than 50 characters',
        'any.required': 'First name is required',
      }),
    
    lastName: Joi.string()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name is required',
        'string.max': 'Last name must be less than 50 characters',
        'any.required': 'Last name is required',
      }),
    
    // Role is optional - will be auto-assigned based on organization type and existing users
    role: Joi.string()
      .valid(
        'bank_admin', 
        'bank_officer', 
        'corporate_admin', 
        'corporate_user', 
        'nbfc_admin', 
        'nbfc_user', 
        'logistics_admin', 
        'logistics_user', 
        'insurance_admin', 
        'insurance_user'
      )
      .optional()
      .messages({
        'any.only': 'Role must be one of: bank_admin, bank_officer, corporate_admin, corporate_user, nbfc_admin, nbfc_user, logistics_admin, logistics_user, insurance_admin, insurance_user',
      }),
    
    // Organization ID is optional for new organization creation
    organizationId: Joi.string()
      .pattern(new RegExp('^[0-9a-fA-F]{24}$'))
      .optional()
      .messages({
        'string.pattern.base': 'Organization ID must be a valid MongoDB ObjectId',
      }),
    
    organizationName: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Organization name is required',
        'string.max': 'Organization name must be less than 100 characters',
        'any.required': 'Organization name is required',
      }),
    
    organizationType: Joi.string()
      .valid('bank', 'nbfc', 'corporate', 'logistics', 'insurance')
      .required()
      .messages({
        'any.only': 'Organization type must be one of: bank, nbfc, corporate, logistics, insurance',
        'any.required': 'Organization type is required',
      }),

    // Flag to indicate if creating new organization or joining existing
    isNewOrganization: Joi.boolean()
      .optional()
      .default(false)
      .messages({
        'boolean.base': 'isNewOrganization must be a boolean value',
      }),

    // Required fields for new organization creation
    organizationRegistrationNumber: Joi.string()
      .max(100)
      .when('isNewOrganization', {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.max': 'Organization registration number must be less than 100 characters',
      }),

    organizationCountryCode: Joi.string()
      .length(2)
      .uppercase()
      .when('isNewOrganization', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.length': 'Country code must be exactly 2 characters',
        'any.required': 'Country code is required for new organization',
      }),

    organizationAddress: Joi.object({
      street: Joi.string().max(100).required(),
      city: Joi.string().max(50).required(),
      state: Joi.string().max(50).required(),
      country: Joi.string().max(50).required(),
      postalCode: Joi.string().max(20).required(),
    }).when('isNewOrganization', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'any.required': 'Organization address is required for new organization',
    }),

    organizationContactPerson: Joi.object({
      name: Joi.string().max(100).optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().pattern(new RegExp('^[+]?[1-9]\\d{1,14}$')).optional(),
    }).optional(),

    organizationSwiftCode: Joi.string()
      .length(11)
      .uppercase()
      .when('organizationType', {
        is: 'bank',
        then: Joi.optional(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.length': 'SWIFT code must be exactly 11 characters',
      }),

    organizationLicenseNumber: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'License number must be less than 100 characters',
      }),

    // Terms and conditions acceptance
    acceptTerms: Joi.boolean()
      .valid(true)
      .required()
      .messages({
        'any.only': 'You must accept the terms and conditions',
        'any.required': 'Terms acceptance is required',
      }),

    agreeToMarketing: Joi.boolean()
      .optional()
      .default(false),
    
    permissions: Joi.array()
      .items(Joi.string())
      .optional()
      .messages({
        'array.base': 'Permissions must be an array of strings',
      }),
    
    phone: Joi.string()
      .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
    
    address: Joi.object({
      street: Joi.string().max(100).required(),
      city: Joi.string().max(50).required(),
      state: Joi.string().max(50).required(),
      country: Joi.string().max(50).required(),
      postalCode: Joi.string().max(20).required(),
    }).optional(),

    timezone: Joi.string()
      .optional()
      .messages({
        'string.base': 'Timezone must be a valid timezone string',
      }),

    language: Joi.string()
      .valid('en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi')
      .optional()
      .default('en')
      .messages({
        'any.only': 'Language must be one of: en, es, fr, de, pt, zh, ja, ko, ar, hi',
      }),
  }).custom((value, helpers) => {
    // Custom validation: if not creating new organization, organizationId is required
    if (!value.isNewOrganization && !value.organizationId) {
      return helpers.error('custom.organizationIdRequired');
    }
    
    // Custom validation: if creating new organization, certain fields are required
    if (value.isNewOrganization) {
      if (!value.organizationCountryCode) {
        return helpers.error('custom.countryCodeRequired');
      }
      if (!value.organizationAddress) {
        return helpers.error('custom.organizationAddressRequired');
      }
    }
    
    return value;
  }, 'Registration validation').messages({
    'custom.organizationIdRequired': 'Organization ID is required when joining an existing organization',
    'custom.countryCodeRequired': 'Country code is required when creating a new organization',
    'custom.organizationAddressRequired': 'Organization address is required when creating a new organization',
  }),

  login: Joi.object({
    username: Joi.string()
      .required()
      .messages({
        'any.required': 'Username is required',
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
    
    mfaCode: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .optional()
      .messages({
        'string.length': 'MFA code must be 6 digits',
        'string.pattern.base': 'MFA code must contain only digits',
      }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
      }),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name cannot be empty',
        'string.max': 'First name must be less than 50 characters',
      }),
    
    lastName: Joi.string()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name cannot be empty',
        'string.max': 'Last name must be less than 50 characters',
      }),
    
    phone: Joi.string()
      .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
    
    address: Joi.object({
      street: Joi.string().max(100).required(),
      city: Joi.string().max(50).required(),
      state: Joi.string().max(50).required(),
      country: Joi.string().max(50).required(),
      postalCode: Joi.string().max(20).required(),
    }).optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required',
      }),
    
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password must be less than 128 characters',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required',
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password',
        'any.required': 'Password confirmation is required',
      }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
  }),

  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required',
      }),
    
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must be less than 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required',
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password',
        'any.required': 'Password confirmation is required',
      }),
  }),

  updatePermissions: Joi.object({
    permissions: Joi.array()
      .items(Joi.string())
      .required()
      .messages({
        'array.base': 'Permissions must be an array of strings',
        'any.required': 'Permissions array is required',
      }),
  }),

  createOrganization: Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .required(),
    
    type: Joi.string()
      .valid('bank', 'nbfc', 'corporate', 'logistics', 'insurance')
      .required(),
    
    registrationNumber: Joi.string()
      .max(100)
      .optional(),
    
    countryCode: Joi.string()
      .length(3)
      .uppercase()
      .required(),
    
    address: Joi.object({
      street: Joi.string().max(100).required(),
      city: Joi.string().max(50).required(),
      state: Joi.string().max(50).required(),
      country: Joi.string().max(50).required(),
      postalCode: Joi.string().max(20).required(),
    }).required(),
    
    contactPerson: Joi.object({
      name: Joi.string().max(100).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().pattern(new RegExp('^[+]?[1-9]\\d{1,14}$')).required(),
      designation: Joi.string().max(100).required(),
      department: Joi.string().max(100).optional(),
    }).required(),
    
    swiftCode: Joi.string()
      .length(11)
      .uppercase()
      .optional(),
    
    licenseNumber: Joi.string()
      .max(100)
      .optional(),
    
    tradingLicense: Joi.string()
      .max(100)
      .optional(),
  }),
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('🚫 Validation failed:', {
        endpoint: req.originalUrl,
        method: req.method,
        errors: validationErrors,
        body: req.body,
      });

      const errorMessage = validationErrors
        .map((err) => `${err.field}: ${err.message}`)
        .join(', ');

      throw new AppError(`Validation failed: ${errorMessage}`, 400);
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Query parameter validation
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('🚫 Query validation failed:', {
        endpoint: req.originalUrl,
        method: req.method,
        errors: validationErrors,
        query: req.query,
      });

      const errorMessage = validationErrors
        .map((err) => `${err.field}: ${err.message}`)
        .join(', ');

      throw new AppError(`Query validation failed: ${errorMessage}`, 400);
    }

    // Replace req.query with validated and sanitized data
    req.query = value;
    next();
  };
};

// Parameter validation
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('🚫 Parameter validation failed:', {
        endpoint: req.originalUrl,
        method: req.method,
        errors: validationErrors,
        params: req.params,
      });

      const errorMessage = validationErrors
        .map((err) => `${err.field}: ${err.message}`)
        .join(', ');

      throw new AppError(`Parameter validation failed: ${errorMessage}`, 400);
    }

    // Replace req.params with validated and sanitized data
    req.params = value;
    next();
  };
};

// Common parameter schemas
export const paramSchemas = {
  userId: Joi.object({
    userId: Joi.string()
      .pattern(new RegExp('^[0-9a-fA-F]{24}$'))
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
        'any.required': 'User ID is required',
      }),
  }),

  id: Joi.object({
    id: Joi.string()
      .pattern(new RegExp('^[0-9a-fA-F]{24}$'))
      .required()
      .messages({
        'string.pattern.base': 'Invalid ID format',
        'any.required': 'ID is required',
      }),
  }),
};

// Common query schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  search: Joi.object({
    q: Joi.string().max(100).optional(),
    filter: Joi.string().optional(),
  }),
};
