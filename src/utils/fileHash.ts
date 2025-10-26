/**
 * Compute SHA-256 hash of a file
 * @param file - File to hash
 * @returns Promise<string> - Hex string of the hash
 */
export const computeFileHash = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Error computing file hash:', error);
    throw new Error('Failed to compute file hash');
  }
};
