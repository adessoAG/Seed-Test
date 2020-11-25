import { Component, OnInit, Input, ViewChild, EventEmitter, Output } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { SubmitformComponent } from '../submitform/submitform.component';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['./scenario-editor.component.css'],
})

export class ScenarioEditorComponent implements OnInit {

    
    selectedStory: Story;
    selectedScenario: Scenario;
    arrowLeft = true;
    arrowRight = true;
    uncutInputs: string[] = [];
    newStepName= 'New Step';
    activeActionBar: boolean = false;
    allChecked: boolean = false;
    activeExampleActionBar: boolean = false;
    allExampleChecked: boolean = false;

    @ViewChild('exampleChildView') exampleChild: ExampleTableComponent;
    @ViewChild('submitForm') modalService: SubmitformComponent;
    
    constructor(
        public apiService: ApiService,
        private toastr: ToastrService
    ) { }

    ngOnInit() {
        this.apiService.runSaveOptionEvent.subscribe(option => {
            if (option == 'saveScenario'){
                this.saveRunOption();
            }
        })
    }

    @Input() originalStepTypes: StepType[];

    @Input() testRunning: boolean;

    @Input()
    removeRowIndex(index: number) {
        this.removeStepFromScenario();
        this.selectedScenario.saved = false;
    }

    @Input()
    checkRowIndex(index: number) {
        this.checkExampleStep(null, this.selectedScenario.stepDefinitions.example[index], null)
    }

    @Input()
    set newlySelectedStory(story: Story) {
        this.selectedStory = story;
    }

    @Input()
    set newlySelectedScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        if (this.selectedStory) {
           this.selectScenario(scenario);
        }

    }

    @Output()
    deleteScenarioEvent: EventEmitter<Scenario> = new EventEmitter();

    @Output()
    addScenarioEvent: EventEmitter<number> = new EventEmitter();

    @Output()
    runTestScenarioEvent: EventEmitter<any> = new EventEmitter();

    async saveRunOption(){
        await this.updateScenario()
        this.apiService.runSaveOption('run')
    }

    onDropScenario(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
        /*if (!this.editorLocked) {*/
        moveItemInArray(this.getStepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
        /*}*/
        this.selectedScenario.saved = false;
    }

    getStepsList(stepDefs: StepDefinition, i: number) {
        if (i == 0) {
            return stepDefs.given;
        } else if (i == 1) {
            return stepDefs.when;
        } else if (i == 2) {
            return stepDefs.then;
        } else {
            return stepDefs.example;
        }
    }

    getKeysList(stepDefs: StepDefinition) {
        if (stepDefs != null) {
            return Object.keys(stepDefs);
        } else {
            return '';
        }
    }


    updateScenario() {
        this.allChecked = false;
        this.allExampleChecked = false;
        this.activeActionBar = false;

        delete this.selectedScenario.saved;
        let steps = this.selectedScenario.stepDefinitions["given"];
        steps = steps.concat(this.selectedScenario.stepDefinitions["when"]);
        steps = steps.concat(this.selectedScenario.stepDefinitions["then"]);
        steps = steps.concat(this.selectedScenario.stepDefinitions["example"]);

        let undefined_steps = [];
        for (let i = 0; i < steps.length; i++) {
            if (String(steps[i]["type"]).includes("Undefined Step")) {
                undefined_steps = undefined_steps.concat(steps[i]);
            }
        }

        Object.keys(this.selectedScenario.stepDefinitions).forEach((key, index) => {
            this.selectedScenario.stepDefinitions[key].forEach((step: StepType) => {
                delete step.checked;
                if(step.outdated){
                    step.outdated = false;
                }
            })
        })

        if (undefined_steps.length != 0) {
            console.log("There are undefined steps here");
        }
        this.selectedScenario.lastTestPassed = null;
        return new Promise((resolve, reject) => {this.apiService
            .updateScenario(this.selectedStory.story_id, this.selectedStory.storySource, this.selectedScenario)
            .subscribe(_resp => {
                this.toastr.success('successfully saved', 'Scenario')
                resolve()
            });})
    }

    addScenarioToStory(storyID: any) {
        this.addScenarioEvent.emit(storyID);
    }

    deleteScenario(event){
        this.deleteScenarioEvent.emit(this.selectedScenario);
    }


    addStepToScenario(storyID: any, step) {
        const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions);
        if(newStep['type'] === this.newStepName){
            this.modalService.open(newStep['stepType']);
        }else{
            switch (newStep.stepType) {
                case 'given':
                    this.selectedScenario.stepDefinitions.given.push(newStep);
                    break;
                case 'when':
                    this.selectedScenario.stepDefinitions.when.push(newStep);
                    break;
                case 'then':
                    this.selectedScenario.stepDefinitions.then.push(newStep);
                    break;
                case 'example':
                    this.addExampleStep(step);
                    break;
                default:
                    break;
            }
        }
        this.selectedScenario.saved = false;
    }

    addExampleStep(step: StepType){
        if (this.selectedScenario.stepDefinitions.example.length > 0) {
            let newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example')
            this.selectedScenario.stepDefinitions.example.push(newStep);
            const len = this.selectedScenario.stepDefinitions.example[0].values.length;
            for (let j = 1; j < len; j++) {
                this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
            }
            this.exampleChild.updateTable();
        }  
        this.selectedScenario.saved = false;
    }

    createNewStep(step: StepType, stepDefinitions: StepDefinition | StepDefinitionBackground, stepType?: string): StepType{
        const obj = this.clone(step);
        const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
        const newStep: StepType = {
            id: newId,
            mid: obj.mid,
            pre: obj.pre,
            stepType: stepType === 'example' ? stepType : obj.stepType,
            type: obj.type,
            values: stepType === 'example' ? ['value'] : obj.values
        };
        return newStep;
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

    deactivateStep(){
        for (let prop in this.selectedScenario.stepDefinitions) {
            if(prop !== 'example'){
                for(let s in this.selectedScenario.stepDefinitions[prop]){
                    if(this.selectedScenario.stepDefinitions[prop][s].checked){
                        this.selectedScenario.stepDefinitions[prop][s].deactivated = !this.selectedScenario.stepDefinitions[prop][s].deactivated
                    }
                }
            }
        }
        this.selectedScenario.saved = false;
    }

    deactivateExampleStep(){
        for(let s in this.selectedScenario.stepDefinitions.example){
            if(this.selectedScenario.stepDefinitions.example[s].checked){
                this.selectedScenario.stepDefinitions.example[s].deactivated = !this.selectedScenario.stepDefinitions.example[s].deactivated
            }
        }
        this.selectedScenario.saved = false;
    }

    checkAllSteps(event, checkValue: boolean){
        if(checkValue!= null){
            this.allChecked = checkValue;
        }else{
            this.allChecked = !this.allChecked;
        }
        if(this.allChecked){
            for (let prop in this.selectedScenario.stepDefinitions) {
                if(prop !== 'example'){
                    for (var i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                        this.checkStep(null, this.selectedScenario.stepDefinitions[prop][i], true)
                    }
                }
            }
            this.activeActionBar = true;
            this.allChecked = true;
        }else{
            for (let prop in this.selectedScenario.stepDefinitions) {
                if(prop !== 'example'){
                    for (var i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                        this.checkStep(null, this.selectedScenario.stepDefinitions[prop][i], false)
                    }
                }
            }
            this.activeActionBar = false;
            this.allChecked = false;
        }
    }

    checkAllExampleSteps(event, checkValue: boolean){
        if(checkValue!= null){
            this.allExampleChecked = checkValue;
        }else{
            this.allExampleChecked = !this.allExampleChecked;
        }
        if(this.allExampleChecked){
            for (var i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
                this.checkExampleStep(null, this.selectedScenario.stepDefinitions.example[i], true)
            }
            this.activeExampleActionBar = true;
            this.allExampleChecked = true;
        }else{
            for (var i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
                this.checkExampleStep(null, this.selectedScenario.stepDefinitions.example[i], false)
            }
            this.activeExampleActionBar = false;
            this.allExampleChecked = false;
        }
    }

    checkStep($event, step, checkValue: boolean){
        if(checkValue != null){
            step.checked = checkValue;
        }else{
            step.checked = !step.checked;
        }
        let checkCount = 0;
        let stepCount = 0;
        
        for (let prop in this.selectedScenario.stepDefinitions) {
            if(prop !== 'example'){
                for (var i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    stepCount++;
                    if(this.selectedScenario.stepDefinitions[prop][i].checked){
                        checkCount++;
                    }
                }
            }
        }
        if(checkCount >= stepCount){
            this.allChecked = true;
        }else{
            this.allChecked = false;
        }
        if(checkCount <= 0){
            this.allChecked = false;
            this.activeActionBar = false;
        }else{
            this.activeActionBar = true
        }
    }

    checkExampleStep($event, step, checkValue: boolean){
        if(checkValue != null){
            step.checked = checkValue;
        }else{
            step.checked = !step.checked;
        }
        let checkCount = 0;
        let stepCount = 0;
        
        for (var i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
            stepCount++;
            if(this.selectedScenario.stepDefinitions.example[i].checked){
                checkCount++;
            }
        }

        if(checkCount >= stepCount - 1){
            this.allExampleChecked = true;
        }else{
            this.allExampleChecked = false;
        }
        if(checkCount <= 0){
            this.allExampleChecked = false;
            this.activeExampleActionBar = false;
        }else{
            this.activeExampleActionBar = true
        }
    }

    removeStepFromScenario() {
        for (let prop in this.selectedScenario.stepDefinitions) {
            if(prop !== 'example'){
                for (var i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    if(this.selectedScenario.stepDefinitions[prop][i].checked){
                        this.selectedScenario.stepDefinitions[prop].splice(i, 1)
                    }
                }
            }
        }
        this.selectedScenario.saved = false;
        this.allChecked = false;
        this.activeActionBar = false;
    }

    removeStepFromExample(){
        for (var i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 1; i--) {
            if(this.selectedScenario.stepDefinitions.example[i].checked){
                this.selectedScenario.stepDefinitions.example.splice(i, 1)
                this.exampleChild.updateTable();
            }
        }
        this.selectedScenario.saved = false;
        this.allExampleChecked = false;
        this.activeExampleActionBar = false;
    }

    addToValues(input: string, stepType: string, step: StepType, stepIndex: number, valueIndex: number) {
        this.checkForExamples(input, step, valueIndex);
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
        this.selectedScenario.saved = false;
    }


    checkForExamples(input: string, step: StepType, valueIndex: number) {
        // removes example if new input is not in example syntax < >
        if (this.inputRemovedExample(input, step, valueIndex)) {
            this.removeExample(step, valueIndex);
        }
        // if input has < > and it is a new unique input
        if (this.inputHasExample(input)) {
            this.createExample(input, step, valueIndex);
        }
    }

    removeExample(step: StepType, valueIndex: number){
        const cutOld = step.values[valueIndex].substr(1, step.values[valueIndex].length - 2);
        this.uncutInputs.splice(this.uncutInputs.indexOf(step.values[valueIndex]), 1);

        for (let i = 0; i < this.selectedScenario.stepDefinitions.example.length; i++) {
            this.selectedScenario.stepDefinitions.example[i].values.splice(this.selectedScenario.stepDefinitions.example[0].values.indexOf(cutOld), 1);
            if (this.selectedScenario.stepDefinitions.example[0].values.length == 0) {
                this.selectedScenario.stepDefinitions.example.splice(0, this.selectedScenario.stepDefinitions.example.length);
            }
        }
        if(!this.selectedScenario.stepDefinitions.example || this.selectedScenario.stepDefinitions.example.length <= 0){
            let table = document.getElementsByClassName('mat-table')[0];
            table.classList.remove('mat-elevation-z8')
        }
    }

    inputRemovedExample(input: string, step: StepType, valueIndex: number): boolean{
        return step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && !input.startsWith('<') && !input.endsWith('>')
    }

    inputHasExample(input: string): boolean{
        return input.startsWith('<') && input.endsWith('>') && !this.uncutInputs.includes(input)
    }


    createExample(input: string, step: StepType, valueIndex: number){
        const cutInput = input.substr(1, input.length - 2);
        this.handleExamples(input, cutInput, step, valueIndex);
    }

    handleExamples(input: string, cutInput: string, step: StepType, valueIndex: number) {
        // changes example header name if the name is just changed in step
        if (this.exampleHeaderChanged(input, step, valueIndex)) {
            this.uncutInputs[this.uncutInputs.indexOf(step.values[valueIndex])] = input;
            this.selectedScenario.stepDefinitions.example[0].values[this.selectedScenario.stepDefinitions.example[0].values.indexOf(step.values[valueIndex].substr(1, step.values[valueIndex].length - 2))] = cutInput;
        }else {
            this.uncutInputs.push(input);
            // for first example creates 2 steps
            if (this.selectedScenario.stepDefinitions.example[0] === undefined) {
                this.createFirstExample(cutInput, step);
            } else {
                // else just adds as many values to the examples to fill up the table
                this.fillExamples(cutInput, step);
            }
        }
        this.exampleChild.updateTable();

    }

    createFirstExample(cutInput: string, step: StepType){
        for (let i = 0; i <= 2; i++) {
            let newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example')
            this.selectedScenario.stepDefinitions.example.push(newStep);
            this.exampleChild.updateTable();
        }
        this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
        let table = document.getElementsByClassName('mat-table')[0];
        if(table) table.classList.add('mat-elevation-z8')
    }

    fillExamples(cutInput: string, step: StepType){
        this.selectedScenario.stepDefinitions.example[0].values.push(cutInput);
        // if the table has no rows add a row

        if (this.selectedScenario.stepDefinitions.example[1] === undefined) {
            let newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example')
            this.selectedScenario.stepDefinitions.example.push(newStep);
            const len = this.selectedScenario.stepDefinitions.example[0].values.length;
            for (let j = 1; j < len; j++) {
                this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');

            }
        }else {
            for (let j = 1; j < this.selectedScenario.stepDefinitions.example.length; j++) {
                this.selectedScenario.stepDefinitions.example[j].values.push('value');
            }
        }
    }


    exampleHeaderChanged(input: string, step: StepType, valueIndex: number): boolean{
        return input.startsWith('<') && input.endsWith('>') && step.values[valueIndex] != input && step.values[valueIndex] != '' && step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && this.selectedScenario.stepDefinitions.example[valueIndex] !== undefined
    }

    renameScenario(event) {
        let name = (document.getElementById('scenarioName') as HTMLInputElement).value ;
        if (name) {
            this.selectedScenario.name = name;
        }
        this.selectedScenario.saved = false;
    }

    selectScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        this.arrowLeft = this.checkArrowLeft();
        this.arrowRight = this.checkArrowRight();
    }

    checkArrowLeft(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex - 1] === undefined;
    }

    checkArrowRight(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex + 1] === undefined;
    }

    scenarioShiftLeft() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex - 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex - 1]);
        }
    }

    scenarioShiftRight() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex + 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex + 1]);
        }
    }

    runTestScenario(scenarioId: number){
        this.runTestScenarioEvent.emit({scenarioId})
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

    scenarioSaved(){
        return this.testRunning || this.selectedScenario.saved || this.selectedScenario.saved === undefined
    }
}  
