var express = require('express')
, fs = require('fs')
, config = require('./config')
, proxy = config.proxy
, convert = require('./lib/convert');


var app = express();
app.use(require('./lib/bodyParser'));

// works in a proxy mode, by relaying requests to the underlying container
// implementation, then converting MIME types on the fly

function fetch(section, req, res){
  var target = getTarget(req);
  proxy.get(section)
  .on('complete', function(data, response){
    convert({
      from: response.headers['content-type'],
      to: target,
      body: data
    }, function(err, converted){
      res.header('content-type', target);
      res.end(converted || 'none');
    });
  });


};

app.get('/records/:rId/demographics*', function(req, res, next){
  fetch('demographics', req, res, next);
});

app.get('/records/:rId/medications*', function(req, res, next){
  fetch('medications', req, res, next);
});

app.get('/records/:rId/vital_sign_sets*', function(req, res, next){
  fetch('vital_sign_sets', req, res, next);
});

// works in an explicit conversion mode, where data are POSTed and 
// then converted 
//   * from their native Content-type 
//   * to an Acceptable MIME type.
app.post('/convert/?:rootType?', function(req, res, next){
  var target = getTarget(req);
  convert({
    from: getSource(req),
    to: target,
    body: req.rawBody,
    type: req.params.rootType
  }, function(err, converted){
    res.header('content-type', target);
    res.end(converted || 'none');
  });
});

// get target mime type
function getTarget(req){
  var target = req.headers['accept'].split(',')[0] || config.CLIENT_ACCEPT_DEFAULT;
  if (target === "*/*" || target === "text/html") {
    target = config.CLIENT_ACCEPT_DEFAULT;
  }
  return target;
}

// get source mime type
function getSource(req){
  return req.headers['content-type'].split(',')[0] || config.SERVER_PRODUCTION_DEFAULT
}

app.listen(process.env.VMC_APP_PORT || 3000);;
