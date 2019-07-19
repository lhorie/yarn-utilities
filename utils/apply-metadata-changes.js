// @flow
const {getMissingDeps} = require('./get-missing-deps.js');
const {getAdditionalDeps} = require('./get-additional-deps.js');
const {downloadMetadata} = require('./download-metadata.js');
const {augmentMetadata} = require('./augment-metadata.js');
const {pruneMetadata} = require('./prune-metadata.js');
const {updateMetadata} = require('./update-metadata.js');
const {diffMetadata} = require('../utils/diff-metadata.js');
const {throwEditError} = require('./throw-edit-error.js');

/*::
import type {Metadata} from './get-metadata.js';
import type {Entry} from './get-dep-entries.js';

export type ApplyMetadataChangesArgs = {
  metas: Array<Metadata>,
  roots: Array<string>,
  additions?: Array<Entry>,
  removals?: Array<string>,
  from?: Array<Entry>,
  ignore?: Array<string>,
  frozenLockfile?: boolean,
  tmp?: string,
}
export type ApplyMetadataChanges = (ApplyMetadataChangesArgs) => Promise<Array<Metadata>>;
*/
const applyMetadataChanges /*: ApplyMetadataChanges */ = async ({
  metas,
  roots,
  additions = [],
  removals = [],
  from = [],
  ignore = [],
  frozenLockfile = false,
  tmp = '/tmp',
}) => {
  const {pruned, removed} = pruneMetadata({metas, removals, from});
  const deps = [
    ...getMissingDeps({metas: pruned}),
    ...getAdditionalDeps({roots, additions, removed}),
  ];
  const added = await downloadMetadata({deps, ignore, frozenLockfile, tmp});
  const augmented = augmentMetadata({targets: metas, sources: added});
  const updated = updateMetadata({metas: augmented});
  if (frozenLockfile && !diffMetadata(metas, updated)) throwEditError();
  return updated;
};

module.exports = {applyMetadataChanges};
