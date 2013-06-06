var entryManagment = require('../entry-managment');

module.exports = function (model) {
	return {
		post: {
			refreshMetadata: function (req, res) {
				entryManagment.refreshMetadata(model, req.query.id);
				res.send(200);
			}
		}
	};
};