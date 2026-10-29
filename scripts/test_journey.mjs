import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../docs/assets/js/journey.js', import.meta.url), 'utf8');
const { progressAt } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const cases = [
  [{ position: 0, progress: 0 }, { position: 200, progress: .1 }, { position: 500, progress: .8 }, { position: 900, progress: 1 }],
  [{ position: 0, progress: .2 }, { position: 120, progress: .2 }, { position: 700, progress: .6 }, { position: 800, progress: .6 }, { position: 1500, progress: 1 }],
  [{ position: 0, progress: .82 }, { position: 350, progress: .9 }, { position: 550, progress: 1 }],
];
for (const anchors of cases) {
  for (const anchor of anchors) assert.equal(progressAt(anchors, anchor.position), anchor.progress, 'Photo anchors stay exact');
  let previous = anchors[0].progress;
  for (let x = anchors[0].position; x <= anchors.at(-1).position; x += .5) {
    const value = progressAt(anchors, x);
    assert.ok(value >= previous - 1e-12 && value <= anchors.at(-1).progress, 'No backwards movement or overshoot');
    previous = value;
  }
  for (const anchor of anchors.slice(1, -1)) {
    const h = .001;
    const before = (anchor.progress - progressAt(anchors, anchor.position - h)) / h;
    const after = (progressAt(anchors, anchor.position + h) - anchor.progress) / h;
    assert.ok(Math.abs(before - after) < 1e-6, 'Speed stays continuous across photo anchors');
  }
}
assert.equal(progressAt(cases[1], 60), .2, 'A group of photos at one location stays there');
assert.equal(progressAt([], 100), 0);
assert.equal(progressAt([{ position: 10, progress: .5 }], 100), .5);
console.log('PASS: exact photo alignment, continuous speed, monotonic movement, pauses and endpoint limits.');
