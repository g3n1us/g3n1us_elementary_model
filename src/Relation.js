import { QueryBuilder } from './QueryBuilder';

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
