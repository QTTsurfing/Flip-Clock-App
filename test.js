'use strict';

const { formatTime, shouldFlip } = require('./app.js');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log('PASS  ' + name);
  } else {
    failed++;
    failures.push(name);
    console.log('FAIL  ' + name + '  期望 ' + e + ' 实际 ' + a);
  }
}

function d(h, m, s) {
  return new Date(2026, 0, 1, h, m, s || 0);
}

// formatTime：24 小时制
check('24h 23:05 -> [2,3,:,0,5]',
  formatTime(d(23, 5), { hour12: false, showSeconds: false }),
  [2, 3, ':', 0, 5]);
check('24h 00:00 -> [0,0,:,0,0]',
  formatTime(d(0, 0), { hour12: false, showSeconds: false }),
  [0, 0, ':', 0, 0]);
check('24h 12:00 -> [1,2,:,0,0]',
  formatTime(d(12, 0), { hour12: false, showSeconds: false }),
  [1, 2, ':', 0, 0]);

// formatTime：12 小时制边界（23 点 = 11 PM，0 点 = 12 AM，12 点 = 12 PM）
check('12h 23:05 -> [1,1,:,0,5]',
  formatTime(d(23, 5), { hour12: true, showSeconds: false }),
  [1, 1, ':', 0, 5]);
check('12h 00:05 -> [1,2,:,0,5]',
  formatTime(d(0, 5), { hour12: true, showSeconds: false }),
  [1, 2, ':', 0, 5]);
check('12h 12:00 -> [1,2,:,0,0]',
  formatTime(d(12, 0), { hour12: true, showSeconds: false }),
  [1, 2, ':', 0, 0]);
check('12h 13:00 -> [0,1,:,0,0]（13 点 = 下午 1 点）',
  formatTime(d(13, 0), { hour12: true, showSeconds: false }),
  [0, 1, ':', 0, 0]);

// formatTime：秒
check('24h 09:08:07 带秒 -> [0,9,:,0,8,:,0,7]',
  formatTime(d(9, 8, 7), { hour12: false, showSeconds: true }),
  [0, 9, ':', 0, 8, ':', 0, 7]);

// shouldFlip：分钟变化只翻对应位
check('12:01 -> 12:02 只翻分钟个位 [4]',
  shouldFlip([1, 2, ':', 0, 1], [1, 2, ':', 0, 2]),
  [4]);
check('12:59 -> 13:00 翻 [1,3,4]',
  shouldFlip([1, 2, ':', 5, 9], [1, 3, ':', 0, 0]),
  [1, 3, 4]);
check('相同不翻 []',
  shouldFlip([1, 2, ':', 0, 1], [1, 2, ':', 0, 1]),
  []);
check('冒号位不翻',
  shouldFlip([1, 2, ':', 0, 1], [1, 2, ':', 0, 2]).indexOf(2) === -1,
  true);
check('12:01:09 -> 12:01:10 翻秒两位 [6,7]',
  shouldFlip([1, 2, ':', 0, 1, ':', 0, 9], [1, 2, ':', 0, 1, ':', 1, 0]),
  [6, 7]);

console.log('----');
console.log('通过 ' + passed + '，失败 ' + failed + '，跳过 0，共 ' + (passed + failed));
if (failed > 0) {
  console.log('失败项：' + failures.join('、'));
  process.exit(1);
}
