var config = require('./config')
, proxy = config.proxy
, convert = require('./lib/convert')
, argv = require('optimist').argv
, fs = require('fs');

if (argv.data) {
  convert({
    from: argv.from || "application/json",
    to: argv.to || "application/rdf+xml",
    body: fs.readFileSync(argv.data).toString()
  }, function(err, converted){
    console.log(converted || "none");
  });
}

else {
  proxy.get(argv.type || "vital_sign_sets")
  .on('complete', function(data, response){
    convert({
      from: argv.from || "application/json",
      to: argv.to || "application/rdf+xml",
      body: data
    }, function(err, converted){
      console.log(converted || "none");
    });
  });
}

module.exports = convert;

