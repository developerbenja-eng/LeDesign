/**
 * Test Validation Dashboard Types
 */

// ============================================================================
// Test Run Types
// ============================================================================

export interface TestRun {
  id: string;
  timestamp: string;
  commit_sha: string | null;
  branch: string | null;
  trigger: 'manual' | 'ci' | 'local';
  environment: 'development' | 'ci' | 'production';
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  metadata: TestRunMetadata | null;
  created_at: string;
}

export interface TestRunMetadata {
  runner?: string;
  workflow?: string;
  actor?: string;
  run_number?: number;
  vitest_version?: string;
}

// ============================================================================
// Test Result Types
// ============================================================================

export interface TestResult {
  id: string;
  run_id: string;
  module: string;
  suite: string;
  test_name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error_message: string | null;
  error_stack: string | null;
  expected_value: unknown | null;
  actual_value: unknown | null;
  tolerance: string | null;
  formula: string | null;
  reference_standard: string | null;
  reference_example: string | null;
  input_parameters: Record<string, unknown> | null;
  file_path: string | null;
  line_number: number | null;
  created_at: string;
  // Joined data
  verifications?: TestVerification[];
  verification_count?: number;
  latest_verification?: TestVerification | null;
}

// ============================================================================
// Verification Types
// ============================================================================

export interface TestVerification {
  id: string;
  test_result_id: string;
  verified_by_name: string;
  verified_by_email: string | null;
  verified_by_role: string | null;
  verification_status: 'verified' | 'disputed' | 'needs_review';
  comment: string | null;
  verification_date: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateTestRunRequest {
  commit_sha?: string;
  branch?: string;
  trigger?: 'manual' | 'ci' | 'local';
  environment?: 'development' | 'ci' | 'production';
  metadata?: TestRunMetadata;
  results: CreateTestResultInput[];
}

export interface CreateTestResultInput {
  module: string;
  suite: string;
  test_name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  error_message?: string;
  error_stack?: string;
  expected_value?: unknown;
  actual_value?: unknown;
  tolerance?: string;
  formula?: string;
  reference_standard?: string;
  reference_example?: string;
  input_parameters?: Record<string, unknown>;
  file_path?: string;
  line_number?: number;
}

export interface CreateVerificationRequest {
  test_result_id: string;
  verified_by_name: string;
  verified_by_email?: string;
  verified_by_role?: string;
  verification_status: 'verified' | 'disputed' | 'needs_review';
  comment?: string;
}

export interface ModuleSummary {
  module: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  verified: number;
  pass_rate: number;
}
