const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
const app = express();
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const db = require('./database');
const stories_db = require('./database').stories;
const process = require('process');
const emptyScenario = require('./models/emptyScenario');
const fs = require('fs');
const path = require('path');
const access_token = '119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868'; //This is a personal access token, not sure how to handle correctly for multi-user
const exec = require('child_process').exec;
//var reporter = require('cucumber-html-reporter');

var stories = [];

// Initialize the app.
const server = app.listen(process.env.PORT || 8080, function () {
  let port = server.address().port;
  console.log("App now running on port", port);
});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({ "error": statusMessage });
}

// Building feature file story-name-content (feature file title)
function getFeatureContent(story) {
  var data = "Feature: " + story.title + "\n\n";
  // Get scenarios
  data += getScenarioContent(story.scenarios);
  return data;
}

// Building feature file scenario-name-content
function getScenarioContent(scenarios) {
  var data = "";
  for (var i = 0; i < scenarios.length; i++) {
    data += "Scenario: " + scenarios[i].name + "\n\n";

    // Get Stepdefinitions
    data += getSteps(scenarios[i].stepDefinitions.given, Object.keys(scenarios[i].stepDefinitions)[0]) + "\n";

    data += getSteps(scenarios[i].stepDefinitions.when, Object.keys(scenarios[i].stepDefinitions)[1]) + "\n";

    data += getSteps(scenarios[i].stepDefinitions.then, Object.keys(scenarios[i].stepDefinitions)[2]) + "\n\n";

  }
  return data;
}

// Building feature file step-content
function getSteps(steps, stepType) {
  var data = "";
  for (var i = 0; i < steps.length; i++) {
    data += jsUcfirst(stepType) + " ";
    if ((steps[i].label) != null && (steps[i].label) != 'User') {
      data += steps[i].pre + " " + getLabel(steps[i].label) + " " + midNotEmpty(steps[i].mid) + getValues(steps[i].values) + " " + "\n";
    } else if ((steps[i].label) == 'User') {
      data += steps[i].pre + " " + getLabel(steps[i].label) + "\n";
    } else {
      data += steps[i].pre + " " + midNotEmpty(steps[i].mid) + getValues(steps[i].values) + " " + "\n";
    }
  }
  return data;
}

// only displays mid text and additional space if length not null
function midNotEmpty(values) {
  if (values.length === 0) {
    return "";
  }
  return values + " ";
}

// adds content of each values to output
function getValues(values) {
  data = "";
  for (var i = 0; i < values.length; i++) {
    data += '\"' + values[i] + '\"';
  }
  return data;
}

// adds label content to output
function getLabel(label) {
  data = "";
  data += '\"' + label + '\"';
  return data;
}

// First letter in string to upper case
function jsUcfirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Updates feature file based on story_id
function updateFeatureFiles(reqparams) {
  let selectedStory;
  for (var i = 0; i < stories.length; i++) {
    if (stories[i].story_id == reqparams.issueID) {
      selectedStory = stories[i];
      break;
    }
  }
  fs.writeFile(path.join(__dirname, '../../features', selectedStory.title.replace(/ /g, '_') + '.feature'), getFeatureContent(selectedStory), function (err) {
    if (err) throw err;
  });
}

/**
 * API Description
 */
app
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use(function (req, res, next) {
    console.log('Time:', Date.now());
    //console.log('%r %s %n', req, res, next);
    next();
  })
  .get("/api", function (req, res) {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('<h1>Cucumber-API</h1>');
    res.write('<h2>WORKING:</h2>');
    res.write('<h2>GET</h2>');
    res.write('<p>/api/stories</p>');
    res.write('<p>/api/stepDefinitions</p>');
    res.write('<p>/api/scenario/add/:issueID</p>');
    res.write('<h2>POST</h2>');
    res.write('<p>/api/scenario/update/:issueID</p>');
    res.write('<h2>DELETE</h2>');
    res.write('<p>/api/story/:issueID/scenario/delete/:scenarioID</p>');
    res.status(200);
    res.end();
  })
  /**
   * Scenarios API
   */
  .get("/api/stepDefinitions", function (req, res) {
    res.status(200).json(db.showStepdefinitions());
  })
  .get("/api/stories", function (req, res) {
    // get Issues from GitHub
    let request = new XMLHttpRequest();
    request.open('GET', 'https://api.github.com/repos/fr4gstar/Cucumber/issues?labels=story&access_token=' + access_token);
    request.send();
    request.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        let data = JSON.parse(request.responseText);
        // init result
        // let stories = [];
        for (let issue of data) {
          // only relevant issues with label: "story"
          let story = { story_id: issue["id"], title: issue["title"], body: issue["body"], state: issue['state'] };
          if (issue["assignee"] !== null) { // skip in case of "unassigned"
            story["assignee"] = issue["assignee"]["login"];
            story["assignee_avatar_url"] = issue["assignee"]["avatar_url"];
          }
          if (stories_db.findOne({ story_id: issue["id"] }) !== null) { // skip if there is no data for the issue yet
            story["scenarios"] = stories_db.findOne({ story_id: issue["id"] }).scenarios;
          } else {
            story["scenarios"] = [emptyScenario()];
          }
          stories_db.insert(story); // update database
          // Create & Update Feature Files
          fs.writeFile(path.join(__dirname, '../../features', story.title.replace(/ /g, '_') + '.feature'), getFeatureContent(story), function (err) {
            if (err) throw err;
          });
          //TODO: delete stories priority 2
          stories.push(story);
        }
        res.status(200).json(stories);
        console.log("Returning stories.")
      }
    };
  })
  // create scenario
  .get("/api/scenario/add/:issueID", function (req, res) {
    let scenario = db.createScenario(parseInt(req.params.issueID));
    if (typeof (scenario) === "string") {
      handleError(res, scenario, scenario, 500);
    } else {
      res.status(200).json(scenario);
      console.log("Scenario created");
    }
    updateFeatureFiles(req.params);
  })
  // update scenario
  .post("/api/scenario/update/:issueID", function (req, res) {
    // TODO use model to check for scenario (priority 2)
    let scenario = req.body;
    console.log("Trying to update scenario in issue: " + req.params.issueID + " with ID: " + scenario.scenario_id);
    let updated_scenario = db.updateScenario(parseInt(req.params.issueID), scenario);
    if (typeof (updated_scenario) === "string") {
      handleError(res, updated_scenario, updated_scenario, 500);
    } else {
      res.status(200).json(updated_scenario);
      console.log('Scenario', scenario.scenario_id, 'updated in Story', req.params.issueID);
    }
    updateFeatureFiles(req.params);
  })

  // delete scenario
  .delete("/api/story/:issueID/scenario/delete/:scenarioID", function (req, res) {
    console.log("Trying to delete Scenario in Issue: " + req.params.issueID + " with ID: " + req.params.scenarioID);
    let result = db.deleteScenario(parseInt(req.params.issueID), parseInt(req.params.scenarioID));
    if (typeof (result) === "string") {
      handleError(res, result, result, 500);
      console.log("Could not delete Scenario.");
    }
    if (result === true) {
      res.status(200).json({});
      console.log("Scenario deleted.");
    }
    updateFeatureFiles(req.params);
  })

  //run tests
  //Using random numbers right now. When cucumber Integration is complete this should handle the actual calculations
  .get("/api/runTest", function (req, res) {
    var fail = Math.floor(Math.random() * 20) + 0;
    var succ= Math.floor(Math.random() * 20) + 0;
    var not_imp = Math.floor(Math.random() * 20) + 0 ; 
    var not_ex = Math.floor(Math.random() * 20) +0;
    var err_msgs= [];
    for (let index = 0; index < fail ; index++) {
      err_msgs.push("failed for reason "+ (index+1));
    }
    var resp = {"failed":fail,"successfull":succ,"not_implemented":not_imp,"not_executed":not_ex,"err_msg":err_msgs}
    //reporter.generate(options);
    res.status(200).json(resp);
  })
module.exports = app;

//outputs a report in Json and then transforms it in a pretty html page 
function outputReport(){
  execCucumber(function(){
      reporter.generate(options);
  })
}

//executes the cucumber test and creates a json report
function execCucumber(callback){
  child = exec('.\\node_modules\\.bin\\cucumber-js -f json:test.json',  
    function (error, stdout, stderr) {
        callback();
    });
}

//this is needed for the html report
/*
var options = {
  theme: 'bootstrap',
  jsonFile: './report/cucumber_report.json',
  output: './report/cucumber_report.html',
  reportSuiteAsScenarios: true,
  launchReport: true,
  metadata: {
      "App Version":"0.3.2",
      "Test Environment": "STAGING",
      "Browser": "Chrome  54.0.2840.98",
      "Platform": "Windows 10",
      "Parallel": "Scenarios",
      "Executed": "Remote"
  }
};
*/