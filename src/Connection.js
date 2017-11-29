/*
require('es6-promise').polyfill();
import 'babel-polyfill';
import $ from 'jquery';
import helpers from 'g3n1us_helpers';
*/
import PouchDB from 'pouchdb';
/*
import PouchDBFind from 'pouchdb-find';
import RelationalPouch from 'relational-pouch';
import config from '../.env'; // What would I use this for??
import pluralize from 'pluralize';

PouchDB.plugin(PouchDBFind);
PouchDB.plugin(RelationalPouch);

import App from './App';
import Container from './Container';
import QueryBuilder from './QueryBuilder';
import Relation from './Relation';
import Model from './Model';
*/


export default class Connection{
	constructor(dbname = 'g3n1us_app'){
		this.db = new PouchDB(dbname);
		this.PouchDB = PouchDB;
	}
}
