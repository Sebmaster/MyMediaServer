var express = require('express');
var config = require('../../config');
var path = require('path');
var fs = require('fs');
var temp = require('temp');
var spawn = require('child_process').spawn;
var rimraf = require('rimraf');

function prepareOptionsWebM(target, targetWidth) {
	var options = ['-i', target, '-f', 'webm', '-vf', 'scale=min(' + targetWidth + '\\, iw):-1', 'pipe:1'];
	options.splice.apply(options, [options.length - 1, 0].concat(config.transcodeParameters.misc));
	return options;
}

function prepareOptionsHls(target, targetWidth) {
	var options = ['-i', target, '-vf', 'scale=min(' + targetWidth + '\\, iw):-1',
		'-async', 1, '-acodec', 'libvo_aacenc', '-ac', '2', '-vcodec', 'libx264', '-x264opts', 'level=3.1',
		'-profile:v', 'main', '-preset:v', 'fast', '-flags', '-global_header', '-map', '0', '-f', 'segment',
		'-segment_time', '10', '-segment_list', 'playlist.m3u8', '-segment_format', 'mpegts', '-segment_list_flags', 'live',
		'HLS%05d.ts'];

	options.splice.apply(options, [options.length - 1, 0].concat(config.transcodeParameters.misc));
	return options;
}

function killEncode() {
	for (var target in runningEncodes) {
		var encode = runningEncodes[target];
		if (encode.lastAccess < Date.now() - 30000) {
			encode.ffmpeg.kill();
			rimraf(encode.tmpPath, function () { });
			delete runningEncodes[target];
		}
	}
}

function deliverHLSPath(reqPath, encode, res, retries) {
	var isPlaylist = reqPath.substring(reqPath.length - 4) === 'm3u8';
	var idx = reqPath.lastIndexOf('/hls/');
	fs.readFile(encode.tmpPath + '/' + reqPath.substring(idx + 5), function (err, data) {
		var match;
		if (err || (isPlaylist && (!(match = data.toString().match(/.ts/g)) || match.length < 4))) {
			if (retries) {
				setTimeout(function () {
					deliverHLSPath(reqPath, encode, res, retries - 1);
				}, 1000);
			} else {
				res.send(500);
			}
			return;
		}

		encode.lastAccess = Date.now();
		if (isPlaylist) {
			res.type('application/vnd.apple.mpegurl');
		} else {
			res.type('video/mp2t');
		}
		res.send(206, data);
	});
}

var runningEncodes = [];

setInterval(killEncode, 1000);

module.exports = function () {
	var handler = express.static(config.mediaPath);
	if (config.transcode) {
		handler = function (req, res, next) {
			var targetWidth = req.query.size;

			var uri = decodeURI(req.path);
			var splitted = uri.split('/');
			var idx, codec, target;
			if ((idx = uri.lastIndexOf('/webm/')) !== -1) {
				codec = 'webm';
			} else if ((idx = uri.lastIndexOf('/hls/')) !== -1) {
				codec = 'hls';
			} else if ((idx = uri.lastIndexOf('/flv/')) !== -1) {
				codec = 'flv';
			}

			if (codec) {
				target = path.join(config.mediaPath, uri.substring(0, idx));
			}

			if (codec === 'webm') {
				var options = prepareOptionsWebM(target, targetWidth);

				var ffmpeg = spawn(__dirname + '/ffmpeg', options, { cwd: __dirname });

				req.on('close', function () {
					ffmpeg.kill();
				});

				res.writeHead(200, {
					'Transfer-Encoding': 'chunked',
					'Content-Type': 'video/webm'
				});
				ffmpeg.stdout.pipe(res);
			} else if (codec === 'flv') {
				var options = ['-i', target, '-f', 'flv', '-vf', 'scale=min(' + targetWidth + '\\, iw):-1', '-ar', 44100, 'pipe:1'];
				options.splice.apply(options, [options.length - 1, 0].concat(config.transcodeParameters.misc));

				var ffmpeg = spawn(__dirname + '/ffmpeg', options, { cwd: __dirname });

				req.on('close', function () {
					ffmpeg.kill();
				});

				res.writeHead(200, {
					'Transfer-Encoding': 'chunked',
					'Content-Type': 'video/x-flv'
				});
				ffmpeg.stdout.pipe(res);
			} else if (codec === 'hls') {
				if (runningEncodes[target]) {
					deliverHLSPath(uri, runningEncodes[target], res);
				} else {
					temp.mkdir(null, function (err, tmpPath) {
						if (err) {
							res.send(500);
							return;
						}

						var options = prepareOptionsHls(target, targetWidth);

						var ffmpeg = spawn(__dirname + '/ffmpeg', options, { cwd: tmpPath });
						runningEncodes[target] = { lastAccess: Date.now(), tmpPath: tmpPath, ffmpeg: ffmpeg };

						deliverHLSPath(uri, runningEncodes[target], res, 20);
					});
				}
			} else {
				res.sendfile(path.join(config.mediaPath, uri));
			}
		};
	}

	return {
		use: {
			'': handler
		}
	};
};