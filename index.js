var express = require('express')
, fs = require('fs')
, config = require('./config')
, proxy = config.proxy
, convert = require('./convert');

CLIENT_ACCEPT_DEFAULT = 'application/xml+rdf';
BACKEND_SERVER = 'http://smart-backend-server';

var app = express();

app.get('*', function(req, res, next){

  var target = req.headers['accept'] || CLIENT_ACCEPT_DEFAULT;
  if (target === "*/*") {
    target = CLIENT_ACCEPT_DEFAULT;
  }

  proxy.get(BACKEND_SERVER + req.url)
  .on('complete', function(data, response){
    var t1 = new Date().getTime();
    convert({
      from: response.headers['content-type'],
      to: target,
      body: data
    }, function(err, converted){
      console.log(err);
      var t2 = new Date().getTime();
      console.log("dt: " + (t2-t1));
      res.end(converted || 'none');
    });
  });
});

app.listen(3000);
