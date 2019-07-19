// @flow
/*::
import type {Entry} from './get-dep-entries.js';
import type {PackageDep} from './get-missing-deps.js';

export type GetAdditionalDepsArgs = {
  roots: Array<string>,
  additions: Array<Entry>,
  removed: Array<Entry>,
}
export type GetAdditionalDeps = (GetAdditionalDepsArgs) => Array<PackageDep>
*/
const getAdditionalDeps /*: GetAdditionalDeps */ = ({
  roots,
  additions,
  removed,
}) => {
  return roots.map(dir => {
    const deps = [];
    for (const addition of additions) {
      // check if it was previously removed
      // if so, this is an upgrade, and additions must match removal types
      const found = removed.filter(removal => removal.name === addition.name);
      if (found.length > 0) {
        for (const item of found) {
          deps.push({...addition, type: item.type});
        }
      } else if (removed.length === 0) {
        deps.push(addition);
      }
    }
    return {dir, deps};
  });
};

module.exports = {getAdditionalDeps};
