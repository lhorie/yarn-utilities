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
const {add, upgrade, remove, optimize, check, merge} = require('yarn-utilities');
```

#### add

Adds a dependency

- `type Add = (roots: Array<string>, dep: string, version: string, type: string) => void`
  - roots - List of projects to add dep to
  - dep - Name of dependency
  - version - Version to install. Defaults to latest
  - type - whether to add as `dependencies`, `devDependencies`, `peerDependencies` or `optionalDependencies`. Defaults to `dependencies`

#### upgrade

Upgrades a dependency

- `type Upgrade = (roots: Array<string>, dep: string, version: string) => void`
  - roots - List of projects to add dep to
  - dep - Name of dependency
  - version - Version to install. Defaults to latest

#### remove

Removes a dependency

- `type Remove = (roots: Array<string>, dep: string) => void`
  - roots - List of projects to add dep to
  - dep - Name of dependency

#### optimize

Sync transitive deps across multiple projects and dedupe versions in matching ranges

- `type Optimize = (ls: Array<string>) => void`
  - ls - List of folders containing project folders to optimize

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

- `type Check = (ls: Array<string>) => {[string]: {[string]: Array<string>}}`
  - ls - List of folders containing project folders to check

#### merge

Merges dependencies from multiple projects' `package.json`/`yarn.lock` into a new folder

- `type Merge = (ls: Array<string>, out: string) => void`
  - ls - List of folders containing project folders to merge
  - out - Save resulting `package.json` and `yarn.lock` to this folder

---

### CLI

CLI commands and args mirror the API docs above

#### yarn-utilities add

Adds a dependency

- `yarn-utilities add --roots [roots] --dep [dep] --version [version] --type [type]`
  - roots - A pipe separated list of project folders
  - dep - Name of dependency
  - version - Version to install. Defaults to latest
  - type - whether to add as `dependencies`, `devDependencies`, `peerDependencies` or `optionalDependencies`. Defaults to `dependencies`

#### yarn-utilities upgrade

Upgrades a dependency

- `yarn-utilities upgrade --roots [roots] --dep [dep] --version [version]`
  - roots - A pipe separated list of project folders
  - dep - Name of dependency
  - version - Version to install. Defaults to latest

#### yarn-utilities remove

Removes a dependency

- `yarn-utilities remove --roots [roots] --dep [dep]`
  - roots - A pipe separated list of project folders
  - dep - Name of dependency

#### yarn-utilities optimize

Sync transitive deps across multiple projects and dedupe versions in matching ranges

- `yarn-utilities sync --ls [ls]`
  - ls - A pipe separated list of folders containing project folders to optimize

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

- `yarn-utilities check --ls [ls]`
  - ls - A pipe separated list of folders containing project folders to check

#### yarn-utilities merge

Merges dependencies from multiple projects' `package.json`/`yarn.lock` into a new folder

- `yarn-utilities merge --ls [ls] --out [out]`
  - ls - A pipe separated list of folders containing project folders to merge
  - out - Save resulting `package.json` and `yarn.lock` to this folder
