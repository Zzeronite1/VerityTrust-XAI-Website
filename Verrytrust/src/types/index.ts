export type TargetType = 'url' | 'document' | 'text' | 'image';
export type ScanStatus = 'safe' | 'caution' | 'danger';
export type Severity = 'high' | 'medium' | 'low' | 'safe';
export type Persona = 'consumer' | 'business' | 'legal';
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
export type EngineMode = 'simplified' | 'deep';

export interface ScrapingCompliance {
  auditMethod: string;
  vietnamLawCompliance: string;
  euRegulationCompliance: string;
  usLawCompliance: string;
  firewallLegality: string;
}

export interface TechnicalMetrics {
  engine: string;
  totalLatencyMs: number;
  slaMet: boolean;
  slaTargetMs: number;
  dnsLookupMs?: number;
  tlsHandshakeMs?: number;
  httpProbeMs?: number;
  heuristicsMs?: number;
  tlsVersion?: string;
  certIssuer?: string;
  certValidUntil?: string;
  hstsEnabled?: boolean;
  cspEnabled?: boolean;
  frameProtection?: boolean;
  scrapingCompliance?: ScrapingCompliance;
}

export interface KeyFinding {
  title: string;
  category: 'safety' | 'transparency' | 'legality';
  severity: Severity;
  explanation: string;
  impact: string;
}

export interface SafetyDetails {
  threatIntelligence: string;
  phishingHeuristics: string;
  domainReputation: string;
  indicators: string[];
}

export interface TransparencyDetails {
  biasAnalysis: string;
  authenticity: string;
  authorAndSource: string;
  deepfakeOrManipulationCheck: string;
}

export interface LegalityDetails {
  termsAndPolicyFlags: string;
  gdprAndCcpaCompliance: string;
  vnDecree13Compliance: string;
  liabilityLimits: string;
  requiredDisclosures: string;
}

export interface XAIBreakdown {
  factor: string;
  weight: number;
  scoreContribution: string;
  explanation: string;
}

export interface ActionRecommendation {
  action: string;
  priority: 'urgent' | 'recommended' | 'optional';
  details: string;
}

export interface NationalComplianceStatus {
  vietnamCompliance: {
    status: 'compliant' | 'violating' | 'prohibited';
    lawReferences: string[];
    firewallStatus: 'allowed' | 'blocked_by_national_isp';
    details: string;
  };
  euCompliance: {
    status: 'compliant' | 'unlicensed' | 'violating';
    regulations: string[];
    firewallStatus: 'allowed' | 'restricted' | 'blocked';
    details: string;
  };
  usCompliance: {
    status: 'compliant' | 'prohibited' | 'unlicensed';
    statutes: string[];
    firewallStatus: 'allowed' | 'seized_or_restricted';
    details: string;
  };
  governmentRecognition: {
    isRecognized: boolean;
    licensingAuthority?: string;
    operatingStatus: 'officially_recognized' | 'unlicensed_offshore_shadow' | 'blacklisted_entity';
    summary: string;
  };
}

export interface ModelReliability {
  score: number; // 0 - 100%
  tier: 'exceptional' | 'high' | 'moderate' | 'low';
  consensusRate?: number;
  cryptographicIntegrity?: number;
  evidenceCompleteness?: number;
  explanation: string;
}

export interface MaterialAccessScope {
  category: 'articles_news' | 'hyperlinks_redirects' | 'downloadable_materials' | 'financial_transactions';
  title: string;
  allowedAgeMin: number;
  safetyStatus: 'safe_all' | 'requires_supervision' | 'restricted_minors' | 'prohibited';
  description: string;
  guidelines: string;
}

export interface AgeAppropriateness {
  minimumAge: number;
  ratingCode: 'ALL' | '13+' | '15+' | '16+' | '18+';
  ratingLabel: string;
  targetCategory: string;
  rationale: string;
  advisoryForMinors: string;
  legalBasis: string[];
  materialsScope: MaterialAccessScope[];
}

export interface ScanReport {
  id: string;
  userId: string;
  userEmail?: string;
  orgId?: string;
  orgName?: string;
  isOrgShared: boolean;
  isSensitive: boolean;
  targetType: TargetType;
  targetTitle: string;
  targetValue: string;
  trustScore: number;
  status: ScanStatus;
  safetyScore: number;
  transparencyScore: number;
  legalityScore: number;
  summary: string;
  keyFindings: KeyFinding[];
  safetyDetails: SafetyDetails;
  transparencyDetails: TransparencyDetails;
  legalityDetails: LegalityDetails;
  nationalCompliance?: NationalComplianceStatus;
  ageAppropriateness?: AgeAppropriateness;
  userBirthYear?: number;
  xaiBreakdown: XAIBreakdown[];
  recommendations: ActionRecommendation[];
  confidenceLevel: number;
  modelReliability?: ModelReliability;
  engineMode?: EngineMode;
  latencyMs?: number;
  technicalMetrics?: TechnicalMetrics;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  email: string;
  displayName?: string;
  role: OrgRole;
  invitedBy?: string;
  joinedAt: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  userEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  currentOrgId?: string;
  createdAt: string;
}
