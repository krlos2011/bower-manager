'use strict';

// task.bower-tmp

var grunt = require('grunt'),
    _bowerDir = '.bower_components',
    extend = require('util')._extend;

var bower = {
    find: function (bowerJSON, bowerDir, subset, found) {

        bowerJSON = bowerJSON || {};
        bowerDir = bowerDir || _bowerDir;
        found = found || {};

        bowerJSON.overrides = bowerJSON.overrides || {};
        bowerJSON.extend = bowerJSON.extend || {};

        var dependenceBower = {};

        function readFileIfNeeded (dependenceName, fileName) {
            if( !dependenceBower.main && grunt.file.exists( bowerDir, dependenceName, fileName ) ) {
                dependenceBower = grunt.file.readJSON(bowerDir + '/' + dependenceName + '/' + fileName) || {};
                dependenceBower._file = fileName;
            }
        }

        for( var dependenceName in bowerJSON[ subset ? (subset + 'Dependencies') : 'dependencies' ] ) {
            if( !found[dependenceName] ) {

                dependenceBower = {};

                if( bowerJSON.overrides[dependenceName] ) {
                    // console.warn('[' + dependenceName + '] overriden', bowerJSON.overrides[dependenceName]);
                    dependenceBower = bowerJSON.overrides[dependenceName];
                    dependenceBower._file = 'overrided';
                }

                readFileIfNeeded( dependenceName, 'bower.json' );
                readFileIfNeeded( dependenceName, '.bower.json' );
                readFileIfNeeded( dependenceName, 'package.json' );

                if( bowerJSON.extend[dependenceName] ) {
                    extend(dependenceBower, bowerJSON.extend[dependenceName]);
                }

                if( dependenceBower.main ) {
                    // console.log('[' + dependenceName + ']', dependenceBower.main);
                    found[dependenceName] = dependenceBower;

                    if( dependenceBower.dependencies ) {
                        // console.warn('[DEPENDENCIES] ' + dependenceName + ' has dependencies', dependenceBower.dependencies );
                        dependenceBower.overrides = extend(dependenceBower.overrides || {}, bowerJSON.overrides);
                        extend( found, bower.find(dependenceBower, bowerDir, false, found) );
                    }

                } else {
                    console.warn('[ERROR] dependence not found: ' + dependenceName);
                    return false;
                }
            } else {
                // console.warn('[FOUND] ' + dependenceName);
            }
        }
        return found;
    },
    copy: function (options) {
        options = options || {};

        var path = require('path'),
            cwd = options.cwd || '.',
            destDir = options.dest || '.tmp',
            bowerDir = path.join( cwd, 'bower_components' );

        var bowerJSON = grunt.file.exists(cwd, 'bower.json') ?
                        grunt.file.readJSON( path.join(cwd, 'bower.json') ) :
                        ( grunt.file.exists(cwd, '.bower.json') ? grunt.file.readJSON( path.join(cwd, '.bower.json') ) : false );

        if( bowerJSON ) {

            if( grunt.file.exists( cwd + '/.bowerrc') ) {
                var bowerrc = grunt.file.readJSON(cwd + '/.bowerrc');
                if( bowerrc.directory ) {
                    bowerDir = path.join( process.cwd(), cwd, bowerrc.directory );
                }
            }

            var found = bower.find( bowerJSON, bowerDir, options.subset ),
                dependenceBower, dependenceFiles;

            if( !found ) {
                return false;
            }

            for( var dependence in found ) {

                dependenceBower = found[dependence];

                if( typeof dependenceBower.main === 'string' ) {
                    dependenceBower.main = [dependenceBower.main];
                }

                if( (options.ignore || {})[dependence] ) {
                    if( options.ignore[dependence] instanceof Array ) {
                        options.ignore[dependence].forEach(function (filesFilter) {
                            dependenceBower.main.push('!' + filesFilter );
                        });
                    } else {
                        dependenceBower.main.push('!' + options.ignore[dependence]);
                    }
                }

                dependenceFiles = grunt.file.expand({ cwd: bowerDir + '/' + dependence }, dependenceBower.main);

                console.log('[' + dependence + '][files]', dependenceFiles);

                dependenceFiles.forEach(function (filePath) {

                    if( grunt.file.isFile(bowerDir, dependence, filePath) ) {
                        grunt.file.copy(
                            path.join( bowerDir, dependence, filePath ),
                            path.join( destDir, dependence, options.expand ? filePath : filePath.split('/').pop() )
                        );
                    }
                });
            }
        } else {
            console.error('[' + appName + '] no bower file');
        }
    }
};

module.exports = bower;
