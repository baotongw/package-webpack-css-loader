var filesys = require('fs'),
	pathsys = require('path');

var patterns = {
	singleLineComment: /(?:^|\n|\r)\s*\/\/.*(?:\r|\n|$)/g,
	multiLineComment: /(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g
}

function ModuleFind(moduleDirectories) {

	this.root = process.cwd();

	this.sourceCfg = {
		'fekit_modules': {
			config: 'fekit.config',
			defaultEntry: '/src/index.js'
		},
		'node_modules': {
			config: 'package.json',
			defaultEntry: '/index.js'
		}
	}

	this.moduleDirectories = moduleDirectories || ['fekit_modules','node_modules'] ;
}

ModuleFind.prototype.readConfig = function(packagePath, packageConfig) {
	var dirPath = pathsys.join(packagePath, packageConfig.config);

	var config = filesys.readFileSync(dirPath,'utf-8');
	// remove comment
	config.replace(patterns.singleLineComment, '\n').replace(patterns.multiLineComment, '\n');

	return JSON.parse(config);
}

// get module index file path
ModuleFind.prototype.getEntry = function(moduleName) {
	var packagePath,
		stat,
		packageType,
		packageConfig,
		self = this,
		moduleRoots = this.moduleDirectories,
		index = 0,
		len = moduleRoots.length,
		tmpModuleRoot;


	for(; index < len; index++){
		tmpModuleRoot = moduleRoots[index];
		packagePath = pathsys.join(self.root,tmpModuleRoot,moduleName);
		stat = filesys.statSync(packagePath);

		if (stat.isDirectory()) {
			packageType = tmpModuleRoot;
			packageConfig = self.sourceCfg[tmpModuleRoot];
			break;
		}
	}

	var config = this.readConfig(packagePath, packageConfig);

	return pathsys.join(packagePath, config.main || packageConfig.defaultEntry);
}

module.exports = new ModuleFind();