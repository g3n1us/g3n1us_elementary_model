import { App } from './App';

import { Container } from './Container';

export default class QueryBuilder extends App{
  constructor(type, query){
    super();
    this.type = type;
    // return back to adding the stuff below in
    /*
        this.query_stack = [];
        if(query) this.query_stack.push(query);
        this.resolve = function(data) {
          console.log('this.resolve', data);
        }
        this.reject = function(){}
        this.promise = new Promise(this.resolve, this.reject);
    */
  }
  
  static get operator_map(){
			let operator_map = {};
			operator_map['='] = '$eq';
			operator_map['>'] = '$gt';
			operator_map['<'] = '$lt';
			operator_map['>='] = '$gte';
			operator_map['<='] = '$lte';
			operator_map['exists'] = '$exists';
			operator_map['!='] = '$ne';
			operator_map['<>'] = '$ne';
			operator_map['in'] = '$in';
			operator_map['!in'] = '$nin';
			operator_map['out'] = '$nin';
			operator_map['size'] = '$size';
			operator_map['regex'] = '$regex';
			return operator_map;
  }
  
  static parseQueryArgs(args){
  	let arg_array = [...args];
  	var query_obj = {
    	key: 'id',
    	operator: '=',
    	value: null,
    	callback: null,
  	}
  	var last_arg = arg_array[arg_array.length - 1];
  	if(typeof last_arg === 'function')
    	query_obj.callback = arg_array.splice(-1)[0];
  		
  	if(arg_array.length === 1){
    	query_obj.value = args[0];
  	}
  	else if(arg_array.length === 2){
    	query_obj.key = arg_array[0];
    	query_obj.value = arg_array[1];
  	}
  	else if(arg_array.length === 3){
    	query_obj.key = arg_array[0];
    	query_obj.operator = arg_array[1];
    	query_obj.value = arg_array[2];
  	}
  	else
    	throw new Error('Number of query arguments is out of range');
    	
		if(query_obj.operator == 'contains'){
			query_obj.value = new RegExp('(.*?)'+query_obj.value+'(.*?)');
		}
		if(query_obj.operator == 'ends_with'){
			query_obj.value = new RegExp('(.*?)'+query_obj.value+'$');
		}
		if(query_obj.operator == 'starts_with'){
			query_obj.value = new RegExp('^'+query_obj.value+'(.*?)');
		}
		
		return query_obj;
  }
  
  /**
  	private base functionality for other query functions
  */
	_base_query(query_object){
		return new Promise((resolve, reject) => {
			let operator_map = QueryBuilder.operator_map;
			let operator_string = query_object.value instanceof RegExp ? '$regex' : operator_map[query_object.operator];
			console.log(operator_string); 
			var pouch_query_object = {};
			pouch_query_object[operator_string] = query_object.value;
			let index_statement = {
				index: {
					fields: ['data.'+ query_object.key]
				},
				type: "json",
			};
			
			Container.boot().db.createIndex(index_statement).then(() => {
				var query = {selector: {}};
				query.selector['data.'+ query_object.key] = pouch_query_object;
				Container.boot().db.find(query).then((results) => {
  				var promise = Container.boot().db.rel.parseRelDocs(this.type, results.docs)

      		if(query_object.callback)
        		promise.then(query_object.callback);
  				
					resolve(promise);
				});
			});		
		});
	}	
	
	
	// This gets called by Model directly. TODO need to change this!
	static find(primary_key, keyname = 'id'){
		if(!primary_key) throw new Error('You must pass an id to this function.');
  	var last_arg = arguments[arguments.length - 1];
  	if(typeof last_arg === 'function')
    	var callback = last_arg;

		return new Promise((resolve, reject) => {
      Container.boot().db.rel.find(this.getProperty('handle'), primary_key).then((data) => { 
        var pluralname = this.getProperty('schema').plural;
        var modelized = new this(data[pluralname][0]);
        if(typeof callback === 'function')
          callback(modelized);
        resolve(modelized); 
      });
		});
	}
	
	
  static where(key = 'id', value = null, operator = '=', callback){
    var query_object = QueryBuilder.parseQueryArgs(arguments);
    // builder is a singleton in order to add subsequent elements to query.
    this.builder = this.builder || new QueryBuilder(this.getProperty('handle'));
    this.builder._base_query(query_object).then((results) => {
      let pluralname = this.getProperty('schema').plural;
      let mapped = results[pluralname].map($m => {
        return new this($m);
      });
      
      return Promise.resolve(mapped);
      
    });
//     return this.builder._base_query(query_object);
  }
	
}
