/**
 * ID Generation Utilities
 *
 * Utility functions for generating MongoDB ObjectId-style identifiers.
 *
 * Features:
 * - MongoDB ObjectId generation
 * - 24-character hex string format
 * - Async generation support
 */

// ============================================================================
// ID Generation Functions
// ============================================================================
/**
 * Generates a proper MongoDB ObjectId-style hex string (24 characters)
 * This ensures consistency with MongoDB's ObjectId format while storing as strings
 */
export async function generateMongoId(): Promise<string> {
  const mongoose = await import('mongoose');
  return new mongoose.default.Types.ObjectId().toHexString();
}

