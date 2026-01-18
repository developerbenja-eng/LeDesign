/**
 * File Storage Service - Google Cloud Storage integration
 * Handles upload/download of large files (surveys, surfaces, networks, CAD)
 *
 * NOTE: This module is server-only and should only be imported in API routes
 */

import 'server-only';
import { Storage } from '@google-cloud/storage';

// Configuration
const BUCKET_NAME = 'caeser-geo-data';

// Initialize GCS client (uses ADC or service account)
let storageClient: Storage | null = null;

function getStorageClient(): Storage {
  if (!storageClient) {
    // Try service account key first, fall back to ADC
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath) {
      storageClient = new Storage({ keyFilename: keyPath });
    } else {
      storageClient = new Storage();
    }
  }
  return storageClient;
}

// File type definitions
export type FileType = 'survey' | 'surface' | 'network' | 'cad' | 'dem' | 'report';

export interface UploadOptions {
  userId: string;
  projectId: string;
  fileType: FileType;
  fileName: string;
  contentType: string;
}

export interface FileMetadata {
  gcsPath: string;
  size: number;
  contentType: string;
  created: string;
  updated: string;
}

/**
 * Generate GCS path for a user file
 * Format: users/{userId}/{fileType}s/{fileName}
 */
export function generateGcsPath(options: UploadOptions): string {
  const { userId, fileType, fileName } = options;
  return `users/${userId}/${fileType}s/${fileName}`;
}

/**
 * Upload file to GCS and return path + signed URL
 */
export async function uploadFile(
  buffer: Buffer,
  options: UploadOptions
): Promise<{ gcsPath: string; signedUrl: string; size: number }> {
  const gcsPath = generateGcsPath(options);
  const storage = getStorageClient();
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  await file.save(buffer, {
    contentType: options.contentType,
    metadata: {
      userId: options.userId,
      projectId: options.projectId,
      fileType: options.fileType,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Generate signed URL for immediate access (1 hour)
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  });

  return {
    gcsPath,
    signedUrl,
    size: buffer.length,
  };
}

/**
 * Get signed URL for existing file
 * @param gcsPath - Path in GCS (e.g., 'users/user123/surveys/survey.las')
 * @param expiresInMinutes - URL expiration time (default: 60 minutes)
 */
export async function getFileUrl(
  gcsPath: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const storage = getStorageClient();
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return signedUrl;
}

/**
 * Download file from GCS as buffer
 */
export async function downloadFile(gcsPath: string): Promise<Buffer> {
  const storage = getStorageClient();
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  const [buffer] = await file.download();
  return buffer;
}

/**
 * Delete file from GCS
 */
export async function deleteFile(gcsPath: string): Promise<void> {
  const storage = getStorageClient();
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  await file.delete();
}

/**
 * Check if file exists in GCS
 */
export async function fileExists(gcsPath: string): Promise<boolean> {
  const storage = getStorageClient();
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  const [exists] = await file.exists();
  return exists;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(gcsPath: string): Promise<FileMetadata> {
  const storage = getStorageClient();
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  const [metadata] = await file.getMetadata();

  return {
    gcsPath,
    size: parseInt(metadata.size),
    contentType: metadata.contentType || 'application/octet-stream',
    created: metadata.timeCreated,
    updated: metadata.updated,
  };
}

/**
 * List all files for a user
 */
export async function listUserFiles(
  userId: string,
  fileType?: FileType
): Promise<FileMetadata[]> {
  const storage = getStorageClient();
  const prefix = fileType ? `users/${userId}/${fileType}s/` : `users/${userId}/`;

  const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix });

  return Promise.all(
    files.map(async (file) => {
      const [metadata] = await file.getMetadata();
      return {
        gcsPath: file.name,
        size: parseInt(metadata.size),
        contentType: metadata.contentType || 'application/octet-stream',
        created: metadata.timeCreated,
        updated: metadata.updated,
      };
    })
  );
}

/**
 * Copy file to a new location
 */
export async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  const storage = getStorageClient();
  const sourceFile = storage.bucket(BUCKET_NAME).file(sourcePath);
  const destFile = storage.bucket(BUCKET_NAME).file(destPath);

  await sourceFile.copy(destFile);
}

/**
 * Move file to a new location (copy + delete)
 */
export async function moveFile(sourcePath: string, destPath: string): Promise<void> {
  await copyFile(sourcePath, destPath);
  await deleteFile(sourcePath);
}

/**
 * Get upload URL for direct browser upload (resumable upload)
 * This allows large files to be uploaded directly from browser to GCS
 */
export async function getUploadUrl(
  options: UploadOptions,
  expiresInMinutes: number = 60
): Promise<string> {
  const gcsPath = generateGcsPath(options);
  const storage = getStorageClient();
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    contentType: options.contentType,
  });

  return url;
}
