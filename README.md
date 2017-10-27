# PouchDB API DB

`````javascript
class Representative extends g3n1us.Model{
	constructor(props){
		super(props);
		this.message = "I am a senator!";
	}
}

class Senator extends g3n1us.Model{
	constructor(props){
		super(props);
		this.message = "I am a representative!";				
	}
}

const senate = new g3n1us.App({
	api_key: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',	
	endpoint: 'https://api.propublica.org/congress/v1/115/senate/members.json',
	model: Senator,
});
senate.get();
const house = new g3n1us.App({
	api_key: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',	
	endpoint: 'https://api.propublica.org/congress/v1/115/house/members.json',
	model: Representative,			
});
house.get();
var q = new g3n1us.App({model: Representative});

q.find("C001091").then((result) => {
	console.log(result);
});

q.where('state', 'VA').then((results) => {
	console.log(results);
});
`````
