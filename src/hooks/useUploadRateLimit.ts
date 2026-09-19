
 import { useState, useCallback, useEffect } from 'react';
 
 const UPLOAD_LIMIT_PER_HOUR = 10;
 const HOUR_IN_MS = 60 * 60 * 1000;
 const STORAGE_KEY_PREFIX = 'forum_upload_count_';
 
 interface UploadRecord {
   timestamps: number[];
 }
 
 /**
  * Hook to enforce client-side rate limiting for file uploads.
  * Tracks uploads per device per bucket to prevent storage abuse.
  */
 export function useUploadRateLimit(deviceId: string) {
   const [uploadCounts, setUploadCounts] = useState<Record<string, number>>({});
 
   // Clean expired timestamps and get current counts
   const getCleanedRecords = useCallback((bucket: string): number[] => {
     const key = `${STORAGE_KEY_PREFIX}${deviceId}_${bucket}`;
     try {
       const stored = sessionStorage.getItem(key);
       if (!stored) return [];
       
       const record: UploadRecord = JSON.parse(stored);
       const now = Date.now();
       const hourAgo = now - HOUR_IN_MS;
       
       // Filter to only keep timestamps from the last hour
       const validTimestamps = record.timestamps.filter(ts => ts > hourAgo);
       
       // Update storage with cleaned records
       sessionStorage.setItem(key, JSON.stringify({ timestamps: validTimestamps }));
       
       return validTimestamps;
     } catch {
       return [];
     }
   }, [deviceId]);
 
   // Initialize counts on mount
   useEffect(() => {
     const buckets = ['forum-videos', 'forum-images', 'forum-audio'];
     const counts: Record<string, number> = {};
     
     buckets.forEach(bucket => {
       counts[bucket] = getCleanedRecords(bucket).length;
     });
     
     setUploadCounts(counts);
   }, [deviceId, getCleanedRecords]);
 
   /**
    * Check if upload is allowed for the given bucket
    */
   const canUpload = useCallback((bucket: string): boolean => {
     const validTimestamps = getCleanedRecords(bucket);
     return validTimestamps.length < UPLOAD_LIMIT_PER_HOUR;
   }, [getCleanedRecords]);
 
   /**
    * Get remaining uploads for a bucket
    */
   const getRemainingUploads = useCallback((bucket: string): number => {
     const validTimestamps = getCleanedRecords(bucket);
     return Math.max(0, UPLOAD_LIMIT_PER_HOUR - validTimestamps.length);
   }, [getCleanedRecords]);
 
   /**
    * Get time until next upload is available (in minutes)
    */
   const getTimeUntilReset = useCallback((bucket: string): number => {
     const validTimestamps = getCleanedRecords(bucket);
     if (validTimestamps.length < UPLOAD_LIMIT_PER_HOUR) return 0;
     
     // Find the oldest timestamp - that's when the first slot will free up
     const oldest = Math.min(...validTimestamps);
     const resetTime = oldest + HOUR_IN_MS;
     const now = Date.now();
     
     return Math.max(0, Math.ceil((resetTime - now) / 60000));
   }, [getCleanedRecords]);
 
   /**
    * Record an upload for the given bucket
    */
   const recordUpload = useCallback((bucket: string): void => {
     const key = `${STORAGE_KEY_PREFIX}${deviceId}_${bucket}`;
     const validTimestamps = getCleanedRecords(bucket);
     validTimestamps.push(Date.now());
     
     sessionStorage.setItem(key, JSON.stringify({ timestamps: validTimestamps }));
     
     // Update state
     setUploadCounts(prev => ({
       ...prev,
       [bucket]: validTimestamps.length
     }));
   }, [deviceId, getCleanedRecords]);
 
   /**
    * Check upload limit and return error message if exceeded
    */
   const checkUploadLimit = useCallback((bucket: string): { allowed: boolean; message?: string } => {
     if (canUpload(bucket)) {
       return { allowed: true };
     }
     
     const minutesUntilReset = getTimeUntilReset(bucket);
     const bucketName = bucket.replace('forum-', '');
     
     return {
       allowed: false,
       message: `Limite d'upload de ${bucketName} atteinte (${UPLOAD_LIMIT_PER_HOUR}/heure). Réessayez dans ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`
     };
   }, [canUpload, getTimeUntilReset]);
 
   return {
     canUpload,
     getRemainingUploads,
     getTimeUntilReset,
     recordUpload,
     checkUploadLimit,
     uploadCounts,
     UPLOAD_LIMIT_PER_HOUR
   };
 }
