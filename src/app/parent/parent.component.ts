import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { Router } from '@angular/router';


@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit {

  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;

  constructor(public apiService: ApiService,
              private router: Router) {
    this.apiService.getBackendUrlEvent.subscribe(() => {
      this.loadStories();
    });
    if(this.apiService.urlReceived) {
      this.loadStories();
    }else {
      this.apiService.getBackendInfo()
    }
   }

  ngOnInit() {
    // let users only use site if they are logged in
    /*let token = localStorage.getItem('token');
    if(!token){
      this.router.navigate(['/login']);
    }*/
  }

  loadStories() {
    let repository = localStorage.getItem('repository');
    this.apiService
      .getStories(repository, this.apiService.getToken())
      .subscribe((resp: any) => {
        this.stories = resp;
      });

  }

  setSelectedStory(story){
    this.selectedStory = story;
  }

  setSelectedScenario(scenario){
    this.selectedScenario = scenario;
  }

}
