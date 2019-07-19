// @flow
const {write, exec} = require('./node-helpers.js');
const {getMetadata} = require('./get-metadata.js');
const {throwEditError} = require('./throw-edit-error.js');

/*::
import type {PackageDep} from './get-missing-deps.js';
import type {Entry} from './get-dep-entries.js';
import type {Metadata} from './get-metadata.js';

export type AddDepsArgs = {
  deps: Array<PackageDep>,
  from?: Array<Entry>,
  ignore?: Array<string>,
  frozenLockfile?: boolean,
  tmp?: string,
};
export type AddDeps = (AddDepsArgs) => Promise<Array<Metadata>>;
*/
const downloadMetadata /*: AddDeps */ = async ({
  deps,
  ignore = [],
  frozenLockfile = false,
  tmp = '/tmp'
}) => {
  const map = {};
  const roots = [];
  for (const pkg of deps) {
    const cwd = `${tmp}/yarn-utils-${Math.random() * 1e17}`;
    const meta = {};

    if (frozenLockfile && pkg.deps.length > 0) throwEditError();

    await Promise.all(
      pkg.deps.map(async dep => {
        if (!dep.range) {
          const info = await exec(`yarn info ${dep.name} version --json`, {
            env: process.env,
            cwd,
          });
          const {data} = JSON.parse(info);
          dep.range = `^${data}`; // eslint-disable-line require-atomic-updates
        }
      })
    );

    for (const dep of pkg.deps) {
      const shouldIgnore = ignore.includes(dep.name);
      if (!shouldIgnore) {
        if (!meta[dep.type]) meta[dep.type] = {};
        meta[dep.type][dep.name] = dep.range;
      }
    }

    await exec(`mkdir -p ${cwd}`);
    await write(`${cwd}/package.json`, JSON.stringify(meta, null, 2), 'utf8');
    await exec(`yarn --ignore-scripts --ignore-engines`, {
      env: process.env,
      cwd,
    });
    map[cwd] = pkg.dir;
    roots.push(cwd);
  }
  const downloaded = /*:: await */ await getMetadata({roots});
  downloaded.forEach(meta => meta.dir = map[meta.dir]);
  return downloaded;
};

module.exports = {downloadMetadata};
