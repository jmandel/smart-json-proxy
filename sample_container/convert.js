(function(e){if("function"==typeof bootstrap)bootstrap("convert",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeConvert=e}else"undefined"!=typeof window?window.convert=e():global.convert=e()})(function(){var define,ses,bootstrap,module,exports;
return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function(process){var smartContext = require('../fixtures/smart-context.json');

if (process.title === 'browser') {
  var jsonld = window.jsonld;
} else {
  var jsonld = require('./jsonld');
}

var curies = {
  "http://smartplatforms.org/terms#": "sp",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf"
};

var newBase = function(){
  count = 0;
  return function(){
    return 'a'+(count++);
  }
}();

function toXML(dataset){
  function toCurie(url){
    var s = Math.max(url.lastIndexOf('#'), url.lastIndexOf('/'));
    var base = url.slice(0, s+1);
    var part = url.slice(s+1);
    if (!(base in curies)) {
      curies[base] = newBase(); 
    }
    return curies[base]+':'+part;
  };

  var quads = [];
  for(var graphName in dataset) {
    var triples = dataset[graphName];
    for(var ti = 0; ti < triples.length; ++ti) {
      var triple = triples[ti];
      if(graphName === '@default') {
        graphName = null;
      }

      var s = triples[ti].subject;
      var p = triples[ti].predicate;
      pcurie = toCurie(p.value);
      var o = triples[ti].object;

      var quad = [];
      if (s.type === 'IRI')  {
        quad.push("<rdf:Description rdf:about=\""+s.value+"\">\n");
      } else {
        quad.push("<rdf:Description rdf:nodeID=\""+s.value.slice(2)+"\">\n");
      }

      if (o.type === 'IRI'){
        quad.push("   <"+pcurie+" rdf:resource=\""+o.value+"\" />");
      } else if (o.type === 'blank node'){
        quad.push("   <"+pcurie+" rdf:nodeID=\""+o.value.slice(2)+"\" />");
      } else {
        quad.push("   <"+pcurie+">");
        quad.push(o.value);
        quad.push("</"+pcurie+">\n");
      }
      quad.push("</rdf:Description>\n");

      quads.push( quad.join(""));
    }
  }
  return "<rdf:RDF "+Object.keys(curies).map(function(val){
    return "xmlns:"+curies[val]+"=\""+val+"\"";
  }).join("\n")+">" + quads.join('') + "</rdf:RDF>";
}

var paths = {
  match: function(input, pattern){
    if (typeof pattern === "string") {
      pattern = [pattern];
    }

    var offset = input.length - pattern.length;
    if (offset < 0){
      return false;
    }

    for (var i=pattern.length-1; i >=0; i--){
      if (pattern[i] !== input[i + offset]){
        return false;
      }
    }

    return true;
  }
};

function AddType(pattern, types){

  if (typeof types === "string") {
    types = [types];
  }

  return function(path, node){
    if (paths.match(path, pattern)){
      node.type = (node.type || []);
      [].push.apply(node.type, types);
    }
  };

};

function Recode(path, node){
  if (node.type === undefined) {
    return;
  }
  if (node.type.indexOf("sp:CodedValue") !== -1){
    code = {};
    code.url = ""+node.url;
    code["dc:identifier"] = node.code;
    code.system = ""+node.system;
    code.label = node.label;
    code.type = ["sp:Code"];
    delete node.url;
    delete node.code;
    delete node.system;
    node.code = code;
  }
};

function Vcard(path, node){
  if (node.type === undefined) {
    return;
  }
  if (node.type.indexOf("v:Tel") !== -1){
    node["rdf:value"] = node.number;
    delete node.number;
  }
};


var matchers = [];

[
  ["drugName", "sp:CodedValue"],
  ["frequency", "sp:ValueAndUnit"],
  ["quantityDispensed", "sp:ValueAndUnit"],
  ["quantity", "sp:ValueAndUnit"],
  ["pharmacy", "sp:Pharmacy"],
  ["address", "v:Address"],
  ["name", "v:Name"],
  ["bloodPressure", "sp:BloodPressure"],
  ["bodyPosition", "sp:CodedValue"],
  ["bodySite", "sp:CodedValue"],
  ["systolic", ["sp:VitalSign", "sp:ValueAndUnit"]],
  ["diastolic", ["sp:VitalSign", "sp:ValueAndUnit"]],
  ["height", ["sp:VitalSign", "sp:ValueAndUnit"]],
  ["weight", ["sp:VitalSign", "sp:ValueAndUnit"]],
  ["vitalName", "sp:CodedValue"],
  ["encounterType", "sp:CodedValue"],
  ["provider", "sp:Provider"],
  ["payload", "sp:Response"],
  ["phone", "v:Tel"],
  ["medicalRecordNumber", "sp:Code"]
  ].forEach(function(a, i){
    matchers.push(AddType.apply(null, a));
  });
  matchers.push(Recode);
  matchers.push(Vcard);



  module.exports =  function convert(params, callback){
    function jsonString(v){
      if (typeof v === "string") {
        return v;
      }
      return JSON.stringify(v, null, 2);
    }

    if (params.from === params.to) {
      return callback(null, jsonString(params.body));
    }

    if ( params.from === 'application/json' && params.to === 'application/json' ){
      return callback(null, jsonString(params.body));
    }

    if ( params.from === 'application/json' && params.to === 'application/rdf+xml' ){

      if (typeof params.body === "string") {
        params.body = JSON.parse(params.body);
      }
      var members = [];
      var input = {'@context': smartContext, '@graph': members};

      members.push(JSON.parse(JSON.stringify(params.body.summary)));
      delete members[0].index;

      Object.keys(params.body.payload).forEach(function(k){
        members.push(params.body.payload[k]);
      });


      function augment(path, node){
        if (arguments.length === 1){
          node = path;
          path = [];
        }
        if (typeof node === "string") return;
        if (typeof node === "number") return;
        if (Object.prototype.toString.call(node) === '[object Array]'){
          node.forEach(function(sub){
            augment(path, sub);
          });
          return;
        }
          matchers.forEach(function(m){
            m(path, node);
          });
        Object.keys(node).forEach(function(k){
          if (!node[k]) return;
          augment(path.concat(k), node[k]);
        });
      }

      augment(input);
      return jsonld.toRDF(input, function(err, dataset){
        callback(err, toXML(dataset));
      });

    }

    throw new Error("no match for content-type " + params.to);
  };

})(require("__browserify_process"))
},{"../fixtures/smart-context.json":3,"./jsonld":4,"__browserify_process":1}],3:[function(require,module,exports){
module.exports={
  "@vocab": "http://smartplatforms.org/terms#",
  "sp": "http://smartplatforms.org/terms#",
  "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "dc":	"http://purl.org/dc/terms/",
  "foaf":	"http://xmlns.com/foaf/0.1/",
  "v": "http://www.w3.org/2006/vcard/ns#",
  "identifier": "dc:identifier",
  "label": "dc:title",
  "url": "@id",
  "system": {"@type": "@id"},
  "type": "@type",
  "homepage": {
    "@id": "http://xmlns.com/foaf/0.1/homepage",
    "@type": "@id"
  },
  "patient": {"@id": "belongsTo", "@type": "@id"},
  "date": "dc:date",
  "additionalName": {"@id": "v:additional-name", "@container": "@set"},
  "familyName": "v:family-name",
  "phone": "v:tel",
  "Cell": "v:Cell",
  "Pref": "v:Pref",
  "Home": "v:Home",
  "Work": "v:Work",
  "Fulfillment":{"@type": "@id"},
  "Fulfillment":{"@type": "@id"},
  "Fulfillment":{"@type": "@id"},
  "Fulfillment":{"@type": "@id"},
  "name": "v:n",
  "email": "v:email",
  "birthdate": "v:bday",
  "deathdate": "v:deathdate",
  "givenName": "v:given-name",
  "address": "v:adr",
  "streetAddress": "v:street-address",
  "extendedAddress": "v:extended-address",
  "region": "v:region",
  "postalCode": "v:postal-code",
  "country": "v:country",
  "locality": "v:country",
  "Medication":{"@type": "@id"},
  "medication":{"@type": "@id"},
  "fulfillments":{"@type": "@id"},
  "encounter":{"@type": "@id"},
  "Fulfillment":{"@type": "@id"},
  "self":{"@type": "@id"},
  "gender": "foaf:gender",
  "medicalRecordNumber": {"@container": "@set"}

}

},{}],4:[function(require,module,exports){

},{}]},{},[2])(2)
});
;