// Letter of Credit type definitions for BlockTrade platform

export interface ILetterOfCredit {
  _id?: any; // For MongoDB compatibility
  lcNumber: string; // Unique LC identifier
  
  // Parties
  applicantId: string; // Importer/Buyer Organization ID
  applicantName: string;
  beneficiaryId: string; // Exporter/Seller Organization ID  
  beneficiaryName: string;
  issuingBankId: string; // Bank issuing the LC
  issuingBankName: string;
  advisingBankId?: string; // Optional advising bank
  advisingBankName?: string;
  confirmingBankId?: string; // Optional confirming bank
  confirmingBankName?: string;
  
  // LC Details
  amount: number;
  currency: string;
  description: string; // Description of goods/services
  
  // Dates
  applicationDate: Date;
  issueDate?: Date;
  expiryDate: Date;
  lastShipmentDate?: Date;
  presentationPeriod: number; // Days for document presentation
  
  // Terms and Conditions
  incoterms: string; // FOB, CIF, etc.
  partialShipments: boolean;
  transshipment: boolean;
  
  // Documents Required
  requiredDocuments: LCDocument[];
  
  // Status and Workflow
  status: LCStatus;
  workflowStage: LCWorkflowStage;
  
  // Charges
  charges: LCCharges;
  
  // Additional Information
  specialInstructions?: string;
  tolerance: {
    amountPlus: number; // Percentage
    amountMinus: number; // Percentage
  };
  
  // Blockchain
  blockchainTxId?: string;
  documentHashes?: string[];
  
  // Audit Trail
  history: LCHistoryEntry[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID
  lastModifiedBy: string; // User ID
}

export type LCStatus = 
  | 'draft'           // Initial draft state
  | 'submitted'       // Submitted for review
  | 'under_review'    // Bank reviewing application
  | 'approved'        // Approved by issuing bank
  | 'rejected'        // Rejected by bank
  | 'issued'          // LC issued and active
  | 'documents_received' // Documents received from beneficiary
  | 'documents_examining' // Bank examining documents
  | 'documents_accepted'  // Documents accepted
  | 'documents_rejected'  // Documents rejected
  | 'payment_authorized' // Payment authorized
  | 'payment_completed'  // Payment completed
  | 'expired'         // LC expired
  | 'cancelled'       // LC cancelled
  | 'amended';        // LC amended

export type LCWorkflowStage = 
  | 'application'     // Application stage
  | 'bank_review'     // Bank review stage
  | 'issuance'        // LC issuance stage
  | 'shipment'        // Goods shipment stage
  | 'documentation'   // Document presentation stage
  | 'examination'     // Document examination stage
  | 'payment'         // Payment processing stage
  | 'closure';        // LC closure stage

export interface LCDocument {
  documentType: string;
  required: boolean;
  copies: number;
  description?: string;
  originalRequired: boolean;
}

export interface LCCharges {
  issuanceCharges: number;
  advisingCharges?: number;
  confirmationCharges?: number;
  amendmentCharges?: number;
  chargesFor: 'applicant' | 'beneficiary'; // Who pays the charges
}

export interface LCHistoryEntry {
  timestamp: Date;
  action: string;
  performedBy: string; // User ID
  performedByName: string;
  details: string;
  oldStatus?: LCStatus;
  newStatus?: LCStatus;
  comments?: string;
}

export interface CreateLCRequest {
  // Basic LC Information
  applicantId: string;
  beneficiaryId: string;
  issuingBankId: string;
  advisingBankId?: string;
  
  amount: number;
  currency: string;
  description: string;
  
  // Dates
  expiryDate: string; // ISO date string
  lastShipmentDate?: string;
  presentationPeriod: number;
  
  // Terms
  incoterms: string;
  partialShipments: boolean;
  transshipment: boolean;
  
  // Documents
  requiredDocuments: LCDocument[];
  
  // Tolerance
  tolerance: {
    amountPlus: number;
    amountMinus: number;
  };
  
  // Additional
  specialInstructions?: string;
}

export interface UpdateLCRequest {
  amount?: number;
  description?: string;
  expiryDate?: string;
  lastShipmentDate?: string;
  presentationPeriod?: number;
  incoterms?: string;
  partialShipments?: boolean;
  transshipment?: boolean;
  requiredDocuments?: LCDocument[];
  tolerance?: {
    amountPlus: number;
    amountMinus: number;
  };
  specialInstructions?: string;
}

export interface LCSearchFilters {
  status?: LCStatus[];
  applicantId?: string;
  beneficiaryId?: string;
  issuingBankId?: string;
  currency?: string;
  amountMin?: number;
  amountMax?: number;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  applicationDateFrom?: string;
  applicationDateTo?: string;
}

export interface LCResponse {
  id: string;
  lcNumber: string;
  applicantName: string;
  beneficiaryName: string;
  issuingBankName: string;
  advisingBankName?: string;
  amount: number;
  currency: string;
  description: string;
  applicationDate: Date;
  issueDate?: Date;
  expiryDate: Date;
  status: LCStatus;
  workflowStage: LCWorkflowStage;
  createdAt: Date;
  updatedAt: Date;
}

export interface LCDetailResponse extends LCResponse {
  applicantId: string;
  beneficiaryId: string;
  issuingBankId: string;
  advisingBankId?: string;
  confirmingBankId?: string;
  confirmingBankName?: string;
  lastShipmentDate?: Date;
  presentationPeriod: number;
  incoterms: string;
  partialShipments: boolean;
  transshipment: boolean;
  requiredDocuments: LCDocument[];
  charges: LCCharges;
  tolerance: {
    amountPlus: number;
    amountMinus: number;
  };
  specialInstructions?: string;
  blockchainTxId?: string;
  history: LCHistoryEntry[];
  createdBy: string;
  lastModifiedBy: string;
}

export interface LCAmendmentRequest {
  lcId: string;
  amendments: {
    field: string;
    oldValue: any;
    newValue: any;
    reason: string;
  }[];
  requestedBy: string;
  comments?: string;
}

export interface LCStatusUpdateRequest {
  lcId: string;
  newStatus: LCStatus;
  comments?: string;
  supportingDocuments?: string[];
}

// Document Types commonly used in LCs
export const COMMON_LC_DOCUMENTS = {
  COMMERCIAL_INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  BILL_OF_LADING: 'Bill of Lading',
  CERTIFICATE_OF_ORIGIN: 'Certificate of Origin',
  INSURANCE_CERTIFICATE: 'Insurance Certificate',
  INSPECTION_CERTIFICATE: 'Inspection Certificate',
  WEIGHT_CERTIFICATE: 'Weight Certificate',
  QUALITY_CERTIFICATE: 'Quality Certificate',
  PHYTOSANITARY_CERTIFICATE: 'Phytosanitary Certificate',
  HEALTH_CERTIFICATE: 'Health Certificate',
  CUSTOMS_DECLARATION: 'Customs Declaration',
  EXPORT_LICENSE: 'Export License',
  IMPORT_LICENSE: 'Import License'
} as const;

// Incoterms
export const INCOTERMS = {
  EXW: 'Ex Works',
  FCA: 'Free Carrier',
  CPT: 'Carriage Paid To',
  CIP: 'Carriage and Insurance Paid To',
  DAT: 'Delivered at Terminal',
  DAP: 'Delivered at Place',
  DDP: 'Delivered Duty Paid',
  FAS: 'Free Alongside Ship',
  FOB: 'Free on Board',
  CFR: 'Cost and Freight',
  CIF: 'Cost, Insurance and Freight'
} as const;

// Currencies commonly used in international trade
export const TRADE_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AED', 'SGD', 'HKD', 'CHF', 'CAD', 'AUD'
] as const;

// LC Status workflow mapping
export const LC_STATUS_WORKFLOW = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected'],
  approved: ['issued', 'rejected'],
  rejected: ['draft'],
  issued: ['documents_received', 'expired', 'cancelled', 'amended'],
  documents_received: ['documents_examining'],
  documents_examining: ['documents_accepted', 'documents_rejected'],
  documents_accepted: ['payment_authorized'],
  documents_rejected: ['documents_received'],
  payment_authorized: ['payment_completed'],
  payment_completed: ['closure'],
  expired: ['closure'],
  cancelled: ['closure'],
  amended: ['issued']
} as const;

// Permission mappings for LC operations
export const LC_PERMISSIONS = {
  CREATE: 'lc:create',
  VIEW: 'lc:view',
  EDIT: 'lc:edit',
  APPROVE: 'lc:approve',
  REJECT: 'lc:reject',
  ISSUE: 'lc:issue',
  AMEND: 'lc:amend',
  CANCEL: 'lc:cancel',
  EXAMINE_DOCS: 'lc:examine_documents',
  AUTHORIZE_PAYMENT: 'lc:authorize_payment'
} as const;
