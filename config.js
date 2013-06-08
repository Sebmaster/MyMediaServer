module.exports = {
	mongoUrl: '', // mongo url (no protocol)
	mediaPath: '/media', // root path to media library
	transcode: false, // false, 'webm'
	transcodeParameters: {
		misc: ['-vb', '1M', '-cpu-used', 3, '-quality', 'good', '-threads', 4] // -vb = variable bitrate
	},


	trakt: {
		apiKey: 'fe70f53a3f293931235ba7d251583805'
	}
};