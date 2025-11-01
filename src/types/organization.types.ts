import { ObjectId } from 'mongodb';

export interface IOrganization {
  _id?: ObjectId;
  id: string; // UUID for external references
  name: string;
  type: OrganizationType;
  registrationNumber?: string;
  countryCode: string;
  address: Address;
  contactPerson: ContactPerson;
  kycStatus: KYCStatus;
  kycDocuments: KYCDocument[];
  verificationDate?: Date;
  verifiedBy?: string;
  swiftCode?: string; // For banks
  licenseNumber?: string; // For NBFCs, Insurance companies
  tradingLicense?: string; // For corporates
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationType = 'bank' | 'nbfc' | 'corporate' | 'logistics' | 'insurance';

export type KYCStatus = 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired';

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  designation: string;
  department?: string;
}

export interface KYCDocument {
  id: string;
  type: KYCDocumentType;
  fileName: string;
  fileUrl: string;
  fileHash: string;
  uploadedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  expiryDate?: Date;
  rejectionReason?: string;
}

export type KYCDocumentType = 
  | 'incorporation_certificate'
  | 'tax_certificate'
  | 'bank_statement'
  | 'audited_financials'
  | 'trade_license'
  | 'regulatory_license'
  | 'insurance_policy'
  | 'director_identification'
  | 'beneficial_ownership_declaration'
  | 'compliance_certificate';

export interface CreateOrganizationRequest {
  name: string;
  type: OrganizationType;
  registrationNumber?: string;
  countryCode: string;
  address: Address;
  contactPerson: ContactPerson;
  swiftCode?: string;
  licenseNumber?: string;
  tradingLicense?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  registrationNumber?: string;
  address?: Address;
  contactPerson?: ContactPerson;
  swiftCode?: string;
  licenseNumber?: string;
  tradingLicense?: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  type: OrganizationType;
  registrationNumber?: string;
  countryCode: string;
  address: Address;
  contactPerson: ContactPerson;
  kycStatus: KYCStatus;
  verificationDate?: Date;
  verifiedBy?: string;
  swiftCode?: string;
  licenseNumber?: string;
  tradingLicense?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationStats {
  totalUsers: number;
  activeUsers: number;
  totalLCs: number;
  activeLCs: number;
  totalTransactionValue: number;
  averageTransactionValue: number;
  successRate: number;
  lastActivityDate?: Date;
}
