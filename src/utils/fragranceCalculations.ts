/**
 * 香精比例計算工具模組
 * 
 * 統一管理所有香精配方相關的計算邏輯，確保整個系統使用一致的計算方式
 * 
 * @author Claude Code Assistant
 * @created 2025-09-09
 */

/**
 * 香精比例介面定義
 */
export interface FragranceRatios {
  /** 香精比例 (%) */
  fragrancePercentage: number;
  /** PG比例 (%) */
  pgRatio: number;
  /** VG比例 (%) */
  vgRatio: number;
}

/**
 * 香精比例計算工具類別
 */
export class FragranceCalculations {
  
  /**
   * 將數值四捨五入到指定小數位數
   * @param value 要四捨五入的數值
   * @param decimals 小數位數（預設2位）
   * @returns 四捨五入後的數值
   */
  static roundToDecimals(value: number, decimals: number = 2): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * 計算 PG 和 VG 比例（基於鹿鹿小作坊的配方邏輯）
   * 
   * 邏輯說明：
   * - 香精比例 ≤ 60%：香精+PG補滿60%，VG為40%
   * - 香精比例 > 60%：香精單獨，PG為0，VG補滿至100%
   * 
   * @param fragrancePercentage 香精比例 (0-100)
   * @returns 計算後的 PG 和 VG 比例
   */
  static calculatePGVGRatios(fragrancePercentage: number): { pgRatio: number; vgRatio: number } {
    // 輸入驗證
    if (fragrancePercentage < 0 || fragrancePercentage > 100) {
      throw new Error('香精比例必須在 0-100% 之間');
    }

    let pgRatio = 0;
    let vgRatio = 0;
    
    if (fragrancePercentage <= 60) {
      // 香精+PG補滿60%，VG為40%
      pgRatio = this.roundToDecimals(60 - fragrancePercentage);
      vgRatio = 40;
    } else {
      // 香精超過60%，PG為0，VG補滿
      pgRatio = 0;
      vgRatio = this.roundToDecimals(100 - fragrancePercentage);
    }
    
    return { pgRatio, vgRatio };
  }
}

/**
 * 便捷函數：計算PG和VG比例（保持向後相容性）
 * @param fragrancePercentage 香精比例
 * @returns PG和VG比例
 */
export const calculatePGRatios = (fragrancePercentage: number): { pgRatio: number; vgRatio: number } => {
  return FragranceCalculations.calculatePGVGRatios(fragrancePercentage);
};

// 預設匯出主要計算類別
export default FragranceCalculations;