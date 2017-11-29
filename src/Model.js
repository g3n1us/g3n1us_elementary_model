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

import { Connection } from './Connection';
import { App } from './App';
import { Container } from './Container';
import { QueryBuilder } from './QueryBuilder';
import { Relation } from './Relation';

export { Container };

export default class Model extends Relation{
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
    var return_promise = new Promise((resolve, reject) => {
      
      promise.then((data) => {
        var pluralname = this.getProperty('schema').plural;
        var models = data[pluralname].map((v,k) => {
          return new this(v);
        });
        if(typeof callback === "function"){
          callback(models);
        }
        resolve(models);
      });  
    });
    return return_promise;
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
    if(target.relations[prop]){
      if(typeof target.relations[prop] === 'function'){
        return target.relations[prop];
      }
      else{
        var callObj = target.relations[prop];
        console.warn(callObj);
        
        return callObj.fn(target[callObj.key], callObj.foreign_key);
      }
    }
    else
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


/*
if(typeof module == 'object'){
	module.exports = Model;
}
*/
