var fs = require('fs-extra');

function fileExists(file) {
  try  {
    return fs.statSync(file).isFile();
  } catch (error) {
    return false;
  }
}

module.exports = function(context) {
  var q = context.requireCordovaModule('q');
  var glob = context.requireCordovaModule('glob');

  var deferred = q.defer();

  glob('www/locales/android/values-*', function (error, files) {
    if (error) {
      deferred.reject(error);
    } else {
      files.forEach(function (file) {
        var stringFile = file + '/strings.xml';
        if (fileExists(stringFile)) {
          var lang = file.match(/\/values-(.+)$/)[1];
          var distDir = 'platforms/android/res/values-' + lang;

          fs.ensureDirSync(distDir);
          fs.copySync(stringFile, distDir + '/strings.xml', { replace: true });

          console.log('copyFrom: ' + stringFile);
          console.log('copyTo: ' + distDir + '/strings.xml');
        }
      });
      deferred.resolve();
    }
  });

  return deferred.promise;
};
