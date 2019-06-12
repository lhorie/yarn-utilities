const proc = require('child_process');
const {resolve} = require('path');
const {promisify} = require('util');
const {readFile, writeFile, access} = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const semver = require('semver');

const exec = (cmd, args = {}) => {
  return new Promise((resolve, reject) => {
    proc.exec(cmd, args, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
};
const accessFile = promisify(access);
const exists = filename =>
  accessFile(filename)
    .then(() => true)
    .catch(() => false);
const read = promisify(readFile);
const write = promisify(writeFile);

// helpers
function sort(unordered) {
  const ordered = {};
  Object.keys(unordered)
    .sort()
    .forEach(function(key) {
      ordered[key] = unordered[key];
    });
  return ordered;
}

function prune(meta, deps) {
  const top = {...meta.dependencies, ...meta.devDependencies};

  let done = false;
  while (!done) {
    const used = {};
    Object.keys(top).map(name => {
      used[`${name}@${top[name]}`] = true;
    });
    Object.keys(meta.resolutions || {}).forEach(pattern => {
      const [name] = pattern.match(/(@[^\/]+\/)?[^\/]+$/i);
      used[`${name}@${meta.resolutions[pattern]}`] = true;
    });
    Object.keys(deps).forEach(dep => {
      Object.keys(deps[dep].dependencies || {}).forEach(name => {
        used[`${name}@${deps[dep].dependencies[name]}`] = true;
      });
    });
    done = true;
    Object.keys(deps).forEach(dep => {
      if (!(dep in used)) {
        done = false;
        delete deps[dep];
      }
    });
  }
}

async function containing(dirs, files) {
  const found = await Promise.all(
    dirs.map(async dir => {
      return Promise.all(
        files.map(async file => await exists(`${dir}/${file}`))
      ).then(found => found.indexOf(false) === -1);
    })
  );
  const output = [];
  dirs.forEach((dir, i) => {
    if (found[i]) output.push(dir);
  });
  return output;
}

// API
const readNpmrc = async dir => {
  const npmrcs = await findNpmrcs(dir);
  const configs = npmrcs.map(npmrc => {
    return npmrc
      .replace(/[#;].*[\r\n]/gm, '')
      .split('\n')
      .reduce((memo, line) => {
        const [key, ...rest] = line.split('=');
        // TODO handle `key[] = value` syntax
        if (key) {
          memo[key.trim()] = rest
            .join('=')
            .replace(/\$\{([^}]+)\}/g, (match, key) => process.env[key]);
        }
        return memo;
      }, {});
  });
  return Object.assign({}, ...configs.reverse());
};

const findNpmrcs = async dir => {
  const npmrcs = [await read(`${dir}/.npmrc`, 'utf8').catch(() => '')];
  if (resolve(`${dir}/..`) !== '/')
    npmrcs.push(...(await findNpmrcs(`${dir}/..`)));
  return npmrcs;
};

async function add({roots, dep, version, type = 'dependencies', tmp = '/tmp'}) {
  tmp = `${tmp}/yarn-utils-${Math.random() * 1e17}`;

  const metas = await Promise.all(
    roots.map(async root => {
      return JSON.parse(await read(`${root}/package.json`, 'utf8'));
    })
  );
  const configs = await Promise.all(
    roots.map(async root => {
      return await readNpmrc(root);
    })
  );
  const resolutions = metas.reduce(
    (memo, meta) => ({...memo, ...meta.resolutions}),
    {}
  );

  await exec(`mkdir -p ${tmp}`);
  await write(
    `${tmp}/.npmrc`,
    Object.keys(configs)
      .map(key => `${key}=${configs[key]}`)
      .join('\n')
  );
  await write(`${tmp}/package.json`, JSON.stringify({resolutions}));
  await exec(
    `yarn add ${dep}${version ? `@${version}` : ''} --cwd ${tmp} 2>/dev/null`
  );
  version = JSON.parse(await read(`${tmp}/package.json`, 'utf8')).dependencies[
    dep
  ];
  const added = lockfile.parse(await read(`${tmp}/yarn.lock`, 'utf8'));
  await exec(`rm -rf ${tmp}`);

  return Promise.all(
    roots.map(async (root, i) => {
      const meta = metas[i];
      if (meta.dependencies && meta.dependencies[dep])
        meta.dependencies[dep] = version;
      if (meta.devDependencies && meta.devDependencies[dep])
        meta.devDependencies[dep] = version;
      if (meta.peerDependencies && meta.peerDependencies[dep])
        meta.peerDependencies[dep] = version;
      if (meta.optionalDependencies && meta.optionalDependencies[dep])
        meta.optionalDependencies[dep] = version;
      if (!meta[type]) meta[type] = {};
      meta[type][dep] = version;
      await write(`${root}/package.json`, JSON.stringify(meta, null, 2));

      const f = lockfile.parse(await read(`${root}/yarn.lock`, 'utf8'));
      f.object = sort({...f.object, ...added.object});
      prune(meta, f.object);
      await write(`${root}/yarn.lock`, lockfile.stringify(f.object), 'utf8');
    })
  );
}

async function upgrade({roots, dep, version, tmp = '/tmp'}) {
  tmp = `${tmp}/yarn-utils-${Math.random() * 1e17}`;
  await exec(`mkdir -p ${tmp}`);
  await write(`${tmp}/package.json`, '{}');
  await exec(
    `yarn add ${dep}${version ? `@${version}` : ''} --cwd ${tmp} 2>/dev/null`
  );
  version = JSON.parse(await read(`${tmp}/package.json`, 'utf8')).dependencies[
    dep
  ];
  const added = lockfile.parse(await read(`${tmp}/yarn.lock`, 'utf8'));
  await exec(`rm -rf ${tmp}`);

  return Promise.all(
    roots.map(async root => {
      const meta = JSON.parse(await read(`${root}/package.json`, 'utf8'));
      if (meta.dependencies && meta.dependencies[dep])
        meta.dependencies[dep] = version;
      if (meta.devDependencies && meta.devDependencies[dep])
        meta.devDependencies[dep] = version;
      if (meta.peerDependencies && meta.peerDependencies[dep])
        meta.peerDependencies[dep] = version;
      if (meta.optionalDependencies && meta.optionalDependencies[dep])
        meta.optionalDependencies[dep] = version;
      await write(`${root}/package.json`, JSON.stringify(meta, null, 2));

      const f = lockfile.parse(await read(`${root}/yarn.lock`, 'utf8'));
      f.object = sort({...f.object, ...added.object});
      prune(meta, f.object);
      await write(`${root}/yarn.lock`, lockfile.stringify(f.object), 'utf8');
    })
  );
}

async function remove({roots, dep}) {
  return Promise.all(
    roots.map(async root => {
      const meta = JSON.parse(await read(`${root}/package.json`, 'utf8'));

      if (meta.dependencies && meta.dependencies[dep])
        delete meta.dependencies[dep];
      if (meta.devDependencies && meta.devDependencies[dep])
        delete meta.devDependencies[dep];
      if (meta.peerDependencies && meta.peerDependencies[dep])
        delete meta.peerDependencies[dep];
      if (meta.optionalDependencies && meta.optionalDependencies[dep])
        delete meta.optionalDependencies[dep];
      await write(`${root}/package.json`, JSON.stringify(meta, null, 2));

      const f = lockfile.parse(await read(`${root}/yarn.lock`, 'utf8'));
      prune(meta, f.object);
      await write(`${root}/yarn.lock`, lockfile.stringify(f.object), 'utf8');
    })
  );
}

async function optimize({roots}) {
  const dirs = await containing(roots, ['yarn.lock']);
  const data = await Promise.all(
    dirs.map(async dir => ({
      meta: `${dir}/package.json`,
      file: `${dir}/yarn.lock`,
      lockfile: lockfile.parse(await read(`${dir}/yarn.lock`, 'utf8')),
    }))
  );

  const versions = {};
  const newDeps = {};
  data.forEach(d => {
    Object.keys(d.lockfile.object).forEach(key => {
      const dep = d.lockfile.object[key];
      const [, name, version] = key.match(/^(.+?)@(.+?)$/);
      if (!versions[name]) versions[name] = {};
      if (
        !versions[name][version] ||
        semver.gt(dep.version, versions[name][version].version)
      ) {
        versions[name][version] = dep;

        function collect(key, deps = {}) {
          if (key in newDeps) return;

          newDeps[key] = {};
          Object.keys(deps).forEach(dep => {
            const depKey = `${dep}@${d.lockfile.object[key].dependencies[dep]}`;
            newDeps[key][depKey] = d.lockfile.object[depKey];
            const dependencies = {...newDeps[key][depKey].dependencies};
            collect(depKey, dependencies);
          });
        }
        collect(key, d.lockfile.object[key].dependencies);
      }
    });
  });
  Object.keys(versions).forEach(name => {
    Object.keys(versions[name]).forEach(key => {
      Object.keys(versions[name]).forEach(version => {
        const actualName = key.startsWith('npm:')
          ? key.match(/npm:(.[^@]*)/)[1]
          : name;
        if (
          name === actualName &&
          semver.satisfies(versions[name][key].version, version) &&
          semver.gte(
            versions[name][key].version,
            versions[name][version].version
          )
        ) {
          versions[name][version] = versions[name][key];
        }
      });
    });
  });

  Object.keys(versions).forEach(name => {
    Object.keys(versions[name]).forEach(version => {
      data.forEach(d => {
        const key = `${name}@${version}`;
        if (d.lockfile.object[key]) {
          d.lockfile.object[key] = versions[name][version];
          Object.keys(newDeps[key]).forEach(depKey => {
            if (
              !d.lockfile.object[depKey] ||
              semver.lt(
                d.lockfile.object[depKey].version,
                newDeps[key][depKey].version
              )
            ) {
              d.lockfile.object[depKey] = newDeps[key][depKey];
            }
          });
        }
      });
    });
  });

  return Promise.all(
    data.map(async d => {
      const meta = JSON.parse(await read(d.meta, 'utf8'));
      prune(meta, d.lockfile.object);
      await write(d.file, lockfile.stringify(d.lockfile.object), 'utf8');
    })
  );
}

async function sync({roots, ignore = [], tmp}) {
  const addAll = async (root, meta, object, type, ignore) => {
    const names = Object.keys(meta[type] || {}).filter(name => {
      const needsDownload = !object[`${name}@${meta[type][name]}`];
      const shouldDownload = !ignore.find(ignored => ignored === name);
      return needsDownload && shouldDownload;
    });
    for (const name of names) {
      await add({
        roots: [root],
        dep: name,
        version: meta[type][name],
        type,
        tmp,
      });
    }
  };
  return Promise.all(
    roots.map(async root => {
      if (!(await exists(`${root}/yarn.lock`))) {
        await write(`${root}/yarn.lock`, '', 'utf8');
      }
      const meta = JSON.parse(await read(`${root}/package.json`, 'utf8'));
      const {object} = lockfile.parse(await read(`${root}/yarn.lock`, 'utf8'));
      await addAll(root, meta, object, 'dependencies', ignore);
      await addAll(root, meta, object, 'devDependencies', ignore);
    })
  );
}

async function check({roots}) {
  const versions = {};
  function collectVersions(meta, type) {
    Object.keys(meta[type] || {}).forEach(name => {
      const version = meta[type][name];
      if (!versions[name]) versions[name] = {};
      if (!versions[name][version]) versions[name][version] = [];
      versions[name][version].push(meta.name);
      versions[name][version].sort();
    });
  }

  const dirs = await containing(roots, ['package.json']);
  await Promise.all(
    dirs.map(async dir => {
      const meta = JSON.parse(await read(`${dir}/package.json`, 'utf8'));
      collectVersions(meta, 'dependencies');
      collectVersions(meta, 'devDependencies');
      collectVersions(meta, 'peerDependencies');
      collectVersions(meta, 'optionalDependencies');
    })
  );
  Object.keys(versions).forEach(name => {
    if (Object.keys(versions[name]).length === 1) delete versions[name];
  });

  return versions;
}

async function merge({roots, out}) {
  await optimize({roots});

  let deps = {};
  let lock = {};
  let resolutions = {};
  const dirs = await containing(roots, ['package.json', 'yarn.lock']);
  await Promise.all(
    dirs.map(async dir => {
      const meta = JSON.parse(await read(`${dir}/package.json`, 'utf8'));
      deps = {...deps, ...meta.dependencies, ...meta.devDependencies};
      resolutions = {...resolutions, ...meta.resolutions};

      const f = lockfile.parse(await read(`${dir}/yarn.lock`, 'utf8'));
      lock = sort({...lock, ...f.object});
    })
  );

  await exec(`mkdir -p ${out}`);
  await write(
    `${out}/package.json`,
    JSON.stringify({dependencies: deps, resolutions}, null, 2),
    'utf8'
  );
  await write(`${out}/yarn.lock`, lockfile.stringify(lock), 'utf8');
}

module.exports = {
  add,
  upgrade,
  remove,
  optimize,
  sync,
  check,
  merge,
  readNpmrc,
};
