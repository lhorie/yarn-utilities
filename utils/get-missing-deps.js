// @flow
const {getDepEntries} = require('./get-dep-entries.js');
const {findLockfileEntries} = require('./find-lockfile-entries.js');

/*::
import type {Metadata} from './get-metadata.js';
import type {Entry} from './get-dep-entries.js';

export type PackageDep = {
  dir: string,
  deps: Array<Entry>,
};
export type GetMissingDepsArgs = {
  metas: Array<Metadata>,
};
export type GetMissingDeps = (GetMissingDepsArgs) => Array<PackageDep>;
*/
const getMissingDeps /*: GetMissingDeps */ = ({metas}) => {
  const missing = {};
  for (const {dir, meta} of metas) {
    for (const {name, range, type} of getDepEntries({meta})) {
      const entries = findLockfileEntries({name, range, metas});
      if (entries.length === 0) {
        if (!missing[dir]) missing[dir] = [];

        const exists = missing[dir].find(dep => {
          return dep.name === name && dep.range === range;
        });
        if (!exists) {
          missing[dir].push({name, range, type});
        }
      }
    }
  }
  return normalize(missing);
}

const normalize = map => {
  const deps = [];
  for (const dir in map) {
    deps.push({dir, deps: map[dir]});
  }
  return deps;
}

module.exports = {getMissingDeps};
