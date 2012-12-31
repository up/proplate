/*global module:true, require:true */

module.exports = function (grunt) {

  "use strict";

  var     
    js = {
      modules : [
        "src/banner.tmpl",
        "src/javascripts/one.js",
        "src/javascripts/two.js"
      ],
      aggregated : "dist/scripts.js",
      minified   : "dist/scripts.min.js",
      sourcemap  : "dist/scripts.source-map.js"
    },
    css = {
      aggregated : "dist/styles.css",
      minified   : "dist/styles.min.css"
    },
    less = {
      modules : [
        "src/stylesheets/test.less"
      ],
      aggregated : "dist/tmp/all.less.css",
      minified   : "dist/tmp/all.less.min.css"
    }
  ;


  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    prehook: {},
    posthook: {},
    beautify: {
      all : {
        src: js.aggregated,
        options: {
           'indent_size': 2,
           'indent_char': ' '
         }
      }
    },
    less: {
      all: {
        src: less.modules,
        dest: less.aggregated
      },
      min: {
        src: less.modules,
        dest: less.minified,
        options: {
          compress: true
        }
      }
    },
    aggregate: {
      js_modules : {
        src: js.modules,
        dest: js.aggregated 
      }
    },
    lint: {
      grunt: [
        "grunt.js" // self
      ],
      js_modules: js.modules
    },
    jshint: {
      options: {
        browser: true,
        scripturl: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true,
        es5: true,
        strict: false
      },
      globals: {
        module: true,
        alert: true
      }
    },
    closure: {
      options: {
        sources: js.modules,
        output: js.minified,
        level: {
          compilation: "ADVANCED_OPTIMIZATIONS", // SIMPLE_OPTIMIZATIONS, WHITESPACE_ONLY
          warnings: "VERBOSE" // QUIET, DEFAULT
        },
        sourcemap: {
          create: true,
          output: js.sourcemap
        }
      }
    },
    revision: {
      all: [
        js.aggregated,
        js.minified
      ]
    }
  });

  grunt.registerTask("prehook", "Pre Hook.", function() {

    grunt.log.writeln("prehook");

  });

  grunt.registerMultiTask("less", "Compile LESS files.", function() {
    
    var 
      fs = require("fs"),
      path = require("path"),
      less = require("less"),
      src = this.file.src,
      dest = this.file.dest,
      options = this.data.options || {},
      lessFiles = grunt.file.expandFiles(src),
      done = this.async()
    ;

    function callback(err, css) {
      if (err) {
        grunt.warn(err);
        done(false);
        return;
      }
      grunt.log.writeln("Compiled to '" + dest + "'");
      grunt.file.write(dest, css);
      done();
    }

    function compile(src, callback) {
      var parser = new less.Parser({
        paths: [path.dirname(src)]
      });

      fs.readFile(src, "utf8", function(err, data) {
        if (err) {
          callback(err);
        }

        // send data from source file to LESS parser to get CSS
        grunt.verbose.writeln("Parsing " + src);
        parser.parse(data, function(err, tree) {
          if (err) {
            callback(err);
          }

          var css = null;
          try {
            css = tree.toCSS({
              compress: options.compress,
              yuicompress: options.yuicompress
            });
          } catch(e) {
            callback(e);
            return;
          }

          grunt.log.writeln("Added source file '" + src + "'");
          callback(null, css);
        });
      });
    }

    grunt.utils.async.map(lessFiles, compile, function(err, results) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, results.join(grunt.utils.linefeed));
    });
    
  });

  grunt.registerMultiTask("aggregate", "Concatenate modules", function () {
    var
      compiled = "",
      src = grunt.file.expandFiles(this.file.src),
      name = this.file.dest
    ;

    src.forEach(function (filepath) {
      compiled += grunt.file.read(filepath) + "\n\n";
      grunt.log.writeln("Added source file '" + filepath + "'");
    });

    grunt.file.write(name, compiled);

    // Fail task if errors were logged.
    if (this.errorCount) {
      return false;
    }
    // Otherwise, print a success message.
    grunt.log.writeln("Created '" + name + "'");
  });

  grunt.registerTask("closure", "Google Closure Compiler", function () {
    var
      options = grunt.config("closure.options"),
      done = this.async(),
      message = function (msg) {
        grunt.log.writeln(msg);
      },
      exec = require("child_process").exec,
      compilation = options.level.compilation,
      warnings = options.level.warnings,
      sources = options.sources,
      files = "", 
      i = 0,
      sourcemap,
      cmdline
    ;

    for (; i < sources.length; i++) {
      files += " --js " + sources[i];
      grunt.log.writeln("Added source file '" + sources[i] + "'");
    }

    cmdline = "java -jar lib/compiler.jar" + 
      files + 
      " --js_output_file " + options.output + 
      " --warning_level " + warnings + 
      " --compilation_level " + compilation
    ;

    if (options.sourcemap && options.sourcemap.create && options.sourcemap.output) {
      sourcemap = options.sourcemap.output;
      cmdline += " --create_source_map " + sourcemap;
    }
    
    exec(cmdline, function (error, stdout, stderr) {
      var msg = "";
      if (error !== null) {
        msg = "ERRORS: \n" + error;
      } else if (stderr !== "") {
        msg = "WARNINGS: \n" + stderr;
      } 
      
      if(msg !== "") {
        message(msg);
      }

      grunt.log.writeln("Compiled to '" + options.output + "'");
      done();

    });

  });

  grunt.registerMultiTask("revision", "Add version and date", function () {
    var
      compiled,
      src = grunt.file.expandFiles(this.file.src),
      version = grunt.config("pkg.version")
    ;

    src.forEach(function (filepath) {
      compiled = grunt.file.read(filepath);

      compiled = compiled.replace(/@VERSION/g, version).replace("@DATE", function () {
        var date = new Date();
        return [ // YYYY-MM-DD
          date.getFullYear(), 
          date.getMonth() + 1, 
          date.getDate()
        ].join("-");   
       });

      grunt.file.write(filepath, compiled);
      grunt.log.writeln("Versioned '" + filepath + "'");
   });

  });
  
  grunt.registerMultiTask("beautify", "Beautify", function () {

    var 
      beautifyFiles = grunt.file.expandFiles(this.file.src),
      options = this.data.options || {},
      js_beautify = require("./lib/beautify.js").js_beautify,
      js_source_text,
      compiled
    ;
    
     beautifyFiles.forEach(function (filepath) {
       js_source_text = grunt.file.read(filepath);
       compiled = js_beautify(js_source_text, options);

       grunt.file.write(filepath, compiled);
       grunt.log.writeln(compiled);
    });
  });  

  grunt.registerTask("posthook", "Pre Hook.", function() {

    grunt.log.writeln("posthook");

  });

  // Default grunt
  grunt.registerTask("default", ["prehook", "less", "lint", "aggregate", "closure", "revision", "posthook"]);

  // Short list as a dev task
  // $ grunt dev
  grunt.registerTask( "dev", [ "lint" ] );
  //grunt.registerTask( "beautify", ["beautify"] );
};
