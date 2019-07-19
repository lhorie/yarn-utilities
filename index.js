// @flow
const {parse} = require('./utils/parse-argv.js');
const {cli} = require('./utils/cli.js');
const {add} = require('./commands/add.js');
const {remove} = require('./commands/remove.js');
const {upgrade} = require('./commands/upgrade.js');
const {sync} = require('./commands/sync.js');
const {merge} = require('./commands/merge.js');
const {check} = require('./commands/check.js');
const {version} = require('./package.json');

/*::
export type RunCLI = (Array<string>) => Promise<void>;
*/
const runCLI /*: RunCLI */ = async argv => {
  const [command, ...rest] = argv;
  const args = parse(rest);
  await cli(
    command,
    args,
    {
      version: [`Display the version number`, async () => console.log(version)],
      add: [
        `Adds dependencies

        [additions]          pipe separated list of deps (in foo@^0.0.0 format)
        --roots [roots]      pipe separated list of dirs
        --type               dependencies or devDependencies
        --ignore [ignore]    pipe separated list of package names to ignore
        --tmp [tmp]          folder to download temp files to`,
        async ({roots, name, type, ignore, tmp}) => add({
          roots: parseDirs(roots),
          additions: parseEntries(name, type),
          ignore: parseList(ignore),
          tmp,
        }),
      ],
      remove: [
        `Removes dependencies

        [removals]           pipe separated list of package names
        --roots [roots]      pipe separated list of dirs
        --ignore [ignore]    pipe separated list of package names to ignore
        --tmp [tmp]          folder to download temp files to`,
        async ({roots, name, ignore, tmp}) => remove({
          roots: parseDirs(roots),
          removals: parseList(name),
          ignore: parseList(ignore),
          tmp,
        }),
      ],
      upgrade: [
        `Upgrades dependencies

        [upgrades]           pipe separated list of deps (in foo@^0.0.0 format)
        --roots [roots]      pipe separated list of dirs
        --from [from]        pipe separated list of dep ranges (in foo@^1.0.0) to which upgrade should apply
        --ignore [ignore]    pipe separated list of package names to ignore
        --tmp [tmp]          folder to download temp files to`,
        async ({roots, name, from, ignore, tmp}) => upgrade({
          roots: parseDirs(roots),
          additions: parseEntries(name),
          from: parseEntries(from),
          ignore: parseList(ignore),
          tmp,
        }),
      ],
      sync: [
        `Dedupes dependencies within the same semver range

        --roots [roots]      pipe separated list of dirs
        --ignore [ignore]    pipe separated list of package names to ignore
        --tmp [tmp]          folder to download temp files to`,
        async ({roots, ignore, tmp}) => sync({
          roots: parseDirs(roots),
          ignore: parseList(ignore),
          tmp,
        }),
      ],
      merge: [
        `Merge lockfiles

        --roots [roots]      pipe separated list of dirs
        --out [out]          output merged lockfile to this dir
        --ignore [ignore]    pipe separated list of package names to ignore
        --tmp [tmp]          folder to download temp files to`,
        async ({roots, out, ignore, tmp}) => merge({
          roots: parseDirs(roots),
          out: `${process.cwd()}/${out}`,
          ignore: parseList(ignore),
          tmp,
        }),
      ],
      check: [
        `Check if top-level dep versions match

        --roots [roots]      pipe separated list of dirs`,
        async ({roots}) => {
          const report = check({
            roots: parseDirs(roots),
          });
          console.log(report);
        },
      ],
    },
    async () => {}
  );
}

const parseDirs = string => parseList(string).map(d => `${process.cwd()}/${d}`);

const parseEntries = (additions, type = 'dependencies') => {
  return additions.split('|').map(a => {
    const [name, range] = a.split('@');
    return {name, range, type};
  })
};

const parseList = (string = '') => string.split('|').filter(Boolean);

module.exports = {runCLI, add, remove, upgrade, sync, merge, check};
