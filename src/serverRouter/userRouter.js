const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const request = require('request')
const helper = require('../serverHelper');
const passport = require('passport');
const initializePassport = require('../passport-config');
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);
const mongo = require('../database/mongodatabase');
const UserError = require('../errors/CustomErrors')
const router = express.Router();
// router for all user requests

initializePassport(passport, mongo.getUserByEmail, mongo.getUserById, mongo.getUserByGithub)

router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header('Access-Control-Allow-Credentials','true' );
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect");
   next();
  })
  .use((_, __, next) => {
    console.log('Time of user request:', Date.now());
    next();
  });

// logges in user
router.post('/login', (req, res, next) => {
    try{
        passport.authenticate('normal-local', function(error, user, info){
            if(error){
                throw new UserError(error)
            }else if(!user){
                info.status = 'error';
                return res.json(info);
            }
            req.logIn(user, async function(err){
                if(err){
                    throw new UserError(err)
                }else {
                    if(req.user.github && req.user.github.lastRepository){
                        let repository = {value: req.user.github.lastRepository, source: 'github'}
                        let response = {
                            status: 'success',
                            message: 'repository',
                            repository
                        };
                        res.json(response);
                    } else {
                        res.json(user);
                    }
                }
            });
        })
        (req, res, next)
    }catch(error){
        if(error instanceof UserError){
            res.status(401).json(error);
        }
    }
});

router.post('/githubLogin', (req, res) =>{
    console.log(req.body)
    req.body.id = parseInt(req.body.id)
    passport.authenticate('github-local', function (error, user, info) {
        console.log('in authenticate: ' + JSON.stringify(info))
        if(error){
            return res.json(error);
        } else if(!user){
            info.status = 'error';
            return res.json(info);
        }
        req.logIn(user, async function(err){
            if(err){
                return res.json(err);
            }else {
                if(req.user.github.lastRepository){
                    let response = {
                        status: 'success',
                        message: 'repository',
                        repository: req.user.github.lastRepository
                    };
                    res.json(response);

                } else {
                    res.json(user);
                }
            }
        });
    })(req,res);
});

router.post('/githubRegister', async (req, res) => {
    console.log('githubRegister:')
    try{
        let user = await mongo.findOrRegister(req.body)
        res.json(user)
    }catch(error){
        res.sendStatus(400)
    }
});

router.post('/mergeGithub', async (req, res) => {
    let {userId, login, id} = req.body;
    id = parseInt(id);
    try{
        let user = await mongo.mergeGithub(userId, login, id)
        res.json(user)
    }catch(error){
        res.sendStatus(400)
    }
});


// registers user
router.post('/register', async (req, res) => {
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);
    req.body.password = hashedPassword;
    try{
        let user = await mongo.registerUser(req.body)
        res.json(user)
    }catch(error){
        console.log('in error')
        res.status(400).send(error)
    }
});

//logout for user
router.get('/logout', async (req, res) => {
    req.logout();
    res.json({status: 'success'})
});

router.get('/repositories', (req, res) => {
    let githubName;
    let token;
    if (req.user) {
      if(req.user.github){
        githubName = req.user.github.login;
        token = req.user.github.githubToken;
      } else {
        res.status(200).json([])
        return;
        //throw new UserError('No Github')
      }
    }else {
      githubName = process.env.TESTACCOUNT_NAME;
      token = process.env.TESTACCOUNT_TOKEN;
    }
   
    Promise.all([
      helper.jiraProjects(req.user),
      helper.starredRepositories(githubName, token),
      helper.ownRepositories(githubName, token),
    ]).then((repos) => {
      let merged = [].concat(...repos);
      merged = new Set(merged);
      res.status(200).json(Array.from(merged));
    }).catch((reason) => {
      res.status(400).json('Wrong Github name or Token');
      console.log(`Get Repositories Error: ${reason}`);
    });
  });


// get stories from github
router.get('/stories', async (req, res) => {
    console.log(req.query)
    let source = req.query.source;
    if(source == 'github' || !source){
        try{
        let githubName;
        let githubRepo;
        let token;
        if(req.user){
            githubName = req.query.githubName;
            githubRepo = req.query.repository;
            token = req.user.github.githubToken;
          }else{
            githubName = process.env.TESTACCOUNT_NAME;
            githubRepo = process.env.TESTACCOUNT_REPO;
            token = process.env.TESTACCOUNT_TOKEN;
        }
        let stories = await helper.getGithubStories(githubName, githubRepo, token, res, req)
        res.status(200).json(stories);
        }catch(err){
            if(reason instanceof GithubError){
                res.status(401).send(error.message);
              }
              else {
                res.status(503).send(error.message);
            }
        }
    }else if(source == 'jira'){
        try{
            let projectKey = req.query.projectKey;
            let stories = await helper.getJiraIssues(req.user, projectKey)
            res.status(200).json(stories);
        }catch(err){
            if(reason instanceof GithubError){
                res.status(401).send(error.message);
              }
              else {
                res.status(503).send(error.message);
              }
        }
    }
  });

module.exports = router;
