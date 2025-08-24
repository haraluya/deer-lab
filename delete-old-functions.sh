#!/bin/bash

echo "Deleting old Firebase Functions..."

# 需要刪除的函數列表
functions=(
  "changeProductFragrance"
  "checkRoleUsage"
  "createFragrance"
  "createMaterial"
  "createPersonnel"
  "createProduct"
  "createProductSeries"
  "createPurchaseOrders"
  "createRole"
  "createSupplier"
  "createUser"
  "createWorkOrder"
  "deleteFragrance"
  "deleteMaterial"
  "deletePersonnel"
  "deleteProduct"
  "deleteProductSeries"
  "deleteRole"
  "deleteSupplier"
  "loginWithEmployeeId"
  "performStocktake"
  "receivePurchaseOrderItems"
  "setUserStatus"
  "updateFragrance"
  "updateMaterial"
  "updatePersonnel"
  "updateProduct"
  "updateProductSeries"
  "updatePurchaseOrderStatus"
  "updateRole"
  "updateSupplier"
  "updateUser"
  "verifyPassword"
)

# 刪除每個函數
for func in "${functions[@]}"; do
  echo "Deleting function: $func"
  firebase functions:delete "$func" --region us-central1 --force || echo "Function $func not found or already deleted"
done

echo "Old functions deletion completed"
