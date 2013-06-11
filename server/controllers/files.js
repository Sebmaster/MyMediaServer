var fs = require('fs');
var walk = require('walk');
var config = require('../../config');
var path = require('path');
var _ = require('lodash');
var Q = require('q');

function isAllowed(targetDir) {
	return targetDir.indexOf(config.mediaPath) === 0;
}

module.exports = function (model) {
	return {
		get: {
			list: function (req, res) {
				var targetDir = path.join(config.mediaPath, req.query.path);
				if (!isAllowed(targetDir)) {
					res.send(403);
					return;
				}

				fs.readdir(targetDir, function (err, files) {
					if (err) {
						res.send(500);
						return;
					}

					Q.all(_.map(files, function (file) {
						return Q.nfcall(fs.stat, targetDir + '/' + file).then(function (stat) {
							return {
								name: file,
								isDir: stat.isDirectory()
							};
						});
					})).then(function (files) {
						res.json(files);
					}).done();
				});
			},

			listRecursive: function (req, res) {
				var targetDir = path.join(config.mediaPath, req.query.path);
				if (!isAllowed(targetDir)) {
					res.send(403);
					return;
				}

				var files = [];
				var walker = walk.walk(targetDir);
				walker.on('file', function (root, stat, next) {
					root = root.substring(targetDir.length);
					if (root[0] === '/') {
						root = root.substring(1);
						root = root + '/';
					}

					files[files.length] = root + stat.name;
					next();
				});

				walker.on('end', function () {
					res.json(files);
				});
			}
		}
	};
};