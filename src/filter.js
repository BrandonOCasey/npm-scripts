var config = require('./config');
var path = require('path');
var intercept = require('intercept-stdout');

/**
 * shorten npm-script paths so that we dont print
 * obnoxiously long path strings to terminal
 *
 * @param {string} str
 *        The string to shorten
 *
 * @return {string}
 *         The shortened string
 */
var shorten = function(str) {
	if (!str) {
		return str;
	}

	if (str && str.toString) {
		str = str.toString();
	}
	str = str
		.replace(new RegExp(config.root + path.sep, 'g'), '')
		.replace(new RegExp(config.root, 'g'), '')
		.replace(new RegExp(path.join(__dirname, '..'), 'g'), '<npms>');

	(config.npmScript.presets || []).forEach(function(presetName) {
		str = str
			.replace(new RegExp('<npms>-preset-' + presetName, 'g'), '<npms-' + presetName + '>');
	});

	return str;
};

var filter = function() {
	// shorten stdout and stderr
	return intercept(shorten, shorten);
};

module.exports = filter;