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

import Connection from './Connection';
import App from './App';
import QueryBuilder from './QueryBuilder';
import Relation from './Relation';
import Model from './Model';


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

