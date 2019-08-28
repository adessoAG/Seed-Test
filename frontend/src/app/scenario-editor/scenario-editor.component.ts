import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../Services/api.service';
import { Chart } from 'chart.js';
import {saveAs} from 'file-saver';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop'
const emptyBackground = {name,stepDefinitions:{when: []}};

@Component({
  selector: 'app-scenario-editor',
  templateUrl: './scenario-editor.component.html',
  styleUrls: ['./scenario-editor.component.css'],
})

export class ScenarioEditorComponent implements OnInit {
  stories: Story[];
  originalStepDefinitions: StepDefinition;
  selectedStory: Story;
  selectedScenario: Scenario;
  showEditor = false;
  showResults = false;
  editorLocked = true;
  backgroundLocked = true;
  showDescription = false;
  showBackground = false;
  arrowLeft: boolean = true;
  arrowRight: boolean = true;
  testDone: boolean = false;
  testRunning: boolean = false;
  uncutInputs: string[] = [];
  htmlReport;

  @ViewChild('exampleChildView') exampleChild;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,


  ) {
    this.apiService.getStoriesEvent.subscribe(stories => {
      this.setStories(stories);
      console.log("stories for scenario set");
    });

    this.loadStepDefinitions();
  }


  ngOnInit() {
  }

  setStories(stories: Story[]){
    this.stories = stories;
  }

  @Input()
  removeRowIndex(event){
    console.log("remove in scenario " + event);
    this.removeStepToScenario(event, 'example', event)
  }
  
  @Input()
  set newSelectedStory(story: Story){
    this.selectedStory = story;
  }

  @Input()
  set newSelectedScenario(scenario: Scenario){
    this.selectedScenario = scenario;
    if(this.stories && this.selectedStory){
      console.log("story: " + this.selectedStory.name);
      var storyIndex = this.stories.indexOf(this.selectedStory);
      console.log("storyIndex: " + storyIndex);
      this.selectScenario(null,scenario);
    }

  }

  onDropScenario(event: CdkDragDrop<any>,stepDefs:StepDefinition, stepIndex: number){
    if(!this.editorLocked){
      moveItemInArray(this.stepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
    }
  }

  onDropBackground(event: CdkDragDrop<any>,stepDefs:StepDefinition){
    if(!this.backgroundLocked){
      moveItemInArray(this.backgroundList(stepDefs), event.previousIndex, event.currentIndex);
    }
  }

  backgroundList(stepDefinitions: StepDefinitionBackground){
    return stepDefinitions.when;
  }

  stepsList(stepDefs: StepDefinition, i: number) {
    if (i == 0) {
      return stepDefs.given;
    } else if (i == 1) {
      return stepDefs.when;
    } else if (i == 2){
      return stepDefs.then;
    }else{
      return stepDefs.example;
    }
  }

  loadStepDefinitions() {
    this.apiService
      .getStepDefinitions()
      .subscribe((resp: any)  => {
        this.originalStepDefinitions = resp;
        console.log('controller: stepDefinitions loaded', this.originalStepDefinitions);
      });
  }


  backgroundNameChange(name: string){
    this.selectedStory.background.name = name;
  }

  updateBackground(storyID){
    this.apiService
    .updateBackground(storyID, this.selectedStory.background)
    .subscribe(resp =>{
      console.log('controller: story:', resp);
    });

  }

  updateScenario(storyID) {
    this.apiService
      .updateScenario(storyID, this.selectedScenario)
      .subscribe(resp => {
        console.log('controller:  scenario:', resp);
      });
  }

  addScenarioFromStory(storyID){
    this.apiService
      .addScenario(storyID)
      .subscribe((resp: any) => {
        console.log('controller: stepDefinitions loaded', storyID);
        console.log('storyIDs same?', (storyID === this.selectedStory.story_id));
        this.stories[this.stories.indexOf(this.selectedStory)].scenarios.push(resp);
        this.selectScenario(resp.story_id,resp);
      });

  }

  addScenario(storyID) {
    this.apiService
      .addScenario(storyID)
      .subscribe((resp: any)  => {
        console.log('controller: stepDefinitions loaded', storyID);
        console.log('storyIDs same?', (storyID === this.selectedStory.story_id));
        this.stories[this.stories.indexOf(this.selectedStory)].scenarios.push(resp);
      });
  }

  deleteBackground(){
    this.apiService
      .deleteBackground(this.selectedStory.story_id)
      .subscribe(resp => {
        console.log('controller: delete background', resp);
        this.showBackground = false;

        const indexStory: number = this.stories.indexOf(this.selectedStory);
        this.stories[indexStory].background = emptyBackground;
      });
  }

  deleteScenario(event) {
    this.apiService
      .deleteScenario(this.selectedStory.story_id, this.selectedScenario)
      .subscribe(resp => {
        console.log('controller: delete scenario', resp);
        this.showEditor = false;

        const indexStory: number = this.stories.indexOf(this.selectedStory);
        const indexScenario: number = this.stories[indexStory].scenarios.indexOf(this.selectedScenario);
        if (indexScenario !== -1) {
          this.stories[indexStory].scenarios.splice(indexScenario, 1);
        }
      });
  }

  openDescription(){
    this.showDescription = !this.showDescription;
  }

  openBackground(){
    this.showBackground = !this.showBackground;
  }


  addStepToScenario(storyID, step) {
    let obj = this.clone( step );
    if(!this.editorLocked){
      var new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, obj.stepType) + 1;
      console.log('step to add:', obj);
      var new_step = {
        id: new_id,
        mid: obj.mid,
        pre: obj.pre,
        stepType: obj.stepType,
        type: obj.type,
        values: obj.values
     };
     switch (new_step.stepType) {
       case 'given':
         this.selectedScenario.stepDefinitions.given.push(new_step);
         break;
       case 'when':
         this.selectedScenario.stepDefinitions.when.push(new_step);
         break;
       case 'then':
         this.selectedScenario.stepDefinitions.then.push(new_step);
         break;
       case 'example':
          if(this.selectedScenario.stepDefinitions.example.length > 0){
            this.addStep(step);
            var len = this.selectedScenario.stepDefinitions.example[0].values.length;
            for(var j = 1 ; j < len; j++){
              this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
            }
            this.exampleChild.updateTable();
          }
       break;
       default:
         break;
      }
     console.log('added step', new_step);
    }
  }

  addStepToBackground(storyID, step){
    let obj = this.clone( step );

    console.log("step type: " + step.stepType);
    if(!this.backgroundLocked){
      var new_id = this.getLastIDinStep(this.selectedStory.background.stepDefinitions, obj.stepType) + 1;
      console.log('step to add:', obj);
      var new_step = {
        id: new_id,
        label: obj.label,
        mid: obj.mid,
       pre: obj.pre,
       stepType: obj.stepType,
       type: obj.type,
       values: obj.values
     };
     switch (new_step.stepType) {
       case 'when':
         this.selectedStory.background.stepDefinitions.when.push(new_step);
         break;
       default:
         break;
      }
     console.log('added step', new_step);
    }
  }

  addStep(step){
    var new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, step.stepType) + 1;
    var new_step = {
      id: new_id,
      label: step.label,
      mid: step.mid,
      pre: step.pre,
      stepType: 'example',
      type: step.type,
      values: ['value']
    }
    this.selectedScenario.stepDefinitions.example.push(new_step);
    console.log('newID: ' + new_id);
  }

  getLastIDinStep(stepDefs, stepType) {
    switch (stepType) {
      case 'given':
        return this.buildID(stepDefs.given);
      case 'when':
        return this.buildID(stepDefs.when);
      case 'then':
        return this.buildID(stepDefs.then);
      case 'example':
        return this.buildID(stepDefs.example);
    }
  }

  buildID(stepType): number {
    if (stepType.length !== 0) {
      return stepType[stepType.length - 1].id;
    } else {
      return 0;
    }
  }

  removeStepToBackground(event, index){
    console.log("remove index: " + index);
    this.selectedStory.background.stepDefinitions.when.splice(index, 1);
  }

  removeStepToScenario(event, stepDefType, index) {
    console.log('remove step in ' + stepDefType + ' on index ' + index);
    console.log(stepDefType);
    switch (stepDefType) {
      case 'given':
        this.selectedScenario.stepDefinitions.given.splice(index, 1);
        break;
      case 'when':
        this.selectedScenario.stepDefinitions.when.splice(index, 1);
        break;
      case 'then':
        this.selectedScenario.stepDefinitions.then.splice(index, 1);
        break;
      case 'example':
        this.selectedScenario.stepDefinitions.example.splice(index, 1);
        this.exampleChild.updateTable();
        break;
    }
  }


  keysList(stepDefs) {
    if (stepDefs != null) {
      console.log('keys: ' + Object.keys(stepDefs));
      return Object.keys(stepDefs);
    } else {
      console.log("No Step Definitions found!");
      return "";
    }
  }





  addToValuesBackground(input: string, stepIndex, valueIndex){
    this.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex] = input;
  }

  addToValues(input: string, stepType,step, stepIndex, valueIndex ) {
    this.checkForExamples(input,step);
    console.log("steptype: " + stepType);
    console.log("add to values: " + input);
    switch (stepType) {
      case 'given':
        this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = input;
        break;
      case 'when':
        this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = input;
        break;
      case 'then':
        this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = input;
        break;
      case 'example':
        this.selectedScenario.stepDefinitions.example[stepIndex].values[valueIndex] = input;
        break;
    }
  }


  checkForExamples(input, step){
    //removes example if new input is not in example syntax < >
    if(step.values[0].startsWith("<") && step.values[0].endsWith('>') && !input.startsWith("<") && !input.endsWith('>')){
      var cutOld = step.values[0].substr(1, step.values[0].length-2);
      this.uncutInputs.splice(this.uncutInputs.indexOf(step.values[0]),1);
      for(var i = 0; i < this.selectedScenario.stepDefinitions.example.length; i++){
        console.log("checkForExamples for i: " + i);
        console.log("step.values[0]: " + step.values[0]);


        this.selectedScenario.stepDefinitions.example[i].values.splice(this.selectedScenario.stepDefinitions.example[0].values.indexOf(cutOld), 1);



        if(this.selectedScenario.stepDefinitions.example[0].values.length == 0){

          this.selectedScenario.stepDefinitions.example.splice(0,this.selectedScenario.stepDefinitions.example.length);

        }
      }
    }
    //if input has < > and it is a new unique input
    if(input.startsWith("<") && input.endsWith('>') && (this.selectedScenario.stepDefinitions.example[0] == undefined || !this.uncutInputs.includes(input))){
        this.uncutInputs.push(input);
        var cutInput = input.substr(1, input.length-2);
        this.handleExamples(input, cutInput, step);
    }
  }

 handleExamples(input, cutInput, step){
   //changes example header name if the name is just changed in step
    if(step.values[0] != input && step.values[0] != '' && step.values[0].startsWith("<") && step.values[0].endsWith('>') && this.selectedScenario.stepDefinitions.example[0] !== undefined ){
      this.selectedScenario.stepDefinitions.example[0].values[this.selectedScenario.stepDefinitions.example[0].values.indexOf(step.values[0].substr(1, step.values[0].length-2))] = cutInput;
      return;
    }
    //for first example creates 2 steps
    if(this.selectedScenario.stepDefinitions.example[0] === undefined){
        for(var i = 0; i <= 2; i++){
          this.addStep(step);
          this.exampleChild.updateTable();
         }
        this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
    }else{
      //else just adds as many values to the examples to fill up the table
        this.selectedScenario.stepDefinitions.example[0].values.push(cutInput);

        for(var j = 1;j <this.selectedScenario.stepDefinitions.example.length; j++ ){
          this.selectedScenario.stepDefinitions.example[j].values.push("value");
        }
        //if the table has no rows add a row
        if(this.selectedScenario.stepDefinitions.example[1] === undefined){
          this.addStep(step);
          var len = this.selectedScenario.stepDefinitions.example[0].values.length;
          for(var j = 1 ; j < len; j++){
            this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
          }
        }
     }
     this.exampleChild.updateTable();
  }

  renameScenario(event, name) {
    if (name) {
      this.selectedScenario.name = name;
    }
  }

  lockBackground(){
    this.backgroundLocked = !this.backgroundLocked;
  }

  lockEditor() {
    this.editorLocked = !this.editorLocked;
  }

  selectScenario(storyID, scenario: Scenario) {
    this.selectedScenario = scenario;
    this.showResults = false;
    this.showEditor = true;
    this.editorLocked = true;
    this.testDone = false;
    this.arrowLeft = this.checkArrowLeft();
    this.arrowRight = this.checkArrowRight();
    console.log('selected scenario', this.selectedScenario);
    console.log('selected storyID', this.selectedStory);
  }



  selectStoryScenario(story: Story){
    console.log("selectStoryScenario")
    this.showResults = false;
    this.selectedStory = story;
    this.showEditor = true;
    this.editorLocked = true;
    var storyIndex = this.stories.indexOf(this.selectedStory);
    if(this.stories[storyIndex].scenarios[0] !== undefined ){
      this.selectScenario(this.selectedStory.story_id,this.stories[storyIndex].scenarios[0])
    }
    console.log('selected storyID', this.selectedStory);
  }

  checkArrowLeft(){
    var storyIndex = this.stories.indexOf(this.selectedStory);
    var scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);
    return this.stories[storyIndex].scenarios[scenarioIndex - 1] === undefined;
  }

  checkArrowRight(){
    var storyIndex = this.stories.indexOf(this.selectedStory);
    var scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);
    return this.stories[storyIndex].scenarios[scenarioIndex + 1] === undefined
  }

  scenarioShiftLeft(){
    var storyIndex = this.stories.indexOf(this.selectedStory);
    console.log("storyIndex: " + storyIndex);
    var scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);

    console.log("scenarioIndex: " + scenarioIndex);

    if(this.stories[storyIndex].scenarios[scenarioIndex - 1] !== undefined){
       this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex - 1])
    }
  }

  scenarioShiftRight(){
    var storyIndex = this.stories.indexOf(this.selectedStory);
    console.log("storyIndex: " + storyIndex);
    var scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);

    console.log("scenarioIndex: " + scenarioIndex);
    if(this.stories[storyIndex].scenarios[scenarioIndex + 1] !== undefined){
       this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex + 1])
    }
  }

 //Make the API Request to run the tests and display the results as a chart
  runTests(story_id, scenario_id, callback) {
    this.testRunning = true;
    var iframe: HTMLIFrameElement = document.getElementById("testFrame") as HTMLIFrameElement;
    var loadingScreen: HTMLElement = document.getElementById("loading") as HTMLElement;
    loadingScreen.scrollIntoView();

    //iframe.src = "http://localhost:8080/testResult";
    
    this.apiService
      .runTests(story_id, scenario_id)
      .subscribe(resp => {
  
        iframe.srcdoc = resp;
        //console.log("This is the response: " + resp);
        this.htmlReport = resp;
        this.testDone = true;
        this.showResults = true;
        this.testRunning = false;
        setTimeout(function() {
          iframe.scrollIntoView();
        }, 10);
        })
     }

  downloadFile(){
    var blob = new Blob([ this.htmlReport ], { type : 'text/html' });
    saveAs(blob);
  }

  hideResults() {
    this.showResults = !this.showResults;
  }

  compareFunction(a: number, b:number){
    return a-b;
  }


  //To bypass call by reference of object properties
  //therefore new objects are created and not the existing object changed
  clone(obj){
    if(obj == null || typeof(obj) != 'object')
        return obj;

    var temp = new obj.constructor(); 
    for(var key in obj)
        temp[key] = this.clone(obj[key]);

    return temp;
}


}


