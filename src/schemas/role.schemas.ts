import Joi from 'joi';

// Role Management Schemas

export const createRoleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Role name must contain only lowercase letters, numbers, and underscores'
    }),
  
  displayName: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required(),
  
  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required(),
  
  level: Joi.string()
    .valid('platform', 'organization_super', 'organization_admin', 'organization_standard', 'entity_specific')
    .required(),
  
  category: Joi.string()
    .valid('system', 'admin', 'manager', 'user', 'viewer', 'specialist')
    .required(),
  
  permissions: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required(),
  
  organizationId: Joi.string()
    .trim()
    .optional(),
  
  entityType: Joi.string()
    .valid('bank', 'nbfc', 'corporate', 'logistics', 'insurance')
    .optional(),
  
  parentRoleId: Joi.string()
    .trim()
    .optional(),
  
  restrictions: Joi.array()
    .items(Joi.object({
      type: Joi.string()
        .valid('time_based', 'ip_based', 'feature_based', 'data_based')
        .required(),
      value: Joi.any().required(),
      description: Joi.string().required()
    }))
    .optional(),
  
  metadata: Joi.object({
    departmentId: Joi.string().optional(),
    regionId: Joi.string().optional(),
    branchId: Joi.string().optional(),
    costCenter: Joi.string().optional(),
    reportingTo: Joi.string().optional(),
    customFields: Joi.object().optional()
  }).optional()
}).options({ stripUnknown: true });

export const updateRoleSchema = Joi.object({
  displayName: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional(),
  
  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .optional(),
  
  permissions: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .optional(),
  
  restrictions: Joi.array()
    .items(Joi.object({
      type: Joi.string()
        .valid('time_based', 'ip_based', 'feature_based', 'data_based')
        .required(),
      value: Joi.any().required(),
      description: Joi.string().required()
    }))
    .optional(),
  
  metadata: Joi.object({
    departmentId: Joi.string().optional(),
    regionId: Joi.string().optional(),
    branchId: Joi.string().optional(),
    costCenter: Joi.string().optional(),
    reportingTo: Joi.string().optional(),
    customFields: Joi.object().optional()
  }).optional(),
  
  isActive: Joi.boolean().optional()
}).options({ stripUnknown: true });

// Role Assignment Schemas

export const assignRoleSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'User ID is required'
    }),
  
  roleId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Role ID is required'
    }),
  
  organizationId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Organization ID is required'
    }),
  
  expiresAt: Joi.date()
    .iso()
    .greater('now')
    .optional()
    .messages({
      'date.greater': 'Expiration date must be in the future'
    }),
  
  isTemporary: Joi.boolean()
    .optional()
    .default(false),
  
  restrictions: Joi.array()
    .items(Joi.object({
      type: Joi.string()
        .valid('time_based', 'ip_based', 'feature_based', 'data_based')
        .required(),
      value: Joi.any().required(),
      description: Joi.string().required(),
      appliedBy: Joi.string().required(),
      appliedAt: Joi.date().required()
    }))
    .optional(),
  
  metadata: Joi.object({
    departmentId: Joi.string().optional(),
    regionId: Joi.string().optional(),
    branchId: Joi.string().optional(),
    costCenter: Joi.string().optional(),
    reportingTo: Joi.string().optional(),
    assignmentReason: Joi.string().optional(),
    notes: Joi.string().optional(),
    customFields: Joi.object().optional()
  }).optional()
}).options({ stripUnknown: true });

export const revokeRoleSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .required(),
  
  roleId: Joi.string()
    .trim()
    .required(),
  
  organizationId: Joi.string()
    .trim()
    .required(),
  
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
}).options({ stripUnknown: true });

// User Journey Schemas

export const startJourneySchema = Joi.object({
  targetUserId: Joi.string()
    .trim()
    .optional(),
  
  organizationType: Joi.string()
    .valid('bank', 'nbfc', 'corporate', 'logistics', 'insurance')
    .required()
    .messages({
      'any.required': 'Organization type is required to start user journey'
    })
}).options({ stripUnknown: true });

export const journeyStepSchema = Joi.object({
  targetUserId: Joi.string()
    .trim()
    .optional(),
  
  stepData: Joi.object()
    .required()
    .messages({
      'any.required': 'Step data is required'
    })
}).options({ stripUnknown: true });

// Step-specific schemas for validation
export const step1Schema = Joi.object({
  organizationRole: Joi.string()
    .valid('admin', 'manager', 'user', 'viewer')
    .required(),
  
  department: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),
  
  reportingManager: Joi.string()
    .trim()
    .optional(),
  
  teamMembers: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  
  projectAssignments: Joi.array()
    .items(Joi.string().trim())
    .optional()
}).options({ stripUnknown: true });

export const step2Schema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required(),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required(),
  
  email: Joi.string()
    .email()
    .required(),
  
  phone: Joi.string()
    .pattern(/^\+?[\d\s-()]+$/)
    .required(),
  
  bio: Joi.string()
    .trim()
    .max(500)
    .optional(),
  
  profilePicture: Joi.string()
    .uri()
    .optional(),
  
  timezone: Joi.string()
    .optional(),
  
  language: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh')
    .optional()
}).options({ stripUnknown: true });

export const step3Schema = Joi.object({
  passwordConfirmed: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'Password confirmation is required'
    }),
  
  securityQuestions: Joi.array()
    .items(Joi.object({
      question: Joi.string().required(),
      answer: Joi.string().required()
    }))
    .min(2)
    .max(5)
    .required(),
  
  mfaEnabled: Joi.boolean()
    .optional(),
  
  backupEmail: Joi.string()
    .email()
    .optional()
}).options({ stripUnknown: true });

export const step4Schema = Joi.object({
  notifications: Joi.object({
    email: Joi.boolean().required(),
    sms: Joi.boolean().required(),
    push: Joi.boolean().required(),
    marketing: Joi.boolean().required()
  }).required(),
  
  theme: Joi.string()
    .valid('light', 'dark', 'auto')
    .optional(),
  
  language: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh')
    .optional(),
  
  timezone: Joi.string()
    .optional()
}).options({ stripUnknown: true });

export const step5Schema = Joi.object({
  trainingModulesCompleted: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one training module must be completed'
    }),
  
  complianceAcknowledgment: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'Compliance acknowledgment is required'
    }),
  
  additionalTraining: Joi.array()
    .items(Joi.string().trim())
    .optional()
}).options({ stripUnknown: true });

// System Administration Schemas

export const initOrganizationSchema = Joi.object({
  organizationId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Organization ID is required'
    }),
  
  organizationType: Joi.string()
    .valid('bank', 'nbfc', 'corporate', 'logistics', 'insurance')
    .required()
    .messages({
      'any.required': 'Organization type is required'
    })
}).options({ stripUnknown: true });

// Query parameter schemas

export const getRolesQuerySchema = Joi.object({
  organizationId: Joi.string()
    .trim()
    .optional(),
  
  level: Joi.string()
    .valid('platform', 'organization_super', 'organization_admin', 'organization_standard', 'entity_specific')
    .optional(),
  
  includeSystem: Joi.string()
    .valid('true', 'false')
    .optional()
    .default('true'),
  
  category: Joi.string()
    .valid('system', 'admin', 'manager', 'user', 'viewer', 'specialist')
    .optional(),
  
  isActive: Joi.string()
    .valid('true', 'false')
    .optional()
    .default('true')
}).options({ stripUnknown: true });

export const getUserRolesQuerySchema = Joi.object({
  organizationId: Joi.string()
    .trim()
    .optional(),
  
  includeExpired: Joi.string()
    .valid('true', 'false')
    .optional()
    .default('false'),
  
  roleLevel: Joi.string()
    .valid('platform', 'organization_super', 'organization_admin', 'organization_standard', 'entity_specific')
    .optional()
}).options({ stripUnknown: true });

// Validation helper functions

export const validateStepData = (stepNumber: number, data: any) => {
  const stepSchemas = {
    1: step1Schema,
    2: step2Schema,
    3: step3Schema,
    4: step4Schema,
    5: step5Schema
  };

  const schema = stepSchemas[stepNumber as keyof typeof stepSchemas];
  if (!schema) {
    throw new Error(`No validation schema found for step ${stepNumber}`);
  }

  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(`Step ${stepNumber} validation failed: ${error.message}`);
  }

  return value;
};

// Export all schemas
export const roleSchemas = {
  createRole: createRoleSchema,
  updateRole: updateRoleSchema,
  assignRole: assignRoleSchema,
  revokeRole: revokeRoleSchema,
  startJourney: startJourneySchema,
  journeyStep: journeyStepSchema,
  initOrganization: initOrganizationSchema,
  getRolesQuery: getRolesQuerySchema,
  getUserRolesQuery: getUserRolesQuerySchema,
  steps: {
    step1: step1Schema,
    step2: step2Schema,
    step3: step3Schema,
    step4: step4Schema,
    step5: step5Schema
  }
};
