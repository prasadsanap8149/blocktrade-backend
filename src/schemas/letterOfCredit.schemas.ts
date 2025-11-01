import Joi from 'joi';
import { COMMON_LC_DOCUMENTS, INCOTERMS, TRADE_CURRENCIES } from '../types/letterOfCredit.types';

// LC Document schema
const lcDocumentSchema = Joi.object({
  documentType: Joi.string().required().messages({
    'string.empty': 'Document type is required',
    'any.required': 'Document type is required'
  }),
  required: Joi.boolean().default(true),
  copies: Joi.number().integer().min(1).max(10).default(1).messages({
    'number.base': 'Copies must be a number',
    'number.integer': 'Copies must be an integer',
    'number.min': 'Copies must be at least 1',
    'number.max': 'Copies cannot exceed 10'
  }),
  description: Joi.string().max(500).optional(),
  originalRequired: Joi.boolean().default(false)
});

// Tolerance schema
const toleranceSchema = Joi.object({
  amountPlus: Joi.number().min(0).max(10).default(0).messages({
    'number.base': 'Amount plus tolerance must be a number',
    'number.min': 'Amount plus tolerance cannot be negative',
    'number.max': 'Amount plus tolerance cannot exceed 10%'
  }),
  amountMinus: Joi.number().min(0).max(10).default(0).messages({
    'number.base': 'Amount minus tolerance must be a number',
    'number.min': 'Amount minus tolerance cannot be negative',
    'number.max': 'Amount minus tolerance cannot exceed 10%'
  })
}).required();

// Create LC validation schema
export const createLCSchema = Joi.object({
  // Parties
  applicantId: Joi.string().required().messages({
    'string.empty': 'Applicant ID is required',
    'any.required': 'Applicant ID is required'
  }),
  beneficiaryId: Joi.string().required().messages({
    'string.empty': 'Beneficiary ID is required',
    'any.required': 'Beneficiary ID is required'
  }),
  issuingBankId: Joi.string().required().messages({
    'string.empty': 'Issuing bank ID is required',
    'any.required': 'Issuing bank ID is required'
  }),
  advisingBankId: Joi.string().optional().allow(''),

  // LC Details
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required'
  }),
  currency: Joi.string().valid(...TRADE_CURRENCIES).required().messages({
    'string.empty': 'Currency is required',
    'any.required': 'Currency is required',
    'any.only': 'Invalid currency code'
  }),
  description: Joi.string().min(10).max(1000).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description cannot exceed 1000 characters',
    'any.required': 'Description is required'
  }),

  // Dates
  expiryDate: Joi.date().iso().greater('now').required().messages({
    'date.base': 'Expiry date must be a valid date',
    'date.greater': 'Expiry date must be in the future',
    'any.required': 'Expiry date is required'
  }),
  lastShipmentDate: Joi.date().iso().max(Joi.ref('expiryDate')).optional().messages({
    'date.base': 'Last shipment date must be a valid date',
    'date.max': 'Last shipment date cannot be after expiry date'
  }),
  presentationPeriod: Joi.number().integer().min(1).max(21).default(21).messages({
    'number.base': 'Presentation period must be a number',
    'number.integer': 'Presentation period must be an integer',
    'number.min': 'Presentation period must be at least 1 day',
    'number.max': 'Presentation period cannot exceed 21 days'
  }),

  // Terms
  incoterms: Joi.string().valid(...Object.keys(INCOTERMS)).required().messages({
    'string.empty': 'Incoterms is required',
    'any.required': 'Incoterms is required',
    'any.only': 'Invalid Incoterms'
  }),
  partialShipments: Joi.boolean().default(false),
  transshipment: Joi.boolean().default(false),

  // Documents
  requiredDocuments: Joi.array().items(lcDocumentSchema).min(1).required().messages({
    'array.min': 'At least one document must be required',
    'any.required': 'Required documents list is required'
  }),

  // Tolerance
  tolerance: toleranceSchema,

  // Additional
  specialInstructions: Joi.string().max(2000).optional().allow('')
});

// Update LC validation schema
export const updateLCSchema = Joi.object({
  amount: Joi.number().positive().optional().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive'
  }),
  description: Joi.string().min(10).max(1000).optional().messages({
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  expiryDate: Joi.date().iso().greater('now').optional().messages({
    'date.base': 'Expiry date must be a valid date',
    'date.greater': 'Expiry date must be in the future'
  }),
  lastShipmentDate: Joi.date().iso().optional().messages({
    'date.base': 'Last shipment date must be a valid date'
  }),
  presentationPeriod: Joi.number().integer().min(1).max(21).optional().messages({
    'number.base': 'Presentation period must be a number',
    'number.integer': 'Presentation period must be an integer',
    'number.min': 'Presentation period must be at least 1 day',
    'number.max': 'Presentation period cannot exceed 21 days'
  }),
  incoterms: Joi.string().valid(...Object.keys(INCOTERMS)).optional().messages({
    'any.only': 'Invalid Incoterms'
  }),
  partialShipments: Joi.boolean().optional(),
  transshipment: Joi.boolean().optional(),
  requiredDocuments: Joi.array().items(lcDocumentSchema).min(1).optional().messages({
    'array.min': 'At least one document must be required'
  }),
  tolerance: toleranceSchema.optional(),
  specialInstructions: Joi.string().max(2000).optional().allow('')
});

// LC Status Update validation schema
export const updateLCStatusSchema = Joi.object({
  newStatus: Joi.string().valid(
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 
    'issued', 'documents_received', 'documents_examining', 
    'documents_accepted', 'documents_rejected', 'payment_authorized', 
    'payment_completed', 'expired', 'cancelled', 'amended'
  ).required().messages({
    'string.empty': 'New status is required',
    'any.required': 'New status is required',
    'any.only': 'Invalid status value'
  }),
  comments: Joi.string().max(1000).optional().allow(''),
  supportingDocuments: Joi.array().items(Joi.string()).optional()
});

// LC Search filters validation schema
export const lcSearchFiltersSchema = Joi.object({
  status: Joi.string().optional(), // Will be split into array
  applicantId: Joi.string().optional(),
  beneficiaryId: Joi.string().optional(),
  issuingBankId: Joi.string().optional(),
  currency: Joi.string().valid(...TRADE_CURRENCIES).optional(),
  amountMin: Joi.number().positive().optional().messages({
    'number.base': 'Minimum amount must be a number',
    'number.positive': 'Minimum amount must be positive'
  }),
  amountMax: Joi.number().positive().optional().messages({
    'number.base': 'Maximum amount must be a number',
    'number.positive': 'Maximum amount must be positive'
  }),
  expiryDateFrom: Joi.date().iso().optional().messages({
    'date.base': 'Expiry date from must be a valid date'
  }),
  expiryDateTo: Joi.date().iso().min(Joi.ref('expiryDateFrom')).optional().messages({
    'date.base': 'Expiry date to must be a valid date',
    'date.min': 'Expiry date to must be after expiry date from'
  }),
  applicationDateFrom: Joi.date().iso().optional().messages({
    'date.base': 'Application date from must be a valid date'
  }),
  applicationDateTo: Joi.date().iso().min(Joi.ref('applicationDateFrom')).optional().messages({
    'date.base': 'Application date to must be a valid date',
    'date.min': 'Application date to must be after application date from'
  }),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional()
});

// LC Amendment validation schema
export const lcAmendmentSchema = Joi.object({
  lcId: Joi.string().required().messages({
    'string.empty': 'LC ID is required',
    'any.required': 'LC ID is required'
  }),
  amendments: Joi.array().items(
    Joi.object({
      field: Joi.string().required().messages({
        'string.empty': 'Amendment field is required',
        'any.required': 'Amendment field is required'
      }),
      oldValue: Joi.any().required(),
      newValue: Joi.any().required(),
      reason: Joi.string().min(5).max(500).required().messages({
        'string.empty': 'Amendment reason is required',
        'string.min': 'Amendment reason must be at least 5 characters',
        'string.max': 'Amendment reason cannot exceed 500 characters',
        'any.required': 'Amendment reason is required'
      })
    })
  ).min(1).required().messages({
    'array.min': 'At least one amendment is required',
    'any.required': 'Amendments list is required'
  }),
  requestedBy: Joi.string().required().messages({
    'string.empty': 'Requested by is required',
    'any.required': 'Requested by is required'
  }),
  comments: Joi.string().max(1000).optional().allow('')
});

// MongoDB ObjectId validation pattern
export const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid ID format'
});

// Common validation functions
export const validateCreateLC = (data: any) => {
  return createLCSchema.validate(data, { abortEarly: false });
};

export const validateUpdateLC = (data: any) => {
  return updateLCSchema.validate(data, { abortEarly: false });
};

export const validateLCStatusUpdate = (data: any) => {
  return updateLCStatusSchema.validate(data, { abortEarly: false });
};

export const validateLCSearchFilters = (data: any) => {
  return lcSearchFiltersSchema.validate(data, { abortEarly: false });
};

export const validateLCAmendment = (data: any) => {
  return lcAmendmentSchema.validate(data, { abortEarly: false });
};

export const validateObjectId = (id: string) => {
  return objectIdSchema.validate(id);
};
