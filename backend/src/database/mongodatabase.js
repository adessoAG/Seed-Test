/* eslint-disable no-unused-vars */
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');

if (!process.env.NODE_ENV) {
  const dotenv = require('dotenv').config();
}

const uri = process.env.DATABASE_URI;
const dbName = 'Seed';
const userCollection = 'User';
const storiesCollection = 'ChrisPlayground';
const testreportCollection = 'TestReport';
const repositoriesCollection ='Repositories'
const steptypesCollection ='stepTypes'
// ////////////////////////////////////// API Methods /////////////////////////////////////////////


async function registerUser(user){
  let db = await connectDb()
  let dbo = db.db(dbName);
  let collection = await dbo.collection(userCollection)
  let dbUser = await getUserByEmail(user.email);
  let result;
  if(dbUser !== null){
    result = 'User already exists'
  } else {
   result = await collection.insertOne(user);
  }
  return result;
}

async function registerGithubUser(user){
  let db = await connectDb()
  let dbo = db.db(dbName);
  let collection = await dbo.collection(userCollection)
  let result = await collection.insertOne({github: user});
  return result;
}

async function mergeGithub(userId, login, id){
  console.log('login:', login, 'id:', id)
  let db = await connectDb()
  let dbo = db.db(dbName);
  let collection = await dbo.collection(userCollection)
  let githubAccount = await getUserByGithub(login, id)
  let seedAccount = await getUserById(userId);
  seedAccount.github = githubAccount.github;
  if(githubAccount.hasOwnProperty('jira') && !seedAccount.hasOwnProperty('jira') ){
    seedAccount.jira = githubAccount.jira;
  }
  let deletedGithub = await deleteUser(githubAccount._id);
  let result = await replaceUser(seedAccount, collection);

  return result;
}

async function getUserByEmail(email){
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let result = await collection.findOne({email: email})
  db.close();
  return result
}

async function getUserByGithub(login, id){
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let result = await collection.findOne({$and :[{'github.id': id}, {'github.login': login}]})
  db.close();
  return result
}

async function getUserById(id){
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let result = await collection.findOne({_id: ObjectId(id)})
  console.log('getuserbyid: ' + id)
  db.close();
  return result
}

async function findOrRegister(user){
  let result = await getUserByGithub(user.login, user.id)
  if(!result) {
    result = await registerGithubUser(user)
  }else {
    result = await updateGithubToken(result._id, user.githubToken)
  }
  return result
}

async function updateGithubToken(objId, updatedToken) {
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let user = await collection.updateOne({"_id" : ObjectId(objId)}, {$set: { 'github.githubToken' : updatedToken}})
  db.close()
  return user
}

function connectDb() {
  return new Promise((resolve, reject) => {
    MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}
function selectRepositoryCollection(db) {
  dbo = db.db(dbName);
  return new Promise((resolve, reject) => {
    dbo.collection(repositoriesCollection, (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}
function selectStoriesCollection(db) {
  dbo = db.db(dbName);
  return new Promise((resolve, reject) => {
    dbo.collection(storiesCollection, (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}
function selectUsersCollection(db) {
  dbo = db.db(dbName);
  return new Promise((resolve, reject) => {
    dbo.collection(userCollection, (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}

// TODO: delete this? , because there is another "upadateStory"
//async function updateStory(_id, updatedStuff) {
//  let db = await connectDb()
//  let collection = await selectCollection(db)
//  let story = await replace(updatedStuff, collection)
//  db.close()
//  console.log('story: ' + JSON.stringify(story))
//  return story
//}

function findStory(storyId, storyType, collection) {
  const myObjt = { 
    story_id: storyId,
    storyType: storyType
  };
  return new Promise((resolve, reject) => {
    collection.findOne(myObjt, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  })
}


function replace(story, collection) {

  const myObjt = { 
    story_id: story.story_id,
    storyType: story.storyType,
    };
  console.log('replace:', myObjt)
  return new Promise((resolve, reject) => {
    collection.findOneAndReplace(myObjt, story, { returnOriginal: false }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.value);
      }
    })
  })
}

async function disconnectGithub(user){
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let removedUser = await replaceUser(user, collection);
  return removedUser;
}

function replaceUser(newUser, collection) {
  const myObjt = { _id: ObjectId(newUser._id) }
  return new Promise((resolve, reject) => {
    collection.findOneAndReplace(myObjt, newUser, { returnOriginal: false }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.value);
      }
    })
  })
}

async function updateStory(updatedStuff) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await replace(updatedStuff, collection)
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// get One Story
async function getOneStory(storyId, storyType) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storyType, collection)
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close();
  }
}

// GET all  Steptypes
async function showSteptypes() {
  let db;
  try {
    db = await connectDb()
    dbo = db.db(dbName)
    let collection = await dbo.collection(steptypesCollection)
    let result = await collection.find({}).toArray()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// Create Background
//async function createBackground(storyId, storyType) {
//  let db;
//  try {
//    db = await connectDb()
//    let collection = await selectStoriesCollection(db)
//    let story = await findStory(storyId, storyType, collection)
//    const tmpBackground = emptyBackground();
//    story.background = tmpBackground;
//    let result = await replace(story, collection)
//    return result
//  } catch (e) {
//    console.log("UPS!!!! FEHLER: " + e)
//  } finally {
//    if(db) db.close()
//  }
//}

// UPDATE Background
async function updateBackground(storyId, storyType, updatedBackground) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storyType, collection)
    story.background = updatedBackground;
    let result = await replace(story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// DELETE Background
async function deleteBackground(storyId, storyType) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storyType, collection)
    story.background = emptyBackground();
    let result = await replace(story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// CREATE Scenario
async function createScenario(storyId, storyType) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storyType, collection)
    const lastScenarioIndex = story.scenarios.length;
    const tmpScenario = emptyScenario();
    if (story.scenarios.length === 0) {
      story.scenarios.push(tmpScenario);
    } else {
      tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
      story.scenarios.push(tmpScenario);
    }
    await replace(story, collection)
    return tmpScenario
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// DELETE Scenario
async function deleteScenario(storyId, storyType, scenarioID) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storyType, collection)
    for (let i = 0; i < story.scenarios.length; i++) {
      if (story.scenarios[i].scenario_id === scenarioID) {
        story.scenarios.splice(i, 1);
      }
    }
    let result = await replace(story, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// POST Scenario
async function updateScenario(storyId, storyType, updatedScenario) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storyType, collection)
    for (const scenario of story.scenarios) {
      if (story.scenarios.indexOf(scenario) === story.scenarios.length) {
        story.scenarios.push(scenario);
        break;
      }
      if (scenario.scenario_id === updatedScenario.scenario_id) {
        story.scenarios.splice(story.scenarios.indexOf(scenario), 1, updatedScenario);
        break;
      }
    }
    let result = await replace(story, collection)
    console.log('update:', story, result)

    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

//get UserData needs ID returns JsonObject User
async function getRepository(userID) {
  try {
    const myObjt = { owner: userID };
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.find(myObjt).toArray();
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

async function getOneRepository(name) {
  try {
    const myObjt = { name: name};
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne(myObjt);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

async function insertEntry(email, name){
  const myObjt = { 'name': name, 'owner': email, 'issues': { } };
  let db = await connectDb();
  let collection = await selectRepositoryCollection(db);
  collection.insertOne(myObjt);
}

async function addIssue(issue, name){
  try {
    const myObjt = { name: name};
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne(myObjt);
    let issues = result.issues;
    issues[issue.id] = issue;
    result.issues = issues;
    collection.findOneAndUpdate(myObjt, { $set: result }, {
      returnOriginal: false,
      upsert: true,
    }, (error) => {
      if (error) throw error;
      db.close();
    });
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

async function upsertEntry(storyId, updatedContent, storyType) {
  let db;
  try {
    const myObjt = { 
      story_id: storyId,
      storyType: storyType,
     };
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let result =  await collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
      returnOriginal: false,
      upsert: true,
    })
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

async function uploadReport(reportData) {
  let db;
  try{
    db = await connectDb()
    dbo = db.db(dbName)
    let collection = await dbo.collection(testreportCollection)
    let result = await collection.insertOne(reportData);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER", e)
  }
}

async function getReport(reportName) {
  let db;
  try{
    let report = {reportName}
    db = await connectDb()
    dbo = db.db(dbName)
    let collection = await dbo.collection(testreportCollection)
    let result = await collection.findOne(report);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER", e)
  }
}

// create User in DB needs JsonObject User returns JsonObject(user)
async function createUser(user) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.insertOne(user)
    console.log(result.ops[0])
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// delete User in DB needs ID
async function deleteUser(userID) {
  let db;
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    db = await connectDb()
    let collection = await selectUsersCollection(db)
    await collection.deleteOne(myObjt)
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}
// update a User in DB needs ID and JsonObject User returns altered JsonObject User
async function updateUser(userID, updatedUser) {
  let db;
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.findOneAndReplace(myObjt, updatedUser, { returnOriginal: false })
    return result.value
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

//get UserData needs ID returns JsonObject User
async function getUserData(userID) {
  let db;
  try {
    const oId = ObjectId(userID);
    const myObjt = { _id: oId };
    db = await connectDb();
    let collection = await selectUsersCollection(db);
    let result = await collection.findOne(myObjt);
    db.close();
    console.log(result)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

module.exports = {
  getReport,
  uploadReport,
  disconnectGithub,
  mergeGithub,
  findOrRegister,
  getUserByGithub,
  getUserById,
  registerUser,
  getUserByEmail,
  showSteptypes,
  //createBackground,
  deleteBackground,
  updateBackground,
  createScenario,
  deleteScenario,
  updateScenario,
  getOneStory,
  insertEntry,
  upsertEntry,
  updateStory,
  createUser,
  deleteUser,
  updateUser,
  getUserData,
  getRepository,
  getOneRepository,
  addIssue,
  selectStoriesCollection,
  connectDb
};
