var fs = require('fs');
var glob = require('glob');
var tl = require('vso-task-lib');
var console = require('console');

var testRunner = tl.getInput('testRunner', true);
var testResultsFiles = tl.getInput('testResultsFiles', true);
var mergeResults = tl.getInput('mergeTestResults');

tl.debug('testRunner: ' + testRunner);
tl.debug('testResultsFiles: ' + testResultsFiles);
tl.debug('mergeResults: ' + mergeResults);

var onError = function(errorMsg) {
	tl.error(errorMsg);
	tl.exit(1);
}

//check for pattern in testResultsFiles
if(testResultsFiles.indexOf('*') >= 0 || testResultsFiles.indexOf('?') >= 0) {
	tl.debug('Pattern found in testResultsFiles parameter');
	var matchingTestResultsFiles = glob.sync(testResultsFiles);
	tl.debug('matchingTestResultsFiles = ' + matchingTestResultsFiles);
}
else {
	tl.debug('No pattern found in testResultsFiles parameter');
	var matchingTestResultsFiles = [testResultsFiles];
}

if(!matchingTestResultsFiles) {
	onError('No test results files with search pattern ' + testResultsFiles + ' were found.');
}

console.log('##vso[results.publish type=' + testRunner + ';mergeResults=' + mergeResults + ']' + matchingTestResultsFiles);
