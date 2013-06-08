var express = require('express');
var config = require('../../config');
var path = require('path');
var spawn = require('child_process').spawn;

module.exports = function () {
	var handler = express.static(config.mediaPath);
	if (config.transcode) {
		handler = function (req, res) {
			var target = path.join(config.mediaPath, decodeURI(req.path));
			var options = ['-re', '-i', target, '-f', config.transcode, 'pipe:1'];
			options.splice.apply(options, [5, 0].concat(config.transcodeParameters));

			var ffmpeg = spawn('ffmpeg', options, { cwd: __dirname });

			res.writeHead(200, {
				'Transfer-Encoding': 'chunked',
				'Content-Type': 'video/' + config.transcode
			});

			ffmpeg.stdout.pipe(res);

			req.on('close', function () {
				ffmpeg.kill();
			});
		};
	}

	return {
		use: {
			'': handler
		}
	};
};