#!/usr/bin/env node

const {add, remove, upgrade, optimize, sync, check, merge} = require('./index.js');

const [,, command, ...args] = process.argv;

switch (command) {
  case 'add': {
    const {roots, dep, version, type, tmp} = parse(args);
    add({roots: roots.split('|'), dep, version, type});
    break;
  }
  case 'upgrade': {
    const {roots, dep, version, tmp} = parse(args);
    upgrade({roots: roots.split('|'), dep});
    break;
  }
  case 'remove': {
    const {roots, dep} = parse(args);
    remove({roots: roots.split('|'), dep});
    break;
  }
  case 'optimize': {
    const {roots} = parse(args);
    optimize({roots: roots.split('|')});
    break;
  }
  case 'sync': {
    const {roots, ignore, tmp} = parse(args);
    sync({roots: roots.split('|'), ignore: ignore.split('|'), tmp});
    break;
  }
  case 'check': {
    const {roots} = parse(args);
    console.log(JSON.stringify(check({roots: roots.split('|')}), null, 2));
    break;
  }
  case 'merge': {
    const {roots, out} = parse(args);
    merge({roots: roots.split('|'), out});
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
