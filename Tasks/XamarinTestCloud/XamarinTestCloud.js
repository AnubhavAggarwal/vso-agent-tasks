﻿var fs = require('fs');
var glob = require('glob');
var path = require('path');
var shell = require('shelljs');
var tl = require('vso-task-lib');

// Get inputs
var app = tl.getInput('app', true);
var dsym = tl.getInput('dsym', false);
var teamApiKey = tl.getInput('teamApiKey', true);
var user = tl.getInput('user', true);
var devices = tl.getInput('devices', true);
var series = tl.getInput('series', true);
var testDir = tl.getInput('testDir', true);
var parallelization = tl.getInput('parallelization', true);
var locale = tl.getInput('locale', true);
var testCloudLocation = tl.getInput('testCloudLocation', true);
var optionalArgs = tl.getInput('optionalArgs', false);

// Output debug information for inputs
tl.debug('app: ' + app);
tl.debug('dsym: ' + dsym);
tl.debug('teamApiKey: ' + teamApiKey);
tl.debug('user: ' + user);
tl.debug('devices: ' + devices);
tl.debug('series: ' + series);
tl.debug('testDir: ' + testDir);
tl.debug('parallelization: ' + parallelization);
tl.debug('locale: ' + locale);
tl.debug('testCloudLocation: ' + testCloudLocation);
tl.debug('optionalArgs: ' + optionalArgs);

// Define error handler
var onError = function (errorMsg) {
    tl.error(errorMsg);
    tl.exit(1);
}

// Resolve apps for the specified value or pattern
if (app.indexOf('*') == -1 && app.indexOf('?') == -1) {
    // Check literal path to a single app file
    if (!fs.existsSync(app)) {
        onError('The specified app file does not exist: ' + app);
    }

    // Use the single specified app file
    var appFiles = [app];
}
else {
    // Find app files matching the specified pattern
    tl.debug('Invoking glob with path: ' + app);
    var appFiles = glob.sync(app);

    // Fail if no matching app files were found
    if (!appFiles || appFiles.length == 0) {
        onError('No matching app files were found with search pattern: ' + app);
    }
}

// Check and add parameter for test assembly directory
if (!shell.test('-d', testDir)) {
    onError('The test assembly directory does not exist: ' + testDir);
}

// Ensure that $testCloudLocation specifies test-cloud.exe (case-sensitive)
if (path.basename(testCloudLocation) != 'test-cloud.exe') {
    throw "test-cloud.exe location must end with '\\test-cloud.exe'."
}

// Locate test-cloud.exe (part of the Xamarin.UITest NuGet package)
if (testCloudLocation.indexOf('*') == -1 && testCloudLocation.indexOf('?') == -1) {
    // Check literal path to test-cloud.exe
    if (!fs.existsSync(testCloudLocation)) {
        onError('test-cloud.exe does not exist at the specified location: ' + testCloudLocation);
    }

    // Use literal path to test-cloud.exe
    var testCloud = testCloudLocation;
}
else {
    // Find test-cloud.exe under the specified directory pattern
    tl.debug('Invoking glob with path: ' + testCloudLocation);
    var testCloudExecutables = glob.sync(testCloudLocation);

    // Fail if not found
    if (!testCloudExecutables || testCloudExecutables.length == 0) {
        onError('test-cloud.exe could not be found with search pattern ' + testCloudLocation);
    }

    // Use first found path to test-cloud.exe
    var testCloud = testCloudExecutables[0];
}

// Find location of mono
var monoPath = tl.which('mono');
if (!monoPath) {
    onError('mono was not found in the path.');
}

// Invoke test-cloud.exe for each app file
var appFileIndex = 0;
var onFailedExecution = function (err) {
    // Error executing
    tl.debug('ToolRunner execution failure: ' + err);
    tl.exit(1);
}
var onSuccessfulExecution = function (code) {
    // Executed successfully
    appFileIndex++;

    if (appFileIndex >= appFiles.length) {
        tl.exit(0); // Done submitting all app files
    }

    // Submit next app file
    submitToTestCloud(appFileIndex);
}
var submitToTestCloud = function (index) {
    // Form basic arguments
    var mdtoolRunner = new tl.ToolRunner(monoPath);
    mdtoolRunner.arg(testCloud);
    mdtoolRunner.arg('submit');
    mdtoolRunner.arg(appFiles[index]);
    mdtoolRunner.arg(teamApiKey);
    mdtoolRunner.arg('--user');
    mdtoolRunner.arg(user);
    mdtoolRunner.arg('--devices');
    mdtoolRunner.arg(devices);
    mdtoolRunner.arg('--series');
    mdtoolRunner.arg('"' + series + '"');
    mdtoolRunner.arg('--locale');
    mdtoolRunner.arg(locale);
    mdtoolRunner.arg('--assembly-dir');
    mdtoolRunner.arg(testDir);
    if (parallelization != 'none') {
        mdtoolRunner.arg(parallelization);
    }
    if (optionalArgs) {
        mdtoolRunner.arg(optionalArgs.split(' '));
    }

    // For an iOS .ipa app, look for an accompanying dSYM file
    if (dsym && path.extname(appFiles[index]) == '.ipa') {
        // Find dSYM files matching the specified pattern
        var dsymPath = path.join(path.dirname(appFiles[index]), dsym);
        tl.debug('Invoking glob with path: ' + dsymPath);
        var dsymFiles = glob.sync(dsymPath);

        // Fail if no matching dSYM files were found in path
        if (!dsymFiles || dsymFiles.length == 0) {
            onError('No matching dSYM files were found with pattern: ' + dsymPath);
        }

        // Fail if more than one dSYM file was found in path
        if (dsymFiles.length > 1) {
            onError('More than one matching dSYM file was found with pattern: ' + dsymPath);
        }

        // Include dSYM file in Test Cloud arguments
        mdtoolRunner.arg('--dsym');
        mdtoolRunner.arg(dsymFiles[0]);
    }

    // Submit to Test Cloud
    tl.debug('Submitting to Xamarin Test Cloud: ' + appFiles[index]);
    mdtoolRunner.exec()
        .then(onSuccessfulExecution)
        .fail(onFailedExecution)
}
submitToTestCloud(appFileIndex);
