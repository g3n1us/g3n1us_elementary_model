import $ from 'jquery';

import { Connection } from './Connection';

export default class App extends Connection{
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
		var refreshed_at_key = '_G3N1US_DB_REFRESHED_AT_' + this.handle;
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
// 				all_docs[this.schema.plural].forEach(function(v){
				all_docs.forEach(function(v){
					rev_map[v.id] = v.rev;
				});
				// Here is where the user supplied function filters the API's raw data and formats/filters if desired
				var alldata = this.filterResponse(api_call);
				alldata = alldata.map((v,k) => {
					if(v.id in rev_map)
						v.rev = rev_map[v.id];
					return v;
				});                     
    		var refreshed_at_key = '_G3N1US_DB_REFRESHED_AT_' + this.handle;
				localStorage[refreshed_at_key] = new Date;
				this.saveMany(alldata);
				// TODO solidify the results of the above call
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
	
	// Initialize the app data
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

