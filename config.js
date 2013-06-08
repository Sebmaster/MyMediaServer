module.exports = {
	mongoUrl: '', // mongo url (no protocol)
	mediaPath: '/media', // root path to media library
	transcode: false, // false, 'webm'
	transcodeParameters: ['-vb', '1M'], // -vb = variable bitrate

	trakt: {
		apiKey: 'fe70f53a3f293931235ba7d251583805'
	}
};