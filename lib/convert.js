var smartContext = require('../fixtures/smart-context.json');

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
  ["payload", "sp:Response"]
  ].forEach(function(a, i){
    matchers.push(AddType.apply(null, a));
  });
  matchers.push(Recode);



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
      process.stderr.write(JSON.stringify(input, null, 2));
      return jsonld.toRDF(input, function(err, dataset){
        callback(err, toXML(dataset));
      });

    }

    throw new Error("no match for content-type " + params.to);
  };
