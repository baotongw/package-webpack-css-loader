var filesys = require('fs'),
	pathsys = require('path');

var patterns = {
	singleLineComment: /(?:^|\n|\r)\s*\/\/.*(?:\r|\n|$)/g,
	multiLineComment: /(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g
}

function ModuleFind(moduleDirectories) {
	this.moduleDirectories = moduleDirectories;

	this.root = process.cwd();

	this.sourceCfg = {
		'fekit_module': {
			config: 'fekit.config',
			defaultEntry: '/src/index.js'
		},
		'node_module': {
			config: 'package.json',
			defaultEntry: '/index.js'
		}
	}
}

ModuleFind.prototype.readConfig = function(packageType, packageConfig) {
	var dirPath = pathsys.join(this.root, packageType, packageConfig.config);

	var config = filesys.readFileSync(dirPath);
	// remove comment
	config.replace(patterns.singleLineComment, '\n').replace(patterns.multiLineComment, '\n');

	return JSON.parse(config);
}

// get module index file path
ModuleFind.prototype.getEntry = function(moduleName) {
	var dir,
		stat,
		packageType,
		packageConfig,
		self = this;

	this.moduleDirectories.forEach(function(v) {
		dir = pathsys.join(self.root, v, moduleName);

		stat = filesys.statSync(dir);

		if (stat.isDirectory()) {
			packageType = v;
			packageConfig = self.sourceCfg[v];
			return true;
		}
	});

	var config = this.readConfig(packageType, packageConfig);

	return pathsys.join(this.root, packageType, this.config.main || config.defaultEntry);
}

module.exports = new ModuleFind();