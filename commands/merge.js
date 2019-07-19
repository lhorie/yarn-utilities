// @flow
const {getMetadata} = require('../utils/get-metadata.js');
const {applyMetadataChanges} = require('../utils/apply-metadata-changes.js');
const {augmentMetadata} = require('../utils/augment-metadata.js');
const {updateMetadata} = require('../utils/update-metadata.js');
const {diffMetadata} = require('../utils/diff-metadata.js');
const {writeMetadata} = require('../utils/write-metadata.js');
const {throwEditError} = require('../utils/throw-edit-error.js');

/*::
export type MergeArgs = {
  roots: Array<string>,
  out: string,
  ignore?: Array<string>,
  frozenLockfile?: boolean,
  tmp?: string,
};
export type Merge = (MergeArgs) => Promise<void>;
*/
const merge /*: Merge */ = async ({
  roots,
  out,
  ignore = [],
  frozenLockfile = false,
  tmp = '/tmp',
}) => {
  const metas = await getMetadata({roots});
  const changed = await applyMetadataChanges({
    metas,
    roots,
    ignore,
    frozenLockfile,
    tmp,
  });
  const output = /*:: await */ await getMetadata({roots: [out]});
  const augmented = changed.reduce((output, meta) => {
    meta.dir = out;
    return augmentMetadata({targets: output, sources: [meta]});
  }, output);
  const updated = updateMetadata({metas: augmented});
  if (frozenLockfile && !diffMetadata(output, updated)) throwEditError();
  else await writeMetadata({metas: updated});
};

module.exports = {merge};
