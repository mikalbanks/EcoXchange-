/**
 * GOES-16 Satellite Data Reference (NOAA S3 Public Bucket)
 * ========================================================
 * GOES-16 ABI (Advanced Baseline Imager) data is stored on:
 *   s3://noaa-goes16/ABI-L2-MCMIPC/{year}/{dayOfYear}/{hour}/
 *
 * The Cloud and Moisture Imagery Product (CMIP) provides:
 *   - Cloud Optical Depth (COD)
 *   - Cloud fraction
 *   - Cloud top temperature
 *
 * For the Virtual SCADA pipeline, we use GOES-16 derived cloud fraction
 * as a cross-validation input to the NASA POWER irradiance data.
 *
 * In production, this would use s3fs/boto3 to stream NetCDF4 files.
 * For the Replit prototype, we define the S3 path builder and metadata
 * extractor that would feed into the Perez model.
 */

export interface GoesS3Reference {
  bucket: string;
  prefix: string;
  product: string;
  year: number;
  dayOfYear: number;
  hour: number;
  fullPath: string;
}

/**
 * Build the S3 path for a GOES-16 ABI-L2-MCMIPC product at a given timestamp.
 * Product: Multi-band Cloud and Moisture Imagery Product (CONUS sector).
 */
export function goesS3Path(timestamp: Date): GoesS3Reference {
  const year = timestamp.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfYear =
    Math.floor((timestamp.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const hour = timestamp.getUTCHours();

  const paddedDay = String(dayOfYear).padStart(3, "0");
  const paddedHour = String(hour).padStart(2, "0");

  const bucket = "noaa-goes16";
  const product = "ABI-L2-MCMIPC";
  const prefix = `${product}/${year}/${paddedDay}/${paddedHour}/`;

  return {
    bucket,
    prefix,
    product,
    year,
    dayOfYear,
    hour,
    fullPath: `s3://${bucket}/${prefix}`,
  };
}

/**
 * Simulate GOES-16 cloud fraction extraction for a lat/lon pixel.
 * In production, this reads the NetCDF4 COD variable and converts to fraction.
 *
 * For the prototype, we synthesize a physically-plausible cloud fraction
 * based on the NASA POWER CLOUD_AMT parameter (which itself is GOES-derived).
 */
export function estimateCloudFraction(
  nasaPowerCloudAmt: number | null,
  solarZenith: number
): number {
  if (nasaPowerCloudAmt != null && nasaPowerCloudAmt >= 0) {
    // NASA POWER provides CLOUD_AMT in % (0-100), convert to fraction
    return Math.min(1, Math.max(0, nasaPowerCloudAmt / 100));
  }
  // Fallback: assume moderate cloudiness, higher at low sun angles
  return solarZenith > 80 ? 0.6 : 0.3;
}

/**
 * Log the GOES-16 S3 reference for audit trail.
 * This documents the satellite data provenance for SEC compliance.
 */
export function logGoesProvenance(ref: GoesS3Reference): string {
  return `[GOES-16] Source: ${ref.fullPath} | Product: ${ref.product} | UTC Hour: ${ref.hour}`;
}
