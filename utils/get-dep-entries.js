// @flow

/*::
import type {PackageJson} from './get-metadata.js';

export type GetDepEntriesArgs = {
  meta: PackageJson,
}
export type Entry = {
  name: string,
  range: string,
  type: string,
};
export type GetDepEntries = (GetDepEntriesArgs) => Array<Entry>
*/
const getDepEntries /*: GetDepEntries */ = ({meta}) => {
  const entries = [];
  const types = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
    'resolutions',
  ];
  for (const type of types) {
    for (const name in meta[type]) {
      entries.push({name, range: meta[type][name], type});
    }
  }
  return entries;
}

module.exports = {getDepEntries};
