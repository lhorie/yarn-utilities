const {execSync: exec} = require('child_process');
const {readdirSync: ls, existsSync: exists, readFileSync: read, writeFileSync: write} = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const semver = require('semver');

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

function getDirs(query) {
  return [].concat(...query.map(root => ls(root).map(dir => `${root}/${dir}`)));
}

// API
function add(roots, dep, version, type = 'dependencies') {
  const tmp = `/tmp/yarn-utils-${Math.random() * 1e17}`;
  exec(`mkdir -p ${tmp}`);
  write(`${tmp}/package.json`, '{}');
  exec(`yarn add ${dep}${version ? `@${version}` : ''} --cwd ${tmp} 2>/dev/null`);
  version = JSON.parse(read(`${tmp}/package.json`, 'utf8')).dependencies[dep];
  const added = lockfile.parse(read(`${tmp}/yarn.lock`, 'utf8'));
  exec(`rm -rf ${tmp}`);

  roots.forEach(root => {
    const meta = JSON.parse(read(`${root}/package.json`, 'utf8'));
    if (meta.dependencies && meta.dependencies[dep]) meta.dependencies[dep] = version;
    if (meta.devDependencies && meta.devDependencies[dep]) meta.devDependencies[dep] = version;
    if (meta.peerDependencies && meta.peerDependencies[dep]) meta.peerDependencies[dep] = version;
    if (meta.optionalDependencies && meta.optionalDependencies[dep]) meta.optionalDependencies[dep] = version;
    if (!meta[type]) meta[type] = {};
    meta[type][dep] = version;
    write(`${root}/package.json`, JSON.stringify(meta, null, 2));

    const f = lockfile.parse(read(`${root}/yarn.lock`, 'utf8'));
    f.object = sort({...f.object, ...added.object});
    prune(meta, f.object);
    write(`${root}/yarn.lock`, lockfile.stringify(f.object), 'utf8');
  });
}

function upgrade(roots, dep, version) {
  remove(roots, dep);
  add(roots, dep, version);
}

function remove(roots, dep) {
  roots.forEach(root => {
    const meta = JSON.parse(read(`${root}/package.json`, 'utf8'));

    if (meta.dependencies && meta.dependencies[dep]) delete meta.dependencies[dep];
    if (meta.devDependencies && meta.devDependencies[dep]) delete meta.devDependencies[dep];
    if (meta.peerDependencies && meta.peerDependencies[dep]) delete meta.peerDependencies[dep];
    if (meta.optionalDependencies && meta.optionalDependencies[dep]) delete meta.optionalDependencies[dep];
    write(`${root}/package.json`, JSON.stringify(meta, null, 2));

    const f = lockfile.parse(read(`${root}/yarn.lock`, 'utf8'));
    prune(meta, f.object);
    write(`${root}/yarn.lock`, lockfile.stringify(f.object), 'utf8');
  });
}

function optimize(roots) {
  const data = roots
    .filter(dir => exists(`${dir}/yarn.lock`))
    .map(dir => ({
      meta: `${dir}/package.json`,
      file: `${dir}/yarn.lock`,
      lockfile: lockfile.parse(read(`${dir}/yarn.lock`, 'utf8')),
    }));

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

  data.forEach(d => {
    const meta = JSON.parse(read(d.meta, 'utf8'));
    prune(meta, d.lockfile.object);
    write(d.file, lockfile.stringify(d.lockfile.object), 'utf8');
  });
}

function check(roots) {
  const versions = {};
  function collectVersions(meta, type) {
    Object.keys(meta[type] || {}).forEach(name => {
      const version = meta[type][name];
      if (!versions[name]) versions[name] = {};
      if (!versions[name][version]) versions[name][version] = [];
      versions[name][version].push(meta.name);
    });
  }

  roots
    .filter(dir => exists(`${dir}/package.json`))
    .forEach(dir => {
      const meta = JSON.parse(read(`${dir}/package.json`, 'utf8'));
      collectVersions(meta, 'dependencies');
      collectVersions(meta, 'devDependencies');
      collectVersions(meta, 'peerDependencies');
      collectVersions(meta, 'optionalDependencies');
    });
  Object.keys(versions).forEach(name => {
    if (Object.keys(versions[name]).length === 1) delete versions[name];
  });

  return versions;
}

function merge(roots, out) {
  if (Object.keys(check(roots)).length === 0) {
    optimize(roots);

    let deps = {};
    let lock = {};
    roots
      .filter(dir => exists(`${dir}/package.json`) && exists(`${dir}/yarn.lock`))
      .forEach(dir => {
        const meta = JSON.parse(read(`${dir}/package.json`, 'utf8'));
        deps = {...deps, ...meta.dependencies, ...meta.devDependencies};

        const f = lockfile.parse(read(`${dir}/yarn.lock`, 'utf8'));
        lock = sort({...lock, ...f.object});
      });

    exec(`mkdir -p ${out}`);
    write(`${out}/package.json`, JSON.stringify({dependencies: deps}, null, 2), 'utf8');
    write(`${out}/yarn.lock`, lockfile.stringify(lock), 'utf8');
  }
}

module.exports = {add, upgrade, remove, optimize, check, merge};
