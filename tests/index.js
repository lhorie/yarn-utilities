const assert = require('assert');
const proc = require('child_process');
const {promisify} = require('util');
const {writeFile, readFile} = require('fs');
const {add, upgrade, remove, optimize, check, merge} = require('../index.js');

const exec = cmd => {
  return new Promise((resolve, reject) => {
    proc.exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    })
  });
};
const read = promisify(readFile);
const write = promisify(writeFile);

run();

async function run() {

  await exec(`rm -rf ${__dirname}/tmp && mkdir -p ${__dirname}/tmp`);

  // add works
  await exec(`mkdir -p ${__dirname}/tmp/add`);
  await write(`${__dirname}/tmp/add/package.json`, '{}');
  await write(`${__dirname}/tmp/add/yarn.lock`, '');
  await add([`${__dirname}/tmp/add`], 'has', '1.0.3');
  assert((await read(`${__dirname}/tmp/add/package.json`, 'utf8')).includes('"has": "1.0.3"'))
  assert((await read(`${__dirname}/tmp/add/yarn.lock`, 'utf8')).includes('function-bind@^1.1.1'))

  // upgrade works
  await exec(`mkdir -p ${__dirname}/tmp/upgrade`);
  await write(`${__dirname}/tmp/upgrade/package.json`, '{"dependencies": {"has": "0.0.1"}}');
  await write(`${__dirname}/tmp/upgrade/yarn.lock`, '');
  await upgrade([`${__dirname}/tmp/add`], 'has', '1.0.3');
  assert((await read(`${__dirname}/tmp/add/package.json`, 'utf8')).includes('"has": "1.0.3"'))
  assert((await read(`${__dirname}/tmp/add/yarn.lock`, 'utf8')).includes('function-bind@^1.1.1'))

  // remove works
  await exec(`cp -r ${__dirname}/fixtures/remove ${__dirname}/tmp/remove`);
  await remove([`${__dirname}/tmp/remove`], 'has');
  assert((await read(`${__dirname}/tmp/remove/package.json`, 'utf8')).includes('{}'));
  assert((await read(`${__dirname}/tmp/remove/yarn.lock`, 'utf8')).includes('function-bind') === false);

  // optimize works
  await exec(`cp -r ${__dirname}/fixtures/sync ${__dirname}/tmp/sync`);
  await optimize([`${__dirname}/tmp/sync/a`, `${__dirname}/tmp/sync/b`]);
  assert((await read(`${__dirname}/tmp/sync/b/yarn.lock`, 'utf8')).includes('function-bind@^1.1.2'));
  assert((await read(`${__dirname}/tmp/sync/b/yarn.lock`, 'utf8')).includes('function-bind@^1.1.1') === false);

  // optimize's deduping works
  await exec(`cp -r ${__dirname}/fixtures/dedupe ${__dirname}/tmp/dedupe`);
  await optimize([`${__dirname}/tmp/dedupe/a`]);
  assert((await read(`${__dirname}/tmp/dedupe/a/yarn.lock`, 'utf8')).includes('function-bind@^1.1.1, function-bind@^1.1.2'));

  // check works
  await exec(`cp -r ${__dirname}/fixtures/check ${__dirname}/tmp/check`);
  const {has} = await check([`${__dirname}/tmp/check/a`, `${__dirname}/tmp/check/b`]);
  assert.equal(Object.keys(has).length, 2);

  // merge works
  await exec(`cp -r ${__dirname}/fixtures/merge ${__dirname}/tmp/merge && rm -rf ${__dirname}/tmp/merge/merged`);
  await merge([`${__dirname}/tmp/merge/a`, `${__dirname}/tmp/merge/b`], `${__dirname}/tmp/merge/merged`);
  assert((await read(`${__dirname}/tmp/merge/merged/yarn.lock`, 'utf8')).includes('function-bind@^1.1.1'));
  assert((await read(`${__dirname}/tmp/merge/merged/yarn.lock`, 'utf8')).includes('no-bugs@1.0.0'));

  await exec(`rm -rf ${__dirname}/tmp`);
  console.log('Tests passed');

}