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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGraph = void 0;
const axios_1 = __importDefault(require("./axios"));
const getGraph = (endpoint, version = 'v1.0') => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    let error;
    // if request fails, try it 10 times before throwing the error
    for (let leftAttempts = 10; leftAttempts > 0; leftAttempts--) {
        try {
            if (endpoint.startsWith('https://')) {
                return yield axios_1.default.get(`${endpoint}`);
            }
            else {
                return yield axios_1.default.get(`https://graph.microsoft.com/${version}${endpoint}`);
            }
        }
        catch (e) {
            error = e;
            // 429 means we're getting throttled
            if (((_a = e.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
                // try to get retry-after value from response
                const headers = e.response.headers;
                if (headers) {
                    const retryAfter = parseInt((_b = headers['Retry-After']) !== null && _b !== void 0 ? _b : '', 10);
                    // check is not NaN (NaN is never equal to itself)
                    // eslint-disable-next-line no-self-compare
                    if (retryAfter === retryAfter) {
                        console.warn(`We are getting throttled. Retrying in ${retryAfter} seconds.`);
                        yield new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                        continue;
                    }
                }
            }
            else if (((_c = e.response) === null || _c === void 0 ? void 0 : _c.status) >= 500 || ((_d = e.response) === null || _d === void 0 ? void 0 : _d.status) === 401) {
                // just retry until all attempts are done
                if (leftAttempts <= 3) {
                    // sleep for 1s
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
                else if (leftAttempts <= 6) {
                    // sleep for 500ms
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            else {
                throw new Error(JSON.stringify(e.response));
            }
        }
    }
    throw new Error('Request failed (ran out of retries): ' + error);
});
exports.getGraph = getGraph;
