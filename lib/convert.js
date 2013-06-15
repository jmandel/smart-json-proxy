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
