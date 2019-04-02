const assert = require('assert');
const {execSync: exec} = require('child_process');
const {writeFileSync: write, readFileSync: read} = require('fs');
const {add, upgrade, remove, optimize, check, merge} = require('../index.js');

exec(`rm -rf ${__dirname}/tmp && mkdir -p ${__dirname}/tmp`);

// add works
exec(`mkdir -p ${__dirname}/tmp/add`);
write(`${__dirname}/tmp/add/package.json`, '{}');
write(`${__dirname}/tmp/add/yarn.lock`, '');
add([`${__dirname}/tmp/add`], 'has', '1.0.3');
assert(read(`${__dirname}/tmp/add/package.json`, 'utf8').includes('"has": "1.0.3"'))
assert(read(`${__dirname}/tmp/add/yarn.lock`, 'utf8').includes('function-bind@^1.1.1'))

// upgrade works
exec(`mkdir -p ${__dirname}/tmp/upgrade`);
write(`${__dirname}/tmp/upgrade/package.json`, '{"dependencies": {"has": "0.0.1"}}');
write(`${__dirname}/tmp/upgrade/yarn.lock`, '');
upgrade([`${__dirname}/tmp/add`], 'has', '1.0.3');
assert(read(`${__dirname}/tmp/add/package.json`, 'utf8').includes('"has": "1.0.3"'))
assert(read(`${__dirname}/tmp/add/yarn.lock`, 'utf8').includes('function-bind@^1.1.1'))

// remove works
exec(`cp -r ${__dirname}/fixtures/remove ${__dirname}/tmp/remove`);
remove([`${__dirname}/tmp/remove`], 'has');
assert(read(`${__dirname}/tmp/remove/package.json`, 'utf8').includes('{}'));
assert(read(`${__dirname}/tmp/remove/yarn.lock`, 'utf8').includes('function-bind') === false);

// optimize works
exec(`cp -r ${__dirname}/fixtures/sync ${__dirname}/tmp/sync`);
optimize([`${__dirname}/tmp/sync`]);
assert(read(`${__dirname}/tmp/sync/b/yarn.lock`, 'utf8').includes('function-bind@^1.1.2'));
assert(read(`${__dirname}/tmp/sync/b/yarn.lock`, 'utf8').includes('function-bind@^1.1.1') === false);

// optimize's deduping works
exec(`cp -r ${__dirname}/fixtures/dedupe ${__dirname}/tmp/dedupe`);
optimize([`${__dirname}/tmp/dedupe`]);
assert(read(`${__dirname}/tmp/dedupe/a/yarn.lock`, 'utf8').includes('function-bind@^1.1.1, function-bind@^1.1.2'));

// check works
exec(`cp -r ${__dirname}/fixtures/check ${__dirname}/tmp/check`);
const {has} = check([`${__dirname}/tmp/check`]);
assert.equal(Object.keys(has).length, 2);

// merge works
exec(`cp -r ${__dirname}/fixtures/merge ${__dirname}/tmp/merge && rm -rf ${__dirname}/tmp/merge/merged`);
merge([`${__dirname}/tmp/merge`], `${__dirname}/tmp/merge/merged`);
assert(read(`${__dirname}/tmp/merge/merged/yarn.lock`, 'utf8').includes('function-bind@^1.1.1'));
assert(read(`${__dirname}/tmp/merge/merged/yarn.lock`, 'utf8').includes('no-bugs@1.0.0'));

exec(`rm -rf ${__dirname}/tmp`);
console.log('Tests passed');
