import type { Package } from '../types';

/**
 * Calculates similarity score between two Viettel packages.
 * Score weightings:
 * - Same category: +3 points
 * - Same cycle days: +2 points
 * - Same price range (diff <= 30k: +2 points, diff <= 70k: +1 point)
 */
export function calculateSimilarity(p1: Package, p2: Package): number {
  let score = 0;

  // 1. Same phan_loai_goi (Category)
  if (
    p1.phan_loai_goi &&
    p2.phan_loai_goi &&
    p1.phan_loai_goi.trim().toLowerCase() === p2.phan_loai_goi.trim().toLowerCase()
  ) {
    score += 3;
  }

  // 2. Same chu_ky_ngay (Cycle duration)
  if (p1.chu_ky_ngay != null && p2.chu_ky_ngay != null && String(p1.chu_ky_ngay) === String(p2.chu_ky_ngay)) {
    score += 2;
  }

  // 3. Price proximity
  if (p1.gia && p2.gia) {
    const priceDiff = Math.abs(p1.gia - p2.gia);
    if (priceDiff <= 30000) {
      score += 2;
    } else if (priceDiff <= 70000) {
      score += 1;
    }
  }

  return score;
}
