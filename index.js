var pathsys = require('path'),
    filesys = require('fs'),
    loaderUtils = require('loader-utils'),
    ModuleFind = require('./moduleFind');

var config = {
    readType: 'utf-8',
    webpackResolve: null
}

var moduleFindInstance;

//这里是专门针对css的loader，所以需要同时支持fekit的require和常规的import
var patterns = {
    requirePattern: /(?:require|@import\surl)\(['|"]?(.*?)['|"]?\);*/igm,
    cssCommentPattern: /\/\*.+\*\//gm,
    isRelative: /[^\.{1,2}.+|[\w_-]+?\.(css|less|scss)$]/,
    isAlias: /(\w+?)(\/.+)/,
    isModule: /([\w_-]+)/
}

var pathResolve = {
    extensionList: ['.css', '.less', '.scss'],
    relativePathCheck: function(path, parentPath) {
        parentPath = pathsys.dirname(parentPath);

        return this.pathExistsCheck(pathsys.resolve(parentPath, path));
    },
    aliasCheck: function(path) {
        var alias = null,
            key;

        if (patterns.isAlias.test(path)) {
            key = RegExp.$1;
            alias = config.webpackResolve.alias[key];
        }
        // 用alias替换回原文件地址
        path = alias + path.replace(patterns.isAlias, '$2');

        path = pathsys.join(config.webpackResolve.root, path);
        return this.pathExistsCheck(path);
    },
    moduleCheck: function(path) {
        var moduleName;

        if (patterns.isModule.test(path)) {
            moduleName = RegExp.$1;
        }

        var entryPath = moduleFindInstance.getEntry(moduleName);

        return this.pathExistsCheck(entryPath);
    },
    pathExistsCheck: function(resolvePath) {
        if (!resolvePath) return resolvePath;

        if (filesys.existsSync(resolvePath)) {
            return resolvePath;
        }

        var flag = false,
            handlePath;

        for (var i = 0; i < this.extensionList.length; i++) {
            handlePath = resolvePath + this.extensionList[i];

            if (filesys.existsSync(handlePath)) {
                flag = true;
                break;
            }
        }

        return flag ? handlePath : null;
    },
    // 返回引用文件的绝对路径
    getFullPath: function(referencePath, parentPath) {
        var path;

        // 所有的引用都先检查是否是相对路径
        path = this.relativePathCheck(referencePath, parentPath);

        if (this.isOniuiPath(parentPath)) {
            return path;
        }

        // 处理alias        
        if (!path && patterns.isAlias.test(referencePath)) {
            path = this.aliasCheck(referencePath);
        }

        // 处理引入的module
        if (!path && patterns.isModule.test(referencePath)) {
            path = this.moduleCheck(referencePath);
        }

        return path || referencePath;
    },
    isOniuiPath: function(path) {
        path = path || '';
        return path.indexOf('/fekit_modules/oniui/src') !== -1 || path.indexOf('\\fekit_modules\\oniui\\src') !== -1;
    }
}

function checkDependence(source, env, isSubCheck, filePath, result) {
    var self = this;

    result = result || {};

    if (!source) {
        return source;
    }

    if (env === 'prd') {
        source = source.replace(patterns.cssCommentPattern, '');
    }

    var dependence = source.match(patterns.requirePattern);
    // 干掉css中的require
    source = source.replace(patterns.requirePattern, '');

    if (dependence) {
        for (var i = 0, dependPath = null; i < dependence.length; i++) {
            dependence[i].match(patterns.requirePattern);
            dependPath = pathResolve.getFullPath(RegExp.$1, filePath);

            //oniui组件没有样式就不处理了
            if (!dependPath && pathResolve.isOniuiPath(filePath)) {
                continue;
            }

            var content = filesys.readFileSync(dependPath, config.readType);
            checkDependence(content, env, true, dependPath, result);
        }
    }

    // 确保不会重复
    if (!result[filePath]) {
        result[filePath] = source;
    }

    if (isSubCheck === false) {
        return result;
    }
}

module.exports = function(source) {
    config.webpackResolve = this._compiler.options.resolve;
    moduleFindInstance = new ModuleFind(config.webpackResolve.modulesDirectories);

    // this loader can be cached
    this.cacheable();

    var query = loaderUtils.parseQuery(this.query);
    var requireMapping = checkDependence.call(this, source, query.dev, false, this.resourcePath);

    var output = {
        type: 'css',
        path: this.resourcePath,
        content: []
    }

    Object.keys(requireMapping).forEach(function(key) {
        output.content.push(requireMapping[key]);
    });

    return '(' + JSON.stringify(output) + ')';
}