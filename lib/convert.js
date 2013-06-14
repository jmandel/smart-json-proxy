var smartContext = require('../fixtures/smart-context.json');

if (process.title === 'browser') {
  var jsonld = window.jsonld;
} else {
  var jsonld = require('./jsonld');
}

jsonld.registerRDFParser('application/rdf+xml', require('./rdfxml_parser').parse);

var curies = {
  "http://purl.org/dc/terms/": "dcterms",
  "http://xmlns.com/foaf/0.1/": "foaf",
  "http://www.w3.org/2006/vcard/ns#": "v",
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

function RemoveTypes(path, node){
  if (node.type && ClinicalStatementTypes.indexOf(node.type) === -1){
    delete node.type;
  }
};

function AddCode(path, node){
  if (node.type === undefined) {
    return;
  }
  if (node.type.indexOf("CodedValue") !== -1){
    code = {};
    code.url = node.url;
    code.identifier = node.identifier;
    code.system = node.system;
    code.label = node.label;
    code.type = ["Code"];
    delete node.url;
    delete node.identifier;
    delete node.system;
    node.code = code;
  }
};

function RemoveCode(path, node){
  if (node.type && (node.type === "CodedValue" || node.type.indexOf("CodedValue") !== -1)){
    var code = node.code;
    node.url = code.url;
    node.identifier = code.identifier;
    node.system = code.system;
    delete node.code;
  }
};

function RemoveBnodeLabels(path, node){
  if (node.url && !!node.url.match(/^_:/)){
    if (path.length > 0){
      delete node.url;
    }
  }
};

function CastNumbers(path, node){
  if (node.type === "ValueAndUnit") {
    try {
      node.value = Number(node.value);
    } catch(ex){ }
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


var fixersToXml = [];
var fixersToJson = [];

var ClinicalStatementTypes = [
  "MedicalRecord",  "Demographics", "Medication", "VitalSignSet", "Encounter", "Fulfillment", "Allergy", "AllergyExclusion", "LabResult", "Problem", "SocialHistory", "Immunization"];

var domains = [
  ["drugName", "CodedValue"],
  ["frequency", "ValueAndUnit"],
  ["quantityDispensed", "ValueAndUnit"],
  ["quantity", "ValueAndUnit"],
  ["pharmacy", "Pharmacy"],
  ["address", "v:Address"],
  ["name", "v:Name"],
  ["bloodPressure", "BloodPressure"],
  ["bodyPosition", "CodedValue"],
  ["bodySite", "CodedValue"],
  ["systolic", ["VitalSign", "ValueAndUnit"]],
  ["diastolic", ["VitalSign", "ValueAndUnit"]],
  ["height", ["VitalSign", "ValueAndUnit"]],
  ["weight", ["VitalSign", "ValueAndUnit"]],
  ["vitalName", "CodedValue"],
  ["encounterType", "CodedValue"],
  ["provider", "Provider"],
  ["payload", "Response"],
  ["phone", "v:Tel"],
  ["medicalRecordNumber", "Code"]
];


domains.forEach(function(a, i){
  fixersToXml.push(AddType.apply(null, a));
});
fixersToXml.push(AddCode);
fixersToXml.push(Vcard);

fixersToJson.push(RemoveCode);
fixersToJson.push(CastNumbers);
fixersToJson.push(RemoveBnodeLabels);
fixersToJson.push(RemoveTypes);

function traverse(f){
  return function recurse(path, node){
    if (arguments.length === 1){
      node = path;
      path = [];
    }

    if (isArray(node)){
      node.forEach(function(sub, i){
        node[i] = recurse(path, sub);
      });
      return node;
    }

    var ret = f(path, node);
    if (!isObject(ret)){
      return ret; 
    }
    Object.keys(ret).forEach(function(k){
      ret[k] = recurse(path.concat(k), ret[k]);
    });
    return ret;
  }
};

function isArray(v){
  return (Object.prototype.toString.call(v) === '[object Array]');
}

function isObject(v){
  return (Object.prototype.toString.call(v) === '[object Object]');
}

function collapse(graph, follows){
  var index = {};
  var ret = [];

  graph.forEach(function(elt){
    index[elt.url] = elt;
    if (ClinicalStatementTypes.indexOf(elt.type) !== -1){
      ret.push(JSON.parse(JSON.stringify(elt)));
    }
  });

  function followLinks(follow){
    return function(path, node){
      if (node && node.url && Object.keys(node).length === 1){
        var id = node.url;
        if (index[id] && (ClinicalStatementTypes.indexOf(index[id].type) === -1
        || follow === index[id].type && path.length === 1)
        ){
          return JSON.parse(JSON.stringify(index[id]));
        }
        return node;
      }
      if (path.length > 0) {
        k = path[path.length-1];
        if (smartContext[k] && smartContext[k]["@type"] == "@id" && 
          (index[node] && ClinicalStatementTypes.indexOf(index[node].type) === -1 ||
          follow === k && path.length === 1
          )){
            if (typeof node === "string" && Object.keys(index[node]).length > 1){
              return JSON.parse(JSON.stringify(index[node]));
            }
          }
      }
      return node;
    };
  }

  traverse(followLinks(null))(ret);
  /*
  traverse(followLinks('fulfillments'))(ret);
  traverse(followLinks('medication'))(ret);
  */


  return ret;

}

function all(fixers){
  return function(path, node){
    if (!isObject(node)){
      return node;
    }
    fixers.forEach(function(f){
      f(path, node);
    });
    return node;
  };
}

var assignUris = traverse(function(path, node){
  if (ClinicalStatementTypes.indexOf(node.type) !== -1 &&
  node.url.match(/^_:/)) {
    node.url = "uri_"+i++;
  }
  return node;
});


module.exports =  function convert(params, callback){
  function jsonString(v){
    if (typeof v === "string") {
      return v;
    }
    return JSON.stringify(v, null, 2);
  }
  var i = 0;
  if ( params.from === 'application/rdf+xml' && params.to === 'application/json' ){
    jsonld.fromRDF(params.body,
      {format: 'application/rdf+xml'},
      function(err, js){
        jsonld.flatten(js, smartContext, function(err, js){
          if(err) return;
          var js = JSON.parse(JSON.stringify(js));
          var i = 0;
          js = collapse(js['@graph']);
          traverse(all(fixersToJson))(js);
          return callback(null, jsonString(js));
        });
      });
      return;
  }

  if ( params.from === 'application/json' && params.to === 'application/json' ){
    return callback(null, jsonString(params.body));
  }

  if ( params.from === 'application/json' && params.to === 'application/rdf+xml' ){

    if (typeof params.body === "string") {
      params.body = JSON.parse(params.body);
    }

    var members = [];

    [].push.apply(members, params.body.data);

    console.log(members);
    traverse(all(fixersToXml))(members);
    var input = {'@context': smartContext, '@graph': members};
    console.log(jsonString(input))
    console.log(members);
    return jsonld.toRDF(input, function(err, dataset){
      console.log(jsonString(err), dataset);
      callback(err, toXML(dataset));
    });

  }

  throw new Error("no match for content-type " + params.to);
};
