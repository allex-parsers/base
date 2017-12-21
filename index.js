function createLib(execlib) {
  return execlib.loadDependencies('client', ['allex_directorylib'], createBaseParser.bind(null, execlib));
}

function createBaseParser(execlib) {
  'use strict';
  var lib = execlib.lib;

  /* options:
  - mappingpolicy: 'strict' or whatever. 
    If 'strict', mapping is applied in any case
    If not 'strict', mapping is applied only when mapping declares a value for mapping
  - mapping: hash {datafieldname: datafieldmapping, ...}
    where datafieldmapping may be an array of {file: filevalue, data: datavalue}
    or {filename: filename, dataname: dataname, data:[hash,...]}, and each hash has properties named as specified in filename and dataname; this is a general case of 'file' and 'data' properties
  - mappingobj: simplehash, fromfilevalue => todatavalue
  - whitelist: if defined, for the field of datahash declared, let only values from the array given
  - blacklist: if defined, for the field of datahash declared, block values from the array given
  */

  function BaseParser(options){
    this.mappingpolicy = options.mappingpolicy;
    this.mapping = {};
    this.whitelist = options.whitelist;
    this.blacklist = options.blacklist;
    this.skipfirst = parseInt(options.skipfirst) || 0;
    this.inreccount = 0;
    this.buildMapping(options);
  }
  BaseParser.prototype.destroy = function () {
    this.inreccount = 0;
    this.skipfirst = null;
    this.blacklist = null;
    this.whitelist = null;
    lib.objDestroyAll(this.mapping);
    this.mapping = null;
    this.mappingpolicy = null;
  };
  BaseParser.prototype.buildMapping = function (options) {
    lib.traverseShallow(options.mapping, this.buildDataFieldMapping.bind(this));
  };
  BaseParser.prototype.buildDataFieldMapping = function (mapping, datafieldname) {
    var m = new lib.Map();
    this.mapping[datafieldname] = m;
    buildMappingFromMappingArray(m, mapping);
  };
  function buildMappingFromMappingArray (m, arry) {
    if (lib.isArray(arry)) {
      arry.forEach(addToMapping.bind(null, m, 'data', 'file'));
    } else {
      var fname = arry.filename || 'file',
        dname = arry.dataname || 'data';
      arry.data.forEach(addToMapping.bind(null, m, fname, dname));
    }
  };
  function addToMapping (map, fname, dname, mappingarrayitem) {
    if (mappingarrayitem.hasOwnProperty(fname) &&
      mappingarrayitem.hasOwnProperty(dname)) {
      map.add(mappingarrayitem[fname], mappingarrayitem[dname]);
    } else {
      throw new lib.Error('INVALID_MAPPINGARRAY_ITEM_PROPERTY_NAMES', 'Recheck '+fname+' as a name of in-file data property and '+dname+' as in-data data property');
    }
  };
  BaseParser.prototype.postProcessFileToData = function (dataobj) {
    var _do;
    if (null === this.inreccount) {
      return null;
    }
    this.inreccount++;
    if (this.skipfirst >= this.inreccount) {
      return null;
    }
    _do = this.finalPackFileToDataItem(dataobj);
    if (this.mapping) {
      lib.traverseShallow(dataobj, this.doRemap.bind(this, _do));
    }
    return _do;
  };
  BaseParser.prototype.finalPackFileToDataItem = function (dataobj) {
    return dataobj;
  };
  BaseParser.prototype.doRemap = function (dataobj, dataitem, dataitemname) {
    var mappingmap, mappingresult;
    if (this.mapping.hasOwnProperty(dataitemname)) {
      mappingmap = this.mapping[dataitemname];
      if (this.mappingpolicy === 'strict') {
        dataobj[dataitemname] = mappingmap.get(dataitem);
      } else {
        var mappingresult = mappingmap.get(dataitem);
        if (lib.defined(mappingresult)) {
          dataobj[dataitemname] = mappingresult;
        }
      }
    }
  };

  return BaseParser;
}

module.exports = createLib;
