MyMediaServer
===

MyMediaServer is a simple web-based media server.

Features
---

* manage your media library
* connect metadata (trakt.tv and MyAnimeList) entries to video files
* live transcode and play your files on
	* iOS (HTML5)
	* Safari 6 (HTML5)
	* Chrome (HTML5)
	* Firefox (HTML5)
	* IE (Flash)

How to install
---

1. ```git clone git://github.com/Sebmaster/MyMediaServer.git && cd MyMediaServer && npm i``` (global install is possible too, of course)
2. Edit the config file and customize it to your needs.
3. Install redis and start it.
4. Install ffmpeg and put it in your path, or in ```server/controllers/```.
5. If you want to use the flash fallback, download jwplayer and put ```jwplayer.js``` and ```jwplayer.flash.swf``` into the ```public``` directory.
6. Execute ```npm start``` or ```mymediaserver```.

Planned features
---

* track watched episodes and synchronize with trakt and myanimelist
* schedule automatic downloads