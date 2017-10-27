require('es6-promise').polyfill();
import $ from 'jquery';
import helpers from 'g3n1us_helpers';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import RelationalPouch from 'relational-pouch';
PouchDB.plugin(PouchDBFind);
PouchDB.plugin(RelationalPouch);

import pluralize from 'pluralize';
// import axios from 'axios';


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
		return true;
		var refreshed_at = localStorage.g3n1us_db_refreshed_at
			? new Date(localStorage.g3n1us_db_refreshed_at)
			: new Date(null);
		var stale_at = refreshed_at.setMonth(refreshed_at.getMonth() + 1); // one month
		
		return new Date().getTime() > stale_at;
	}
	
	filterResponse(response){
		return response; // by default simply return entire response, override to fit needs
	}
		
	
	// Data is older than set maxAge, so replenish the local DB from the API endpoint
	getApi(){
		return new Promise((resolve, reject) => {
			var all_docs = this.constructor.all();
			var api_call = $.ajax({
				url: this.connection.endpoint,
				type: "GET",
				headers: {}
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

					localStorage.g3n1us_db_refreshed_at = new Date;
					this.saveMany(alldata);
				
			});
		});
	}
	
	// Data is within the set maxAge, so pull from local DB.
	getDb(){
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
    if(!model._initialized)
      model = new model;
    else{
      this.models = this.models || {};
      this.models[model.handle] = model.schema;        
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
  
  /**
  	private base functionality for other query functions
  */
	_base_query(value = null, key = 'id', operator = '='){
		return new Promise((resolve, reject) => {
			let query_object = {};
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
			if(operator == 'contains'){
  			value = new RegExp('(.*?)'+value+'(.*?)');
			}
			if(operator == 'ends_with'){
  			value = new RegExp('(.*?)'+value+'$');
			}
			if(operator == 'starts_with'){
  			value = new RegExp('^'+value+'(.*?)');
			}
			let operator_string = value instanceof RegExp ? '$regex' : operator_map[operator];
			query_object[operator_string] = value;
			let index_statement = {
				index: {
					fields: ['data.'+ key]
				},
				type: "json",
			};
			
			Container.boot().db.createIndex(index_statement).then(() => {
				var query = {selector: {}};
				query.selector['data.'+ key] = query_object;
				Container.boot().db.find(query).then((results) => {
					resolve(results.docs);
				});
			});		
		});
	}	
	
	
	// This gets called by Model directly. TODO need to change this!
	static find(primary_key, keyname = 'id'){
		if(!primary_key) throw new Error('You must pass an id to this function.');
		return new Promise((resolve, reject) => {
      Container.boot().db.rel.find(this.getProperty('handle'), primary_key).then((data) => { 
        resolve(data[this.getProperty('schema').plural][0]); 
      });
		});
	}
	
	_where(key = 'id', value = null,  operator = '=', callback){
		return new Promise((resolve, reject) => {
			this._base_query(value, key, operator).then((data) => {
				resolve(Container.boot().db.rel.parseRelDocs(this.type, data));
			});
		});  	
	}
	
}

export class Model extends QueryBuilder{
  // calling via new operator inserts into db if needed and returns based on constructor's values. if no values, looks for the set method
  // explicitly retrieving via static get method, only retrieves
  constructor(data = {}){
    super();
    this.relations = {};
    this.handle = this.constructor.name.toLowerCase();
    this._initialized = true;
    this._defaults = {};
    this._data = data;
    Container.add_model(this);
    return new Proxy(this, this);
  }
  
  
  get schema(){
    let schema = {
      singular: this.handle,
      plural: this.handle + 's', // obviously this is shitty
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
            debugger;
            console.log(this)
            reject('The model to be saved could not be located');  
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
      console.log(values);
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
  
  static where(key = 'id', value = null, operator = '=', callback){
    this.builder = this.builder || new QueryBuilder(this.getProperty('handle'));
    var promise = this.builder._where(key, value, operator);
		if(typeof callback === 'function')
  		promise.then(callback);
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




