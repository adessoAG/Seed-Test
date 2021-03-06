import { Component, OnInit, Input, ViewChild, EventEmitter, Output, OnChanges, SimpleChanges, DoCheck } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { ToastrService } from 'ngx-toastr';
import { Block } from '../model/Block';
import { ModalsComponent } from '../modals/modals.component';

/**
 * Component of the Scenario Editor
 */
@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['./scenario-editor.component.css'],
})

export class ScenarioEditorComponent implements OnInit, DoCheck {

    /**
     * Currently selected story
     */
    selectedStory: Story;

    /**
     * currently selected scenario
     */
    selectedScenario: Scenario;

      /**
     * if the arrow left should be shown 
     */
    arrowLeft: boolean = true;

    /**
     * if the arrow right should be shown 
     */
    arrowRight: boolean = true;

    /**
     * inputs including the <> for the examples
     */
    uncutInputs: string[] = [];

    /**
     * Name for a new step
     */
    newStepName = 'New Step';

    /**
     * If the action bar is active
     */
    activeActionBar: boolean = false;

    /**
     * If all steps are checked
     */
    allChecked: boolean = false;

    /**
     * if the example action bar is active
     */
    activeExampleActionBar: boolean = false;

    /**
     * If all example steps are checked
     */
    allExampleChecked: boolean = false;

    /**
     * Block saved to the clipboard
     */
    clipboardBlock: Block = null;

    /**
     * If this is the daisy version and the auto logout should be shown
     */
    showDaisyAutoLogout: boolean = false;

    /**
     * View child of the example table
     */
    @ViewChild('exampleChildView') exampleChild: ExampleTableComponent;

    /**
     * View child of the modals component
     */
    @ViewChild('modalsComponent') modalsComponent: ModalsComponent;


    /**
     * Constructor
     * @param apiService 
     * @param toastr 
     */
    constructor(
        public apiService: ApiService,
        private toastr: ToastrService
    ) { }

    /**
     * retrieves the saved block from the session storage 
     */
    ngDoCheck(): void {
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock'))
    }

    /**
     * Subscribes to all necessary events
     */
    ngOnInit() {
        if (localStorage.getItem('version') == 'DAISY') {
            this.showDaisyAutoLogout = true;
        } else {
            this.showDaisyAutoLogout = false;
        }

        this.apiService.runSaveOptionEvent.subscribe(option => {
            if (option == 'saveScenario'){
                this.saveRunOption();
            }
        })
        this.apiService.addBlockToScenarioEvent.subscribe(block => {
            if(block[0] == 'scenario'){
                block = block[1]
                Object.keys(block.stepDefinitions).forEach((key, index) => {
                    block.stepDefinitions[key].forEach((step: StepType, j) => {
                        if (key == 'example'){
                            if (!this.selectedScenario.stepDefinitions[key][0] || !this.selectedScenario.stepDefinitions[key][0].values.some(r => step.values.includes(r))){
                                this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)))
                            }
                            if (j == 0){
                                step.values.forEach(el => {
                                    let s = '<' + el + '>'
                                    if(!this.uncutInputs.includes(s)){
                                        this.uncutInputs.push(s)
                                    }
                                })
                            }
                            this.exampleChild.updateTable();
                        }else{
                            this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)))
                        }
                    })
                })
                  this.selectedScenario.saved = false;
            }
        })

        this.apiService.renameScenarioEvent.subscribe(newName => this.renameScenario(newName))
    }

    /**
     * Original step types not sorted or changed
     */
    @Input() originalStepTypes: StepType[];

    /**
     * If the test is currently running
     */
    @Input() testRunning: boolean;

    /**
     * If a step from the example should be removed
     * @param index 
     */
    @Input()
    removeRowIndex(index: number) {
        this.removeStepFromScenario();
        this.selectedScenario.saved = false;
    }

    /**
     * Checks for an example step
     * @param index 
     */
    @Input()
    checkRowIndex(index: number) {
        this.checkExampleStep(null, this.selectedScenario.stepDefinitions.example[index], null)
    }

    /**
     * Sets a new selected story
     */
    @Input()
    set newlySelectedStory(story: Story) {
        this.selectedStory = story;
    }

    /**
     * Sets a new selected scenaio
     */
    @Input()
    set newlySelectedScenario(scenario: Scenario) {
        if(this.selectedScenario){
            this.checkAllExampleSteps(null, false);
            this.checkAllSteps(null, false);
        }

        this.selectedScenario = scenario;
        if (this.selectedStory) {
           this.selectScenario(scenario);
        }

    }

    /**
     * Event emitter to delete the scenario
     */
    @Output()
    deleteScenarioEvent: EventEmitter<Scenario> = new EventEmitter();

    /**
     * Event emitter to select a new scenario
     */
    @Output()
    selectNewScenarioEvent: EventEmitter<Scenario> = new EventEmitter();

    /**
     * Event emitter to add a new scenario
     */
    @Output()
    addScenarioEvent: EventEmitter<number> = new EventEmitter();

    /**
     * Event emitter to run a test
     */
    @Output()
    runTestScenarioEvent: EventEmitter<any> = new EventEmitter();

    /**
     * Save and then run the scenario
     */
    async saveRunOption(){
        await this.updateScenario()
        this.apiService.runSaveOption('run')
    }

    /**
     * Drag and drop event for a step in the scenario
     * @param event 
     * @param stepDefs 
     * @param stepIndex 
     */
    onDropScenario(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
        /*if (!this.editorLocked) {*/
        moveItemInArray(this.getStepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
        /*}*/
        this.selectedScenario.saved = false;
    }

    /**
     * Gets the steps list 
     * @param stepDefs 
     * @param i 
     * @returns 
     */
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

    /**
     * gets the types of the steps
     * @param stepDefs 
     * @returns 
     */
    getKeysList(stepDefs: StepDefinition) {
        if (stepDefs != null) {
            return Object.keys(stepDefs);
        } else {
            return '';
        }
    }

    /**
     * Insert a copied block to the scenario
     */
    insertCopiedBlock(){
        Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, index) => {
            this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
                if (key == 'example'){
                    if (!this.selectedScenario.stepDefinitions[key][0] || !this.selectedScenario.stepDefinitions[key][0].values.some(r => step.values.includes(r))){
                        this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)))
                    }
                    if (j == 0){
                        step.values.forEach(el => {
                            let s = '<' + el + '>'
                            if(!this.uncutInputs.includes(s)){
                                this.uncutInputs.push(s)
                            }
                        })
                    }
                    this.exampleChild.updateTable();
                }else{
                    this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)))
                }
            })
        })
          this.selectedScenario.saved = false;
    }


    /**
     * update a scenario
     * @returns 
     */
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
        return new Promise<void>((resolve, reject) => {this.apiService
            .updateScenario(this.selectedStory._id, this.selectedStory.storySource, this.selectedScenario)
            .subscribe(_resp => {
                this.toastr.success('successfully saved', 'Scenario')
                resolve()
            });})
    }

    /**
     * Emitts the add a scenario to the story event
     * @param storyID 
     */
    addScenarioToStory(storyID: any) {
        this.addScenarioEvent.emit(storyID);
    }

    /**
     * Emitts the delete scenario event
     * @param event 
     */
    deleteScenario(event){
        this.deleteScenarioEvent.emit(this.selectedScenario);
    }

    /**
     * Adds a step to the scenario
     * @param storyID 
     * @param step 
     */
    addStepToScenario(storyID: any, step) {
        const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions);
        if(newStep['type'] === this.newStepName){
            this.modalsComponent.openNewStepRequestModal(newStep['stepType']);
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
            this.selectedScenario.saved = false;
        }
    }

    /**
     * Adds an example step
     * @param step 
     */
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

    /**
     * Creates a new step
     * @param step 
     * @param stepDefinitions 
     * @param stepType 
     * @returns 
     */
    createNewStep(step: StepType, stepDefinitions: StepDefinition | StepDefinitionBackground, stepType?: string): StepType{
        const obj = JSON.parse(JSON.stringify(step));
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

  /**
   * Gets the last id in the steps
   * @param stepDefs 
   * @param stepStepType 
   * @returns 
   */
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

    /**
   * gets the id of the step
   * @param step 
   * @returns 
   */
    buildID(step): number {
        if (step.length !== 0) {
            return step[step.length - 1].id;
        } else {
            return 0;
        }
    }

    /**
     * Deactivate all checked steps
     */
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

    /**
     * Deactivate all checked example steps
     */
    deactivateExampleStep(){
        for(let s in this.selectedScenario.stepDefinitions.example){
            if(this.selectedScenario.stepDefinitions.example[s].checked){
                this.selectedScenario.stepDefinitions.example[s].deactivated = !this.selectedScenario.stepDefinitions.example[s].deactivated
            }
        }
        this.selectedScenario.saved = false;
    }

    /**
     * Check all steps
     * @param event 
     * @param checkValue 
     */
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

    /**
     * Opens add block form modal
     * @param event 
     */
    addBlock(event){
        let id = localStorage.getItem('id');
        this.modalsComponent.openAddBlockFormModal('scenario', id);
    }

    /**
     * Save a new block
     * @param event 
     */
    saveBlock(event){
        let saveBlock: any = {given: [], when: [], then: []};
        for (let prop in this.selectedScenario.stepDefinitions) {
            if(prop !== 'example'){
                for(let s in this.selectedScenario.stepDefinitions[prop]){
                    if(this.selectedScenario.stepDefinitions[prop][s].checked){
                        saveBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s])
                    }
                }
            }
        }
        let block: Block = {name: 'TEST', stepDefinitions: saveBlock}
        this.modalsComponent.openSaveBlockFormModal(block, this);
    }

    /**
     * Copy block 
     * @param event 
     */
    copyBlock(event){
        let copyBlock: any = {given: [], when: [], then: [], example:[]};
        for (let prop in this.selectedScenario.stepDefinitions) {
            if(prop !== 'example'){
                for(let s in this.selectedScenario.stepDefinitions[prop]){
                    if(this.selectedScenario.stepDefinitions[prop][s].checked){
                        this.selectedScenario.stepDefinitions[prop][s].checked = false
                        copyBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s])
                    }
                }
            }
        }
        let block: Block = {stepDefinitions: copyBlock}
        sessionStorage.setItem('copiedBlock', JSON.stringify(block))
        this.allChecked = false;
        this.activeActionBar = false;
    }

    /**
     * Copy a block of examples
     * @param event 
     */
    copyBlockExample(event){
        let copyBlock: any = {given: [], when: [], then: [], example:[]};
        for (let prop in this.selectedScenario.stepDefinitions) {
            if(prop == 'example'){
                for(let s in this.selectedScenario.stepDefinitions[prop]){
                    if(this.selectedScenario.stepDefinitions[prop][s].checked){
                        this.selectedScenario.stepDefinitions[prop][s].checked = false
                        copyBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s])
                    }
                }
            }
        }
        let block: Block = {stepDefinitions: copyBlock};
        sessionStorage.setItem('copiedBlock', JSON.stringify(block));
        this.allExampleChecked = false;
        this.activeExampleActionBar = false;
    }

    /**
     * Save an example block
     * @param event 
     */
    saveExampleBlock(event){
        let saveBlock: any = {given:[], when: [], then: [], example: []};
        for (let prop in this.selectedScenario.stepDefinitions) {
            for(let s in this.selectedScenario.stepDefinitions[prop]){
                if((prop == 'example' && this.selectedScenario.stepDefinitions[prop][s].checked) || this.includesExampleStep(this.selectedScenario.stepDefinitions[prop][s])){
                    saveBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s])
                }
            }
        }
        let block: Block = {stepDefinitions: saveBlock}
        this.modalsComponent.openSaveBlockFormModal(block, this);
    }

    /**
     * Checks if an example step is included in the steps
     * @param step 
     * @returns 
     */
    includesExampleStep(step: StepType){
        let includesExample = false;
        step.values.forEach(element => {
            if (element[0] == '<' && element[element.length -1] == '>') {
                includesExample = true;
            }
        });
        return includesExample;
    }

    /**
     * Checks all example steps
     * @param event 
     * @param checkValue 
     */
    checkAllExampleSteps(event, checkValue: boolean){
        if(checkValue!= null){
            this.allExampleChecked = checkValue;
        }else{
            this.allExampleChecked = !this.allExampleChecked;
        }
        if(this.allExampleChecked){
            for (var i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
                if(i == 0) continue;
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

    /**
     * Checks a step
     * @param $event 
     * @param step 
     * @param checkValue 
     */
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

    /**
     * Checks an example step
     * @param $event 
     * @param step 
     * @param checkValue 
     */
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

    /**
     * Removes a step from the scenario
     */
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

    /**
     * remove step from examples
     */
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

    /**
     * Adds a value to the step
     * @param input 
     * @param stepType 
     * @param step 
     * @param stepIndex 
     * @param valueIndex 
     */
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

    /**
     * Checks the input if an example should be generated or removed
     * @param input 
     * @param step 
     * @param valueIndex 
     */
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

    /**
     * Removes an example
     */
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
            if (table){
                table.classList.remove('mat-elevation-z8')
            }
        }
    }

    /**
     * If the example got removed <>
     * @param input 
     * @param step 
     * @param valueIndex 
     * @returns 
     */
    inputRemovedExample(input: string, step: StepType, valueIndex: number): boolean{
        return step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && (!input.startsWith('<') || !input.endsWith('>'))
    }

    /**
     * If the Input has now an example
     * @param input 
     * @returns 
     */
    inputHasExample(input: string): boolean{
        return input.startsWith('<') && input.endsWith('>') && !this.uncutInputs.includes(input)
    }


    /**
     * Creates an example
     * @param input 
     * @param step 
     * @param valueIndex 
     */
    createExample(input: string, step: StepType, valueIndex: number){
        const cutInput = input.substr(1, input.length - 2);
        this.handleExamples(input, cutInput, step, valueIndex);
    }

    /**
     * Handles the update for examples
     * @param input 
     * @param cutInput 
     * @param step 
     * @param valueIndex 
     */
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

    /**
     * Creates the first example of the scenario
     * @param cutInput 
     * @param step 
     */
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

    /**
     * Fill all example values after an example step was added
     * @param cutInput 
     * @param step 
     */
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

    /**
     * if the example header got changed
     * @param input 
     * @param step 
     * @param valueIndex 
     * @returns 
     */
    exampleHeaderChanged(input: string, step: StepType, valueIndex: number): boolean{
        return input.startsWith('<') && input.endsWith('>') && step.values[valueIndex] != input && step.values[valueIndex] != '' && step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && this.selectedScenario.stepDefinitions.example[valueIndex] !== undefined
    }

    /**
     * Renames the scenario
     * @param newTitle 
     */
    renameScenario(newTitle) {
        if (newTitle && newTitle.replace(/\s/g, '').length > 0) {
            this.selectedScenario.name = newTitle;
        }
        this.selectedScenario.saved = false;
    }

    /**
     * Selects a scenario
     * @param scenario 
     */
    selectScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        this.arrowLeft = this.checkArrowLeft();
        this.arrowRight = this.checkArrowRight();
    }

    /**
     * Checks if there exists a scenario before this one
     * @returns 
     */
    checkArrowLeft(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex - 1] === undefined;
    }

    /**
     * Checks if there exists a scenario after this one
     * @returns 
     */
    checkArrowRight(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex + 1] === undefined;
    }

    /**
     * Select the scenario before
     */
    scenarioShiftLeft() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex - 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex - 1]);
            this.selectNewScenarioEvent.emit(this.selectedStory.scenarios[scenarioIndex - 1])
        }
    }

    /**
     * Selects the next scenario
     */
    scenarioShiftRight() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex + 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex + 1]);
            this.selectNewScenarioEvent.emit(this.selectedStory.scenarios[scenarioIndex + 1])
        }
    }

    /**
     * Emitts a run scenario event
     * @param scenarioId
     */
    runTestScenario(scenarioId: number){
        this.runTestScenarioEvent.emit({scenarioId})
    }

    /**
     * if the scenario is saved
     * @returns 
     */
    scenarioSaved(){
        return this.testRunning || this.selectedScenario.saved || this.selectedScenario.saved === undefined
    }

    /**
     * Sets the daisy auto logout
     * @param $event 
     * @param checkValue 
     */
    setDaisyAutoLogout($event: Event,  checkValue: boolean) {
        this.selectedScenario.daisyAutoLogout = checkValue;
        this.selectedScenario.saved = false;
    }

    /**
     * Change the comment
     * @param newComment 
     */
    commentChange(newComment){
        this.selectedScenario.comment = newComment;
        this.selectedScenario.saved = false;
    }

    /**
     * Sort the step types for its id
     * @returns 
     */
    sortedStepTypes(){
        if (this.originalStepTypes){
            let sortedStepTypes =  this.originalStepTypes;
            sortedStepTypes.sort((a, b) => {
                return a.id - b.id;
            })
            return sortedStepTypes
        }
    }

    /**
     * Open Modal to rename the scenario
     */
    changeScenarioTitle(){
        this.modalsComponent.openRenameScenarioModal(this.selectedScenario.name)
    }
}  
