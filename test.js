var config = require('./config')
, proxy = config.proxy
, convert = require('./lib/convert')
, argv = require('optimist').argv;

proxy.get(argv.type || "vital_sign_sets")
.on('complete', function(data, response){
  convert({
    from: "application/json",
    to: argv.accept || "application/rdf+xml",
    body: data
  }, function(err, converted){
    console.log(converted || "none");
  });
});

module.exports = convert;

