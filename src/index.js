require('es6-promise').polyfill();
import 'babel-polyfill';
import $ from 'jquery';
import helpers from 'g3n1us_helpers';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import RelationalPouch from 'relational-pouch';
import config from '../.env'; // What would I use this for??
import pluralize from 'pluralize';

PouchDB.plugin(PouchDBFind);
PouchDB.plugin(RelationalPouch);


export class Connection{
	constructor(dbname = 'g3n1us_app'){
		this.db = new PouchDB(dbname);
		this.PouchDB = PouchDB;
	}
}

export class App extends Connection{
	constructor({
			endpoint = 'test.html', 
			api_key = null,	
			maxAge = 30 * 24 * 60 * 60, // one month in seconds ALERT! - TODO this is still hardcoded on ~line 31
		} = {}) {
			super();			
			this.connection = {
				endpoint: endpoint,
				api_key: api_key,
				maxAge: maxAge,
			}

		this.connection.db = this.db;
		this.models = [];
	}
	
	
	shouldRefresh(){
// 		return true;
		var refreshed_at_key = 'g3n1us_db_refreshed_at_' + this.handle;
		var refreshed_at = localStorage[refreshed_at_key]
			? new Date(localStorage[refreshed_at_key])
			: new Date(null);
			console.log(this.connection.maxAge);
		var stale_at = refreshed_at.getTime() + (this.connection.maxAge * 1000);
		var now = new Date().getTime();
		console.log(stale_at);
		console.log(now);
		
		return now > stale_at;
	}
	
	filterResponse(response){
		return response; // by default simply return entire response, override to fit needs
	}
		
	
	// Data is older than set maxAge, so replenish the local DB from the API endpoint
	getApi(){
  	console.warn('Refreshing data from the api');
		return new Promise((resolve, reject) => {
			var all_docs = this.constructor.all();
			let headers = this.headers || {};
			var api_call = $.ajax({
				url: this.connection.endpoint,
				type: "GET",
				headers: headers
			});
			
			Promise.all([api_call, all_docs]).then((values) => {
				var api_call = values[0];
				var all_docs = values[1];
				var rev_map = {};
				all_docs[this.schema.plural].forEach(function(v){
					rev_map[v.id] = v.rev;
				});
				var alldata = this.filterResponse(api_call);
				alldata = alldata.map((v,k) => {
					if(v.id in rev_map)
						v.rev = rev_map[v.id];
					return v;
				});
      		var refreshed_at_key = 'g3n1us_db_refreshed_at_' + this.handle;
					localStorage[refreshed_at_key] = new Date;
					this.saveMany(alldata);
				
			});
		});
	}
	
	// Data is within the set maxAge, so pull from local DB.
	getDb(){
  	console.warn('Data is FRESH!! Get from DB.');
		return this.connection.db.allDocs({
			include_docs: true,
			attachments: true
		});
	}
	
	// Initialize the app dat
	boot(){
		return this.shouldRefresh()
			? this.getApi()
			: this.getDb();		
	}
		
	// Destroys the database!
	destroy(){
		this.connection.db.destroy().then(function (response) {
		  console.log(response);
		}).catch(function (err) {
		  console.log(err);
		});		
	}
	
} // close Class



// Container holds all persistent data. All methods are static so the overall application state is held in one context
export class Container{

  static add_model(model){
    if(!model._initialized){
      model = new model;
    }
    else{
      this.models = this.models || {};
      this.models[model.handle] = model.schema;  
      this.model_instances = this.model_instances || {};
      this.model_instances[model.handle] = model;    
    }
  }
  
  static get full_schema(){
    return Object.values(this.models);
  }
  
  static boot(dbname = 'g3n1us_database'){
    this.db = this.db || new PouchDB(dbname);
    if(this._schema_set)
      return this;
    this.db.setSchema(this.full_schema);
    this._schema_set = true;
    for(let i in this.model_instances)
      this.model_instances[i].boot();
    
    return this;
  }
}



class QueryBuilder extends App{
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


export class Relation extends QueryBuilder{
  constructor(data = {}){
    super();
    this.model = null;
    this.relation_model = null;
  }
    
  hasOne(model){
    console.log(this.handle, model.getProperty('handle'));
    var foreign_handle = model.getProperty('handle');
    this.relations[foreign_handle] = {belongsTo: foreign_handle};
  }

  hasMany(){
    
  }
  
  belongsTo(){
    
  }
  
  
}


export class Model extends Relation{
  // calling via new operator inserts into db if needed and returns based on constructor's values. if no values, looks for the set method
  // explicitly retrieving via static get method, only retrieves
  constructor(data = {}){
    super();
    this.relations = {};
    this.handle = this.constructor.name.toLowerCase();
    this._initialized = true;
    this._defaults = {};
    this._data = data;
    this.headers = {};
    Container.add_model(this);
    return new Proxy(this, this);
  }
  
  
  get schema(){
    let schema = {
      singular: this.handle,
      plural:  pluralize(this.handle),
    };
    if(Object.values(this.relations).length)
      schema.relations = this.relations;
    return schema;
  }
  
  get data(){
    return helpers.array_merge(this._defaults, this._data);
  }
  
  static getProperty(prop){
    return new this()[prop];
  }
  
  save(save_data = {}, callback){
    save_data = helpers.array_merge(this.data, save_data);
    var promise = new Promise((resolve, reject) => {
        if(!save_data.id) {
          return reject('no id found!!!', save_data);
        }
        Container.db.rel.find(this.handle, save_data.id).then((data) => { 
          let model_results = data[this.schema.plural];
          if(model_results.length){
            // combine new data with existing model data
            let merged = helpers.array_merge(model_results[0], save_data);
            
            resolve(Container.db.rel.save(this.handle, merged));
          }
          else{
            resolve(Container.db.rel.save(this.handle, save_data));
/*
            console.log(this);
            debugger;
            
            reject('The model to be saved could not be located');  
*/
          }
            
        }).catch(reason => { 
          console.log(reason)
        });
    });
    if(typeof callback === 'function')
      promise.resolve(callback);
    return promise;
  }

  saveMany(arr_of_data = [], callback){
//     must dedupe the data
    var dedupes = {};
    arr_of_data.forEach(function(d){
      dedupes[d.id] = d;
    });
    dedupes = Object.values(dedupes);
    
    var promises = dedupes.map((v) => {
      return this.save(v);
    });
    var promise = Promise.all(promises).then(values => {
      console.log(values); // needs an output return value of some kind. What should this be??
    }).catch(reason => { 
      console.log(reason)
    });
    
    if(typeof callback === 'function')
      promise.resolve(callback);
    return promise;
  }
  
  // Return all models
  static all(callback){
    var promise = Container.db.rel.find(this.getProperty('handle'));
    if(typeof callback === "function"){
      promise.then(callback);
    }
    return promise;
  }
  
  
  
// output formatting
  toString(){
    return this.display();
  }

  toJSON() {
    return JSON.stringify(this.data);
  }
  
  display() {
    return `
    <h1>${this.name}</h1>    
    `;
  }  

// magic methods  
  get(target, prop){
    return target[prop] || target.data[prop];
  }
  
  set(target, prop, value, receiver){
    if(prop in target){
      target[prop] = value;    
    }
    else
      target._data[prop] = value;
      return true
    }
      
}


