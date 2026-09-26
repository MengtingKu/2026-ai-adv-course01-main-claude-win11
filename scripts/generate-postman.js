/**
 * 將 openapi.json 轉換為 Postman Collection（postman/flower-shop.postman_collection.json）
 *
 * - 以 openapi-to-postmanv2 轉換，再補上專案需要的設定：
 *   - collection 變數：baseUrl（預設 http://localhost:3001）、token、sessionId
 *   - 所有 URL 使用 {{baseUrl}}
 *   - collection 層級 Bearer {{token}}；需要登入的 API 繼承此認證，公開 API 設為 noauth
 *   - 購物車（bearerAuth / sessionId 雙模式）額外帶 X-Session-Id: {{sessionId}}
 *   - 登入 / 註冊成功後自動把 JWT 存入 token
 *
 * 使用：npm run postman（會先執行 npm run openapi 產生最新 openapi.json）
 */
const fs = require('fs');
const path = require('path');
const Converter = require('openapi-to-postmanv2');

const ROOT = path.join(__dirname, '..');
const OPENAPI_PATH = path.join(ROOT, 'openapi.json');
const OUTPUT_DIR = path.join(ROOT, 'postman');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'flower-shop.postman_collection.json');
const BASE_URL = 'http://localhost:3001';

const SAVE_TOKEN_SCRIPT = [
  'if (pm.response.code === 200 || pm.response.code === 201) {',
  '  const json = pm.response.json();',
  '  if (json && json.data && json.data.token) {',
  "    pm.collectionVariables.set('token', json.data.token);",
  "    console.log('JWT 已儲存至 {{token}}');",
  '  }',
  '}',
];

function convert(spec) {
  return new Promise((resolve, reject) => {
    Converter.convert(
      { type: 'json', data: spec },
      {
        folderStrategy: 'Tags',
        requestParametersResolution: 'Example',
        exampleParametersResolution: 'Example',
        includeAuthInfoInExample: false,
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result.result) return reject(new Error(result.reason));
        resolve(result.output[0].data);
      }
    );
  });
}

// OpenAPI path（/api/orders/{id}）→ Postman path 片段（['api','orders',':id']）的比對 key
function pathKey(segments) {
  return '/' + segments.map((s) => s.replace(/^:(.+)$/, '{$1}').replace(/^\{\{(.+)\}\}$/, '{$1}')).join('/');
}

function buildSecurityIndex(spec) {
  const index = new Map();
  for (const [route, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const schemes = (op.security || spec.security || []).flatMap((s) => Object.keys(s));
      index.set(`${method.toUpperCase()} ${route}`, schemes);
    }
  }
  return index;
}

function* walkRequests(items) {
  for (const item of items) {
    if (item.item) yield* walkRequests(item.item);
    else if (item.request) yield item;
  }
}

function postProcess(collection, spec) {
  const security = buildSecurityIndex(spec);

  collection.info.name = spec.info.title;
  collection.info.description = `${spec.info.description}\n\n由 openapi.json 自動產生（npm run postman）。先執行「登入」取得 token，需要登入的 API 會自動帶入 Bearer Token。`;
  collection.variable = [
    { key: 'baseUrl', value: BASE_URL, type: 'string' },
    { key: 'token', value: '', type: 'string' },
    { key: 'sessionId', value: '', type: 'string' },
  ];
  collection.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] };

  for (const item of walkRequests(collection.item)) {
    const req = item.request;
    const segments = Array.isArray(req.url.path) ? req.url.path : [];

    // URL 一律使用 {{baseUrl}}
    req.url.host = ['{{baseUrl}}'];
    delete req.url.protocol;
    delete req.url.port;
    req.url.raw = '{{baseUrl}}/' + segments.join('/') +
      (req.url.query && req.url.query.length ? '?' + req.url.query.map((q) => `${q.key}=${q.value ?? ''}`).join('&') : '');

    const key = `${req.method} ${pathKey(segments)}`;
    const schemes = security.get(key);
    if (schemes === undefined) throw new Error(`openapi.json 找不到對應的 operation：${key}`);

    // 認證：bearerAuth → 繼承 collection 的 Bearer {{token}}；無 security → noauth
    req.header = (req.header || []).filter((h) => h.key.toLowerCase() !== 'authorization' && h.key !== 'X-Session-Id');
    if (schemes.includes('bearerAuth')) {
      delete req.auth;
    } else if (schemes.length === 0) {
      req.auth = { type: 'noauth' };
    }
    if (schemes.includes('sessionId')) {
      req.header.push({
        key: 'X-Session-Id',
        value: '{{sessionId}}',
        description: '訪客購物車使用；已登入時以 Bearer Token 為準',
      });
    }

    // 登入 / 註冊後自動儲存 JWT
    if (req.method === 'POST' && ['/api/auth/login', '/api/auth/register'].includes(pathKey(segments))) {
      item.event = [{ listen: 'test', script: { type: 'text/javascript', exec: SAVE_TOKEN_SCRIPT } }];
    }

    // 範例回應中的 URL 同樣改為 {{baseUrl}}
    for (const res of item.response || []) {
      if (res.originalRequest && res.originalRequest.url) {
        res.originalRequest.url.host = ['{{baseUrl}}'];
        delete res.originalRequest.url.protocol;
        delete res.originalRequest.url.port;
      }
    }
  }

  // 預設登入範例帶入 seed 管理員帳號，方便直接送出
  for (const item of walkRequests(collection.item)) {
    if (item.request.method === 'POST' && pathKey(item.request.url.path) === '/api/auth/login' && item.request.body) {
      item.request.body.raw = JSON.stringify({ email: 'admin@hexschool.com', password: '12345678' }, null, 2);
    }
  }

  return collection;
}

function validate(collection) {
  const json = JSON.stringify(collection);
  JSON.parse(json); // 確認可序列化為有效 JSON
  const vars = collection.variable.map((v) => v.key);
  for (const k of ['baseUrl', 'token', 'sessionId']) {
    if (!vars.includes(k)) throw new Error(`缺少 collection 變數 ${k}`);
  }
  const requests = [...walkRequests(collection.item)];
  for (const item of requests) {
    if (!item.request.url.raw.startsWith('{{baseUrl}}/')) throw new Error(`URL 未使用 {{baseUrl}}：${item.name}`);
  }
  return requests.length;
}

async function main() {
  const spec = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
  const collection = postProcess(await convert(spec), spec);
  const count = validate(collection);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collection, null, 2) + '\n');
  console.log(`Postman collection generated: ${path.relative(ROOT, OUTPUT_PATH)}（${count} requests）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
