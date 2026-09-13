/**
 * Member Loyalty System Constants & Dynamic Helper Functions
 * AGUNG AI SOFTWARE HOUSE
 */

export const DEFAULT_POINT_VALUE_RUPIAH = 100;
export const DEFAULT_POINT_EARNING_THRESHOLD_RUPIAH = 10000;

export interface StoreSettingData {
  id: string;
  storeName: string;
  pointsEarnThreshold: number;
  pointRedeemValue: number;
  isLoyaltyActive: boolean;
  updatedAt?: string;
}

export function calculatePointDiscount(points: number, pointRedeemValue: number = DEFAULT_POINT_VALUE_RUPIAH): number {
  return points * pointRedeemValue;
}

export function calculatePointsEarned(spendAmount: number, pointsEarnThreshold: number = DEFAULT_POINT_EARNING_THRESHOLD_RUPIAH): number {
  if (pointsEarnThreshold <= 0) return 0;
  return Math.floor(spendAmount / pointsEarnThreshold);
}
