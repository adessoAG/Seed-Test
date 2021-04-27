const {
	Given, When, Then, Before, After, setDefaultTimeout, setWorldConstructor
} = require('@cucumber/cucumber');
const webdriver = require('selenium-webdriver');
const fs = require('file-saver');
const { By, until, Key } = require('selenium-webdriver');
const { expect } = require('chai');
require('geckodriver');
const firefox = require('selenium-webdriver/firefox');
const chrome = require('selenium-webdriver/chrome');

let driver;
const firefoxOptions = new firefox.Options();
const chromeOptions = new chrome.Options();
// if (process.env.NODE_ENV) {
// chromeOptions.addArguments('--headless');
// }
chromeOptions.addArguments('--disable-dev-shm-usage');
// chromeOptions.addArguments('--no-sandbox')
chromeOptions.addArguments('--ignore-certificate-errors');
chromeOptions.bynary_location = process.env.GOOGLE_CHROME_SHIM;

function CustomWorld({ attach, parameters }) {
	this.attach = attach;
	this.parameters = parameters;
}


setWorldConstructor(CustomWorld);

// Cucumber default timer for timeout
setDefaultTimeout(20 * 1000);


Before(initDriver);

// / #################### GIVEN ########################################
Given('As a {string}', async function (string) {
	this.role = string;
});

Given('I am on the website: {string}', async function getUrl(url) {
	await driver.get(url);
	await driver.getCurrentUrl().then(async (currentUrl) => {
		// expect(currentUrl).to.equal(url, 'Error');
	});
	await driver.sleep(this.parameters.waitTime);
});


Given('I add a cookie with the name {string} and value {string}', async function addCookie(name, value) {
	await driver.manage().addCookie({ name, value });
	await driver.sleep(this.parameters.waitTime);
});


Given('I remove a cookie with the name {string}', async function removeCookie(name) {
	await driver.manage().deleteCookie(name);
	await driver.sleep(this.parameters.waitTime);
});


// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', async function getUrl(url) {
	await driver.get(url);
	await driver.getCurrentUrl().then(async (currentUrl) => {
		// expect(currentUrl).to.equal(url, 'Error');
	});
	await driver.sleep(this.parameters.waitTime);
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, waits for next page to be loaded
When('I click the button: {string}', async function clickButton(button) {
	await driver.getCurrentUrl()
		.then(async (currentUrl) => {
			// prevent Button click on "Run Story" or "Run Scenario" to prevent recursion
			if ((currentUrl === 'http://localhost:4200/' || currentUrl === 'https://seed-test-frontend.herokuapp.com/') && button.toLowerCase()
				.match(/^run[ _](story|scenario)$/) !== null) throw new Error('Executing Seed-Test inside a scenario is not allowed, to prevent recursion!');
			else try {
				await driver.wait(until.elementLocated(By.xpath(`${'//*[text()' + '=\''}${button}' or ` + `${'@*' + '=\''}${button}']`)), 3 * 1000)
					.click();
				await driver.wait(async () => driver.executeScript('return document.readyState')
					.then(async readyState => readyState === 'complete'));
			} catch (e) {
				await driver.findElement(By.xpath(`${button}`))
					.click();
			}
		});
	await driver.sleep(this.parameters.waitTime);
});

// selenium sleeps for a certain amount of time
When('The site should wait for {string} milliseconds', async (ms) => {
	await driver.sleep(parseInt(ms, 10));
});


// Search a field in the html code and fill in the value
When('I insert {string} into the field {string}', async function fillTextField(value, label) {
	try {
		// await driver.findElement(By.css(`input#${label}`)).clear();
		// await driver.findElement(By.css(`input#${label}`)).sendKeys(value);
		await driver.findElement(By.xpath(`//input[@id='${label}']`)).clear();
		await driver.findElement(By.xpath(`//input[@id='${label}']`)).sendKeys(value);
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//textarea[@id='${label}']`)).clear();
			await driver.findElement(By.xpath(`//textarea[@id='${label}']`)).sendKeys(value);
		} catch (e) {
			try {
				await driver.findElement(By.xpath(`//*[@id='${label}']`)).clear();
				await driver.findElement(By.xpath(`//*[@id='${label}']`)).sendKeys(value);
			} catch (e) {
				try {
					await driver.findElement(By.xpath(`//input[@type='text' and @*='${label}']`)).clear();
					await driver.findElement(By.xpath(`//input[@type='text' and @*='${label}']`)).sendKeys(value);
				} catch (e) {
					try {
						await driver.findElement(By.xpath(`//label[contains(text(),'${label}')]/following::input[@type='text']`)).clear();
						await driver.findElement(By.xpath(`//label[contains(text(),'${label}')]/following::input[@type='text']`)).sendKeys(value);
					} catch (e) {
						await driver.findElement(By.xpath(`${label}`)).clear();
						await driver.findElement(By.xpath(`${label}`)).sendKeys(value);
					}
				}
			}
		}
	}
	await driver.sleep(this.parameters.waitTime);
});

// "Radio"
When('I select {string} from the selection {string}', async function clickRadioButton(radioname, label) {
	await driver.wait(until.elementLocated(By.xpath(`//*[@${label}='${radioname}']`)), 3 * 1000).click();
	await driver.sleep(this.parameters.waitTime);
});


// Select an Option from an dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', async function selectFromDropdown(value, dropd) {
	try {
		await driver.wait(until.elementLocated(By.xpath(`//*[@*='${dropd}']/option[text()='${value}']`)), 3 * 1000).click();
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//label[contains(text(),'${dropd}')]/following::button[@type='button']`)).click();
		} catch (e) {
			try {
				await driver.findElement(By.xpath(`//label[contains(text(),'${dropd}')]/following::span[text()='${value}']`)).click();
			} catch (e) {
				await driver.findElement(By.xpath(`${dropd}`)).click();
			}
		}
	}
	await driver.sleep(this.parameters.waitTime);
});


// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', async function hoverClick(element, option) {
	try {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`${element}`)), 3 * 1000);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(2000);
		const action2 = driver.actions({ bridge: true }); // second action needed?
		const selection = await driver.findElement(By.xpath(`${option}`));
		await action2.move({ origin: selection }).click()
			.perform();
	} catch (e) {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]`)), 3 * 1000);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(2000);
		try {
			const action2 = driver.actions({ bridge: true }); // second action needed?
			const selection = await driver.findElement(By.xpath(`//*[contains(text(),'${element}')]/following::*[text()='${option}']`));
			await action2.move({ origin: selection }).click()
				.perform();
		} catch (e) {
			const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${option}')]`)), 3 * 1000);
			await action2.move({ origin: selection }).click()
				.perform();
		}
	}
	await driver.sleep(this.parameters.waitTime);
});

// TODO:
When('I select from the {string} multiple selection, the values {string}{string}{string}', () => {});

// Check the Checkbox with a specific name or id
When('I check the box {string}', async function checkBox(name) {
	// Some alternative methods to "check the box":
	// await driver.executeScript("arguments[0].submit;", driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.executeScript("arguments[0].click;", driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.wait(until.elementLocated(By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).submit();
	// await driver.wait(until.elementLocated(By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).click();

	try { // this one works, even if the element is not clickable (due to other elements blocking it):
		await driver.findElement(By.xpath(`//*[@type="checkbox" and @*="${name}"]`)).sendKeys(Key.SPACE);
	} catch (e) {
		try { // this one works, for a text label next to the actual checkbox
			await driver.findElement(By.xpath(`//*[contains(text(),'${name}')]//parent::label`)).click();
		} catch (e) { // default
			try {
				await driver.findElement(By.xpath(`//*[contains(text(),"${name}") or @*="${name}"]`)).click();
			} catch (e) {
				await driver.findElement(By.xpath(`${name}`)).click();
			}
		}
	}
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.sleep(this.parameters.waitTime);
});

When('Switch to the newly opened tab', async function switchToNewTab() {
	const tabs = await driver.getAllWindowHandles();
	await driver.switchTo().window(tabs[1]);
	await driver.sleep(this.parameters.waitTime);
});


When('Switch to the tab number {string}', async function switchToSpecificTab(numberOfTabs) {
	const chromeTabs = await driver.getAllWindowHandles();
	const len = chromeTabs.length;
	if (parseInt(numberOfTabs) === 1) {
		console.log('switchTo: 1st tab');
		await driver.switchTo().window(chromeTabs[0]);
	} else {
		const tab = len - (parseInt(numberOfTabs) - 1);
		await driver.switchTo().window(chromeTabs[tab]);
	}
	await driver.sleep(this.parameters.waitTime);
});

// TODO: delete this following step (also in DB), once every branch has the changes
When('I switch to the next tab', async function switchToNewTab() {
	const tabs = await driver.getAllWindowHandles();
	await driver.switchTo().window(tabs[1]);
	await driver.sleep(this.parameters.waitTime);
});

When('I want to upload the file from this path: {string} into this uploadfield: {string}',
	async function uploadFile(path, input) {
		try {
			await driver.wait(until.elementLocated(By.xpath(`//input[@*='${input}']`)), 3 * 1000)
				.sendKeys(`${path}`);
		} catch (e) {
			await driver.wait(until.elementLocated(By.xpath(`${input}`)), 3 * 1000)
				.sendKeys(`${path}`);
		}
		await driver.sleep(this.parameters.waitTime);
	});

// ################### THEN ##########################################
// Checks if the current Website is the one it is supposed to be
Then('So I will be navigated to the website: {string}', async (url) => {
	await driver.getCurrentUrl().then(async (currentUrl) => {
		expect(currentUrl).to.equal(url, 'Error');
	});
});

// Search a textfield in the html code and assert it with a Text
Then('So I can see the text {string} in the textbox: {string}', async (string, label) => {
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.wait(until.elementLocated(By.xpath(`${'//*[@*="'}${label}"]`)), 3 * 1000).then(async (link) => {
		// `${'//*[text()' + "='"}${button}' or ` + `${'@*'='}${button}']`
		const resp = await link.getText().then(text => text);
		expect(string).to.equal(resp, 'Error');
	});
});

// Search if a is text in html code
Then('So I can see the text: {string}', async (string) => {
	await driver.sleep(2000);
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
		const css_body = await body.getText().then(bodytext => bodytext);
		const inner_html_body = await driver.executeScript('return document.documentElement.innerHTML');
		const outer_html_body = await driver.executeScript('return document.documentElement.outerHTML');
		const body_all = css_body + inner_html_body + outer_html_body;
		expect(body_all.toLowerCase()).to.include(string.toString().toLowerCase(), 'Error');
	});
});


// Search a textfield in the html code and assert if it's empty
Then('So I can´t see text in the textbox: {string}', async (label) => {
	await driver.wait(until.elementLocated(By.xpath(`${'//*[@*="'}${label}"]`)), 3 * 1000).then(async (link) => {
		const resp = await link.getText().then(text => text);
		expect('').to.equal(resp, 'Error');
	});
});


Then('So a file with the name {string} is downloaded in this Directory {string}',
	async function checkDownloadedFile(fileName, directory) {
		const path = `${directory}\\${fileName}`; // Todo: pathingtool (path.normalize)serverhelper
		await fs.promises.access(path, fs.constants.F_OK);
		await driver.sleep(this.parameters.waitTime);
	});

// Search if a text isn't in html code
Then('So I can\'t see the text: {string}', async function checkIfTextIsMissing(text) {
	await driver.sleep(2000);
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
		const css_body = await body.getText().then(bodytext => bodytext);
		const inner_html_body = await driver.executeScript('return document.documentElement.innerHTML');
		const outer_html_body = await driver.executeScript('return document.documentElement.outerHTML');
		const body_all = css_body + inner_html_body + outer_html_body;
		expect(body_all.toLowerCase()).to.not.include(text.toString().toLowerCase(), 'Error');
	});
	await driver.sleep(this.parameters.waitTime);
});

async function daisyLogout() {
	try {
		await waitMs(500);
		await clickButton('Zurück zum Portal');
		await waitMs(500);
		await clickButton('Abmelden');
	} catch (e) {
		await waitMs(500);
		await clickButton('Abmelden');
	}
}

// Closes the webdriver (Browser)
// runs after each Scenario
After(async function closeDriver() {
	// process.env.DAISY_AUTO_LOGOUT is written as boolean, but read as a string
	if (this.parameters.daisyAutoLogout == "true" || this.parameters.daisyAutoLogout == true) {
		console.log('Trying DaisyAutoLogout');
		await daisyLogout();
	}

	// Without Timeout driver quit is happening too quickly. Need a better solution
	// https://github.com/SeleniumHQ/selenium/issues/5560
	const condition = until.elementLocated(By.name('loader'));
	driver.wait(async drive => condition.fn(drive), 1000, 'Loading failed.');
	if (process.env.NODE_ENV) driver.quit();
});

async function initDriver() {
	driver = new webdriver.Builder()
		.forBrowser(this.parameters.browser)
		.setChromeOptions(chromeOptions)
		.build();
}

// driver navigates to the Website
async function getUrl(url) {
	await driver.get(url);
	await driver.getCurrentUrl().then(async (currentUrl) => {
		// expect(currentUrl).to.equal(url, 'Error');
	});
}

async function addCookie(name, value) {
	await driver.manage().addCookie({ name, value });
}

async function removeCookie(name) {
	await driver.manage().deleteCookie(name);
}

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, waits for next page to be loaded
async function clickButton(button) {
	await driver.getCurrentUrl()
		.then(async (currentUrl) => {
			// prevent Button click on "Run Story" or "Run Scenario" to prevent recursion
			if ((currentUrl === 'http://localhost:4200/' || currentUrl === 'https://seed-test-frontend.herokuapp.com/') && button.toLowerCase()
				.match(/^run[ _](story|scenario)$/) !== null) throw new Error('Executing Seed-Test inside a scenario is not allowed, to prevent recursion!');
			else try {
				await driver.wait(until.elementLocated(By.xpath(`${'//*[text()' + '=\''}${button}' or ` + `${'@*' + '=\''}${button}']`)), 3 * 1000)
					.click();
				await driver.wait(async () => driver.executeScript('return document.readyState')
					.then(async readyState => readyState === 'complete'));
			} catch (e) {
				await driver.findElement(By.xpath(`${button}`))
					.click();
			}
		});
}

// "Radio"
async function clickRadioButton(radioname, label) {
	await driver.wait(until.elementLocated(By.xpath(`//*[@${label}='${radioname}']`)), 3 * 1000).click();
}

// Hover over element and Select an Option
async function hoverClick(element, option) {
	try {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`${element}`)), 3 * 1000);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(2000);
		const action2 = driver.actions({ bridge: true }); // second action needed?
		const selection = await driver.findElement(By.xpath(`${option}`));
		await action2.move({ origin: selection }).click()
			.perform();
	} catch (e) {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]`)), 3 * 1000);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(2000);
		try {
			const action2 = driver.actions({ bridge: true }); // second action needed?
			const selection = await driver.findElement(By.xpath(`//*[contains(text(),'${element}')]/following::*[text()='${option}']`));
			await action2.move({ origin: selection }).click()
				.perform();
		} catch (e) {
			const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${option}')]`)), 3 * 1000);
			await action2.move({ origin: selection }).click()
				.perform();
		}
	}
}

// selenium sleeps for a certain amount of time
async function waitMs(ms) {
	await driver.sleep(parseInt(ms, 10));
}

// Search a field in the html code and fill in the value
async function fillTextField(value, label) {
	try {
		// await driver.findElement(By.css(`input#${label}`)).clear();
		// await driver.findElement(By.css(`input#${label}`)).sendKeys(value);
		await driver.findElement(By.xpath(`//input[@id='${label}']`)).clear();
		await driver.findElement(By.xpath(`//input[@id='${label}']`)).sendKeys(value);
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//textarea[@id='${label}']`)).clear();
			await driver.findElement(By.xpath(`//textarea[@id='${label}']`)).sendKeys(value);
		} catch (e) {
			try {
				await driver.findElement(By.xpath(`//*[@id='${label}']`)).clear();
				await driver.findElement(By.xpath(`//*[@id='${label}']`)).sendKeys(value);
			} catch (e) {
				try {
					await driver.findElement(By.xpath(`//input[@type='text' and @*='${label}']`)).clear();
					await driver.findElement(By.xpath(`//input[@type='text' and @*='${label}']`)).sendKeys(value);
				} catch (e) {
					try {
						await driver.findElement(By.xpath(`//label[contains(text(),'${label}')]/following::input[@type='text']`)).clear();
						await driver.findElement(By.xpath(`//label[contains(text(),'${label}')]/following::input[@type='text']`)).sendKeys(value);
					} catch (e) {
						await driver.findElement(By.xpath(`${label}`)).clear();
						await driver.findElement(By.xpath(`${label}`)).sendKeys(value);
					}
				}
			}
		}
	}
}

// Select an Option from an dropdown-menu
async function selectFromDropdown(value, dropd) {
	try {
		await driver.wait(until.elementLocated(By.xpath(`//*[@*='${dropd}']/option[text()='${value}']`)), 3 * 1000).click();
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//label[contains(text(),'${dropd}')]/following::button[@type='button']`)).click();
		} catch (e) {
			try {
				await driver.findElement(By.xpath(`//label[contains(text(),'${dropd}')]/following::span[text()='${value}']`)).click();
			} catch (e) {
				await driver.findElement(By.xpath(`${dropd}`)).click();
			}
		}
	}
}

// Check the Checkbox with a specific name or id
async function checkBox(name) {
	// Some alternative methods to "check the box":
	// await driver.executeScript("arguments[0].submit;", driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.executeScript("arguments[0].click;", driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.wait(until.elementLocated(By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).submit();
	// await driver.wait(until.elementLocated(By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).click();

	try { // this one works, even if the element is not clickable (due to other elements blocking it):
		await driver.findElement(By.xpath(`//*[@type="checkbox" and @*="${name}"]`)).sendKeys(Key.SPACE);
	} catch (e) {
		try { // this one works, for a text label next to the actual checkbox
			await driver.findElement(By.xpath(`//*[contains(text(),'${name}')]//parent::label`)).click();
		} catch (e) { // default
			try {
				await driver.findElement(By.xpath(`//*[contains(text(),"${name}") or @*="${name}"]`)).click();
			} catch (e) {
				await driver.findElement(By.xpath(`${name}`)).click();
			}
		}
	}
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
}

async function switchToNewTab() {
	const tabs = await driver.getAllWindowHandles();
	await driver.switchTo().window(tabs[1]);
}

async function switchToSpecificTab(numberOfTabs) {
	const chromeTabs = await driver.getAllWindowHandles();
	const len = chromeTabs.length;
	if (parseInt(numberOfTabs) === 1) {
		console.log('switchTo: 1st tab');
		await driver.switchTo().window(chromeTabs[0]);
	} else {
		const tab = len - (parseInt(numberOfTabs) - 1);
		await driver.switchTo().window(chromeTabs[tab]);
	}
}

async function uploadFile(path, input) {
	try {
		await driver.wait(until.elementLocated(By.xpath(`//input[@*='${input}']`)), 3 * 1000)
			.sendKeys(`${path}`);
	} catch (e) {
		await driver.wait(until.elementLocated(By.xpath(`${input}`)), 3 * 1000)
			.sendKeys(`${path}`);
	}
}
// ########################################## THEN ##########################################

// Checks if the current Website is the one it is supposed to be
async function checkUrl(url) {
	await driver.getCurrentUrl().then(async (currentUrl) => {
		expect(currentUrl).to.equal(url, 'Error');
	});
}

// Search a textfield in the html code and assert it with a Text
async function compareTextbox(string, label) {
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.wait(until.elementLocated(By.xpath(`${'//*[@*="'}${label}"]`)), 3 * 1000).then(async (link) => {
		// `${'//*[text()' + "='"}${button}' or ` + `${'@*'='}${button}']`
		const resp = await link.getText().then(text => text);
		expect(string).to.equal(resp, 'Error');
	});
}

// Search if a is text in html code
async function checkforText(string) {
	await driver.sleep(2000);
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
		const css_body = await body.getText().then(bodytext => bodytext);
		const inner_html_body = await driver.executeScript('return document.documentElement.innerHTML');
		const outer_html_body = await driver.executeScript('return document.documentElement.outerHTML');
		const body_all = css_body + inner_html_body + outer_html_body;
		expect(body_all.toLowerCase()).to.include(string.toString().toLowerCase(), 'Error');
	});
}

// Search a textfield in the html code and assert if it's empty
async function checkForEmptyTextbox(label) {
	await driver.wait(until.elementLocated(By.xpath(`${'//*[@*="'}${label}"]`)), 3 * 1000).then(async (link) => {
		const resp = await link.getText().then(text => text);
		expect('').to.equal(resp, 'Error');
	});
}

// Search if a text isn't in html code
async function checkIfTextIsMissing(text) {
	await driver.sleep(2000);
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
		const css_body = await body.getText().then(bodytext => bodytext);
		const inner_html_body = await driver.executeScript('return document.documentElement.innerHTML');
		const outer_html_body = await driver.executeScript('return document.documentElement.outerHTML');
		const body_all = css_body + inner_html_body + outer_html_body;
		expect(body_all.toLowerCase()).to.not.include(text.toString().toLowerCase(), 'Error');
	});
}

async function checkDownloadedFile(fileName, directory) {
	const path = `${directory}\\${fileName}`; // Todo: pathingtool (path.normalize)serverhelper
	await fs.promises.access(path, fs.constants.F_OK);
}

// Closes the webdriver (Browser)
async function closeDriver() {
	// process.env.DAISY_AUTO_LOGOUT is written as boolean, but read as a string
	if (this.parameters.daisyAutoLogout === true || this.parameters.daisyAutoLogout === 'on') {
		console.log('Trying DaisyAutoLogout');
		await daisyLogout();
	}

	// Without Timeout driver quit is happening too quickly. Need a better solution
	// https://github.com/SeleniumHQ/selenium/issues/5560
	const condition = until.elementLocated(By.name('loader'));
	driver.wait(async drive => condition.fn(drive), 1000, 'Loading failed.');
	if (process.env.NODE_ENV) driver.quit();
}
