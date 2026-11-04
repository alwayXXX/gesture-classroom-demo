import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('#settingsToggle').click();
  await page.locator('#questionInput').fill('测试题目');
  await page.locator('#input1').fill('正确选项');
  await page.locator('label.answer').count();
  await page.locator('label').filter({ has: page.locator('input[name=answer][value="1"]') }).click();
  await page.locator('#settingsForm button[type=submit]').click();
  assert.equal(await page.locator('#questionDisplay').textContent(), '测试题目');
  assert.equal(await page.locator('#optionText1').textContent(), '正确选项');
  await page.locator('#demoBtn').click();
  await page.locator('[data-index="0"]').click();
  await page.locator('[data-index="1"]').click();
  await page.locator('[data-index="1"]').click();
  assert.equal(await page.locator('#total').textContent(), '3');
  await page.locator('#revealBtn').click();
  assert.match(await page.locator('#message').textContent(), /正确答案 B.*2 \/ 3.*67%/);
  assert.equal(await page.locator('[data-index="1"]').isDisabled(), true);
  await page.locator('#freezeBtn').click();
  assert.doesNotMatch(await page.locator('#message').textContent(), /正确答案/);
  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#total').textContent(), '0');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'ui-preview.png' });
  console.log('UI smoke test passed: setup, simulated voting, reveal, resume and reset.');
  await page.goto('http://127.0.0.1:5173/tests/vision-smoke.html');
  await page.waitForFunction(() => document.body.dataset.status !== 'starting', { timeout: 60000 });
  assert.equal(await page.locator('body').getAttribute('data-status'), 'ok', await page.locator('body').textContent());
  console.log('Local model and WASM loaded and processed a test image without a camera.');
} finally { await browser.close(); }
