// @flow
const {validRange, satisfies, minVersion} = require('semver');

/*::
import type {Metadata} from './get-metadata.js';
import type {Entry} from './get-dep-entries.js';

export type Pruned = {
  pruned: Array<Metadata>,
  removed: Array<Entry>
}
export type PruneMetadataArgs = {
  metas: Array<Metadata>,
  removals: Array<string>,
  from?: Array<Entry>,
}
export type PruneMetadata = (PruneMetadataArgs) => Pruned;
*/
const pruneMetadata /*: PruneMetadata */ = ({metas, removals, from = []}) => {
  const removed = [];
  for (const {meta} of metas) {
    for (const removal of removals) {
      const types = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'resolutions',
      ];
      for (const type of types) {
        if (meta[type] && meta[type][removal]) {
          const range = meta[type][removal];

          const minimum = minVersion(range).version;
          const fromEntry = from.find(entry => entry.name === removal);
          const shouldRemove = fromEntry && validRange(fromEntry.range)
            ? satisfies(minimum, fromEntry.range)
            : true;
          if (shouldRemove) {
            // $FlowFixMe
            delete meta[type][removal];
            removed.push({type, name: removal, range});
          }
        }
      }
    }
  }
  return {pruned: metas, removed};
};

module.exports = {pruneMetadata};