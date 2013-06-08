module.exports = {
	mongoUrl: '', // mongo url (no protocol)
	mediaPath: '/media', // root path to media library
	transcode: false, // false, 'webm'
	transcodeParameters: {
		//misc: ['-vb', '1M', '-cpu-used', 2, '-quality', 'good', '-threads', 8] // high cpu usage (i7 quad-core)
		misc: ['-vb', '1M', '-cpu-used', 3, '-quality', 'realtime', '-threads', 4] // medium cpu usage
	},


	trakt: {
		apiKey: 'fe70f53a3f293931235ba7d251583805'
	}
};