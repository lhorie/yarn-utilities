// @flow
const {getMetadata} = require('../utils/get-metadata.js');
const {applyMetadataChanges} = require('../utils/apply-metadata-changes.js');
const {writeMetadata} = require('../utils/write-metadata.js');

/*::
import type {Entry} from '../utils/get-dep-entries.js';

export type UpgradeArgs = {
  roots: Array<string>,
  additions: Array<Entry>,
  from?: Array<Entry>,
  ignore?: Array<string>,
  tmp?: string,
}
export type Upgrade = (UpgradeArgs) => Promise<void>;
*/
const upgrade /*: Upgrade */ = async ({
  roots,
  additions,
  from,
  ignore,
  tmp,
}) => {
  const removals = additions.map(addition => addition.name);
  const metas = await getMetadata({roots});
  const updated = await applyMetadataChanges({
    metas,
    roots,
    additions,
    removals,
    from,
    ignore,
    tmp,
  });
  await writeMetadata({metas: updated});
};

module.exports = {upgrade};