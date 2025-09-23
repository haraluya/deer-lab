// src/utils/exportPurchaseOrder.ts
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatQuantity } from '@/utils/numberFormat';

interface PurchaseOrderItem {
  name: string;
  code: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
  productCapacityKg?: number;
  fragrancePercentage?: number;
}

interface AdditionalFee {
  name: string;
  amount: number;
  quantity: number;
  unit: string;
  description?: string;
}

interface PurchaseOrderData {
  code: string;
  supplierName: string;
  status: string;
  createdByName: string;
  createdAt: string;
  items: PurchaseOrderItem[];
  additionalFees?: AdditionalFee[];
}

export function exportPurchaseOrderToExcel(orderData: PurchaseOrderData) {
  // 創建新的工作簿
  const wb = XLSX.utils.book_new();

  // 準備採購單數據
  const wsData: any[][] = [];

  // 公司標題（根據需要調整）
  wsData.push(['德科斯特的實驗室 - 採購訂單']);
  wsData.push([]);

  // 基本資訊區塊
  wsData.push(['採購單資訊']);
  wsData.push(['採購單編號：', orderData.code, '', '狀態：', orderData.status]);
  wsData.push(['供應商：', orderData.supplierName, '', '建立日期：', orderData.createdAt]);
  wsData.push(['建立人員：', orderData.createdByName]);
  wsData.push([]);

  // 採購項目標題
  wsData.push(['採購項目明細']);
  wsData.push([]);

  // 表格標題行
  const headers = [
    '項次',
    '品項代號',
    '品項名稱',
    '採購數量',
    '單位',
    '單價(NT$)',
    '小計(NT$)',
    '可做產品(KG)',
    '香精比例(%)',
    '備註'
  ];
  wsData.push(headers);

  // 採購項目數據
  let totalAmount = 0;
  let itemIndex = 1;

  orderData.items.forEach(item => {
    const unitPrice = item.costPerUnit || 0;
    const subtotal = item.quantity * unitPrice;
    totalAmount += subtotal;

    const row = [
      itemIndex++,
      item.code,
      item.name,
      formatQuantity(item.quantity),
      item.unit,
      unitPrice > 0 ? unitPrice.toFixed(2) : '-',
      subtotal > 0 ? subtotal.toFixed(2) : '-',
      item.productCapacityKg ? formatQuantity(item.productCapacityKg) : '-',
      item.fragrancePercentage ? `${item.fragrancePercentage}%` : '-',
      item.productCapacityKg ? '香精' : '原物料'
    ];
    wsData.push(row);
  });

  wsData.push([]);

  // 附加費用（如果有）
  if (orderData.additionalFees && orderData.additionalFees.length > 0) {
    wsData.push(['附加費用']);
    wsData.push(['項目', '數量', '單位', '金額(NT$)', '說明']);

    orderData.additionalFees.forEach(fee => {
      wsData.push([
        fee.name,
        fee.quantity,
        fee.unit,
        fee.amount.toFixed(2),
        fee.description || ''
      ]);
      totalAmount += fee.amount;
    });

    wsData.push([]);
  }

  // 總計區域
  wsData.push(['', '', '', '', '', '商品小計：', `NT$ ${totalAmount.toFixed(2)}`]);

  if (orderData.additionalFees && orderData.additionalFees.length > 0) {
    const additionalTotal = orderData.additionalFees.reduce((sum, fee) => sum + fee.amount, 0);
    wsData.push(['', '', '', '', '', '附加費用：', `NT$ ${additionalTotal.toFixed(2)}`]);
  }

  wsData.push(['', '', '', '', '', '總計金額：', `NT$ ${totalAmount.toFixed(2)}`]);
  wsData.push([]);

  // 備註區域
  wsData.push(['備註事項：']);
  wsData.push(['1. 此採購單為系統自動生成，實際金額以供應商報價為準']);
  wsData.push(['2. 香精可做產品數量為預估值，實際數量依產品配方而定']);
  wsData.push(['3. 請確認所有品項規格無誤後再進行採購']);
  wsData.push([]);

  // 簽核欄位
  wsData.push(['']);
  wsData.push(['採購人員：_______________', '', '主管核准：_______________', '', '財務審核：_______________']);

  // 創建工作表
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 設定欄位寬度
  const colWidths = [
    { wch: 8 },   // 項次
    { wch: 15 },  // 品項代號
    { wch: 25 },  // 品項名稱
    { wch: 12 },  // 採購數量
    { wch: 8 },   // 單位
    { wch: 12 },  // 單價
    { wch: 15 },  // 小計
    { wch: 15 },  // 可做產品
    { wch: 12 },  // 香精比例
    { wch: 15 }   // 備註
  ];
  ws['!cols'] = colWidths;

  // 設定合併儲存格
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },  // 標題行
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },  // 採購單資訊標題
    { s: { r: 8, c: 0 }, e: { r: 8, c: 9 } },  // 採購項目明細標題
  ];
  ws['!merges'] = merges;

  // 設定樣式（基本樣式，XLSX社群版支援有限）
  // 標題樣式
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  // 區塊標題樣式
  ['A3', 'A9'].forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: 'F0F0F0' } }
      };
    }
  });

  // 表格標題列樣式
  for (let col = 0; col < headers.length; col++) {
    const cell = XLSX.utils.encode_cell({ r: 10, c: col });
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E0E0E0' } },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
    }
  }

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '採購單');

  // 生成 Excel 文件
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

  // 轉換為 Blob
  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }

  // 生成檔名（包含日期和採購單編號）
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fileName = `採購單_${orderData.code}_${dateStr}.xlsx`;

  // 下載檔案
  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  saveAs(blob, fileName);
}

// 匯出簡化版採購單（供應商版本）
export function exportSimplePurchaseOrder(orderData: PurchaseOrderData) {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];

  // 簡化版標題
  wsData.push([`採購單 - ${orderData.code}`]);
  wsData.push([`供應商：${orderData.supplierName}`]);
  wsData.push([`日期：${new Date().toLocaleDateString('zh-TW')}`]);
  wsData.push([]);

  // 簡化表格
  wsData.push(['品項代號', '品項名稱', '數量', '單位', '備註']);

  orderData.items.forEach(item => {
    wsData.push([
      item.code,
      item.name,
      formatQuantity(item.quantity),
      item.unit,
      item.productCapacityKg ? `可做產品 ${formatQuantity(item.productCapacityKg)} KG` : ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 設定欄寬
  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 12 },
    { wch: 8 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, '採購單');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }

  const fileName = `採購單_${orderData.code}_簡化版.xlsx`;
  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  saveAs(blob, fileName);
}