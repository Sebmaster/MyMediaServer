var request = require('request');
var _ = require('underscore');
var config = require('../config.js');

function updateDb(model, entry) {
	entry.lastUpdated = Date.now();
	model.set('entries.' + entry.id, entry);
}

function processTraktRequest(entry, data) {
	entry.image = data.images.poster;
	entry.synopsis = data.overview;
	entry.genres = data.genres;

	entry.seasons = []; //TODO: Merge seasons
	for (var i = 0; i < data.seasons.length; ++i) {
		entry.seasons.push({
			season: data.seasons[i].season,
			image: data.seasons[i].images.poster,
			providers: {
				mal: null,
				trakt: data.tvdb_id
			},
			episodes: _.map(data.seasons[i].episodes, function (episode) {
				return {
					episode: episode.episode,
					title: episode.title,
					synopsis: episode.overview,
					image: episode.screen
				};
			})
		});
	}
}

function processTraktMovie(entry, data) {
	entry.image = data.images.poster;
	entry.synopsis = data.overview;
	entry.genres = data.genres;
}

function processMalRequest(entry, data) {
	entry.synopsis = data.synopsis;
	entry.genres = data.genres;
	entry.image = data.image_url;

	/*
	for (var i = 0; i < data.episodes; ++i) {
		entry.episodes[i] = {
			season: entry.seasons.length,
			episode: i + 1,
			title: null,
			synopsis: null,
			image: null
		};
	}*/
}

exports.refreshMetadata = function (model, id) {
	var entries = {};
	if (id) {
		entries[id] = model.get('entries.' + id);
	} else {
		entries = model.get('entries');
	}

	var maxUpdated = Date.now() - 3600 * 24 * 1000;
	_.forEach(entries, function (entry) {
		if (entry.lastUpdated >= maxUpdated) return;

		if (entry.metadataProvider === 'trakt') {
			request('http://api.trakt.tv/show/summary.json/' + config.trakt.apiKey + '/' + entry.metadataId + '/true/', function (err, resp, data) {
				if (err) throw e;
				data = JSON.parse(data);

				processTraktRequest(entry, data);
				updateDb(model, entry);
			});
		} else if (entry.metadataProvider === 'trakt-movie') {
			request('http://api.trakt.tv/movie/summary.json/' + config.trakt.apiKey + '/' + entry.metadataId, function (err, resp, data) {
				if (err) throw e;
				data = JSON.parse(data);

				processTraktMovie(entry, data);
				updateDb(model, entry);
			});
		} else if (entry.metadataProvider === 'mal') {
			request('http://mal-api.com/anime/' + entry.metadataId, function (err, resp, data) {
				if (err) throw e;
				data = JSON.parse(data);

				processMalRequest(entry, data);
				updateDb(model, entry);
			});
		}

		//TODO: process seasons
	});
};