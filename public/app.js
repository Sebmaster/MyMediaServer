angular.module('MyMediaServer', ['racer.js', 'ngSanitize']).
	config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
		//$locationProvider.html5Mode(true);

		$routeProvider.
			when('/', { templateUrl: '/partials/home.htm', controller: IndexCtrl, resolve: IndexCtrl.resolve }).
			when('/search', { templateUrl: '/partials/search.htm', controller: SearchCtrl, resolve: SearchCtrl.resolve, reloadOnSearch: false }).
			when('/assign', { templateUrl: '/partials/assign.htm', controller: AssignCtrl, resolve: AssignCtrl.resolve }).
			when('/entries', { templateUrl: '/partials/entry/list.htm', controller: EntryListCtrl, resolve: EntryListCtrl.resolve }).
			when('/entries/:id', { templateUrl: '/partials/entry/details.htm', controller: EntryDetailCtrl, resolve: EntryDetailCtrl.resolve }).
			when('/entries/:id/path', { templateUrl: '/partials/entry/path.htm', controller: EntryPathCtrl, resolve: EntryPathCtrl.resolve }).
			when('/entries/:id/download', { templateUrl: '/partials/entry/download.htm', controller: EntryDownloadCtrl, resolve: EntryDownloadCtrl.resolve }).
			otherwise({ redirectTo: '/' });
	}]).
	filter('transform', ['$parse', function ($parse) {
		return function (array, property) {
			if (!angular.isArray(array) || !property) return array;
			var ret = [];
			var parsed = $parse(property);
			for (var i = 0; i < array.length; ++i) {
				ret[i] = parsed(array[i]);
			}
			return ret;
		};
	}]).
	filter('flatten', ['$parse', function ($parse) {
		return function (array) {
			if (!angular.isArray(array)) return array;
			var ret = [];
			for (var i = 0; i < array.length; ++i) {
				if (ret.indexOf(array[i]) !== -1) continue;

				ret = ret.concat(array[i]);
			}
			return ret;
		};
	}]).
	filter('toArray', ['$parse', function ($parse) {
		return function (array) {
			return _.values(array);
		};
	}]).
	filter('arrayContains', ['$parse', function ($parse) {
		return function (array, needle, prop) {
			if (!angular.isArray(array)) return array;

			var ret = [];
			for (var i = 0; i < array.length; ++i) {
				if (array[i][prop].indexOf(needle) !== -1) {
					ret[ret.length] = array[i];
				}
			}

			return ret;
		};
	}]).
	run(['$rootScope', function ($rootScope) {
		var _title = null;

		$rootScope.$on('$routeChangeSuccess', function () {
			_title = '';
		});

		$rootScope.title = function (title) {
			if (title === undefined) {
				var newTitle = typeof _title === 'function' ? _title() : _title;
				if (!newTitle) {
					newTitle = 'MyMediaServer';
				} else {
					newTitle += ' - MyMediaServer';
				}
				return newTitle;
			}

			if (typeof title === 'string' || typeof title === 'function') {
				_title = title;
			} else {
				throw new Error('title has to be a function or string!');
			}
		};
	}]);

function IndexCtrl($scope) {

}

IndexCtrl.$inject = ['$scope'];

function SearchCtrl($scope, $http, $location, model) {
	var entries = model.get('entries');

	$scope.entryExists = function (provider, id) {
		for (var key in entries) {
			if (entries[key].metadataProvider === provider && entries[key].metadataId == id) {
				return true;
			}
		}
		return false;
	};

	$scope.search = { query: $location.search().query, results: { mal: [], trakt: [], movies: [] } };

	$scope.addToLibrary = function (entry) {
		model.add('entries', {
			title: entry.title,
			paths: [],
			metadataProvider: entry.metadataProvider,
			metadataId: entry.metadataId
		}, function (err) {
			if (err) {
				console.error(err);
				return;
			}
		});
	};

	$scope.$watch('search.query', function (newVal) {
		$location.search('query', $scope.search.query ? $scope.search.query : null);
		$location.replace();

		$scope.search.results = { mal: [], trakt: [], movies: [] };
		if (!$scope.search.query) return;

		$http.get('http://mal-api.com/anime/search?q=' + encodeURIComponent(newVal)).success(function (data) {
			if ($scope.search.query !== newVal) return;
			$scope.search.results.mal = _.map(data, function (entry) {
				return {
					title: entry.title,
					image: entry.image_url,
					metadataProvider: 'mal',
					metadataId: entry.id,
					type: entry.type
				};
			});
		});

		$http.jsonp('http://api.trakt.tv/search/shows.json/' + Config.Trakt.apiKey + '/' + encodeURIComponent(newVal).replace(/%20/g, '+').replace(/%3A/g, ':') + '?callback=JSON_CALLBACK').success(function (data) {
			if ($scope.search.query !== newVal) return;
			$scope.search.results.trakt = _.map(data, function (entry) {
				return {
					title: entry.title,
					image: entry.images.poster,
					metadataProvider: 'trakt',
					metadataId: entry.tvdb_id,
					type: 'Show'
				};
			});
		});

		$http.jsonp('http://api.trakt.tv/search/movies.json/' + Config.Trakt.apiKey + '/' + encodeURIComponent(newVal).replace(/%20/g, '+').replace(/%3A/g, ':') + '?callback=JSON_CALLBACK').success(function (data) {
			if ($scope.search.query !== newVal) return;
			$scope.search.results.movies = _.map(data, function (entry) {
				return {
					title: entry.title,
					image: entry.images.poster,
					metadataProvider: 'trakt-movie',
					metadataId: entry.imdb_id,
					type: 'Movie'
				};
			});
		});
	});
}

SearchCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
SearchCtrl.resolve.model.$inject = ['racer'];

SearchCtrl.$inject = ['$scope', '$http', '$location', 'model'];

function AssignCtrl($scope, $http, $location, model) {
	$scope.entries = model.get('entries');

	var path = $location.search().path;
	if (!path) path = '';

	$http.get('/api/files/list?path=' + encodeURIComponent(path)).success(function (files) {
		$scope.files = _.map(files, function (file) {
			return {
				path: path + file.name,
				name: file.name,
				isDir: file.isDir,
				open: false
			};
		});
	});

	$scope.navigate = function (file) {
		$location.search('path', file.path + '/');
	};

	$scope.toggleEntry = function (file, entry) {
		var idx = entry.paths.indexOf(file.path);
		if (idx === -1) {
			model.push('entries.' + entry.id + '.paths', file.path);
		} else {
			model.remove('entries.' + entry.id + '.paths', idx);
		}
	};
}

AssignCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
AssignCtrl.resolve.model.$inject = ['racer'];

AssignCtrl.$inject = ['$scope', '$http', '$location', 'model'];

function EntryListCtrl($scope, $routeParams, model, $location, $root) {
	$scope.entries = model.get('entries');
	$scope.chooseEntry = function (entry) {
		$location.path('/entries/' + entry.id);
	};

	$root.title('My library');
}

EntryListCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
EntryListCtrl.resolve.model.$inject = ['racer'];

EntryListCtrl.$inject = ['$scope', '$routeParams', 'model', '$location', '$rootScope'];

function EntryDetailCtrl($scope, $routeParams, model, $http, $root) {
	$scope.entry = model.get('entries.' + $routeParams.id);
	$scope.video = null;
	$scope.origin = window.location.protocol + '//' + window.location.host + '/';

	$scope.$watch('entry.id', function () {
		if (!$scope.entry.id) return;

		$http.post('/api/entries/refreshMetadata?id=' + $scope.entry.id);
	});

	$root.title(function () {
		return $scope.entry.title;
	});

	$scope.play = function (episode) {
		$scope.video = { src: episode.path, size: Math.max(window.screen.width, window.screen.height), fallback: 0 };
	};

	$scope.initFlow = function (evt) {
		setTimeout(function () {
			jQuery('.flowplayer').on('error', function () {
				$scope.video.fallback++;

				if ($scope.video.fallback === 2) {
					var vlc = jQuery('<embed type="application/x-vlc-plugin" pluginspage="http://www.videolan.org" version="VideoLAN.VLCPlugin.2" width="100%" height="100%">');
					jQuery(this).html(vlc);

					if (vlc[0].VersionInfo) {
						vlc[0].playlist.add('/stream/' + encodeURI($scope.video.src) + '/webm/?size=' + $scope.video.size, 'Stream', '');
						vlc[0].playlist.add('/stream/' + encodeURI($scope.video.src) + '/hls/?size=' + $scope.video.size, 'Stream', '');
						vlc[0].playlist.add('/stream/' + encodeURI($scope.video.src) + '/flv/?size=' + $scope.video.size, 'Stream', '');
						vlc[0].playlist.play();
					} else {
						$scope.video.fallback++;
						$scope.$apply();
					}
				} else {
					$scope.$apply();
				}
			}).flowplayer();
		}, 0);
	};

	$scope.closeVideo = function (evt) {
		$scope.video = null;
	};
}

EntryDetailCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
EntryDetailCtrl.resolve.model.$inject = ['racer'];

EntryDetailCtrl.$inject = ['$scope', '$routeParams', 'model', '$http', '$rootScope'];

function EntryPathCtrl($scope, $routeParams, model, $http, $root) {
	$scope.entry = model.get('entries.' + $routeParams.id);

	$root.title(function () {
		return 'Paths - ' + $scope.entry.title;
	});

	$scope.$watch('entry.paths', function () {
		if (!$scope.entry.id) return;

		$scope.files = [];
		for (var i = 0; i < $scope.entry.paths.length; ++i) {
			$http.get('/api/files/listRecursive?path=' + encodeURIComponent($scope.entry.paths[i])).success(function (path, files) {
				$scope.files = $scope.files.concat(_.map(files, function (file) {
					var found = null;
					for (var i = 0; i < $scope.entry.seasons.length && !found; ++i) {
						for (var j = 0; j < $scope.entry.seasons[i].episodes.length; ++j) {
							if ($scope.entry.seasons[i].episodes[j].path === path + '/' + file) {
								found = { season: $scope.entry.seasons[i], episode: j + 1 };
								break;
							}
						}
					}

					return {
						file: file,
						path: path + '/' + file,
						beautified: file.replace(/\.|_/g, ' ').replace(/\d+p|\d+x\d+|\[.*?\]|FLAC|Blu-?Ray|\w264/ig, '').replace(/(\(|\[)\s+(\)|\])/g, '').replace(/\s{2,}/g, ' '),
						season: found ? found.season : null,
						episode: found ? found.episode : null
					};
				})).sort();
			}.bind(undefined, $scope.entry.paths[i]));
		}
	}, true);

	$scope.autoAssign = function () {
		if ($scope.entry.seasons.length === 0) return;

		function findSeason(needle) {
			return _.filter($scope.entry.seasons, function (season) { return season.season == needle; })[0];
		}

		var orderedSeasons = _.filter($scope.entry.seasons, function (season) { return season.season != 0; }).sort(function (a, b) { return a.season - b.season; });

		for (var i = 0; i < $scope.files.length; ++i) {
			var file = $scope.files[i];
			if (file.season && file.episode) continue;

			var regex, match;

			if ($scope.assignMethod === 'sxe') {
				match = file.beautified.match(/s?((\d+)(e|x))(\d+)/i);
				if (!match) {
					continue;
				}

				file.season = findSeason(match[2]);
				file.episode = parseInt(match[4], 10);
			} else if ($scope.assignMethod === 'se') {
				match = file.beautified.match(/(\d+)(\d{2})/i);
				if (!match) {
					continue;
				}

				file.season = findSeason(match[1]);
				file.episode = parseInt(match[2], 10);
			} else if ($scope.assignMethod === 'e') {
				match = file.beautified.match(/(\d+)/i);
				if (!match) {
					continue;
				}

				file.season = findSeason($scope.assignSeason);
				file.episode = parseInt(match[1], 10);
			} else if ($scope.assignMethod === 'numbered') {
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
		}
	};

	$scope.applyEpisodes = function () {
		for (var i = 0; i < $scope.files.length; ++i) {
			var file = $scope.files[i];
			if (file.season && file.episode) {
				var j = 0;
				for (; j < $scope.entry.seasons.length; ++j) {
					if ($scope.entry.seasons[j].season === file.season.season) {
						break;
					}
				}
				if (j === $scope.entry.seasons.length ||
					!$scope.entry.seasons[j].episodes[file.episode - 1]) continue;

				model.set('entries.' + $scope.entry.id + '.seasons.' + j + '.episodes.' + (file.episode - 1) + '.path', file.path);
			}
		}
	};
}

EntryPathCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
EntryPathCtrl.resolve.model.$inject = ['racer'];

EntryPathCtrl.$inject = ['$scope', '$routeParams', 'model', '$http', '$rootScope'];

function EntryDownloadCtrl($scope, $routeParams, model, $http, $root) {
	$scope.source = {};
	$scope.entry = model.get('entries.' + $routeParams.id);
	$scope.downloadDir = $scope.entry.downloadDir;
	$scope.previewItems = [];

	$root.title(function () {
		return 'Download - ' + $scope.entry.title;
	});

	$scope.suggest = function () {
		$scope.downloadDir = $scope.entry.title;
	};

	$scope.saveDir = function () {
		var idx = $scope.entry.paths.indexOf($scope.entry.downloadDir);
		if (idx !== -1) {
			model.remove('entries.' + $scope.entry.id + '.paths', idx);
		}
		idx = $scope.entry.paths.indexOf($scope.downloadDir);
		if (idx === -1) {
			model.push('entries.' + $scope.entry.id + '.paths', $scope.downloadDir);
		}
		model.set('entries.' + $routeParams.id + '.downloadDir', $scope.downloadDir);
	};

	$scope.add = function () {
		model.push('entries.' + $routeParams.id + '.sources', $scope.source);
		$scope.source = {};
	};

	$scope.remove = function (idx) {
		model.remove('entries.' + $routeParams.id + '.sources', idx);
	};

	$scope.preview = function () {
		var url = $scope.source.url;
		$http.post('/api/downloads/preview', { url: url }).success(function (data) {
			if (url !== $scope.source.url) return;

			$scope.source.previewItems = data;
		});
	};

	$scope.matchPreview = function (item) {
		if (($scope.source.regex && !item.title.match(new RegExp($scope.source.regex, 'i'))) ||
			($scope.source.category && item.categories.indexOf($scope.source.category) === -1)) {
			return false;
		}

		if ($scope.source.contains) {
			var split = $scope.source.contains.split(' ');
			var lowertitle = item.title.toLowerCase();

			for (var i = 0; i < split.length; ++i) {
				if (lowertitle.indexOf(split[i].toLowerCase()) === -1) {
					return false;
				}
			}
		}

		return true;
	};
}

EntryDownloadCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
EntryDownloadCtrl.resolve.model.$inject = ['racer'];

EntryDownloadCtrl.$inject = ['$scope', '$routeParams', 'model', '$http', '$rootScope'];