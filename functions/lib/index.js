"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.nextServer = void 0;
// functions/src/index.ts
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
const next_1 = __importDefault(require("next"));
// 初始化 Firebase Admin SDK，只需一次
(0, app_1.initializeApp)();
// 初始化 Next.js App 在全域範圍
const nextApp = (0, next_1.default)({
    dev: false,
    dir: process.cwd(),
});
const nextHandle = nextApp.getRequestHandler();
// 建立 nextServer 雲端函數
exports.nextServer = (0, https_1.onRequest)({ maxInstances: 10 }, async (req, res) => {
    try {
        await nextApp.prepare();
        return nextHandle(req, res);
    }
    catch (error) {
        console.error('Next.js app preparation failed:', error);
        res.status(500).send('Internal Server Error');
    }
});
// 創建一個簡單的健康檢查函數
exports.healthCheck = (0, https_1.onRequest)((request, response) => {
    response.json({
        status: "healthy",
        service: "鹿鹿小作坊 API Service",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});
// 匯出所有 API 函數
__exportStar(require("./api/users"), exports);
__exportStar(require("./api/suppliers"), exports);
__exportStar(require("./api/materials"), exports);
__exportStar(require("./api/fragrances"), exports);
__exportStar(require("./api/productSeries"), exports);
__exportStar(require("./api/products"), exports);
__exportStar(require("./api/purchaseOrders"), exports);
__exportStar(require("./api/inventory"), exports);
__exportStar(require("./api/workOrders"), exports);
__exportStar(require("./api/roles"), exports);
__exportStar(require("./api/personnel"), exports);
__exportStar(require("./api/auth"), exports);
__exportStar(require("./api/globalCart"), exports);
__exportStar(require("./api/resetPermissions"), exports);
//# sourceMappingURL=index.js.map