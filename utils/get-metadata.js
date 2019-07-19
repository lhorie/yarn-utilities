// @flow
const {parse} = require('@yarnpkg/lockfile');
const {read} = require('./node-helpers.js');

/*::
export type Metadata = {
  dir: string,
  meta: PackageJson,
  lockfile: Lockfile,
};
export type PackageJson = {
  name: string,
  version: string,
  dependencies?: {[string]: string},
  devDependencies?: {[string]: string},
  peerDependencies?: {[string]: string},
  optionalDependencies?: {[string]: string},
  resolutions?: {[string]: string},
};
export type Lockfile = {
  [string]: LockfileEntry,
};
export type LockfileEntry = {
  version: string,
  resolved: string,
  dependencies?: {[string]: string},
};
export type GetMetadataArgs = {
  roots: Array<string>
};
export type GetMetadata = (GetMetadataArgs) => Promise<Array<Metadata>>;
*/
const getMetadata /*: GetMetadata */ = async ({roots}) => {
  return Promise.all(
    roots.map(async root => {
      const meta = await read(`${root}/package.json`, 'utf8').catch(() => '{}');
      const data = await read(`${root}/yarn.lock`, 'utf8').catch(() => '');
      return {
        dir: root,
        meta: JSON.parse(meta),
        lockfile: parse(data).object,
      }
    })
  );
}

module.exports = {getMetadata};