var config = require('../../config');
var request = require('request');
var FeedParser = require('feedparser');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');

module.exports = function (model) {
	function findTorrentEntry(entries, torrentId) {
		for (var i = 0; i < entries.length; ++i) {
			if (!entries[i].sources) continue;

			for (var j = 0; j < entries[i].sources.length; ++j) {
				var dl = _.find(entries[i].sources[j].downloads, function (dl) { return dl.torrentId === torrentId; });
				if (dl) {
					return { entry: entries[i], source: entries[i].sources[j], idx: entries[i].sources[j].downloads.indexOf(dl) };
				}
			}
		}

		return null;
	}

	function linkExists(entries, link) {
		for (var i = 0; i < entries.length; ++i) {
			if (!entries[i].sources) continue;

			for (var j = 0; j < entries[i].sources.length; ++j) {
				var dl = _.find(entries[i].sources[j].downloads, function (dl) { return dl.link === link; });
				if (dl) {
					return true;
				}
			}
		}

		return false;
	}

	function assignFiles(entry, source, files) {
		function findSeason(needle) {
			return _.filter(entry.seasons, function (season) { return season.season == needle; })[0];
		}

		var orderedSeasons = _.filter(entry.seasons, function (season) { return season.season != 0; }).sort(function (a, b) { return a.season - b.season; });

		for (var i = 0; i < files.length; ++i) {
			var file = files[i];
			var splitted = file.name.split('/');
			file.beautified = splitted[splitted.length - 1].replace(/\.|_/g, ' ').replace(/\d+p|\d+x\d+|\[.*?\]|FLAC|Blu-?Ray|\w264/ig, '').replace(/(\(|\[)\s+(\)|\])/g, '').replace(/\s{2,}/g, ' ');

			var regex, match;

			if (source.assignMethod === 'sxe') {
				match = file.beautified.match(/s?((\d+)(e|x))(\d+)/i);
				if (!match) {
					continue;
				}

				file.season = findSeason(parseInt(match[2], 10));
				file.episode = parseInt(match[4], 10);
			} else if (source.assignMethod === 'se') {
				match = file.beautified.match(/(\d+)(\d{2})/i);
				if (!match) {
					continue;
				}

				file.season = findSeason(parseInt(match[1], 10));
				file.episode = parseInt(match[2], 10);
			} else if (source.assignMethod === 'e') {
				match = file.beautified.match(/(\d+)/i);
				if (!match) {
					continue;
				}

				file.season = findSeason(parseInt(source.assignSeason));
				file.episode = parseInt(match[1], 10);
			} else if (source.assignMethod === 'numbered') {
				match = file.beautified.match(/(\d+)/i);
				if (!match) {
					continue;
				}
				file.episode = parseInt(match[1], 10);

				var j = 0;
				for (; j < orderedSeasons.length && file.episode > orderedSeasons[j].episodes.length; ++j) {
					file.episode -= orderedSeasons[j].episodes.length;
				}
				if (j === orderedSeasons.length) {
					file.episode = null;
					continue;
				}

				file.season = findSeason(orderedSeasons[j].season);
			}

			if (file.season && file.episode) {
				model.set('entries.' + entry.id + '.seasons.' + entry.seasons.indexOf(file.season) + '.episodes.' + (file.episode - 1) + '.path', path.join(entry.downloadDir, file.name));
			}
		}
	}

	function matchFeedEntry(source, item) {
		if ((source.regex && !item.title.match(new RegExp(source.regex, 'i'))) ||
			(source.category && item.categories.indexOf(source.category) === -1)) {
			return false;
		}

		if (source.contains) {
			var split = source.contains.split(' ');
			var lowertitle = item.title.toLowerCase();

			for (var i = 0; i < split.length; ++i) {
				if (lowertitle.indexOf(split[i].toLowerCase()) === -1) {
					return false;
				}
			}
		}

		return true;
	}

	function downloadSource(entries, entry, source, sourceId) {
		var items = [];

		request(source.url)
			.pipe(new FeedParser())
			.on('error', function (e) {
				console.error(e);
				res.send(500);
			})
			.on('readable', function () {
				var item;

				while (item = this.read()) {
					if (!matchFeedEntry(source, item) || linkExists(entries, item.link)) continue;

					transmission.add(item.link, function (item, err, torrent) {
						if (err) {
							console.error('Error when adding torrent: ' + err);
							return;
						}

						model.push('entries.' + entry.id + '.sources.' + sourceId + '.downloads', { link: item.link, torrentId: torrent.id });
					}.bind(this, item));
				}
			});
	}

	if (config.transmission.username && config.transmission.password) {
		var transmission = new (require('transmission'))(config.transmission);

		setInterval(function () {
			transmission.get(function (err, res) {
				if (err) {
					console.error('transmission error: ' + e);
					return;
				}

				var entries = _.values(model.get('entries'));

				for (var i = 0; i < res.torrents.length; ++i) {
					if (res.torrents[i].leftUntilDone === 0) {
						var entry = findTorrentEntry(entries, res.torrents[i].id);
						if (!entry) continue;

						fs.rename(path.join(config.transmission.downloadDir, res.torrents[i].name), path.join(config.mediaPath, entry.entry.downloadDir, res.torrents[i].name), function (i, err) {
							if (err) {
								console.error('Error when moving files: ' + err);
								return;
							}

							assignFiles(entry.entry, entry.source, res.torrents[i].files);
							model.del('entries.' + entry.entry.id + '.sources.' + entry.entry.sources.indexOf(entry.source) + '.downloads.' + entry.idx + '.torrentId');

							if (config.transmission.removeOnFinish) {
								transmission.remove([res.torrents[i].id], false);
							}
						}.bind(this, i));

					}
				}
			});
		}, config.transmission.refreshInterval);

		setInterval(function () {
			var entries = _.values(model.get('entries'));

			for (var i = 0; i < entries.length; ++i) {
				var entry = entries[i];

				if (entry.downloadDir && entry.sources) {
					for (var j = 0; j < entry.sources.length; ++j) {
						downloadSource(entries, entry, entry.sources[j], j);
					}
				}
			}
		}, config.rssRefresh);
	}

	return {
		post: {
			preview: function (req, res, next) {
				var items = [];

				request(req.body.url)
					.pipe(new FeedParser())
					.on('error', function (e) {
						console.error(e);
						res.send(500);
					})
					.on('readable', function () {
						var item;

						while (item = this.read()) {
							items[items.length] = item;
						}
					})
					.on('end', function () {
						res.json(items.map(function (item) {
							return { title: item.title, categories: item.categories, summary: item.summary };
						}));
					});
			}
		}
	};
};