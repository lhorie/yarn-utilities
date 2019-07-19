// @flow
const {validRange, satisfies, compare} = require('semver');
const {parseLockfileEntryName} = require('./parse-lockfile-entry-name.js');

/*::
import type {Metadata, Lockfile} from './get-metadata.js';

export type LockfileEntryPointer = {
  lockfile: Lockfile,
  key: string,
  isAlias: boolean,
}
export type FindLockfileEntriesArgs = {
  name: string,
  range: string,
  metas: Array<Metadata>,
};
export type FindLockfileEntries = (FindLockfileEntriesArgs) => Array<LockfileEntryPointer>;
*/
const findLockfileEntries /*: FindLockfileEntries */ = ({
  name,
  range,
  metas,
}) => {
  const pointers = new Set();
  for (const {lockfile} of metas) {
    for (const key in lockfile) {
      const version = lockfile[key].version;
      const entry = parseLockfileEntryName({key});
      const isAlias = Boolean(validRange(entry.range));
      const isSamePackage = entry.name === name;
      const isInRange = !isAlias || satisfies(version, range);
      if (isSamePackage && isInRange) {
        pointers.add({lockfile, key, isAlias});
      }
    }
  }
  return [...pointers].sort((a, b) => {
    // if one of them is aliased, prefer it
    const override = Number(a.isAlias) - Number(b.isAlias);
    // otherwise prefer the highest version
    const comparison = compare(
      a.lockfile[a.key].version,
      b.lockfile[b.key].version
    );
    return override || comparison;
  });
};

module.exports = {findLockfileEntries};
