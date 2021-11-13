const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongo = require('mongo');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const {Schema} = mongoose;
const shortid = require('shortid');
const moment = require('moment');


app.use(cors());
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static('public'));
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

var dbd = mongoose.createConnection(process.env.MONGO_URI);
autoIncrement.initialize(dbd)
//autoIncrement.initialize(connection)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error;'));
db.once('once', ()=>{
  console.log('MongoDb datbase conection established sucessfully')
})

const userSchema = new Schema({
  _id: {
        type: String,
        default: shortid.generate
    },
    username: {
        type: String,
        unique: true,
        required: true
    }
})
//userSchema.plugin(autoIncrement.plugin, 'User');
const User = mongoose.model('User', userSchema);


const exerciseSchema = new Schema({
  description: {
        type: String,
        required: true,
        maxlength: [25, 'Description too long, not greater than 25']
    },
    duration: {
        type: Number,
        required: true,
        min: [1, 'Duration too short, at least 1 minute']
    },
    date: {
        type: Date, 
        default: Date.now
    },
    userId: {
        type: String,
        required: true
    }
}
 );
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post("/api/users", async(req,res)=>{
  try{
    const formBody =  req.body.username;
  if(!formBody){
    return res.status(401).json('Input a username')
  }else{
    //check if it exists in the database first
    const usernameDb = await User.findOne({
      username : formBody
    })
    if(usernameDb){
      return res.status(200).json('Username already exists')
    }else{
      const usernameAdd = new User({
        username : formBody
      })
      usernameAdd.save((err, data)=>{
        if(err) return console.log(err);
        res.status(200).json({
          username: data.username,
          _id : data._id
        })
      })
      
    }
  }
  }catch(err){
    if(err) return console.log(err);
    res.status(500).json({
        error: 'Server Error'
      })
  }
  
})

app.get("/api/users", async(req, res)=>{
  try{
     const allUsers = await User.find().select({createdAt:0,updatedAt:0, __v:0})
  if(allUsers.length<1){
    return res.status(200).json('No users in database')
  }else{
    let newArr = [...allUsers];
    let updatedArray = []
    
    for(let i=0; i< newArr.length; i++ ){
        let usernameDb = newArr[i].username;
        
        let idDb = newArr[i]._id;
      const object = {
        username:`${usernameDb}`,
        _id:`${idDb}`}
      updatedArray.push(object);
      
    }
    return res.status(200).json(updatedArray);
  }
  
  }catch(err){
    if(err) return console.log(err);
    res.status(500).json({
        error: 'Server Error'
      })
  }
 
})

app.post("/api/users/:_id/exercises",async(req,res)=>{
  try{
    const {_id} = req.params;
  let userId = _id;
  console.log(userId);
 let {  description, duration, date } = req.body;
 console.log(description, duration, date)
    User.findOne({ _id: userId }).then(user => {
        if (!user) throw new Error('Unknown user with _id');
        console.log(user);
        date = date || Date.now();
        return Exercise.create({
            description, duration, date, userId
        })
            .then(ex => res.status(200).send({
                 username: user.username,
                _id: user._id,
                description : ex.description,
                duration : Number(ex.duration),
                date: new Date(ex.date).toDateString()
            }))
    })
        .catch(err => {
            console.log(err);
            res.status(500).send(err.message);
        })
  
  
  }catch(err){
    if(err) return console.log(err);
    res.status(500).json({
        error: 'Server Error'
      })
  }
  
})


app.get("/api/users/:id/logs",async(req,res)=>{
  
  try{
    const {id} = req.params;
    const { from, to, limit} = req.query;
    //console.log(from)
    
    if(!id){
      return res.status(404).json('Input valid ID')
    }else{
      const user = await User.findById(id);
      if(!user){
        return res.status(404).json("User does not exist")
      }else{
        const logs = await Exercise.find({userId : id}).select({_id:0,userId:0,__v:0,username:0})
        let logs2 = [];
               for(let i=0; i<logs.length; i++){
                const object = {
                  description :logs[i].description,
                  duration : logs[i].duration,
                  date : new Date(logs[i].date).toDateString()
                }
                logs2.push(object);
              }
        console.log("before if")
        if((from&&to) || limit){
          console.log('after if')
              let newLogs;
              if((from&&to&&limit)){
               
              const fromCheck = new Date(from).getTime();
              const toCheck = new Date(to).getTime();
              
               const fromTo = logs.filter((product)=>{
                 console.log(new Date(product.date))
                 const date = new Date(product.date).getTime();
              return date>=fromCheck && date<=toCheck
              }
              )
              
              newLogs = fromTo.slice(0, Number(limit))
              }
              if((from&&to) && !limit){
                console.log('without limit')
                const fromCheck = new Date(from).getTime();
              const toCheck = new Date(to).getTime();
              
               newLogs = logs.filter((product)=>{
                 console.log(new Date(product.date))
                 const date = new Date(product.date).getTime();
              return date>=fromCheck && date<=toCheck
              }
              )
              }
              if((!(from&&to)) && limit){
                
              newLogs =  logs.slice(0, Number(limit))
              }
              let newLogs2= [];
              for(let i=0; i<newLogs.length; i++){
                const object = {
                  description : newLogs[i].description,
                  duration : newLogs[i].duration,
                  date : new Date(newLogs[i].date).toDateString()
                }
                newLogs2.push(object);
              }
              
            return res.status(200).json({
              username: user.username,
              count: newLogs2.length,
              _id: user._id,
              log: newLogs2
            })
        }
          return res.status(200).json({
              username: user.username,
              count: logs2.length,
              _id: user._id,
              log: logs2
            }) 
        
    
      }
    }
  }catch(err){
    if(err) return console.log(err);
    res.status(500).json({
        error: 'Server Error'
      })
  }
  console.log(id);
})
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
