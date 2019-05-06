const proc = require('child_process');
const {promisify} = require('util');
const {readFile, writeFile, access} = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const semver = require('semver');

const exec = (cmd, args = {}) => {
  return new Promise((resolve, reject) => {
    proc.exec(cmd, args, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    })
  });
};
const accessFile = promisify(access);
const exists = filename => accessFile(filename).then(() => true).catch(() => false);
const read = promisify(readFile);
const write = promisify(writeFile);

// helpers
function sort(unordered) {
  const ordered = {};
  Object.keys(unordered).sort().forEach(function(key) {
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
async function add({roots, dep, version, type = 'dependencies', tmpRoot = '/tmp'}) {
  const tmp = `${tmpRoot}/yarn-utils-${Math.random() * 1e17}`;
  await exec(`mkdir -p ${tmp}`);
  await write(`${tmp}/package.json`, '{}');
  await exec(`yarn add ${dep}${version ? `@${version}` : ''} --cwd ${tmp} 2>/dev/null`);
  version = JSON.parse(await read(`${tmp}/package.json`, 'utf8')).dependencies[dep];
  const added = lockfile.parse(await read(`${tmp}/yarn.lock`, 'utf8'));
  await exec(`rm -rf ${tmp}`);

  return Promise.all(
    roots.map(async root => {
      const meta = JSON.parse(await read(`${root}/package.json`, 'utf8'));
      if (meta.dependencies && meta.dependencies[dep]) meta.dependencies[dep] = version;
      if (meta.devDependencies && meta.devDependencies[dep]) meta.devDependencies[dep] = version;
      if (meta.peerDependencies && meta.peerDependencies[dep]) meta.peerDependencies[dep] = version;
      if (meta.optionalDependencies && meta.optionalDependencies[dep]) meta.optionalDependencies[dep] = version;
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

async function upgrade({roots, dep, version, tmp}) {
  await remove({roots, dep});
  await add({roots, dep, version, tmp});
}

async function remove({roots, dep}) {
  return Promise.all(
    roots.map(async root => {
      const meta = JSON.parse(await read(`${root}/package.json`, 'utf8'));

      if (meta.dependencies && meta.dependencies[dep]) delete meta.dependencies[dep];
      if (meta.devDependencies && meta.devDependencies[dep]) delete meta.devDependencies[dep];
      if (meta.peerDependencies && meta.peerDependencies[dep]) delete meta.peerDependencies[dep];
      if (meta.optionalDependencies && meta.optionalDependencies[dep]) delete meta.optionalDependencies[dep];
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
      const [, name, version] = key.match(/^(.*?)@(.*?)$/);
      if (!versions[name]) versions[name] = {};
      if (!versions[name][version] || semver.gt(dep.version, versions[name][version].version)) {
        versions[name][version] = dep;

        newDeps[key] = {};
        function collect(deps = {}) {
          Object.keys(deps).forEach(dep => {
            const depKey = `${dep}@${d.lockfile.object[key].dependencies[dep]}`;
            newDeps[key][depKey] = d.lockfile.object[depKey];
            collect(newDeps[key][depKey].dependencies);
          });
        }
        collect(d.lockfile.object[key].dependencies);
      }
    });
  });
  Object.keys(versions).forEach(name => {
    Object.keys(versions[name]).forEach(key => {
      Object.keys(versions[name]).forEach(version => {
        if (
          semver.satisfies(versions[name][key].version, version) &&
          semver.gte(versions[name][key].version, versions[name][version].version)
        ) {
          versions[name][version] = versions[name][key]
        }
      })
    })
  })

  Object.keys(versions).forEach(name => {
    Object.keys(versions[name]).forEach(version => {
      data.forEach(d => {
        const key = `${name}@${version}`;
        if (d.lockfile.object[key]) {
          d.lockfile.object[key] = versions[name][version];
          Object.keys(newDeps[key]).forEach(depKey => {
            if (
              !d.lockfile.object[depKey] ||
              semver.lt(d.lockfile.object[depKey].version, newDeps[key][depKey].version)
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

async function sync({roots, tmp}) {
  const addAll = async (root, meta, object, type) => {
    const names = Object.keys(meta[type] || {})
      .filter(name => !object[`${name}@${meta[type][name]}`]);
    for (const name of names) {
      await add({roots: [root], dep: name, version: meta[type][name], type, tmp})
    }
  }
  return Promise.all(
    roots.map(async root => {
      const meta = JSON.parse(await read(`${root}/package.json`, 'utf8'));
      const {object} = lockfile.parse(await read(`${root}/yarn.lock`, 'utf8'));
      await addAll(root, meta, object, 'dependencies');
      await addAll(root, meta, object, 'devDependencies');
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
    });
  }

  const dirs = await containing(roots, ['package.json'])
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
  if (Object.keys(await check({roots})).length === 0) {
    await optimize({roots});

    let deps = {};
    let lock = {};
    const dirs = await containing(roots, ['package.json', 'yarn.lock']);
    await Promise.all(
      dirs.map(async dir => {
        const meta = JSON.parse(await read(`${dir}/package.json`, 'utf8'));
        deps = {...deps, ...meta.dependencies, ...meta.devDependencies};

        const f = lockfile.parse(await read(`${dir}/yarn.lock`, 'utf8'));
        lock = sort({...lock, ...f.object});
      })
    );

    await exec(`mkdir -p ${out}`);
    await write(`${out}/package.json`, JSON.stringify({dependencies: deps}, null, 2), 'utf8');
    await write(`${out}/yarn.lock`, lockfile.stringify(lock), 'utf8');
  }
}

module.exports = {add, upgrade, remove, optimize, sync, check, merge};
