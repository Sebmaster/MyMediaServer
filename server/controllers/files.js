module.exports = function(model) {
	return {
		get: {
			list: function (req, res) {
				var files = [];
				console.log(req.query.path);
				res.json(['abc']);
			}
		}
	};
};