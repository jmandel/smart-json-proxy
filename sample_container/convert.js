(function(e){if("function"==typeof bootstrap)bootstrap("convert",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeConvert=e}else"undefined"!=typeof window?window.convert=e():global.convert=e()})(function(){var define,ses,bootstrap,module,exports;
return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var common = require('./converters/common');

require('./converters/xml_to_json')(registry);
require('./converters/json_to_xml')(registry);

module.exports =  function convert(params, callback){
  if ( params.from === params.to ){
    if (common.isString(params.body)){
      return callback(null, params.body);
    } else if (common.isObject(params.body)){
      return callback(null, common.pretty(params.body));
    }
  }
  if (registry[params.from] && typeof registry[params.from][params.to] === "function"){
    return registry[params.from][params.to](params, callback);
  }

  throw new Error("no match for " + params.from + "-->" + params.to);
};

function registry(params, f){
  if (!registry[params.from]){
    registry[params.from] = {};
  }
  registry[params.from][params.to] = f;
};

},{"./converters/common":2,"./converters/xml_to_json":3,"./converters/json_to_xml":4}],5:[function(require,module,exports){
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
(function(process){if (process.title === 'browser') {
  var jsonld = window.jsonld;
} else {
  var jsonld = require('../jsonld');
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
  combine: combine
};


})(require("__browserify_process"))
},{"../jsonld":6,"../generated/smart-context.json":7,"../generated/domains_to_types":8,"../generated/clinical_statement_types":9,"__browserify_process":5}],3:[function(require,module,exports){
module.exports = function(registry){
  registry({
    from: "application/rdf+xml",
    to: "application/json"
  }, convert);
};

var common = require('./common');
var jsonld = common.jsonld;
var traverse = common.traverse;
jsonld.registerRDFParser('application/rdf+xml', require('../rdfxml_parser').parse);

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
          traverse(common.combine(fixersToJson))(js);
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

var fixersToJson = [];
fixersToJson.push(RemoveCode);
fixersToJson.push(RemoveVcard);
fixersToJson.push(CastNumbers);
fixersToJson.push(RemoveBnodeLabels);
fixersToJson.push(RemoveTypes);

function collapse(graph, rootType){
  var index = {};
  var ret = [];

  graph.forEach(function(elt){
    index[elt.url] = elt;
    if (elt.type === rootType){
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
      if (common.smartContext[k] && common.smartContext[k]["@type"] == "@id" && index[node]){
        if (index[node].type && index[node].type === rootType){
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
  if (node.type === "ValueAndUnit" || node.type === "VitalSign") {
    try {
      node.value = Number(node.value);
    } catch(ex){ }
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

function RemoveVcard(path, node){
  if (!node.type) return;
  if (node.type === "v:Tel" || node.type.indexOf("v:Tel") !== -1){
    node.number = node["rdf:value"] || null;
    node.tags = node.type.filter(function(t){
      return (t !== "v:Tel");
    });

    delete node["rdf:value"];
  }
};


function RemoveTypes(path, node){
  if (node.type && common.ClinicalStatementTypes.indexOf(node.type) === -1){
    delete node.type;
  }
};


},{"./common":2,"../rdfxml_parser":10}],4:[function(require,module,exports){
module.exports = function(registry){
  registry({
    from: "application/json",
    to: "application/rdf+xml"
  }, convert);
};

var common = require('./common');
var toXML = require('../rdfxml_serializer');
var jsonld = common.jsonld;
var traverse = common.traverse;
var paths = common.paths;

function convert(params, callback){
    if (typeof params.body === "string") {
      params.body = JSON.parse(params.body);
    }

    var members = [];
    [].push.apply(members, params.body.data);

    traverse(common.combine(fixersToXml))(members);
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

function AddVcard(path, node){
  if (node.type === undefined) {
    return;
  }
  if (node.type.indexOf("v:Tel") !== -1){
    [].push.apply(node.type, node.tags || []);
    node["rdf:value"] = node.number || null;
    delete node.number;
  }
};

var fixersToXml = [];

common.DomainsToTypes.forEach(function(a, i){
  fixersToXml.push(AddType.apply(null, a));
});
fixersToXml.push(AddCode);
fixersToXml.push(AddVcard);

},{"./common":2,"../rdfxml_serializer":11}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
module.exports={
  "@vocab": "http://smartplatforms.org/terms#",
  "xsd": "http://www.w3.org/2001/XMLSchema#",
  "sp": "http://smartplatforms.org/terms#",
  "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "dcterms":	"http://purl.org/dc/terms/",
  "foaf":	"http://xmlns.com/foaf/0.1/",
  "v": "http://www.w3.org/2006/vcard/ns#",
  "identifier": "dcterms:identifier",
  "label": "dcterms:title",
  "url": "@id",
  "type": "@type",
  "patient": {"@id": "belongsTo", "@type": "@id"},
  "hasStatement": {"@type": "@id"},
  "date": "dcterms:date",
  "additionalName": {"@id": "v:additional-name", "@container": "@set"},
  "familyName": "v:family-name",
  "phone": "v:tel",
  "Cell": "v:Cell",
  "Pref": "v:Pref",
  "Home": "v:Home",
  "Work": "v:Work",
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
  "locality": "v:locality",
  "Medication":{"@type": "@id"},
  "medication":{"@type": "@id"},
  "fulfillment":{"@type": "@id", "@contianer": "@set"},
  "encounter":{"@type": "@id"},
  "Fulfillment":{"@type": "@id"},
  "self":{"@type": "@id"},
  "gender": "foaf:gender",
  "medicalRecordNumber": {"@container": "@set"}
}

},{}],8:[function(require,module,exports){
module.exports = [
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



},{}],9:[function(require,module,exports){
module.exports = [
  "MedicalRecord",
  "Demographics",
  "Medication",
  "VitalSignSet",
  "Encounter",
  "Fulfillment",
  "Allergy",
  "AllergyExclusion",
  "LabResult",
  "Problem",
  "SocialHistory",
  "Immunization"
];

},{}],11:[function(require,module,exports){
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

module.exports = toXML;

},{}],10:[function(require,module,exports){
(function(process){/**
* @fileoverview
* TABULATOR RDF PARSER
*
* Version 0.1
*  Parser believed to be in full positive RDF/XML parsing compliance
*  with the possible exception of handling deprecated RDF attributes
*  appropriately. Parser is believed to comply fully with other W3C
*  and industry standards where appropriate (DOM, ECMAScript, &c.)
*
*  Author: David Sheets <dsheets@mit.edu>
*  SVN ID: $Id$
*
* W3C® SOFTWARE NOTICE AND LICENSE
* http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
* This work (and included software, documentation such as READMEs, or
* other related items) is being provided by the copyright holders under
* the following license. By obtaining, using and/or copying this work,
* you (the licensee) agree that you have read, understood, and will
* comply with the following terms and conditions.
* 
* Permission to copy, modify, and distribute this software and its
* documentation, with or without modification, for any purpose and
* without fee or royalty is hereby granted, provided that you include
* the following on ALL copies of the software and documentation or
* portions thereof, including modifications:
* 
* 1. The full text of this NOTICE in a location viewable to users of
* the redistributed or derivative work.
* 2. Any pre-existing intellectual property disclaimers, notices, or terms and
* conditions. If none exist, the W3C Software Short Notice should be
* included (hypertext is preferred, text is permitted) within the body
* of any redistributed or derivative code.
* 3. Notice of any changes or modifications to the files, including the
* date changes were made. (We recommend you provide URIs to the location
* from which the code is derived.)
* 
* THIS SOFTWARE AND DOCUMENTATION IS PROVIDED "AS IS," AND COPYRIGHT
* HOLDERS MAKE NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED,
* INCLUDING BUT NOT LIMITED TO, WARRANTIES OF MERCHANTABILITY OR FITNESS
* FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE SOFTWARE OR
* DOCUMENTATION WILL NOT INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS,
* TRADEMARKS OR OTHER RIGHTS.
* 
* COPYRIGHT HOLDERS WILL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL
* OR CONSEQUENTIAL DAMAGES ARISING OUT OF ANY USE OF THE SOFTWARE OR
* DOCUMENTATION.
* 
* The name and trademarks of copyright holders may NOT be used in
* advertising or publicity pertaining to the software without specific,
* written prior permission. Title to copyright in this software and any
* associated documentation will at all times remain with copyright
* holders.
*/
/**
* @class Class defining an RDFParser resource object tied to an RDFStore
*  
* @author David Sheets <dsheets@mit.edu>
* @version 0.1
* 
* @constructor
* @param {RDFStore} store An RDFStore object
*/

var URIJoin = function (given, base) {
  var baseHash = base.indexOf('#')
  if (baseHash > 0) base = base.slice(0, baseHash)
    if (given.length==0) return base // before chopping its filename off
  if (given.indexOf('#')==0) return base + given
  var colon = given.indexOf(':')
  if (colon >= 0) return given	// Absolute URI form overrides base URI
  var baseColon = base.indexOf(':')
  if (base == "") return given;
  if (baseColon < 0) {
    throw "Invalid Base URI";
  }
  var baseScheme = base.slice(0,baseColon+1)  // eg http:
  if (given.indexOf("//") == 0)     // Starts with //
    return baseScheme + given;
  if (base.indexOf('//', baseColon)==baseColon+1) {  // Any hostpart?
    var baseSingle = base.indexOf("/", baseColon+3)
    if (baseSingle < 0) {
      if (base.length-baseColon-3 > 0) {
        return base + "/" + given
      } else {
        return baseScheme + given
      }
    }
  } else {
    var baseSingle = base.indexOf("/", baseColon+1)
    if (baseSingle < 0) {
      if (base.length-baseColon-1 > 0) {
        return base + "/" + given
      } else {
        return baseScheme + given
      }
    }
  }

  if (given.indexOf('/') == 0)	// starts with / but not //
    return base.slice(0, baseSingle) + given

  var path = base.slice(baseSingle)
  var lastSlash = path.lastIndexOf("/")
  if (lastSlash <0) return baseScheme + given
  if ((lastSlash >=0) && (lastSlash < (path.length-1)))
    path = path.slice(0, lastSlash+1) // Chop trailing filename from base

  path = path + given
  while (path.match(/[^\/]*\/\.\.\//)) // must apply to result of prev
    path = path.replace( /[^\/]*\/\.\.\//, '') // ECMAscript spec 7.8.5
      path = path.replace( /\.\//g, '') // spec vague on escaping
        path = path.replace( /\/\.$/, '/' )
      return base.slice(0, baseSingle) + path
}

var RDFParser = function (store) {
  var RDFParser = {};

  /** Standard namespaces that we know how to handle @final
  *  @member RDFParser
  */
  RDFParser['ns'] = {'RDF':
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    'RDFS':
    "http://www.w3.org/2000/01/rdf-schema#"}
    /** DOM Level 2 node type magic numbers @final
    *  @member RDFParser
    */
    RDFParser['nodeType'] = {'ELEMENT': 1, 'ATTRIBUTE': 2, 'TEXT': 3,
      'CDATA_SECTION': 4, 'ENTITY_REFERENCE': 5,
      'ENTITY': 6, 'PROCESSING_INSTRUCTION': 7,
      'COMMENT': 8, 'DOCUMENT': 9, 'DOCUMENT_TYPE': 10,
      'DOCUMENT_FRAGMENT': 11, 'NOTATION': 12}

      /**
      * Frame class for namespace and base URI lookups
      * Base lookups will always resolve because the parser knows
      * the default base.
      *
      * @private
      */
      this['frameFactory'] = function (parser, parent, element) {
        return {'NODE': 1,
          'ARC': 2,
          'parent': parent,
          'parser': parser,
          'store': parser['store'],
          'element': element,
          'lastChild': 0,
          'base': null,
          'lang': null,
          'node': null,
          'nodeType': null,
          'listIndex': 1,
          'rdfid': null,
          'datatype': null,
          'collection': false,

          /** Terminate the frame and notify the store that we're done */
          'terminateFrame': function () {
            if (this['collection']) {
              this['node']['close']()
            }
          },

          /** Add a symbol of a certain type to the this frame */
          'addSymbol': function (type, uri) {
            uri = URIJoin(uri, this['base'])
            this['node'] = this['store']['sym'](uri)
            this['nodeType'] = type
          },

          /** Load any constructed triples into the store */
          'loadTriple': function () {
            if (this['parent']['parent']['collection']) {
              this['parent']['parent']['node']['append'](this['node'])
            }
            else {
              this['store']['add'](this['parent']['parent']['node'],
                this['parent']['node'],
                this['node'],
              this['parser']['why'])
            }
            if (this['parent']['rdfid'] != null) { // reify
              var triple = this['store']['sym'](
                URIJoin("#"+this['parent']['rdfid'],
                this['base']))
                this['store']['add'](triple,
                  this['store']['sym'](
                    RDFParser['ns']['RDF']
                  +"type"),
                  this['store']['sym'](
                    RDFParser['ns']['RDF']
                  +"Statement"),
                this['parser']['why'])
                this['store']['add'](triple,
                  this['store']['sym'](
                    RDFParser['ns']['RDF']
                  +"subject"),
                  this['parent']['parent']['node'],
                this['parser']['why'])
                this['store']['add'](triple,
                  this['store']['sym'](
                    RDFParser['ns']['RDF']
                  +"predicate"),
                  this['parent']['node'],
                this['parser']['why'])
                this['store']['add'](triple,
                  this['store']['sym'](
                    RDFParser['ns']['RDF']
                  +"object"),
                  this['node'],
                this['parser']['why'])
            }
          },

          /** Check if it's OK to load a triple */
          'isTripleToLoad': function () {
            return (this['parent'] != null
              && this['parent']['parent'] != null
              && this['nodeType'] == this['NODE']
              && this['parent']['nodeType'] == this['ARC']
              && this['parent']['parent']['nodeType']
            == this['NODE'])
          },

          /** Add a symbolic node to this frame */
          'addNode': function (uri) {
            this['addSymbol'](this['NODE'],uri)
            if (this['isTripleToLoad']()) {
              this['loadTriple']()
            }
          },

          /** Add a collection node to this frame */
          'addCollection': function () {
            this['nodeType'] = this['NODE']
            this['node'] = this['store']['collection']()
            this['collection'] = true
            if (this['isTripleToLoad']()) {
              this['loadTriple']()
            }
          },

          /** Add a collection arc to this frame */
          'addCollectionArc': function () {
            this['nodeType'] = this['ARC']
          },

          /** Add a bnode to this frame */
          'addBNode': function (id) {
            if (id != null) {
              if (this['parser']['bnodes'][id] != null) {
                this['node'] = this['parser']['bnodes'][id]
              } else {
                this['node'] = this['parser']['bnodes'][id] = this['store']['bnode']()
              }
            } else { this['node'] = this['store']['bnode']() }

            this['nodeType'] = this['NODE']
            if (this['isTripleToLoad']()) {
              this['loadTriple']()
            }
          },

          /** Add an arc or property to this frame */
          'addArc': function (uri) {
            if (uri == RDFParser['ns']['RDF']+"li") {
              uri = RDFParser['ns']['RDF']+"_"+this['parent']['listIndex']++
            }
          this['addSymbol'](this['ARC'], uri)
          },

          /** Add a literal to this frame */
          'addLiteral': function (value) {
            if (this['parent']['datatype']) {
              this['node'] = this['store']['literal'](
                value, "", this['store']['sym'](
                this['parent']['datatype']))
            }
            else {
              this['node'] = this['store']['literal'](
              value, this['lang'])
            }
            this['nodeType'] = this['NODE']
            if (this['isTripleToLoad']()) {
              this['loadTriple']()
            }
          }
        }
      }

      //from the OpenLayers source .. needed to get around IE problems.
      this['getAttributeNodeNS'] = function(node, uri, name) {
        var attributeNode = null;
        if(node.getAttributeNodeNS) {
          attributeNode = node.getAttributeNodeNS(uri, name);
        } else {
          var attributes = node.attributes;
          var potentialNode, fullName;
          for(var i=0; i<attributes.length; ++i) {
            potentialNode = attributes[i];
            if(potentialNode.namespaceURI == uri) {
              fullName = (potentialNode.prefix) ?
              (potentialNode.prefix + ":" + name) : name;
              if(fullName == potentialNode.nodeName) {
                attributeNode = potentialNode;
                break;
              }
            }
          }
        }
        return attributeNode;
      }

      /** Our triple store reference @private */
      this['store'] = store
      /** Our identified blank nodes @private */
      this['bnodes'] = {}
      /** A context for context-aware stores @private */
      this['why'] = null
      /** Reification flag */
      this['reify'] = false

      /**
      * Build our initial scope frame and parse the DOM into triples
      * @param {DOMTree} document The DOM to parse
      * @param {String} base The base URL to use 
      * @param {Object} why The context to which this resource belongs
      */
      this['parse'] = function (document, base, why) {
        var children = document['childNodes']

        // clean up for the next run
        this['cleanParser']()

        // figure out the root element
        //var root = document.documentElement; //this is faster, I think, cross-browser issue? well, DOM 2
        if (document['nodeType'] == RDFParser['nodeType']['DOCUMENT']) {
          for (var c=0; c<children['length']; c++) {
            if (children[c]['nodeType']
            == RDFParser['nodeType']['ELEMENT']) {
              var root = children[c]
              break
            }
          }	    
        }
        else if (document['nodeType'] == RDFParser['nodeType']['ELEMENT']) {
          var root = document
        }
        else {
          throw new Error("RDFParser: can't find root in " + base
          + ". Halting. ");
        }

        this['why'] = why


        // our topmost frame

        var f = this['frameFactory'](this)
        this['base'] = base
        f['base'] = base
        f['lang'] = ''

        this['parseDOM'](this['buildFrame'](f,root))
        return true
      }
      this['parseDOM'] = function (frame) {
        // a DOM utility function used in parsing
        var elementURI = function (el) {
          var result = "";
          if( el['namespaceURI'] ) {
            result = result + el['namespaceURI'];
          }
          if( el['localName'] ) {
            result = result + el['localName'];
          } else if( el['nodeName'] ) {
            if(el['nodeName'].indexOf(":")>=0)
              result = result + el['nodeName'].split(":")[1];
            else
              result = result + el['nodeName'];
          }
          return result;
        }
        var dig = true // if we'll dig down in the tree on the next iter

        while (frame['parent']) {
          var dom = frame['element']
          var attrs = dom['attributes']

          if (dom['nodeType']
            == RDFParser['nodeType']['TEXT']
            || dom['nodeType']
          == RDFParser['nodeType']['CDATA_SECTION']) {//we have a literal
            frame['addLiteral'](dom['nodeValue'])
          }
          else if (elementURI(dom)
          != RDFParser['ns']['RDF']+"RDF") { // not root
            if (frame['parent'] && frame['parent']['collection']) {
              // we're a collection element
              frame['addCollectionArc']()
              frame = this['buildFrame'](frame,frame['element'])
              frame['parent']['element'] = null
            }
            if (!frame['parent'] || !frame['parent']['nodeType']
            || frame['parent']['nodeType'] == frame['ARC']) {
              // we need a node
              var about =this['getAttributeNodeNS'](dom,
              RDFParser['ns']['RDF'],"about")
              var rdfid =this['getAttributeNodeNS'](dom,
              RDFParser['ns']['RDF'],"ID")
              if (about && rdfid) {
                throw new Error("RDFParser: " + dom['nodeName']
                  + " has both rdf:id and rdf:about."
                  + " Halting. Only one of these"
                  + " properties may be specified on a"
                + " node.");
              }
              if (about == null && rdfid) {
                frame['addNode']("#"+rdfid['nodeValue'])
                dom['removeAttributeNode'](rdfid)
              }
              else if (about == null && rdfid == null) {
                var bnid = this['getAttributeNodeNS'](dom,
                RDFParser['ns']['RDF'],"nodeID")
                if (bnid) {
                  frame['addBNode'](bnid['nodeValue'])
                  dom['removeAttributeNode'](bnid)
                } else { frame['addBNode']() }
              }
              else {
                frame['addNode'](about['nodeValue'])
                dom['removeAttributeNode'](about)
              }

              // Typed nodes
              var rdftype = this['getAttributeNodeNS'](dom,
              RDFParser['ns']['RDF'],"type")
              if (RDFParser['ns']['RDF']+"Description"
                != elementURI(dom)) {
                  rdftype = {'nodeValue': elementURI(dom)}
                }
                if (rdftype != null) {
                  this['store']['add'](frame['node'],
                    this['store']['sym'](
                    RDFParser['ns']['RDF']+"type"),
                    this['store']['sym'](
                      URIJoin(
                        rdftype['nodeValue'],
                      frame['base'])),
                  this['why'])
                  if (rdftype['nodeName']){
                    dom['removeAttributeNode'](rdftype)
                  }
                }

                // Property Attributes
                for (var x = attrs['length']-1; x >= 0; x--) {
                  this['store']['add'](frame['node'],
                    this['store']['sym'](
                      elementURI(attrs[x])),
                      this['store']['literal'](
                        attrs[x]['nodeValue'],
                      frame['lang']),
                  this['why'])
                }
            }
            else { // we should add an arc (or implicit bnode+arc)
              frame['addArc'](elementURI(dom))

              // save the arc's rdf:ID if it has one
              if (this['reify']) {
                var rdfid = this['getAttributeNodeNS'](dom,
                RDFParser['ns']['RDF'],"ID")
                if (rdfid) {
                  frame['rdfid'] = rdfid['nodeValue']
                  dom['removeAttributeNode'](rdfid)
                }
              }

              var parsetype = this['getAttributeNodeNS'](dom,
              RDFParser['ns']['RDF'],"parseType")
              var datatype = this['getAttributeNodeNS'](dom,
              RDFParser['ns']['RDF'],"datatype")
              if (datatype) {
                frame['datatype'] = datatype['nodeValue']
                dom['removeAttributeNode'](datatype)
              }

              if (parsetype) {
                var nv = parsetype['nodeValue']
                if (nv == "Literal") {
                  frame['datatype']
                  = RDFParser['ns']['RDF']+"XMLLiteral"
                  // (this.buildFrame(frame)).addLiteral(dom)
                  // should work but doesn't
                  frame = this['buildFrame'](frame)
                  frame['addLiteral'](dom)
                  dig = false
                }
                else if (nv == "Resource") {
                  frame = this['buildFrame'](frame,frame['element'])
                  frame['parent']['element'] = null
                  frame['addBNode']()
                }
                else if (nv == "Collection") {
                  frame = this['buildFrame'](frame,frame['element'])
                  frame['parent']['element'] = null
                  frame['addCollection']()
                }
                dom['removeAttributeNode'](parsetype)
              }

              if (attrs['length'] != 0) {
                var resource = this['getAttributeNodeNS'](dom,
                RDFParser['ns']['RDF'],"resource")
                var bnid = this['getAttributeNodeNS'](dom,
                RDFParser['ns']['RDF'],"nodeID")

                frame = this['buildFrame'](frame)
                if (resource) {
                  frame['addNode'](resource['nodeValue'])
                  dom['removeAttributeNode'](resource)
                } else {
                  if (bnid) {
                    frame['addBNode'](bnid['nodeValue'])
                    dom['removeAttributeNode'](bnid)
                  } else { frame['addBNode']() }
                }

                for (var x = attrs['length']-1; x >= 0; x--) {
                  var f = this['buildFrame'](frame)
                  f['addArc'](elementURI(attrs[x]))
                  if (elementURI(attrs[x])
                  ==RDFParser['ns']['RDF']+"type"){
                    (this['buildFrame'](f))['addNode'](
                    attrs[x]['nodeValue'])
                  } else {
                    (this['buildFrame'](f))['addLiteral'](
                    attrs[x]['nodeValue'])
                  }
                }
              }
              else if (dom['childNodes']['length'] == 0) {
                (this['buildFrame'](frame))['addLiteral']("")
              }
            }
          } // rdf:RDF

          // dig dug
          dom = frame['element']
          while (frame['parent']) {
            var pframe = frame
            while (dom == null) {
              frame = frame['parent']
              dom = frame['element']
            }
            // candidate is sometimes null with xmldom.
            // Added explicit check here without
            // understanding the consequences! 
            // -JCM
            var candidate = dom['childNodes'];
            if (candidate !== null) {
              candidate = candidate[frame['lastChild']];
            }
            if (candidate == null || !dig) {
              frame['terminateFrame']()
              if (!(frame = frame['parent'])) { break } // done
              dom = frame['element']
              dig = true
            }
            else if ((candidate['nodeType']
              != RDFParser['nodeType']['ELEMENT']
              && candidate['nodeType']
              != RDFParser['nodeType']['TEXT']
              && candidate['nodeType']
            != RDFParser['nodeType']['CDATA_SECTION'])
            || ((candidate['nodeType']
              == RDFParser['nodeType']['TEXT']
              || candidate['nodeType']
            == RDFParser['nodeType']['CDATA_SECTION'])
            && dom['childNodes']['length'] != 1)) {
              frame['lastChild']++
            }
          else { // not a leaf
            frame['lastChild']++
              frame = this['buildFrame'](pframe,
              dom['childNodes'][frame['lastChild']-1])
              break
          }
          }
        } // while
      }

      /**
      * Cleans out state from a previous parse run
      * @private
      */
      this['cleanParser'] = function () {
        this['bnodes'] = {}
        this['why'] = null
      }

      /**
      * Builds scope frame 
      * @private
      */
      this['buildFrame'] = function (parent, element) {
        var frame = this['frameFactory'](this,parent,element)
        if (parent) {
          frame['base'] = parent['base']
          frame['lang'] = parent['lang']
        }
        if (element == null
          || element['nodeType'] == RDFParser['nodeType']['TEXT']
        || element['nodeType'] == RDFParser['nodeType']['CDATA_SECTION']) {
          return frame
        }

        var attrs = element['attributes']

        var base = element['getAttributeNode']("xml:base")
        if (base != null) {
          frame['base'] = base['nodeValue']
          element['removeAttribute']("xml:base")
        }
        var lang = element['getAttributeNode']("xml:lang")
        if (lang != null) {
          frame['lang'] = lang['nodeValue']
          element['removeAttribute']("xml:lang")
        }

        // remove all extraneous xml and xmlns attributes
        for (var x = attrs['length']-1; x >= 0; x--) {
          if (attrs[x]['nodeName']['substr'](0,3) == "xml") {
            if (attrs[x].name.slice(0,6)=='xmlns:') {
              var uri = attrs[x].nodeValue;
              if (this.base) uri = URIJoin(uri, this.base);
              this.store.setPrefixForURI(attrs[x].name.slice(6),
              uri);
            }
            element['removeAttributeNode'](attrs[x])
          }
        }
        return frame
      }
}

var createXMLDocument = function(string) {
  var parser, xmlDoc;
  if (process.title === 'node') {
    parser = require('xmldom').DOMParser;
    parser = new parser();
    xmlDoc = parser.parseFromString(string, 'text/xml');
  }
  else if (window.DOMParser)
  {
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(string, 'text/xml');
  }
  else if (window.ActiveXObject)
  {
    xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
    xmlDoc.async = 'false';
    xmlDoc.loadXML(string);
  } 
  return xmlDoc;
};

var RDFStore = function(default_graph) {
  this.statements = [];
  this.namespaces = {};

  this.add = function(s,p,o) {
    this.statements.push({subject: s, predicate: p, object: o, graph: default_graph});
  };

  this.sym = function(x) {
    return {type: 'IRI', value: x};
  };

  this.literal = function(str, lang, datatype) {
    str = str.replace(/\\/g, '\\\\');  // escape backslashes
    str = str.replace(/\"/g, '\\"');    // escape quotes
    str = str.replace(/\n/g, '\\n');    // escape newlines
  
    var ret = {
      type: 'literal',
      value: str,
      datatype: 'http://www.w3.org/2001/XMLSchema#string'
    };

    if (datatype){
      ret.datatype = datatype.value;
    }
    if (lang) {
      ret.language = lang;
    }
    return ret;
  };

  var _id = 0;
  this.bnode = function(id) {
    id = id || "_:bnid" + _id++;
    return {type: 'blank node', value: id}
  };

  this.setPrefixForURI = function(prefix, nsuri) {
    if (this.namespaces[prefix]||nsuri !== nsuri) {
      throw "Can't redefine prefix " + prefix;
    }
    this.namespaces[prefix] = nsuri;
  };
};

function _isString(v) {
  return (typeof v === 'string' ||
    Object.prototype.toString.call(v) === '[object String]');
}

function rdfXmlParser(docstring, graph) {	
  var doc = docstring;
  if (_isString(docstring)){
    doc = createXMLDocument(docstring);
  }

  var s = new RDFStore(graph);
  var parser = new RDFParser(s);
  parser.parse(doc, '');
  return {
    "@default": s.statements
  };
};


module.exports.parse = rdfXmlParser;

})(require("__browserify_process"))
},{"xmldom":6,"__browserify_process":5}]},{},[1])(1)
});
;