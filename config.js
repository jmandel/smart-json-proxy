var events = require('events');
var fs = require('fs');

// just a fixture for now

var fixtures = {
  "medications": require('./fixtures/response/meds.json'),
  "vital_sign_sets": require('./fixtures/response/vitals.json')
};



module.exports.proxy = {
  get: function(url){
    var ee = new events.EventEmitter();
    process.nextTick(function(){
      ee.emit('complete', fixtures[url], {
        responseCode: 200,
        headers: {
          'content-type': 'application/json'
        }
      });
    });
    return ee;
  }
};

module.exports.SERVER_PRODUCTION_DEFAULT = 'application/json';
module.exports.CLIENT_ACCEPT_DEFAULT = 'application/rdf+xml';
module.exports.BACKEND_SERVER = 'http://smart-backend-server';

