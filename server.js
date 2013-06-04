var racer = require('racer');
var express = require('express');
var entryManagment = require('./server/entry-managment');

var app = express();
var http = require('http');
var server = http.createServer(app);

racer.use(racer.logPlugin);
racer.use(require('racer-db-mongo'));

var store = racer.createStore({
	listen: server,
	db: {
		type: 'Mongo',
		uri: 'mongodb://'
	}
});

var serverModel = store.createModel();
serverModel.subscribe('entries', function () { });

app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.htm');
});


app.get('/methods/entries/refreshMetadata', function (req, res) {
	entryManagment.refreshMetadata(serverModel, req.query.id);
	res.send(200);
});

app.get('/model', function (req, res) {
	var model = store.createModel();
	model.subscribe('entries', function (err, entries) {
		if (err) {
			res.status(500);
			res.send(err);
		} else {
			model.bundle(function (bundle) {
				res.send(bundle.toString());
			});
		}
	});
});

racer.js({ entry: __dirname + '/racer-angular.js' }, function (err, js) {
	app.get('/script.js', function (req, res) {
		res.type('js');
		res.send(js);
	});
});



server.listen(8081);
