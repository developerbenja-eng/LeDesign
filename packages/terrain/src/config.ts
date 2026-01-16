/**
 * Configuration module for LeDesign Terrain package
 *
 * Loads environment variables for Google Gemini API and other services.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
// This will look for .env in the project root
config({ path: resolve(process.cwd(), '.env') });

/**
 * Configuration object with typed environment variables
 */
export const terrainConfig = {
  /**
   * Google Gemini API key for AI-powered feature detection
   * Get from: https://aistudio.google.com/app/apikey
   */
  googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || '',

  /**
   * Google Cloud Project ID
   */
  gcpProjectId: process.env.GCP_PROJECT_ID || '',

  /**
   * Environment (development, production, test)
   */
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',

  /**
   * Check if all required configuration is present
   */
  isConfigured(): boolean {
    return Boolean(this.googleGeminiApiKey);
  },

  /**
   * Get configuration errors (missing required values)
   */
  getConfigErrors(): string[] {
    const errors: string[] = [];

    if (!this.googleGeminiApiKey) {
      errors.push('GOOGLE_GEMINI_API_KEY is not set. Add it to your .env file.');
    }

    return errors;
  },
};

/**
 * Validate configuration on import (only in non-production)
 */
if (terrainConfig.nodeEnv !== 'production') {
  const errors = terrainConfig.getConfigErrors();
  if (errors.length > 0) {
    console.warn('⚠️  Terrain configuration warnings:');
    errors.forEach(error => console.warn(`   - ${error}`));
  }
}
