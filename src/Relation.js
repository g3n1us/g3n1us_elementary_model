// require('es6-promise').polyfill();
// import 'babel-polyfill';
// import $ from 'jquery';
// import helpers from 'g3n1us_helpers';
/*
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import RelationalPouch from 'relational-pouch';
import config from '../.env'; // What would I use this for??
import pluralize from 'pluralize';

PouchDB.plugin(PouchDBFind);
PouchDB.plugin(RelationalPouch);

import Connection from './Connection';
import App from './App';
import Container from './Container';
*/

import { QueryBuilder } from './QueryBuilder';
// import Model from './Model';

export class Relation extends QueryBuilder{
  constructor(data = {}){
    super(data);
    this.model = null;
    this.relation_model = null;
  }
    
  static hasOne(model){
    var foreign_handle = (typeof model === 'string') ? model.toString() : model.getProperty('handle');
    this.relations = this.relations || {};
    this.relations[foreign_handle] = {belongsTo: foreign_handle};
    // var foreign_key = this.handle + '_id';

    // this.relations[foreign_handle] = {fn: model.find, key: 'id', foreign_key: foreign_key};
    // this.relations[foreign_handle] = model.find(this.id, this.handle + '_id');
  }


  static hasMany(model){
    var foreign_handle = (typeof model === 'string') ? model.toString() : model.getProperty('handle');
    this.relations = this.relations || {};
    
    this.relations[foreign_handle] = {hasMany: foreign_handle};
  }
  
  static belongsTo(model){
    var foreign_handle = (typeof model === 'string') ? model.toString() : model.getProperty('handle');
    this.relations = this.relations || {};
    
    this.relations[foreign_handle] = {belongsTo: foreign_handle};
  }
  
  
}
