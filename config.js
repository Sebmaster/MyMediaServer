module.exports = {
	mongoUrl: '', // mongo url (no protocol)
	mediaPath: '/media', // root path to media library
	ffmpegPath: 'ffmpeg',
	transcode: false, // bool
	transcodeParameters: {
		bandwidth: '1M',
		misc: ['-threads', 4]
	},


	trakt: {
		apiKey: 'fe70f53a3f293931235ba7d251583805'
	},

	auth: {
		user: 'test',
		password: 'test'
	}
};