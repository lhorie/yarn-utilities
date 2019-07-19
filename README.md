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

```js
const {add, upgrade, remove, sync, check, merge} = require('yarn-utilities');
```

All commands except `check` will generate up-to-date lockfiles. This means all of those commands may download packages that are not yet listed in the lockfiles.

#### add

Adds dependencies

- ```js
  type Add = ({
    roots: Array<string>,
    additions: Array<Entry>,
    ignore?: Array<string>,
    tmp?: string
  }) => Promise<void>

  type Entry = {name: string, range: string, type: string}
  ```
  - roots - List of project folders
  - additions - List of dependencies to add
    - name - The name of each dependency
    - range - A semver version range. If the semver version range is omitted, it defaults to the latest version
    - type - `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies` or `resolutions`. Defaults to `dependencies`
  - ignore - Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `[]`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### upgrade

Upgrades dependencies

- ```js
  type Upgrade = ({
    roots: Array<string>,
    additions: Array<Entry>,
    from?: Array<Entry>,
    ignore?: Array<string>,
    tmp?: string,
  }) => Promise<void>

  type Entry = {name: string, range: string, type: string}
  ```
  - roots - List of project folders
  - additions - List of dependencies to add
    - name - The name of each dependency
    - range - A semver version range. If the semver version range is omitted, it defaults to the latest version
    - type - `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies` or `resolutions`. Defaults to `dependencies`
  - from - Deps in this list are only upgraded if their current version satisfies the specified range. Defaults to `[]`
  - ignore - Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `[]`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### remove

Removes a dependency

- ```js
  type Remove = ({
    roots: Array<string>,
    removals: Array<string>,
    ignore?: Array<string>,
    tmp?: string,
  }) => Promise<void>;
  ```
  - roots - List of project folders
  - removals - List of dependency names to remove
  - ignore - Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `[]`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### sync

Ensure yarn.lock reflects package.json. Useful for updating the lockfile after package.json is manually edited.

- ```js
  type Sync = ({
    roots: Array<string>,
    ignore?: Array<string>,
    tmp?: string,
  }) => Promise<void>;
  ```
  - roots - List of project folders
  - ignore - Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `[]`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### merge

Merges dependencies from multiple projects' `package.json`/`yarn.lock` into a new folder

- ```js
  export type Merge = ({
    roots: Array<string>,
    out: string,
    ignore?: Array<string>,
    frozenLockfile?: boolean,
    tmp?: string,
  }) => Promise<void>;
  ```
  - roots - List of project folders
  - out - Save resulting `package.json` and `yarn.lock` to this folder
  - ignore - Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `[]`
  - frozenLockfile - If true and a lockfile change is required, throws an error. Useful for blocking CI in case of a commit with outdated lockfiles. Defaults to `false`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

Note that if projects use different versions of the same top-level dependency, the output package.json will only list one of them (although yarn.lock will list all of them)

#### check

Returns a report of what dependencies have multiple versions being used across projects

- ```js
  type Check = ({
    roots: Array<string>,
  }) => Report;

  type Report = {
    [string]: {
      [string]: Array<string>
    }
  };
  ```
  - roots - List of project folders

Reports look like this:

```json
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

---

### CLI

CLI commands and args mirror the API docs above

All commands except `check` will generate up-to-date lockfiles. This means all of those commands may download packages that are not yet listed in the lockfiles.

#### yarn-utilities add

Adds a dependency

- `yarn-utilities add [additions] --roots [roots] --type [type] --ignore [ignore] --tmp [tmp]`
  - additions - A pipe separated list of dependencies (in `foo@^1.0.0` format). If the semver version range is omitted, it defaults to the latest version
  - roots - A pipe separated list of project folders
  - type - `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies` or `resolutions`. Defaults to `dependencies`
  - ignore - A pipe separated list of dependency names. Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `''`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### yarn-utilities upgrade

Upgrades a dependency

- `yarn-utilities upgrade [upgrades] --roots [roots] --from [from] --ignore [ignore] --tmp [tmp]`
  - upgrades - A pipe separated list of dependencies (in `foo@^1.0.0` format). If the semver version range is omitted, it defaults to the latest version
  - roots - A pipe separated list of project folders
  - from - A pipe separated list of dependency names. Deps in this list are only upgraded if their current version satisfies the specified range. Defaults to `''`
  - ignore - A pipe separated list of dependency names. Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `''`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### yarn-utilities remove

Removes a dependency

- `yarn-utilities remove [removals] --roots [roots] --ignore [ignore] --tmp [tmp]`
  - removals - A pipe separated list of dependency names to remove
  - roots - A pipe separated list of project folders
  - ignore - A pipe separated list of dependency names. Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `''`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### yarn-utilities sync

Ensure yarn.lock reflects package.json. Useful for updating the lockfile after package.json is manually edited

- `yarn-utilities sync --roots [roots] --ignore [ignore] --tmp [tmp]`
  - roots - A pipe separated list of project folders
  - ignore - A pipe separated list of dependency names. Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `''`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

#### yarn-utilities merge

Merges dependencies from multiple projects' `package.json`/`yarn.lock` into a new folder

- `yarn-utilities merge --roots [roots] --out [out] --ignore [ignore] --tmp [tmp]`
  - roots - A pipe separated list of project folders
  - out - Save resulting `package.json` and `yarn.lock` to this folder
  - ignore - A pipe separated list of dependency names. Deps in package.json whose names are included in this list won't be included in the updated yarn.lock. Defaults to `''`
  - tmp - A folder to use as a tmp directory for newly downloaded packages. Note that this folder will be deleted when the function ends. Defaults to `/tmp`

Note that if projects use different versions of the same top-level dependency, the output package.json will only list one of them (although yarn.lock will list all of them)

#### yarn-utilities check

Prints to stdout a report of what dependencies have multiple versions being used across projects

- `yarn-utilities check --roots [roots]`
  - roots - A pipe separated list of project folders

Reports look like this:

```json
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
