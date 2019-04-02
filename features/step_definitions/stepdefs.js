const assert = require('assert');
const { Given, When, Then } = require('cucumber');
const webdriver = require('selenium-webdriver')
const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
var { AfterAll, BeforeAll, Before, After } = require('cucumber')
require('geckodriver');

//Cucumber defaulttimer for timeout
var { setDefaultTimeout } = require('cucumber');
setDefaultTimeout(20 * 1000);

async function stepWebsite(url) {
  await driver.get(url)
  await driver.getCurrentUrl().then(async function (currentUrl) {
    expect(currentUrl).to.equal(url, 'Error');
  })
 }

 async function stepButton(button) {
  try {
    await driver.wait(until.elementLocated(By.xpath("//*[@*" + "='" + button + "']")), 6 * 1000).click();
  } catch (err) {
    console.log(err);
  }
  // if you get navigeted to another Website and want to check wether you reach the correct Site we may need this to wait for the new page
  await driver.wait(async function () {
    return driver.executeScript('return document.readyState').then(async function (readyState) {
      return readyState === 'complete';
    });
  });
 }

 async function stepField(label, value) {
  try {
    await driver.findElement(By.css(
      "input#" + label
    )).sendKeys(value);
  } catch (err) {
    console.log(err);
  }
 }

 async function stepRadio(label, cbname) {
  try {
    await driver.wait(until.elementLocated(By.xpath("//*[@" + label + "='" + cbname + "']")), 6 * 1000).click();
  } catch (err) {
    console.log(err);
  }
 }
 

//Starts the driver/Webbrowser
Before(async function () {
  driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.firefox()).build();
});



// Github test Acc:
// Username: AdorableHamster 
// EMail: adorable@hamster.com
// Psw: cutehamsterlikesnuts2000


// TODO: has no meaning yet
Given('As a {string}', async function (string) {
  this.role = string
});

// driver navigates to the Website 
When('I want to visit this site: {string}', async function (url) {
  await driver.get(url)
  await driver.getCurrentUrl().then(async function (currentUrl) {
    expect(currentUrl).to.equal(url, 'Error');
  })
});

//clicks a button if found in html code with xpath, timeouts if not found after 6 sek, waits for next page to be loaded
When('I want to click the Button: {string}', async function (button) {
    await driver.wait(until.elementLocated(By.xpath("//*[@*" + "='" + button + "']")), 3 * 1000).click();
  
  
  // if you get navigeted to another Website and want to check wether you reach the correct Site we may need this to wait for the new page
  await driver.wait(async function () {
    return driver.executeScript('return document.readyState').then(async function (readyState) {
      return readyState === 'complete';
    });
  });
});

//Search a field in the html code and fill in the value
When('I want to insert into the {string} field, the value {string}', async function (label, value) {
  
    await driver.findElement(By.css(
      "input#" + label
    )).sendKeys(value);
  
});

//TODO Date/ Single checkbox

When('I want to select from the {string} selection, the value {string}', async function (label, cbname) {
 
    await driver.wait(until.elementLocated(By.xpath("//*[@" + label + "='" + cbname + "']")), 3 * 1000).click();
 
});

//TODO
When('I want to select from the {string} multiple selection, the values {string}{string}{string}', async function (string, string2, string3, string4) {
  let quatsch = string
});

//TODO:change By.tagName to xpath for flexibility
//Search a Textfield in the html code and asert it with a Text
Then('So I can see in the {string} textbox, the text {string}', async function (label, string) {
  driver.findElement(By.tagName(label)).then(function (link) {
    link.getText().then(function (text) {
      assert.equal(string, text);
    }).catch(function (error) {
      console.log(error)
    })
  });
});

//Checks if the current Website is the one it is suposed to be
Then('So I will be navigated to the site: {string}', async function (url) {
  driver.getCurrentUrl().then(async function (currentUrl) {
    expect(currentUrl).to.equal(url, 'Error');
  })
});

//Closes the webdriver (Browser)
After(async function () {
  driver.quit();
});

 