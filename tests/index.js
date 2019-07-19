// @flow
const assert = require('assert');
const {exec, read} = require('../utils/node-helpers.js');
const {add} = require('../commands/add.js');
const {remove} = require('../commands/remove.js');
const {upgrade} = require('../commands/upgrade.js');
const {merge} = require('../commands/merge.js');
const {sync} = require('../commands/sync.js');
const {check} = require('../commands/check.js');

process.on('unhandledRejection', e => {
  console.error(e.stack);
  process.exit(1);
});

runTests();

async function t(test) {
  const match = (process.argv[2] || '').toLowerCase();
  if (test.name.toLowerCase().indexOf(match) > -1) {
    if (match) console.log(`Testing ${test.name}`);
    return test()//.catch(test);
  }
}

async function runTests() {
  await exec(`rm -rf ${__dirname}/tmp`);
  await exec(`mkdir -p ${__dirname}/tmp`);

  await Promise.all([
    t(testAdd),
    t(testRemove),
    t(testUpgrade),
    t(testMerge),
    t(testSync),
    t(testCheck),
  ]);

  await exec(`rm -rf ${__dirname}/tmp`);
  console.log('All tests pass');
}

const testAdd = async () => {
  await exec(`cp -r ${__dirname}/fixtures/add ${__dirname}/tmp/add`);
  await add({
    roots: [`${__dirname}/tmp/add`],
    additions: [
      {name: 'has', range: '^1.0.3', type: 'dependencies'},
    ],
  });
  const meta = await read(`${__dirname}/tmp/add/package.json`, 'utf8');
  assert(meta.includes('"has": "^1.0.3"'));

  const lock = await read(`${__dirname}/tmp/add/yarn.lock`, 'utf8');
  assert(lock.includes('has@^1.0.3'));
  assert(lock.includes('function-bind@^1.1.1'));
};

const testRemove = async () => {
  await exec(`cp -r ${__dirname}/fixtures/remove ${__dirname}/tmp/remove`);
  await remove({
    roots: [`${__dirname}/tmp/remove`],
    removals: ['has'],
  });
  const meta = await read(`${__dirname}/tmp/remove/package.json`, 'utf8');
  assert(!meta.includes('"has": "^1.0.3"'));

  const lock = await read(`${__dirname}/tmp/remove/yarn.lock`, 'utf8');
  assert(!lock.includes('has@^1.0.3'));
  assert(!lock.includes('function-bind@^1.1.1'));
}

const testUpgrade = async () => {
  await exec(`cp -r ${__dirname}/fixtures/upgrade ${__dirname}/tmp/upgrade`);
  await upgrade({
    roots: [`${__dirname}/tmp/upgrade`],
    additions: [
      {name: 'has', range: '^1.0.3', type: 'dependencies'},
      {name: 'is-number', range: '^2.0.0', type: 'dependencies'},
    ],
    from: [{name: 'is-number', range: '^1.0.0', type: 'dependencies'}]
  });
  const meta = await read(`${__dirname}/tmp/upgrade/package.json`, 'utf8');
  assert(meta.includes('"has": "^1.0.3"'));
  assert(meta.includes('"is-number": "0.1.0"'), '`from` applies');

  const lock = await read(`${__dirname}/tmp/upgrade/yarn.lock`, 'utf8');
  assert(lock.includes('function-bind@^1.1.1'));
  assert(lock.includes('function-bind@npm:no-bugs@1.0.0'), 'alias works');
};

const testMerge = async () => {
  await exec(`cp -r ${__dirname}/fixtures/merge ${__dirname}/tmp/merge`);
  // $FlowFixMe
  /*
  await assert.rejects(
    merge({
      roots: [`${__dirname}/tmp/merge/a`, `${__dirname}/tmp/merge/b`],
      out: `${__dirname}/tmp/merge/out`,
      frozenLockfile: true,
    })
  );
  */

  await merge({
    roots: [`${__dirname}/tmp/merge/a`, `${__dirname}/tmp/merge/b`],
    out: `${__dirname}/tmp/merge/out`,
  });
  const aLock = await read(`${__dirname}/tmp/merge/a/yarn.lock`, 'utf8');
  assert(aLock.includes('version "1.0.3"'));

  const outLock = await read(`${__dirname}/tmp/merge/out/yarn.lock`, 'utf8');
  assert(outLock.includes('version "1.0.3"'));
};

const testSync = async () => {
  await exec(`cp -r ${__dirname}/fixtures/sync ${__dirname}/tmp/sync`);
  await sync({
    roots: [`${__dirname}/tmp/sync/a`, `${__dirname}/tmp/sync/b`],
  });
  const lock = await read(`${__dirname}/tmp/sync/a/yarn.lock`, 'utf8');
  assert(lock.includes('version "1.0.3"'));
}

const testCheck = async () => {
  await exec(`cp -r ${__dirname}/fixtures/check ${__dirname}/tmp/check`);
  const {has} = await check({
    roots: [`${__dirname}/tmp/check/a`, `${__dirname}/tmp/check/b`],
  });
  assert.equal(Object.keys(has).length, 2);
};
