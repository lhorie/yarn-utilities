// @flow
const {getDepEntries} = require('./get-dep-entries.js');

/*::
import type {Metadata} from './get-metadata.js';

export type AugmentMetadataArgs = {
  targets: Array<Metadata>,
  sources: Array<Metadata>,
}
export type AugmentMetadata = (AugmentMetadataArgs) => Array<Metadata>;
*/
const augmentMetadata /*: AugmentMetadata */ = ({targets, sources}) => {
  const map = {};
  for (const target of targets) map[target.dir] = target;
  for (const source of sources) {
    const targetMeta = map[source.dir].meta;
    const meta = source.meta;
    Object.assign(map[source.dir].lockfile, source.lockfile);
    for (const {name, range, type} of getDepEntries({meta})) {
      if (!targetMeta[type]) targetMeta[type] = {};
      targetMeta[type][name] = range;
    }
  }
  return targets;
};

module.exports = {augmentMetadata};
