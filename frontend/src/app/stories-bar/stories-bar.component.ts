import { Component, OnInit, EventEmitter, Output, ViewChild } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import {RepositoryContainer} from "../model/RepositoryContainer";
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';
import { ModalsComponent } from '../modals/modals.component';

@Component({
  selector: 'app-stories-bar',
  templateUrl: './stories-bar.component.html',
  styleUrls: ['./stories-bar.component.css']
})
export class StoriesBarComponent implements OnInit {

  closeResult = '';
  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;
  db = false;
  daisyVersion: boolean = true;

  @Output()
  storyChosen: EventEmitter<any> = new EventEmitter();
  @Output()
  scenarioChosen: EventEmitter<any> = new EventEmitter();

  @ViewChild('modalsComponent') modalsComponent: ModalsComponent;
  
  constructor(public apiService: ApiService, private modalService: NgbModal) {
    this.apiService.getStoriesEvent.subscribe(stories => {
      this.stories = stories;
      this.db = localStorage.getItem('source') === 'db' ;
    } );

    this.apiService.createCustomStoryEmitter.subscribe(custom => {
      this.apiService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.value, custom.repositoryContainer._id).subscribe(respp => {
        this.apiService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
          console.log('stories', resp);
          this.stories = resp;
        });
      });
    })
    // TODO update Story
    // TODO delete Story
  }
    
  /* modal mask start */
  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title', size: 'sm' }).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
  /* modal mask end */

  ngOnInit() {
    let version = localStorage.getItem('version')
    if (version == 'DAISY' || !version) {
      this.daisyVersion = true;
    } else {
      this.daisyVersion = false;
    }
  }


  getSortedStories() {
    if (this.stories) {
      return this.stories.sort(function(a, b) { 
        if(a.issue_number < b.issue_number) { return -1; }
        if(a.issue_number > b.issue_number) { return 1; }
        return 0;
      });
    }
  }

  selectScenario(storyID, scenario: Scenario) {
    this.selectedScenario = scenario;
    this.scenarioChosen.emit(scenario);
  }

  selectStoryScenario(story: Story) {
    this.selectedStory = story;
    this.storyChosen.emit(story);
    const storyIndex = this.stories.indexOf(this.selectedStory);
    if (this.stories[storyIndex].scenarios[0]) {
      this.selectScenario(this.selectedStory._id, this.stories[storyIndex].scenarios[0]);
    }
  }

  openCreateNewScenarioModal(){
    this.modalsComponent.openCreateNewStoryModal()
  }

}
