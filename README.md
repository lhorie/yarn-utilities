# Yarn utils

[Why](#why) | [API](#api) | [CLI](#cli)

This package provides utilities to edit [yarn](https://yarnpkg.com/en/) lockfiles while maintaining dependency downloads to a minimum.

```
# Install
yarn global add yarn-utilities
```

---

### Why

At very large scale monorepos (500+ projects, 5000+ top level deps), managing NPM dependencies gets unwieldy. For example, a common strategy (used by yarn [workspaces](https://yarnpkg.com/lang/en/docs/workspaces/), [rush](https://rushjs.io/), etc) is to maintain a large global lock file, but if a developer needs to add a new dependency to only one project, running `yarn add` causes ALL dependencies to be downloaded (and scripts for rebuilding binary deps to run), even ones for unrelated projects.

When working from a development machine within a large scale monorepo, it's preferable to run yarn operations (e.g. adding a dep, upgrading) virtually, affecting only the desired lockfiles, and defer actual yarn install/test/etc heavy lifting to a cloud-based system such as bazel-buildfarm.

---

### API

```
const {add, upgrade, remove, optimize, sync, check, merge} = require('yarn-utilities');
```

#### add

Adds a dependency

- `type Add = ({roots: Array<string>, dep: string, version: string, type: string, tmp: string}) => Promise<void>`
  - roots - List of project folders
  - dep - Name of dependency
  - version - Version to install. Defaults to latest
  - type - whether to add as `dependencies`, `devDependencies`, `peerDependencies` or `optionalDependencies`. Defaults to `dependencies`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Default: `/tmp`

#### upgrade

Upgrades a dependency

- `type Upgrade = ({roots: Array<string>, dep: string, version: string, tmp: string}) => void`
  - roots - List of project folders
  - dep - Name of dependency
  - version - Version to install. Defaults to latest
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Default: `/tmp`

#### remove

Removes a dependency

- `type Remove = ({roots: Array<string>, dep: string}) => Promise<void>`
  - roots - List of project folders
  - dep - Name of dependency

#### optimize

Synchronize transitive deps across multiple projects and dedupe versions in matching ranges

- `type Optimize = ({roots: Array<string>}) => Promise<void>`
  - roots - List of project folders

#### sync

Ensure yarn.lock reflects package.json. Useful for updating the lockfile after package.json is manually edited

- `type Sync = ({roots: Array<string>, ignore: Array<string>, tmp: string}) => Promise<void>`
  - roots - List of project folders
  - ignore - List of project names to ignore
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Default: `/tmp`

#### check

Returns a report of what dependencies have multiple versions being used across projects

```js
// sample report
{
  "my-dependency": {
    "1.0.0": [
      "my-project-1",
      "my-project-2",
    ]
  }
}
```

- `type Check = ({roots: Array<string>}) => Promise<{[string]: {[string]: Array<string>}}>`
  - roots - List of project folders

#### merge

Merges dependencies from multiple projects' `package.json`/`yarn.lock` into a new folder

- `type Merge = ({roots: Array<string>, out: string, frozenLockfile: boolean}) => Promise<void>`
  - roots - List of project folders
  - out - Save resulting `package.json` and `yarn.lock` to this folder
  - frozenLockfile - If true and a lockfile change is required to dedupe transitive deps, throws an error. Useful for blocking CI in case of a commit with outdated lockfiles.

Note that if projects use different versions of the same top-level dependency, the output package.json will only list one of them (although yarn.lock will list all of them)

---

### CLI

CLI commands and args mirror the API docs above

#### yarn-utilities add

Adds a dependency

- `yarn-utilities add --roots [roots] --dep [dep] --version [version] --type [type] --tmp [tmp]`
  - roots - A pipe separated list of project folders
  - dep - Name of dependency
  - version - Version to install. Defaults to latest
  - type - whether to add as `dependencies`, `devDependencies`, `peerDependencies` or `optionalDependencies`. Defaults to `dependencies`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Default: `/tmp`

#### yarn-utilities upgrade

Upgrades a dependency

- `yarn-utilities upgrade --roots [roots] --dep [dep] --version [version] --tmp [tmp]`
  - roots - A pipe separated list of project folders
  - dep - Name of dependency
  - version - Version to install. Defaults to latest
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Default: `/tmp`

#### yarn-utilities remove

Removes a dependency

- `yarn-utilities remove --roots [roots] --dep [dep]`
  - roots - A pipe separated list of project folders
  - dep - Name of dependency

#### yarn-utilities optimize

Synchronize transitive deps across multiple projects and dedupe versions in matching ranges

- `yarn-utilities optimize --roots [roots]`
  - roots - A pipe separated list of project folders

#### yarn-utilities sync

Ensure yarn.lock reflects package.json. Useful for updating the lockfile after package.json is manually edited

- `yarn-utilities optimize --roots [roots] --ignore [ignore] --tmp [tmp]`
  - roots - A pipe separated list of project folders
  - ignore - A pipe separated list of project names to ignore
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Default: `/tmp`

#### yarn-utilities check

Prints to stdout a report of what dependencies have multiple versions being used across projects

```js
// sample report
{
  "my-dependency": {
    "1.0.0": [
      "my-project-1",
      "my-project-2",
    ]
  }
}
```

- `yarn-utilities check --roots [roots]`
  - roots - A pipe separated list of project folders

#### yarn-utilities merge

Merges dependencies from multiple projects' `package.json`/`yarn.lock` into a new folder

- `yarn-utilities merge --roots [roots] --out [out]`
  - roots - A pipe separated list of project folders
  - out - Save resulting `package.json` and `yarn.lock` to this folder

Note that if projects use different versions of the same top-level dependency, the output package.json will only list one of them (although yarn.lock will list all of them)