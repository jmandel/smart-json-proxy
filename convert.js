var smartContext = require('./fixtures/smart-context.json');
var jsonld = require('./jsonld');

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
      if (s.type === 'ITI')  {
        quad.push("<rdf:Description rdf:about=\""+s.value+"\">");
      } else {
        quad.push("<rdf:Description rdf:nodeID=\""+s.value.slice(2)+"\">");
      }

      if (o.type === 'IRI' || o.type === 'blank node'){
        quad.push("<"+pcurie+" rdf:resource=\""+o.value+"\">");
        quad.push("</"+pcurie+">");
      } else {
        quad.push("<"+pcurie+">");
        quad.push(o.value);
        quad.push("</"+pcurie+">");
      }
      quad.push("</rdf:Description>");

      quads.push( quad.join(""));
    }
  }
  return "<rdf:RDF "+Object.keys(curies).map(function(val){
    return "xmlns:"+curies[val]+"=\""+val+"\"";
  }).join("")+">" + quads.join('') + "</rdf:RDF>";
}

module.exports =  function convert(params, callback){
  console.log("converting", params);

  if (params.from === params.to) {
    return callback(null, params.body);
  }

  if ( params.from === 'application/json' && params.to === 'application/json+ld' ){
    return callback(null, params.body);
  }

  if ( params.from === 'application/json' && params.to === 'application/xml+rdf' ){

    console.log("converting");
    var members = [];
    var input = {'@context': smartContext, '@graph': members};
    
    members.push(params.body.summary);
    delete members[0].index;

    Object.keys(params.body.payload).forEach(function(k){
      members.push(params.body.payload[k]);
    });

    console.log(input);

    return jsonld.toRDF(input, function(err, dataset){
      callback(err, toXML(dataset));
    });
  }

  throw new Exception("no match for content-type");
};
