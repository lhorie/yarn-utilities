// @flow
const {getDepEntries} = require('./get-dep-entries.js');
const {findLockfileEntries} = require('./find-lockfile-entries.js');

/*::
import type {Metadata} from './get-metadata.js';

export type UpdateMetadataArgs = {
  metas: Array<Metadata>,
};
export type UpdateMetadata = (UpdateMetadataArgs) => Array<Metadata>;
*/
const updateMetadata /*: UpdateMetadata */ = ({metas}) => {
  const updated = [];
  for (const {dir, meta} of metas) {
    const graph = {};
    for (const {name, range} of getDepEntries({meta})) {
      const entries = findLockfileEntries({name, range, metas});
      if (entries.length > 0) {
        const {lockfile, key} = entries.pop(); // last one is best version
        graph[`${name}@${range}`] = lockfile[key];
        Object.assign(graph, getGraph({lockfile, key, metas}));
      }
    }
    updated.push({dir, lockfile: graph, meta});
  }
  return updated;
}

const getGraph = ({lockfile, key, metas}) => {
  const graph = {};
  for (const dep in lockfile[key].dependencies) {
    const range = lockfile[key].dependencies[dep];
    const entries = findLockfileEntries({name: dep, range, metas});
    if (entries.length > 0) {
      const entry = entries.pop(); // last one is best version
      graph[`${dep}@${range}`] = entry.lockfile[entry.key];
      Object.assign(graph, getGraph({lockfile, key: entry.key, metas}));
    }
  }
  return graph;
}

module.exports = {updateMetadata};