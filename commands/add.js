// @flow
const {getMetadata} = require('../utils/get-metadata.js');
const {applyMetadataChanges} = require('../utils/apply-metadata-changes.js');
const {writeMetadata} = require('../utils/write-metadata.js');

/*::
import type {Entry} from '../utils/get-dep-entries.js';

export type AddArgs = {
  roots: Array<string>,
  additions: Array<Entry>,
  ignore?: Array<string>,
  tmp?: string,
}
export type Add = (AddArgs) => Promise<void>;
*/
const add /*: Add */ = async ({
  roots,
  additions,
  ignore = [],
  tmp = '/tmp',
}) => {
  const metas = await getMetadata({roots});
  const updated = await applyMetadataChanges({
    metas,
    roots,
    additions,
    ignore,
    tmp,
  });
  await writeMetadata({metas: updated});
};

module.exports = {add};