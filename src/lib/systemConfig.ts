// 系統配置檔案
// 定義系統中使用的標準物料代碼

export const SYSTEM_MATERIAL_CODES = {
  // PG丙二醇物料代碼
  PG_MATERIAL_CODES: [
    'UV3404503', // 標準PG丙二醇代碼
    'PG',        // 包含PG的代碼
  ],
  
  // VG甘油物料代碼
  VG_MATERIAL_CODES: [
    'UV3400698', // 標準VG甘油代碼
    'VG',        // 包含VG的代碼
  ],
  
  // 尼古丁物料代碼
  NICOTINE_MATERIAL_CODES: [
    'UV3405520', // 標準尼古丁代碼
    'NIC',       // 包含NIC的代碼
    '丁鹽',      // 包含丁鹽的名稱
    '尼古丁',    // 包含尼古丁的名稱
  ],
  
  // PG物料名稱關鍵字
  PG_MATERIAL_NAMES: [
    'PG丙二醇',
    'PG',
    '丙二醇',
  ],
  
  // VG物料名稱關鍵字
  VG_MATERIAL_NAMES: [
    'VG甘油',
    'VG',
    '甘油',
  ],
  
  // 尼古丁物料名稱關鍵字
  NICOTINE_MATERIAL_NAMES: [
    '丁鹽',
    '尼古丁',
    'NicSalt',
  ],
} as const;

// 物料查找函數
export const findMaterialByCategory = (
  materials: any[], 
  category: 'pg' | 'vg' | 'nicotine'
) => {
  const material = materials.find((m: any) => {
    const code = m.code?.toUpperCase() || '';
    const name = m.name || '';
    
    switch (category) {
      case 'pg':
        return SYSTEM_MATERIAL_CODES.PG_MATERIAL_CODES.some(c => code.includes(c)) ||
               SYSTEM_MATERIAL_CODES.PG_MATERIAL_NAMES.some(n => name.includes(n));
      case 'vg':
        return SYSTEM_MATERIAL_CODES.VG_MATERIAL_CODES.some(c => code.includes(c)) ||
               SYSTEM_MATERIAL_CODES.VG_MATERIAL_NAMES.some(n => name.includes(n));
      case 'nicotine':
        return SYSTEM_MATERIAL_CODES.NICOTINE_MATERIAL_CODES.some(c => code.includes(c)) ||
               SYSTEM_MATERIAL_CODES.NICOTINE_MATERIAL_NAMES.some(n => name.includes(n));
      default:
        return false;
    }
  });
  
  return material;
};
