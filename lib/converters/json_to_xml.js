module.exports = function(registry){
  registry({
    from: "application/json",
    to: "application/rdf+xml"
  }, convert);
};

var common = require('./common');
var toXML = require('../rdfxml/serializer');
var jsonld = common.jsonld;
var traverse = common.traverse;
var paths = common.paths;

function convert(params, callback){
    if (typeof params.body === "string") {
      params.body = JSON.parse(params.body);
    }

    var members = [];
    [].push.apply(members, params.body.data);

    traverse(common.combine(fixers))(members);
    var input = {'@context': common.smartContext, '@graph': members};
    return jsonld.toRDF(input, function(err, dataset){
      if(err){
        console.log(common.pretty(err), dataset);
      }
      callback(err, toXML(dataset));
    });
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

function AddCode(path, node){
  if (node.type === undefined) {
    return;
  }
  if (common.hasType(node, "CodedValue")){
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

function AddVcard(path, node){
  if (common.hasType(node, "v:Tel")){
    [].push.apply(node.type, node.tags || []);
    node["rdf:value"] = node.number || null;
    delete node.number;
  }
};

var fixers = [];
common.DomainsToTypes.forEach(function(a, i){
  fixers.push(AddType.apply(null, a));
});
fixers.push(AddCode);
fixers.push(AddVcard);
