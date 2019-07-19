// @flow

/*::
import type {Metadata} from './get-metadata.js';

export type DiffMetadata = (Array<Metadata>, Array<Metadata>) => boolean;
*/
const diffMetadata /*: DiffMetadata */ = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const old = hashLockfile(a[i].lockfile);
    const curr = hashLockfile(b[i].lockfile);
    if (old !== curr) return false;
  }
  return true;
}

const hashLockfile = lockfile => {
  const object = {};
  Object.keys(lockfile).sort().forEach(key => {
    object[key] = lockfile[key].version;
  });
  return JSON.stringify(object);
}

module.exports = {diffMetadata};