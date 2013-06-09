module.exports = {
	mongoUrl: '', // mongo url (no protocol)
	mediaPath: '/media', // root path to media library
	transcode: false, // bool
	transcodeParameters: {
		misc: ['-vb', '1M', '-threads', 4]
	},


	trakt: {
		apiKey: 'fe70f53a3f293931235ba7d251583805'
	}
};