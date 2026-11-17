import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUserManualPdfDocument, MANUAL_SECTIONS } from './userManualPdf';

test('buildUserManualPdfDocument builds a valid multi-page manual covering all 4 screenshot steps', async () => {
  assert.equal(MANUAL_SECTIONS.length, 4);
  for (const section of MANUAL_SECTIONS) {
    assert.ok(section.screenshotUrl.startsWith('/manual/'));
    assert.ok(section.bullets.length >= 3);
  }

  const doc = await buildUserManualPdfDocument();
  assert.ok(doc.getNumberOfPages() >= 5);
  const output = doc.output('arraybuffer');
  assert.ok(output.byteLength > 2000);
});
