var express = require('express');
var config = require('../../config');
var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;
var mime = require('mime');

function spawnFFMPEG(options, req) {
	var ffmpeg = spawn('ffmpeg', options, { cwd: __dirname });

	ffmpeg.stderr.on('data', function (e) { console.log(e.toString()) });
	req.on('close', function () {
		ffmpeg.kill();
	});

	return ffmpeg;
}

module.exports = function () {
	var handler = express.static(config.mediaPath);
	if (config.transcode) {
		handler = function (req, res) {
			var target = path.join(config.mediaPath, decodeURI(req.path));
			var options = ['-i', target, '-f', config.transcode, 'pipe:1'];
			options.splice.apply(options, [options.length - 1, 0].concat(config.transcodeParameters.misc));

			var ffmpeg = spawnFFMPEG(options, req);
			ffmpeg.stdout.pipe(res);

			res.writeHead(200, {
				'Transfer-Encoding': 'chunked',
				'Content-Type': mime.lookup(config.transcode)
			});
		};
	}

	return {
		use: {
			'': handler
		}
	};
};