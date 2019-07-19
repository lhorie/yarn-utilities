// @flow
const {stringify} = require('@yarnpkg/lockfile');
const {exec, write} = require('./node-helpers.js');

/*::
import type {Metadata} from './get-metadata.js';

export type WriteMetadataArgs = {
  metas: Array<Metadata>,
}
export type WriteMetadata = (WriteMetadataArgs) => Promise<void>
*/
const writeMetadata /*: WriteMetadata */ = async ({metas}) => {
  await Promise.all(
    metas.map(async ({dir, meta, lockfile}) => {
      await exec(`mkdir -p ${dir}`);
      await write(`${dir}/package.json`, JSON.stringify(meta, null, 2), 'utf8');
      await write(`${dir}/yarn.lock`, stringify(lockfile), 'utf8');
    })
  );
}

module.exports = {writeMetadata};