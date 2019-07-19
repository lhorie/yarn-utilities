// @flow

/*::
export type Entry = {
  name: string,
  range: string,
}
export type ParseLockfileEntryNameArgs = {
  key: string,
}
export type ParseLockfileEntryName = (ParseLockfileEntryNameArgs) => Entry;
*/
const parseLockfileEntryName /*: ParseLockfileEntryName */ = ({key}) => {
  const [, name, range] = key.match(/(.+?)@(.+)/) || [];
  return {name, range};
};

module.exports = {parseLockfileEntryName};
