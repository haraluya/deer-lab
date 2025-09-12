// src/hooks/useFormDataLoader.ts
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Supplier } from '@/types/entities';

// 支援的資料載入類型
export interface FormDataLoaderConfig {
  loadSuppliers?: boolean;
  loadMaterialCategories?: boolean;
  loadMaterialSubCategories?: boolean;
  loadUsers?: boolean;
  loadProducts?: boolean;
  // 未來可以擴展更多類型
}

export interface FormDataLoaderResult {
  suppliers: Supplier[];
  materialCategories: string[];
  materialSubCategories: string[];
  users: any[];
  products: any[];
  isLoading: boolean;
  error: string | null;
}

export function useFormDataLoader(config: FormDataLoaderConfig, isOpen: boolean): FormDataLoaderResult {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materialCategories, setMaterialCategories] = useState<string[]>([]);
  const [materialSubCategories, setMaterialSubCategories] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      console.log('🔄 FormDataLoader: 開始載入資料', config);

      try {
        if (!db) {
          throw new Error('Firebase 未初始化');
        }

        const loadTasks: Promise<void>[] = [];

        // 載入供應商
        if (config.loadSuppliers) {
          loadTasks.push(
            (async () => {
              try {
                console.log('📦 載入供應商資料...');
                const suppliersCollectionRef = collection(db, 'suppliers');
                const suppliersSnapshot = await getDocs(suppliersCollectionRef);
                const suppliersList = suppliersSnapshot.docs.map(doc => ({
                  id: doc.id,
                  name: doc.data().name,
                })) as Supplier[];
                setSuppliers(suppliersList);
                console.log(`✅ 成功載入 ${suppliersList.length} 個供應商`);
              } catch (error) {
                console.warn('⚠️ 載入供應商失敗:', error);
                setSuppliers([]);
              }
            })()
          );
        }

        // 載入主分類
        if (config.loadMaterialCategories) {
          loadTasks.push(
            (async () => {
              try {
                console.log('📂 載入主分類資料...');
                const categoriesCollectionRef = collection(db, 'materialCategories');
                const categoriesSnapshot = await getDocs(categoriesCollectionRef);
                const categoriesList = categoriesSnapshot.docs
                  .map(doc => doc.data().name)
                  .filter(Boolean);
                setMaterialCategories(categoriesList.sort());
                console.log(`✅ 成功載入 ${categoriesList.length} 個主分類`);
              } catch (error) {
                console.warn('⚠️ 主分類集合不存在:', error);
                setMaterialCategories([]);
              }
            })()
          );
        }

        // 載入細分分類
        if (config.loadMaterialSubCategories) {
          loadTasks.push(
            (async () => {
              try {
                console.log('📋 載入細分分類資料...');
                const subCategoriesCollectionRef = collection(db, 'materialSubCategories');
                const subCategoriesSnapshot = await getDocs(subCategoriesCollectionRef);
                const subCategoriesList = subCategoriesSnapshot.docs
                  .map(doc => doc.data().name)
                  .filter(Boolean);
                setMaterialSubCategories(subCategoriesList.sort());
                console.log(`✅ 成功載入 ${subCategoriesList.length} 個細分分類`);
              } catch (error) {
                console.warn('⚠️ 細分分類集合不存在:', error);
                setMaterialSubCategories([]);
              }
            })()
          );
        }

        // 載入使用者
        if (config.loadUsers) {
          loadTasks.push(
            (async () => {
              try {
                console.log('👥 載入使用者資料...');
                const usersCollectionRef = collection(db, 'users');
                const usersSnapshot = await getDocs(usersCollectionRef);
                const usersList = usersSnapshot.docs
                  .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }))
                  .filter((user: any) => user.status === 'active');
                setUsers(usersList);
                console.log(`✅ 成功載入 ${usersList.length} 個使用者`);
              } catch (error) {
                console.warn('⚠️ 載入使用者失敗:', error);
                setUsers([]);
              }
            })()
          );
        }

        // 載入產品
        if (config.loadProducts) {
          loadTasks.push(
            (async () => {
              try {
                console.log('🎯 載入產品資料...');
                const productsCollectionRef = collection(db, 'products');
                const productsSnapshot = await getDocs(productsCollectionRef);
                const productsList = productsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                setProducts(productsList);
                console.log(`✅ 成功載入 ${productsList.length} 個產品`);
              } catch (error) {
                console.warn('⚠️ 載入產品失敗:', error);
                setProducts([]);
              }
            })()
          );
        }

        // 並行執行所有載入任務
        await Promise.all(loadTasks);
        console.log('🎉 FormDataLoader: 所有資料載入完成');

      } catch (error) {
        console.error('❌ FormDataLoader: 載入資料失敗:', error);
        setError(error instanceof Error ? error.message : '載入資料失敗');
        
        // 設置空資料作為後備
        setSuppliers([]);
        setMaterialCategories([]);
        setMaterialSubCategories([]);
        setUsers([]);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, config]); // 移除 JSON.stringify，ESLint 能處理物件依賴

  return {
    suppliers,
    materialCategories,
    materialSubCategories,
    users,
    products,
    isLoading,
    error,
  };
}