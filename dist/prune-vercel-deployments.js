"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_fetch_1 = require("node-fetch");
var VERCEL_TOKEN = process.env.VERCEL_TOKEN; // create a Vercel Personal Token
var PROJECT_NAME = "portfolio-app"; // your Vercel project
var TEAM_ID = "ntvinh-apps"; // optional if project is under a team
var KEEP = 5; // number of prod deployments to keep
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var baseUrl, deploymentsRes, deployments, prodDeployments, toDelete, _i, toDelete_1, dep;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseUrl = "https://api.vercel.com/v6/deployments";
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(baseUrl, "?app=").concat(PROJECT_NAME, "&limit=200").concat(TEAM_ID ? "&teamId=".concat(TEAM_ID) : ""), {
                            headers: { Authorization: "Bearer ".concat(VERCEL_TOKEN) },
                        })];
                case 1:
                    deploymentsRes = _a.sent();
                    return [4 /*yield*/, deploymentsRes.json()];
                case 2:
                    deployments = (_a.sent()).deployments;
                    prodDeployments = deployments.filter(function (d) { var _a; return ((_a = d.meta) === null || _a === void 0 ? void 0 : _a.deploymentType) === "production"; });
                    // Step 3: Sort by createdAt (descending)
                    prodDeployments.sort(function (a, b) { return b.createdAt - a.createdAt; });
                    toDelete = prodDeployments.slice(KEEP);
                    _i = 0, toDelete_1 = toDelete;
                    _a.label = 3;
                case 3:
                    if (!(_i < toDelete_1.length)) return [3 /*break*/, 6];
                    dep = toDelete_1[_i];
                    console.log("Deleting: ".concat(dep.url));
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(baseUrl, "/").concat(dep.uid).concat(TEAM_ID ? "?teamId=".concat(TEAM_ID) : ""), {
                            method: "DELETE",
                            headers: { Authorization: "Bearer ".concat(VERCEL_TOKEN) },
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("\u2705 Pruned ".concat(toDelete.length, " old deployments, kept ").concat(KEEP));
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error("Error:", err);
    process.exit(1);
});
