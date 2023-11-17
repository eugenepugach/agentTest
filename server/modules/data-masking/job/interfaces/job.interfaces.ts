import { MaskingType } from '@flosum/data-masking';
import { ObjectRuleType } from '@data-masking-job/enums/job.enums';

export interface MaskingManifest {
  credentials: AuthDetails;
  libraries?: Record<string, string[] | number[]>;
  objectRules: Record<string, ObjectMaskingRule | ObjectDeleteRule>;
}

export interface AuthDetails {
  accessToken: string;
  instanceUrl: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface ObjectRule {
  disableAutomation: DisableAutomationDetails;
  whereClause?: string;
  type: ObjectRuleType;
}

export interface ObjectMaskingRule extends ObjectRule {
  type: ObjectRuleType.MASKING;
  fieldRules: Record<string, FieldRule>;
}

export interface ObjectDeleteRule extends ObjectRule {
  type: ObjectRuleType.DELETE;
}

export interface FieldRule {
  type: MaskingType;
  value?: string;
  maxValue?: number;
  minValue?: number;
}

export interface DisableAutomationDetails {
  isDisableTrigger: boolean;
  isDisableValidationRule: boolean;
  isDisableProcessBuilder: boolean;
  isDisableWorkflow: boolean;
  isDisableLookupFilter: boolean;
}
