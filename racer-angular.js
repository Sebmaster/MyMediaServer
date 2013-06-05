var module = angular.module('racer.js', [], function ($provide) {
	function extendObject(from, to) {
		if (from instanceof Array && to instanceof Array) {
			for (var i = 0; i < from.length; ++i) {
				to[i] = extendObject(from[i], to[i]);
			}
			to.splice(from.length, to.length);
		} else if (from instanceof Object && to instanceof Object) {
			for (var key in to) {
				if (typeof from[key] === 'undefined') {
					delete to[key];
				}
			}

			for (var key in from) {
				to[key] = extendObject(from[key], to[key]);
			}
		} else if (from !== to) {
			return from;
		}

		return to;
	}

	var racer = require('racer');

	$provide.factory('racer', ['$http', '$q', '$rootScope', function ($http, $q, $rootScope) {
		$http.get('/model').success(function (data) {
			racer.init(data);
		});

		var def = $q.defer();
		racer.ready(function (model) {
			var paths = {};

			var oldGet = model.get;
			model.get = function (path) {
				if (!paths[path]) {
					paths[path] = oldGet.call(model, path);

					model.on('all', path ? path : '**', function () {
						var newData = oldGet.call(model, path);
						paths[path] = extendObject(newData, paths[path]);
						$rootScope.$apply();
					});
				}

				return paths[path];
			};

			def.resolve(model);
		});

		return def.promise;
	}]);
});