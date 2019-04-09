Feature: Sign-Up scenario

@386696256_1
Scenario Outline: successful Sign Up

Given As a "User"

When I want to visit this site: "www.superheroes.com" 
When I want to click the Button: "Sign Up"  
When I want to insert into the "Username" field, the value "Superman" 
When I want to insert into the "Password" field, the value "kryptonite" 
When I want to click the Button: "Finish"  

Then So I will be navigated to the site: "www.superheroes.com/newProfile" 
Then So I can see in the "Validation" textbox, the text "Successfully Signed Up" 

Examples:
 | 


@386696256_2
Scenario: failed Sign Up

Given As a "User"

When I want to visit this site: "www.superheroes.com" 
When I want to click the Button: "Sign Up"  
When I want to insert into the "Username" field, the value "Superman" 
When I want to insert into the "Password" field, the value "kryptonite" 
When I want to click the Button: "Finish"  

Then So I will be navigated to the site: "www.superheroes.com/newProfile" 
Then So I can see in the "Validation" textbox, the text "Error code 4711" 

