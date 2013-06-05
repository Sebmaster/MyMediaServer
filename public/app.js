angular.module('MyMediaServer', ['racer.js', 'ngSanitize']).
	config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
		//$locationProvider.html5Mode(true);

		$routeProvider.
			when('/', { templateUrl: '/partials/home.htm', controller: IndexCtrl, resolve: IndexCtrl.resolve }).
			when('/search', { templateUrl: '/partials/search.htm', controller: SearchCtrl, resolve: SearchCtrl.resolve }).
			when('/assign', { templateUrl: '/partials/assign.htm', controller: AssignCtrl, resolve: AssignCtrl.resolve }).
			when('/entries', { templateUrl: '/partials/entry/list.htm', controller: EntryListCtrl, resolve: EntryListCtrl.resolve }).
			when('/entries/:id', { templateUrl: '/partials/entry/details.htm', controller: EntryDetailCtrl, resolve: EntryDetailCtrl.resolve }).
			otherwise({redirectTo: '/'});
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
	filter('join', ['$parse', function ($parse) {
		return function (array, joiner) {
			if (!angular.isArray(array)) return array;
			var ret = [];
			for (var i = 0; i < array.length; ++i) {
				ret[i] = joiner[array[i]];
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

function SearchCtrl($scope, $http, model) {
	$scope.search = { query: null, results: { mal: [], trakt: [], movies: [] } };

	$scope.addToLibrary = function (entry) {
		model.add('entries', {
			title: entry.title,
			paths: [],
			metadataProvider: entry.metadataProvider,
			metadataId: entry.metadataId,
			seasons: [],
			episodes: []
		}, function (err) {
			if (err) {
				console.error(err);
				return;
			}
		});
	};

	$scope.$watch('search.query', function (newVal) {
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

		$http.jsonp('http://api.trakt.tv/search/shows.json/' + Trakt.apiKey + '/' + encodeURIComponent(newVal).replace(/%20/g, '+').replace(/%3A/g, ':') + '?callback=JSON_CALLBACK').success(function (data) {
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

		$http.jsonp('http://api.trakt.tv/search/movies.json/' + Trakt.apiKey + '/' + encodeURIComponent(newVal).replace(/%20/g, '+').replace(/%3A/g, ':') + '?callback=JSON_CALLBACK').success(function (data) {
			if ($scope.search.query !== newVal) return;
			$scope.search.results.movies = _.map(data, function (entry) {
				return {
					title: entry.title,
					image: entry.images.poster,
					metadataProvider: 'trakt',
					metadataId: entry.tvdb_id,
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

SearchCtrl.$inject = ['$scope', '$http', 'model'];

function AssignCtrl($scope, $http, $route, model) {
	var entries = model.get('entries');

	function refreshFiles() {
		if ($scope.path[$scope.path.length - 1] === '/') {
			$scope.path = $scope.path.substr(0, $scope.path.length - 1);
		}
		var path = $scope.path;

		$http.get('/methods/files/list').success(function (files) {
			if (path != $scope.path) return;

			$scope.files = [];
			for (var i = 0; i < files.length; ++i) {
				$scope.files[$scope.files.length] = {
					path: $scope.path + '/' + files[i],
					folder: files[i],
					name: files[i].replace(/\.|_/g, ' ').replace(/ {2}/g, ' ').replace(/\d+p|\d+x\d+|\[.*?\]/g, '').replace(/\(\s+\)/g, ''),
					open: false
				};
			}
		});
	}

	$scope.$watch('path', refreshFiles);

	$scope.filterExisting = function (x) {
		for (var i = 0; i < entries.length; ++i) {
			if (entries[i].path === x.path) {
				return false;
			}
		}

		return true;
	};

	$scope.navigate = function (file) {
		$scope.path = file.path;
	};

	//TODO: Add show to library

	$scope.path = '';
}

AssignCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
AssignCtrl.resolve.model.$inject = ['racer'];

AssignCtrl.$inject = ['$scope', '$http', '$route', 'model'];

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
	$scope.search = { query: null, results: { mal: [], trakt: [] } };

	$scope.entry = model.get('entries.' + $routeParams.id);
	$scope.$watch('entry.title', function () {
		$scope.search.query = $scope.entry.title;
	});

	$root.title(function () {
		return $scope.entry.title;
	});
	$scope.$watch('entry.path', function () {
		Meteor.call('findFiles', $scope.entry.path, true, function (err, files) {
			if (err) return;

			$scope.files = [];
			for (var i = 0; i < files.length; ++i) {
				$scope.files[i] = {
					path: files[i],
					beautified: files[i].replace(/\.|_/g, ' ').replace(/ {2}/g, ' ').replace(/\d+p|\d+x\d+|\[.*?\]/g, '').replace(/\(\s+\)/g, '').replace(/\..+$/g, '')
				};
			}

			$scope.$apply();
		});
	});

	$scope.$watch('search.query', function () {
		var query = $scope.search.query;
		if (query === undefined) return;
		/*
		Meteor.call('requestShana', 'ore no imouto', function (err, data) {
			if (err) return console.error(err);

			console.log(data);
		});*/

		$http.get('http://mal-api.com/anime/search?q=' + encodeURIComponent(query)).success(function (data) {
			if ($scope.search.query !== query) return;
			$scope.search.results.mal = data;
		});

		$http.jsonp('http://api.trakt.tv/search/shows.json/' + Trakt.apiKey + '/' + encodeURIComponent(query).replace(/%20/g, '+').replace(/%3A/g, ':') + '?callback=JSON_CALLBACK').success(function (data) {
			if ($scope.search.query !== query) return;
			$scope.search.results.trakt = data;
		});

		$http.jsonp('http://api.trakt.tv/search/movies.json/' + Trakt.apiKey + '/' + encodeURIComponent(query).replace(/%20/g, '+').replace(/%3A/g, ':') + '?callback=JSON_CALLBACK').success(function (data) {
			if ($scope.search.query !== query) return;
			$scope.search.results.movies = data;
		});
	});

	$scope.autoAssign = function () {
		if ($scope.entry.seasons.length === 0) return;

		var regexes = $scope.assignRegex ? [new RegExp($scope.assignRegex, 'i')] : [/S?((\d+)(e|x))(\d+)/i, /()()()(\d+)/i];

		for (var i = 0; i < $scope.files.length; ++i) {
			var file = $scope.files[i];

			for (var j = 0; j < regexes.length; ++j) {
				var match = file.beautified.match(regexes[j]);
				if (!match) continue;

				if (!match[2]) {
					match[2] = 1; // if no season is found, assume first
				} else {
					match[2] = parseInt(match[2], 10);
				}

				file.season = _.filter($scope.entry.seasons, function (season) { return season.season == match[2]; })[0];
				file.episode = parseInt(match[4], 10);
				break;
			}
		}
	};

	$scope.applyEpisodes = function () {

	};

	$scope.chooseTrakt = function (trakt) {
		if (!$scope.entry.metadataProvider) {
			$scope.entry.metadataProvider = 'trakt';
			$scope.entry.metadataId = trakt.tvdb_id;
			$scope.entry.save();

			$http.get('/methods/entries/refreshMetadata?id=' + $scope.entry.id);
		}
	};

	$scope.chooseMovies = function (trakt) {
		if (!$scope.entry.metadataProvider) {
			$scope.entry.metadataProvider = 'trakt-movie';
			$scope.entry.metadataId = trakt.tvdb_id;
			$scope.entry.save();

			$http.get('/methods/entries/refreshMetadata?id=' + $scope.entry.id);
		}
	};

	$scope.chooseMAL = function (mal) {
		if (!$scope.entry.metadataProvider) {
			$scope.entry.metadataProvider = 'mal';
			$scope.entry.metadataId = mal.id;
			$scope.entry.seasons.push({
				season: $scope.entry.seasons.length + 1,
				image: mal.image_url,
				providers: {
					mal: mal.id,
					trakt: null
				}
			});
			$scope.entry.save();

			$http.get('/methods/entries/refreshMetadata?id=' + $scope.entry.id);
		}
	};
}

EntryDetailCtrl.resolve = {
	model: function (racer) {
		return racer;
	}
};
EntryDetailCtrl.resolve.model.$inject = ['racer'];

EntryDetailCtrl.$inject = ['$scope', '$routeParams', 'model', '$http', '$rootScope'];