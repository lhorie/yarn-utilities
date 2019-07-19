// @flow
const {getMetadata} = require('../utils/get-metadata.js');
const {applyMetadataChanges} = require('../utils/apply-metadata-changes.js');
const {writeMetadata} = require('../utils/write-metadata.js');

/*::
export type SyncArgs = {
  roots: Array<string>,
  ignore?: Array<string>,
  tmp?: string,
};
export type Sync = (SyncArgs) => Promise<void>;
*/
const sync /*: Sync */ = async ({
  roots,
  ignore = [],
  tmp = '/tmp',
}) => {
  const metas = await getMetadata({roots});
  const updated = await applyMetadataChanges({
    metas,
    roots,
    ignore,
    tmp,
  });
  await writeMetadata({metas: updated});
}

module.exports = {sync};