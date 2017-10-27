# G3N1US ActivePouch

`````javascript
class Animal extends g3n1us.Model{
  constructor(){
    super(arguments[0]);
    this.connection.endpoint = '//example.com/api/files.json';
    // Add headers to the api request
    this.headers = {'Api-Key': '8675309-90210'}
    // filterResponse is called on the raw output from the API. 
    // You can modify each response object, or get a nested object in the response. 
    // Each model must have an 'id' attribute! This is a great place to add this if needed.
    this.filterResponse = function(response){
      return response.map(function(v){
        v.id = v.specied_id
        return v;
      });
    }
  }
}

// After declaring a model, call add_model to add it to the application container
g3n1us.Container.add_model(Animal);

`````

### Querying
Querying is done against a static instance of your model

#### Find an item by it's id
```javascript
Animal.find('187').then(animal => {
  console.log('I found the animal! ' + animal);
});
```

#### Query for items by attribute
```javascript
Animal.where('has_fur', true).then((response) => {
  console.log('Animals are now inside the plural form of the model name: response.animals = ', response.animals);
});
```

#### Don't like Promises?!
All query methods can also accept a callback as the last argument
```javascript
Animal.find('187', function(animal){
  console.log('I found the animal! ' + animal);
});
```

