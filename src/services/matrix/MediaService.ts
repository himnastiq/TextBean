/**
 * Media service — MXC URL handling (scaffolded for v2).
 *
 * v1: Only mxcToHttpUrl() is active (used for avatar URLs).
 * v2 will add upload, thumbnail generation, and download/cache.
 */

import { mxcToHttpUrl as clientMxcToHttp } from './MatrixClient';

/**
 * Convert an MXC URL to an HTTP URL suitable for display.
 *
 * @param mxcUrl - The mxc:// URL from Matrix
 * @param width - Optional thumbnail width
 * @param height - Optional thumbnail height
 * @returns HTTP URL or null if conversion fails
 */
const mxcToHttpUrl = (
  mxcUrl: string | null | undefined,
  width?: number,
  height?: number,
): string | null => {
  return clientMxcToHttp(mxcUrl, width, height);
};

// --- v2 scaffolds (not active) ---

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _uploadImage = async (_uri: string, _roomId: string): Promise<string> => {
  throw new Error('Media upload not available in v1. Deferred to v2.');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _downloadAndCache = async (_mxcUrl: string): Promise<string> => {
  throw new Error('Media download not available in v1. Deferred to v2.');
};

export { mxcToHttpUrl };
