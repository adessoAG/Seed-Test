import { Component, OnInit, Input, ViewChild, EventEmitter, Output } from '@angular/core';
import { ApiService } from '../Services/api.service';
import {saveAs} from 'file-saver';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';

const emptyBackground = {name, stepDefinitions: {when: []}};


@Component({
  selector: 'app-story-editor',
  templateUrl: './story-editor.component.html',
  styleUrls: ['./story-editor.component.css']
})
export class StoryEditorComponent implements OnInit {

  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;
  showEditor = false;
  showResults = false;
  showDescription = false;
  showBackground = false;
  arrowLeft = true;
  arrowRight = true;
  testDone = false;
  testRunning = false;
  htmlReport;
  storiesLoaded = false;
  storiesError = false;

  @ViewChild('exampleChildView') exampleChild;

  constructor(
      public apiService: ApiService,
  ) {
      this.apiService.getStoriesEvent.subscribe((stories: Story[]) => {
          this.storiesLoaded = true;
          this.storiesError = false;
          this.showEditor = false;
          this.setStories(stories);
      });
      this.apiService.storiesErrorEvent.subscribe(errorCode => {
          this.storiesError = true;
          this.showEditor = false;
      });
  }


  ngOnInit() {
  }

  setStories(stories: Story[]) {
      this.stories = stories;
  }

  @Input()
  set newSelectedStory(story: Story) {
      this.selectedStory = story;
  }


  @Output()
  formtosubmit: EventEmitter<any> = new EventEmitter();

  chooseform(list) {
      this.formtosubmit.emit(list);
  }

  onDropBackground(event: CdkDragDrop<any>, stepDefs: StepDefinition) {
      /*if (!this.backgroundLocked) {*/
      moveItemInArray(this.getBackgroundList(stepDefs), event.previousIndex, event.currentIndex);
      /*}*/
  }

  getBackgroundList(stepDefinitions: StepDefinitionBackground) {
      return stepDefinitions.when;
  }


  backgroundNameChange(name: string) {
      this.selectedStory.background.name = name;
  }

  updateBackground(storyID: number) {
      this.apiService
          .updateBackground(storyID, this.selectedStory.background)
          .subscribe(resp => {
          });

  }

  deleteBackground() {
      this.apiService
          .deleteBackground(this.selectedStory.story_id)
          .subscribe(resp => {
              this.backgroundDeleted();
          });
  }

  backgroundDeleted(){
      this.showBackground = false;
      const indexStory: number = this.stories.indexOf(this.selectedStory);
      this.stories[indexStory].background = emptyBackground;
  }

  openDescription() {
      this.showDescription = !this.showDescription;
  }

  openBackground() {
      this.showBackground = !this.showBackground;
  }

  addExampleStep(step: StepType){
      if (this.selectedScenario.stepDefinitions.example.length > 0) {
          this.addStep(step);
          const len = this.selectedScenario.stepDefinitions.example[0].values.length;
          for (let j = 1; j < len; j++) {
              this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
          }
          this.exampleChild.updateTable();
      }  
  }

  addStepToBackground(storyID: number, step: StepType) {
      const newStep = this.createNewStep(step, this.selectedStory.background.stepDefinitions)
      if (newStep.stepType == 'when') {
          this.selectedStory.background.stepDefinitions.when.push(newStep);
      }
  }

  createNewStep(step: StepType, stepDefinitions: StepDefinitionBackground): StepType{
      const obj = this.clone(step);
      const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
      const newStep: StepType = {
          id: newId,
          mid: obj.mid,
          pre: obj.pre,
          stepType: obj.stepType,
          type: obj.type,
          values: obj.values
      };
      return newStep;
  }

  addStep(step: StepType) {
      const new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, step.stepType) + 1;
      const new_step: StepType = {
          id: new_id,
          mid: step.mid,
          pre: step.pre,
          stepType: 'example',
          type: step.type,
          values: ['value']
      };
      this.selectedScenario.stepDefinitions.example.push(new_step);
  }

  getLastIDinStep(stepDefs: any, stepStepType: string): number {
      switch (stepStepType) {
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

  buildID(step): number {
      if (step.length !== 0) {
          return step[step.length - 1].id;
      } else {
          return 0;
      }
  }

  removeStepFromBackground(event, index: number) {
      this.selectedStory.background.stepDefinitions.when.splice(index, 1);
  }

  addToValuesBackground(input: string, stepIndex: number, valueIndex: number) {
      this.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex] = input;
  }

  selectScenario(scenario: Scenario) {
      this.selectedScenario = scenario;
      this.showResults = false;
      this.showEditor = true;
      this.testDone = false;
  }


  selectStoryScenario(story: Story) {
      this.showResults = false;
      this.selectedStory = story;
      this.showEditor = true;
      const storyIndex = this.stories.indexOf(this.selectedStory);
      if (this.stories[storyIndex].scenarios[0] !== undefined) {
          this.selectScenario(this.stories[storyIndex].scenarios[0]);
      }
  }


  undefined_definition(definition){
      let undefined_list = [];
      if(definition !== undefined){
          let given = definition["given"];
          for(let key in given){
              let obj = given[key];
              if (obj["type"] === "Undefined Step"){
                  undefined_list = undefined_list.concat(obj["values"][0]);
              }
          }
          let then = definition["then"];
          for(let key in then){
              let obj = then[key];
              if (obj["type"] === "Undefined Step"){
                  undefined_list = undefined_list.concat(obj["values"][0]);
              }
          }
          let when = definition["when"];
          for(let key in when){
              let obj = when[key];
              if (obj["type"] === "Undefined Step"){
                  undefined_list = undefined_list.concat(obj["values"][0]);
              }
          }
      }
      return undefined_list;
  }

  // Make the API Request to run the tests and display the results as a chart
  runTests(story_id: number, scenario_id: number, callback) {
      let undefined_list = this.undefined_definition(this.selectedScenario["stepDefinitions"]);


      if(undefined_list.length > 0){
          this.chooseform(undefined_list);
      }
      else {
          this.testRunning = true;
          const iframe: HTMLIFrameElement = document.getElementById('testFrame') as HTMLIFrameElement;
          const loadingScreen: HTMLElement = document.getElementById('loading');
          loadingScreen.scrollIntoView();
          this.apiService
              .runTests(story_id, scenario_id)
              .subscribe(resp => {
                  iframe.srcdoc = resp;
                  // console.log("This is the response: " + resp);
                  this.htmlReport = resp;
                  this.testDone = true;
                  this.showResults = true;
                  this.testRunning = false;
                  setTimeout(function () {
                      iframe.scrollIntoView();
                  }, 10);
              });
      }

  }

  downloadFile() {
      const blob = new Blob([this.htmlReport], {type: 'text/html'});
      saveAs(blob);
  }

  hideResults() {
      this.showResults = !this.showResults;
  }

  // To bypass call by reference of object properties
  // therefore new objects are created and not the existing object changed
  clone(obj) {
      if (obj == null || typeof (obj) != 'object') {
          return obj;
      }
      const temp = new obj.constructor();
      for (var key in obj) {
          temp[key] = this.clone(obj[key]);
      }

      return temp;
  }


}
