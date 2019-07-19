// @flow

/*::
export type ThrowEditError = () => void;
*/
const throwEditError /*: ThrowEditError */ = () => {
  throw new Error(
    `Updating lockfile is not allowed with frozenLockfile. ` +
    `This error is most likely happening if you have committed ` +
    `out-of-date lockfiles and tried to install deps in CI. ` +
    `Install your deps again locally.`
  );
}

module.exports = {throwEditError};