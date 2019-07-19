// @flow
const {getMetadata} = require('../utils/get-metadata.js');
const {applyMetadataChanges} = require('../utils/apply-metadata-changes.js');
const {writeMetadata} = require('../utils/write-metadata.js');

/*::
export type RemoveArgs = {
  roots: Array<string>,
  removals: Array<string>,
  ignore?: Array<string>,
  tmp?: string,
}
export type Remove = (RemoveArgs) => Promise<void>;
*/
const remove /*: Remove */ = async ({roots, removals, ignore, tmp}) => {
  const metas = await getMetadata({roots});
  const updated = await applyMetadataChanges({
    metas,
    roots,
    removals,
    ignore,
    tmp,
  });
  await writeMetadata({metas: updated});
};

module.exports = {remove};