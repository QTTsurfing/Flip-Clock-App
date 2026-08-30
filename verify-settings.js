'use strict';

// 独立验证脚本（不属于判定标准 test.js）：
// 证明设置经 localStorage 语义保存后，重新加载（新建 storage 视图）仍能读回。

const { loadSettings, saveSettings, SETTING_DEFAULTS } = require('./app.js');

function makeStorage() {
  const store = {};
  return {
    store: store,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); }
  };
}

let ok = true;
function check(name, cond) {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name);
  if (!cond) ok = false;
}

// 1) 空存储 → 全部默认值
const s1 = makeStorage();
const loaded1 = loadSettings(s1);
check('空存储返回默认值', JSON.stringify(loaded1) === JSON.stringify(SETTING_DEFAULTS));

// 2) 修改设置 → 保存 → 新建 storage（模拟刷新后的新会话）→ 读回一致
const s2 = makeStorage();
const edited = { hour12: false, showSeconds: true, dim: 0.35, flaps: false, scale: 1.4 };
saveSettings(s2, edited);
const s2b = {
  store: s2.store,
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(s2.store, k) ? s2.store[k] : null; },
  setItem: function (k, v) { s2.store[k] = String(v); }
};
const reloaded = loadSettings(s2b);
check('保存后读回与修改一致',
  JSON.stringify(reloaded) === JSON.stringify(edited));

// 3) 保存后的底层值与键名符合 flipclock. 前缀
check('键名带 flipclock. 前缀',
  Object.keys(s2.store).every(function (k) { return k.indexOf('flipclock.') === 0; }));

// 4) 半份存储：缺失项回落默认值
const s3 = makeStorage();
s3.setItem('flipclock.hour12', 'false');
const loaded3 = loadSettings(s3);
check('部分存储缺失项回落默认值',
  loaded3.hour12 === false && loaded3.showSeconds === SETTING_DEFAULTS.showSeconds);

console.log('----');
console.log(ok ? '设置持久化逻辑验证通过' : '设置持久化逻辑验证失败');
process.exit(ok ? 0 : 1);
