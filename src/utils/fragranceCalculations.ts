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
 * 香精配方計算結果
 */
export interface FragranceCalculationResult {
  /** 是否有效的配方 */
  isValid: boolean;
  /** 錯誤訊息（如果有） */
  errorMessage?: string;
  /** 計算後的比例 */
  ratios: FragranceRatios;
  /** 總比例（應該等於100%） */
  totalPercentage: number;
}

/**
 * 香精配方驗證結果
 */
export interface FragranceValidationResult {
  /** 是否通過驗證 */
  isValid: boolean;
  /** 錯誤訊息陣列 */
  errors: string[];
  /** 警告訊息陣列 */
  warnings: string[];
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

  /**
   * 完整的香精配方計算（包含驗證）
   * @param fragrancePercentage 香精比例
   * @returns 完整的計算結果
   */
  static calculateFragranceFormula(fragrancePercentage: number): FragranceCalculationResult {
    try {
      const { pgRatio, vgRatio } = this.calculatePGVGRatios(fragrancePercentage);
      const totalPercentage = this.roundToDecimals(fragrancePercentage + pgRatio + vgRatio);
      
      return {
        isValid: Math.abs(totalPercentage - 100) < 0.01, // 容許0.01%的誤差
        ratios: {
          fragrancePercentage: this.roundToDecimals(fragrancePercentage),
          pgRatio,
          vgRatio
        },
        totalPercentage
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: error instanceof Error ? error.message : '計算錯誤',
        ratios: {
          fragrancePercentage: 0,
          pgRatio: 0,
          vgRatio: 0
        },
        totalPercentage: 0
      };
    }
  }

  /**
   * 驗證香精比例配方
   * @param ratios 要驗證的比例配方
   * @returns 驗證結果
   */
  static validateFragranceRatios(ratios: FragranceRatios): FragranceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本數值驗證
    if (ratios.fragrancePercentage < 0 || ratios.fragrancePercentage > 100) {
      errors.push('香精比例必須在 0-100% 之間');
    }
    
    if (ratios.pgRatio < 0 || ratios.pgRatio > 100) {
      errors.push('PG比例必須在 0-100% 之間');
    }
    
    if (ratios.vgRatio < 0 || ratios.vgRatio > 100) {
      errors.push('VG比例必須在 0-100% 之間');
    }

    // 總比例驗證
    const totalPercentage = ratios.fragrancePercentage + ratios.pgRatio + ratios.vgRatio;
    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push(`總比例必須等於 100%，目前為 ${this.roundToDecimals(totalPercentage)}%`);
    }

    // 業務邏輯警告
    if (ratios.fragrancePercentage > 60 && ratios.pgRatio > 0) {
      warnings.push('香精比例超過60%時，通常不建議加入PG');
    }
    
    if (ratios.fragrancePercentage < 5) {
      warnings.push('香精比例過低，可能影響產品香味');
    }
    
    if (ratios.fragrancePercentage > 80) {
      warnings.push('香精比例過高，可能影響產品品質');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 格式化比例顯示（用於UI展示）
   * @param ratio 比例數值
   * @param unit 單位（預設為%）
   * @returns 格式化後的字串
   */
  static formatRatioDisplay(ratio: number, unit: string = '%'): string {
    return `${this.roundToDecimals(ratio)}${unit}`;
  }

  /**
   * 計算生產所需的各成分用量
   * @param totalVolume 總生產量（單位：KG或ML）
   * @param ratios 香精比例配方
   * @returns 各成分所需用量
   */
  static calculateProductionAmounts(
    totalVolume: number, 
    ratios: FragranceRatios
  ): {
    fragranceAmount: number;
    pgAmount: number;
    vgAmount: number;
    total: number;
  } {
    const fragranceAmount = this.roundToDecimals(totalVolume * (ratios.fragrancePercentage / 100));
    const pgAmount = this.roundToDecimals(totalVolume * (ratios.pgRatio / 100));
    const vgAmount = this.roundToDecimals(totalVolume * (ratios.vgRatio / 100));
    
    return {
      fragranceAmount,
      pgAmount,
      vgAmount,
      total: this.roundToDecimals(fragranceAmount + pgAmount + vgAmount)
    };
  }

  /**
   * 從現有配方反推香精比例（用於匯入或轉換舊資料）
   * @param fragranceAmount 香精用量
   * @param pgAmount PG用量  
   * @param vgAmount VG用量
   * @returns 計算出的比例
   */
  static calculateRatiosFromAmounts(
    fragranceAmount: number,
    pgAmount: number, 
    vgAmount: number
  ): FragranceRatios {
    const total = fragranceAmount + pgAmount + vgAmount;
    
    if (total === 0) {
      return { fragrancePercentage: 0, pgRatio: 0, vgRatio: 0 };
    }
    
    return {
      fragrancePercentage: this.roundToDecimals((fragranceAmount / total) * 100),
      pgRatio: this.roundToDecimals((pgAmount / total) * 100),
      vgRatio: this.roundToDecimals((vgAmount / total) * 100)
    };
  }
}

/**
 * 便捷函數：計算PG和VG比例（保持向後相容性）
 * @param fragrancePercentage 香精比例
 * @returns PG和VG比例
 * @deprecated 建議使用 FragranceCalculations.calculatePGVGRatios
 */
export const calculatePGRatios = (fragrancePercentage: number): { pgRatio: number; vgRatio: number } => {
  return FragranceCalculations.calculatePGVGRatios(fragrancePercentage);
};

// 預設匯出主要計算類別
export default FragranceCalculations;