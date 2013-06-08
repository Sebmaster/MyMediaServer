module.exports = {
	registerController: function registerController(app, name, controller) {
		for (var method in controller) {
			for (var action in controller[method]) {
				app[method](name + '/' + action, controller[method][action]);
			}
		}
	}
};