const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { XMLHttpRequest } = require('xmlhttprequest');
const process = require('process');
const mongo = require('./database/mongodatabase');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const app = express();
const helper = require('./serverHelper');

const initializePassport = require('./passport-config');
initializePassport(passport, getUserByEmail, getUserById)

let stories = [];

// Initialize the app.
const server = app.listen(process.env.PORT || 8080, () => {
  const { port } = server.address();
  console.log('App now running on port', port);
});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
  console.log(`ERROR: ${reason}`);
  res.status(code || 500).json({ error: statusMessage });
}

function getUserByEmail(email, callback){
  mongo.getUserByEmail(email, callback)
}

function getUserById(id, callback){
  mongo.getUserById(id, callback)
}

/**
 * API Description
 */
app
  .use(cors())
  .use(flash())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use((req, res, next) => {
    console.log('Time:', Date.now());
    next();
  })
  .get('/api', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('<h1>Cucumber-API</h1>');
    res.write('<h2>Check out our <a href="https://cucumber-app.herokuapp.com"title="https://cucumber-app.herokuapp.com">Seed-Test WebApp</a>.</h2>');
    res.write('<h2>Or visit us on <a href="https://github.com/adessoCucumber/Cucumber"title="https://github.com/adessoCucumber/Cucumber">Github</a>'
        + ' for further information.</h2>');
    res.write('<h3>Happy Testing!</h3>');
    res.status(200);
    res.end();
  })
  /**
   * Scenarios API
   */
  .get('/api/stepTypes', (req, res) => {
    mongo.showSteptypes((result) => {
      res.status(200).json(result);
    });
  })

  .get('/api/login', (req, res) => {

  })

  .post('/api/register', (req, res) => {
    try{
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      user = {
        email: req.body.email,
        password: hashedPassword,
      }
      mongo.registerUser(user)
    } catch {

    }
  })

  .get('/api/stories/:user/:repository/:token?', async (req, res) => {
    const githubName = req.params.user;
    const githubRepo = req.params.repository;
    let { token } = req.params;
    if (!token && githubName === process.env.TESTACCOUNT_NAME) {
      token = process.env.TESTACCOUNT_TOKEN;
    }
    const tmpStories = [];
    // get Issues from GitHub .
    const request = new XMLHttpRequest();
    request.open('GET', `https://api.github.com/repos/${githubName}/${githubRepo}/issues?labels=story`);
    request.setRequestHeader('Authorization', `token ${token}`);
    request.send();
    request.onreadystatechange = function () {
      if(this.readyState === 4 && this.status === 401){
        res.sendStatus(401);
      }
      if (this.readyState === 4 && this.status === 200) {
        const data = JSON.parse(request.responseText);
        for (const issue of data) {
          // only relevant issues with label: "story"
          const story = {
            story_id: issue.id,
            title: issue.title,
            body: issue.body,
            state: issue.state,
            issue_number: issue.number,
          };
          if (issue.assignee !== null) { // skip in case of "unassigned"
            story.assignee = issue.assignee.login;
            story.assignee_avatar_url = issue.assignee.avatar_url;
          } else {
            story.assignee = 'unassigned';
            story.assignee_avatar_url = 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png';
          }
          tmpStories.push(helper.fuseGitWithDb(story, issue.id));
        }
        Promise.all(tmpStories).then((results) => {
          res.status(200).json(results);
          stories = results; // need this to clear promises from the Story List
        }).catch((e) => {
          console.log(e);
        });
      }
    };
  })

  // update background
  .post('/api/background/update/:issueID', (req, res) => {
    const background = req.body;
    mongo.updateBackground(parseInt(req.params.issueID, 10), background, (result) => {
      if (typeof (result) === 'string') {
        handleError(res, result, result, 500);
      } else {
        helper.updateFeatureFile(parseInt(req.params.issueID, 10));
        res.status(200).json(result);
      }
    });
  })

  // delete background
  .delete('/api/story/:issueID/background/delete/', (req, res) => {
    mongo.deleteBackground(parseInt(req.params.issueID, 10), (result) => {
      if (typeof (result) === 'string') {
        handleError(res, result, result, 500);
      } else {
        helper.updateFeatureFile(parseInt(req.params.issueID, 10));
        res.status(200).json({});
      }
    });
  })

  // create scenario
  .get('/api/scenario/add/:issueID', (req, res) => {
    mongo.createScenario(parseInt(req.params.issueID, 10), (scenario) => {
      if (typeof (scenario) === 'string') {
        handleError(res, scenario, scenario, 500);
      } else {
        helper.updateFeatureFile(parseInt(req.params.issueID, 10));
        res.status(200).json(scenario);
      }
    });
  })

  // update scenario
  .post('/api/scenario/update/:issueID', (req, res) => {
    const scenario = req.body;
    mongo.updateScenario(parseInt(req.params.issueID, 10), scenario, (updatedStory) => {
      if (typeof (updatedStory) === 'string') {
        handleError(res, updatedStory, updatedStory, 500);
      } else {
        helper.updateFeatureFile(parseInt(req.params.issueID, 10));
        res.status(200).json(updatedStory);
      }
    });
  })


  // delete scenario
  .delete('/api/story/:issueID/scenario/delete/:scenarioID', (req, res) => {
    mongo.deleteScenario(parseInt(req.params.issueID, 10),
      parseInt(req.params.scenarioID, 10), (result) => {
        if (typeof (result) === 'string') {
          handleError(res, result, result, 500);
        } else {
          helper.updateFeatureFile(parseInt(req.params.issueID, 10));
          res.status(200).json({});
        }
      });
  })

  // run single Feature
  .get('/api/runFeature/:issueID', (req, res) => {
    helper.runReport(req, res, stories, 'feature');
  })

  // run single Scenario of a Feature
  .get('/api/runScenario/:issueID/:scenarioID', (req, res) => {
    helper.runReport(req, res, stories, 'scenario');
  })

  .get('/api/repositories/:githubName?/:token?', (req, res) => {
    let { token } = req.params;
    const { githubName } = req.params;
    if (!token && githubName === process.env.TESTACCOUNT_NAME) {
      token = process.env.TESTACCOUNT_TOKEN;
    }
    Promise.all([
      helper.starredRepositories(githubName, token),
      helper.ownRepositories(token),
    ]).then((repos) => {
      const merged = [].concat.apply([], repos);
      // console.log(merged);
      res.status(200).json(merged);
    }).catch((reason) => {
      res.status(400).json('Wrong Github name or Token');
      console.log(`Get Repositories Error: ${reason}`);
    });
  });

module.exports = { app };
