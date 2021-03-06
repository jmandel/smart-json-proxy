module.exports = function(registry){
  registry({
    from: "application/rdf+xml",
    to: "application/json"
  }, convert);
};

var common = require('./common');
var jsonld = common.jsonld;
var traverse = common.traverse;
jsonld.registerRDFParser('application/rdf+xml', require('../rdfxml/parser').parse);

function convert(params, callback){
  var t0 = new Date().getTime();
  jsonld.fromRDF(params.body,
    {format: 'application/rdf+xml'},
    function(err, js){
      jsonld.flatten(js, common.smartContext, function(err, js){
        if(err){
          console.log("err", JSON.stringify(err));
          return callback(err);
        }
        var i = 0;
        js = collapse(js['@graph'], params.type);
        traverse(common.combine(fixers))(js);
        var t1 = new Date().getTime();
        js = {
          data: js,
          summary: {
            processingTimeMs: t1-t0
          }
        };
        return callback(null, common.pretty(js));
      });
    });
    return;
}

var fixers = [];
fixers.push(RemoveCode);
fixers.push(RemoveVcard);
fixers.push(CastNumbers);
fixers.push(RemoveBnodeLabels);
fixers.push(RemoveTypes);

function collapse(graph, rootType){
  var index = {};
  var ret = [];

  graph.forEach(function(elt){
    index[elt.url] = elt;
    if (common.hasType(elt, rootType)){
      ret.push(elt);
    }
  });

  function embed(path, node){
    if (node && node.url && Object.keys(node).length === 1){
      var id = node.url;
      if (index[id]){
        return index[id];
      }
      return node;
    }

    if (path.length > 0) {
      k = path[path.length-1];
      if (common.smartContext[k] && 
        common.smartContext[k]["@type"] === "@id" &&
        index[node]
      ){
        if (common.hasType(index[node], rootType)){
          return node;
        }
        if (typeof node === "string" && Object.keys(index[node]).length > 1){
          return index[node];
        }
      }
    }
    return node;
  };

  return traverse(embed)(ret);
}

function CastNumbers(path, node){
  if (common.hasType(node, ["ValueAndUnit", "VitalSign"])) {
    try {
      node.value = Number(node.value);
    } catch(ex){ }
  }
};

function RemoveCode(path, node){
  if (common.hasType(node, "CodedValue")){
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

function RemoveVcard(path, node){
  if (!node.type) return;
  if (common.hasType(node, "v:Tel")){
    node.number = node["rdf:value"] || null;
    node.tags = node.type.filter(function(t){
      return (t !== "v:Tel");
    });

    delete node["rdf:value"];
  }
};

function RemoveTypes(path, node){
  if (!common.hasType(node, common.ClinicalStatementTypes)){
    delete node.type;
  }
};
