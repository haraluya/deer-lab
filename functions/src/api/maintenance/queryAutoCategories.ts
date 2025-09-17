import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const queryAutoCategories = async (req: Request, res: Response) => {
  try {
    console.log('🔍 開始查詢自動分類...');

    // 查詢主分類
    const categoriesSnapshot = await db.collection('materialCategories').get();
    const autoCategories: any[] = [];

    console.log(`📊 總共找到 ${categoriesSnapshot.size} 個主分類`);

    categoriesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.startsWith('自動分類_')) {
        autoCategories.push({
          id: doc.id,
          name: data.name,
          data: data,
          createTime: doc.createTime ? doc.createTime.toDate().toISOString() : null,
          updateTime: doc.updateTime ? doc.updateTime.toDate().toISOString() : null
        });
      }
    });

    // 查詢子分類
    const subCategoriesSnapshot = await db.collection('materialSubCategories').get();
    const autoSubCategories: any[] = [];

    console.log(`📊 總共找到 ${subCategoriesSnapshot.size} 個子分類`);

    subCategoriesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.startsWith('自動分類_')) {
        autoSubCategories.push({
          id: doc.id,
          name: data.name,
          data: data,
          createTime: doc.createTime ? doc.createTime.toDate().toISOString() : null,
          updateTime: doc.updateTime ? doc.updateTime.toDate().toISOString() : null
        });
      }
    });

    // 如果找到自動分類，也查詢使用這些分類的材料
    let materialsUsingAutoCategories: any[] = [];

    if (autoCategories.length > 0 || autoSubCategories.length > 0) {
      console.log('🔍 查詢使用自動分類的材料...');
      const materialsSnapshot = await db.collection('materials').get();

      materialsSnapshot.forEach(doc => {
        const data = doc.data();
        const category = data.category || '';
        const subCategory = data.subCategory || '';

        if (category.startsWith('自動分類_') || subCategory.startsWith('自動分類_')) {
          materialsUsingAutoCategories.push({
            id: doc.id,
            name: data.name,
            code: data.code,
            category: category,
            subCategory: subCategory,
            createTime: doc.createTime ? doc.createTime.toDate().toISOString() : null,
            updateTime: doc.updateTime ? doc.updateTime.toDate().toISOString() : null
          });
        }
      });
    }

    const result = {
      success: true,
      summary: {
        totalMainCategories: categoriesSnapshot.size,
        totalSubCategories: subCategoriesSnapshot.size,
        autoMainCategories: autoCategories.length,
        autoSubCategories: autoSubCategories.length,
        materialsUsingAutoCategories: materialsUsingAutoCategories.length
      },
      data: {
        autoMainCategories: autoCategories,
        autoSubCategories: autoSubCategories,
        materialsUsingAutoCategories: materialsUsingAutoCategories
      }
    };

    console.log('查詢結果:', result);

    res.json(result);

  } catch (error) {
    console.error('❌ 查詢自動分類時發生錯誤:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
};