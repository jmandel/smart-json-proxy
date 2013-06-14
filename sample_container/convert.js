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
  if (node.type.indexOf("Code") !== -1){
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

})(require("__browserify_process"))
},{"../fixtures/smart-context.json":3,"./jsonld":4,"./rdfxml_parser":5,"__browserify_process":1}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
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
      ret.datatype = datatype;
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
},{"xmldom":6,"__browserify_process":1}],6:[function(require,module,exports){
function DOMParser(options){
	this.options = 
			options != true && //To the version (0.1.12) compatible
			options ||{locator:{}};
	
}
DOMParser.prototype.parseFromString = function(source,mimeType){
	var sax =  new XMLReader();
	var options = this.options;
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = {};
	var entityMap = {'lt':'<','gt':'>','amp':'&','quot':'"','apos':"'"}
	if(locator){
		domBuilder.setDocumentLocator(locator)
	}
	
	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(/\/x?html?$/.test(mimeType)){
		entityMap.nbsp = '\xa0';
		entityMap.copy = '\xa9';
		defaultNSMap['']= 'http://www.w3.org/1999/xhtml';
	}
	sax.parse(source,defaultNSMap,entityMap);
	return domBuilder.document;
}
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {}
	var isCallback = errorImpl instanceof Function;
	locator = locator||{}
	function build(key){
		var fn = errorImpl[key];
		if(!fn){
			if(isCallback){
				fn = errorImpl.length == 2?function(msg){errorImpl(key,msg)}:errorImpl;
			}else{
				var i=arguments.length;
				while(--i){
					if(fn = errorImpl[arguments[i]]){
						break;
					}
				}
			}
		}
		errorHandler[key] = fn && function(msg){
			fn(msg+_locator(locator));
		}||function(){};
	}
	build('warning','warn');
	build('error','warn','warning');
	build('fatalError','warn','warning','error');
	return errorHandler;
}
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler 
 * 
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */ 
DOMHandler.prototype = {
	startDocument : function() {
    	this.document = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.document.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.document;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;
	    
		this.locator && position(this.locator,el)
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			if( attr.getOffset){
				position(attr.getOffset(1),attr)
			}
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr)
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement
	    var tagName = current.tagName;
	    this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.document.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins)
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
		//console.log(chars)
		if(this.currentElement && chars){
			if (this.cdata) {
				var charNode = this.document.createCDATASection(chars);
				this.currentElement.appendChild(charNode);
			} else {
				var charNode = this.document.createTextNode(chars);
				this.currentElement.appendChild(charNode);
			}
			this.locator && position(this.locator,charNode)
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.document.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
	    var comm = this.document.createComment(chars);
	    this.locator && position(this.locator,comm)
	    appendElement(this, comm);
	},
	
	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},
	
	startDTD:function(name, publicId, systemId) {
		var impl = this.document.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt)
	        appendElement(this, dt);
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn(error,_locator(this.locator));
	},
	error:function(error) {
		console.error(error,_locator(this.locator));
	},
	fatalError:function(error) {
		console.error(error,_locator(this.locator));
	    throw error;
	}
}
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null}
})

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.document.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

if(typeof require == 'function'){
	var XMLReader = require('./sax').XMLReader;
	var DOMImplementation = exports.DOMImplementation = require('./dom').DOMImplementation;
	exports.XMLSerializer = require('./dom').XMLSerializer ;
	exports.DOMParser = DOMParser;
}

},{"./sax":7,"./dom":8}],7:[function(require,module,exports){
//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]///\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\u00B7\u0300-\u036F\\ux203F-\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_V
//S_ATTR_S,	S_E,	S_S,	S_C
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring 
var S_ATTR_S=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_V = 4;//attr value(no quot value only)
var S_E = 5;//attr value end and no space(quot end)
var S_S = 6;//(attr value end || tag end ) && (space offer)
var S_C = 7;//closed el<el />

function XMLReader(){
}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {})
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
}
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
  function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if(k in entityMap){
			return entityMap[k]; 
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
		locator&&position(start);
		domBuilder.characters(xt,0,end-start);
		start = end
	}
	function position(start,m){
		while(start>=endPos && (m = linePattern.exec(source))){
			startPos = m.index;
			endPos = startPos + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = start-startPos+1;
	}
	var startPos = 0;
	var endPos = 0;
	var linePattern = /.+(?:\r\n?|\n)|.*$/g
	var locator = domBuilder.locator;
	
	var parseStack = [{currentNSMap:defaultNSMapCopy}]
	var closeMap = {};
	var start = 0;
	while(true){
		var i = source.indexOf('<',start);
		if(i>start){
			appendText(i);
		}
		switch(source.charAt(i+1)){
		case '/':
			var end = source.indexOf('>',i+3);
			var tagName = source.substring(i+2,end);
			var config = parseStack.pop();
			var localNSMap = config.localNSMap;
			
	        if(config.tagName != tagName){
	            errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName );
	        }
			domBuilder.endElement(config.uri,config.localName,tagName);
			if(localNSMap){
				for(var prefix in localNSMap){
					domBuilder.endPrefixMapping(prefix) ;
				}
			}
			end++;
			break;
			// end elment
		case '?':// <?...?>
			locator&&position(i);
			end = parseInstruction(source,i,domBuilder);
			break;
		case '!':// <!doctype,<![CDATA,<!--
			locator&&position(i);
			end = parseDCC(source,i,domBuilder);
			break;
		default:
			if(i<0){
				if(!source.substr(start).match(/^\s*$/)){
					errorHandler.error('source code out of document root');
				}
				return;
			}else{
				try{
					locator&&position(i);
					var el = new ElementAttributes();
					//elStartEnd
					var end = parseElementStartPart(source,i,el,entityReplacer,errorHandler);
					var len = el.length;
					//position fixed
					if(len && locator){
						var backup = copyLocator(locator,{});
						for(var i = 0;i<len;i++){
							var a = el[i];
							position(a.offset);
							a.offset = copyLocator(locator,{});
						}
						copyLocator(backup,locator);
					}
					el.closed = el.closed||fixSelfClosed(source,end,el.tagName,closeMap);
					appendElement(el,domBuilder,parseStack);
					
					
					if(el.uri === 'http://www.w3.org/1999/xhtml' && !el.closed){
						end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder)
					}else{
						end++;
					}
				}catch(e){
					errorHandler.error('element parse error: '+e);
					end = -1;
				}
			}

		}
		if(end<0){
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(i+1);
		}else{
			start = end;
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
	
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,entityReplacer,errorHandler){
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_S){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName');
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ){//equal
				start = p+1;
				p = source.indexOf(c,start)
				if(p>0){
					value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					el.add(attrName,value,start-1);
					s = S_E;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_V){
				value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
				//console.log(attrName,value,start,p)
				el.add(attrName,value,start);
				//console.dir(el)
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_E
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="');
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_E:
			case S_S:
			case S_C:
				s = S_C;
				el.closed = true;
			case S_V:
			case S_ATTR:
			case S_ATTR_S:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')")
			}
			break;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_E:
			case S_S:
			case S_C:
				break;//normal
			case S_V://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1)
				}
			case S_ATTR_S:
				if(s === S_ATTR_S){
					value = attrName;
				}
				if(s == S_V){
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value.replace(/&#?\w+;/g,entityReplacer),start)
				}else{
					errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!')
					el.add(value,value,start)
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_S;
					break;
				case S_ATTR:
					attrName = source.slice(start,p)
					s = S_ATTR_S;
					break;
				case S_V:
					var value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value,start)
				case S_E:
					s = S_S;
					break;
				//case S_S:
				//case S_EQ:
				//case S_ATTR_S:
				//	void();break;
				//case S_C:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_V
//S_ATTR_S,	S_E,	S_S,	S_C
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_V:void();break;
				case S_ATTR_S:
					errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead!!')
					el.add(attrName,attrName,start);
					start = p;
					s = S_ATTR;
					break;
				case S_E:
					errorHandler.warning('attribute space is required"'+attrName+'"!!')
				case S_S:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_V;
					start = p;
					break;
				case S_C:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}
		p++;
	}
}
/**
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function appendElement(el,domBuilder,parseStack){
	var tagName = el.tagName;
	var localNSMap = null;
	var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName
		}else{
			localName = qName;
			prefix = null
			nsPrefix = qName === 'xmlns' && ''
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute 
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {}
				_copy(currentNSMap,currentNSMap={})
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = 'http://www.w3.org/2000/xmlns/'
			domBuilder.startPrefixMapping(nsPrefix, value) 
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = 'http://www.w3.org/XML/1998/namespace';
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix]
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix) 
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		parseStack.push(el);
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}
			
		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos = closeMap[tagName] = source.lastIndexOf('</'+tagName+'>')
	}
	return pos<elStartEnd;
	//} 
}
function _copy(source,target){
	for(var n in source){target[n] = source[n]}
}
function parseDCC(source,start,domBuilder){//sure start with '<!'
	var next= source.charAt(start+2)
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			domBuilder.comment(source,start+4,end-start-4);
			return end+3;
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA() 
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId) 
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = len>3 && /^public$/i.test(matchs[2][0]) && matchs[3][0]
			var sysid = len>4 && matchs[4][0];
			var lastMatch = matchs[len-1]
			domBuilder.startDTD(name,pubid,sysid);
			domBuilder.endDTD();
			
			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

/**
 * @param source
 */
function ElementAttributes(source){
	
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName
	},
	add:function(qName,value,offset){
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this[this.length++] = {qName:qName,value:value,offset:offset}
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getOffset:function(i){return this[i].offset},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//			
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
}




function _set_proto_(thiz,parent){
	thiz.__proto__ = parent;
	return thiz;
}
if(!(_set_proto_({},_set_proto_.prototype) instanceof _set_proto_)){
	_set_proto_ = function(thiz,parent){
		function p(){};
		p.prototype = parent;
		p = new p();
		for(parent in thiz){
			p[parent] = thiz[parent];
		}
		return p;
	}
}

function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

if(typeof require == 'function'){
	exports.XMLReader = XMLReader;
}

if(typeof require == 'function'){
exports.XMLReader=XMLReader;
}

},{}],8:[function(require,module,exports){
/*
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 */

function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}
/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(Object.create){
		var ppt = Object.create(Super.prototype)
		pt.__proto__ = ppt;
	}
	if(!(pt instanceof Super)){
		function t(){};
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknow Class:"+Class)
		}
		pt.constructor = Class
	}
}
var htmlns = 'http://www.w3.org/1999/xhtml' ;
// Node Types
var NodeType = {}
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {}
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);


function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
};
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException)
/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
};
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	}
};
function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
}

_extends(LiveNodeList,NodeList);
/**
 * 
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
};

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1
		while(i<lastIndex){
			list[i] = list[++i]
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw DOMException(NOT_FOUND_ERR,new Error())
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		var i = this.length;
		while(i--){
			var attr = this[i];
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};
/**
 * @see http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490
 */
function DOMImplementation(/* Object */ features) {
	this._features = {};
	if (features) {
		for (var feature in features) {
			 this._features = features[feature];
		}
	}
};

DOMImplementation.prototype = {
	hasFeature: function(/* string */ feature, /* string */ version) {
		var versions = this._features[feature.toLowerCase()];
		if (versions && (!version || version in versions)) {
			return true;
		} else {
			return false;
		}
	},
	// Introduced in DOM Level 2:
	createDocument:function(namespaceURI,  qualifiedName, doctype){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR,WRONG_DOCUMENT_ERR
		var doc = new Document();
		doc.doctype = doctype;
		if(doctype){
			doc.appendChild(doctype);
		}
		doc.implementation = this;
		doc.childNodes = new NodeList();
		if(qualifiedName){
			var root = doc.createElementNS(namespaceURI,qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	// Introduced in DOM Level 2:
	createDocumentType:function(qualifiedName, publicId, systemId){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId;
		node.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;
		
		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
};

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == 2?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == 2?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}
function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value
	}
}
function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:'']
	}
}
function _onUpdateChild(doc,el,newChild){
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if(newChild){
			cs[cs.length++] = newChild;
		}else{
			//console.log(1)
			var child = el.firstChild;
			var i = 0;
			while(child){
				cs[i++] = child;
				child =child.nextSibling;
			}
			cs.length = i;
		}
	}
}

/**
 * attributes;
 * children;
 * 
 * writeable properties:
 * nodeValue,Attr:value,CharacterData:data
 * prefix
 */
function _removeChild(parentNode,child){
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if(previous){
		previous.nextSibling = next;
	}else{
		parentNode.firstChild = next
	}
	if(next){
		next.previousSibling = previous;
	}else{
		parentNode.lastChild = previous;
	}
	_onUpdateChild(parentNode.ownerDocument,parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else{
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else{
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}
function _appendSingleChild(parentNode,newChild){
	var cp = newChild.parentNode;
	if(cp){
		var pre = parentNode.lastChild;
		cp.removeChild(newChild);//remove and update
		var pre = parentNode.lastChild;
	}
	var pre = parentNode.lastChild;
	newChild.parentNode = parentNode;
	newChild.previousSibling = pre;
	newChild.nextSibling = null;
	if(pre){
		pre.nextSibling = newChild;
	}else{
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument,parentNode,newChild);
	return newChild;
	//console.log("__aa",parentNode.lastChild.nextSibling == null)
}
Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	doctype :  null,
	documentElement :  null,
	_inc : 1,
	
	insertBefore :  function(newChild, refChild){//raises 
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == 1){
			this.documentElement = newChild;
		}
		
		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == 1){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		})
		return rtv;
	},
	
	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
};
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name)
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = value;
		this.setAttributeNode(attr)
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && node.namespaceURI === namespaceURI && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
};
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
};
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		//if(!(newChild instanceof CharacterData)){
			throw new Error(ExceptionMessage[3])
		//}
		return Node.prototype.appendChild.apply(this,arguments)
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
}
_extends(CharacterData,Node);
function Text() {
};
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
}
_extends(Text,CharacterData);
function Comment() {
};
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
}
_extends(Comment,CharacterData);

function CDATASection() {
};
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
}
_extends(CDATASection,CharacterData);


function DocumentType() {
};
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
};
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
};
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
};
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
};
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node){
	var buf = [];
	serializeToString(node,buf);
	return buf.join('');
}
Node.prototype.toString =function(){
	return XMLSerializer.prototype.serializeToString(this);
}
function serializeToString(node,buf){
	switch(node.nodeType){
	case ELEMENT_NODE:
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		var isHTML = htmlns === node.namespaceURI
		buf.push('<',nodeName);
		for(var i=0;i<len;i++){
			serializeToString(attrs.item(i),buf,isHTML);
		}
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				if(child){
					buf.push(child.data);
				}
			}else{
				while(child){
					serializeToString(child,buf);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else{
			buf.push('/>');
		}
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return buf.push(' ',node.name,'="',node.value.replace(/[<&"]/g,_xmlEncoder),'"');
	case TEXT_NODE:
		return buf.push(node.data.replace(/[<&]/g,_xmlEncoder));
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC "',pubid);
			if (sysid && sysid!='.') {
				buf.push( '" "',sysid);
			}
			buf.push('">');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM "',sysid,'">');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		var attrs = node2.attributes;
		var len = attrs.length;
		for(var i=0;i<len;i++){
			node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});
		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},
			set:function(data){
				switch(this.nodeType){
				case 1:
				case 11:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;
				default:
					//TODO:
					this.data = data;
					this.value = value;
					this.nodeValue = data;
				}
			}
		})
		
		function getTextContent(node){
			switch(node.nodeType){
			case 1:
			case 11:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}
		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value
		}
	}
}catch(e){//ie8
}

if(typeof require == 'function'){
	exports.DOMImplementation = DOMImplementation;
	exports.XMLSerializer = XMLSerializer;
}

},{}]},{},[2])(2)
});
;