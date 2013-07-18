var request = require('request');
var FeedParser = require('feedparser');

module.exports = function (model) {
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