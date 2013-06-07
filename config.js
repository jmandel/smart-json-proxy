var events = require('events');
var fs = require('fs');

// just a fixture for now

var medResponse = require('./fixtures/response/meds.json');

module.exports.proxy = {
  get: function(url){
    console.log(url);
    var ee = new events.EventEmitter();
    process.nextTick(function(){
      console.log('emitting');
      ee.emit('complete', medResponse, {
        responseCode: 200,
        headers: {
          'content-type': 'application/json'
        }
      });
    });
    return ee;
  }
};
