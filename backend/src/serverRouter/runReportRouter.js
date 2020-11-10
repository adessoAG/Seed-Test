const express = require('express');
const cors = require('cors');
const helper = require('../serverHelper');

const router = express.Router();
const stories = [];
// This router is used for accessing Cucumber/Selenium Reports
router
	.use(cors())
	.use((_, __, next) => {
		console.log('Time of submitted Run:', Date.now());
		console.log('url',_.originalUrl)
		next();
	})
	.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	});

// run single Feature
router.get('/Feature/:issueID', (req, res) => {
	helper.runReport(req, res, stories, 'feature');
});

// run single Scenario of a Feature
router.get('/Scenario/:issueID/:storyType/:scenarioID', (req, res) => {
	helper.runReport(req, res, stories, 'scenario');
});

router.get('/report/:reportName', (req, res) => {
  let reportName = req.params.reportName;
  helper.createReport(res, reportName);
});

module.exports = router;
