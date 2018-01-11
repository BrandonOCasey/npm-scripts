let config;

if (process.env.NPM_PRESET_CONFIG) {
  config = JSON.parse(process.env.NPM_PRESET_CONFIG);
} else {
  /* eslint-disable no-console */
  const findRoot = require('find-root');
  const path = require('path');
  const fs = require('fs');
  const npmPath = require('npm-path');
  const pathExists = require('./path-exists');

  npmPath.setSync();
  /**
  * The config contains anything that might be needed from the package.json
  * of the project that is using npm script.
  */
  let dir = process.cwd();

  /* istanbul ignore if */
  if (!path.isAbsolute(dir)) {
    dir = path.join(process.cwd(), dir);
  }

  const appRoot = findRoot(dir);

  npmPath.setSync({cwd: appRoot});

  const appPkg = require(path.join(dir, 'package.json'));
  const name = appPkg.name.replace(/^@.+\//, '');
  const scope = appPkg.name.replace(name, '').replace(/\/$/, '');
  let author = appPkg.author || '';

  if (typeof appPkg.author === 'object') {
    author = appPkg.author.name || '';

    if (appPkg.author.email) {
      author += ' <' + appPkg.author.email + '>';
    }
    if (appPkg.author.url) {
      author += ' (' + appPkg.author.url + ')';
    }
  }

  appPkg.author = author;
  appPkg.fullName = appPkg.name;
  appPkg.name = name;
  appPkg.scope = scope;

  const moduleName = name.split('-').map(function(item, index) {
    if (index === 0) {
      return item;
    }

    // uppercase first letter
    return item.charAt(0).toUpperCase() + item.slice(1);
  }).join('');

  config = {
    author,
    name,
    moduleName,
    scope,
    root: appRoot,
    pkg: appPkg,
    scripts: {},
    npmPreset: appPkg['npm-preset'] || {}
  };

  // if not presets are listed
  // see if we can find any installed presets
  if (!config.npmPreset.presets) {
    const packages = Object.keys(config.pkg.dependencies || {}).concat(Object.keys(config.pkg.devDependencies || {}));

    config.npmPreset.presets = packages.filter((packageName) => (/npm-preset-.*$/).test(packageName));
  }

  config.npmPreset.presets = config.npmPreset.presets || [];
  config.npmPreset.scripts = config.npmPreset.scripts || {};

  const addScript = function(scriptName, obj) {
    config.scripts[scriptName] = config.scripts[scriptName] || [];
    config.scripts[scriptName].push(obj);
  };

  Object.keys(config.npmPreset.scripts).forEach(function(scriptName) {
    addScript(scriptName, {command: config.npmPreset.scripts[scriptName], source: 'npm-preset'});
  });

  config.npmPreset.presets = config.npmPreset.presets.map(function(preset) {
    if (typeof preset === 'string') {
      preset = {name: preset};
    }

    if (!preset.path) {
      const nodeModules = path.join(config.root, 'node_modules');

      if (!preset.path && pathExists(path.join(nodeModules, 'npm-preset-' + preset.name))) {
        preset.name = 'npm-preset-' + preset.name;
        preset.path = path.join(nodeModules, preset.name);
      } else if (!preset.path && pathExists(path.join(nodeModules, preset.name))) {
        preset.path = path.join(nodeModules, preset.name);
      } else {
        console.error('Could not find ' + preset.name + ', is it installed?');
        process.exit(1);
      }

    }

    let scripts = require(preset.path);

    npmPath.setSync({cwd: preset.path});

    if (typeof scripts === 'function') {
      scripts = scripts(config);
    }

    Object.keys(scripts).forEach(function(scriptName) {
      addScript(scriptName, {command: scripts[scriptName], source: preset.name});
    });

    preset._shortname = preset.name.replace(/^npm-preset-/, '');
    preset._realpath = fs.realpathSync(preset.path);
    preset._localpath = path.relative(config.root, preset.path);

    return preset;
  });
}

module.exports = config;
