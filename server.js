﻿var racer = require('racer');
var express = require('express');
var config = require('./config');
var utils = require('./utils');
var entryManagment = require('./server/entry-managment');

var store = racer.createStore({
	server: server,
	db: require('livedb-mongo')('mongodb://', { safe: true })
});

var serverModel = store.createModel();
serverModel.subscribe('entries', function (err) { });
serverModel.on('insert', '$queries.["entries",{},null].ids', function (idx, id) {
	entryManagment.refreshMetadata(serverModel, id);
});


var app = express();
var http = require('http');
var server = http.createServer(app);

app.use(express.static(__dirname + '/public'));
app.use(require('racer-browserchannel')(store));
app.use(express.bodyParser());

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.htm');
});

app.get('/config.js', function (req, res) {
	res.type('js');
	res.send('var Config = ' + JSON.stringify({ Trakt: config.trakt }));
});

utils.registerController(app, 'files', require('./server/controllers/files')(serverModel));
utils.registerController(app, 'entries', require('./server/controllers/entries')(serverModel));

app.get('/model', function (req, res) {
	var model = store.createModel();
	model.subscribe('entries', function (err, entries) {
		if (err) {
			res.status(500);
			res.send(err);
		} else {
			model.bundle(function (err, bundle) {
				res.send(JSON.stringify(bundle));
			});
		}
	});
});

store.bundle(__dirname + '/racer-angular.js', function (err, js) {
	app.get('/script.js', function (req, res) {
		res.type('js');
		res.send(js);
	});
});

server.listen(8081);
