import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string()
    .pattern(new RegExp('^[a-zA-Z0-9_]+$'))
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.pattern.base': 'Username must only contain alphanumeric characters and underscores',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),

  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required'
    }),

  role: Joi.string()
    .valid(
      'bank_admin', 'bank_officer', 
      'corporate_admin', 'corporate_user', 
      'nbfc_admin', 'nbfc_user', 
      'logistics_admin', 'logistics_user', 
      'insurance_admin', 'insurance_user'
    )
    .optional()
    .messages({
      'any.only': 'Role must be one of: bank_admin, bank_officer, corporate_admin, corporate_user, nbfc_admin, nbfc_user, logistics_admin, logistics_user, insurance_admin, insurance_user'
    }),

  organizationId: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Organization ID must be a valid UUID',
      'any.required': 'Organization ID is required'
    }),

  organizationName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Organization name must be at least 2 characters long',
      'string.max': 'Organization name must not exceed 100 characters',
      'any.required': 'Organization name is required'
    }),

  organizationType: Joi.string()
    .valid('bank', 'nbfc', 'corporate', 'logistics', 'insurance')
    .required()
    .messages({
      'any.only': 'Organization type must be one of: bank, nbfc, corporate, logistics, insurance',
      'any.required': 'Organization type is required'
    }),

  permissions: Joi.array()
    .items(Joi.string())
    .optional()
    .messages({
      'array.base': 'Permissions must be an array of strings'
    }),

  phone: Joi.string()
    .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  address: Joi.object({
    street: Joi.string().max(200).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().max(100).optional(),
    postalCode: Joi.string().max(20).optional()
  })
    .optional()
    .messages({
      'object.base': 'Address must be an object with street, city, state, country, and postalCode fields'
    })
});

export const loginSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'any.required': 'Username is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),

  mfaCode: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .optional()
    .messages({
      'string.length': 'MFA code must be 6 digits',
      'string.pattern.base': 'MFA code must contain only numbers'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required'
    })
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters'
    }),

  phone: Joi.string()
    .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  bio: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Bio must not exceed 500 characters'
    }),

  timezone: Joi.string()
    .optional()
    .messages({
      'string.base': 'Timezone must be a valid string'
    }),

  language: Joi.string()
    .length(2)
    .optional()
    .messages({
      'string.length': 'Language must be a 2-character code (e.g., en, es, fr)'
    }),

  notifications: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    marketing: Joi.boolean().optional()
  })
    .optional()
    .messages({
      'object.base': 'Notifications must be an object with boolean values'
    }),

  address: Joi.object({
    street: Joi.string().max(200).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().max(100).optional(),
    postalCode: Joi.string().max(20).optional()
  })
    .optional()
    .messages({
      'object.base': 'Address must be an object with street, city, state, country, and postalCode fields'
    })
});
