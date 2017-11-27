var fs = require('fs-extra');
var xcode = require('xcode');

function fileExists(file) {
  try  {
    return fs.statSync(file).isFile();
  } catch (error) {
    return false;
  }
}

function values(object) {
  return Object.keys(object).map(function (k) {
    return object[k];
  });
}

// from: https://github.com/kelvinhokk/cordova-plugin-localization-strings
function writeLocalizationFieldsToXcodeProj(filePaths, groupname, proj) {
  var fileRefSection = proj.pbxFileReferenceSection();
  var fileRefValues = values(fileRefSection);

  if (filePaths.length > 0) {

    // var groupKey;
    var groupKey = proj.findPBXVariantGroupKey({name: groupname});
    if (!groupKey) {
      // findPBXVariantGroupKey with name InfoPlist.strings not found.  creating new group
      var localizableStringVarGroup = proj.addLocalizationVariantGroup(groupname);
      groupKey = localizableStringVarGroup.fileRef;
    }

    filePaths.forEach(function (path) {
      var results = fileRefValues.filter(function (v) {
        return v.path === '"' + path + '"';
      });
      if (Array.isArray(results) && results.length === 0) {
        //not found in pbxFileReference yet
        proj.addResourceFile('Resources/' + path, {variantGroup: true}, groupKey);
      }
    });
  }
}

module.exports = function(context) {
  var q = context.requireCordovaModule('q');
  var glob = context.requireCordovaModule('glob');

  var configXml = fs.readFileSync('config.xml').toString();
  var appName = configXml.match(/<name>(.*)<\/name>/i)[1];
  var projDir = 'platforms/ios/' + appName;
  var pbxProjFile = projDir + '.xcodeproj/project.pbxproj';

  var deferred = q.defer();

  glob('www/locales/ios/*.lproj', function (error, files) {
    if (error) {
      deferred.reject(error);
    } else {
      var stringFiles = [];

      files.forEach(function (file) {
        var stringFile = file + '/InfoPlist.strings';
        if (fileExists(stringFile)) {
          var lang = file.match(/\/([^/]+)\.lproj$/)[1];
          var distDir = projDir + '/Resources/' + lang + '.lproj';

          fs.ensureDirSync(distDir);
          fs.copySync(stringFile, distDir + '/InfoPlist.strings', { replace: true });

          console.log('copyFrom: ' + stringFile);
          console.log('copyTo: ' + distDir + '/InfoPlist.strings');

          stringFiles.push(lang + '.lproj/InfoPlist.strings');
        }
      });

      var proj = xcode.project(pbxProjFile);

      proj.parse(function (err) {
        if (err) {
          deferred.reject(err);
        } else {
          writeLocalizationFieldsToXcodeProj(stringFiles, 'InfoPlist.strings', proj);
          fs.writeFileSync(pbxProjFile, proj.writeSync());

          console.log('ok!!');
          deferred.resolve();
        }
      });

      deferred.resolve();
    }
  });

  return deferred.promise;
};
