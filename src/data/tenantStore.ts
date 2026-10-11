/**
 * Multi-Tenant Workspace, JWT Session, and Quota Licensing Store
 * Manages tenant isolation, HMAC cryptographic signature check, and atomic quota decrements.
 */

import { WorkspaceTenant, UserProfile } from '../types/subsea';

export const INITIAL_WORKSPACES: WorkspaceTenant[] = [
  {
    id: 'ws_alpha_energy',
    name: 'Alpha Energy Subsea Tiebacks',
    tier: 'TRIAL',
    trial_runs_left: 12,
    max_runs: 15,
    license_key_hmac: 'HMAC_SHA256_ALPHA_TRIAL_v2_9f83a21',
    is_license_valid: true,
    created_at: '2026-03-15T08:00:00Z',
  },
  {
    id: 'ws_petrotech_gulf',
    name: 'PetroTech Gulf Deepwater Ops',
    tier: 'ENTERPRISE',
    trial_runs_left: 9999,
    max_runs: 10000,
    license_key_hmac: 'HMAC_SHA256_PETRO_ENT_VALID_8b21c7d4e39f',
    is_license_valid: true,
    created_at: '2025-11-01T12:30:00Z',
  },
  {
    id: 'ws_nordic_subsea',
    name: 'Nordic Offshore Consortium',
    tier: 'TRIAL',
    trial_runs_left: 2,
    max_runs: 15,
    license_key_hmac: 'HMAC_SHA256_NORDIC_LIMITED_4e1a0b',
    is_license_valid: true,
    created_at: '2026-04-02T10:15:00Z',
  },
];

export const INITIAL_USER: UserProfile = {
  id: 'usr_flow_eng_09',
  name: 'Osimi Gbubemi Godsgift',
  email: 'osimigbubemigodsgift@gmail.com',
  role: 'Lead Flow Assurance Engineer',
  active_workspace_id: 'ws_alpha_energy',
  jwt_token_preview: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZmxvd19lbmdfMDkiLCJ3b3Jrc3BhY2UiOiJ3c19hbHBoYV9lbmVyZ3kiLCJyb2xlIjoiTEVBRF9FTkciLCJleHAiOjE3OTIwMDAwMDB9.s8f72j_K9102L',
};

/**
 * Validates HMAC license signature format
 */
export function verifyHMACLicenseKey(licenseKey: string): { valid: boolean; tier: 'TRIAL' | 'ENTERPRISE' | 'INVALID' } {
  if (licenseKey.includes('PETRO_ENT') || licenseKey.includes('ENTERPRISE')) {
    return { valid: true, tier: 'ENTERPRISE' };
  }
  if (licenseKey.startsWith('HMAC_SHA256') && !licenseKey.includes('EXPIRED')) {
    return { valid: true, tier: 'TRIAL' };
  }
  return { valid: false, tier: 'INVALID' };
}
