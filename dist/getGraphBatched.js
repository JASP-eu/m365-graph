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
exports.getGraphBatched = void 0;
const axios_1 = __importDefault(require("./axios"));
const getGraphBatched = (requests, version = 'v1.0', leftAttempts = 20, retryAfter = 0) => __awaiter(void 0, void 0, void 0, function* () {
    const requestChunks = [];
    if (retryAfter) {
        // sleep for retryAfter seconds
        console.warn(`We are getting throttled. Retrying in ${retryAfter} seconds.`);
        yield new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }
    else if (leftAttempts <= 7) {
        // sleep for 1s
        yield new Promise(resolve => setTimeout(resolve, 1000));
    }
    else if (leftAttempts <= 13) {
        // sleep for 500ms
        yield new Promise(resolve => setTimeout(resolve, 500));
    }
    // strip https... prefix from requests
    requests = requests.map(request => {
        if (request.url.includes('https://graph.microsoft.com')) {
            return Object.assign(Object.assign({}, request), { url: request.url.slice(32) });
        }
        return request;
    });
    // create chunks of 20 requests per batch. that's the maximum Microsoft can handle
    for (let i = 0; i < requests.length; i += 20) {
        requestChunks.push(requests.slice(i, i + 20));
    }
    // send all batch chunks in parallel
    // if the whole batch failed, return all requests as if they would've gotten 500s each
    const responseChunks = yield Promise.all(requestChunks.map(requests => axios_1.default.post(`https://graph.microsoft.com/${version}/$batch`, { requests }).catch(() => ({
        data: {
            responses: requests.map(request => ({
                id: request.id,
                status: 500,
                body: {},
                headers: undefined,
            })),
        },
    }))));
    // reduce all chunk responses into all succeeded and all failed
    const reduceResult = responseChunks.reduce(({ succeeded, toBeRetried, retryAfter }, chunk) => {
        var _a, _b;
        let newRetryAfter = retryAfter;
        // consider everything failed that's over 400
        const succeededResponses = chunk.data.responses.filter(x => x.status < 400);
        // retry 500 and 401 because those fail randomly
        // retry 429 because those are being throttled
        const toBeRetriedResponses = chunk.data.responses.filter(x => x.status >= 500 || x.status === 401 || x.status === 429);
        // try to get retry-after value from response
        const throttledRequestHeaders = (_a = toBeRetriedResponses.find(x => x.status === 429)) === null || _a === void 0 ? void 0 : _a.headers;
        if (throttledRequestHeaders) {
            const parsedRetryAfter = parseInt((_b = throttledRequestHeaders['Retry-After']) !== null && _b !== void 0 ? _b : '', 10);
            // check is not NaN (NaN is never equal to itself)
            // eslint-disable-next-line no-self-compare
            if (parsedRetryAfter === parsedRetryAfter && parsedRetryAfter > newRetryAfter) {
                newRetryAfter = parsedRetryAfter;
            }
        }
        return {
            succeeded: succeeded.concat(succeededResponses),
            toBeRetried: toBeRetried.concat(toBeRetriedResponses),
            retryAfter: newRetryAfter,
        };
    }, { succeeded: [], toBeRetried: [], retryAfter });
    const succeededRequests = reduceResult.succeeded;
    const toBeRetriedRequests = reduceResult.toBeRetried;
    retryAfter = reduceResult.retryAfter;
    // some requests failed? retry those if retries are left
    if (toBeRetriedRequests.length) {
        console.warn(`${toBeRetriedRequests.length} batch requests failed; left retries: ${leftAttempts}`);
        if (leftAttempts > 0) {
            const retryResponses = yield exports.getGraphBatched(requests.filter(x => toBeRetriedRequests.find(f => f.id === x.id)), version, leftAttempts - 1, retryAfter);
            return succeededRequests.concat(retryResponses);
        }
        throw new Error('Batch request failed. Went out of retries.');
    }
    // no failed? then just return the succeeded ones
    return succeededRequests;
});
exports.getGraphBatched = getGraphBatched;
