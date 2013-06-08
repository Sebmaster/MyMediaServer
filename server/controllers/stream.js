var express = require('express');
var config = require('../../config');

module.exports = function () {
	var handler = express.static(config.mediaPath);

	return {
		use: {
			'': handler
		}
	};
};