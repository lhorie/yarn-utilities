#!/usr/bin/env node

const {add, remove, upgrade, optimize, check, merge} = require('./index.js');

const [,, command, ...args] = process.argv;

switch (command) {
  case 'add': {
    const {roots, dep, version, type} = parse(args);
    add(roots.split('|'), dep, version, type);
    break;
  }
  case 'upgrade': {
    const {roots, dep, version} = parse(args);
    upgrade(roots.split('|'), dep);
    break;
  }
  case 'remove': {
    const {roots, dep} = parse(args);
    remove(roots.split('|'), dep);
    break;
  }
  case 'optimize': {
    const {ls} = parse(args);
    optimize(ls.split('|'));
    break;
  }
  case 'check': {
    const {ls} = parse(args);
    console.log(JSON.stringify(check(ls.split('|')), null, 2));
    break;
  }
  case 'merge': {
    const {ls, out} = parse(args);
    merge(ls.split('|'), out);
    break;
  }
}

function parse(args) {
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (args[i + 1].startsWith('--')) {
        params[args[i].slice(2)] = true
      } else {
        params[args[i].slice(2)] = args[i + 1];
        i++;
      }
    }
  }
  return params;
}
