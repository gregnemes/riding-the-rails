module.exports = function (grunt) {
  require("load-grunt-tasks")(grunt);

  // Prefer node-sass (libsass-style output, closest to existing main.css),
  // but fall back to dart-sass if node-sass can't load (missing native binding).
  let sassImpl;
  let outputStyle = "expanded";
  try {
    sassImpl = require("node-sass");
    outputStyle = "nested";
  } catch (e) {
    sassImpl = require("sass");
    outputStyle = "expanded";
  }

  grunt.initConfig({
    sass: {
      options: {
        implementation: sassImpl,
        outputStyle,
        sourceMap: true,
        sourceMapContents: true
      },
      main: {
        files: {
          "static/css/main.css": "static/scss/main.scss"
        }
      }
    },

    browserSync: {
      dev: {
        bsFiles: {
          // BrowserSync will inject CSS changes without a full page reload
          src: ["static/css/main.css"]
        },
        options: {
          watchTask: true,
          server: {
            baseDir: "."
          },
          open: false,
          notify: false,
          ghostMode: false
        }
      }
    },

    watch: {
      scss: {
        files: ["static/scss/**/*.scss"],
        tasks: ["sass:main"],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.registerTask("build", ["sass:main"]);
  grunt.registerTask("serve", ["sass:main", "browserSync:dev", "watch"]);
  grunt.registerTask("default", ["serve"]);
};


