if (process.title === 'browser') {
  var jsonld = window.jsonld;
} else {
  var jsonld = require('../vendor/jsonld');
}

function pretty(v){
  if (typeof v === "string") {
    return v;
  }
  return JSON.stringify(v, null, 2);
}

var smartContext = require('../generated/smart-context.json');
var DomainsToTypes = require('../generated/domains_to_types');
var ClinicalStatementTypes = require('../generated/clinical_statement_types');

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

function combine(fixers){
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

function intersect(a,b){

  if (a.length > b.length){
    var tmp = a; 
    a = b;
    b = tmp;
  }
   
  var akeys = {};

  a.forEach(function(akey){
    akeys[akey] = true;
  });

  for (var i = 0; i < b.length; i++){
    if (akeys[b[i]]) return true;
  }

  return false;
}

// determine whether a node has any of the types
// specified in 'type' param
function hasType(node, type){
  if (node.type === undefined) {
    return false;
  }

  if (typeof type === "string"){
    type = [type];
  }

  var test = node.type;
  if (typeof test === "string") {
    test = [test];
  }

  return intersect(test, type);
}

module.exports = {
  traverse: traverse,
  isArray: isArray,
  isObject: isObject,
  jsonld: jsonld,
  paths: paths,
  DomainsToTypes: DomainsToTypes,
  ClinicalStatementTypes: ClinicalStatementTypes,
  smartContext: smartContext,
  pretty: pretty,
  combine: combine,
  hasType: hasType
};
